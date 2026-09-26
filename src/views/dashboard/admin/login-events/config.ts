import * as api from "./api";
import type { ResourceConfig } from "../types";

export const config: ResourceConfig = {
  key: "login-events",
  title: "登录日志",
  description: "仅保留最近 7 天；过期记录由 PostgreSQL 函数自动清理。",
  permission: "logs:read",
  columns: [
    { key: "name", label: "用户" },
    {
      key: "subject",
      label: "用户名",
    },
    {
      key: "status",
      label: "结果",
    },
    {
      key: "reason",
      label: "说明",
    },
    {
      key: "created_at",
      label: "时间",
    },
  ],
  api: { list: api.listLoginLogs },
};
