#!/usr/bin/env bash
# Measures one implementation of the loan API on this machine. Run from the
# implementation's repo root (each repo's `make bench` does this). Needs only
# Docker, curl and jq on the host.
#
# The repo provides compose.yaml plus compose.bench.yaml, which sets the CPU
# and memory limits shared by every implementation and lifts the rate limits.
#
# Writes $OUT/result.json with: cold start to ready (median of 3), memory at
# rest and peak under load (RSS of the API container's processes), image size,
# lines of code excluding tests, runtime dependencies, and per-run k6
# summaries plus their median.
#
# Environment:
#   NAME        label for the results (default: repo directory name)
#   OUT         output directory (default .cache/bench)
#   RUNS        measured runs (default 3)
#   WARMUP      warm-up duration (default 30s)
#   DURATION    measured duration per run (default 60s)
#   VUS         concurrent virtual users (default 20)
#   API_SERVICE compose service of the API (default api)
#   API_IMAGE   image to size (default: the API service's image)
#   LOC_DIRS    source directories to count, including migrations (default src)
#   LOC_EXCLUDE regex of paths to leave out of the count (default: tests);
#               the shared OpenAPI contract is never counted
#   Lines of code count only TypeScript, Go and SQL, so embedded assets and
#   the contract JSON do not distort the comparison.
#   GO_MAIN     Go only: main package to count dependencies for
set -euo pipefail

NAME=${NAME:-$(basename "$PWD")}
OUT=${OUT:-.cache/bench}
RUNS=${RUNS:-3}
WARMUP=${WARMUP:-30s}
DURATION=${DURATION:-60s}
VUS=${VUS:-20}
API_SERVICE=${API_SERVICE:-api}
LOC_DIRS=${LOC_DIRS:-src}
LOC_EXCLUDE=${LOC_EXCLUDE:-(^|/)(test|tests|testdata)/|_test\.go$|\.test\.ts$|(^|/)docs/openapi\.ts$}
K6_IMAGE=grafana/k6:1.8.2
CLOC_IMAGE=aldanial/cloc:2.10
LOAD_DIR=$(cd "$(dirname "$0")" && pwd)
BASE_URL=http://localhost:3000
COMPOSE=(docker compose -f compose.yaml -f compose.bench.yaml)

mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
log() { printf '[bench %s] %s\n' "$NAME" "$*" >&2; }
median() { sort -n | awk '{a[NR]=$1} END {print (NR%2 ? a[(NR+1)/2] : (a[NR/2]+a[NR/2+1])/2)}'; }

cleanup() { "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

wait_ready() {
  local deadline=$((SECONDS + 120))
  until curl -fs -o /dev/null "$BASE_URL/health/ready"; do
    ((SECONDS < deadline)) || { log 'API never became ready'; exit 1; }
    sleep 0.02
  done
}

# Resident memory, in MiB, of every process in the API container.
rss_mib() {
  local container
  container=$("${COMPOSE[@]}" ps -q "$API_SERVICE")
  docker top "$container" -eo pid,rss | awk 'NR > 1 {kb += $2} END {printf "%.1f\n", kb / 1024}'
}

log 'building and starting the stack'
"${COMPOSE[@]}" up --build -d --wait --wait-timeout 180 >/dev/null
wait_ready

log 'cold start to ready (3 restarts of the API container)'
: >"$OUT/cold-start-ms.txt"
for _ in 1 2 3; do
  "${COMPOSE[@]}" stop -t 15 "$API_SERVICE" >/dev/null 2>&1
  start=$(date +%s%N)
  "${COMPOSE[@]}" start "$API_SERVICE" >/dev/null 2>&1
  wait_ready
  echo $((($(date +%s%N) - start) / 1000000)) >>"$OUT/cold-start-ms.txt"
done
sleep 5
rss_rest=$(rss_mib)
log "RSS at rest ${rss_rest} MiB"

k6() {
  docker run --rm --network host -u "$(id -u):$(id -g)" -v "$LOAD_DIR:/load:ro" -v "$OUT:/out" \
    -e BASE_URL="$BASE_URL" -e VUS="$VUS" "$@"
}

log "warm-up ${WARMUP}"
k6 -e DURATION="$WARMUP" "$K6_IMAGE" run --quiet /load/loan-flow.js >"$OUT/warmup.txt"

for run in $(seq 1 "$RUNS"); do
  log "run ${run}/${RUNS}: ${DURATION} at ${VUS} VUs"
  : >"$OUT/rss-run-$run.txt"
  (while true; do rss_mib >>"$OUT/rss-run-$run.txt" 2>/dev/null || true; sleep 1; done) &
  sampler=$!
  k6 -e DURATION="$DURATION" -e SUMMARY="/out/run-$run.json" "$K6_IMAGE" run --quiet /load/loan-flow.js \
    >"$OUT/run-$run.txt"
  kill "$sampler" && wait "$sampler" 2>/dev/null || true
  cat "$OUT/run-$run.txt" >&2
done

image=${API_IMAGE:-$("${COMPOSE[@]}" config --format json | jq -r --arg s "$API_SERVICE" '.services[$s].image')}
image_mb=$(docker image inspect --format '{{.Size}}' "$image" | awk '{printf "%.1f\n", $1 / 1000 / 1000}')

log 'lines of code'
# shellcheck disable=SC2086
loc=$(docker run --rm -v "$PWD:/src:ro" -w /src "$CLOC_IMAGE" --quiet --json --fullpath \
  --include-lang=TypeScript,Go,SQL --not-match-d='(node_modules|\.cache|build|dist)' \
  --not-match-f="$LOC_EXCLUDE" $LOC_DIRS | jq '.SUM.code')

log 'runtime dependencies'
if [[ -f go.mod ]]; then
  module=$(awk '/^module /{print $2}' go.mod)
  deps_direct=$(awk '/^require \(/{b=1; next} b && /^\)/{b=0} b && !/\/\/ indirect/ && NF {n++} /^require [^(]/ && !/\/\/ indirect/ {n++} END {print n+0}' go.mod)
  deps_total=$(docker run --rm -v "$PWD:/src:ro" -w /src -e GOFLAGS='-mod=mod -buildvcs=false' -e GOCACHE=/tmp/gocache -e GOPATH=/tmp/gopath \
    golang:1.27.4-bookworm go list -deps -f '{{with .Module}}{{.Path}}{{end}}' "${GO_MAIN:-./...}" |
    sort -u | grep -v -x "$module" | grep -c .)
else
  deps_direct=$(jq '.dependencies // {} | length' package.json)
  deps_total=$(jq '[.packages | to_entries[] | select(.key != "" and (.value.dev | not))] | length' package-lock.json)
fi

# Median of the runs for every number the comparison reports.
summary_median() { for run in $(seq 1 "$RUNS"); do jq -r "$1" "$OUT/run-$run.json"; done | median; }
groups=(signin loan_request loan_list loan_get loan_approve repayment)
latency=$(for group in "${groups[@]}"; do
  p50=$(summary_median ".metrics[\"http_req_duration{group:$group}\"].values.med")
  p99=$(summary_median ".metrics[\"http_req_duration{group:$group}\"].values[\"p(99)\"]")
  jq -n --arg g "$group" --argjson p50 "$p50" --argjson p99 "$p99" '{($g): {p50_ms: $p50, p99_ms: $p99}}'
done | jq -s 'add')
rss_peak=$(for run in $(seq 1 "$RUNS"); do sort -n "$OUT/rss-run-$run.txt" | tail -1; done | median)

jq -n \
  --arg name "$NAME" \
  --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg cpu "$(awk -F': ' '/model name/{print $2; exit}' /proc/cpuinfo)" \
  --arg cores "$(nproc)" \
  --arg ram "$(awk '/MemTotal/{printf "%.1f GiB", $2 / 1024 / 1024}' /proc/meminfo)" \
  --arg docker "$(docker version --format '{{.Server.Version}}')" \
  --arg runs "$RUNS" --arg vus "$VUS" --arg duration "$DURATION" --arg warmup "$WARMUP" \
  --argjson cold "$(median <"$OUT/cold-start-ms.txt")" \
  --argjson rss_rest "$rss_rest" --argjson rss_peak "$rss_peak" \
  --argjson image_mb "$image_mb" --argjson loc "$loc" \
  --argjson deps_direct "$deps_direct" --argjson deps_total "$deps_total" \
  --argjson rps "$(summary_median '.metrics.http_reqs.values.rate')" \
  --argjson iters "$(summary_median '.metrics.iterations.values.rate')" \
  --argjson errors "$(summary_median '.metrics.http_req_failed.values.rate')" \
  --argjson latency "$latency" \
  '{name: $name, date: $date,
    machine: {cpu: $cpu, cores: ($cores | tonumber), ram: $ram, docker: $docker},
    load: {runs: ($runs | tonumber), vus: ($vus | tonumber), duration: $duration, warmup: $warmup},
    throughput_rps: $rps, journeys_per_s: $iters, error_rate: $errors, latency: $latency,
    rss_mib: {rest: $rss_rest, peak_under_load: $rss_peak},
    image_mb: $image_mb, cold_start_ms: $cold, loc_excluding_tests: $loc,
    runtime_dependencies: {direct: $deps_direct, total: $deps_total}}' | tee "$OUT/result.json"
