import { Button } from "@/components/ui/button";
import { DialogActionButton } from "@/components/ui/dialog-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialogRoot as ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { SweepShine } from "@/components/ui/sweep-shine";
import { Textarea } from "@/components/ui/textarea";
import { useLocalAtom } from "@/hooks/use-local-atom";
import { listTree } from "@/views/dashboard/admin/permissions/api";
import { PermissionPicker } from "@/views/dashboard/admin/permissions/components/permission-picker";
import { saveRole, assignPermissions } from "@/views/dashboard/admin/roles/api";
import type { Role } from "@/views/dashboard/admin/roles/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export function RoleEditor({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(1, "请填写角色名称").max(64),
        code: z
          .string()
          .trim()
          .min(1, "请填写有效角色标识")
          .max(100)
          .regex(
            /^[a-z][a-z0-9_]*$/,
            "使用小写字母开头，只能包含小写字母、数字和下划线",
          ),
        description: z.string().trim().max(256),
      }),
    ),
    defaultValues: {
      name: role?.name ?? "",
      code: role?.code ?? "",
      description: role?.description ?? "",
    },
  });
  const [selected, setSelected] = useLocalAtom<Role["permission_ids"]>([]);
  const [permissionError, setPermissionError] = useLocalAtom(false);
  const permissions = useQuery({
    queryKey: ["permissions", "tree"],
    queryFn: ({ signal }) => listTree(signal),
    enabled: !role,
  });
  const mutation = useMutation({
    mutationFn: (values: { name: string; code: string; description: string }) =>
      saveRole(role?.id, {
        ...values,
        status: role?.status ?? "active",
        role_sort: role?.role_sort ?? 0,
        permission_ids: role?.permission_ids ?? selected,
      }),
    onSuccess: () => {
      toast.success("角色已保存");
      onSaved();
    },
  });
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <ResponsiveDialogContent
        className="max-h-[90svh] sm:max-w-2xl"
        showCloseButton={!mutation.isPending}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {role ? "编辑角色" : "新增角色"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {role
              ? "更新角色基本信息；权限范围在配置权限中维护。"
              : "设置角色基本信息并选择权限。"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => {
            if (!role && selected.length === 0) {
              setPermissionError(true);
              return;
            }
            mutation.mutate(values);
          })}
        >
          <ResponsiveDialogBody className="max-h-[65svh] space-y-4 overflow-y-auto">
            <fieldset disabled={mutation.isPending} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role-name">
                    角色名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role-name"
                    required
                    aria-invalid={Boolean(form.formState.errors.name)}
                    {...form.register("name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-code">
                    角色标识 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role-code"
                    required
                    aria-invalid={Boolean(form.formState.errors.code)}
                    {...form.register("code")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">备注</Label>
                <Textarea
                  id="role-description"
                  {...form.register("description")}
                />
              </div>
              {!role && (
                <div className="space-y-2">
                  <Label>
                    权限 <span className="text-destructive">*</span>
                  </Label>
                  {permissions.isPending ? (
                    <p role="status">
                      <SweepShine>加载权限中…</SweepShine>
                    </p>
                  ) : permissions.isError ? (
                    <div role="alert">
                      {permissions.error.message}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => permissions.refetch()}
                      >
                        重试
                      </Button>
                    </div>
                  ) : (
                    <PermissionPicker
                      items={permissions.data ?? []}
                      selected={selected}
                      onChange={(ids) => {
                        setSelected(ids);
                        setPermissionError(false);
                      }}
                    />
                  )}
                  {permissionError && (
                    <p role="alert" className="text-sm text-destructive">
                      请至少选择一项权限
                    </p>
                  )}
                </div>
              )}
            </fieldset>
            {Object.entries(form.formState.errors).map(([key, error]) => (
              <p key={key} role="alert" className="text-sm text-destructive">
                {error.message}
              </p>
            ))}
            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {mutation.error.message}
              </p>
            )}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              取消
            </DialogActionButton>
            <DialogActionButton
              action="confirm"
              type="submit"
              disabled={mutation.isPending}
              loading={mutation.isPending}
              loadingText="保存中…"
            >
              保存
            </DialogActionButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
export function RolePermissions({
  role,
  onClose,
  onSaved,
}: {
  role: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useLocalAtom(role.permission_ids);
  const permissions = useQuery({
    queryKey: ["permissions", "tree"],
    queryFn: ({ signal }) => listTree(signal),
  });
  const mutation = useMutation({
    mutationFn: () => assignPermissions(role.id, selected),
    onSuccess: () => {
      toast.success("角色权限已更新");
      onSaved();
    },
  });
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <ResponsiveDialogContent
        className="sm:max-w-2xl"
        showCloseButton={!mutation.isPending}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{role.name} · 配置权限</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {role.is_system
              ? "系统角色不可在此修改；超级管理员拥有 One IP 的全部权限。"
              : "使用权限树分配目录、菜单和按钮权限，支持父子联动。"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {permissions.isPending ? (
            <p role="status" className="py-8 text-center text-muted-foreground">
              <SweepShine>正在加载权限…</SweepShine>
            </p>
          ) : permissions.isError ? (
            <div role="alert" className="text-sm text-destructive">
              {permissions.error.message}
              <Button
                variant="outline"
                onClick={() => void permissions.refetch()}
              >
                重试
              </Button>
            </div>
          ) : (
            <fieldset disabled={role.is_system || mutation.isPending}>
              <PermissionPicker
                items={permissions.data}
                selected={
                  role.code === "super_admin"
                    ? permissions.data.map((item) => item.id)
                    : selected
                }
                onChange={setSelected}
              />
            </fieldset>
          )}
          {mutation.isError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <DialogActionButton
            action="cancel"
            variant="outline"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {role.is_system ? "关闭" : "取消"}
          </DialogActionButton>
          {!role.is_system && (
            <DialogActionButton
              action="confirm"
              disabled={
                permissions.isPending ||
                permissions.isError ||
                mutation.isPending
              }
              onClick={() => mutation.mutate()}
            >
              <SweepShine active={mutation.isPending}>
                {mutation.isPending ? "保存中…" : "保存权限"}
              </SweepShine>
            </DialogActionButton>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
