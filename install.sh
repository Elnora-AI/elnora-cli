#!/bin/sh
set -e

# Elnora CLI installer for macOS and Linux
# Usage: curl -fsSL https://cli.elnora.ai/install.sh | bash
# Pin version: curl -fsSL https://cli.elnora.ai/install.sh | bash -s v1.0.0

VERSION="${1:-}"
REPO="Elnora-AI/elnora-cli"
INSTALL_DIR="${ELNORA_INSTALL_DIR:-$HOME/.local/bin}"

err() { echo "" >&2; echo "Error: $1" >&2; if [ -n "${2:-}" ]; then echo "  $2" >&2; fi; exit 1; }

# OS detection
OS="$(uname -s)"
case "$OS" in
  Linux*)   OS="linux" ;;
  Darwin*)  OS="macos" ;;
  *)        err "Unsupported OS: $OS." "Try instead: npm install -g @elnora-ai/cli" ;;
esac

# Arch detection
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  ARCH="x64" ;;
  arm64|aarch64)  ARCH="arm64" ;;
  *)              err "Unsupported architecture: $ARCH." "Try instead: npm install -g @elnora-ai/cli" ;;
esac

# Resolve latest version from GitHub API if not pinned
if [ -z "$VERSION" ]; then
  VERSION=$(curl -fsSL --connect-timeout 10 --max-time 15 "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null \
    | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/') || true
  if [ -z "$VERSION" ]; then
    err "Could not fetch the latest version. Check your internet connection." \
        "Retry, or pin a version: curl -fsSL https://cli.elnora.ai/install.sh | bash -s -- v<VERSION>"
  fi
fi

TARGET="elnora-${OS}-${ARCH}"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/${VERSION}/${TARGET}.tar.gz"
CHECKSUM_URL="https://github.com/$REPO/releases/download/${VERSION}/${TARGET}.sha256"

echo "Installing Elnora CLI ${VERSION} (${OS}-${ARCH})..."

# Create install directory
mkdir -p "$INSTALL_DIR" 2>/dev/null || \
  err "Could not create directory: $INSTALL_DIR" \
      "Fix permissions: sudo mkdir -p $INSTALL_DIR && sudo chown \$(whoami) $INSTALL_DIR"

# Download and extract
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Download binary
if ! curl -fsSL --connect-timeout 10 --max-time 120 "$DOWNLOAD_URL" -o "$TMPDIR/${TARGET}.tar.gz" 2>/dev/null; then
  err "Failed to download Elnora CLI ${VERSION} for ${OS}-${ARCH}." \
      "Check that this version exists: https://github.com/$REPO/releases/tag/${VERSION}"
fi

# Download checksum
SKIP_CHECKSUM=""
if ! curl -fsSL --connect-timeout 10 --max-time 15 "$CHECKSUM_URL" -o "$TMPDIR/${TARGET}.sha256" 2>/dev/null; then
  echo "Warning: Could not download checksum file. Skipping verification."
  echo "  You can verify manually at: $CHECKSUM_URL"
  SKIP_CHECKSUM=1
fi

# Verify checksum
cd "$TMPDIR"
if [ "${SKIP_CHECKSUM:-}" != "1" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "${TARGET}.sha256" || err "Checksum verification failed. The download may be corrupted." \
        "Try running the installer again: curl -fsSL https://cli.elnora.ai/install.sh | bash"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "${TARGET}.sha256" || err "Checksum verification failed. The download may be corrupted." \
        "Try running the installer again: curl -fsSL https://cli.elnora.ai/install.sh | bash"
  else
    echo "Warning: No checksum tool found (sha256sum or shasum). Skipping verification."
  fi
fi

# Extract and install
if ! tar -xzf "${TARGET}.tar.gz" 2>/dev/null; then
  err "Failed to extract archive. The download may be corrupted." \
      "Try running the installer again: curl -fsSL https://cli.elnora.ai/install.sh | bash"
fi

if [ ! -f "${TARGET}" ]; then
  err "Binary not found after extraction. The release archive may be incomplete." \
      "Report this issue: https://github.com/$REPO/issues"
fi

if ! mv "${TARGET}" "$INSTALL_DIR/elnora" 2>/dev/null; then
  err "Could not install to $INSTALL_DIR/elnora. Permission denied." \
      "Fix permissions: sudo chown \$(whoami) $INSTALL_DIR"
fi
chmod +x "$INSTALL_DIR/elnora"

# Extract skills if bundled in the archive
if [ -d "skills" ]; then
  mkdir -p "$HOME/.elnora/skills"
  cp -r skills/* "$HOME/.elnora/skills/" 2>/dev/null || true
fi

echo ""
echo "  Elnora CLI ${VERSION} installed to $INSTALL_DIR/elnora"

# ---------------------------------------------------------------------------
# Auto-PATH — add INSTALL_DIR to shell rc and current session
# ---------------------------------------------------------------------------

if echo "$PATH" | grep -q "$INSTALL_DIR"; then
  echo "  PATH already includes $INSTALL_DIR"
else
  export PATH="$INSTALL_DIR:$PATH"

  if [ -t 1 ]; then
    # Interactive: append to shell rc file
    case "${SHELL:-unknown}" in
      */zsh)
        RC="$HOME/.zshrc"
        [ -f "$HOME/.zprofile" ] && [ ! -f "$RC" ] && RC="$HOME/.zprofile"
        ;;
      */bash)
        # macOS uses .bash_profile for login shells; Linux uses .bashrc
        if [ "$(uname -s)" = "Darwin" ]; then
          RC="$HOME/.bash_profile"
        else
          RC="$HOME/.bashrc"
        fi
        ;;
      */fish)
        RC="$HOME/.config/fish/config.fish"
        ;;
      *)
        RC=""
        ;;
    esac

    if [ -n "$RC" ]; then
      if [ "${SHELL:-}" = "*/fish" ] 2>/dev/null; then
        echo "set -gx PATH $INSTALL_DIR \$PATH" >> "$RC"
      else
        echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$RC"
      fi
      echo "  Added $INSTALL_DIR to PATH (in $RC)"
    else
      echo "  Added $INSTALL_DIR to PATH (current session only)"
      echo "  To persist, add this to your shell config:"
      echo "    export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
  else
    # Non-interactive: just print the export command
    echo "  Add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
  fi
fi

# ---------------------------------------------------------------------------
# Auth login — interactive only (stdin is piped from curl, use /dev/tty)
# ---------------------------------------------------------------------------

AUTH_OK=""
if [ -t 1 ]; then
  echo ""
  if "$INSTALL_DIR/elnora" auth login </dev/tty 2>/dev/null; then
    AUTH_OK=1
  fi
fi

# ---------------------------------------------------------------------------
# Auto-setup — detect and configure AI coding tools
# ---------------------------------------------------------------------------

SETUP_OUTPUT=""
if [ -t 1 ]; then
  SETUP_OUTPUT=$("$INSTALL_DIR/elnora" setup 2>&1) || true
  if [ -n "$SETUP_OUTPUT" ]; then
    echo "$SETUP_OUTPUT" >&2
  fi
fi

# ---------------------------------------------------------------------------
# Success banner
# ---------------------------------------------------------------------------

echo ""
if [ -n "$AUTH_OK" ]; then
  echo "  Done! To get started, run: elnora --help"
else
  echo "  To get started:"
  echo "    elnora auth login"
  echo "    elnora setup          # Configure AI coding tools"
  echo "    elnora --help"
fi
