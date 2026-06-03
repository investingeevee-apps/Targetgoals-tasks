# Self-hosting TargetGoals Tasks

Run your own server so the web app and the Android app share one source of truth —
reachable from anywhere, with your data staying on your machine.

> **Your data is yours.** The server stores everything in a git-ignored SQLite file
> under `apps/server/data/`. Nothing is ever uploaded to this project or its authors.

---

## 1. Prerequisites

- **Node.js 18+** (developed on Node 24) — <https://nodejs.org>
- This repository, with dependencies installed: `npm install` from the repo root.

The server is plain Node + SQLite, so it runs on Windows, macOS, Linux, or a
Raspberry Pi. Windows is the documented default; an always-on box (Pi/mini-PC) is a
great upgrade later because it doesn't need your main PC awake.

---

## 2. Configure

```bash
# from the repo root
cp apps/server/.env.example apps/server/.env   # (Windows: copy ...)
```

Edit `apps/server/.env`:

```ini
PORT=4000
PUBLIC_URL=http://localhost:4000   # set to your Tailscale URL later (step 5)
SERVER_NAME=TargetGoals Tasks
```

A random auth token is generated on first run into `apps/server/data/config.json`
(git-ignored). You'll copy it from the pairing page.

---

## 3. Build the web app (so the server can serve it)

```bash
npm run build            # builds apps/web into apps/web/dist
```

The server automatically serves `apps/web/dist` at `/` when it exists.

---

## 4. Run the server

Quick test:

```bash
npm run start:server     # http://localhost:4000
```

Open <http://localhost:4000/pair> — you'll see a QR code plus the **server URL** and
**token**. Open <http://localhost:4000> for the web app itself.

### Keep it running (Windows — recommended, no admin)

Drop a hidden auto-start launcher into your **Startup folder** — no administrator
rights needed. It starts the server (hidden, no console window) at every login, and
right now:

```bash
npm run startup:install -w @targetgoals/server
```

Disable it any time with:

```bash
npm run startup:uninstall -w @targetgoals/server
```

### Keep it running (Windows — Scheduled Task, needs admin)

Alternatively, register a self-restarting **Scheduled Task** (run from an
**elevated / "Run as administrator" PowerShell** — registering a task requires admin):

```bash
npm run service:install -w @targetgoals/server     # then: service:uninstall to remove
```

```powershell
Start-ScheduledTask -TaskName TargetGoalsTasksServer
Stop-ScheduledTask  -TaskName TargetGoalsTasksServer
```

> Both options run when you're **logged in**. For the server to be up even at the
> Windows lock/login screen, use a true Windows Service via
> [`node-windows`](https://github.com/coreybutler/node-windows) or
> [NSSM](https://nssm.cc/) pointing at `npm run start:server`.

### Keep it running (Linux / Raspberry Pi — always-on host)

Create `/etc/systemd/system/targetgoals.service`:

```ini
[Unit]
Description=TargetGoals Tasks server
After=network.target

[Service]
WorkingDirectory=/home/pi/targetgoals-tasks
ExecStart=/usr/bin/npm run start:server
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now targetgoals
```

---

## 5. Reach it from anywhere with Tailscale

[Tailscale](https://tailscale.com) puts your devices on a private, encrypted network
(no port-forwarding, no public exposure).

1. **Install Tailscale** on the PC/host **and** your phone; sign in to the **same
   account** on both.
2. **Find your host's name**: run `tailscale status`, or check the admin console.
   With MagicDNS it looks like `your-pc.tailnet-name.ts.net`.
3. **HTTP (Android app only):** set `PUBLIC_URL=http://your-pc.tailnet-name.ts.net:4000`
   in `.env` and restart the server. The tunnel is encrypted; the Android app is happy.

### HTTPS (recommended default — needed for the *web* app remotely)

Browsers only enable PWA/offline features over HTTPS or `localhost`, so to use the
**web** app from your phone, front the server with Tailscale's free HTTPS:

```bash
# one-time: enable HTTPS certs in the tailnet admin console, then on the host:
tailscale cert your-pc.tailnet-name.ts.net           # issues a Let's Encrypt cert
tailscale serve --bg --https=443 http://localhost:4000
```

Now `https://your-pc.tailnet-name.ts.net` proxies to the server. Set:

```ini
PUBLIC_URL=https://your-pc.tailnet-name.ts.net
```

Restart the server so the pairing QR points at the HTTPS URL.

> **Windows Firewall:** the first time Node listens, allow it on your **private**
> network if prompted.

---

## 6. Pair your devices

- **Android app:** open it → **Settings → Pairing** → scan the QR at
  `…/pair` (or paste the URL + token).
- **Web app (another browser/device):** open the served URL, click the **status chip**
  at the bottom of the sidebar → enter the URL + token → **Connect**.

Both clients are **offline-first**: they keep working with no connection and sync
(last-write-wins) when the host is reachable.

---

## 7. Backups & updating

- **Back up** `apps/server/data/` (the SQLite DB + `config.json` with your token).
- **Update**: `git pull`, then `npm install`, `npm run build`, and restart the server
  (`Stop-ScheduledTask` / `Start-ScheduledTask`, or restart the systemd service).
- **Change the port/URL?** Re-pair afterwards — the QR encodes the URL, so clients
  need the new value.
