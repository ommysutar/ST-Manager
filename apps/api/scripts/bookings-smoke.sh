#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"
STUDIO_NAME="${BOOKINGS_SMOKE_STUDIO:-M16 Bookings Smoke Studio}"
BOOKING_TITLE="${BOOKINGS_SMOKE_TITLE:-M16 Bookings Smoke Booking}"

echo "M16 bookings smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m16-bookings-unauth.json -w "%{http_code}" "${BASE_URL}/bookings?studioId=x&from=2026-07-03T00:00:00.000Z&to=2026-07-04T00:00:00.000Z")

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected GET /bookings without token to return 401, got ${UNAUTH}"
  cat /tmp/m16-bookings-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")

STUDIO=$(curl -s -o /tmp/m16-bookings-studio.json -w "%{http_code}" -X POST "${BASE_URL}/studios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"name\":\"${STUDIO_NAME}\"}")

if [[ "${STUDIO}" != "201" ]]; then
  echo "Expected POST /studios to return 201, got ${STUDIO}"
  cat /tmp/m16-bookings-studio.json
  exit 1
fi

STUDIO_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m16-bookings-studio.json)")

START_AT="2026-07-03T14:00:00.000Z"
END_AT="2026-07-03T16:00:00.000Z"
FROM="2026-07-03T00:00:00.000Z"
TO="2026-07-04T00:00:00.000Z"

CREATE=$(curl -s -o /tmp/m16-bookings-create.json -w "%{http_code}" -X POST "${BASE_URL}/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"title\":\"${BOOKING_TITLE}\",\"startAt\":\"${START_AT}\",\"endAt\":\"${END_AT}\"}")

if [[ "${CREATE}" != "201" ]]; then
  echo "Expected POST /bookings to return 201, got ${CREATE}"
  cat /tmp/m16-bookings-create.json
  exit 1
fi

BOOKING_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m16-bookings-create.json)")

CONFLICT=$(curl -s -o /tmp/m16-bookings-conflict.json -w "%{http_code}" -X POST "${BASE_URL}/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"title\":\"Overlap\",\"startAt\":\"2026-07-03T15:00:00.000Z\",\"endAt\":\"2026-07-03T17:00:00.000Z\"}")

if [[ "${CONFLICT}" != "409" ]]; then
  echo "Expected overlapping POST /bookings to return 409, got ${CONFLICT}"
  cat /tmp/m16-bookings-conflict.json
  exit 1
fi

LIST=$(curl -s "${BASE_URL}/bookings?studioId=${STUDIO_ID}&from=${FROM}&to=${TO}" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || !Array.isArray(d.data) || !d.data.some((booking) => booking.id === process.argv[2])) {
  console.error('Created booking missing from range list', d);
  process.exit(1);
}
" "${LIST}" "${BOOKING_ID}"

DETAIL=$(curl -s -o /tmp/m16-bookings-detail.json -w "%{http_code}" "${BASE_URL}/bookings/${BOOKING_ID}" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${DETAIL}" != "200" ]]; then
  echo "Expected GET /bookings/:id to return 200, got ${DETAIL}"
  cat /tmp/m16-bookings-detail.json
  exit 1
fi

PATCH=$(curl -s -o /tmp/m16-bookings-patch.json -w "%{http_code}" -X PATCH "${BASE_URL}/bookings/${BOOKING_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d '{"title":"M16 Bookings Smoke Booking Updated"}')

if [[ "${PATCH}" != "200" ]]; then
  echo "Expected PATCH /bookings/:id to return 200, got ${PATCH}"
  cat /tmp/m16-bookings-patch.json
  exit 1
fi

CREATE_SECOND=$(curl -s -o /tmp/m16-bookings-create-second.json -w "%{http_code}" -X POST "${BASE_URL}/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"title\":\"Second booking\",\"startAt\":\"2026-07-03T18:00:00.000Z\",\"endAt\":\"2026-07-03T20:00:00.000Z\"}")

if [[ "${CREATE_SECOND}" != "201" ]]; then
  echo "Expected second POST /bookings to return 201, got ${CREATE_SECOND}"
  cat /tmp/m16-bookings-create-second.json
  exit 1
fi

PATCH_CONFLICT=$(curl -s -o /tmp/m16-bookings-patch-conflict.json -w "%{http_code}" -X PATCH "${BASE_URL}/bookings/${BOOKING_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d '{"startAt":"2026-07-03T19:00:00.000Z","endAt":"2026-07-03T21:00:00.000Z"}')

if [[ "${PATCH_CONFLICT}" != "409" ]]; then
  echo "Expected overlapping PATCH /bookings/:id to return 409, got ${PATCH_CONFLICT}"
  cat /tmp/m16-bookings-patch-conflict.json
  exit 1
fi

DELETE=$(curl -s -o /tmp/m16-bookings-delete.json -w "%{http_code}" -X DELETE "${BASE_URL}/bookings/${BOOKING_ID}" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${DELETE}" != "200" ]]; then
  echo "Expected DELETE /bookings/:id to return 200, got ${DELETE}"
  cat /tmp/m16-bookings-delete.json
  exit 1
fi

LIST_AFTER=$(curl -s "${BASE_URL}/bookings?studioId=${STUDIO_ID}&from=${FROM}&to=${TO}" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || !Array.isArray(d.data) || d.data.some((booking) => booking.id === process.argv[2])) {
  console.error('Cancelled booking still present in range list', d);
  process.exit(1);
}
" "${LIST_AFTER}" "${BOOKING_ID}"

SUMMARY=$(curl -s "${BASE_URL}/dashboard/summary" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || !Array.isArray(d.data?.todayBookings)) {
  console.error('Dashboard summary missing todayBookings array', d);
  process.exit(1);
}
" "${SUMMARY}"

echo "M16 bookings smoke: auth guard, CRUD lifecycle, conflict detection, and dashboard shape passed"
