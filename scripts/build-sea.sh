#!/usr/bin/env bash
set -euo pipefail

node --build-sea sea-config.json

BINARY="dist/stubidp"

if [[ "$(uname)" == "Darwin" ]]; then
  codesign --sign - "$BINARY"
fi

echo "Done: $BINARY"
