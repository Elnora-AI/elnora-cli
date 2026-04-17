class Elnora < Formula
  desc "Elnora AI Platform CLI — manage bioprotocols from your terminal"
  homepage "https://github.com/Elnora-AI/elnora-cli"
  version "{{VERSION}}"
  license "Apache-2.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/Elnora-AI/elnora-cli/releases/download/v{{VERSION}}/elnora-macos-arm64.tar.gz"
      sha256 "{{SHA256_MACOS_ARM64}}"
    else
      url "https://github.com/Elnora-AI/elnora-cli/releases/download/v{{VERSION}}/elnora-macos-x64.tar.gz"
      sha256 "{{SHA256_MACOS_X64}}"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/Elnora-AI/elnora-cli/releases/download/v{{VERSION}}/elnora-linux-arm64.tar.gz"
      sha256 "{{SHA256_LINUX_ARM64}}"
    else
      url "https://github.com/Elnora-AI/elnora-cli/releases/download/v{{VERSION}}/elnora-linux-x64.tar.gz"
      sha256 "{{SHA256_LINUX_X64}}"
    end
  end

  def install
    if OS.mac? && Hardware::CPU.arm?
      bin.install "elnora-macos-arm64" => "elnora"
    elsif OS.mac?
      bin.install "elnora-macos-x64" => "elnora"
    elsif Hardware::CPU.arm?
      bin.install "elnora-linux-arm64" => "elnora"
    else
      bin.install "elnora-linux-x64" => "elnora"
    end
  end

  def caveats
    <<~EOS
      To get started:

        elnora auth login
        elnora setup          # Configure Claude Code, Cursor, etc.

      You'll need an API key from https://platform.elnora.ai
    EOS
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/elnora --version")
  end
end
