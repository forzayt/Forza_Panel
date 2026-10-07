# Forza_Panel
The Universal VPS Control Panel

## Phase 1 — Live system dashboard

```bash
npm install
npm run dev
```

Open http://localhost (port 80 — no port in the URL).
Run the terminal as Administrator on Windows, since ports below 1024
require elevated privileges. If that is a problem, use
`npm run dev:3000` and open http://localhost:3000 instead.

The dashboard polls `GET /api/system` every 2 seconds and shows real CPU,
memory, disk, and system values from the machine running the server.
