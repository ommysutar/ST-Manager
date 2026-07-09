#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://localhost:4000}"
OWNER_EMAIL="${DEV_OWNER_EMAIL:-owner@st-manager.local}"
PASSWORD="${DEV_AUTH_PASSWORD:-devpassword}"
INVITE_EMAIL="team-smoke-$(date +%s)@st-manager.local"

echo "Team management smoke against ${BASE_URL}"

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${OWNER_EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.data?.accessToken){console.error(d);process.exit(1)}; process.stdout.write(d.data.accessToken)" "${LOGIN}")

LIST=$(curl -s -X GET "${BASE_URL}/team-members" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "const d=JSON.parse(process.argv[1]); if(!d.success||!Array.isArray(d.data)){console.error(d);process.exit(1)}" "${LIST}"

INVITE=$(curl -s -X POST "${BASE_URL}/team-members/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS}" \
  -d "{\"fullName\":\"Smoke Tester\",\"email\":\"${INVITE_EMAIL}\",\"role\":\"assistant\"}")

INVITE_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.success||!d.data?.id){console.error(d);process.exit(1)}; process.stdout.write(d.data.id)" "${INVITE}")

RESEND=$(curl -s -o /tmp/team-resend.json -w "%{http_code}" -X POST "${BASE_URL}/team-members/invitations/${INVITE_ID}/resend" \
  -H "Authorization: Bearer ${ACCESS}" \
  -H "Content-Type: application/json" \
  -d '{}')

if [[ "${RESEND}" != "201" && "${RESEND}" != "200" ]]; then
  echo "Expected resend to succeed, got ${RESEND}"
  cat /tmp/team-resend.json
  exit 1
fi

CANCEL=$(curl -s -o /tmp/team-cancel.json -w "%{http_code}" -X DELETE "${BASE_URL}/team-members/invitations/${INVITE_ID}" \
  -H "Authorization: Bearer ${ACCESS}")

if [[ "${CANCEL}" != "200" ]]; then
  echo "Expected cancel to return 200, got ${CANCEL}"
  cat /tmp/team-cancel.json
  exit 1
fi

LIST2=$(curl -s -X GET "${BASE_URL}/team-members" \
  -H "Authorization: Bearer ${ACCESS}")

node -e "
const d=JSON.parse(process.argv[1]);
const cancelled=d.data.find(i=>i.type==='invitation'&&i.email===process.argv[2]);
if(cancelled){console.error('cancelled invite still listed');process.exit(1)}
" "${LIST2}" "${INVITE_EMAIL}"

echo "Team management smoke: list, invite, resend, cancel passed"
