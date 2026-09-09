const baselines = new Map();
const inFlightUrls = new Set();

self.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || message.type !== "check" || typeof message.url !== "string") {
    return;
  }

  void checkForUpdate(message);
});

async function checkForUpdate(message) {
  const url = normalizeUrl(message.url);
  if (!url || inFlightUrls.has(url)) {
    return;
  }

  inFlightUrls.add(url);

  try {
    const current = await readValidators(url);
    if (!current.etag && !current.lastModified) {
      postResult({
        type: "unavailable",
        url,
        source: message.source,
      });
      return;
    }

    const previous = baselines.get(url);
    if (!previous) {
      baselines.set(url, current);
      postResult({
        type: "baseline",
        url,
        source: message.source,
        current,
      });
      return;
    }

    if (isSameValidator(previous, current)) {
      postResult({
        type: "unchanged",
        url,
        source: message.source,
        current,
      });
      return;
    }

    postResult({
      type: "changed",
      url,
      source: message.source,
      previous,
      current,
    });
  } catch (error) {
    postResult({
      type: "error",
      url,
      source: message.source,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    inFlightUrls.delete(url);
  }
}

async function readValidators(url) {
  let response = await fetchDocument(url, "HEAD");

  if (response.status === 405 || response.status === 501) {
    response = await fetchDocument(url, "GET");
    await response.body?.cancel();
  }

  if (!response.ok && response.status !== 304) {
    throw new Error(`Update check failed with HTTP ${response.status}`);
  }

  return {
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
  };
}

function fetchDocument(url, method) {
  return fetch(url, {
    method,
    cache: "no-cache",
    credentials: "same-origin",
    redirect: "follow",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.searchParams.delete("t");
    return url.toString();
  } catch {
    return null;
  }
}

function isSameValidator(previous, current) {
  return (
    previous.etag === current.etag &&
    previous.lastModified === current.lastModified
  );
}

function postResult(message) {
  self.postMessage(message);
}
