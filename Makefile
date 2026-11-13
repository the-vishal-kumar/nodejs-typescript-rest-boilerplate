# Every target runs in containers; only Docker is needed on the host.
NODE_IMAGE := node:22.23.4-bookworm-slim
DOCKER_NODE := docker run --rm -u $$(id -u):$$(id -g) -e HOME=/tmp -v "$$PWD":/src -w /src $(NODE_IMAGE)
export UID := $(shell id -u)
export GID := $(shell id -g)

.PHONY: help install lint typecheck build test contract conformance up down image scan bench

help: ## List targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

install: ## npm ci
	$(DOCKER_NODE) npm ci --no-audit --no-fund --ignore-scripts

lint: install ## Prettier check and ESLint
	$(DOCKER_NODE) sh -c 'npm run pretty:check && npm run lint'

typecheck: install ## tsc --noEmit
	$(DOCKER_NODE) npm run typecheck

build: install ## Compile TypeScript to build/
	$(DOCKER_NODE) npm run build

test: ## Unit and e2e tests with coverage against a throwaway MongoDB
	docker compose -f compose.test.yaml run --rm tests; status=$$?; \
	docker compose -f compose.test.yaml down -v --remove-orphans; exit $$status

contract: install ## Export the OpenAPI document to contract/openapi.json
	$(DOCKER_NODE) npm run contract

# The suite needs admin sign-up on, and TRUST_PROXY=1 so each simulated client
# (its own X-Forwarded-For) gets its own rate-limit bucket.
conformance: ## Start a fresh stack and run the shared conformance suite against it
	mkdir -p .cache
	sed -e 's/^TRUST_PROXY=.*/TRUST_PROXY=1/' -e 's/^ADMIN_SIGNUP_ENABLED=.*/ADMIN_SIGNUP_ENABLED=true/' \
	  .env.sample > .cache/conformance.env
	ENV_FILE=.cache/conformance.env docker compose up --build -d --wait --wait-timeout 180; status=$$?; \
	if [ $$status -eq 0 ]; then \
	  docker run --rm --network host -v "$$PWD":/suite:ro -w /suite -e BASE_URL=http://localhost:3000 \
	    $(NODE_IMAGE) node --test 'conformance/*.test.mjs'; status=$$?; \
	fi; \
	ENV_FILE=.cache/conformance.env docker compose down -v --remove-orphans; exit $$status

up: ## Start API and MongoDB on http://localhost:3000 (docs at /docs)
	test -f .env || cp .env.sample .env
	docker compose up --build -d --wait

down: ## Stop the local stack
	docker compose down --remove-orphans

image: ## Build the production image
	docker build -t ntrb-api:local .

scan: image ## Scan the image for fixable HIGH/CRITICAL CVEs with Trivy
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.70.0 \
	  image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 ntrb-api:local

# Same CPU and memory limits for every implementation: compose.bench.yaml.
bench: ## Measure this stack with the shared k6 load (results in .cache/bench)
	mkdir -p .cache
	cp .env.sample .cache/bench.env
	ENV_FILE=.cache/bench.env NAME=express-mongodb LOC_DIRS=src bash conformance/load/bench.sh
