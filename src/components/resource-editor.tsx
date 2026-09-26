import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DialogActionButton } from "@/components/ui/dialog-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SweepShine } from "@/components/ui/sweep-shine";
import { Textarea } from "@/components/ui/textarea";
import { useLocalAtom } from "@/hooks/use-local-atom";
import { listPermissions } from "@/views/dashboard/admin/permissions/api";
import { PermissionPicker } from "@/views/dashboard/admin/permissions/components/permission-picker";
import { listRoles } from "@/views/dashboard/admin/roles/api";
import type { RecordRow, ResourceConfig } from "@/views/dashboard/admin/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";

async function loadOptions(kind: "roles" | "permissions", signal: AbortSignal) {
  const list = kind === "roles" ? listRoles : listPermissions;
  const result: RecordRow[] = [];
  for (let page = 1; ; page++) {
    const data = await list({ page, page_size: 100, q: "" }, signal);
    result.push(...data.items);
    if (!data.items.length || result.length >= data.total) return result;
  }
}
export function ResourceEditor({
  config,
  row,
  onClose,
  onSaved,
}: {
  config: ResourceConfig;
  row: RecordRow | "new";
  onClose: () => void;
  onSaved: () => void;
}) {
  const creating = row === "new";
  const fields = (config.fields ?? []).filter((field) =>
    creating ? !field.editOnly : !field.createOnly,
  );
  const defaults = Object.fromEntries(
    fields.map((field) => [
      field.name,
      !creating
        ? (row[field.name] ?? (field.type === "multiple" ? [] : ""))
        : field.type === "multiple"
          ? []
          : field.type === "select"
            ? (field.options?.[0]?.value ?? "")
            : "",
    ]),
  );
  const { register, handleSubmit, control } = useForm<Record<string, unknown>>({
    defaultValues: defaults,
  });
  const watched = useWatch({ control });
  const [filter, setFilter] = useLocalAtom("");
  const lookup = fields.find((field) => field.lookup)?.lookup;
  const options = useQuery({
    queryKey: ["options", lookup],
    queryFn: ({ signal }) => loadOptions(lookup!, signal),
    enabled: Boolean(lookup),
  });
  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      config.api.save!(creating ? undefined : row.id, values),
    onSuccess: () => {
      toast.success("保存成功");
      onSaved();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!mutation.isPending}
        className="max-h-[90svh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>
            {creating ? "新增" : "编辑"}
            {config.title.replace("管理", "")}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <fieldset disabled={mutation.isPending} className="space-y-5">
            {fields
              .filter(
                (field) =>
                  !field.showWhen ||
                  field.showWhen.values.includes(
                    String(watched[field.showWhen.field]),
                  ),
              )
              .map((field) => {
                const id = `field-${field.name}`;
                return (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.type === "multiple" ? undefined : id}>
                      {field.label}
                      {field.required && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    {field.type === "multiple" ? (
                      <Controller
                        control={control}
                        name={field.name}
                        render={({ field: input }) => {
                          const selected = (input.value || []) as number[];
                          if (
                            field.lookup === "permissions" &&
                            options.isSuccess
                          )
                            return (
                              <PermissionPicker
                                items={options.data}
                                selected={selected}
                                onChange={input.onChange}
                              />
                            );
                          return (
                            <div className="rounded-lg border">
                              <div className="relative border-b p-2">
                                <Search className="absolute left-4 top-4 size-4 text-muted-foreground" />
                                <Input
                                  className="h-8 border-0 pl-8 shadow-none"
                                  placeholder={`搜索${field.label}`}
                                  aria-label={`搜索${field.label}`}
                                  value={filter}
                                  onChange={(event) =>
                                    setFilter(event.target.value)
                                  }
                                />
                              </div>
                              <div className="max-h-52 space-y-1 overflow-auto p-2">
                                {options.isPending ? (
                                  <p
                                    role="status"
                                    className="p-3 text-muted-foreground"
                                  >
                                    <SweepShine>正在加载…</SweepShine>
                                  </p>
                                ) : options.isError ? (
                                  <div
                                    role="alert"
                                    className="p-3 text-destructive"
                                  >
                                    {options.error.message}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="ml-2"
                                      onClick={() => void options.refetch()}
                                    >
                                      重试
                                    </Button>
                                  </div>
                                ) : options.data?.length === 0 ? (
                                  <p className="p-3 text-muted-foreground">
                                    暂无可分配项
                                  </p>
                                ) : (
                                  options.data
                                    ?.filter((option) =>
                                      `${option.name} ${option.code}`
                                        .toLowerCase()
                                        .includes(filter.toLowerCase()),
                                    )
                                    .map((option) => (
                                      <label
                                        key={option.id}
                                        className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted"
                                      >
                                        <Checkbox
                                          checked={selected.includes(
                                            Number(option.id),
                                          )}
                                          onCheckedChange={(checked) =>
                                            input.onChange(
                                              checked === true
                                                ? [
                                                    ...selected,
                                                    Number(option.id),
                                                  ]
                                                : selected.filter(
                                                    (id) =>
                                                      id !== Number(option.id),
                                                  ),
                                            )
                                          }
                                        />
                                        <span className="space-y-0.5 text-sm leading-none">
                                          <span className="block">
                                            {String(option.name)}
                                          </span>
                                          <span className="block pt-1 font-mono text-xs text-muted-foreground">
                                            {String(option.code)}
                                          </span>
                                        </span>
                                      </label>
                                    ))
                                )}
                              </div>
                              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                                已选择 {selected.length} 项
                              </p>
                            </div>
                          );
                        }}
                      />
                    ) : field.type === "select" ? (
                      <Controller
                        control={control}
                        name={field.name}
                        render={({ field: input }) => (
                          <Select
                            value={String(input.value)}
                            onValueChange={input.onChange}
                          >
                            <SelectTrigger id={id} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    ) : field.type === "textarea" ? (
                      <Textarea
                        id={id}
                        {...register(field.name)}
                        required={field.required}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={id}
                        {...register(field.name, {
                          valueAsNumber: field.type === "number",
                        })}
                        type={field.type ?? "text"}
                        minLength={field.type === "password" ? 12 : undefined}
                        maxLength={field.type === "password" ? 128 : undefined}
                        required={field.required}
                        readOnly={!creating && field.readOnly?.(row)}
                        autoComplete={
                          field.type === "password" ? "new-password" : "off"
                        }
                      />
                    )}
                    {field.hint && (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {field.hint}
                      </p>
                    )}
                  </div>
                );
              })}
          </fieldset>
          {mutation.isError && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive"
            >
              {mutation.error.message}
            </p>
          )}
          <DialogFooter>
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
              disabled={
                mutation.isPending ||
                Boolean(lookup && (options.isPending || options.isError))
              }
            >
              <SweepShine active={mutation.isPending}>
                {mutation.isPending ? "保存中…" : "保存"}
              </SweepShine>
            </DialogActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
