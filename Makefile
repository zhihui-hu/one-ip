.DEFAULT_GOAL := help

include make/config.mk
include make/version.mk
include make/app.mk
include make/deploy.mk

.PHONY: help
help:
	@printf '%s\n' 'make dev             启动 SPA 开发环境' 'make worker-dev      启动 Vite 5137 + Worker 8787（统一入口）' 'make build           类型检查与生产构建' 'make test            运行接口和内容边界测试' 'make deploy          更新版本并部署生产环境' 'make deploy-stage    更新版本并部署测试环境' 'make update-version  按上海时间更新版本'
