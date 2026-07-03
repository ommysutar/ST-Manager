#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"

echo "M14 CI smoke suite against ${BASE_URL}"

bash "$(dirname "$0")/auth-smoke.sh"
bash "$(dirname "$0")/sync-smoke.sh"
bash "$(dirname "$0")/ai-smoke.sh"
bash "$(dirname "$0")/dashboard-smoke.sh"

echo "M14 CI smoke suite passed"
