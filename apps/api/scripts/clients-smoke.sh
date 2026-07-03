#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"
CLIENT_NAME="${CLIENTS_SMOKE_NAME:-M15 Clients Smoke Client}"

echo "M15 clients smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m15-clients-unauth.json -w "%{http_code}" "${BASE_URL}/clients")

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected GET /clients without token to return 401, got ${UNAUTH}"
  cat /tmp/m15-clients-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")

CREATE=$(curl -s -o /tmp/m15-clients-create.json -w "%{http_code}" -X POST "${BASE_URL}/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"name\":\"${CLIENT_NAME}\",\"email\":\"clients-smoke@st-manager.local\",\"company\":\"Smoke Co\"}")

if [[ "${CREATE}" != "201" ]]; then
  echo "Expected POST /clients to return 201, got ${CREATE}"
  cat /tmp/m15-clients-create.json
  exit 1
fi

CLIENT_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m15-clients-create.json)")

LIST=$(curl -s "${BASE_URL}/clients" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || !Array.isArray(d.data) || !d.data.some((client) => client.id === process.argv[2])) {
  console.error('Created client missing from list', d);
  process.exit(1);
}
" "${LIST}" "${CLIENT_ID}"

DETAIL=$(curl -s -o /tmp/m15-clients-detail.json -w "%{http_code}" "${BASE_URL}/clients/${CLIENT_ID}" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${DETAIL}" != "200" ]]; then
  echo "Expected GET /clients/:id to return 200, got ${DETAIL}"
  cat /tmp/m15-clients-detail.json
  exit 1
fi

PATCH=$(curl -s -o /tmp/m15-clients-patch.json -w "%{http_code}" -X PATCH "${BASE_URL}/clients/${CLIENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d '{"name":"M15 Clients Smoke Client Updated"}')

if [[ "${PATCH}" != "200" ]]; then
  echo "Expected PATCH /clients/:id to return 200, got ${PATCH}"
  cat /tmp/m15-clients-patch.json
  exit 1
fi

DELETE=$(curl -s -o /tmp/m15-clients-delete.json -w "%{http_code}" -X DELETE "${BASE_URL}/clients/${CLIENT_ID}" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${DELETE}" != "200" ]]; then
  echo "Expected DELETE /clients/:id to return 200, got ${DELETE}"
  cat /tmp/m15-clients-delete.json
  exit 1
fi

NOT_FOUND=$(curl -s -o /tmp/m15-clients-not-found.json -w "%{http_code}" "${BASE_URL}/clients/${CLIENT_ID}" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${NOT_FOUND}" != "404" ]]; then
  echo "Expected GET /clients/:id after delete to return 404, got ${NOT_FOUND}"
  cat /tmp/m15-clients-not-found.json
  exit 1
fi

SUMMARY=$(curl -s "${BASE_URL}/dashboard/summary" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || typeof d.data?.clientCount !== 'number' || !Array.isArray(d.data.recentClients)) {
  console.error('Dashboard summary missing client KPIs', d);
  process.exit(1);
}
" "${SUMMARY}"

echo "M15 clients smoke: auth guard, CRUD lifecycle, and dashboard client KPIs passed"
