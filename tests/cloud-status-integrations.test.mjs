import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../.worker-test/index.js";
import {
  parseAliyun,
  parseTencentBanner,
  parseTencentProducts,
  tencentRegions,
  parseAzure,
  getCloudStatus,
  parseBandwagon,
} from "../public/worker/cloud-status.js";

const ali = (data) => ({ success: true, code: 200, data });
const tx = (Data) => ({ Response: { Data } });
const region = { RegionId: "ap-seoul", RegionName: "Seoul", EventsIn: true };
const azure = (rows) =>
  `<table data-zone-name="current-impact"><tbody>${rows}</tbody></table>`;
const healthyAzure =
  '<tr class="current-incident"><td class="bg-green"><span>There are currently no active events. Use <a href="https://portal.azure.com/">Azure Service Health</a></span></td></tr>';

test("Alibaba current events exclude resolved history and preserve source severity", () => {
  const incident = {
    id: 35,
    title: "Network issue",
    eventType: "ALARM",
    startTime: 1785214500000,
    endTime: null,
    lastUpdateTime: 1785230829000,
  };
  assert.equal(parseAliyun(ali([])).status.indicator, "none");
  assert.equal(
    parseAliyun(ali([{ ...incident, endTime: 1785230700000 }])).incidents
      .length,
    0,
  );
  const result = parseAliyun(ali([incident]));
  assert.equal(result.status.indicator, "major");
  assert.equal(
    result.incidents[0].updated_at,
    new Date(incident.lastUpdateTime).toISOString(),
  );
  assert.equal(
    parseAliyun(ali([{ ...incident, eventType: "NOTIFICATION" }])).status
      .indicator,
    "minor",
  );
  for (const data of [{}, { success: false, code: 200, data: [] }, ali([{}])])
    assert.throws(() => parseAliyun(data));
});

test("Tencent excludes hidden and resolved notices, and does not infer status from historical events", () => {
  const banner = { Id: 47, Desc: "Restored", Status: "NORMAL", IsShow: false };
  assert.deepEqual(parseTencentBanner(tx(banner)), []);
  assert.deepEqual(parseTencentBanner(tx({ ...banner, IsShow: true })), []);
  assert.deepEqual(
    parseTencentBanner(tx({ ...banner, Status: "ABNORMAL" })),
    [],
  );
  assert.equal(
    parseTencentBanner(tx({ ...banner, IsShow: true, Status: "ABNORMAL" }))[0]
      .status,
    "ABNORMAL",
  );
  const product = {
    ProductId: "cvm",
    ProductName: "CVM",
    CurrentStatus: "NORMAL",
    EventListGroupByZoneAndDate: [{ Status: "ABNORMAL" }],
  };
  assert.deepEqual(
    parseTencentProducts(
      tx({ CategoryList: [{ ProductList: [product] }] }),
      region,
    ),
    [],
  );
  assert.equal(
    parseTencentProducts(
      tx({
        CategoryList: [
          { ProductList: [{ ...product, CurrentStatus: "NOTIFY" }] },
        ],
      }),
      region,
    )[0].status,
    "NOTIFY",
  );
  assert.throws(() => tencentRegions(tx({ AreaDetailList: [] })));
  assert.throws(() =>
    tencentRegions(
      tx({
        AreaDetailList: [{ RegionList: [{ ...region, EventsIn: undefined }] }],
      }),
    ),
  );
  assert.throws(() =>
    parseTencentProducts(
      { Response: { Error: { Code: "Unavailable" } } },
      region,
    ),
  );
});

test("Tencent fetches current product state for flagged regions and rejects incomplete queries", async (t) => {
  let fail = false;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.includes("DescribeRegions"))
      return Response.json(tx({ AreaDetailList: [{ RegionList: [region] }] }));
    if (url.includes("DescribeHappening"))
      return Response.json(tx({ IsShow: false, Status: "NORMAL" }));
    assert.match(url, /DescribeProductEventForRegionInPeriod/);
    assert.equal(new URL(url).searchParams.get("RegionId"), "ap-seoul");
    return fail
      ? new Response("unavailable", { status: 503 })
      : Response.json(
          tx({
            CategoryList: [
              {
                ProductList: [
                  {
                    ProductId: "cvm",
                    ProductName: "CVM",
                    CurrentStatus: "ABNORMAL",
                  },
                ],
              },
            ],
          }),
        );
  });
  const service = {
    id: "tencent-cloud",
    url: "https://status.tencentcloud.com/v1/api/status/DescribeRegions?BelongSite=1",
  };
  assert.equal((await getCloudStatus(service)).status.indicator, "major");
  fail = true;
  await assert.rejects(getCloudStatus(service));
});

test("Azure scopes current impact and never interprets empty or changed HTML as healthy", () => {
  assert.equal(
    parseAzure(azure(healthyAzure) + "<h2>Historical outage</h2>").status
      .indicator,
    "none",
  );
  const issue =
    '<tr class="current-incident"><td class="bg-red"><h3>Network &amp; storage</h3><p>Investigating</p></td></tr>';
  const result = parseAzure(azure(issue));
  assert.equal(result.incidents.length, 1);
  assert.equal(result.status.indicator, "major");
  assert.match(result.incidents[0].name, /Network & storage/);
  assert.equal(result.incidents[0].updated_at, undefined);
  for (const html of [
    "<html>Challenge</html>",
    azure(""),
    '<table data-zone-name="history">' + healthyAzure + "</table>",
  ])
    assert.throws(() => parseAzure(html));
});

test("all three integrated Worker routes return normalized healthy status", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.includes("status.aliyun.com")) return Response.json(ali([]));
    if (url.includes("DescribeRegions"))
      return Response.json(
        tx({
          AreaDetailList: [{ RegionList: [{ ...region, EventsIn: false }] }],
        }),
      );
    if (url.includes("DescribeHappening"))
      return Response.json(tx({ IsShow: false, Status: "NORMAL" }));
    assert.equal(url, "https://azure.status.microsoft/en-us/status/");
    return new Response(azure(healthyAzure));
  });
  for (const id of ["aliyun", "tencent-cloud", "azure"]) {
    const response = await worker.fetch(
      new Request(`https://example.com/api/status/${id}`),
      {},
    );
    assert.equal(response.status, 200, id);
    assert.equal((await response.json()).status.indicator, "none", id);
  }
});

test("Bandwagon reports no incidents only when the official page explicitly says so", () => {
  const page =
    '<title>BandwagonHost Status</title><h1>All systems operational</h1><span class="summary summary-ok">Operational</span>';
  assert.equal(parseBandwagon(page).incidents, undefined);
  assert.deepEqual(
    parseBandwagon(
      page + '<p class="empty">No incidents in the last 5 days.</p>',
    ).incidents,
    [],
  );
});
