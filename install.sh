#!/usr/bin/env bash
#
# ForzaPanel — minimal VPS setup: node, clone, install, dev.
#
#   curl -fsSL https://forzayt.github.io/install.sh | bash
#
set -euo pipefail

REPO_URL="https://github.com/forzayt/Forza_Panel.git"
APP_DIR="${APP_DIR:-forzapanel}"

# Node 20 (skip if node 18+ already present)
if ! command -v node >/dev/null 2>&1 || [ "$(node -p "process.versions.node.split('.')[0]")" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
  sudo apt-get install -y nodejs
fi

# Clone (pull if already cloned)
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
npm i
npm run dev
