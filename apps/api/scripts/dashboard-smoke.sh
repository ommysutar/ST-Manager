#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"

echo "M16 dashboard smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m16-dashboard-unauth.json -w "%{http_code}" "${BASE_URL}/dashboard/summary")

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected GET /dashboard/summary without token to return 401, got ${UNAUTH}"
  cat /tmp/m16-dashboard-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")

SUMMARY=$(curl -s "${BASE_URL}/dashboard/summary" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || typeof d.data?.studioCount !== 'number') {
  console.error('Missing success envelope or studioCount', d);
  process.exit(1);
}
if (!Array.isArray(d.data.recentStudios) || !Array.isArray(d.data.todayBookings) || !Array.isArray(d.data.recentClients)) {
  console.error('Missing recentStudios, todayBookings, or recentClients arrays', d);
  process.exit(1);
}
if (d.data.monthRevenue !== 0 || d.data.utilizationPercent !== 0) {
  console.error('Expected placeholder zeros for future revenue/utilization KPIs', d.data);
  process.exit(1);
}
" "${SUMMARY}"

echo "M16 dashboard smoke: auth guard and summary KPI shape passed"
