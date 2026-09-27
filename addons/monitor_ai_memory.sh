#!/bin/bash
# ==============================================================================
# Arch3r NVR - AI YOLO Daemon Memory Watchdog & Self-Healing Monitor
# Specifically engineered for Armbian Linux on Amlogic STB (S905X/W/D/etc)
#
# Prevents Linux OOM-Killer crashes by polling memory consumption of
# ai_yolo_service.py. If resident memory exceeds threshold (default: 450 MB or 40%),
# it sends a graceful SIGTERM, allows cleanup, and automatically relaunches.
# ==============================================================================

MAX_MEM_MB=${MAX_MEM_MB:-450}        # Maximum Resident Set Size (RSS) in Megabytes
MAX_MEM_PCT=${MAX_MEM_PCT:-40.0}     # Maximum RAM Percentage threshold
CHECK_INTERVAL=${CHECK_INTERVAL:-15} # Interval between checks in seconds
AI_PORT=${AI_YOLO_PORT:-5055}        # Target YOLO Daemon Port
LOG_FILE="/var/log/arch3r_ai_watchdog.log"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [AI-Watchdog] $1"
    echo "$msg"
    if [ -w "/var/log" ] || [ "$EUID" -eq 0 ]; then
        echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

log "Starting AI YOLO Memory Watchdog (Max: ${MAX_MEM_MB}MB / ${MAX_MEM_PCT}%, Interval: ${CHECK_INTERVAL}s, Port: ${AI_PORT})"

# Helper to find Python binary
find_python() {
    if [ -x "$PARENT_DIR/venv/bin/python" ]; then
        echo "$PARENT_DIR/venv/bin/python"
    elif [ -x "$PARENT_DIR/venv/bin/python3" ]; then
        echo "$PARENT_DIR/venv/bin/python3"
    elif [ -x "/root/arch3r_nvr/venv/bin/python" ]; then
        echo "/root/arch3r_nvr/venv/bin/python"
    else
        echo "python3"
    fi
}

# Helper to find AI script
find_script() {
    if [ -f "$PARENT_DIR/addons/ai_yolo_service.py" ]; then
        echo "$PARENT_DIR/addons/ai_yolo_service.py"
    elif [ -f "$SCRIPT_DIR/ai_yolo_service.py" ]; then
        echo "$SCRIPT_DIR/ai_yolo_service.py"
    else
        echo "/root/arch3r_nvr/addons/ai_yolo_service.py"
    fi
}

graceful_restart() {
    local pid=$1
    local mem_val=$2
    local reason=$3
    log "⚠️ HIGH MEMORY ALERT: PID $pid using $mem_val ($reason). Threshold: ${MAX_MEM_MB}MB / ${MAX_MEM_PCT}%. Initiating graceful restart..."
    
    # 1. Graceful SIGTERM
    kill -TERM "$pid" 2>/dev/null || true
    
    # 2. Wait up to 5 seconds for cleanup
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 0.5
        count=$((count + 1))
    done
    
    # 3. Force kill if still hung
    if kill -0 "$pid" 2>/dev/null; then
        log "Process $pid did not exit gracefully within 5s, sending SIGKILL..."
        kill -KILL "$pid" 2>/dev/null || true
    fi
    
    # 4. Clean up any lingering port bind
    fuser -k "${AI_PORT}/tcp" 2>/dev/null || true
    sleep 1
    
    # 5. Relaunch daemon
    local py_bin=$(find_python)
    local ai_script=$(find_script)
    
    if [ -f "$ai_script" ]; then
        log "Relaunching AI YOLO daemon: $py_bin $ai_script --port=${AI_PORT}"
        cd "$PARENT_DIR" 2>/dev/null || cd "$SCRIPT_DIR"
        nohup "$py_bin" "$ai_script" "--port=${AI_PORT}" > /dev/null 2>&1 &
        sleep 2
        log "✅ AI YOLO daemon relaunched successfully."
    else
        log "❌ Error: Could not locate ai_yolo_service.py to restart!"
    fi
}

while true; do
    # Find PID of running ai_yolo_service.py
    AI_PID=$(pgrep -f "ai_yolo_service.py" | head -n 1)
    
    if [ -n "$AI_PID" ]; then
        # Read RSS memory in kilobytes and %MEM
        MEM_INFO=$(ps -p "$AI_PID" -o rss,%mem --no-headers 2>/dev/null | awk '{print $1, $2}')
        RSS_KB=$(echo "$MEM_INFO" | awk '{print $1}')
        PCT_MEM=$(echo "$MEM_INFO" | awk '{print $2}')
        
        if [ -n "$RSS_KB" ] && [ "$RSS_KB" -gt 0 ] 2>/dev/null; then
            RSS_MB=$((RSS_KB / 1024))
            
            # Check RSS limit in MB
            if [ "$RSS_MB" -ge "$MAX_MEM_MB" ]; then
                graceful_restart "$AI_PID" "${RSS_MB}MB" "RSS Limit Exceeded"
            else
                # Check percentage limit (float comparison via awk)
                OVER_PCT=$(awk -v cur="$PCT_MEM" -v max="$MAX_MEM_PCT" 'BEGIN {print (cur >= max) ? 1 : 0}')
                if [ "$OVER_PCT" -eq 1 ]; then
                    graceful_restart "$AI_PID" "${PCT_MEM}%" "RAM % Limit Exceeded"
                fi
            fi
        fi
    fi
    
    sleep "$CHECK_INTERVAL"
done
