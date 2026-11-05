import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CopyButton } from "@/components/copy-button";
import { LookupForm } from "@/components/lookup-form";
import { PageHeading, ErrorNotice, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnderlineHover } from "@/components/underline-hover";
import { useLookupHistory } from "@/hooks/use-lookup-history";
import { t, locale } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { lookupSubdomains, type SubdomainsResult } from "./api";

const pageSize = 20;

export default function SubdomainsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [pagination, setPagination] = useState({ query: q, page: 0 });
  const setPage = (page: number) => setPagination({ query: q, page });
  const history = useLookupHistory<SubdomainsResult>(
    "ip-tools:subdomains-history:v1",
  );
  const cached = history.find(q);
  const query = useQuery({
    queryKey: ["subdomains", q],
    enabled: Boolean(q),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    queryFn: async ({ signal }) => {
      const result = await lookupSubdomains(q, signal);
      history.save(q, result);
      return result;
    },
    staleTime: Infinity,
    retry: false,
  });
  const data = query.data;
  const total = data?.names.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(
    pagination.query === q ? pagination.page : 0,
    pageCount - 1,
  );
  const start = currentPage * pageSize;
  const end = Math.min(start + pageSize, total);
  const lookup = (value: string) => {
    setPage(0);
    if (value === q) {
      if (!query.isFetching) void query.refetch();
      return;
    }
    const next = new URLSearchParams(params);
    next.set("q", value);
    setParams(next);
  };
  return (
    <div className="text-[13px] leading-relaxed">
      <div className="rounded-xl bg-card p-3">
        <PageHeading title={t("common.subdomainLookup")} />
        <LookupForm
          grouped
          value={q}
          placeholder={t("subdomains.enterADomainEGExampleCom")}
          busy={query.isFetching}
          onSubmit={lookup}
        />
      </div>
      <Card className="mt-3">
        <CardContent>
          <div className="mt-2 flex flex-wrap items-center gap-1 text-[0.8rem] text-subtle">
            <span>
              {history.entries.length
                ? t("common.recentLookups")
                : t("common.suggestedLookups")}
            </span>
            {(history.entries.length
              ? history.entries.map((entry) => entry.query)
              : ["example.com", "douyin.com", "baidu.com"]
            ).map((value) => (
              <Badge key={value} variant="secondary" asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-md px-2 py-1 h-auto hover:bg-accent"
                  onClick={() => lookup(value)}
                >
                  {value}
                </button>
              </Badge>
            ))}
          </div>
          {cached && (
            <p className="text-[0.78rem] text-muted-foreground">
              {t("common.savedResult")}{" "}
              {new Date(cached.savedAt).toLocaleString(locale)}
              {t("common.runTheLookupToUpdate")}
            </p>
          )}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t("subdomains.coverageNotice")}
      </p>
      <ErrorNotice error={query.error} />
      {query.isFetching && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          <Pending>{t("subdomains.querying")}</Pending>
        </p>
      )}
      {data && (
        <Card className="mt-3">
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="break-all font-medium">{data.domain}</h2>
                <Badge variant="secondary">
                  {t("subdomains.records", [total])}
                </Badge>
              </div>
              {data.names.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs">{t("subdomains.copyAll")}</span>
                  <CopyButton value={data.names.join("\n")} />
                </div>
              )}
            </div>
            <p className="text-[0.78rem] text-muted-foreground">
              {new Date(data.checkedAt).toLocaleString(locale)} ·{" "}
              <UnderlineHover asChild>
                <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                  {data.source} ↗
                </a>
              </UnderlineHover>
              {data.limit && (
                <> · {t("subdomains.sourceLimit", [data.limit])}</>
              )}
            </p>
            {data.names.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-foreground">
                {t("subdomains.empty")}
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border">
                <Table
                  className="table-fixed text-[13px]"
                  aria-label={t("common.subdomainLookup")}
                >
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead scope="col" className="w-14 text-center">
                        {t("subdomains.no")}
                      </TableHead>
                      <TableHead scope="col">
                        {t("subdomains.subdomain")}
                      </TableHead>
                      <TableHead scope="col" className="w-12 text-center">
                        {t("common.copy")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.names.slice(start, end).map((name, index) => (
                      <TableRow key={name}>
                        <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                          {start + index + 1}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <code className="break-all text-[13px]">{name}</code>
                        </TableCell>
                        <TableCell className="p-1 text-center">
                          <CopyButton value={name} className="size-9" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {total > 0 && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p
                  className="text-xs tabular-nums text-muted-foreground"
                  role="status"
                >
                  {t("subdomains.showingOf", [start + 1, end, total])}
                </p>
                <nav
                  aria-label={t("subdomains.resultsPagination")}
                  className="flex items-center justify-between gap-1 sm:justify-end"
                >
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-9 shrink-0"
                    aria-label={t("subdomains.firstPage")}
                    disabled={currentPage === 0}
                    onClick={() => setPage(0)}
                  >
                    <ChevronsLeft aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-9 shrink-0 px-2 sm:w-auto"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft className="sm:hidden" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">
                      {t("subdomains.previousPage")}
                    </span>
                  </Button>
                  <span
                    className="px-1 text-xs whitespace-nowrap tabular-nums"
                    aria-label={t("subdomains.pageOf", [
                      currentPage + 1,
                      pageCount,
                    ])}
                  >
                    {currentPage + 1} / {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-9 shrink-0 px-2 sm:w-auto"
                    disabled={currentPage === pageCount - 1}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight className="sm:hidden" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">
                      {t("subdomains.nextPage")}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-9 shrink-0"
                    aria-label={t("subdomains.lastPage")}
                    disabled={currentPage === pageCount - 1}
                    onClick={() => setPage(pageCount - 1)}
                  >
                    <ChevronsRight aria-hidden="true" />
                  </Button>
                </nav>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
