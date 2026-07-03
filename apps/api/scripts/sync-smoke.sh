#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
EMAIL="${DEV_AUTH_EMAIL:-dev@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"
CLIENT_ID="${SYNC_SMOKE_STUDIO_ID:-$(node -e "process.stdout.write('cmr4syncsmoke' + Date.now().toString(36))")}"
NOW="$(node -e "process.stdout.write(new Date().toISOString())")"

echo "M11 sync smoke against ${BASE_URL}"

UNAUTH=$(curl -s -o /tmp/m11-sync-unauth.json -w "%{http_code}" -X POST "${BASE_URL}/sync/studios/push" \
  -H "Content-Type: application/json" \
  -d "{\"studios\":[{\"id\":\"${CLIENT_ID}\",\"name\":\"M11 Sync Smoke\",\"createdAt\":\"${NOW}\",\"updatedAt\":\"${NOW}\"}]}")

if [[ "${UNAUTH}" != "401" ]]; then
  echo "Expected POST /sync/studios/push without token to return 401, got ${UNAUTH}"
  cat /tmp/m11-sync-unauth.json
  exit 1
fi

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")

PUSH=$(curl -s -X POST "${BASE_URL}/sync/studios/push" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studios\":[{\"id\":\"${CLIENT_ID}\",\"name\":\"M11 Sync Smoke Studio\",\"createdAt\":\"${NOW}\",\"updatedAt\":\"${NOW}\"}]}")

node -e "const d=JSON.parse(process.argv[1]); if(!d.success||d.data?.results?.[0]?.status!=='created'){console.error(d);process.exit(1)}" "${PUSH}"

LIST=$(curl -s "${BASE_URL}/studios")
node -e "const d=JSON.parse(process.argv[1]); const id=process.argv[2]; if(!d.success||!d.data.some((s)=>s.id===id)){process.exit(1)}" "${LIST}" "${CLIENT_ID}"

RETRY=$(curl -s -X POST "${BASE_URL}/sync/studios/push" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"studios\":[{\"id\":\"${CLIENT_ID}\",\"name\":\"M11 Sync Smoke Studio\",\"createdAt\":\"${NOW}\",\"updatedAt\":\"${NOW}\"}]}")

node -e "const d=JSON.parse(process.argv[1]); if(!d.success||d.data?.results?.[0]?.status!=='unchanged'){console.error(d);process.exit(1)}" "${RETRY}"

PULL=$(curl -s -G "${BASE_URL}/sync/studios" \
  -H "Authorization: Bearer ${ACCESS}" \
  --data-urlencode "since=${NOW}")

node -e "const d=JSON.parse(process.argv[1]); if(!d.success||!d.data?.serverTime){process.exit(1)}" "${PULL}"

echo "M11 sync smoke: auth guard, push create, idempotent retry, and pull passed"
