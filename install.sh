#!/usr/bin/env bash
#
# ForzaPanel — one-shot VPS setup.
#
# Installs Node.js LTS, clones the repo, installs dependencies, installs the
# privileged helper, builds the production bundle and registers the panel as a
# systemd service that starts with the machine and keeps running after the
# terminal is closed.
#
#   curl -fsSL https://raw.githubusercontent.com/forzayt/Forza_Panel/main/install.sh | bash
#
# Re-running it is the supported way to update: it pulls, rebuilds and restarts.
#
# Overridable: APP_DIR, APP_USER, PORT, SERVICE_NAME
#   PORT=8080 APP_DIR=/opt/forzapanel bash install.sh
#
set -euo pipefail

REPO_URL="https://github.com/forzayt/Forza_Panel.git"
APP_DIR="${APP_DIR:-forzapanel}"
APP_USER="${APP_USER:-${SUDO_USER:-$(id -un)}}"
PORT="${PORT:-3000}"
SERVICE_NAME="${SERVICE_NAME:-forzapanel}"
MIN_NODE_MAJOR=20

say() { printf '\n==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

[ "$(uname -s)" = "Linux" ] || die "this installer targets Linux (apt + systemd); run it on the VPS"

# NB: with `curl … | bash` this script arrives on stdin. A child that reads
# stdin would swallow the remaining script and the install would stop halfway,
# so every helper below is given /dev/null explicitly. sudo still asks for its
# password because it opens /dev/tty directly, not stdin.

id -u "$APP_USER" >/dev/null 2>&1 || die "user \"$APP_USER\" does not exist"
[[ "$SERVICE_NAME" =~ ^[A-Za-z0-9_.@-]+$ ]] || die "invalid SERVICE_NAME: $SERVICE_NAME"
[[ "$PORT" =~ ^[0-9]+$ ]] || die "invalid PORT: $PORT"
[ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || die "PORT must be 1-65535"

# Privileges: use sudo when we are not root already. Minimal images that log
# you straight in as root often ship without sudo, so don't assume it exists.
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
elif command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
else
  die "sudo is required — install it, or run this script as root"
fi

if [ "$APP_USER" = "root" ]; then
  warn "the panel will run as root — prefer a normal user (set APP_USER=youruser)"
fi

# --- Node.js (latest LTS from NodeSource, never a pinned version) -----------
if ! command -v node >/dev/null 2>&1 || [ "$(node -p "process.versions.node.split('.')[0]")" -lt "$MIN_NODE_MAJOR" ]; then
  say "Installing the latest Node.js LTS"
  curl -fsSL https://deb.nodesource.com/setup_lts.x | $SUDO bash -
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs </dev/null
  echo "Node.js $(node -v) installed"
fi

NODE_BIN="$(command -v node)"
[ -n "$NODE_BIN" ] || die "node is not on PATH"

# --- Source ------------------------------------------------------------------
if [ -d "$APP_DIR/.git" ]; then
  APP_FULL="$(cd "$APP_DIR" && pwd -P)"
  say "Updating $APP_FULL"
  # Since git 2.35 a root-owned shell refuses to touch a repo owned by another
  # user ("detected dubious ownership"). The checkout belongs to APP_USER, so
  # allow that one path for this single command.
  git -c safe.directory="$APP_FULL" -C "$APP_FULL" pull --ff-only \
    || warn "could not fast-forward the repository — continuing with the local checkout"
else
  say "Cloning into $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR" </dev/null
  APP_FULL="$(cd "$APP_DIR" && pwd -P)"
fi

cd "$APP_FULL"

# --- Stop whatever is already serving this folder -----------------------------
# A leftover `npm run dev` holds port 3000 and would fight the service. Only
# processes whose working directory is this checkout are touched.
stop_local_dev() {
  command -v pgrep >/dev/null 2>&1 || return 0
  local pid cwd cmd
  for pid in $(pgrep -f 'next' 2>/dev/null || true); do
    if [ "$pid" = "$$" ]; then continue; fi
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    [ "$cwd" = "$APP_FULL" ] || continue
    cmd="$(tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null || true)"
    case "$cmd" in
      *"next dev"* | *"next-server"*) kill "$pid" 2>/dev/null || true ;;
    esac
  done
}

if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  $SUDO systemctl stop "$SERVICE_NAME" 2>/dev/null || true
fi
stop_local_dev

# --- Dependencies + production build -----------------------------------------
say "Installing npm dependencies"
npm i </dev/null

say "Building the production bundle (this takes a minute)"
npm run build </dev/null

# --- Root helper --------------------------------------------------------------
# Lets the panel run apt/service actions through a small allowlisted script
# (scripts/forzapanel-priv) instead of keeping a password. If this fails the
# panel falls back to asking for the sudo password once per session, so a
# failure is a warning, not fatal.
say "Installing the privileged helper"
if ! $SUDO bash scripts/install-privileges.sh "$APP_USER" </dev/null; then
  warn "could not install the privilege helper — the panel will ask for the sudo password instead."
fi

# Files created while running as root must belong to the service user.
if [ "$(id -u)" -eq 0 ] && [ "$APP_USER" != "root" ]; then
  chown -R "$APP_USER":"$(id -gn "$APP_USER")" "$APP_FULL" 2>/dev/null || true
  # A checkout inside /root is unreadable for the service user; catch that here
  # instead of letting systemd fail with a bare permission error.
  if command -v runuser >/dev/null 2>&1; then
    runuser -u "$APP_USER" -- test -r "$APP_FULL/package.json" </dev/null ||
      die "$APP_FULL is not readable by $APP_USER — clone the panel into that user's home (e.g. APP_DIR=/home/$APP_USER/forzapanel) and retry"
  fi
fi

# --- Service ------------------------------------------------------------------
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
URL="http://${LAN_IP:-127.0.0.1}:$PORT"

if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  UNIT="/etc/systemd/system/${SERVICE_NAME}.service"

  say "Registering the systemd service ${SERVICE_NAME}.service"
  $SUDO tee "$UNIT" >/dev/null <<EOF
[Unit]
Description=ForzaPanel game server control panel
Documentation=https://github.com/forzayt/Forza_Panel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_FULL
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=PORT=$PORT
ExecStart="$NODE_BIN" "$APP_FULL/node_modules/next/dist/bin/next" start -p $PORT -H 0.0.0.0
Restart=always
RestartSec=3
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
EOF

  $SUDO systemctl daemon-reload
  $SUDO systemctl enable "$SERVICE_NAME" >/dev/null
  $SUDO systemctl restart "$SERVICE_NAME"

  say "Waiting for the panel to answer on port $PORT"
  STARTED=0
  if ! command -v curl >/dev/null 2>&1; then
    STARTED=2
  else
    for _ in {1..20}; do
      if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/api/admin/status" >/dev/null 2>&1; then
        STARTED=1
        break
      fi
      sleep 1
    done
    if [ "$STARTED" -eq 0 ] && $SUDO systemctl is-active --quiet "$SERVICE_NAME"; then
      # Running, but maybe still compiling its first request — good enough.
      STARTED=2
    fi
  fi

  echo
  case "$STARTED" in
    1) echo "ForzaPanel is running as a service (starts automatically on boot)." ;;
    2) echo "ForzaPanel is running as a service (starts automatically on boot). Response not verified yet." ;;
    *) echo "ForzaPanel was installed, but it has not answered yet." ;;
  esac
  cat <<EOF

  URL       $URL
  Status    sudo systemctl status $SERVICE_NAME
  Logs      sudo journalctl -u $SERVICE_NAME -f
  Restart   sudo systemctl restart $SERVICE_NAME
  Stop      sudo systemctl stop $SERVICE_NAME
  Update    re-run this script, or:
            git -C $APP_FULL pull && cd $APP_FULL && npm i && npm run build \\
              && sudo systemctl restart $SERVICE_NAME

Closing this terminal does not stop the panel.
EOF

  if [ "$STARTED" -eq 0 ]; then
    echo
    warn "check the logs with: sudo journalctl -u $SERVICE_NAME -n 80 --no-pager"
  fi
else
  # WSL, containers and other hosts without systemd: start the panel detached
  # so it survives the shell going away.
  say "systemd is not available here — starting the panel detached with setsid"
  PID_FILE="$APP_FULL/forzapanel.pid"
  LOG_FILE="$APP_FULL/forzapanel.log"

  if [ -f "$PID_FILE" ]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
    [ -n "$OLD_PID" ] && kill "$OLD_PID" 2>/dev/null || true
  fi

  NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 setsid nohup "$NODE_BIN" \
    "$APP_FULL/node_modules/next/dist/bin/next" start \
    -p "$PORT" -H 0.0.0.0 >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  sleep 3
  APP_PID="$(pgrep -f "$APP_FULL/node_modules/next/dist/bin/next start" 2>/dev/null | head -n1 || true)"
  [ -n "$APP_PID" ] || APP_PID="$(cat "$PID_FILE" 2>/dev/null || echo '?')"
  echo "$APP_PID" >"$PID_FILE"

  cat <<EOF

ForzaPanel is running in the background (pid $APP_PID).
It keeps running after this terminal closes, but it will NOT start on boot —
install systemd (or run this script again on a normal Linux host) for that.

  URL       $URL
  Logs      tail -f $LOG_FILE
  Stop      kill "\$(cat $PID_FILE)"
EOF
fi
