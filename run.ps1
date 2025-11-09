param(
  [ValidateSet('dev','start','down')]
  [string]$cmd = 'dev'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function ComposeUp([string[]]$profiles) {
  $pArgs = @()
  $profiles | ForEach-Object { $pArgs += @('--profile', $_) }
  $args = $pArgs + @('up','-d','--remove-orphans')
  Write-Host ">> docker compose $($args -join ' ')" -ForegroundColor Cyan
  docker compose @args
}

switch ($cmd) {
  'dev' {
    ComposeUp @('infra','workers')

    $backend  = Join-Path $root 'backend'
    $frontend = Join-Path $root 'frontend'

    Write-Host ">> starting backend (air) and frontend (npm run dev)..." -ForegroundColor Green

    Start-Process -WorkingDirectory $backend  -FilePath powershell -ArgumentList '-NoExit','-Command','air'
    Start-Process -WorkingDirectory $frontend -FilePath powershell -ArgumentList '-NoExit','-Command','npm run dev'

    Write-Host "Dev environment is up. To shut everything down, run '.\run.ps1 down'." -ForegroundColor Yellow
  }

  'start' {
    ComposeUp @('infra','workers','app')
    Write-Host "All services (app+infra+workers) are running." -ForegroundColor Green
  }

  'down' {
    Write-Host ">> docker compose down --remove-orphans" -ForegroundColor Cyan
    docker compose down --remove-orphans
    Write-Host "All containers stopped and removed." -ForegroundColor Yellow
  }
}
