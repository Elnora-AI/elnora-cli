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
        Write-Host "  Retry, or pin a version: irm https://cli.elnora.ai/install.ps1 | iex -Version v<VERSION>"
        throw "Could not fetch the latest version."
    }
    if (-not $Version) {
        Write-Host ""
        Write-Host "Error: Could not determine the latest version." -ForegroundColor Red
        Write-Host "  Check releases: https://github.com/$Repo/releases"
        throw "Could not determine the latest version."
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
    throw "Could not create install directory: $InstallDir"
}

# Download
$TmpDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }

# Try the native build first. If ARM64 asset is missing for this release,
# fall back to x64 — Windows 11 on ARM runs x64 binaries transparently.
$downloadOk = $false
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile "$TmpDir\$Target.zip" -TimeoutSec 120
    $downloadOk = $true
} catch {
    if ($Arch -eq "arm64") {
        Write-Host "  Note: native arm64 build not available for $Version; falling back to x64 (runs via Windows on ARM emulation)."
        $Arch = "x64"
        $Target = "elnora-win-$Arch.exe"
        $DownloadUrl = "https://github.com/$Repo/releases/download/$Version/$Target.zip"
        $ChecksumUrl = "https://github.com/$Repo/releases/download/$Version/$Target.sha256"
        try {
            Invoke-WebRequest -Uri $DownloadUrl -OutFile "$TmpDir\$Target.zip" -TimeoutSec 120
            $downloadOk = $true
        } catch {
            # Fall through to the error branch below.
        }
    }
}
if (-not $downloadOk) {
    Write-Host ""
    Write-Host "Error: Failed to download Elnora CLI $Version for win-$Arch." -ForegroundColor Red
    Write-Host "  Check that this version exists: https://github.com/$Repo/releases/tag/$Version"
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
    throw "Failed to download Elnora CLI $Version for win-$Arch."
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
            throw "Checksum verification failed for $Target.zip."
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
    throw "Failed to extract $Target.zip."
}

if (-not (Test-Path "$TmpDir\$Target")) {
    Write-Host ""
    Write-Host "Error: Binary not found after extraction. The release archive may be incomplete." -ForegroundColor Red
    Write-Host "  Report this issue: https://github.com/$Repo/issues"
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
    throw "Binary missing after extraction: $Target."
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
    throw "Failed to copy elnora.exe to $InstallDir."
}

# Add to PATH — persist AND update current session
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$InstallDir*") {
    try {
        [Environment]::SetEnvironmentVariable("Path", "$InstallDir;$userPath", "User")
        $env:PATH = "$InstallDir;$env:PATH"
        Write-Host "  Added $InstallDir to PATH"
    } catch {
        # Persist failed, but still update current session
        $env:PATH = "$InstallDir;$env:PATH"
        Write-Host "  Added $InstallDir to PATH (current session only)"
        Write-Host "  To persist, add it manually via Settings > System > Environment Variables"
    }
} else {
    # Already in persisted PATH, ensure current session has it too
    if ($env:PATH -notlike "*$InstallDir*") {
        $env:PATH = "$InstallDir;$env:PATH"
    }
    Write-Host "  PATH already includes $InstallDir"
}

# Extract skills if bundled in the archive
if (Test-Path "$TmpDir\skills") {
    $SkillsDir = "$env:USERPROFILE\.elnora\skills"
    New-Item -ItemType Directory -Force -Path $SkillsDir | Out-Null
    Copy-Item "$TmpDir\skills\*" $SkillsDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Cleanup
Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  Elnora CLI $Version installed to $InstallDir\elnora.exe"

# ---------------------------------------------------------------------------
# Auth login — interactive only
# ---------------------------------------------------------------------------

$AuthOk = $false
if ([Environment]::UserInteractive) {
    Write-Host ""
    try {
        & "$InstallDir\elnora.exe" auth login
        $AuthOk = $true
    } catch {
        # Auth failed or was cancelled — continue to setup
    }
}

# ---------------------------------------------------------------------------
# Auto-setup — detect and configure AI coding tools
# ---------------------------------------------------------------------------

if ([Environment]::UserInteractive) {
    try {
        & "$InstallDir\elnora.exe" setup
    } catch {
        # Setup failed — non-fatal
    }
}

# ---------------------------------------------------------------------------
# Success banner
# ---------------------------------------------------------------------------

Write-Host ""
if ($AuthOk) {
    Write-Host "  Done! To get started, run: elnora --help" -ForegroundColor Green
} else {
    Write-Host "  To get started:"
    Write-Host "    elnora auth login"
    Write-Host "    elnora setup          # Configure AI coding tools"
    Write-Host "    elnora --help"
}
