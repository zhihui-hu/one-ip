import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";
import * as queryKeyModule from "../src/lib/query-keys.ts";

const { outputText } = ts.transpileModule(
  readFileSync("src/views/home/index.tsx", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
);
function render(primary, split, client = {}, capture = () => {}) {
  const batches = [[], primary];
  const require = (name) => {
    if (name === "react/jsx-runtime") return jsx;
    if (name === "react")
      return { useEffect() {}, useState: () => [false, () => {}] };
    if (name === "@/i18n") return { t: (text) => text };
    if (name === "@/hooks/use-mobile") return { useIsMobile: () => false };
    if (name === "@/hooks/use-sort-animation")
      return { useSortAnimation: () => null };
    if (name === "@/components/connectivity") return { homeTargets: [] };
    if (name === "@/lib/query-keys") return queryKeyModule;
    if (name === "./sites.json") return [{ name: "Example" }];
    if (name === "@tanstack/react-query")
      return {
        useQueryClient: () => client,
        useQueries: ({ queries }) =>
          batches.shift() ?? queries.map(() => ({ isPending: false })),
      };
    return new Proxy({}, { get: (_, key) => key });
  };
  const exports = {};
  new Function("require", "exports", outputText)(require, exports);
  const tree = exports.HomePage();
  capture(tree);
  return JSON.stringify(tree);
}
const failed = { isPending: false, isError: true };
const ipv4 = { ip: "192.0.2.1" };
const ipv6 = { ip: "2001:db8::1" };

test("domestic egress comes first and external IPv4 remains separate", () => {
  const proxy = { ip: "192.0.2.2" };
  const result = render(
    [{ data: ipv4 }, { data: proxy }, failed],
    [{ data: ipv6 }, { data: { ip: "192.0.2.3" } }],
  );
  assert.ok(result.indexOf(ipv4.ip) < result.indexOf(proxy.ip));
  assert.ok(result.includes("IPv4 · 国内探测"));
  assert.ok(result.includes("IPv4 · 外部探测"));
  assert.ok(!result.includes(ipv6.ip));
  assert.ok(!result.includes("192.0.2.3"));
});
test("matching domestic and external IPv4 produces one card", () => {
  let tree;
  render([{ data: ipv4 }, { data: ipv4 }, failed], [], {}, (value) => {
    tree = value;
  });
  assert.equal(tree.props.children[1].props.children[0].length, 1);
});
test("failed domestic probe never promotes a proxy or routed IPv6 to local egress", () => {
  const result = render([failed, { data: ipv4 }, failed], [{ data: ipv6 }]);
  assert.ok(!result.includes("未获取到 IPv"));
  assert.ok(result.includes("IPv4 · 外部探测"));
  assert.ok(!result.includes(ipv6.ip));
});
test("IPv6 and failed probes do not create overview cards", () => {
  const result = render([{ data: ipv4 }, failed, { data: ipv6 }], []);
  assert.ok(!result.includes("IPv6 · 外部探测"));
  assert.ok(!result.includes(ipv6.ip));
});

test("home retest cancels previous runs before resetting only home query families", async () => {
  const calls = [];
  const client = {
    cancelQueries: async (filters) => {
      assert.ok(
        filters.predicate({
          queryKey: ["connectivity", "https://example.com", 0],
        }),
      );
      assert.ok(filters.predicate({ queryKey: ["split", "Example"] }));
      assert.ok(!filters.predicate({ queryKey: ["whois", "example.com"] }));
      calls.push("cancel");
    },
    resetQueries: async () => {
      calls.push("reset");
    },
  };
  let refresh;
  render([failed, failed, failed], [], client, (tree) => {
    refresh = tree.props.children[0].props.children[1].props.onClick;
  });
  await refresh();
  assert.deepEqual(calls, ["cancel", "reset"]);
});
