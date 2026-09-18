.PHONY: pages-build pages-deploy pages-dev
pages-build:
	$(PNPM) build:pages
pages-deploy:
	$(PNPM) deploy:pages
pages-dev:
	$(PNPM) pages:dev
