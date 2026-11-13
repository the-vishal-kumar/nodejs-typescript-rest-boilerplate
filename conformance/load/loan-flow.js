// Load mix for the loan API family, run with the grafana/k6 image:
//   docker run --rm --network host -v "$PWD/conformance/load:/load:ro" grafana/k6:1.8.2 run /load/loan-flow.js
//
// Each iteration is one customer journey: sign in, request a loan, list loans,
// get the loan, then an admin approves it and the customer pays the first
// instalment. Every request is tagged with its endpoint group, so the summary
// reports p50 and p99 per group.
//
// Environment: BASE_URL (default http://localhost:3000), VUS (default 20),
// DURATION (default 60s), CUSTOMERS (default 100), SUMMARY (path of the JSON
// summary to write, default /dev/null). The stack must allow these request
// rates: run it with high RATE_LIMIT_MAX and AUTH_RATE_LIMIT_MAX.
import http from 'k6/http';
import { check, fail } from 'k6';
import exec from 'k6/execution';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const VUS = Number(__ENV.VUS || 20);
const DURATION = __ENV.DURATION || '60s';
const CUSTOMERS = Number(__ENV.CUSTOMERS || 100);
const PASSWORD = 'password123';
const GROUPS = ['signin', 'loan_request', 'loan_list', 'loan_get', 'loan_approve', 'repayment'];

const thresholds = { checks: ['rate>0.99'] };
// A threshold per group makes k6 keep and report that sub-metric.
for (const group of GROUPS) thresholds[`http_req_duration{group:${group}}`] = ['max>=0'];

export const options = {
  setupTimeout: '300s',
  scenarios: {
    journey: { executor: 'constant-vus', vus: VUS, duration: DURATION },
  },
  thresholds,
  summaryTrendStats: ['med', 'p(99)', 'avg', 'max'],
};

const json = { headers: { 'Content-Type': 'application/json' } };
const auth = token => ({ headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
const tagged = (params, group) => Object.assign({}, params, { tags: { group } });

const expectStatus = (response, status, what) => {
  if (response.status !== status) fail(`${what}: expected ${status}, got ${response.status}: ${response.body}`);
};

export function setup() {
  const run = `${Date.now()}`;
  const admin = { email: `bench-admin-${run}@example.com`, password: PASSWORD, firstName: 'Bench' };
  expectStatus(http.post(`${BASE_URL}/auth/signup/admin`, JSON.stringify(admin), json), 204, 'admin sign-up');
  const adminSignin = http.post(
    `${BASE_URL}/auth/signin/admin`,
    JSON.stringify({ email: admin.email, password: PASSWORD }),
    json,
  );
  expectStatus(adminSignin, 200, 'admin sign-in');

  const customers = [];
  for (let i = 0; i < CUSTOMERS; i++) {
    const email = `bench-${run}-${i}@example.com`;
    const body = JSON.stringify({ email, password: PASSWORD, firstName: 'Bench' });
    expectStatus(http.post(`${BASE_URL}/auth/signup`, body, json), 204, 'customer sign-up');
    customers.push(email);
  }
  return { adminToken: adminSignin.json('data.accessToken'), customers };
}

export default function (data) {
  const email = data.customers[exec.scenario.iterationInTest % data.customers.length];

  const signin = http.post(
    `${BASE_URL}/auth/signin`,
    JSON.stringify({ email, password: PASSWORD }),
    tagged(json, 'signin'),
  );
  if (!check(signin, { 'signin 200': r => r.status === 200 })) return;
  const token = signin.json('data.accessToken');

  const created = http.post(
    `${BASE_URL}/loan`,
    JSON.stringify({ amount: 1000, term: 4 }),
    tagged(auth(token), 'loan_request'),
  );
  if (!check(created, { 'loan_request 201': r => r.status === 201 })) return;
  const id = created.json('data.id');

  check(http.get(`${BASE_URL}/loan`, tagged(auth(token), 'loan_list')), { 'loan_list 200': r => r.status === 200 });
  check(http.get(`${BASE_URL}/loan/${id}`, tagged(auth(token), 'loan_get')), { 'loan_get 200': r => r.status === 200 });

  const approved = http.put(`${BASE_URL}/loan/${id}/approve`, null, tagged(auth(data.adminToken), 'loan_approve'));
  if (!check(approved, { 'loan_approve 204': r => r.status === 204 })) return;

  check(http.put(`${BASE_URL}/loan/${id}/repayment`, JSON.stringify({ amount: 250 }), tagged(auth(token), 'repayment')), {
    'repayment 204': r => r.status === 204,
  });
}

export function handleSummary(data) {
  const out = { stdout: textSummary(data) };
  if (__ENV.SUMMARY) out[__ENV.SUMMARY] = JSON.stringify(data, null, 2);
  return out;
}

function textSummary(data) {
  const lines = [];
  const reqs = data.metrics.http_reqs.values;
  const failed = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  lines.push(`requests ${reqs.count} (${reqs.rate.toFixed(1)}/s), failed ${(failed * 100).toFixed(2)}%`);
  lines.push(`iterations ${data.metrics.iterations.values.count} (${data.metrics.iterations.values.rate.toFixed(1)}/s)`);
  for (const group of GROUPS) {
    const metric = data.metrics[`http_req_duration{group:${group}}`];
    if (!metric) continue;
    const v = metric.values;
    lines.push(`${group.padEnd(13)} p50 ${v.med.toFixed(1)} ms  p99 ${v['p(99)'].toFixed(1)} ms`);
  }
  return `${lines.join('\n')}\n`;
}
