# dsh-billing

**A billing plugin for DeepSeek Harness** (bilingual UI: 简体中文 / English)

Persistent ledger · exact per-call billing · official balance · budget · today/month/total summaries · per-session details & history · peak/off-peak pricing · official price sync

[![version](https://img.shields.io/badge/version-1.0.0-4176E6)](package.json)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![dsh](https://img.shields.io/badge/DeepSeek%20Harness-dsh--plugin-4176E6)](https://github.com/deepseek-ai/deepseek-harness)

**English** | [中文](README.md)

---

## Features

| Feature | Location | Notes |
|---|---|---|
| Session cost | Conversation stats line | Live token totals (input/cache/output) + estimated cost at the current price tier |
| Today's cost | Stats line / sidebar | Exact value from the ledger |
| Official balance | Stats line / sidebar footer / settings | Total / granted / topped-up; auto-refresh + manual refresh |
| Summary cards | Settings | Today / month / total cost, call counts and token details |
| Budget | Settings + sidebar progress bar | Amount, period (today/month/all/custom range), used % (≥80% warning, ≥100% over) |
| Today's sessions | Settings | Per-session call counts, input/cache/output tokens and cost |
| History | Settings | Daily aggregates; retention days configurable (default 180) |
| Price table | Settings | Per-model base / off-peak / peak tiers, editable |
| Peak/off-peak pricing | Settings | Official DeepSeek plan with effective-time gating |
| Official price sync | Settings | Fetch and parse the official pricing page, apply with one click |
| Data | Settings | Clear all history |
| Language | Settings → Display | 简体中文 / English / Follow browser (auto, default) |

## Billing rules

- Prices are **USD / 1M tokens**, matching the official docs;
- Cost = cache-miss input × `cacheMiss` + output × `output` + (cache read + cache write) × `cacheHit`;
- **Peak/off-peak is time-gated**: before `peakEffectiveAt` (default `2026-08-16T16:00:00Z`) the base price applies; afterwards peak hours (01:00–04:00 and 06:00–10:00 UTC) use the peak tier and the rest use the off-peak tier;
- The ledger always stores **USD**; currency/exchange rate only affect display (default 1 USD = 7.2 CNY, configurable);
- **Every model call is billed from its `usage` block** (the plugin listens at the tail of the `llm/stream` waterfall), so main-loop turns, sub-agents, compaction and title calls are all recorded — consistent with the platform bill;
- The session badge on the stats line is an **estimate at the current tier**; today/month/total and budget are **exact billing at the actual call time**;
- Budget warnings are **advisory only** — they never block calls.


## Data storage

- Ledger: `$DSH_HOME/storages/dsh-billing/ledger.json` (atomic writes + 2s debounce; pruned by `historyDays`, max 200 session entries per day);
- All settings changes auto-save immediately (submitted via the settings page "Save", validated and persisted server-side);
- Delete the ledger file or use "Clear all history" in the settings page to reset.

## Architecture

```
dsh-billing
├── cordis.patch.yml        # bundle patch: inserts the billing row into the web profile
├── package.json            # dsh.bundle patch declaration + dsh.client browser declaration
├── lib/
│   ├── index.js            # host plugin: llm/stream billing wrap, costUsage session projection,
│   │                       #   billing service (hand-written typertRemote binding), balance query, official price sync
│   ├── pricing.js          # official price table, official-page HTML parser, peak/off-peak math
│   ├── store.js            # ledger persistence & config management ($DSH_HOME/storages/dsh-billing)
│   ├── typert.host.js      # ./typert export: Typert manifest (auto-registered by typert-loader)
│   └── client.js           # ./client export: browser single-file bundle (stats line / sidebar / settings)
└── test/
    ├── verify.mjs          # unit verification: pricing/config/ledger/projection/real cordis load/billing wrap
    └── demo.mjs            # billing demo: simulated multi-session/multi-model peak & off-peak calls → ledger & summary
```

Data channels:

- **Session cost**: the host registers the `costUsage` session projection (pure token buckets split by model); the browser reads it via `useProjection('costUsage')` and prices it at the current tier;
- **Ledger / budget / balance / config**: `billing/getState | updateConfig | refreshBalance | fetchPrices | resetHistory` over the Typert gateway RPC (`remote.billing.*`);
- **Balance**: official `GET {baseURL}/user/balance`, reusing the same API key as model requests (credentials service / env), cached in-process by `refreshMinutes`;
- **Refresh strategy**: the host deliberately avoids the cordis timer mixin (`ctx.interval` throws on contexts without a mounted timer service) — everything is "cache timestamp + on-demand refresh" driven by client polling/manual refresh.

The plugin imports no cordis/dsh Service/Context runtime classes (only Node built-ins, zod, and pure functions from dsh-home-paths / dsh-credentials), sharing the host's single runtime instance with no duplicate-dependency risk.

## Installation

> Requirements: Node.js ≥ 20 + DeepSeek Harness (a build with the `dsh plugin` command, `npm install -g @deepseek-ai/dsh`).

### From GitHub (after publishing)


```sh
dsh plugin --profile web add github:mahiro6/dsh-billing
```

Or via a tarball URL:

```sh
  dsh plugin --profile web add https://github.com/<owner>/dsh-billing/archive/refs/heads/main.tar.gz
```

### Local development install

```sh
dsh plugin --profile web add link:<absolute path to this repo>
# e.g. dsh plugin --profile web add link:E:\Workspace\dsh-billing
```

### Activation & removal

Restart **`dsh web`** after installing (plugin rows, Typert manifests and the client bundle are all scanned at startup):

```sh
dsh web
```

Update: re-run the install command and restart. Remove: `dsh plugin --profile web remove dsh-billing`.

## Development & verification

```sh
pnpm install                                            # dependencies
node --check lib/index.js && node --check lib/pricing.js \
  && node --check lib/store.js && node --check lib/typert.host.js \
  && node --check lib/client.js                         # syntax checks
node test/verify.mjs                                    # unit verification
node test/demo.mjs                                      # billing demo
dsh --profile web --dump-config                         # composed-tree check (after install)
```

## Configuration

| Field | Default | Notes |
| --- | --- | --- |
| `locale` | `auto` | UI language: auto (browser) / zh / en |
| `statsLine` | `true` | Show balance, today's cost & session cost on the stats line |
| `sidebar` | `true` | Show balance, today's cost & budget bar in the sidebar footer |
| `currency` | `CNY` | Display currency (CNY/USD/EUR/GBP/JPY/HKD/TWD) |
| `symbol` | `¥` | Currency symbol |
| `decimals` | `4` | Money decimals |
| `exchangeRate` | `7.2` | Exchange rate (1 USD = ?) |
| `peakEnabled` | `true` | Enable peak/off-peak pricing |
| `peakEffectiveAt` | `2026-08-16T16:00:00Z` | Peak pricing effective time (UTC) |
| `peakWindows` | `[{1,4},{6,10}]` | Peak hour windows (UTC hours) |
| `prices` | bundled DeepSeek official | Per model `cacheHit/cacheMiss/output` + optional `offPeak/peak` (USD / 1M tokens) |
| `budget` | `{enabled:false, amount:100, period:'month'}` | Budget: enabled / amount (display currency) / period (day/month/all/custom) / custom range |
| `balance` | `{display:'both', refreshMinutes:5}` | Balance display locations & auto-refresh interval |
| `historyDays` | `180` | Ledger retention days (7–3650) |

## Known limitations

- Balance is account-level data, cached per `refreshMinutes`; manual refresh is immediate;
- The session badge on the stats line is an estimate at the current tier; exact figures come from the ledger (today/month/total);
- Official-page parsing depends on the current page structure; if the page is redesigned, "Sync official prices" will fail — the manual price table editor is the fallback;
- Price sync overwrites same-name model prices listed on the official page; custom model entries are untouched;
- Balance lookups need network access to api.deepseek.com and a valid API key; **the API key is only ever sent to the official domain** (requests are refused when baseURL points elsewhere; model calls are unaffected);
- Installing/updating requires a `dsh web` restart.

## Contributing

Issues and PRs are welcome. Please make sure `node test/verify.mjs` passes before submitting.

## License

[MIT](LICENSE) © 2026 dsh-billing contributors
