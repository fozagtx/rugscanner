<p align="center">
  <img src="./public/logo.svg" alt="Safe Listings Radar" width="96" />
</p>

<h1 align="center">Safe Listings Radar</h1>

<p align="center"><em>Every new Solana token, scored for rug risk before you ape.</em></p>

<p align="center">
  <a href="https://birdeye-radar.vercel.app">Live demo</a> ·
  <a href="https://twitter.com/your-handle/status/PLACEHOLDER">Launch thread</a> ·
  <a href="https://github.com/your-handle/birdeye-radar">GitHub</a>
</p>

> Built for **Birdeye Data BIP Sprint 4**. Submission target: 2026-05-16.

---

## The problem

Solana lists thousands of new tokens every day. The overwhelming majority are honeypots, soft rugs, or thinly-traded throwaways. A trader scanning new listings manually has to open each token in a chart, check the security flags, eyeball holder distribution, and only then form a view — and by the time they finish, the next 200 tokens have launched.

Safe Listings Radar is a triage layer. It pulls every new listing, pulls the supporting security and holder data from Birdeye, applies a transparent rule-based score, and returns one of three verdicts — `WORTH`, `WATCH`, or `AVOID` — so a human only has to read the small set of tokens that pass the filter.

## How it works

```
Birdeye /defi/v2/tokens/new_listing
        │
        ▼
For each new mint, in parallel:
        ├─► /defi/token_overview    (liquidity, 24h volume, price, market cap, holders)
        ├─► /defi/v3/token/holder   (top-holder distribution)
        └─► /defi/token_security    (premium-only — mint/freeze/LP)
        │
        ▼
Scoring engine (lib/scoring.ts)
   two-tier rules → 0–100
        │
        ▼
Verdict: WORTH (≥65) · WATCH (35–64) · AVOID (<35)
        │
        ▼
Single-screen web UI (verdict-first)
```

A 12-token scan hits roughly **25 Birdeye API calls** on the free tier (1 listing call + 2 per token) or **37 calls** on the premium tier (1 + 3 per token), with a 60-second in-memory cache deduplicating same-mint enrichment.

## Scoring methodology

The score is open in [`lib/scoring.ts`](./lib/scoring.ts). The intent is transparency, not a black box. Every token starts at a **neutral baseline of 50** and is moved by deterministic rules across two tiers.

### Free-tier signals (always on)

Powered by `/defi/token_overview` + `/defi/v3/token/holder` + the new-listing payload.

| Signal | Effect | Reasoning |
|---|---|---|
| Liquidity < $1k | **−25** | Unsalvageable — cannot exit any meaningful position. |
| Liquidity $1k – $5k | **−10** | Thin book, severe slippage on exit. |
| Liquidity $25k – $100k | **+10** | Healthy launch depth. |
| Liquidity > $100k | **+20** | Deep liquidity, real exit possible. |
| Vol / liquidity < 0.1× | **−10** | Dead book — no real trading interest. |
| Vol / liquidity > 50× | **−10** | Likely wash trade or panic dump. |
| Vol / liquidity 2× – 10× | **+5** | Healthy churn. |
| Holders < 50 | **−15** | Pre-distribution, concentration risk. |
| Holders 200 – 1,000 | **+10** | Distributed launch. |
| Holders > 1,000 | **+15** | Mature distribution. |
| Top 10 own > 70% (when data available) | **−25** | Whale risk — coordinated dump can collapse price. |
| Top 10 own 50–70% | **−10** | Elevated concentration. |
| Unique wallets 24h < 20 | **−5** | Stagnant — no organic interest. |
| Unique wallets 24h > 100 | **+10** | Organic activity. |
| Single AMM listed | **−5** | Hasn't graduated past first venue. |
| Markets > 3 | **+5** | Multi-venue traction. |
| Age < 5 minutes | **−5** | Too fresh, signals haven't settled. |
| Age > 1 hour | **+5** | Initial volatility passed. |

### Premium signals (require `BIRDEYE_PREMIUM=true`)

Powered by `/defi/token_security`, which is gated behind a paid Birdeye plan. When enabled, these stack on top of the free-tier rules:

| Signal | Effect | Reasoning |
|---|---|---|
| Mint authority not revoked | **−25** | Owner can mint unlimited supply. Hard rug primitive. |
| Freeze authority not revoked | **−15** | Owner can freeze any holder's wallet. Soft-rug primitive. |
| LP burned | **+10** | Liquidity cannot be pulled. |
| LP locked | **+5** | Liquidity contractually locked. |
| LP neither locked nor burned | **−25** | Deployer can pull at any time. |
| Transfer fee enabled | **−10** | Token-2022 transfer fees often used as exit tax. |

> **Why a two-tier model?** The free Birdeye plan gives you everything except the security endpoint. That's enough for a *quality* triage (deep liquidity, distributed holders, organic volume). A Premium key adds *intent* signals (revoked authorities, LP lock) that detect the rug primitives themselves. Both tiers are useful; the Premium tier is decisive.

Final score is clamped to `[0, 100]` and bucketed:

- `WORTH` ≥ 65 — surfaced first in the UI
- `WATCH` 35–64 — visible
- `AVOID` < 35 — visible, dimmed

The scoring is a heuristic, not financial advice. It can be wrong — but it is wrong **transparently**.

## Birdeye endpoints used

| Endpoint | Tier | Used for |
|---|---|---|
| `GET /defi/v2/tokens/new_listing` | Free | Primary feed of newly listed Solana tokens. |
| `GET /defi/token_overview?address={mint}` | Free | Liquidity, 24h volume, price, market cap, holder count, unique wallets, market count. |
| `GET /defi/v3/token/holder?address={mint}&limit=10` | Free | Top-holder distribution. |
| `GET /defi/token_security?address={mint}` | **Premium** | Mint/freeze authority, LP lock/burn, transfer-fee flag. Enabled when `BIRDEYE_PREMIUM=true`. |

Headers used on every call: `X-API-KEY`, `accept: application/json`, `x-chain: solana`. The client times out at 4s per call and briefly caches 429s so a single rate-limit event doesn't stall the whole scan.

## Local setup

```bash
git clone https://github.com/your-handle/birdeye-radar
cd birdeye-radar
bun install
cp .env.example .env.local
# fill BIRDEYE_API_KEY — get one at https://bds.birdeye.so
bun dev
```

Open `http://localhost:3000`.

## Tech stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Bun (runtime + package manager)
- Birdeye Data Services APIs

## Roadmap

- Cross-reference smart-money wallets (flag tokens being bought by known profitable wallets)
- Wash-trade detector (penalize tokens where >X% of volume is between < N wallets)
- Multi-chain support (BSC, Base, Sui via the same Birdeye `x-chain` header)
- Mobile-first PWA build

## Credits

Built on [Birdeye Data Services](https://bds.birdeye.so). Follow [@birdeye_data](https://twitter.com/birdeye_data) and tag `#BirdeyeAPI` if you ship something on top of this.

## License

MIT
