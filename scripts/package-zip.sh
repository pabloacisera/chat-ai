#!/bin/bash
# Creates a deployment-ready zip of the app, excluding dev/compiled artifacts
OUTPUT="chatai-v1.zip"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

zip -r "$OUTPUT" . \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x "dist/*" \
  -x "*/dist/*" \
  -x "build/*" \
  -x "*/build/*" \
  -x ".git/*" \
  -x ".gitignore" \
  -x ".env" \
  -x "packages/api-express/.env" \
  -x ".cline/*" \
  -x "venv/*" \
  -x "*/venv/*" \
  -x "*.txt" \
  -x "data/*" \
  -x "*/data/*" \
  -x "test-stream-node.ts" \
  -x "test-stream.html" \
  -x "*.zip"

echo "Created: $PROJECT_ROOT/$OUTPUT"
