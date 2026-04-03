#!/bin/sh
set -e

# Elnora CLI installer for macOS and Linux
# Usage: curl -fsSL https://cli.elnora.ai/install.sh | bash
# Pin version: curl -fsSL https://cli.elnora.ai/install.sh | bash -s v1.0.0

VERSION="${1:-}"
REPO="Elnora-AI/elnora-cli"
INSTALL_DIR="${ELNORA_INSTALL_DIR:-$HOME/.local/bin}"

err() { echo "Error: $1" >&2; exit 1; }

# OS detection
OS="$(uname -s)"
case "$OS" in
  Linux*)   OS="linux" ;;
  Darwin*)  OS="macos" ;;
  *)        err "Unsupported OS: $OS. Use npm install -g @elnora/cli instead." ;;
esac

# Arch detection
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  ARCH="x64" ;;
  arm64|aarch64)  ARCH="arm64" ;;
  *)              err "Unsupported architecture: $ARCH" ;;
esac

# Resolve latest version from GitHub API if not pinned
if [ -z "$VERSION" ]; then
  VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
  if [ -z "$VERSION" ]; then
    err "Failed to determine latest version. Provide version: curl ... | bash -s v1.0.0"
  fi
fi

TARGET="elnora-${OS}-${ARCH}"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/${VERSION}/${TARGET}.tar.gz"
CHECKSUM_URL="https://github.com/$REPO/releases/download/${VERSION}/${TARGET}.sha256"

echo "Installing Elnora CLI ${VERSION} (${OS}-${ARCH})..."

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download and extract
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL "$DOWNLOAD_URL" -o "$TMPDIR/${TARGET}.tar.gz"
curl -fsSL "$CHECKSUM_URL" -o "$TMPDIR/${TARGET}.sha256"

# Verify checksum
cd "$TMPDIR"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum -c "${TARGET}.sha256" || err "Checksum verification failed"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 -c "${TARGET}.sha256" || err "Checksum verification failed"
else
  echo "Warning: No checksum tool found, skipping verification"
fi

# Extract and install
tar -xzf "${TARGET}.tar.gz"
mv "${TARGET}" "$INSTALL_DIR/elnora"
chmod +x "$INSTALL_DIR/elnora"

echo ""
echo "Elnora CLI ${VERSION} installed to $INSTALL_DIR/elnora"

# PATH guidance
case "$SHELL" in
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
esac

echo ""
echo "Get started:"
echo "  elnora auth login"
echo "  elnora projects list"
