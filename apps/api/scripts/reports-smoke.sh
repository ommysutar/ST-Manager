#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"
CLIENT_NAME="${REPORTS_SMOKE_CLIENT:-M19 Reports Smoke Client}"

echo "M19 reports smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m19-reports-unauth.json -w "%{http_code}" "${BASE_URL}/reports/revenue?from=2026-07-01T00:00:00.000Z&to=2026-07-31T00:00:00.000Z")

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected GET /reports/revenue without token to return 401, got ${UNAUTH}"
  cat /tmp/m19-reports-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")
# Client create is studio-scoped to the authenticated user; booking/session/invoice
# must use that same studio (POST /studios does not reassign the user).
STUDIO_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.user?.studioId){process.exit(1)}; process.stdout.write(d.data.user.studioId)" "${LOGIN}")

CLIENT=$(curl -s -o /tmp/m19-reports-client.json -w "%{http_code}" -X POST "${BASE_URL}/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"name\":\"${CLIENT_NAME}\",\"company\":\"Smoke Co\"}")

if [[ "${CLIENT}" != "201" ]]; then
  echo "Expected POST /clients to return 201, got ${CLIENT}"
  cat /tmp/m19-reports-client.json
  exit 1
fi

CLIENT_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m19-reports-client.json)")

BOOKING=$(curl -s -o /tmp/m19-reports-booking.json -w "%{http_code}" -X POST "${BASE_URL}/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"clientId\":\"${CLIENT_ID}\",\"title\":\"M19 Reports Booking\",\"startAt\":\"2026-07-03T10:00:00.000Z\",\"endAt\":\"2026-07-03T12:00:00.000Z\"}")
if [[ "${BOOKING}" != "201" ]]; then
  echo "Expected POST /bookings to return 201, got ${BOOKING}"
  cat /tmp/m19-reports-booking.json
  exit 1
fi

SESSION=$(curl -s -o /tmp/m19-reports-session.json -w "%{http_code}" -X POST "${BASE_URL}/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"clientId\":\"${CLIENT_ID}\",\"title\":\"M19 Reports Session\",\"startedAt\":\"2026-07-03T14:00:00.000Z\"}")

if [[ "${SESSION}" != "201" ]]; then
  echo "Expected POST /sessions to return 201, got ${SESSION}"
  cat /tmp/m19-reports-session.json
  exit 1
fi

SESSION_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m19-reports-session.json)")

curl -s -X POST "${BASE_URL}/sessions/${SESSION_ID}/start" -H "Authorization: Bearer ${ACCESS}" > /dev/null
curl -s -X POST "${BASE_URL}/sessions/${SESSION_ID}/complete" -H "Authorization: Bearer ${ACCESS}" > /dev/null

CREATE=$(curl -s -o /tmp/m19-reports-invoice.json -w "%{http_code}" -X POST "${BASE_URL}/invoices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"clientId\":\"${CLIENT_ID}\",\"sessionId\":\"${SESSION_ID}\",\"lineItems\":[{\"description\":\"Studio time\",\"quantity\":2,\"unitPrice\":150,\"amount\":300}],\"taxRate\":10,\"dueDate\":\"2026-07-10T00:00:00.000Z\"}")

if [[ "${CREATE}" != "201" ]]; then
  echo "Expected POST /invoices to return 201, got ${CREATE}"
  cat /tmp/m19-reports-invoice.json
  exit 1
fi

INVOICE_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m19-reports-invoice.json)")

curl -s -X POST "${BASE_URL}/invoices/${INVOICE_ID}/send" -H "Authorization: Bearer ${ACCESS}" > /dev/null
curl -s -X POST "${BASE_URL}/invoices/${INVOICE_ID}/mark-paid" -H "Authorization: Bearer ${ACCESS}" > /dev/null

# mark-paid / session complete stamp paidAt and endedAt as wall-clock "now";
# query a short UTC window around today so the smoke is date-stable in CI.
FROM=$(node -e "const d=new Date(); d.setUTCDate(d.getUTCDate()-1); d.setUTCHours(0,0,0,0); process.stdout.write(d.toISOString())")
TO=$(node -e "const d=new Date(); d.setUTCDate(d.getUTCDate()+2); d.setUTCHours(0,0,0,0); process.stdout.write(d.toISOString())")

REVENUE=$(curl -s "${BASE_URL}/reports/revenue?from=${FROM}&to=${TO}" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || typeof d.data?.totalRevenue !== 'number') {
  console.error('Missing revenue report envelope', d);
  process.exit(1);
}
if (d.data.totalRevenue < 330) {
  console.error('Expected revenue report to include at least the smoke invoice total', d.data.totalRevenue);
  process.exit(1);
}
" "${REVENUE}"

UTILIZATION=$(curl -s "${BASE_URL}/reports/utilization?from=${FROM}&to=${TO}" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || typeof d.data?.overallPercent !== 'number') {
  console.error('Missing utilization report envelope', d);
  process.exit(1);
}
if (!Array.isArray(d.data.byStudio)) {
  console.error('Missing utilization byStudio array', d);
  process.exit(1);
}
" "${UTILIZATION}"

CLIENTS=$(curl -s "${BASE_URL}/reports/clients?from=${FROM}&to=${TO}" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || !Array.isArray(d.data?.clients)) {
  console.error('Missing client activity report envelope', d);
  process.exit(1);
}
const row = d.data.clients.find((client) => client.clientName === process.argv[2]);
if (!row || row.revenue < 330) {
  console.error('Expected client activity revenue for smoke client', d.data.clients);
  process.exit(1);
}
" "${CLIENTS}" "${CLIENT_NAME}"

CSV=$(curl -s "${BASE_URL}/reports/revenue/export?from=${FROM}&to=${TO}" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const csv = process.argv[1];
if (!csv.startsWith('date,revenue,invoiceCount')) {
  console.error('Unexpected CSV header', csv);
  process.exit(1);
}
const totalLine = csv.trim().split('\n').find((line) => line.startsWith('total,'));
if (!totalLine) {
  console.error('Missing CSV total row', csv);
  process.exit(1);
}
const totalRevenue = Number(totalLine.split(',')[1]);
if (!Number.isFinite(totalRevenue) || totalRevenue < 330) {
  console.error('Expected CSV total revenue to include smoke invoice', totalLine);
  process.exit(1);
}
" "${CSV}"

SUMMARY=$(curl -s "${BASE_URL}/dashboard/summary" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || typeof d.data?.utilizationPercent !== 'number') {
  console.error('Missing utilizationPercent on dashboard summary', d);
  process.exit(1);
}
if (!Array.isArray(d.data.revenueTrend)) {
  console.error('Missing revenueTrend on dashboard summary', d);
  process.exit(1);
}
" "${SUMMARY}"

echo "M19 reports smoke: auth guard, revenue/utilization/clients reports, CSV export, and dashboard aggregates passed"
