.PHONY: deploy
deploy: update-version
	$(PNPM) exec node scripts/sync-worker-secrets.mjs production --check
	$(PNPM) build
	$(PNPM) exec wrangler deploy --env=""
	$(PNPM) exec node scripts/sync-worker-secrets.mjs production
