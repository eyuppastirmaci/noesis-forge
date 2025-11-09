param(
  [ValidateSet('dev','start','down','build')]
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

function ComposeBuild([string[]]$profiles) {
  $pArgs = @()
  $profiles | ForEach-Object { $pArgs += @('--profile', $_) }
  $args = $pArgs + @('build')
  Write-Host ">> docker compose $($args -join ' ')" -ForegroundColor Cyan
  docker compose @args
}

switch ($cmd) {
  'dev' {
    ComposeUp @('infra','workers')

    $backend  = Join-Path $root 'backend'
    $frontend = Join-Path $root 'frontend'

    Write-Host ">> starting backend (air) and frontend (npm run dev)..." -ForegroundColor Green

    # Store process IDs to kill later
    $backendProc = Start-Process -WorkingDirectory $backend  -FilePath powershell -ArgumentList '-NoExit','-Command','air' -PassThru
    $frontendProc = Start-Process -WorkingDirectory $frontend -FilePath powershell -ArgumentList '-NoExit','-Command','npm run dev' -PassThru
    
    # Save PIDs to file for later cleanup
    $pidsFile = Join-Path $root '.dev-pids.txt'
    "$($backendProc.Id),$($frontendProc.Id)" | Out-File -FilePath $pidsFile

    Write-Host "Dev environment is up. To shut everything down, run 'npm run down'." -ForegroundColor Yellow
  }

  'start' {
    ComposeUp @('infra','workers','app')
    Write-Host "All services (app+infra+workers) are running." -ForegroundColor Green
  }

  'down' {
    Write-Host ">> Stopping backend and frontend processes..." -ForegroundColor Cyan
    
    $cleanupSuccess = $false
    
    # Method 1: Kill by saved PIDs using taskkill (kills entire process tree)
    $pidsFile = Join-Path $root '.dev-pids.txt'
    if (Test-Path $pidsFile) {
      $pids = (Get-Content $pidsFile).Split(',')
      $killedCount = 0
      
      foreach ($processId in $pids) {
        $processId = $processId.Trim()
        if ($processId) {
          try {
            # Check if process exists
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
              Write-Host "   Killing process tree for PID $processId..." -ForegroundColor Yellow
              # /T kills the process tree (parent + all children)
              # /F forces termination
              taskkill /PID $processId /T /F 2>&1 | Out-Null
              $killedCount++
            }
          } catch {
            # Process might already be stopped
          }
        }
      }
      
      Remove-Item $pidsFile -Force -ErrorAction SilentlyContinue
      
      if ($killedCount -gt 0) {
        $cleanupSuccess = $true
        Write-Host "   Successfully stopped $killedCount process tree(s)" -ForegroundColor Green
      }
    }
    
    # Method 2: Only use port-based cleanup if PID method failed or file didn't exist
    if (-not $cleanupSuccess) {
      Write-Host "   No PID file found or processes already stopped" -ForegroundColor Yellow
      Write-Host "   Checking for orphaned processes on ports 8000 and 3000..." -ForegroundColor Yellow
      
      # Only kill if the process is actually related to our project
      $port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
      if ($port8000) {
        # Verify it's our process by checking process name
        $proc = Get-Process -Id $port8000 -ErrorAction SilentlyContinue
        if ($proc -and ($proc.Name -eq 'go' -or $proc.Name -eq 'air')) {
          Write-Host "   Found orphaned backend process on port 8000, cleaning up..." -ForegroundColor Yellow
          taskkill /PID $port8000 /T /F 2>&1 | Out-Null
        }
      }
      
      $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
      if ($port3000) {
        # Verify it's our process by checking process name
        $proc = Get-Process -Id $port3000 -ErrorAction SilentlyContinue
        if ($proc -and $proc.Name -eq 'node') {
          # Additional check: is it in our project directory?
          if ($proc.Path -like "*noesis-forge*") {
            Write-Host "   Found orphaned frontend process on port 3000, cleaning up..." -ForegroundColor Yellow
            taskkill /PID $port3000 /T /F 2>&1 | Out-Null
          }
        }
      }
    }
    
    Write-Host ">> docker compose down --remove-orphans --volumes" -ForegroundColor Cyan
    docker compose down --remove-orphans --volumes
    
    Write-Host ">> Stopping any remaining noesis containers..." -ForegroundColor Cyan
    $containers = docker ps -a --filter "name=noesis" --format "{{.Names}}" 2>$null
    if ($containers) {
      $containers | ForEach-Object {
        Write-Host "   Stopping $_" -ForegroundColor Yellow
        docker stop $_ 2>&1 | Out-Null
        docker rm $_ 2>&1 | Out-Null
      }
    }
    
    Write-Host "All containers stopped and removed." -ForegroundColor Green
    Write-Host "Backend and frontend processes terminated." -ForegroundColor Green
  }

  'build' {
    ComposeBuild @('infra','workers','app')
    Write-Host "Docker images built for profiles: infra, workers, app." -ForegroundColor Green
  }
}
