# Loan API conformance suite

A black-box test suite for the loan API. It talks only HTTP to a base URL, so the same files run unchanged against every implementation:

- [nodejs-typescript-rest-boilerplate](https://github.com/the-vishal-kumar/nodejs-typescript-rest-boilerplate) (Express, MongoDB)
- [fastify-postgres-boilerplate](https://github.com/the-vishal-kumar/fastify-postgres-boilerplate) (Fastify, PostgreSQL)
- [go-postgres-boilerplate](https://github.com/the-vishal-kumar/go-postgres-boilerplate) (Go, PostgreSQL)

The suite and the contract it checks (`../contract/openapi.json`) are released together by git tag. The other implementations fetch a tag; nothing is copied into them. `conformance-v1` was the first release; `conformance-v2` has the same tests and contract, with the benchmark script counting lines of code consistently and reporting Go dependencies correctly.

## What it checks

| File | Behaviour |
|---|---|
| `auth.test.mjs` | sign-up, case-insensitive unique email (also under a race), validation messages, one 401 for unknown email and wrong password, token lifetimes, admin sign-in, forged and revoked tokens, password reset, sign-off |
| `loans.test.mjs` | loan request and validation, exact schedules in cents, ownership, admin approval rules |
| `repayments.test.mjs` | ordered instalments, overpayment flowing forward, refusals, PAID after the last instalment, concurrent payments never applying money twice or losing it |
| `platform.test.mjs` | health probes, 400, 413 and 404 envelopes, security headers, `X-Request-Id`, `/docs`, the served OpenAPI document against the contract, sign-in rate limit |

Cases that need access to the process or the database stay in each repo's own tests: the token is stored only as a hash, an expired session is refused, a database failure answers 500 with a request id, readiness fails while shutting down, and admin sign-up can be switched off.

## Running it

Start the implementation with its `.env.sample` values and two changes:

- `ADMIN_SIGNUP_ENABLED=true`: fixtures (admins) are created through the API.
- `TRUST_PROXY=1`: every simulated client sends its own `X-Forwarded-For`, so per-IP rate limits apply per test and the rate-limit test does not block the others.

Then, with only Docker on the host:

```bash
docker run --rm --network host -v "$PWD":/suite:ro -w /suite -e BASE_URL=http://localhost:3000 \
  node:22.23.5-bookworm-slim node --test 'conformance/*.test.mjs'
```

`BASE_URL` defaults to `http://localhost:3000`. Set `USER_TOKEN_TTL_MINUTES` if the stack uses another customer token lifetime than 1440. Every run uses fresh emails, so it can rerun against a live stack. Each implementation's `make conformance` does all of this.

## Load test

`load/loan-flow.js` is the [k6](https://k6.io) mix used for the comparison: sign in, request a loan, list loans, get the loan, admin approval, and a repayment. `load/bench.sh` runs it against one implementation (warm-up, then three measured runs) and also records cold start, memory, image size, lines of code and dependencies. Each implementation's `make bench` calls it.
