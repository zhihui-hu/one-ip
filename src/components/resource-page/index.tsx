import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshButton, StatusFilter } from "@/components/list-controls";
import { TablePagination } from "@/components/table-pagination";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DialogActionButton } from "@/components/ui/dialog-action-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SweepShine } from "@/components/ui/sweep-shine";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useLocalAtom } from "@/hooks/use-local-atom";
import { ApiError } from "@/lib/http";
import type { RecordRow, ResourceConfig } from "@/views/dashboard/admin/types";
import { can, type User } from "@/views/login/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Ellipsis } from "lucide-react";
import { Plus, Search, Pencil, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { formatCell, labels } from "./format-cell";
import { ResourceEditor } from "../resource-editor";

const emptyRows: RecordRow[] = [];
export function ResourcePage({
  config,
  user,
}: {
  config: ResourceConfig;
  user: User;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useLocalAtom("all");
  const [editing, setEditing] = useLocalAtom<RecordRow | "new" | null>(null);
  const [deleting, setDeleting] = useLocalAtom<RecordRow | null>(null);
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0
      ? Math.min(rawPage, 1_000_000)
      : 1;
  const q = params.get("q") ?? "";
  const [pageSize, setPageSize] = useLocalAtom(10);
  const writable = Boolean(
    config.writePermission &&
    can(user, config.writePermission) &&
    (!config.writeSuperOnly || user.permissions.includes("*")),
  );
  const query = useQuery({
    queryKey: [config.key, page, pageSize, q],
    queryFn: ({ signal }) =>
      config.api.list({ page, page_size: pageSize, q }, signal),
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["session"] });
    void queryClient.invalidateQueries({ queryKey: [config.key] });
    void queryClient.invalidateQueries({ queryKey: ["options"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const remove = useMutation({
    mutationFn: (id: number | string) => config.api.remove!(id),
    onSuccess: () => {
      setDeleting(null);
      toast.success("删除成功");
      if (query.data?.items.length === 1 && page > 1) updatePage(page - 1);
      refresh();
    },
  });
  const resetRemove = remove.reset;
  const columns = useMemo<ColumnDef<RecordRow>[]>(
    () => [
      ...config.columns.map((column) => ({
        accessorKey: column.key,
        header: column.label,
        cell: (context: {
          getValue: () => unknown;
          row: { original: RecordRow };
        }) => {
          const row = context.row.original;
          if (config.key === "users" && column.key === "name")
            return (
              <div className="flex min-w-52 items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage
                    src={
                      typeof row.picture === "string" ? row.picture : undefined
                    }
                    alt={String(row.name ?? "")}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {String(row.name || row.email || "U")
                      .slice(0, 1)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {String(row.name || "用户")}
                    </span>
                    {String(row.id) === String(user.id) && (
                      <Badge variant="secondary">当前身份</Badge>
                    )}
                  </div>
                  {typeof row.preferred_username === "string" && (
                    <p className="truncate text-xs text-muted-foreground">
                      @{row.preferred_username}
                    </p>
                  )}
                </div>
              </div>
            );
          if (config.key === "users" && column.key === "status")
            return (
              <div className="flex items-center gap-2">
                <Switch
                  size="sm"
                  aria-label={`${row.name} 启用状态`}
                  checked={row.status === "active"}
                  disabled={!writable || String(row.id) === String(user.id)}
                  onCheckedChange={(enabled) =>
                    setEditing({
                      ...row,
                      status: enabled ? "active" : "disabled",
                    })
                  }
                />
                <Badge variant="outline">
                  {row.status === "active" ? "有效" : "停用"}
                </Badge>
              </div>
            );
          return formatCell(column.key, context.getValue());
        },
      })),
      ...(writable && config.api.save
        ? [
            {
              id: "actions",
              header: "操作",
              cell: ({ row }: { row: { original: RecordRow } }) => (
                <div className="flex items-center gap-1">
                  {row.original.is_system ? (
                    <Badge variant="outline">系统保护</Badge>
                  ) : (
                    <>
                      {config.key === "users" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="用户操作"
                            >
                              <Ellipsis />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => setEditing(row.original)}
                            >
                              编辑用户 / 分配角色
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(row.original)}
                        >
                          <Pencil className="size-3.5" />
                          编辑
                        </Button>
                      )}
                      {config.api.remove &&
                        (config.canRemove?.(row.original) ?? true) &&
                        (!config.deleteSuperOnly ||
                          user.permissions.includes("*")) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              resetRemove();
                              setDeleting(row.original);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            删除
                          </Button>
                        )}
                    </>
                  )}
                </div>
              ),
            },
          ]
        : []),
    ],
    [
      config,
      writable,
      user.permissions,
      user.id,
      resetRemove,
      setDeleting,
      setEditing,
    ],
  );
  const filteredRows = useMemo(
    () =>
      (query.data?.items ?? emptyRows).filter(
        (row) => status === "all" || String(row.status) === status,
      ),
    [query.data, status],
  );
  // oxlint-disable-next-line react/incompatible-library -- TanStack v8 owns a mutable table instance; keep this call outside compiler memoization.
  const table = useReactTable({
    getCoreRowModel: getCoreRowModel(),
    data: filteredRows,
    columns,
    getRowId: (row) => String(row.id),
  });
  const updatePage = (next: number) => {
    const search = new URLSearchParams(params);
    search.set("page", String(next));
    setParams(search);
  };
  return (
    <section className="commercial-list flex min-h-0 flex-1 flex-col bg-background">
      <header className="sr-only">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {config.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {config.description}
          </p>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <StatusFilter
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "本页全部" },
            ...(config.key === "users"
              ? [
                  { value: "active", label: "启用" },
                  { value: "disabled", label: "停用" },
                ]
              : Array.from(
                  new Set(
                    (query.data?.items ?? []).map((row) => String(row.status)),
                  ),
                ).map((value) => ({ value, label: labels[value] ?? value }))),
          ]}
        />
        <form
          className="flex min-w-0 flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const search = new URLSearchParams(params);
            const value = String(
              new FormData(event.currentTarget).get("q") ?? "",
            ).trim();
            if (value) search.set("q", value);
            else search.delete("q");
            search.delete("page");
            setParams(search);
          }}
        >
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              key={q}
              className="w-full pl-9 sm:w-72"
              name="q"
              maxLength={200}
              aria-label="搜索名称或关键字"
              placeholder="搜索名称或关键字…"
              defaultValue={q}
            />
          </div>
          <Button variant="outline" type="submit">
            搜索
          </Button>
        </form>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {writable && config.api.save && (
            <Button onClick={() => setEditing("new")}>
              <Plus />
              新增
            </Button>
          )}
          <RefreshButton
            disabled={query.isFetching}
            refresh={() => query.refetch()}
          />
        </div>
      </div>
      <div className="commercial-table min-h-0 overflow-auto">
        {query.isPending ? (
          <div
            className="flex items-center justify-center gap-2 py-24 text-muted-foreground"
            role="status"
          >
            <SweepShine>正在加载{config.title}…</SweepShine>
          </div>
        ) : query.isError ? (
          <div className="space-y-4 px-4 py-16 text-center" role="alert">
            <p className="text-destructive">{query.error.message}</p>
            {query.error instanceof ApiError && query.error.status === 401 ? (
              <Button asChild>
                <a href="/login">重新登录</a>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void query.refetch()}>
                重试
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="h-10 whitespace-nowrap px-4"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="h-12 whitespace-nowrap px-4"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-64 text-center"
                  >
                    <Inbox className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      {q ? "没有符合条件的记录" : "暂无记录"}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      {query.data && (
        <TablePagination
          total={query.data.total}
          page={page}
          pageSize={pageSize}
          onPageChange={updatePage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            updatePage(1);
          }}
          disabled={query.isFetching}
        />
      )}
      {editing && writable && config.api.save && (
        <ResourceEditor
          key={editing === "new" ? "new" : editing.id}
          config={config}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleting(null);
        }}
      >
        <DialogContent showCloseButton={!remove.isPending}>
          <DialogHeader>
            <DialogTitle>删除记录</DialogTitle>
            <DialogDescription>
              确定删除“{String(deleting?.name ?? deleting?.id ?? "")}
              ”？删除后无法撤销。
            </DialogDescription>
          </DialogHeader>
          {remove.isError && (
            <p role="alert" className="text-sm text-destructive">
              {remove.error.message}
            </p>
          )}
          <DialogFooter>
            <DialogActionButton
              action="cancel"
              variant="outline"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              取消
            </DialogActionButton>
            <DialogActionButton
              action="confirm"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              <SweepShine active={remove.isPending}>
                {remove.isPending ? "删除中…" : "确认删除"}
              </SweepShine>
            </DialogActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
