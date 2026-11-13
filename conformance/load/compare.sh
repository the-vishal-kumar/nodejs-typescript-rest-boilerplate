#!/usr/bin/env bash
# Renders the measured comparison table (Markdown) from the result.json files
# that bench.sh writes, one per implementation, in the order given:
#   bash conformance/load/compare.sh express.json fastify.json go.json
# Needs only jq. Every number in the output comes from those files.
set -euo pipefail
(($# >= 1)) || { echo "usage: $0 result.json..." >&2; exit 2; }

jq -s -r '
  def ms: if . >= 100 then (. | round | tostring) else ((. * 10 | round) / 10 | tostring) end;
  def row($title; f): "| \($title) | " + (map(f) | join(" | ")) + " |";
  def lat(g): (.latency[g].p50_ms | ms) + " / " + (.latency[g].p99_ms | ms);
  def stack_label: {
    "express-mongodb": "Express + MongoDB",
    "fastify-postgresql": "Fastify + PostgreSQL",
    "go-postgresql": "Go + PostgreSQL"
  }[.name] // .name;
  [
    "| Measure | " + (map(stack_label) | join(" | ")) + " |",
    "|---|" + (map("---:") | join("|")) + "|",
    row("Throughput (requests/s)"; .throughput_rps * 10 | round / 10 | tostring),
    row("Journeys/s (6 requests each)"; .journeys_per_s * 10 | round / 10 | tostring),
    row("Error rate"; (.error_rate * 100 * 100 | round / 100 | tostring) + " %"),
    row("Sign-in p50 / p99 (ms)"; lat("signin")),
    row("Request loan p50 / p99 (ms)"; lat("loan_request")),
    row("List loans p50 / p99 (ms)"; lat("loan_list")),
    row("Get loan p50 / p99 (ms)"; lat("loan_get")),
    row("Approve p50 / p99 (ms)"; lat("loan_approve")),
    row("Repayment p50 / p99 (ms)"; lat("repayment")),
    row("RSS at rest (MiB)"; .rss_mib.rest | tostring),
    row("RSS under load, peak (MiB)"; .rss_mib.peak_under_load | tostring),
    row("Image size (MB)"; .image_mb | tostring),
    row("Cold start to ready (ms)"; .cold_start_ms | tostring),
    row("Lines of code, excluding tests"; .loc_excluding_tests | tostring),
    row("Runtime dependencies, direct / total"; "\(.runtime_dependencies.direct) / \(.runtime_dependencies.total)")
  ] | join("\n")
' "$@"
