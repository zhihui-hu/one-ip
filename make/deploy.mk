.PHONY: deploy
deploy: update-version
	$(PNPM) build
	$(PNPM) exec wrangler deploy --env=""
