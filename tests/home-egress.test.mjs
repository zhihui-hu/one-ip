import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compile } from "./compile.mjs";
import * as jsx from "react/jsx-runtime";
import { t } from "../src/i18n/index.ts";

const outputText = compile(readFileSync("src/views/home/index.tsx", "utf8"), {
  format: "cjs",
  loader: "tsx",
});
function render(primary, split, client = {}, capture = () => {}) {
  const batches = [[], primary];
  const require = (name) => {
    if (name === "react/jsx-runtime") return jsx;
    if (name === "react") return { useEffect() {}, useState: () => [false, () => {}] };
    if (name === "@/i18n") return { t };
    if (name === "@/hooks/use-mobile") return { useIsMobile: () => false };
    if (name === "@/hooks/use-available-tools") return { useAvailableTools: () => [] };
    if (name === "@/layout/routes") return { toolGroups: { network: [], ai: [] } };
    if (name === "@/hooks/use-sort-animation") return { useSortAnimation: () => null };
    if (name === "@/components/connectivity") return { homeTargets: [] };
    if (name === "./sites.json") return [{ name: "Example" }];
    if (name === "@tanstack/react-query") return {
      useQueryClient: () => client,
      useQueries: ({ queries }) => batches.shift() ?? queries.map(() => ({ isPending: false })),
    };
    return new Proxy({}, { get: (_, key) => key });
  };
  const module = { exports: {} };
  new Function("require", "module", outputText)(require, module);
  const tree = module.exports.HomePage();
  capture(tree);
  return JSON.stringify(tree);
}
function findCards(node) {
  if (!node || typeof node !== "object") return;
  const children = node.props?.children;
  if (Array.isArray(children) && children.length && children.every((child) => child?.props && "label" in child.props))
    return children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const cards = findCards(child);
    if (cards) return cards;
  }
}
const failed = { isPending: false, isError: true };
const ipv4 = { ip: "192.0.2.1" };
const ipv6 = { ip: "2001:db8::1" };

test("domestic egress comes first and external IPv4 remains separate", () => {
  const proxy = { ip: "192.0.2.2" };
  const result = render([{ data: ipv4 }, { data: proxy }], [{ data: ipv6 }, { data: { ip: "192.0.2.3" } }]);
  assert.ok(result.indexOf(ipv4.ip) < result.indexOf(proxy.ip));
  assert.ok(result.includes(t("home.ipv4DomesticProbe")));
  assert.ok(result.includes(t("home.ipv4ExternalProbe")));
  assert.ok(!result.includes(ipv6.ip));
  assert.ok(!result.includes("192.0.2.3"));
});
test("matching domestic and external IPv4 keeps both probe cards", () => {
  let tree;
  render([{ data: ipv4 }, { data: ipv4 }], [], {}, (value) => { tree = value; });
  const cards = findCards(tree);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map((card) => card.props.label), [
    t("home.ipv4DomesticProbe"),
    t("home.ipv4ExternalProbe"),
  ]);
});
test("failed domestic probe never promotes a proxy or routed IPv6 to local egress", () => {
  const result = render([failed, { data: ipv4 }], [{ data: ipv6 }]);
  assert.ok(!result.includes(t("home.couldNotDetectIpv")));
  assert.ok(result.includes(t("home.ipv4ExternalProbe")));
  assert.ok(!result.includes(ipv6.ip));
});
test("failed external probe hides its card without inventing an address", () => {
  let tree;
  const result = render([{ data: ipv4 }, failed], [], {}, (value) => { tree = value; });
  const cards = findCards(tree);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].props.data, ipv4);
  assert.ok(!result.includes(t("home.ipv4ExternalProbe")));
  assert.ok(!result.includes(t("home.couldNotDetectIpv")));
});

test("home retest cancels previous runs before resetting only home query families", async () => {
  const calls = [];
  const client = {
    cancelQueries: async (filters) => {
      assert.ok(filters.predicate({ queryKey: ["connectivity", "https://example.com", 0] }));
      assert.ok(filters.predicate({ queryKey: ["split", "Example"] }));
      assert.ok(!filters.predicate({ queryKey: ["whois", "example.com"] }));
      calls.push("cancel");
    },
    resetQueries: async () => { calls.push("reset"); },
  };
  const findClick = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.props?.onClick === "function") return node.props.onClick;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const onClick = findClick(child);
      if (onClick) return onClick;
    }
  };
  let refresh;
  render([failed, failed], [], client, (tree) => {
    refresh = findClick(tree);
  });
  await refresh();
  assert.deepEqual(calls, ["cancel", "reset"]);
});
