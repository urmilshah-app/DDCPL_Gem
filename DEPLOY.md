# DEPLOY.md — Free cloud deployment (Oracle Always Free + Docker)

Deploy the full stack (dashboard + Postgres + **10-min scan worker** + HTTPS) to a
**$0-forever** Oracle Cloud Always Free VPS. Your PC can then be switched off.

```
Internet ──▶ https://<your-domain>.duckdns.org
                │  (Caddy: free auto-HTTPS)
                ▼
        ┌── gem-monitor-app      :3000  Next.js dashboard + API  ──┐
        ├── gem-monitor-worker          scans GeM every 10 min    │
        ├── gem-monitor-postgres        data (localhost only) ◀───┘
        └── gem-monitor-redis           cache (localhost only)
```

---

## Step 0 — Prerequisites (your PC)

- Docker Desktop **running** (for the local Postgres used to dump data)
- OpenSSH client (built into Windows 10/11: `ssh`, `scp` work in PowerShell)
- This project folder

Check:

```powershell
ssh -V
docker ps
```

## Step 1 — (Recommended) Rotate the admin password first

The database you upload contains the login. Default seed login is weak — change it
**before** dumping:

```powershell
npm run admin:pass -- "YourNewStrong-Passw0rd!"
```

(If you skip this, you can still change it later — see Step 8.)

## Step 2 — Oracle Cloud: create the free server (~10 min)

1. Sign up at **cloud.oracle.com** (credit card for identity only — you are **not
   charged** if you stay on Always Free resources; new accounts also get $300 credit
   for 30 days).
2. **Menu → Compute → Instances → Create Instance**:
   - **Image:** Ubuntu 22.04/24.04 (or Oracle Linux 8/9)
   - **Shape:** `VM.Standard.A1.Flex` (ARM, Always Free) — **2 OCPU / 12 GB** is
     plenty (free allowance is 4 OCPU / 24 GB total)
   - **SSH key:** generate one on your PC if you don't have one, then paste the `.pub`:
     ```powershell
     ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519
     # press Enter twice (no passphrase)
     Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
     ```
   - Save the **public IP** shown after creation.
3. **Open the firewall** (required for HTTPS):
   - **Networking → Virtual Cloud Networks → (your VCN) → Default Security List → Add Ingress Rules**
   - Rule 1: Source `0.0.0.0/0`, Protocol TCP, Destination Ports `80,443`
   - (22 is usually already open for SSH.)

> ⚠️ Oracle reclaims *idle* Always Free ARM instances (near-zero CPU for days).
> Your always-on worker prevents that. Still, **stop the instance in the Oracle
> console only if you plan to be away for weeks** — note its public IP may change
> on stop/start (then update DuckDNS, Step 3).

## Step 3 — DuckDNS: free subdomain (5 min)

1. Go to **duckdns.org** → sign in with GitHub/Google.
2. Enter a subdomain, e.g. `mygem` → **Add Domain** → you now own
   `https://mygem.duckdns.org`.
3. Click **update ip** (uses your current public IP — do this on the machine whose
   IP should point there, or paste your Oracle public IP).

## Step 4 — Upload code + start the stack

From the project folder on your PC:

```powershell
# 1) build a clean archive (no .env, no node_modules, no .next)
powershell -File deploy\Build-Archive.ps1

# 2) upload it (replace with your Oracle IP)
scp deploy\out\gem-monitor.zip  ubuntu@<VPS_IP>:~

# 3) upload the server bootstrap
scp deploy\setup-server.sh  ubuntu@<VPS_IP>:~

# 4) run setup on the server (replace with your DuckDNS name)
ssh ubuntu@<VPS_IP> "bash setup-server.sh ~/gem-monitor.zip mygem.duckdns.org"
```

The script installs Docker, writes a generated `.env` (random `JWT_SECRET` +
`CRON_SECRET`), builds the images and starts **all services**. First build takes a
few minutes.

## Step 5 — Restore your data (first deployment)

```powershell
powershell -File deploy\Restore-Database.ps1 -Server ubuntu@<VPS_IP>
```

This dumps your local DB, uploads it, and restores it on the server (keeping a
timestamped local backup under `deploy\out\`).

## Step 6 — Log in and verify

1. Open **https://mygem.duckdns.org** (first certificate fetch can take ~1 min;
   if it warns, wait 60 s and reload).
2. You should see the **login page** (the whole site is behind auth now).
   Log in with your admin email/password (from Step 1).
3. Click **Run Scan Now** — one scan should complete.
4. Check the scheduled worker on the server:
   ```powershell
   ssh ubuntu@<VPS_IP> "docker logs --tail 20 gem-monitor-worker"
   ```
   You should see `[worker] scan done in Xs ...` lines every 10 minutes.

**Done — you can now view and use the dashboard from any device, anywhere, $0/month.**

---

## Day-2 operations

### Redeploy code changes

```powershell
powershell -File deploy\Build-Archive.ps1
scp deploy\out\gem-monitor.zip ubuntu@<VPS_IP>:~
ssh ubuntu@<VPS_IP> "cd ~/gem-monitor && unzip -oq ~/gem-monitor.zip && docker compose --profile with-worker --profile https up -d --build"
```

Your data lives in the Postgres volume — it survives redeploys. Do **not** re-run
Restore-Database unless you intentionally want to overwrite cloud data with your PC copy.

### Useful commands (run on the server)

```bash
docker compose -f ~/gem-monitor/docker-compose.yml ps                 # status
docker logs -f gem-monitor-worker                                     # scan worker
docker logs -f gem-monitor-app                                        # web app
docker compose --profile with-worker restart worker                   # restart scanner
docker compose --profile with-worker stop                             # stop everything (data kept)
```

### Change the admin password

On the server (DB already restored):

```bash
docker exec -it gem-monitor-postgres psql -U gem -d gem_website   # then SQL, or:
```

…or from your PC against the local DB **before** your next Restore.

### Backup your data (from the PC, anytime)

```powershell
powershell -File deploy\Restore-Database.ps1 -Server ubuntu@<VPS_IP>   # also creates local backup
```

For a pull-only backup (server → PC), reverse the direction manually with
`ssh` + `docker exec ... pg_dump`.

### Local development unchanged

`npm run dev` + your local Docker Postgres still work exactly as before; the VPS
copy is independent.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| HTTPS says connection refused | Wait for Caddy's first cert fetch (~1 min); check security list has 80/443 open: `ssh ... "docker logs gem-monitor-caddy"` |
| `401 Unauthorized` on the API from scripts | Log in first and send the `ddcpl_session` cookie, or call `POST /api/auth/login` to obtain it |
| Login works locally but not on VPS | Cookie needs HTTPS in production — confirm `AUTH_COOKIE_SECURE=true` in `~/gem-monitor/.env` and you're on `https://` |
| Worker not scanning | `docker logs gem-monitor-worker` — if the container is restarting, check `DATABASE_URL` in `.env` matches the `POSTGRES_PASSWORD` |
| Database restore fails | Ensure `gem-monitor-postgres` is up: `docker compose ps`; re-run `deploy\Restore-Database.ps1` |
| Instance reclaimed / IP changed | Start it again in Oracle console, update DuckDNS IP, done |
| Out of memory | Give the shape 12 GB; `docker stats` to see usage |

## Security notes

- Everything is behind login (middleware). Postgres/Redis listen on
  `127.0.0.1` only — not reachable from the internet.
- `.env` (secrets) stays on the server only; it is excluded from the archive.
- Keep `JWT_SECRET` stable — rotating it logs everyone out (safe to do).
