#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Cold-start smoke test
#
# Verifies the install → auth → setup → skills flow works end-to-end.
# Exits non-zero on any failure.
#
# Usage:
#   # Full test (requires SMOKE_TEST_API_KEY env var for auth + API checks):
#   SMOKE_TEST_API_KEY=<your-api-key> ./scripts/smoke-test-coldstart.sh
#
#   # Structure-only test (skips auth + API — verifies install, PATH, setup, skills):
#   ./scripts/smoke-test-coldstart.sh
# ---------------------------------------------------------------------------

set -euo pipefail

PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "=== Cold-start smoke test ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Binary exists and is executable
# ---------------------------------------------------------------------------

if command -v elnora >/dev/null 2>&1; then
  pass "elnora is in PATH"
else
  fail "elnora is NOT in PATH"
  echo "       Searched: $PATH"
  # Try common install locations as fallback
  for p in "$HOME/.local/bin/elnora" "/usr/local/bin/elnora"; do
    if [ -x "$p" ]; then
      echo "       Found at $p — adding to PATH"
      export PATH="$(dirname "$p"):$PATH"
      pass "elnora found at $p (added to PATH)"
      break
    fi
  done
  if ! command -v elnora >/dev/null 2>&1; then
    echo ""
    echo "Cannot continue without elnora binary."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# 2. Version output
# ---------------------------------------------------------------------------

VERSION=$(elnora --version 2>/dev/null || true)
if [ -n "$VERSION" ]; then
  pass "elnora --version → $VERSION"
else
  fail "elnora --version returned empty"
fi

# ---------------------------------------------------------------------------
# 3. setup-claude alias exists
# ---------------------------------------------------------------------------

if elnora setup-claude --help >/dev/null 2>&1; then
  pass "elnora setup-claude command exists"
else
  fail "elnora setup-claude command does not exist"
fi

# ---------------------------------------------------------------------------
# 4. setup claude writes correct marketplace entries
# ---------------------------------------------------------------------------

if [ -d "$HOME/.claude" ]; then
  # Run setup claude (non-destructive — idempotent)
  elnora setup claude 2>/dev/null || true

  # Check settings.json
  SETTINGS="$HOME/.claude/settings.json"
  if [ -f "$SETTINGS" ]; then
    if grep -q '"elnora@elnora-plugins"' "$SETTINGS"; then
      pass "settings.json has elnora@elnora-plugins"
    else
      fail "settings.json missing elnora@elnora-plugins"
    fi

    if grep -q '"elnora@elnora-ai"' "$SETTINGS"; then
      fail "settings.json still has broken elnora@elnora-ai (legacy not cleaned)"
    else
      pass "no stale elnora@elnora-ai in settings.json"
    fi
  else
    fail "settings.json not found at $SETTINGS"
  fi

  # Check known_marketplaces.json
  MARKETPLACES="$HOME/.claude/plugins/known_marketplaces.json"
  if [ -f "$MARKETPLACES" ]; then
    if grep -q '"elnora-plugins"' "$MARKETPLACES"; then
      pass "known_marketplaces.json has elnora-plugins entry"
    else
      fail "known_marketplaces.json missing elnora-plugins entry"
    fi
  else
    fail "known_marketplaces.json not found"
  fi
else
  echo "  SKIP: ~/.claude/ not found — skipping Claude Code setup tests"
fi

# ---------------------------------------------------------------------------
# 5. SKILL.md files contain Tool Access block
# ---------------------------------------------------------------------------

SKILLS_DIR=""
for d in "$HOME/.claude/plugins/marketplaces/elnora-plugins/elnora/skills" \
         "$HOME/.elnora/skills"; do
  if [ -d "$d" ]; then
    SKILLS_DIR="$d"
    break
  fi
done

# Also check repo-local skills if running from the repo
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_SKILLS="$(dirname "$SCRIPT_DIR")/skills"
if [ -d "$REPO_SKILLS" ]; then
  SKILLS_DIR="$REPO_SKILLS"
fi

if [ -n "$SKILLS_DIR" ]; then
  SKILL_COUNT=0
  TOOL_ACCESS_COUNT=0
  for skill in "$SKILLS_DIR"/elnora-*/SKILL.md; do
    [ -f "$skill" ] || continue
    SKILL_COUNT=$((SKILL_COUNT + 1))
    if grep -q "## Tool Access" "$skill"; then
      TOOL_ACCESS_COUNT=$((TOOL_ACCESS_COUNT + 1))
    else
      fail "Missing Tool Access in $(basename "$(dirname "$skill")")/SKILL.md"
    fi
  done

  if [ "$SKILL_COUNT" -eq 0 ]; then
    fail "No SKILL.md files found in $SKILLS_DIR"
  elif [ "$TOOL_ACCESS_COUNT" -eq "$SKILL_COUNT" ]; then
    pass "All $SKILL_COUNT skills have Tool Access block"
  fi
else
  echo "  SKIP: No skills directory found — skipping SKILL.md checks"
fi

# ---------------------------------------------------------------------------
# 6. --md global flag registered (Phase 2, v1.4.0)
# ---------------------------------------------------------------------------

if elnora --help 2>&1 | grep -qi '^\s*--md'; then
  pass "--md flag registered in global help"
else
  fail "--md flag missing from global help"
fi

# ---------------------------------------------------------------------------
# 7. doctor produces sectioned output (Phase 2, v1.4.0)
# ---------------------------------------------------------------------------

DOCTOR_OUT=$(elnora doctor 2>&1 || true)
if echo "$DOCTOR_OUT" | grep -qE '^\s*CLI\s*$' && \
   echo "$DOCTOR_OUT" | grep -qE '^\s*Claude Code\s*$' && \
   echo "$DOCTOR_OUT" | grep -qE '^\s*MCP\s*$'; then
  pass "doctor shows three sections (CLI / Claude Code / MCP)"
else
  fail "doctor missing one or more sections"
fi

# ---------------------------------------------------------------------------
# 8. API connectivity (requires SMOKE_TEST_API_KEY)
# ---------------------------------------------------------------------------

if [ -n "${SMOKE_TEST_API_KEY:-}" ]; then
  # Configure auth non-interactively
  elnora auth login --api-key "$SMOKE_TEST_API_KEY" >/dev/null 2>&1 || true

  if elnora doctor >/dev/null 2>&1; then
    pass "elnora doctor passes"
  else
    fail "elnora doctor failed"
  fi

  if elnora projects list --compact >/dev/null 2>&1; then
    pass "elnora projects list succeeds"
  else
    fail "elnora projects list failed"
  fi
else
  echo "  SKIP: SMOKE_TEST_API_KEY not set — skipping API tests"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
