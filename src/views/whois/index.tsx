import { useSearchParams } from "react-router-dom";
import { LookupFaq } from "@/components/lookup-faq";
import { LookupForm } from "@/components/lookup-form";
import {
  PageHeading,
  ToolCard,
  Facts,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLookupHistory } from "@/hooks/use-lookup-history";
import { t, locale } from "@/i18n";
import { localizeApiMessage } from "@/i18n/api-message";
import { useQuery } from "@tanstack/react-query";
import type { Registration } from "./api";
import { lookupWhois } from "./api";

export default function WhoisPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const history = useLookupHistory<Registration>("ip-tools:whois-history:v1");
  const cached = history.find(q);
  const query = useQuery({
    queryKey: ["whois", q],
    enabled: !!q,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const result = await lookupWhois(q, signal);
      history.save(q, result);
      return result;
    },
    retry: false,
  });
  const data = query.data?.data;
  const lookup = (value: string) => {
    if (value === q) {
      if (!query.isFetching) void query.refetch();
      return;
    }
    const next = new URLSearchParams(params);
    next.set("q", value);
    setParams(next);
  };
  return (
    <div className="lookup-page">
      <div className="lookup-search-card">
        <PageHeading title={t("common.whoisLookup")} />
        <LookupForm
          grouped
          value={q}
          placeholder={t("whois.enterADomainIpAddressOrAsNumber")}
          busy={query.isFetching}
          onSubmit={lookup}
        />
      </div>
      <Card className="mt-3">
        <CardContent>
          <div className="examples lookup-history">
            <span>
              {history.entries.length
                ? t("common.recentLookups")
                : t("common.suggestedLookups")}
            </span>
            {(history.entries.length
              ? history.entries.map((entry) => entry.query)
              : ["qq.com", "1.1.1.1", "AS15169"]
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
            <p className="small muted">
              {t("common.savedResult")}{" "}
              {new Date(cached.savedAt).toLocaleString(locale)}
              {t("common.runTheLookupToUpdate")}
            </p>
          )}
        </CardContent>
      </Card>
      <ErrorNotice error={query.error} />
      {query.isFetching && (
        <p className="status-line">
          <Pending>{t("whois.queryingTheRegistry")}</Pending>
        </p>
      )}
      {data && (
        <div className="lookup-results">
          <h2 className="whois-result-name">
            {data.ldhName ?? data.name ?? q}
          </h2>
          <div className="whois-grid">
            <ToolCard title={t("whois.basicInformation")}>
              <Facts
                rows={[
                  [
                    t("whois.queryProtocol"),
                    query.data?.source
                      ? localizeApiMessage(query.data.source)
                      : undefined,
                  ],
                  [t("whois.objectType"), data.objectClassName],
                  [t("whois.identifier"), data.handle],
                  [t("common.countryRegion"), data.country],
                  ...(data.startAddress
                    ? [
                        [
                          t("whois.addressRange"),
                          `${data.startAddress} – ${data.endAddress}`,
                        ] as [string, string],
                      ]
                    : []),
                ]}
              />
            </ToolCard>
            {data.events?.length ? (
              <ToolCard title={t("whois.registrationDates")}>
                <Facts
                  rows={data.events.map((event) => [
                    event.eventAction,
                    new Date(event.eventDate).toLocaleString(locale),
                  ])}
                />
              </ToolCard>
            ) : null}
            {data.status?.length ? (
              <ToolCard title={t("whois.domainStatus")}>
                <div className="whois-tags">
                  {data.status.map((status) => (
                    <Badge variant="secondary" key={status}>
                      {status}
                    </Badge>
                  ))}
                </div>
              </ToolCard>
            ) : null}
            {data.nameservers?.length ? (
              <ToolCard title={t("whois.nameServers")}>
                <div className="whois-tags">
                  {data.nameservers.map((server, index) => (
                    <Badge variant="secondary" key={index}>
                      {server.ldhName}
                    </Badge>
                  ))}
                </div>
              </ToolCard>
            ) : null}
            {data.entities?.map((entity, index) => (
              <ToolCard
                key={index}
                title={
                  entity.roles?.join(" / ") ?? t("whois.registeredEntities")
                }
              >
                <Facts
                  rows={[
                    [
                      t("whois.identifier"),
                      entity.handle ?? t("whois.privacyProtection"),
                    ],
                  ]}
                />
              </ToolCard>
            ))}
          </div>
          <details className="raw-details">
            <summary>{t("whois.viewRawRdapData")}</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
      <LookupFaq
        items={[
          {
            title: t("whois.whatCanILookUp"),
            text: t("whois.faq.supportedQueriesAnswer"),
          },
          {
            title: t("whois.whatIsTheDifferenceBetweenWhoisAndRdap"),
            text: t("whois.faq.rdapAnswer"),
          },
          {
            title: t("whois.whyDidTheLookupFailOrReturnNothing"),
            text: t("whois.faq.lookupFailureAnswer"),
          },
          {
            title: t("whois.whyIsRegistrantOrCountryInformationMissing"),
            text: t("whois.faq.missingFieldsAnswer"),
          },
          {
            title: t("whois.whatDoDomainStatusAndNameServersMean"),
            text: t("whois.faq.registrationStatusAnswer"),
          },
          {
            title: t("whois.doRecentLookupsUpdateAutomatically"),
            text: t("whois.faq.lookupHistoryAnswer"),
          },
        ]}
      />
    </div>
  );
}
