# ---------------------------------------------------------------------------
# Cold-start smoke test (Windows)
#
# Verifies the install -> auth -> setup -> skills flow works end-to-end.
# Exits non-zero on any failure.
#
# Usage:
#   # Full test (requires SMOKE_TEST_API_KEY env var):
#   $env:SMOKE_TEST_API_KEY = "<your-api-key>"
#   .\scripts\smoke-test-coldstart.ps1
#
#   # Structure-only test (skips auth + API):
#   .\scripts\smoke-test-coldstart.ps1
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Continue"
$Pass = 0
$Fail = 0

function Test-Pass($msg) { Write-Host "  PASS: $msg"; $script:Pass++ }
function Test-Fail($msg) { Write-Host "  FAIL: $msg"; $script:Fail++ }

Write-Host "=== Cold-start smoke test (Windows) ==="
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Binary exists and is executable
# ---------------------------------------------------------------------------

$elnora = Get-Command elnora -ErrorAction SilentlyContinue
if ($elnora) {
    Test-Pass "elnora is in PATH ($($elnora.Source))"
} else {
    $fallback = "$env:USERPROFILE\.elnora\bin\elnora.exe"
    if (Test-Path $fallback) {
        $env:PATH = "$env:USERPROFILE\.elnora\bin;$env:PATH"
        Test-Pass "elnora found at $fallback (added to PATH)"
    } else {
        Test-Fail "elnora is NOT in PATH and not at $fallback"
        Write-Host ""
        Write-Host "Cannot continue without elnora binary."
        exit 1
    }
}

# ---------------------------------------------------------------------------
# 2. Version output
# ---------------------------------------------------------------------------

$version = & elnora --version 2>$null
if ($version) {
    Test-Pass "elnora --version -> $version"
} else {
    Test-Fail "elnora --version returned empty"
}

# ---------------------------------------------------------------------------
# 3. setup-claude alias exists
# ---------------------------------------------------------------------------

$setupHelp = & elnora setup-claude --help 2>$null
if ($LASTEXITCODE -eq 0) {
    Test-Pass "elnora setup-claude command exists"
} else {
    Test-Fail "elnora setup-claude command does not exist"
}

# ---------------------------------------------------------------------------
# 4. setup claude writes correct marketplace entries
# ---------------------------------------------------------------------------

$claudeDir = "$env:USERPROFILE\.claude"
if (Test-Path $claudeDir) {
    & elnora setup claude 2>$null

    $settings = "$claudeDir\settings.json"
    if (Test-Path $settings) {
        $content = Get-Content $settings -Raw
        if ($content -match '"elnora@elnora-plugins"') {
            Test-Pass "settings.json has elnora@elnora-plugins"
        } else {
            Test-Fail "settings.json missing elnora@elnora-plugins"
        }

        if ($content -match '"elnora@elnora-ai"') {
            Test-Fail "settings.json still has broken elnora@elnora-ai"
        } else {
            Test-Pass "no stale elnora@elnora-ai in settings.json"
        }
    } else {
        Test-Fail "settings.json not found"
    }

    $marketplaces = "$claudeDir\plugins\known_marketplaces.json"
    if (Test-Path $marketplaces) {
        $mpContent = Get-Content $marketplaces -Raw
        if ($mpContent -match '"elnora-plugins"') {
            Test-Pass "known_marketplaces.json has elnora-plugins"
        } else {
            Test-Fail "known_marketplaces.json missing elnora-plugins"
        }
    } else {
        Test-Fail "known_marketplaces.json not found"
    }
} else {
    Write-Host "  SKIP: ~/.claude/ not found -- skipping Claude Code setup tests"
}

# ---------------------------------------------------------------------------
# 5. SKILL.md files contain Tool Access block
# ---------------------------------------------------------------------------

$skillsDir = $null
$candidates = @(
    "$claudeDir\plugins\marketplaces\elnora-plugins\elnora\skills",
    "$env:USERPROFILE\.elnora\skills"
)
# Also check repo-local skills
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoSkills = Join-Path (Split-Path -Parent $scriptDir) "skills"
if (Test-Path $repoSkills) { $candidates = @($repoSkills) + $candidates }

foreach ($d in $candidates) {
    if (Test-Path $d) { $skillsDir = $d; break }
}

if ($skillsDir) {
    $skillCount = 0
    $toolAccessCount = 0
    Get-ChildItem "$skillsDir\elnora-*\SKILL.md" -ErrorAction SilentlyContinue | ForEach-Object {
        $skillCount++
        if ((Get-Content $_.FullName -Raw) -match "## Tool Access") {
            $toolAccessCount++
        } else {
            Test-Fail "Missing Tool Access in $($_.Directory.Name)\SKILL.md"
        }
    }
    if ($skillCount -eq 0) {
        Test-Fail "No SKILL.md files found in $skillsDir"
    } elseif ($toolAccessCount -eq $skillCount) {
        Test-Pass "All $skillCount skills have Tool Access block"
    }
} else {
    Write-Host "  SKIP: No skills directory found"
}

# ---------------------------------------------------------------------------
# 6. doctor produces sectioned output (Phase 2, v1.4.0)
# ---------------------------------------------------------------------------

$doctorOut = & elnora doctor 2>&1 | Out-String
if (($doctorOut -match 'CLI') -and
    ($doctorOut -match 'Claude Code') -and
    ($doctorOut -match 'MCP')) {
    Test-Pass "doctor shows three sections (CLI / Claude Code / MCP)"
} else {
    Test-Fail "doctor missing one or more sections"
}

# ---------------------------------------------------------------------------
# 7. API connectivity (requires SMOKE_TEST_API_KEY)
# ---------------------------------------------------------------------------

if ($env:SMOKE_TEST_API_KEY) {
    & elnora auth login --api-key $env:SMOKE_TEST_API_KEY 2>$null

    $doctorResult = & elnora doctor 2>$null
    if ($LASTEXITCODE -eq 0) {
        Test-Pass "elnora doctor passes"
    } else {
        Test-Fail "elnora doctor failed"
    }

    $projectsResult = & elnora projects list --compact 2>$null
    if ($LASTEXITCODE -eq 0) {
        Test-Pass "elnora projects list succeeds"
    } else {
        Test-Fail "elnora projects list failed"
    }
} else {
    Write-Host "  SKIP: SMOKE_TEST_API_KEY not set -- skipping API tests"
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "=== Results: $Pass passed, $Fail failed ==="

if ($Fail -gt 0) { exit 1 }
