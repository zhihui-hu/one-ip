import * as api from "./api";
import type { ResourceConfig } from "../types";

export const config: ResourceConfig = {
  key: "users",
  title: "用户管理",
  description: "管理 One IP 本地账号和访问权限。",
  permission: "users:read",
  columns: [
    {
      key: "name",
      label: "用户",
    },
    {
      key: "email",
      label: "邮箱",
    },
    {
      key: "status",
      label: "状态",
    },
    {
      key: "roles",
      label: "角色",
    },
    {
      key: "last_login_at",
      label: "最近登录",
    },
  ],
  writePermission: "users:write",
  fields: [
    {
      name: "subject",
      label: "用户名",
      required: true,
      createOnly: true,
      hint: "3–64 位英文字母、数字、点、下划线或连字符。",
    },
    {
      name: "password",
      label: "密码",
      type: "password",
      required: true,
      createOnly: true,
      hint: "至少 12 个字符。",
    },
    {
      name: "password",
      label: "重设密码",
      type: "password",
      editOnly: true,
      hint: "留空则保持原密码；填写后会使该账号的现有会话失效。",
    },
    {
      name: "name",
      label: "姓名",
      required: true,
    },
    {
      name: "email",
      label: "邮箱",
      type: "email",
    },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        {
          value: "active",
          label: "启用",
        },
        {
          value: "disabled",
          label: "停用",
        },
      ],
    },
    {
      name: "role_ids",
      label: "角色",
      type: "multiple",
      lookup: "roles",
    },
  ],
  api: { list: api.listUsers, save: api.save },
};
