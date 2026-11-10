# Instructions for agents

Virtuosa GPS: an open-source (MIT), unofficial walking GPS for the MSC Virtuosa cruise ship. Static Astro site (English at `/`, Brazilian Portuguese at `/pt/`) deployed as a Cloudflare Worker with static assets only. See README.md for the layout.

This package is also used by the private group site (`viagem-msc-virtuosa-2026`) as a GitHub dependency pinned to a tag. Plan, route and GPS changes happen here, get a new tag, and the group site bumps the tag.

## Conventions

- Phone first: everything must work well at ~390px wide.
- No emojis in the UI. Use the SVG icons in `src/gps/lib/icons.ts` (`<Icon name="…" />`).
- Every user-facing text exists in English and Brazilian Portuguese: `src/gps/i18n/strings.ts` (GPS), `src/site/textos.ts` (site), `src/gps/i18n/places.en.json` (plan names and descriptions). `npm run check` must pass.
- Keep the "unofficial, not affiliated with MSC" notice. Never add the reference deck plan images (`plantas/ref/`) or anything derived from MSC branding to the repository.
- For visual changes (routes, plans), take before/after screenshots at phone width and get approval before committing or deploying.

## Deploy

Run `npm run check` and `npm run build` first, and deploy only when asked.

- On Bazzite: `~/.local/bin/deploy-virtuosa-gps` (reads the Cloudflare token from a local file; never print it or ask the user for it).
- Elsewhere, with `wrangler` logged in to the right account: `npm run deploy`.

Live site: https://virtuosa-gps.vinicius741.workers.dev

## Releasing a new version for the group site

1. Bump `version` in `package.json`, commit, `git tag vX.Y.Z`, push with tags.
2. In the group site: `npm install github:vinicius741/virtuosa-gps#vX.Y.Z`, check, build, deploy.
