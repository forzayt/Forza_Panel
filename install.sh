#!/usr/bin/env bash
#
# ForzaPanel — minimal VPS setup: node, clone, install, dev.
#
#   curl -fsSL https://raw.githubusercontent.com/forzayt/Forza_Panel/main/install.sh | bash
#
set -euo pipefail

REPO_URL="https://github.com/forzayt/Forza_Panel.git"
APP_DIR="${APP_DIR:-forzapanel}"
MIN_NODE_MAJOR=20

# Install the latest Node.js LTS from NodeSource (the channel always resolves
# to the newest release, never a pinned version) unless a recent Node exists.
if ! command -v node >/dev/null 2>&1 || [ "$(node -p "process.versions.node.split('.')[0]")" -lt "$MIN_NODE_MAJOR" ]; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -
  sudo apt-get install -y nodejs
  echo "Node.js $(node -v) installed"
fi

# Clone (pull if already cloned)
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# Root helper: lets the panel run apt/service actions through a small
# allowlisted script (see scripts/forzapanel-priv) instead of keeping a
# password. If this fails the panel falls back to asking for the sudo
# password once per session, so a failure is a warning, not fatal.
if ! sudo bash scripts/install-privileges.sh "${SUDO_USER:-$(id -un)}"; then
  echo "warning: could not install the privilege helper — the panel will ask for the sudo password instead." >&2
fi

npm i
npm run dev
