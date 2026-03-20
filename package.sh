#!/bin/bash
# Package wfm-demo source files into a zip for distribution
# Usage: ./package.sh [output_name]

set -e

NAME="${1:-wfm-demo}"
DATE=$(date +%Y%m%d)
OUTPUT="${NAME}_${DATE}.zip"
PROJECT_DIR=$(cd "$(dirname "$0")" && pwd)

cd "$PROJECT_DIR"

rm -f "$OUTPUT"

zip -r "$OUTPUT" . \
  -x "*/node_modules/*" \
  -x "*/dist/*" \
  -x "*/dist-ssr/*" \
  -x ".git/*" \
  -x "*.zip" \
  -x "*/.DS_Store" \
  -x "*.log" \
  -x ".DS_Store"

SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "Packaged: $OUTPUT ($SIZE)"
