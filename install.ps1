# Elnora CLI installer for Windows
# Usage: irm https://cli.elnora.ai/install.ps1 | iex

param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$Repo = "Elnora-AI/elnora-cli"
$InstallDir = "$env:USERPROFILE\.elnora\bin"

# Architecture detection
$Arch = if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -eq "Arm64") {
    "arm64"
} else {
    "x64"
}

# Resolve latest version
if (-not $Version) {
    try {
        $release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest" -TimeoutSec 15
        $Version = $release.tag_name
    } catch {
        Write-Host ""
        Write-Host "Error: Could not fetch the latest version. Check your internet connection." -ForegroundColor Red
        Write-Host "  Retry, or pin a version: irm https://cli.elnora.ai/install.ps1 | iex -Version v1.1.2"
        exit 1
    }
    if (-not $Version) {
        Write-Host ""
        Write-Host "Error: Could not determine the latest version." -ForegroundColor Red
        Write-Host "  Check releases: https://github.com/$Repo/releases"
        exit 1
    }
}

$Target = "elnora-win-$Arch.exe"
$DownloadUrl = "https://github.com/$Repo/releases/download/$Version/$Target.zip"
$ChecksumUrl = "https://github.com/$Repo/releases/download/$Version/$Target.sha256"

Write-Host "Installing Elnora CLI $Version (win-$Arch)..."

# Create install directory
try {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
} catch {
    Write-Host ""
    Write-Host "Error: Could not create directory: $InstallDir" -ForegroundColor Red
    Write-Host "  Try running PowerShell as Administrator."
    exit 1
}

# Download
$TmpDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }

try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile "$TmpDir\$Target.zip" -TimeoutSec 120
} catch {
    Write-Host ""
    Write-Host "Error: Failed to download Elnora CLI $Version for win-$Arch." -ForegroundColor Red
    Write-Host "  Check that this version exists: https://github.com/$Repo/releases/tag/$Version"
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
    exit 1
}

$SkipChecksum = $false
try {
    Invoke-WebRequest -Uri $ChecksumUrl -OutFile "$TmpDir\$Target.sha256" -TimeoutSec 15
} catch {
    Write-Host "Warning: Could not download checksum file. Skipping verification."
    Write-Host "  You can verify manually at: $ChecksumUrl"
    $SkipChecksum = $true
}

# Verify checksum
if (-not $SkipChecksum) {
    $checksumContent = Get-Content "$TmpDir\$Target.sha256"
    $expected = $checksumContent.Split(" ")[0].Trim().ToLower()

    if ($expected -notmatch '^[a-f0-9]{64}$') {
        Write-Host "Warning: Checksum file has unexpected format. Skipping verification."
    } else {
        $actual = (Get-FileHash "$TmpDir\$Target.zip" -Algorithm SHA256).Hash.ToLower()
        if ($actual -ne $expected) {
            Write-Host ""
            Write-Host "Error: Checksum verification failed. The download may be corrupted." -ForegroundColor Red
            Write-Host "  Expected: $expected"
            Write-Host "  Got:      $actual"
            Write-Host "  Try running the installer again: irm https://cli.elnora.ai/install.ps1 | iex"
            Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
            exit 1
        }
    }
}

# Extract
try {
    Expand-Archive -Path "$TmpDir\$Target.zip" -DestinationPath $TmpDir -Force
} catch {
    Write-Host ""
    Write-Host "Error: Failed to extract archive. The download may be corrupted." -ForegroundColor Red
    Write-Host "  Try running the installer again: irm https://cli.elnora.ai/install.ps1 | iex"
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
    exit 1
}

if (-not (Test-Path "$TmpDir\$Target")) {
    Write-Host ""
    Write-Host "Error: Binary not found after extraction. The release archive may be incomplete." -ForegroundColor Red
    Write-Host "  Report this issue: https://github.com/$Repo/issues"
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
    exit 1
}

# Install
try {
    Copy-Item "$TmpDir\$Target" "$InstallDir\elnora.exe" -Force
} catch {
    Write-Host ""
    Write-Host "Error: Could not install to $InstallDir\elnora.exe" -ForegroundColor Red
    if ($_.Exception.Message -like "*being used*") {
        Write-Host "  The file is in use. Close any open terminals running elnora and try again."
    } else {
        Write-Host "  Try running PowerShell as Administrator."
    }
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
    exit 1
}

# Add to PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$InstallDir*") {
    try {
        [Environment]::SetEnvironmentVariable("Path", "$InstallDir;$userPath", "User")
        Write-Host ""
        Write-Host "Added $InstallDir to user PATH. Restart your terminal to use 'elnora'."
    } catch {
        Write-Host ""
        Write-Host "Warning: Could not add $InstallDir to PATH automatically."
        Write-Host "  Add it manually: Settings > System > About > Advanced > Environment Variables > Path"
    }
}

# Cleanup
Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Elnora CLI $Version installed to $InstallDir\elnora.exe"
Write-Host ""
Write-Host "Get your API key from: https://platform.elnora.ai > Settings > API Keys"
Write-Host ""

if ([Environment]::UserInteractive) {
    $ApiKey = Read-Host "Paste your API key"

    if ($ApiKey) {
        Write-Host ""
        & "$InstallDir\elnora.exe" auth login --api-key $ApiKey
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "Login failed. You can try again anytime with:"
            Write-Host "  elnora auth login --api-key <paste-your-key-here>"
        }
    } else {
        Write-Host "Skipped. You can log in later with:"
        Write-Host "  elnora auth login --api-key <paste-your-key-here>"
    }
} else {
    Write-Host "To get started:"
    Write-Host "  elnora auth login --api-key <paste-your-key-here>"
}
