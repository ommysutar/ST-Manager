#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"

echo "M18 dashboard smoke against ${BASE_URL}"

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
if (
  !Array.isArray(d.data.recentStudios) ||
  !Array.isArray(d.data.todayBookings) ||
  !Array.isArray(d.data.recentClients) ||
  !Array.isArray(d.data.sessionsInProgress) ||
  !Array.isArray(d.data.completedTodaySessions) ||
  !Array.isArray(d.data.outstandingInvoices) ||
  !Array.isArray(d.data.paidThisMonthInvoices)
) {
  console.error('Missing dashboard summary arrays', d);
  process.exit(1);
}
if (typeof d.data.monthRevenue !== 'number' || typeof d.data.outstandingBalance !== 'number') {
  console.error('Missing billing dashboard totals', d);
  process.exit(1);
}
if (d.data.utilizationPercent !== 0) {
  console.error('Expected placeholder zero for utilization KPI', d.data);
  process.exit(1);
}
" "${SUMMARY}"

echo "M18 dashboard smoke: auth guard and summary KPI shape passed"
