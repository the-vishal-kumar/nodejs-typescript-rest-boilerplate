# Loan API: three implementations compared

The same loan API, built three ways and held to one [contract](../contract/openapi.json) and one [conformance suite](../conformance) (94 black-box tests, all passing against each):

- **Express + MongoDB**: [nodejs-typescript-rest-boilerplate](https://github.com/the-vishal-kumar/nodejs-typescript-rest-boilerplate) (this repo)
- **Fastify + PostgreSQL**: [fastify-postgres-boilerplate](https://github.com/the-vishal-kumar/fastify-postgres-boilerplate)
- **Go + PostgreSQL**: [go-postgres-boilerplate](https://github.com/the-vishal-kumar/go-postgres-boilerplate)

Every number below was measured, not estimated, by [`conformance/load/bench.sh`](../conformance/load/bench.sh) and rendered by [`compare.sh`](../conformance/load/compare.sh) from the raw results in [`docs/bench/`](./bench).

## How it was measured

- **Machine:** Intel Core i7-8550U (4 cores, 8 threads), 10.9 GiB RAM, Linux, Docker 29.9.3. All three runs on 2026-11-13, one stack at a time, between 00:59 and 01:13 UTC, with no other stack under load.
- **Limits** ([`compose.bench.yaml`](../compose.bench.yaml), identical in each repo): API container 2 CPUs and 512 MiB; database container 2 CPUs and 1 GiB. Rate limits lifted, log level `warn`.
- **Load** ([`loan-flow.js`](../conformance/load/loan-flow.js), k6 1.8.2): 20 virtual users, each running one customer journey after another: sign in, request a loan, list loans, get the loan, admin approval, repay the first instalment. 100 customers created up front.
- **Runs:** 30 s warm-up, then three measured runs of 60 s. Each figure is the median of the three runs.
- **Memory:** resident set size of every process in the API container (`docker top`), at rest after start-up and the peak sampled every second under load.
- **Cold start:** from `docker compose start` of the stopped API container to the first `200` from `/health/ready`, median of three. It includes container start.
- **Lines of code:** `cloc` 2.10 over TypeScript, Go and SQL in each service's source and migration directories, excluding tests and the shared contract.
- **Dependencies:** direct runtime dependencies; total is every production package in `package-lock.json` for Node, and every non-standard-library module compiled into the binary for Go.

## Results

| Measure | Express + MongoDB | Fastify + PostgreSQL | Go + PostgreSQL |
|---|---:|---:|---:|
| Throughput (requests/s) | 125.6 | 172.5 | 182.5 |
| Journeys/s (6 requests each) | 20.7 | 28.5 | 30.2 |
| Error rate | 0 % | 0 % | 0 % |
| Sign-in p50 / p99 (ms) | 214 / 406 | 595 / 777 | 172 / 478 |
| Request loan p50 / p99 (ms) | 117 / 227 | 6.3 / 69 | 85.4 / 211 |
| List loans p50 / p99 (ms) | 117 / 235 | 3.5 / 63.5 | 78.9 / 206 |
| Get loan p50 / p99 (ms) | 110 / 213 | 2.6 / 62.6 | 74.7 / 205 |
| Approve p50 / p99 (ms) | 109 / 223 | 5.4 / 68.2 | 83.3 / 210 |
| Repayment p50 / p99 (ms) | 189 / 311 | 6.9 / 71.4 | 89.3 / 239 |
| RSS at rest (MiB) | 82.1 | 77.7 | 12.6 |
| RSS under load, peak (MiB) | 245.1 | 256.0 | 338.6 |
| Image size (MB) | 469.7 | 371.5 | 37.5 |
| Cold start to ready (ms) | 814 | 1285 | 958 |
| Lines of code, excluding tests | 1513 | 1055 | 2157 |
| Runtime dependencies, direct / total | 12 / 298 | 6 / 69 | 3 / 8 |

Throughput is HTTP requests per second across the whole mix; each journey is six requests. No request failed in any run. Throughput varied by less than 5 % between the three runs of every stack.

## Reading the numbers

**Password hashing sets the ceiling.** Sign-in runs scrypt (N=16384, r=8, p=1), the same parameters in all three. On 2 CPUs, Fastify and Go complete 28.5 and 30.2 journeys per second, so both sit near the rate at which those 2 CPUs can hash passwords. The other endpoints are cheap by comparison.

**Fastify is fastest on everything except sign-in.** Its other endpoints answer in 2.6 to 6.9 ms at the median. Node runs scrypt on the libuv thread pool (4 threads), off the event loop, so cheap requests are not held up by hashing; instead the sign-ins queue for the pool. By Little's law (journeys per second times sign-in latency), about 17 of the 20 users are waiting on sign-in at any moment, which is why its sign-in median (595 ms) is the worst of the three. The queue moved; the total work did not.

**Go loses on cheap-request latency and on peak memory, and the reason is the same.** Go hashes every concurrent sign-in at once, each on its own goroutine, sharing the 2 CPUs with every other request. The scheduler time-slices fairly, so a quick query waits behind hashing work: 74.7 to 89.3 ms medians for the cheap endpoints. Each scrypt hash with these parameters needs 16 MiB (128 x r x N bytes), so 20 simultaneous hashes need over 300 MiB, which matches the 339 MiB peak; Node caps concurrent hashes at its pool size of 4. Bounding concurrent hashing in Go with a small semaphore would cut both numbers; it is not done here so the three implementations stay like for like.

**Express is the only stack not limited by hashing.** It reaches 20.7 sign-ins per second, below the 28.5 and 30.2 the other two reach on the same CPUs, and its cheapest requests take 109 to 117 ms at the median. The API container is spending its CPU somewhere other than scrypt. We have not profiled it; the visible differences are two database round trips per authenticated request (session, then user) against one join in the PostgreSQL versions, Mongoose document hydration, and response compression. That profile is the next piece of work, and until it is done this stack is the slowest of the three under this mix.

**Footprint favours Go by an order of magnitude.** A 37.5 MB distroless image against 372 to 470 MB for the Node images, and 12.6 MiB resident at rest against 78 to 82 MiB. Go also has the fewest dependencies (3 direct, 8 modules in total) against 69 and 298 packages.

**Cold start did not favour Go on this machine.** All three become ready in 0.8 to 1.3 s, and container start dominates. Express was quickest (814 ms), Fastify slowest (1285 ms); we did not break these times down further.

**Go needs the most code.** 2157 lines against 1055 for Fastify and 1513 for Express: validation, JWTs, rate limiting and middleware are written out by hand instead of coming from libraries. Fastify is the smallest because Zod, Fastify's hooks and SQL without an ORM leave little glue.

## Design compared

| | Express + MongoDB | Fastify + PostgreSQL | Go + PostgreSQL |
|---|---|---|---|
| Repayment concurrency | A lease on the loan claimed with a conditional update (`paymentLockedUntil`); the schedule is read after the claim, the lease is released after the writes and expires after 30 s if a process dies. A concurrent payment gets **409**. | One transaction with `SELECT ... FOR UPDATE` on the loan row. A concurrent payment **waits** and then applies to the updated schedule. | Same as Fastify: one transaction, row lock, concurrent payments applied in sequence. |
| Transactions and consistency | No multi-document transactions on a standalone MongoDB. Loan and schedule are written in order with a compensating delete on failure; approval and payment use conditional updates. | Loan and schedule are inserted in one transaction; password reset updates the hash and ends sessions atomically; foreign keys and check constraints guard the data. | Same guarantees as Fastify, through `pgx` transactions and batches. |
| Schema and migrations | Mongoose schemas in code; indexes built by Mongoose at start-up; no migration step. Money as `Decimal128`. | SQL files applied by a one-shot `migrate` container under an advisory lock. Money `bigint` cents, statuses as enum types, unique index on `lower(email)`. | The same SQL file, embedded in the binary and applied by `api migrate`. |
| Validation | Joi schemas; conversion and messages built in; no static types for handlers. | Zod schemas giving typed handler input; a small layer translates Zod issues into the contract's messages. | Hand-written decoding and checks; amounts decoded with `UseNumber` and parsed to cents with `math/big`, so no float is involved. |
| Typing and compile-time safety | TypeScript, but Mongoose documents and `toObject()` results are loosely typed; validated bodies are `any` to handlers. | TypeScript strict mode with `noUncheckedIndexedAccess`; validated input is typed by Zod; SQL rows are typed by hand. | Go's static types end to end in handlers and domain; SQL strings are checked only by the integration tests. |
| Developer ergonomics | The most familiar stack; one-line middleware for most concerns; Jest drives the app in-process with supertest. | Fastify's hooks and `inject()` make in-process tests fast; ESM plus TypeScript needs `.js` import suffixes. | No framework to learn; everything is explicit, which also means more code to read; `go test -race` and a fast compiler. |
| Operational footprint | Node runtime image; MongoDB. Optional New Relic agent. | Node runtime image (npm, npx, corepack and yarn removed); PostgreSQL. | One static binary on `distroless/static`, no shell; PostgreSQL. |

## When to choose each

- **Express + MongoDB** when the team already runs MongoDB and Express, the documents really are documents, and a rich middleware ecosystem matters more than raw latency. Budget for a profile before a high-traffic launch, and be explicit about consistency: without transactions, invariants live in application code.
- **Fastify + PostgreSQL** for a TypeScript team that wants relational guarantees, typed input and the best latency of the three on ordinary endpoints, with a small codebase. Watch the libuv thread pool if the service does heavy crypto or compression: it is the queue that fills first.
- **Go + PostgreSQL** when footprint and operations dominate: many small replicas, tight memory, minimal images and dependencies, or a team that values explicit code over frameworks. Bound CPU-heavy work (here, password hashing) explicitly, or it will compete with every other request.

## Reproduce

In each repo, with Docker, curl and jq on the host:

```bash
make bench   # writes .cache/bench/result.json
```

Then, from this repo, with the three result files copied into `docs/bench/`:

```bash
bash conformance/load/compare.sh docs/bench/express-mongodb.json docs/bench/fastify-postgresql.json docs/bench/go-postgresql.json
```

Run the three on the same machine on the same day, one stack at a time, and record the machine as above. Numbers from another machine are not comparable with these.
