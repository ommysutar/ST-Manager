#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"

echo "M10 auth smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m10-unauth.json -w "%{http_code}" -X POST "${BASE_URL}/studios" \
  -H "Content-Type: application/json" \
  -d '{"name":"M10 Unauthorized Studio"}')

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected POST /studios without token to return 401, got ${UNAUTH}"
  cat /tmp/m10-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken||!d.data?.refreshToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")
REFRESH=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.refreshToken){process.exit(1)}; process.stdout.write(d.data.refreshToken)" "${LOGIN}")

CREATE=$(curl -s -o /tmp/m10-create.json -w "%{http_code}" -X POST "${BASE_URL}/studios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d '{"name":"M10 Auth Smoke Studio"}')

if [[ "${CREATE}" != "201" ]]; then
  echo "Expected authenticated POST /studios to return 201, got ${CREATE}"
  cat /tmp/m10-create.json
  exit 1
fi

REFRESH_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"${REFRESH}\"}")

node -e "const d=JSON.parse(process.argv[1]); if(!d.success||!d.data?.accessToken){process.exit(1)}" "${REFRESH_RESPONSE}"

LIST=$(curl -s -o /tmp/m10-list.json -w "%{http_code}" "${BASE_URL}/studios")
if [[ "${LIST}" != "200" ]]; then
  echo "Expected GET /studios without token to return 200, got ${LIST}"
  cat /tmp/m10-list.json
  exit 1
fi

echo "M10 auth smoke: login, protected create, refresh, and public list passed"
