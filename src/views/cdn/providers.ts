import { t } from "@/i18n";

export const providers = [
  {
    name: "Cloudflare",
    url: "https://www.cloudflare.com/cdn-cgi/trace",
    trace: true,
  },
  {
    name: t("Cloudflare 中国网络"),
    url: "https://perfops.cloudflareperf.com/cdn-cgi/trace",
    trace: true,
  },
  {
    name: "Fastly",
    url: "https://fastly.jsdelivr.net/npm/react@18/umd/react.production.min.js",
    headers: ["x-served-by"],
  },
  {
    name: "jsDelivr",
    url: "https://cdn.jsdelivr.net/npm/latency-test@1.0.0/generate_200",
    headers: ["x-served-by", "cf-ray", "x-id"],
  },
  {
    name: "AWS CloudFront",
    url: "https://djlzvy5xcvhxt.cloudfront.net/500b-bench.jpg",
    headers: ["x-amz-cf-pop"],
  },
  {
    name: "GCP Anycast LB",
    url: "https://global.gcping.com/api/ping",
    text: true,
  },
  {
    name: "Akamai",
    url: "https://perfopsrum.akamaized.net/500b-bench.jpg",
    headers: ["x-cache2"],
  },
  {
    name: "Akamai Edge IP Binding",
    url: "https://perfopsrum-eip.akamaized.net/500b-bench.jpg",
    headers: ["x-cache2"],
  },
  {
    name: "Bunny Standard",
    url: "https://test.b-cdn.net",
    headers: ["server"],
  },
  {
    name: "Bunny Volume",
    url: "https://testvideo.b-cdn.net",
    headers: ["server"],
  },
  {
    name: "CDN77",
    url: "https://1596384882.rsc.cdn77.org/500b-bench.jpg",
    headers: ["x-77-pop"],
  },
  {
    name: "Tencent EdgeOne Static",
    url: "https://eo-static-perfops2.qcloudcdn.com/500b-bench.jpg",
    headers: ["xcc"],
  },
  {
    name: "CacheFly",
    url: "https://cdnperf.cachefly.net/500b-bench.jpg",
    headers: ["x-cf1"],
  },
  {
    name: "Medianova",
    url: "https://medianova-cdnvperf.mncdn.com/500b-bench.jpg",
    headers: ["x-edge-location"],
  },
  {
    name: "Zenlayer",
    url: "https://test-perfops.ecn.zenlayer.net/500b-bench.jpg",
    headers: ["via"],
  },
  {
    name: "Melbicom",
    url: "https://perfops.swiftycdn.net/500b-sw-bench.jpg",
    headers: ["x-swifty-node"],
  },
  {
    name: t("网易"),
    url: "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png",
    headers: ["cdn-source", "cdn-ip"],
  },
  {
    name: t("字节跳动"),
    url: "https://perfops.byte-test.com/500b-bench.jpg",
    headers: ["via"],
  },
  {
    name: t("字节跳动 海外"),
    url: "https://perfops2.byte-test.com/500b-bench.jpg",
    headers: ["via"],
  },
  {
    name: t("网宿 QUANTIL"),
    url: "https://cdnperf-rum.quantil.com/500b-bench.jpg",
    headers: ["via", "x-via"],
  },
  {
    name: t("网宿 CDNetworks"),
    url: "https://cdnperf-rum.cdnetworks.net/500b-bench.jpg",
    headers: ["via", "x-via"],
  },
];

export function providerWebsite(name: string) {
  if (name.startsWith("Cloudflare")) return "https://cloudflare.com";
  if (name.startsWith("Akamai")) return "https://akamai.com";
  if (name.startsWith("Bunny")) return "https://bunny.net";
  if (name.startsWith(t("字节"))) return "https://bytedance.com";
  const domains: Record<string, string> = {
    Fastly: "fastly.com",
    jsDelivr: "jsdelivr.com",
    "AWS CloudFront": "aws.amazon.com",
    "GCP Anycast LB": "cloud.google.com",
    CDN77: "cdn77.com",
    "Tencent EdgeOne Static": "edgeone.ai",
    CacheFly: "cachefly.com",
    Medianova: "medianova.com",
    Zenlayer: "zenlayer.com",
    Melbicom: "melbicom.net",
    [t("网易")]: "163.com",
    [t("网宿 QUANTIL")]: "quantil.com",
    [t("网宿 CDNetworks")]: "cdnetworks.com",
  };
  return `https://${domains[name]}`;
}
