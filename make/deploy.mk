.PHONY: deploy deploy-stage
deploy: update-version
	$(PNPM) build
	$(PNPM) exec wrangler deploy --env=""
deploy-stage: update-version
	$(PNPM) run build:stage
	$(PNPM) exec wrangler deploy --env stage
