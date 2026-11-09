#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "PORT must be numeric: $PORT" >&2; exit 1; }

run_timed() {
  local label="$1"
  shift
  /usr/bin/time -f "[timing] ${label}: %e s" "$@"
}

run_timed 'dependency install' npm ci
run_timed 'production build' npm run build

# Worker metadata belongs outside the project; built files remain in PROJECT_DIR/dist.
: "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must be set}"
run_timed 'deployment metadata' node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const project = process.argv[1];
  const output = path.join(process.env.OPENCODE_WEB_DIR, "deployment-output.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ project, directory: path.join(project, "dist") }));
' "$PROJECT_DIR"

test -f "$PROJECT_DIR/dist/index.html"
echo "Serving $PROJECT_DIR/dist on port $PORT"
run_timed 'static server' npm run preview -- --host 0.0.0.0 --port "$PORT" --strictPort
