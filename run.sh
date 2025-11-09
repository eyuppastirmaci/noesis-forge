#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-dev}"
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

compose_up() {
  local args=()
  for p in "$@"; do args+=( --profile "$p" ); done
  args+=( up -d --remove-orphans )
  echo ">> docker compose ${args[*]}"
  docker compose "${args[@]}"
}

compose_build() {
  local args=()
  for p in "$@"; do args+=( --profile "$p" ); done
  args+=( build )
  echo ">> docker compose ${args[*]}"
  docker compose "${args[@]}"
}

case "$cmd" in
  dev)
    compose_up infra workers

    echo ">> starting backend (air) and frontend (npm run dev)..."
    
    # Start backend in background
    (
      cd "$root/backend"
      if ! command -v air >/dev/null 2>&1; then
        echo "WARNING: 'air' not found in PATH. Install it or start backend manually." >&2
      else
        air > /dev/null 2>&1 &
        echo $! >> "$root/.dev-pids.txt"
      fi
    )
    
    # Start frontend in background
    (
      cd "$root/frontend"
      npm run dev > /dev/null 2>&1 &
      echo $! >> "$root/.dev-pids.txt"
    )
    
    echo "Dev environment is up. To shut everything down, run 'npm run down'."
    ;;

  start)
    compose_up infra workers app
    echo "All services (app+infra+workers) are running."
    ;;

  down)
    echo ">> Stopping backend and frontend processes..."
    
    cleanup_success=false
    
    # Method 1: Kill by saved PIDs (kills entire process tree)
    if [ -f "$root/.dev-pids.txt" ]; then
      killed_count=0
      
      while read -r pid; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
          echo "   Killing process tree for PID $pid..."
          # Kill child processes first
          pkill -P "$pid" 2>/dev/null || true
          # Kill main process
          kill -9 "$pid" 2>/dev/null || true
          killed_count=$((killed_count + 1))
        fi
      done < "$root/.dev-pids.txt"
      
      rm -f "$root/.dev-pids.txt"
      
      if [ "$killed_count" -gt 0 ]; then
        cleanup_success=true
        echo "   Successfully stopped $killed_count process tree(s)"
      fi
    fi
    
    # Method 2: Only use port-based cleanup if PID method failed or file didn't exist
    if [ "$cleanup_success" = false ]; then
      echo "   No PID file found or processes already stopped"
      echo "   Checking for orphaned processes on ports 8000 and 3000..."
      
      # Check port 8000 (backend)
      if command -v lsof >/dev/null 2>&1; then
        port8000_pid=$(lsof -ti:8000 2>/dev/null || true)
        if [ -n "$port8000_pid" ]; then
          # Verify it's our process by checking process name
          proc_name=$(ps -p "$port8000_pid" -o comm= 2>/dev/null || true)
          if [ "$proc_name" = "air" ] || [ "$proc_name" = "go" ]; then
            echo "   Found orphaned backend process on port 8000, cleaning up..."
            pkill -P "$port8000_pid" 2>/dev/null || true
            kill -9 "$port8000_pid" 2>/dev/null || true
          fi
        fi
        
        # Check port 3000 (frontend)
        port3000_pid=$(lsof -ti:3000 2>/dev/null || true)
        if [ -n "$port3000_pid" ]; then
          # Verify it's our process by checking process name and path
          proc_name=$(ps -p "$port3000_pid" -o comm= 2>/dev/null || true)
          if [ "$proc_name" = "node" ]; then
            proc_path=$(ps -p "$port3000_pid" -o args= 2>/dev/null || true)
            if echo "$proc_path" | grep -q "noesis-forge"; then
              echo "   Found orphaned frontend process on port 3000, cleaning up..."
              pkill -P "$port3000_pid" 2>/dev/null || true
              kill -9 "$port3000_pid" 2>/dev/null || true
            fi
          fi
        fi
      fi
    fi
    
    echo ">> docker compose down --remove-orphans --volumes"
    docker compose down --remove-orphans --volumes
    
    echo ">> Stopping any remaining noesis containers..."
    docker ps -a --filter "name=noesis" --format "{{.Names}}" 2>/dev/null | while read -r container; do
      if [ -n "$container" ]; then
        echo "   Stopping $container"
        docker stop "$container" >/dev/null 2>&1 || true
        docker rm "$container" >/dev/null 2>&1 || true
      fi
    done
    
    echo "All containers stopped and removed."
    echo "Backend and frontend processes terminated."
    ;;
  build)
    compose_build infra workers app
    echo "Docker images built for profiles: infra, workers, app."
    ;;

  *)
    echo "Usage: $0 [dev|start|down|build]" >&2
    exit 1
    ;;
esac
