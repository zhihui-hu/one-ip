import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CompactText } from "@/components/compact-text";
import { CountryFlag } from "@/components/country-flag";
import { LookupForm } from "@/components/lookup-form";
import { NumberTicker } from "@/components/number-ticker";
import { ErrorNotice, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { t, locale } from "@/i18n";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  runPing,
  getPingNodes,
  type PingResponse,
  type PingInput,
} from "./api";
import { PingResults } from "./components/ping-results";
import { selectPingPresets } from "./presets";

const regionBatchSize = 40;
const regionNames = new Intl.DisplayNames([locale], { type: "region" });

const regions = [
  { id: "AS", name: t("ping.asia") },
  { id: "EU", name: t("ping.europe") },
  { id: "NA", name: t("ping.northAmerica") },
  { id: "SA", name: t("ping.southAmerica") },
  { id: "AF", name: t("ping.africa") },
  { id: "OC", name: t("ping.oceania") },
];
export default function PingPage() {
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState("world");
  const [fullCoverage, setFullCoverage] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(regionBatchSize);
  const regionList = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<PingResponse>();
  const [stopped, setStopped] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    document.title = t("ping.globalPingIpTools");
    return () => controller.current?.abort();
  }, []);
  const catalog = useQuery({
    queryKey: ["ping-node-catalog-v3"],
    queryFn: ({ signal }) => getPingNodes(signal),
    staleTime: 300_000,
    retry: false,
  });
  const nodes = useMemo(() => catalog.data ?? [], [catalog.data]);
  const shown = useMemo(
    () =>
      open
        ? nodes.filter((node) =>
            `${regionNames.of(node.cc.toUpperCase())} ${node.city} ${node.cc}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
          )
        : [],
    [nodes, open, search],
  );
  const { chinaNodes, availableNodes, presetNodes } = selectPingPresets(
    nodes,
    scope,
    fullCoverage,
  );
  const planned = scope === "custom" ? selected.length : presetNodes.length;
  const query = useMutation({
    mutationFn: async (input: PingInput) => {
      controller.current?.abort();
      controller.current = new AbortController();
      return runPing(input, controller.current.signal, setProgress);
    },
    retry: false,
  });
  const data = progress ?? query.data;
  const done =
    data?.results.filter((item) =>
      ["finished", "failed"].includes(item.result.status),
    ).length ?? 0;
  return (
    <div>
      <div className="rounded-xl bg-card p-3">
        <LookupForm
          grouped
          value={params.get("host") ?? ""}
          placeholder={t("ping.enterAnIpAddressOrDomain")}
          label={t("ping.start")}
          busy={query.isPending || catalog.isPending}
          onSubmit={(host) => {
            setParams((current) => {
              const next = new URLSearchParams(current);
              next.set("host", host);
              return next;
            });
            setProgress(undefined);
            setStopped(false);
            query.reset();
            query.mutate({
              host,
              preferred: scope !== "custom" && !fullCoverage,
              nodes:
                scope === "custom"
                  ? selected
                  : presetNodes.map((node) => node.id),
            });
          }}
        />
      </div>
      <Card className="mt-3">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {[{ id: "world", name: t("ping.globalCheck") }, ...regions].map(
              (region) => (
                <Button
                  key={region.id}
                  size="sm"
                  variant={scope === region.id ? "secondary" : "ghost"}
                  disabled={query.isPending}
                  onClick={() => {
                    setScope(region.id);
                  }}
                >
                  {region.name}
                </Button>
              ),
            )}
            <Dialog
              open={open}
              onOpenChange={(value) => {
                setOpen(value);
                if (value) setVisibleCount(regionBatchSize);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant={scope === "custom" ? "secondary" : "ghost"}
                  disabled={query.isPending}
                >
                  {t("ping.customRegions")}
                  {selected.length ? ` (${selected.length})` : ""}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("ping.customProbeRegions")}</DialogTitle>
                  <DialogDescription>
                    {t("ping.searchCountryCityOneOnlineProbeSelectedPer")}
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder={t("ping.searchCountryCity")}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setVisibleCount(regionBatchSize);
                    regionList.current?.scrollTo({ top: 0 });
                  }}
                />
                <div className="flex items-center justify-between text-xs">
                  <span>
                    {t("ping.selected")}
                    {selected.length}
                    {t("ping.regions")}
                  </span>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelected((previous) =>
                          [
                            ...new Set([
                              ...previous,
                              ...shown.map((node) => node.id),
                            ]),
                          ].slice(0, 50),
                        )
                      }
                    >
                      {t("ping.addSearchResultsUpTo50")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected([])}
                    >
                      {t("ping.clear")}
                    </Button>
                  </div>
                </div>
                <ErrorNotice error={catalog.error} />
                {catalog.isPending ? (
                  <Pending>{t("ping.loadingOnlineRegions")}</Pending>
                ) : (
                  <div
                    ref={regionList}
                    className="grid max-h-80 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2"
                    onScroll={(event) => {
                      const list = event.currentTarget;
                      if (
                        list.scrollHeight - list.scrollTop - list.clientHeight <
                        100
                      )
                        setVisibleCount((count) =>
                          Math.min(count + regionBatchSize, shown.length),
                        );
                    }}
                  >
                    {shown.slice(0, visibleCount).map((node) => (
                      <label
                        key={node.id}
                        className="flex min-w-0 items-center gap-2 text-xs"
                      >
                        <Checkbox
                          checked={selected.includes(node.id)}
                          disabled={
                            !selected.includes(node.id) && selected.length >= 50
                          }
                          onCheckedChange={(checked) =>
                            setSelected((previous) =>
                              checked
                                ? [...new Set([...previous, node.id])].slice(
                                    0,
                                    50,
                                  )
                                : previous.filter((id) => id !== node.id),
                            )
                          }
                        />
                        <CountryFlag code={node.cc} />
                        <CompactText
                          text={`${regionNames.of(node.cc.toUpperCase())} · ${node.city}`}
                        />
                      </label>
                    ))}
                    {!shown.length && (
                      <p className="col-span-full py-4 text-center text-muted-foreground">
                        {t("ping.noMatchingRegions")}
                      </p>
                    )}
                    {visibleCount < shown.length && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="col-span-full"
                        onClick={() =>
                          setVisibleCount((count) =>
                            Math.min(count + regionBatchSize, shown.length),
                          )
                        }
                      >
                        {t("ping.loadMoreShowing")}
                        {Math.min(visibleCount, shown.length)} / {shown.length}
                        ）
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  disabled={!selected.length}
                  onClick={() => {
                    setScope("custom");
                    setOpen(false);
                  }}
                >
                  {t("ping.useSelectedRegions")}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {scope === "custom"
                ? t("ping.selected50Cities", [selected.length])
                : t("ping.probeRegionsEstimatedUsageProbeCredits", [
                    fullCoverage
                      ? t("ping.fullCoverage")
                      : t("ping.optimizedMode"),
                    planned,
                    planned,
                  ])}
            </span>
            {planned > 50 && (
              <span>
                {t("ping.in")}
                {Math.ceil(planned / 50)}
                {t("ping.batches")}
              </span>
            )}
          </div>
          {scope !== "custom" && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  size="sm"
                  variant={fullCoverage ? "ghost" : "secondary"}
                  disabled={query.isPending}
                  onClick={() => setFullCoverage(false)}
                >
                  {t("ping.optimizedMode")}
                </Button>
                <Button
                  size="sm"
                  variant={fullCoverage ? "secondary" : "ghost"}
                  disabled={query.isPending}
                  onClick={() => setFullCoverage(true)}
                >
                  {t("ping.fullCoverageLabel")}
                  {availableNodes.length}
                  {t("ping.regionsLabel")}
                </Button>
              </div>
              <ErrorNotice error={catalog.error} />
              {catalog.isPending ? (
                <Pending>{t("ping.loadingPresets")}</Pending>
              ) : (
                <div className="space-y-2">
                  {regions
                    .filter(
                      (region) =>
                        scope === "world" ||
                        region.id === scope ||
                        (!fullCoverage && region.id === "AS"),
                    )
                    .map((region) => {
                      const items = presetNodes.filter(
                        (node) => node.continent === region.id,
                      );
                      return items.length ? (
                        <details key={region.id} className="text-xs">
                          <summary className="cursor-pointer py-1 text-muted-foreground">
                            {region.name} · {items.length}
                            {t("ping.probeRegions")}
                          </summary>
                          <div className="flex max-h-40 flex-wrap gap-1 overflow-auto pt-2">
                            {items.map((node) => (
                              <Badge key={node.id} variant="secondary">
                                <CountryFlag code={node.cc} />
                                <CompactText
                                  text={`${regionNames.of(node.cc.toUpperCase())} · ${node.city}${!fullCoverage && node.preferredNetwork ? ` · ${node.preferredNetwork}` : ""}`}
                                />
                              </Badge>
                            ))}
                          </div>
                        </details>
                      ) : null;
                    })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t(
                  "ping.optimizedModePrioritizes2MainlandChinaCitiesComparison",
                )}
                {chinaNodes.length < 2 &&
                  t("ping.onlyMainlandChinaCitiesAreCurrentlyOnline", [
                    chinaNodes.length,
                  ])}
              </p>
            </>
          )}
          {scope === "custom" && (
            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
              {selected.map((id) => (
                <Badge variant="secondary" key={id}>
                  {id}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {!query.isIdle && (
        <>
          <div className="my-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {data?.reusedAt
                ? t("ping.reusingMeasurementResultsFrom", [
                    new Date(data.reusedAt).toLocaleTimeString(locale),
                  ])
                : stopped
                  ? t("ping.stopped")
                  : query.isPending
                    ? t("common.testing")
                    : query.isError
                      ? t("ping.someMeasurementsAreIncomplete")
                      : t("ping.measurementComplete")}{" "}
              · <NumberTicker value={done} />
              {t("ping.nodesReturnedAverageLatencyHighestFirstMissingValues")}
            </span>
            {query.isPending && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setStopped(true);
                  controller.current?.abort();
                }}
              >
                {t("common.stopTesting")}
              </Button>
            )}
          </div>
          {!stopped && <ErrorNotice error={query.error} />}
          <PingResults data={data} pending={query.isPending} />
        </>
      )}
    </div>
  );
}
