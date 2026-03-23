#!/usr/bin/env bash
set -euo pipefail

# GoReleaser calls this as: <gobinary> build [flags...] -o <output_path> <main>
# We ignore the Go-specific flags and just copy the pre-built Bun binary
# to the expected output path.

OUTPUT=""
args=("$@")
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == "-o" ]]; then
    OUTPUT="${args[$((i+1))]}"
    break
  fi
done

if [[ -z "$OUTPUT" ]]; then
  echo "error: -o flag not found in: $*" >&2
  exit 1
fi

OS="${GOOS:-linux}"
ARCH="${GOARCH:-amd64}"

case "${OS}_${ARCH}" in
  linux_amd64)   SRC="bins/linux_amd64/stubidp" ;;
  linux_arm64)   SRC="bins/linux_arm64/stubidp" ;;
  darwin_amd64)  SRC="bins/darwin_amd64/stubidp" ;;
  darwin_arm64)  SRC="bins/darwin_arm64/stubidp" ;;
  windows_amd64) SRC="bins/windows_amd64/stubidp.exe" ;;
  *)
    echo "error: unsupported platform ${OS}_${ARCH}" >&2
    exit 1
    ;;
esac

mkdir -p "$(dirname "$OUTPUT")"
cp "$SRC" "$OUTPUT"
