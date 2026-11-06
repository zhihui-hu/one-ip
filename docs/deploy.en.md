# Deployment and configuration

[Back to README](../README.en.md) · [中文](deploy.md)

## Deploy to Cloudflare

1. [Fork this project](https://github.com/zhihui-hu/one-ip/fork) into your GitHub account.
2. Open the [Cloudflare dashboard](https://dash.cloudflare.com/), go to **Workers & Pages**, create a Worker and choose to import a Git repository.
3. Connect GitHub, select your `one-ip` fork and set the production branch to `main`.
4. Set the build command to `pnpm build` and the deploy command to `pnpm deploy`. Use Node.js 24 and pnpm 10.32.1. Keep the default root directory.
5. Deploy and open the assigned `workers.dev` address. Use the Worker settings to connect a custom domain.

The project uses **Cloudflare Workers with Static Assets**. The `/api/*` routes need a Worker. Core features require no application environment variables or API keys. See “Verification” for Turnstile setup.

For map access from mainland China, configure `TIANDITU_TOKEN` under Worker → Settings → Variables and Secrets (or run `pnpm exec wrangler secret put TIANDITU_TOKEN`). Maps prefer Tianditu and fall back to OpenStreetMap when unavailable; without the token, OpenStreetMap remains the default.

The default map requires no account or API key. OpenStreetMap's public tiles are subject to its [usage policy](https://operations.osmfoundation.org/policies/tiles/): keep attribution visible, load tiles on demand, respect browser caching, and do not offer offline downloads or bulk prefetching. Availability is not guaranteed. Tile requests send only this site's origin as the Referer, excluding page paths containing queried IPs. Failed maps can be retried independently while location text and coordinates remain available.

Workers Builds builds and deploys when `main` receives a commit. The button above points to the original repository. To preserve the fork relationship and update workflow, follow the steps to import your fork.

## Cloudflare Pages deployment

Pages reuses the existing API through [Advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/). The build creates `dist-pages/_worker.js` and `_routes.json`; only API and protected backend paths invoke the function. Use `dist-pages` for a complete Pages deployment.

For Git integration, create a Pages project with preset **None**, repository root as the root directory, build command `pnpm build:pages`, and output directory `dist-pages`. Set build variables `NODE_VERSION=24` and `PNPM_VERSION=10.32.1`. Set the Functions compatibility date to `2026-09-09` and add `nodejs_compat` for both production and preview. The root `wrangler.toml` is for Workers; Pages CLI configuration lives in `deploy/pages/wrangler.toml`.

For direct deployment:

```bash
pnpm install --frozen-lockfile
pnpm build:pages
pnpm exec wrangler login
# First deployment only; skip if the project already exists
pnpm exec wrangler pages project create one-ip --production-branch main
pnpm deploy:pages --branch main
```

Change the project name in `deploy/pages/wrangler.toml`. Configure optional secrets separately for production and preview in Pages, or use `pnpm exec wrangler pages secret put NAME --cwd deploy/pages`. To upload an existing `.secrets.production.env`, run `node scripts/sync-worker-secrets.mjs production --pages`. After building, use `pnpm pages:dev` for local preview; its secrets file is `deploy/pages/.dev.vars`.

## Docker deployment

The image includes the frontend and a standalone Node.js API server. The Compose configuration requires Docker Compose 2.24 or later. The multi-stage build copies only static assets, the bundled server and license into the runtime image, which runs as a non-root user.

```bash
# Optional map and verification settings; edit the file if it already exists
cp .env.docker.example .env.docker
docker compose up -d --build
```

Open `http://your-server:8080`. Override the host port with `PORT=8088 docker compose up -d --build`. To build and run manually:

```bash
docker build -t one-ip:local .
docker run -d --name one-ip --restart unless-stopped -p 8080:8080 --env-file .env.docker one-ip:local
```

Settings are read when the container starts and are never embedded in the frontend. Apply changes with `docker compose up -d --force-recreate`. The `/healthz` endpoint checks container health without an external provider. To run the same server without Docker, use `pnpm build:docker` followed by `pnpm start`.

Use an HTTPS reverse proxy in production; some browser diagnostics require a secure context. By default, the server uses the socket address and ignores client-supplied `CF-Connecting-IP` and forwarded identity. When using a proxy, list its immediate IP or dedicated CIDR in `.env.docker` as `TRUSTED_PROXIES`, comma-separated. For a proxy on the same host, bind locally with `BIND_ADDRESS=127.0.0.1 docker compose up -d --build`, then allow the proxy address actually seen by the container. Example Nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The proxy must overwrite forwarded headers. The server trusts only the rightmost client address supplied by an allowlisted proxy; resolve real client identity at the ingress for multi-proxy setups. If an allowlisted proxy omits `X-Forwarded-For`, the server logs `proxy_missing_client_ip` once.

Set `PUBLIC_ORIGIN` to the address visitors use, such as `https://ip.example.com`. Same-origin checks and challenge hostnames then use it instead of relying on `X-Forwarded-Proto`. It is required when the HTTPS proxy is not allowlisted; otherwise Ping and challenge POST requests fail the same-origin check.

When Docker sits behind the Cloudflare proxy, set `TRUST_CF_CONNECTING_IP=true` to read the visitor from `CF-Connecting-IP` relayed by an allowlisted proxy. The allowlist must contain [Cloudflare IP ranges](https://www.cloudflare.com/ips/) or a proxy that accepts only Cloudflare traffic; the header is discarded from any other source.

Docker geolocation uses public providers and does not present private socket addresses as public egress. Missing Cloudflare JA3/JA4/TLS metadata remains null. Docker replaces the Cloudflare edge cache with an in-process cache (1000 entries, 32 MB) that honours each endpoint's TTL and clears on restart.

Workers retains native rate limiting. Pages and Docker use per-instance memory limits: 180 ordinary requests/minute, a separate 180 icon requests/minute, and 5 POST requests/minute, counting each IPv6 /64 as one client. Counts reset on restart and are not shared across replicas. Pages spreads counts across many edge isolates, so the fallback is weak there; add a Cloudflare WAF rate limiting rule for `/api/*` when strict limits matter.

## Verification (optional)

Provide a Turnstile Site Key, Secret and allowed hostname. New Ping measurements require configured Turnstile (managed or Non-interactive), alongside the existing five-request-per-minute limit. Each batch uses a fresh token; the server validates its `ping_start` action, hostname and validity, and rejects measurements when verification is unconfigured. WebMCP calls also show the verification dialog.

| Provider  | Settings                                                        |
| --------- | --------------------------------------------------------------- |
| Turnstile | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `TURNSTILE_HOSTNAMES` |

For local development, copy the [configuration example](config/challenges.env.example) to `.dev.vars` in the project root, fill in your keys and restart. Edit the existing file if present. Use comma-separated hostnames such as `example.com`, and allow those hostnames in the provider's console.

For production, enter the settings under Worker → Settings → Variables and Secrets, or run `pnpm exec wrangler secret put NAME`. To use a configuration file, copy `.secrets.example` to `.secrets.production.env`, fill it in and run:

```bash
node scripts/sync-worker-secrets.mjs production --check
node scripts/sync-worker-secrets.mjs production
```

The script uploads non-empty values, preserves existing secrets and skips missing optional files. Add `--pages` for Pages; use `.env.docker` for Docker. Sensitive files are in the Git ignore list. Store secrets in server settings, not `VITE_*` variables. Check the `configured` fields at `/api/browser/challenges` to inspect the setup.

## GitHub Actions deployment (optional)

Choose Workers Builds or GitHub Actions to avoid duplicate deployments. Actions runs builds and tests by default. To enable deployment, add these settings to your repository's Actions configuration:

| Kind     | Name                    | Purpose                                             |
| -------- | ----------------------- | --------------------------------------------------- |
| Variable | `ENABLE_CF_DEPLOY=true` | Enable deployment                                   |
| Variable | `CF_DEPLOY_TARGET`      | `workers` (default) or `pages`                      |
| Variable | `CF_DEPLOY_BRANCH`      | Branch to deploy; defaults to the default branch    |
| Secret   | `CLOUDFLARE_API_TOKEN`  | Workers/Pages deployment credentials for the target |
| Secret   | `CLOUDFLARE_ACCOUNT_ID` | Target Cloudflare account ID                        |

Push to the deploy branch (`main` by default) or run `Build and deploy one-ip` on it. Deployment starts after the build, tests and Docker smoke test pass; other branches only build and test. Documentation-only changes do not trigger a run. Deployment uses the `production` environment, so secrets can live in the repository or that environment. External PRs run tests without deployment credentials. These credentials are used by CI.

For `pages`, first create the Pages project named in `deploy/pages/wrangler.toml`. When using Pages Git integration, leave Actions deployment disabled.

## Update your fork

Click **Sync fork → Update branch** on your GitHub repository page. Review differences if you have code changes, and resolve merge conflicts.

For scheduled updates, enable `Sync upstream`:

1. Enable workflows in your fork's Actions tab.
2. Under Settings → Secrets and variables → Actions → **Variables**, add `AUTO_SYNC_UPSTREAM=true`.
3. The workflow checks for updates at 04:23 UTC each day. You can run it from the Actions page.

The workflow supports forks created from `zhihui-hu/one-ip` and requires no personal access token. It uses GitHub's `merge-upstream` API, stops on conflicts and preserves your commits. Use GitHub's Sync fork if you want to review updates.

- **Workers Builds:** connect your fork's production branch and check deployment records for synchronized commits in Cloudflare's build history.
- **GitHub Actions deployment:** the sync workflow triggers deployment when it merges updates. Pushes made with `GITHUB_TOKEN` do not trigger ordinary `push` workflows.
- If branch protection blocks a merge, use a PR.
- Enable scheduled workflows in your fork. GitHub may disable schedules after 60 days of inactivity in a public repository; use the Actions page to enable them.

References: [Syncing a fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork), [GITHUB_TOKEN triggering behavior](https://docs.github.com/en/actions/concepts/security/github_token), [Workflow disabling rules](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).

## WebMCP

In browsers with native `document.modelContext`, the site registers structured tools for IP and WHOIS lookups, network and AI checks, service status, and browser diagnostics. `one_ip_catalog` lists supported sites, platforms and pages; `one_ip_open_page` opens the interactive permission page. Tools reuse the site's existing sources and request limits, and support cancellation. Browsers without WebMCP continue to use the normal UI.

WebMCP is experimental. For local testing, enable `chrome://flags/#enable-webmcp-testing` and inspect `await document.modelContext.getTools()`. Live Chrome use requires the [WebMCP Origin Trial](https://developer.chrome.com/docs/ai/webmcp/) or later native support; this repository does not include an origin trial token. Tools are exposed only to the current same-origin page, with no cross-origin iframe delegation. Results can contain third-party content; users should decide whether to share browser fingerprints, egress IPs or WebRTC results with an agent.
