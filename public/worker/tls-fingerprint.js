/** Read only Cloudflare's trusted metadata on the incoming browser request. */
export function tlsFingerprint(request) {
  const cf = request.cf;
  const text = (value) =>
    typeof value === "string" && value.length > 0 ? value : null;
  return {
    source: "cloudflare",
    ja3: text(cf?.botManagement?.ja3Hash),
    ja4: text(cf?.botManagement?.ja4),
    tlsVersion: text(cf?.tlsVersion),
    tlsCipher: text(cf?.tlsCipher),
  };
}
