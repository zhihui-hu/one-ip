import getAudio from "./upstream/audio";
import getCanvas from "./upstream/canvas";
import getRects from "./upstream/domrect";
import { getCapturedErrors } from "./upstream/errors";
import getFonts from "./upstream/fonts";
import getHeadless from "./upstream/headless";
import { getLies, prototypeLies, PARENT_PHANTOM } from "./upstream/lies";
import getNavigator from "./upstream/navigator";
import getScreen from "./upstream/screen";
import getTimezone from "./upstream/timezone";
import getWebgl from "./upstream/webgl";

// Standalone local collector adapter. No official UI, prediction service or telemetry.
async function run() {
  const started = performance.now();
  const tasks = {
    navigator: () => getNavigator(undefined),
    canvas: getCanvas,
    audio: getAudio,
    webgl: getWebgl,
    fonts: getFonts,
    clientRects: getRects,
    screen: getScreen,
    timezone: getTimezone,
  };
  const entries = await Promise.all(
    Object.entries(tasks).map(async ([name, collect]) => {
      try {
        return [name, (await collect()) ?? null] as const;
      } catch {
        return [name, null] as const;
      }
    }),
  );
  const values = Object.fromEntries(entries);
  const headless = await getHeadless({
    webgl: values.webgl,
    workerScope: undefined,
  });
  // Worker probes are intentionally not included. Do not turn unrun checks into passes.
  if (headless) {
    delete headless.headless.hasHeadlessWorkerUA;
    delete headless.likeHeadless.hasSwiftShader;
    delete headless.stealth.hasBadWebGL;
    delete headless.headlessRating;
    delete headless.likeHeadlessRating;
    delete headless.stealthRating;
  }
  const result = {
    modules: {
      ...values,
      headless: headless ?? null,
      prototypeLies,
      lies: getLies(),
      errors: getCapturedErrors(),
    },
    duration: Math.round(performance.now() - started),
  };
  PARENT_PHANTOM?.remove();
  parent.postMessage(
    {
      type: "local-browser-diagnostics",
      result: JSON.parse(JSON.stringify(result)),
    },
    new URL(document.baseURI).origin,
  );
}
run().catch(() =>
  parent.postMessage(
    { type: "local-browser-diagnostics", error: "检测未完成，请重试。" },
    new URL(document.baseURI).origin,
  ),
);
