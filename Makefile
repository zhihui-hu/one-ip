.DEFAULT_GOAL := help

include make/config.mk
include make/version.mk
include make/app.mk
include make/deploy.mk

.PHONY: help
help:
	@printf '%s\n' 'make dev             启动 Vite 27529（API 代理到 Rust 27528）' 'make worker-dev      启动开源版 Vite + Worker' 'make build           类型检查与生产构建' 'make test            运行商业版测试（无需 Wrangler）' 'make deploy          通过 Rust 后端部署商业版' 'make update-version  按上海时间更新版本'
