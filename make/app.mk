.PHONY: dev worker-dev build test
dev:
	$(PNPM) dev
worker-dev:
	$(PNPM) run worker:dev
build:
	$(PNPM) build
test:
	$(PNPM) test
