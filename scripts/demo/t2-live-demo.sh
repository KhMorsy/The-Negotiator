#!/usr/bin/env bash
set -euo pipefail

mode="${1:---simulated}"

case "$mode" in
  --simulated)
    export USE_SIMULATED_SPEECH=true
    export USE_SIMULATED_TELEPHONY=true
    export NEXT_PUBLIC_USE_FAKE_REALTIME=true
    ;;
  --live)
    export USE_SIMULATED_SPEECH=false
    export USE_SIMULATED_TELEPHONY=false
    export NEXT_PUBLIC_USE_FAKE_REALTIME=false
    ;;
  *)
    echo "Usage: $0 [--simulated|--live]"
    exit 2
    ;;
esac

echo "=== The Negotiator T2 Demo ($mode) ==="
npm run dev &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

base_url="http://localhost:3000"
until curl -sf "$base_url" >/dev/null; do sleep 1; done

start=$(curl -sf -X POST "$base_url/api/intake/start" \
  -H 'content-type: application/json' \
  -d '{"geo":"Austin, TX"}')
job_id=$(printf '%s' "$start" | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).jobSpecId')
session_id=$(printf '%s' "$start" | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).sessionId')

if [[ "$mode" == "--live" ]]; then
  echo "Open intake: $base_url/intake/$job_id?session=$session_id"
  echo "Complete the live intake, then confirm and start calls in the browser."
  wait "$server_pid"
  exit 0
fi

curl -sf -X POST "$base_url/api/intake/sync-voice" \
  -H 'content-type: application/json' \
  -d "{\"jobSpecId\":\"$job_id\",\"sessionId\":\"$session_id\"}" >/dev/null
curl -sf -X POST "$base_url/api/job-specs/$job_id/confirm" >/dev/null
curl -sf -X POST "$base_url/api/calls/$job_id/start" >/dev/null

echo "Live dashboard: $base_url/calls/$job_id"
echo "Report:         $base_url/report/$job_id"
echo "Demo ready. Press Ctrl+C to stop."
wait "$server_pid"
