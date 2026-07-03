#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"
STUDIO_ID="${AI_SMOKE_STUDIO_ID:-cmr4aismoke000000000001}"
STUDIO_NAME="${AI_SMOKE_STUDIO_NAME:-M12 AI Smoke Studio}"

echo "M12 AI smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m12-ai-unauth.json -w "%{http_code}" -X POST "${BASE_URL}/ai/studios/summary" \
  -H "Content-Type: application/json" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"name\":\"${STUDIO_NAME}\"}")

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected POST /ai/studios/summary without token to return 401, got ${UNAUTH}"
  cat /tmp/m12-ai-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")

SUMMARY=$(curl -s -X POST "${BASE_URL}/ai/studios/summary" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studioId\":\"${STUDIO_ID}\",\"name\":\"${STUDIO_NAME}\"}")

node -e "const d=JSON.parse(process.argv[1]); if(!d.success||!d.data?.summary?.trim()){console.error(d);process.exit(1)}" "${SUMMARY}"

echo "M12 AI smoke: auth guard and mock summary generation passed"
