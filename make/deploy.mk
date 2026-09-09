.PHONY: deploy deploy-stage
deploy: update-version
	$(PNPM) exec node scripts/sync-worker-secrets.mjs production --check
	$(PNPM) build
	$(PNPM) exec wrangler deploy --env=""
	$(PNPM) exec node scripts/sync-worker-secrets.mjs production
deploy-stage: update-version
	$(PNPM) exec node scripts/sync-worker-secrets.mjs stage --check
	$(PNPM) run build:stage
	$(PNPM) exec wrangler deploy --env stage
	$(PNPM) exec node scripts/sync-worker-secrets.mjs stage
