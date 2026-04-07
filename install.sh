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

echo ""
echo "Elnora CLI ${VERSION} installed to $INSTALL_DIR/elnora"

# PATH guidance
case "${SHELL:-unknown}" in
  */zsh)
    RC="$HOME/.zshrc"
    if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
      echo ""
      echo "Add to your PATH by running:"
      echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> $RC && source $RC"
    fi
    ;;
  */bash)
    RC="$HOME/.bashrc"
    if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
      echo ""
      echo "Add to your PATH by running:"
      echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> $RC && source $RC"
    fi
    ;;
  */fish)
    if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
      echo ""
      echo "Add to your PATH by running:"
      echo "  fish_add_path $INSTALL_DIR"
    fi
    ;;
  *)
    if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
      echo ""
      echo "Add $INSTALL_DIR to your shell's PATH to use 'elnora' from anywhere."
    fi
    ;;
esac

# Run interactive login — reads from /dev/tty since stdin is piped from curl
echo ""
if [ -t 1 ]; then
  "$INSTALL_DIR/elnora" auth login </dev/tty
else
  echo "To get started:"
  echo "  elnora auth login"
fi
