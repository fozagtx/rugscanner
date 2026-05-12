# Changelog

All notable changes to Safe Listings Radar. Format follows [Keep a Changelog](https://keepachangelog.com/).

## 2026-05-14

- TODO: final polish pass on scoring thresholds based on a 48h sample of live data.
- TODO: record 60-second demo video and embed in `docs/INTRO.md`.
- TODO: publish launch thread on X, tag `@birdeye_data`.
- TODO: finalize `docs/SUBMISSION.md` with live URL and submit to Earn.

## 2026-05-13

- TODO: add accessibility pass (keyboard nav, aria-labels) to the radar UI.
- TODO: write build-in-public update #1 on X with first WORTH/AVOID screenshots.
- TODO: instrument a basic counter for API calls per scan; publish in the README.

## 2026-05-12

- Initial scaffold. Birdeye client + scoring algorithm + single-screen radar UI.
- Wired endpoints: `/defi/v2/tokens/new_listing`, `/defi/token_overview`, `/defi/v3/token/holder`. Premium-only `/defi/token_security` gated behind `BIRDEYE_PREMIUM=true`.
- Scoring engine in `lib/scoring.ts` with documented two-tier penalty/bonus table.
- Verdict buckets WORTH / WATCH / AVOID at thresholds 65 and 35.
- Project documentation: `README.md`, `docs/SUBMISSION.md`, `docs/INTRO.md`, `docs/TWEETS.md`, `docs/PRESS_KIT.md`, `docs/STRATEGY.md`.
