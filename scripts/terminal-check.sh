#!/bin/sh
set -eu

BASE_URL=${ONE_IP_URL:-${1:-}}
if [ -z "$BASE_URL" ]; then
  printf '%s\n' '用法：ONE_IP_URL=https://你的域名 ./scripts/terminal-check.sh' >&2
  exit 2
fi
case "$BASE_URL" in
  https://*) ;;
  *) printf '%s\n' 'ONE_IP_URL 必须是 HTTPS 地址' >&2; exit 2 ;;
esac
command -v curl >/dev/null 2>&1 || { printf '%s\n' '需要 curl' >&2; exit 2; }
command -v jq >/dev/null 2>&1 || { printf '%s\n' '需要 jq' >&2; exit 2; }

case "$BASE_URL" in
  */) BASE_URL=${BASE_URL%/} ;;
esac
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MANIFEST="$SCRIPT_DIR/terminal-sources.json"
if [ ! -r "$MANIFEST" ]; then
  printf '%s\n' "缺少终端来源清单：$MANIFEST" >&2
  exit 2
fi
if ! jq -e '
  (.schemaVersion == 1) and
  (.registryVersion | type == "string") and
  (.sources | type == "array") and
  all(.sources[]; (.id | type == "string") and
    (.method | . == "ip-text" or . == "ip-json") and
    (.url | type == "string"))
' "$MANIFEST" >/dev/null 2>&1; then
  printf '%s\n' "终端来源清单无效：$MANIFEST" >&2
  exit 2
fi
REGISTRY_VERSION=$(jq -er '.registryVersion' "$MANIFEST")
RUN_ID="terminal-$(date -u +%Y%m%dT%H%M%SZ)-$$"
STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
NOW=$STARTED_AT
RESULTS=$(mktemp "${TMPDIR:-/tmp}/one-ip-terminal.XXXXXX")
trap 'rm -f "$RESULTS"' EXIT HUP INT TERM

emit() {
  id=$1
  method=$2
  url=$3
  response=''
  if response=$(curl -fsS --connect-timeout 3 --max-time 3 \
    -H 'Accept: application/json' "$url" 2>/dev/null); then
    case "$method" in
      ip-json)
        ip=$(printf '%s' "$response" | jq -r 'if (.ip | type) == "string" then .ip else empty end' 2>/dev/null || true)
        ;;
      ip-text)
        ip=$(printf '%s' "$response" | grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -n 1 || true)
        ;;
    esac
    if [ -n "$ip" ]; then
      jq -cn --arg runId "$RUN_ID" --arg sourceId "$id" --arg ip "$ip" \
        --arg capturedAt "$NOW" \
        '{schemaVersion:1,runId:$runId,sourceId:$sourceId,runtime:"terminal",execution:"client-request",subject:"caller-egress",provenance:"observed",verified:true,ip:$ip,status:"ok",capturedAt:$capturedAt,receivedAt:$capturedAt}' >>"$RESULTS"
      return
    fi
    status='parse_error'
  else
    status='network_error'
  fi
  jq -cn --arg runId "$RUN_ID" --arg sourceId "$id" --arg status "$status" \
    --arg capturedAt "$NOW" \
    '{schemaVersion:1,runId:$runId,sourceId:$sourceId,runtime:"terminal",execution:"client-request",subject:"caller-egress",provenance:"observed",verified:false,status:$status,capturedAt:$capturedAt,receivedAt:$capturedAt}' >>"$RESULTS"
}

while IFS="$(printf '\t')" read -r id method url; do
  [ -n "$id" ] || continue
  emit "$id" "$method" "$url"
done <<EOF
$(jq -r '.sources[] | [.id, .method, .url] | @tsv' "$MANIFEST")
EOF

FINISHED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
RESULT_JSON=$(jq -s '.' "$RESULTS")
jq -n --arg registryVersion "$REGISTRY_VERSION" --arg runId "$RUN_ID" \
  --arg startedAt "$STARTED_AT" --arg finishedAt "$FINISHED_AT" \
  --argjson results "$RESULT_JSON" \
  '{schemaVersion:1,registryVersion:$registryVersion,runId:$runId,startedAt:$startedAt,finishedAt:$finishedAt,results:$results}'
