# ForzaPanel — Cloud Host

Lightweight game-server control panel. Create servers as folders, import game
templates (FiveM first), download the Linux server files, start them, and watch
live logs — all from one dashboard.

## Requirements

- Node.js 20+
- A **Linux host** (or WSL) to actually run game servers — the FiveM
  FXServer binaries are Linux-only. The panel UI itself runs anywhere.
- `tar` on PATH (Windows 10+ and all Linux distros ship one).

## Quick start

One command on a fresh VPS — installs the latest Node.js LTS, clones, installs
dependencies, installs the privileged helper, builds the production bundle and
registers **a systemd service** so the panel starts on boot and keeps running
after you close the terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/forzayt/Forza_Panel/main/install.sh | bash
```

Re-running the same command updates the checkout, rebuilds and restarts the
service. Override `PORT`, `APP_DIR`, `APP_USER` or `SERVICE_NAME` on the right
side of the pipe, e.g.:

```bash
curl -fsSL https://raw.githubusercontent.com/forzayt/Forza_Panel/main/install.sh \
  | PORT=8080 APP_DIR=/opt/forzapanel bash
```

```bash
sudo systemctl status forzapanel    # is it running?
sudo journalctl -u forzapanel -f    # live logs
sudo systemctl restart forzapanel   # after editing .env / admin.json
sudo systemctl stop forzapanel
```

On hosts without systemd (containers, plain WSL) the script starts the panel
detached with `setsid` instead — it survives the terminal closing, but you have
to start it yourself after a reboot.

The service runs as the user who ran the installer (`SUDO_USER` when you used
`sudo`, otherwise your own account) out of `forzapanel/` in their home, so
nothing in the checkout ends up root-owned. If you are logged in as **root**,
the panel would run as root — the script warns; pass `APP_USER=someuser
APP_DIR=/home/someuser/forzapanel` to avoid that. Port 3000 needs no
privileges, so a normal user is enough.

Or manually:

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login` first.

```bash
npm run build   # production build (stop the dev server first — see below)
npm start       # serve the production build
```

## Admin login

The panel is password protected. Credentials live in `admin.json` in the
project root:

```json
{
  "username": "admin",
  "password": "admin"
}
```

Defaults: username **admin**, password **admin** — change them before
exposing the panel to the internet.

- Both fields empty → every route redirects to `/login`, where the first
  admin account can be created (written back to `admin.json`).
- A plaintext password is hashed with scrypt on the first successful sign-in
  and the file is rewritten as `"password": "scrypt$<salt>$<hash>"`.
- Editing `admin.json` invalidates existing sessions; plaintext is accepted
  again and re-hashed on the next sign-in.
- All pages and `/api/*` routes (except the admin status/login/setup/logout
  endpoints) require a valid session. Logout sits at the bottom of the
  sidebar and asks for confirmation.

## Root access

Some actions really are root-only: `apt-get` installs/removals, version
switches, and service control (MySQL install in Databases, install/uninstall in
Libraries, and anything added later). ForzaPanel never runs as root itself.
Two options:

**1. Privileged helper (recommended, no prompts).** `install.sh` runs this
automatically; to (re)install manually — also do this after updating, e.g. to
pick up the `stdbuf` fix that keeps apt output streaming live:

```bash
sudo bash scripts/install-privileges.sh            # grants the invoking user
sudo bash scripts/install-privileges.sh gameuser   # or name the panel user
```

This copies `scripts/forzapanel-priv` to `/usr/local/bin/forzapanel-priv`
(root:root, `0755`) and writes `/etc/sudoers.d/forzapanel`:

```
gameuser ALL=(root) NOPASSWD: /usr/local/bin/forzapanel-priv
```

The helper accepts a fixed allowlist only — `apt-update`,
`apt-install <pkg> [version]`, `apt-remove <pkg>`, and
`service <start|stop|restart|enable|disable|status> <unit>` — with package and
unit allowlists that mirror `agent/libraries.ts`. Anything else is rejected;
sudo is granted for that one script, not for `apt-get` or a shell. Test it with
`sudo -n /usr/local/bin/forzapanel-priv apt-update`.

**2. One-time sudo password (no host changes).** When the helper is missing,
the API answers `403 { "code": "privilege-required" }` and the panel opens a
small password dialog. The password is checked with `sudo -S -k true`, kept in
the panel's **memory only** for 15 minutes (keyed by the admin session), piped
to `sudo -S` on demand, and never written to disk, logged, or returned by an
API. It is cleared on logout, on process restart, and after the 15 minutes —
then the dialog simply asks again. Because the password travels from the
browser to the panel, only use this over HTTPS.

`GET/POST/DELETE /api/admin/privileges` reports the current state, unlocks, and
forgets the password. The dialog shows the helper command too, so an operator
can switch to option 1 at any time.

## How it works

### Dashboard (`/`)

Live system overview of the machine running the panel, polling
`GET /api/system` every 2 seconds: CPU, memory, disk, charts, and system info.
The header pill shows online status plus the machine's **public IP**
(`GET /api/ip` via ipify, LAN fallback) with a copy button.

### Projects (`/projects`)

Lightweight workspace grouping for related servers and resources. Creating a
project makes a real folder — `data/projects/<name>/project.json` (name,
description, creation date) — the same folder-per-item layout as servers and
databases. Cards can be searched; deleting one removes the whole folder after
a confirmation dialog. Backed by `GET/POST /api/projects` and
`GET/DELETE /api/projects/<name>`.

### Libraries (`/libraries`)

Installed-or-not detection for languages, runtimes and databases on the host
(`GET /api/libraries`, each stack probed with `--version`). The list defaults
to **Installed first** (with name, name-desc and category options), plus
search and category chips. Clicking a row
opens a details modal with the detected version, the apt package behind it,
and — on Linux — a version dropdown plus **Install / Change version** and
**Uninstall** (with confirmation). Versioned installs go through the privileged
helper (`apt-install <pkg> <version>`, which allows downgrades), so they work
without a password once `scripts/install-privileges.sh` has run — otherwise the
panel asks for the sudo password once per session (see
[Root access](#root-access)). `GET/POST/DELETE /api/libraries/<id>` backs the
modal.

Install and uninstall **stream their output** into a small terminal modal that
opens the moment you click — before the request is even sent — so you always
see what the panel is doing: the route answers with NDJSON
(`{"type":"log","line":…}` per line, then one `done` event), and apt's own
progress, warnings and errors scroll by live. The modal stays open when the job
ends — green dot for success, red for failure with the last error line — and
the list/detail refresh as soon as the `done` event arrives. If root access
still needs a password, the sudo prompt appears on top of the terminal.

### Changelog (`/changelog`)

A timeline of real commits on `main`, read from the public GitHub REST API
(`api.github.com/repos/forzayt/Forza_Panel/commits`, cached for five minutes,
no token required). Each entry shows the commit message and body, relative
commit time, a short SHA linking to the commit, and the author's avatar/name
linking to their GitHub profile. Header buttons jump to the repository and
the full commit list; rate limits or offline hosts render a friendly fallback
card instead of an error page.

### Processes (`/system/processes`)

Task-Manager-style live process list, polling `GET /api/processes`
every 4 seconds: top 60 processes by CPU with per-process CPU %, memory,
PID, sortable columns, and search. Windows uses perf-counter sampling,
Linux uses `ps`.

### Network (`/network`)

Live interfaces with status, MAC, IPv4/IPv6, and per-interface
download/upload rates computed from cumulative counters, polling
`GET /api/network` every 4 seconds. Windows reads adapter counters via
PowerShell, Linux reads `/proc/net/dev`.

### Databases (`/databases`)

MySQL card (clickable) for now. Creating a database makes
`data/databases/<name>/` with a `database.json` inside — same
folder-per-item layout as servers, listed straight from disk. Inside a
database, **Install Database** mirrors the server import flow: a searchable
option list, a confirm step, then `apt install mysql-server` on Linux through
the privileged helper (or the one-time sudo prompt — see
[Root access](#root-access)), streamed live into a terminal modal while it
runs. The button hides once a
MySQL binary is detected. A live MySQL connection, other engines, and user
management arrive in a later phase.

### Servers (`/servers`)

Servers are **folders**, not database rows. Creating a server makes
`data/servers/<name>/` with a `server.json` inside — that folder *is* the
server, and the list is read straight from disk.

- **Add Server** — dialog asks only for a name (letters, numbers, dashes,
  underscores, max 32). Duplicates are rejected with 409.
- **Server cards** — each is clickable and opens `/servers/<name>`.
- **Detail page** — stats (status, type, created, folder), **Import**,
  **Start**/**Stop**, **Delete**, and a live **Console**.
- **Import** — searchable template modal (`template/game/*.json`), a
  confirm step, a 5-minute-tolerant Installing animation, then the files land
  in the server folder. Import also tags the server type (hides Import
  afterwards — already-imported servers don't show it again).
- **Start** — runs the template's start command detached in the server
  folder, logging stdout/stderr to `server.log`. The server keeps an
  open stdin (FXServer quits instantly without one) and launches via
  `exec` so the tracked pid is the real server, which is also what Stop
  signals. Refuses Linux-only
  templates on Windows with a clear error, and fails loudly (exit code +
  log tail) instead of fake-starting when the process dies instantly.
- **Stop** — kills the tracked process, marks the server stopped.
- **Console** — tails the last 200 lines of `server.log` every 2 seconds
  with auto-scroll. Only shown for imported servers.
- **Delete** — red button with a type-to-confirm dialog
  (`delete <servername>`); removes the folder recursively.

### Templates (`template/game/*.json`)

```json
{
  "id": "fivem",
  "game": "GTA V",
  "label": "FiveM Server",
  "description": "...",
  "platforms": ["linux"],
  "download": "https://changelogs-live.fivem.net/api/changelog/versions/linux/server",
  "serverCfg": ["endpoint_add_tcp ..."],
  "start": "bash run.sh +exec server.cfg",
  "inputs": [
    {
      "id": "licenseKey",
      "label": "CFX License Key",
      "placeholder": "cfxk_xxxxxxxxxxxxxxxxxxxxxxxx",
      "help": "...",
      "required": true,
      "pattern": "^cfxk_[A-Za-z0-9_-]{8,}$",
      "appendArg": "+set sv_licenseKey {value}"
    }
  ]
}
```

- `download` — a direct `.tar.xz/.tar.gz` link, or a changelog-style JSON
  endpoint exposing `recommended_download`/`latest_download` (legacy HTML
  listings are scraped as a last resort).
- `platforms` — Start is refused on any other `process.platform`.
- `serverCfg` (optional) — written as `server.cfg` after extraction, on
  first import only (re-imports never overwrite user edits). `{name}` is
  replaced with the server name.
- `inputs` (optional) — values the import dialog asks for before installing
  (e.g. the FiveM `sv_licenseKey`). Each entry: `id`, `label`, optional
  `placeholder`/`help`, `required`, and a `pattern` regex enforced
  server-side. `appendArg` is appended to `start` at launch with `{value}`
  substituted (shell-quoted) — the key is stored in the server's
  `server.json` under `settings`, never in the template.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/system` | Live CPU / memory / disk / system info |
| GET | `/api/processes` | Live process list (top 60 by CPU) |
| POST | `/api/processes/[pid]/kill` | Force-terminate a process |
| GET | `/api/network` | Interfaces, addresses, byte counters |
| GET | `/api/network/ports` | Listening TCP/UDP ports + owning process |
| GET | `/api/ip` | Public IP (ipify), LAN fallback |
| GET | `/api/servers` | List servers from `data/servers/` |
| POST | `/api/servers` | Create a server (`{ name }`) |
| GET | `/api/servers/[name]` | One server |
| DELETE | `/api/servers/[name]` | Remove server folder |
| GET | `/api/servers/[name]/log?lines=200` | Tail `server.log` |
| POST | `/api/servers/[name]/import` | Download + extract template (`{ templateId, inputs? }`) |
| POST | `/api/servers/[name]/start` | Run the start command |
| POST | `/api/servers/[name]/stop` | Stop the tracked process |
| GET | `/api/templates` | List `template/game/*.json` |
| GET | `/api/libraries` | Installed-or-not status for every stack |
| GET | `/api/libraries/[id]` | Detail: version, apt package, available versions |
| POST | `/api/libraries/[id]` | Install / change version (`{ version? }`, NDJSON stream) |
| DELETE | `/api/libraries/[id]` | Uninstall (`apt remove`, NDJSON stream) |
| GET | `/api/databases` | List MySQL database folders |
| POST | `/api/databases` | Create a database folder (`{ name }`) |
| GET | `/api/databases/[name]` | One database |
| DELETE | `/api/databases/[name]` | Remove database folder |
| GET | `/api/databases/status` | MySQL installed? + version |
| POST | `/api/databases/install` | apt install mysql-server (Linux, NDJSON stream) |
| GET | `/api/admin/privileges` | Root-access status (helper / unlocked / expiry) |
| POST | `/api/admin/privileges` | Verify sudo password, unlock for 15 min |
| DELETE | `/api/admin/privileges` | Forget the unlocked password |

## Project structure

```
app/                 Routes (dashboard, servers, api) + theme + providers
agent/               ALL machine-touching code lives here — nothing else
                     runs commands or touches the filesystem
  servers.ts         Server folders, download/extract, start/stop, logs
  system.ts          OS metrics, disk probing, LAN IP
  templates.ts       Template library reader
  privileges.ts      Root helper detection, sudo password unlock, runPrivileged
  stream.ts          NDJSON streaming helper for long privileged jobs
scripts/             install.sh helpers (forzapanel-priv + sudoers installer)
components/          Dashboard widgets + tailgrids design-system primitives
  common/live-terminal.tsx  Streaming terminal modal for installs/uninstalls
template/game/       Importable game templates (tracked in git)
data/servers/        One folder per server (runtime data, git-ignored)
utils/ hooks/ types/ Shared helpers
```

Rule: anything that executes (fs, processes, OS) goes in `agent/`. UI and
API routes only call into it.

## Troubleshooting

- **`EACCES: permission denied` in `.next/`** — some files got created as
  root (an earlier `sudo` run). Fix ownership once and restart the service:
  ```bash
  sudo chown -R "$USER:$USER" ~/forzapanel
  rm -rf ~/forzapanel/.next
  cd ~/forzapanel && npm run build
  sudo systemctl restart forzapanel
  ```
- **`next start` says "Could not find a production build"** — run
  `npm run build` first; `start` only serves an existing build.

- **"Root access required" when installing a library or MySQL** — the panel
  needs root for apt. Run `sudo bash scripts/install-privileges.sh` once
  (no more prompts), or type the sudo password into the dialog; it is held in
  memory for 15 minutes and then forgotten. See
  [Root access](#root-access).

- **Import 500s** — the toast now shows the real reason. Common cause was
  `tar` warnings on partial archives; exit code 1 is tolerated, 2+ fails.
  Re-import overwrites partial folders, no cleanup needed.
- **Start fails on Windows** — expected for Linux templates; deploy the
  panel on Linux/WSL to run game servers.
- **Empty console** — the process died instantly; Start now reports the
  exit code + log tail instead of pretending. Status badges also
  self-correct every 5 seconds.
- **Install terminal opens but stays on "Waiting for output…" until the end**
  — apt/dpkg block-buffer their output when stdout is a pipe. The helper now
  runs them through `stdbuf`; re-install it once so the change lands:
  `sudo bash scripts/install-privileges.sh`. A reverse proxy in front of the
  panel can buffer too — keep `X-Accel-Buffering: no` (sent by the panel) and
  disable `proxy_buffering` for the streaming routes in nginx.
- **Panel not reachable after `install.sh`** — the service logs say why:
  `sudo journalctl -u forzapanel -n 80 --no-pager`. Most common causes: port
  3000 is already taken (`sudo ss -ltnp | grep :3000`) — re-run with
  `PORT=8080`, or the production build failed (run `npm run build` in the
  checkout). `systemctl status forzapanel` shows the unit path
  (`/etc/systemd/system/forzapanel.service`).
- **Updating a systemd install** — re-run `install.sh` (pull + rebuild +
  restart), or manually
  `git pull && npm i && npm run build && sudo systemctl restart forzapanel`.
  Stopping the service before `npm run build` avoids the dev/build `.next`
  clash.
- **`next build` fails with `/_not-found` or missing chunks** — stop the
  dev server first; dev and build share `.next/` and corrupt each other.
  Delete `.next/` and rebuild clean.
- **Hydration error mentioning `data-gr-*` attributes** — a browser
  extension (e.g. Grammarly) mutating `<body>`; suppressed in the layout
  and harmless.
