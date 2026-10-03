# ---------------------------------------------------------------------------
# Restore-Database.ps1 — dump the LOCAL database and restore it on the VPS
# Run AFTER setup-server.sh (DEPLOY.md step 5).
# Usage:  powershell -File deploy/Restore-Database.ps1 -Server ubuntu@<VPS_IP>
# ---------------------------------------------------------------------------

param(
  [Parameter(Mandatory = $true)]
  [string]$Server
)

$ErrorActionPreference = 'Stop'
$outDir = Join-Path $PSScriptRoot 'out'
$localDump = Join-Path $outDir 'gem-local.dump'
$remoteDump = '/tmp/gem-restore.dump'

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# 1) Dump local DB (binary format, via the local postgres container)
Write-Host '==> Dumping local database...'
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $outDir "gem-local-$ts.dump"
& docker exec gem-monitor-postgres pg_dump -U gem -d gem_website -Fc -f /tmp/dump.dump
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed' }
& docker cp "gem-monitor-postgres:/tmp/dump.dump" $localDump
& docker exec gem-monitor-postgres rm -f /tmp/dump.dump
Copy-Item $localDump $backup -Force
Write-Host "    Local backup also kept at: $backup"

# 2) Upload
Write-Host "==> Uploading to $Server..."
& scp -q $localDump "${Server}:$remoteDump"
if ($LASTEXITCODE -ne 0) { throw 'scp failed' }

# 3) Restore on the server (drops & recreates public schema — server data is replaced)
Write-Host '==> Restoring on server (existing server data will be replaced)...'
$sshCmd = "docker exec -i gem-monitor-postgres pg_restore -U gem -d gem_website --clean --if-exists --no-owner < $remoteDump; rm -f $remoteDump"
& ssh $Server $sshCmd
if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed (check DEPLOY.md troubleshooting)' }

# 4) Restart app + worker so they pick up the restored data
Write-Host '==> Restarting app and worker...'
& ssh $Server "cd ~/gem-monitor && docker compose --profile with-worker restart app worker"

Write-Host '==> Database restored. Log in with your admin account (DEPLOY.md step 6).'
