const inFlightUrls = new Set();
self.addEventListener("message", ({ data }) => {
  if (
    data?.type !== "check" ||
    typeof data.url !== "string" ||
    typeof data.build !== "string"
  )
    return;
  void check(data);
});
async function check(message) {
  if (inFlightUrls.has(message.url)) return;
  inFlightUrls.add(message.url);
  try {
    const url = new URL(message.url);
    url.searchParams.set("t", Date.now().toString());
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(`Update check failed with HTTP ${response.status}`);
    const version = await response.json();
    if (typeof version.build !== "string" || !version.build)
      throw new Error("Invalid build version");
    self.postMessage({
      type: version.build === message.build ? "unchanged" : "changed",
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    inFlightUrls.delete(message.url);
  }
}
