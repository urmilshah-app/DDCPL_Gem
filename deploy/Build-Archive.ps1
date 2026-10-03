# ---------------------------------------------------------------------------
# Build-Archive.ps1 — create a clean upload archive of the project (from PC)
# Usage:  powershell -File deploy/Build-Archive.ps1
# Output: deploy/out/gem-monitor.zip (no node_modules, no .next, no .env)
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $PSScriptRoot 'out'
$zipPath = Join-Path $outDir 'gem-monitor.zip'

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# Explicit include list — everything else (.env, node_modules, .next, logs) stays out
$includes = @(
  'src', 'public', 'prisma', 'scripts', 'tests', 'deploy', 'config',
  '.github', 'next.config.js', 'next.config.mjs', 'next.config.ts',
  'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts',
  'Dockerfile', 'Dockerfile.worker', 'docker-compose.yml',
  '.dockerignore', '.gitignore', '.env.example', 'README.md', 'DEPLOY.md',
  'postcss.config.js', 'tailwind.config.js', 'eslint.config.js', '.eslintrc.json'
)

# Use a temp staging dir so the zip has project files at its root
$stage = Join-Path $outDir 'stage'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

foreach ($item in $includes) {
  $src = Join-Path $root $item
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination (Join-Path $stage (Split-Path $item -Leaf)) -Recurse -Force
  }
}

Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath -Force
Remove-Item $stage -Recurse -Force

$size = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host "Archive created: $zipPath ($size KB)"
Write-Host 'Next: scp it to the server (see DEPLOY.md step 4).'
