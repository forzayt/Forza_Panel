# ForzaPanel — Cloud Host

Lightweight game-server control panel. Create servers as folders, import game
templates (FiveM first), download the Linux server files, start them, and watch
live logs — all from one dashboard.

## Requirements

- Node.js 18+
- A **Linux host** (or WSL) to actually run game servers — the FiveM
  FXServer binaries are Linux-only. The panel UI itself runs anywhere.
- `tar` on PATH (Windows 10+ and all Linux distros ship one).

## Quick start

One command on a fresh VPS (installs Node 20, clones, installs, runs dev):

```bash
curl -fsSL https://raw.githubusercontent.com/forzayt/Forza_Panel/main/install.sh | bash
```

Or manually:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build (stop the dev server first — see below)
npm start       # serve the production build
```

## How it works

### Dashboard (`/`)

Live system overview of the machine running the panel, polling
`GET /api/system` every 2 seconds: CPU, memory, disk, charts, and system info.
The header pill shows online status plus the machine's **public IP**
(`GET /api/ip` via ipify, LAN fallback) with a copy button.

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

## Project structure

```
app/                 Routes (dashboard, servers, api) + theme + providers
agent/               ALL machine-touching code lives here — nothing else
                     runs commands or touches the filesystem
  servers.ts         Server folders, download/extract, start/stop, logs
  system.ts          OS metrics, disk probing, LAN IP
  templates.ts       Template library reader
components/          Dashboard widgets + tailgrids design-system primitives
template/game/       Importable game templates (tracked in git)
data/servers/        One folder per server (runtime data, git-ignored)
utils/ hooks/ types/ Shared helpers
```

Rule: anything that executes (fs, processes, OS) goes in `agent/`. UI and
API routes only call into it.

## Troubleshooting

- **`EACCES: permission denied` in `.next/`** — some files got created as
  root (an earlier `sudo` run). Fix ownership once and stop using `sudo`
  (port 3000 needs no privileges):
  ```bash
  sudo chown -R ubuntu:ubuntu ~/forzapanel
  rm -rf ~/forzapanel/.next
  npm run dev
  ```
- **`next start` says "Could not find a production build"** — run
  `npm run build` first; `start` only serves an existing build.

- **Import 500s** — the toast now shows the real reason. Common cause was
  `tar` warnings on partial archives; exit code 1 is tolerated, 2+ fails.
  Re-import overwrites partial folders, no cleanup needed.
- **Start fails on Windows** — expected for Linux templates; deploy the
  panel on Linux/WSL to run game servers.
- **Empty console** — the process died instantly; Start now reports the
  exit code + log tail instead of pretending. Status badges also
  self-correct every 5 seconds.
- **`next build` fails with `/_not-found` or missing chunks** — stop the
  dev server first; dev and build share `.next/` and corrupt each other.
  Delete `.next/` and rebuild clean.
- **Hydration error mentioning `data-gr-*` attributes** — a browser
  extension (e.g. Grammarly) mutating `<body>`; suppressed in the layout
  and harmless.
