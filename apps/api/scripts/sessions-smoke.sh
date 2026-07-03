#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"
STUDIO_NAME="${SESSIONS_SMOKE_STUDIO:-M17 Sessions Smoke Studio}"
BOOKING_TITLE="${SESSIONS_SMOKE_BOOKING:-M17 Sessions Smoke Booking}"

echo "M17 sessions smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m17-sessions-unauth.json -w "%{http_code}" "${BASE_URL}/sessions")

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected GET /sessions without token to return 401, got ${UNAUTH}"
  cat /tmp/m17-sessions-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")

STUDIO=$(curl -s -o /tmp/m17-sessions-studio.json -w "%{http_code}" -X POST "${BASE_URL}/studios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"name\":\"${STUDIO_NAME}\"}")

if [[ "${STUDIO}" != "201" ]]; then
  echo "Expected POST /studios to return 201, got ${STUDIO}"
  cat /tmp/m17-sessions-studio.json
  exit 1
fi

STUDIO_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m17-sessions-studio.json)")

BOOKING=$(curl -s -o /tmp/m17-sessions-booking.json -w "%{http_code}" -X POST "${BASE_URL}/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"title\":\"${BOOKING_TITLE}\",\"startAt\":\"2026-07-03T14:00:00.000Z\",\"endAt\":\"2026-07-03T16:00:00.000Z\"}")

if [[ "${BOOKING}" != "201" ]]; then
  echo "Expected POST /bookings to return 201, got ${BOOKING}"
  cat /tmp/m17-sessions-booking.json
  exit 1
fi

BOOKING_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m17-sessions-booking.json)")

CREATE=$(curl -s -o /tmp/m17-sessions-create.json -w "%{http_code}" -X POST "${BASE_URL}/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"bookingId\":\"${BOOKING_ID}\"}")

if [[ "${CREATE}" != "201" ]]; then
  echo "Expected POST /sessions with bookingId to return 201, got ${CREATE}"
  cat /tmp/m17-sessions-create.json
  exit 1
fi

SESSION_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m17-sessions-create.json)")

DUPLICATE=$(curl -s -o /tmp/m17-sessions-duplicate.json -w "%{http_code}" -X POST "${BASE_URL}/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"bookingId\":\"${BOOKING_ID}\"}")

if [[ "${DUPLICATE}" != "409" ]]; then
  echo "Expected duplicate booking session to return 409, got ${DUPLICATE}"
  cat /tmp/m17-sessions-duplicate.json
  exit 1
fi

START=$(curl -s -o /tmp/m17-sessions-start.json -w "%{http_code}" -X POST "${BASE_URL}/sessions/${SESSION_ID}/start" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${START}" != "201" && "${START}" != "200" ]]; then
  echo "Expected POST /sessions/:id/start to succeed, got ${START}"
  cat /tmp/m17-sessions-start.json
  exit 1
fi

COMPLETE=$(curl -s -o /tmp/m17-sessions-complete.json -w "%{http_code}" -X POST "${BASE_URL}/sessions/${SESSION_ID}/complete" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${COMPLETE}" != "201" && "${COMPLETE}" != "200" ]]; then
  echo "Expected POST /sessions/:id/complete to succeed, got ${COMPLETE}"
  cat /tmp/m17-sessions-complete.json
  exit 1
fi

ADHOC=$(curl -s -o /tmp/m17-sessions-adhoc.json -w "%{http_code}" -X POST "${BASE_URL}/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"title\":\"M17 Ad Hoc Session\",\"startedAt\":\"2026-07-03T18:00:00.000Z\"}")

if [[ "${ADHOC}" != "201" ]]; then
  echo "Expected ad hoc POST /sessions to return 201, got ${ADHOC}"
  cat /tmp/m17-sessions-adhoc.json
  exit 1
fi

ADHOC_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.id){process.exit(1)}; process.stdout.write(d.data.id)" "$(cat /tmp/m17-sessions-adhoc.json)")

INVALID_START=$(curl -s -o /tmp/m17-sessions-invalid-start.json -w "%{http_code}" -X POST "${BASE_URL}/sessions/${SESSION_ID}/start" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${INVALID_START}" != "409" ]]; then
  echo "Expected start on completed session to return 409, got ${INVALID_START}"
  cat /tmp/m17-sessions-invalid-start.json
  exit 1
fi

IN_PROGRESS=$(curl -s "${BASE_URL}/sessions?status=in_progress" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || !Array.isArray(d.data)) {
  console.error('Expected sessions list envelope', d);
  process.exit(1);
}
" "${IN_PROGRESS}"

CANCEL=$(curl -s -o /tmp/m17-sessions-cancel.json -w "%{http_code}" -X DELETE "${BASE_URL}/sessions/${ADHOC_ID}" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${CANCEL}" != "200" ]]; then
  echo "Expected DELETE /sessions/:id to return 200, got ${CANCEL}"
  cat /tmp/m17-sessions-cancel.json
  exit 1
fi

SUMMARY=$(curl -s "${BASE_URL}/dashboard/summary" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d = JSON.parse(process.argv[1]);
if (!d.success || !Array.isArray(d.data?.sessionsInProgress) || !Array.isArray(d.data?.completedTodaySessions)) {
  console.error('Missing sessionsInProgress or completedTodaySessions arrays', d);
  process.exit(1);
}
" "${SUMMARY}"

echo "M17 sessions smoke: auth guard, lifecycle, booking conversion, and dashboard shape passed"
