#!/usr/bin/env bash
set -euo pipefail

CHECKSUMS_FILE="dist/binaries/checksums.txt"
TEMPLATE="packaging/homebrew/stubidp.rb.template"
TAP_REPO="https://x-access-token:${GH_TOKEN}@github.com/cerberauth/homebrew-stubidp.git"
WORK_DIR=$(mktemp -d)

VERSION="${RELEASE_TAG#v}"

extract_sha() {
  grep "$1" "$CHECKSUMS_FILE" | awk '{print $1}'
}

SHA_MACOS_ARM64=$(extract_sha "stubidp-macos-arm64")
SHA_MACOS_X64=$(extract_sha "stubidp-macos-x64")
SHA_LINUX_ARM64=$(extract_sha "stubidp-linux-arm64")
SHA_LINUX_X64=$(extract_sha "stubidp-linux-x64")

git clone "$TAP_REPO" "$WORK_DIR"

sed \
  -e "s/VERSION_PLACEHOLDER/$VERSION/g" \
  -e "s/SHA_MACOS_ARM64_PLACEHOLDER/$SHA_MACOS_ARM64/g" \
  -e "s/SHA_MACOS_X64_PLACEHOLDER/$SHA_MACOS_X64/g" \
  -e "s/SHA_LINUX_ARM64_PLACEHOLDER/$SHA_LINUX_ARM64/g" \
  -e "s/SHA_LINUX_X64_PLACEHOLDER/$SHA_LINUX_X64/g" \
  "$TEMPLATE" > "$WORK_DIR/Formula/stubidp.rb"

cd "$WORK_DIR"
git config user.email "bot@cerberauth.com"
git config user.name "CerberAuth Bot"
git add Formula/stubidp.rb
git commit -m "chore: update stubidp to v$VERSION"
git push origin main

rm -rf "$WORK_DIR"
echo "Homebrew tap updated for v$VERSION"
