#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"
CLIENT_NAME="${INVOICES_SMOKE_CLIENT:-M18 Invoices Smoke Client}"
STUDIO_NAME="${INVOICES_SMOKE_STUDIO:-M18 Invoices Smoke Studio}"

echo "M18 invoices smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m18-invoices-unauth.json -w "%{http_code}" "${BASE_URL}/invoices")

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected GET /invoices without token to return 401, got ${UNAUTH}"
  cat /tmp/m18-invoices-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")

CLIENT=$(curl -s -o /tmp/m18-invoices-client.json -w "%{http_code}" -X POST "${BASE_URL}/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"name\":\"${CLIENT_NAME}\",\"company\":\"Smoke Co\"}")

if [[ "${CLIENT}" != "201" ]]; then
  echo "Expected POST /clients to return 201, got ${CLIENT}"
  cat /tmp/m18-invoices-client.json
  exit 1
fi

CLIENT_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m18-invoices-client.json)")

STUDIO=$(curl -s -o /tmp/m18-invoices-studio.json -w "%{http_code}" -X POST "${BASE_URL}/studios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"name\":\"${STUDIO_NAME}\"}")

if [[ "${STUDIO}" != "201" ]]; then
  echo "Expected POST /studios to return 201, got ${STUDIO}"
  cat /tmp/m18-invoices-studio.json
  exit 1
fi

STUDIO_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m18-invoices-studio.json)")

SESSION=$(curl -s -o /tmp/m18-invoices-session.json -w "%{http_code}" -X POST "${BASE_URL}/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"clientId\":\"${CLIENT_ID}\",\"title\":\"M18 Invoice Session\",\"startedAt\":\"2026-07-03T14:00:00.000Z\"}")

if [[ "${SESSION}" != "201" ]]; then
  echo "Expected POST /sessions to return 201, got ${SESSION}"
  cat /tmp/m18-invoices-session.json
  exit 1
fi

SESSION_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m18-invoices-session.json)")

curl -s -X POST "${BASE_URL}/sessions/${SESSION_ID}/start" -H "Authorization: Bearer ${ACCESS}" > /dev/null
curl -s -X POST "${BASE_URL}/sessions/${SESSION_ID}/complete" -H "Authorization: Bearer ${ACCESS}" > /dev/null

CREATE=$(curl -s -o /tmp/m18-invoices-create.json -w "%{http_code}" -X POST "${BASE_URL}/invoices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"clientId\":\"${CLIENT_ID}\",\"sessionId\":\"${SESSION_ID}\",\"lineItems\":[{\"description\":\"Studio time\",\"quantity\":2,\"unitPrice\":150,\"amount\":300}],\"taxRate\":10,\"dueDate\":\"2026-07-10T00:00:00.000Z\"}")

if [[ "${CREATE}" != "201" ]]; then
  echo "Expected POST /invoices with sessionId to return 201, got ${CREATE}"
  cat /tmp/m18-invoices-create.json
  exit 1
fi

INVOICE_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m18-invoices-create.json)")

DUPLICATE=$(curl -s -o /tmp/m18-invoices-duplicate.json -w "%{http_code}" -X POST "${BASE_URL}/invoices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"clientId\":\"${CLIENT_ID}\",\"sessionId\":\"${SESSION_ID}\",\"lineItems\":[{\"description\":\"Studio time\",\"quantity\":1,\"unitPrice\":150,\"amount\":150}],\"dueDate\":\"2026-07-10T00:00:00.000Z\"}")

if [[ "${DUPLICATE}" != "409" ]]; then
  echo "Expected duplicate session invoice to return 409, got ${DUPLICATE}"
  cat /tmp/m18-invoices-duplicate.json
  exit 1
fi

SEND=$(curl -s -o /tmp/m18-invoices-send.json -w "%{http_code}" -X POST "${BASE_URL}/invoices/${INVOICE_ID}/send" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${SEND}" != "201" && "${SEND}" != "200" ]]; then
  echo "Expected POST /invoices/:id/send to succeed, got ${SEND}"
  cat /tmp/m18-invoices-send.json
  exit 1
fi

INVALID_SEND=$(curl -s -o /tmp/m18-invoices-invalid-send.json -w "%{http_code}" -X POST "${BASE_URL}/invoices/${INVOICE_ID}/send" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${INVALID_SEND}" != "409" ]]; then
  echo "Expected resend to return 409, got ${INVALID_SEND}"
  cat /tmp/m18-invoices-invalid-send.json
  exit 1
fi

PAID=$(curl -s -o /tmp/m18-invoices-paid.json -w "%{http_code}" -X POST "${BASE_URL}/invoices/${INVOICE_ID}/mark-paid" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${PAID}" != "201" && "${PAID}" != "200" ]]; then
  echo "Expected POST /invoices/:id/mark-paid to succeed, got ${PAID}"
  cat /tmp/m18-invoices-paid.json
  exit 1
fi

SUMMARY=$(curl -s "${BASE_URL}/dashboard/summary" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || !Array.isArray(d.data?.outstandingInvoices) || !Array.isArray(d.data?.paidThisMonthInvoices)) {
  console.error('Missing invoice dashboard arrays', d);
  process.exit(1);
}
if (typeof d.data.outstandingBalance !== 'number' || typeof d.data.monthRevenue !== 'number') {
  console.error('Missing invoice dashboard totals', d);
  process.exit(1);
}
if (d.data.monthRevenue < 330) {
  console.error('Expected monthRevenue to include paid invoice total', d.data.monthRevenue);
  process.exit(1);
}
" "${SUMMARY}"

echo "M18 invoices smoke: auth guard, lifecycle, session conversion, and dashboard shape passed"
