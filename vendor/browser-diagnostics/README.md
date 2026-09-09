# Local browser diagnostics

This adapter is based on selected MIT-licensed CreepJS modules from
https://github.com/abrahamjuliot/creepjs at commit
`10aa6724cd33a1015db1574211890518cd04f0cc`.

`upstream/` contains an unmodified, pinned dependency closure of the Navigator,
Canvas, Audio, WebGL, fonts, DOMRect, screen, timezone, headless and prototype-lie
collectors. `upstream.json` records SHA-256 hashes for provenance. The upstream
MIT license is in `LICENSE` and distributed alongside the browser bundle.

`entry.ts` is this project's adapter, not the official app. It omits the official
UI, remote prediction/ratings, WebRTC and Worker probes. It drops Worker-dependent
headless flags and aggregate ratings rather than treating unrun checks as passes.
Collectors run on click in a fresh, same-origin offscreen iframe with outbound
connections blocked by CSP; completion, cancellation and timeout remove it.
The iframe context may differ from the main page and the official deployment.

Regenerate the checked-in browser bundle with `pnpm browser:build`.
Rollup and TypeScript preserve the upstream runtime probes, including deliberate
constant-assignment errors used for TypeError detection. Do not rewrite these
probes for lint compliance. The generated file and pinned upstream are excluded
from first-party formatting/linting.

The public UI uses the distinct name “浏览器深度检测”; CreepJS is mentioned only
as attribution and is not used as the site's product identity. This is not an
official deployment or a complete clone of the upstream application.
