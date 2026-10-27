#!/usr/bin/env bash
#
# Installs the ForzaPanel privileged helper and its sudoers rule.
#
#   sudo bash scripts/install-privileges.sh [panel-user]
#
# Must run as root (sudo). `panel-user` defaults to $SUDO_USER, i.e. the
# account that called sudo — that is normally the account running the panel.
#
# Re-run after moving the project or changing the panel user.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "install-privileges: run with sudo (or as root)" >&2
  exit 1
fi

TARGET_USER="${1:-${SUDO_USER:-root}}"
if ! [[ "$TARGET_USER" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "install-privileges: invalid user name: $TARGET_USER" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER_SRC="$SCRIPT_DIR/forzapanel-priv"
HELPER_DST="/usr/local/bin/forzapanel-priv"
SUDOERS_FILE="/etc/sudoers.d/forzapanel"

if [ ! -f "$HELPER_SRC" ]; then
  echo "install-privileges: helper not found at $HELPER_SRC" >&2
  exit 1
fi

# Root-owned, not writable by the panel user: the sudoers rule trusts this path.
install -o root -g root -m 0755 "$HELPER_SRC" "$HELPER_DST"

TMP_RULE="$(mktemp)"
trap 'rm -f "$TMP_RULE"' EXIT

printf '%s ALL=(root) NOPASSWD: %s\n' "$TARGET_USER" "$HELPER_DST" > "$TMP_RULE"

# Never install a rule sudo itself would refuse to parse.
visudo -cf "$TMP_RULE" >/dev/null

install -o root -g root -m 0440 "$TMP_RULE" "$SUDOERS_FILE"

echo "ForzaPanel privileges installed:"
echo "  helper:  $HELPER_DST"
echo "  sudoers: $SUDOERS_FILE (user: $TARGET_USER)"
echo
echo "The panel can now run apt and service actions without a password."
echo "Test with: sudo -n $HELPER_DST apt-update"
