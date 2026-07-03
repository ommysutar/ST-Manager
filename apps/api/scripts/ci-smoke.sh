#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"

echo "M18 CI smoke suite against ${BASE_URL}"

bash "$(dirname "$0")/auth-smoke.sh"
bash "$(dirname "$0")/sync-smoke.sh"
bash "$(dirname "$0")/ai-smoke.sh"
bash "$(dirname "$0")/dashboard-smoke.sh"
bash "$(dirname "$0")/clients-smoke.sh"
bash "$(dirname "$0")/bookings-smoke.sh"
bash "$(dirname "$0")/sessions-smoke.sh"
bash "$(dirname "$0")/invoices-smoke.sh"

echo "M18 CI smoke suite passed"
