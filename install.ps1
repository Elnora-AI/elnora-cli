# Elnora CLI installer for Windows
# Usage: irm https://cli.elnora.ai/install.ps1 | iex

param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$Repo = "Elnora-AI/elnora-cli"
$InstallDir = "$env:USERPROFILE\.elnora\bin"

# Resolve latest version
if (-not $Version) {
    $release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest"
    $Version = $release.tag_name
    if (-not $Version) {
        Write-Error "Failed to determine latest version."
        exit 1
    }
}

$Target = "elnora-win-x64.exe"
$DownloadUrl = "https://github.com/$Repo/releases/download/$Version/$Target.zip"
$ChecksumUrl = "https://github.com/$Repo/releases/download/$Version/$Target.sha256"

Write-Host "Installing Elnora CLI $Version (win-x64)..."

# Create install directory
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Download
$TmpDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
Invoke-WebRequest -Uri $DownloadUrl -OutFile "$TmpDir\$Target.zip"
Invoke-WebRequest -Uri $ChecksumUrl -OutFile "$TmpDir\$Target.sha256"

# Verify checksum
$expected = (Get-Content "$TmpDir\$Target.sha256").Split(" ")[0]
Expand-Archive -Path "$TmpDir\$Target.zip" -DestinationPath $TmpDir -Force
$actual = (Get-FileHash "$TmpDir\$Target" -Algorithm SHA256).Hash.ToLower()
if ($actual -ne $expected) {
    Write-Error "Checksum verification failed. Expected: $expected, Got: $actual"
    exit 1
}

# Install
Copy-Item "$TmpDir\$Target" "$InstallDir\elnora.exe" -Force

# Add to PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$InstallDir;$userPath", "User")
    Write-Host ""
    Write-Host "Added $InstallDir to user PATH. Restart your terminal to use 'elnora'."
}

# Cleanup
Remove-Item -Recurse -Force $TmpDir

Write-Host ""
Write-Host "Elnora CLI $Version installed to $InstallDir\elnora.exe"
Write-Host ""
Write-Host "Get started:"
Write-Host "  elnora auth login"
Write-Host "  elnora projects list"
