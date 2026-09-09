# VK Mini App gotchas

Findings from getting Colorit working correctly as a VK Mini App (self-hosted iframe at
`games.sarville.online/vk/colorit/`, VK-only build via `NEXT_PUBLIC_REQUIRE_VK=true`). Every one
of these cost real debugging time - recorded here so the next person doesn't repeat it.

## Payments (`VKWebAppShowOrderBox`)

- **`@vkontakte/vk-bridge`'s TypeScript types are wrong for the order box response.** The types
  declare `VKWebAppShowOrderBoxResponse = {status: 'success'|'cancel'|'fail', order_id: string}`,
  but the real VK client responds with `{success: boolean, order_id: string}` - there is no
  `status` field at all. Checking `result.status !== "success"` silently always fails (`status` is
  `undefined`), even though the purchase actually went through. Check `result.success` instead
  (see `lib/support.ts`, `@ts-ignore`d since the installed types disagree).
- **The payments webhook (`vk-payments/server.js` on the server, not in this repo) must handle
  `notification_type` with a `_test` suffix.** VK's "Тестовый" button in the app's payments
  cabinet sends the exact same notifications (`get_item_test`, `order_status_change_test`)
  instead of the real ones - strip the `_test` suffix before comparing, or the sandbox probe gets
  `"Unknown item or notification"` and you'll think the integration is broken when it isn't.
- The classic Payments API signature (webhook `sig` param) and the Mini App *launch params*
  signature (`sign` query param on the game URL, see below) are **two different algorithms** -
  md5 vs HMAC-SHA256 - even though they use the same app secret (`VK_APP_SECRET`). Don't confuse
  them.

## Auth / launch params (stopping the game from loading outside VK)

- `vk_user_id` being present in the URL **proves nothing on its own** - it's just a copyable query
  string. A URL with real `vk_user_id`/`sign`/`vk_ts` params opens fine in an incognito window with
  zero VK login, because the "proof" isn't a cookie or session, it's baked into the URL itself.
- The actual proof is VK's launch-params signature: HMAC-SHA256 over the sorted `vk_`-prefixed
  query params (joined `key=value&key=value...`), keyed with the app secret, base64url-encoded
  (`+`→`-`, `/`→`_`, strip `=` padding), compared against the `sign` param. Verified against a real
  captured launch URL before relying on it (see `docs/../` session notes / git history for the
  verification script) - do this again if the algorithm is ever touched, it's easy to get subtly
  wrong (padding, byte vs base64 encoding, param filtering) and silently lock out real players.
- **A normal browser refresh (F5) does NOT get a new `sign`/`vk_ts`.** It just re-requests
  whatever URL is already in the address bar. Only a genuine new launch from VK (reopening the
  Mini App, the cabinet's "Тестовый" link, etc.) mints a fresh signature. This matters for picking
  the freshness window (`LAUNCH_MAX_AGE_SECONDS` in `vk-payments/server.js`): too short and normal
  refresh-heavy testing/play breaks constantly; too long and a leaked/shared link stays valid for a
  long time. Settled on 8 hours after 24h proved too loose and 1h broke normal refresh-based
  testing.
- VK rebranded `vk.com` → `vk.ru`. Any Origin/Referer allowlist needs both (`vk.com`/`.vk.com` and
  `vk.ru`/`.vk.ru`).
- A Referer/Origin check is a *soft*, complementary signal only - never a substitute for the
  signature. It can be trivially spoofed by anything that isn't a real browser (curl, scripts), and
  legitimate browsers with strict privacy settings can omit Referer entirely. Treat a **missing**
  Referer as acceptable (don't punish it); treat a **present-but-wrong** Referer as a red flag.
- There's no way to prove "the current browser session is logged into VK right now" beyond the
  above - that would require a live OAuth flow (`VKWebAppGetAuthToken` + server-side validation
  against VK's API), a much bigger change with its own trade-offs (consent dialog, latency, and the
  resulting token is *still* just as copyable as a signed URL). Not implemented; flag if the
  threat model ever needs it.

## Storage / progress sync (`VKWebAppStorageSet` / `VKWebAppStorageGet`)

- **Each VK storage key is capped at 4096 bytes**, and `VKWebAppStorageSet` does not fail loudly
  when a value is too big - it appears to succeed, and the value comes back **silently truncated**
  at the 4096-byte boundary. The failure only surfaces later, as a `JSON.parse` `SyntaxError`
  ("Unterminated string... at position 4096") when reading it back.
- This broke level progress specifically: all 4 level packs (194 levels) were saved combined under
  one `"levelProgress"` key, serializing to ~6KB - well over the limit. The much smaller
  `"adsDisabled"` purchase flag (a single boolean) stayed under the limit and worked fine, which is
  why "the purchase persisted but levels reset" was the reported symptom - same storage mechanism,
  different key sizes.
- Fix: one storage key per level pack (`levelProgress_Easy`, `levelProgress_Medium`, ...) instead
  of one combined key. Each pack's JSON comfortably fits (largest pack ~1.9KB). If a future pack
  (e.g. user-submitted "Community") grows large enough on its own to approach 4096 bytes again,
  it'll need splitting further (by id range or similar).
- `loadProgress`/`saveProgress` (`lib/cloudSave.ts`) now log VK storage failures instead of
  swallowing them silently - if this class of bug recurs, it'll show up in the console instead of
  requiring a repeat of this investigation.

## Yandex SDK vs VK environment

- The Yandex Games SDK script (`https://yandex.ru/games/sdk/v2`, loaded in `components/Header.tsx`)
  is **not harmless just because you don't call `.init()`**. Merely including the `<script>` tag
  makes it perform its own environment handshake, which (running inside VK, with no real Yandex
  parent frame) logs `[SDK] too long resolve for method 'loadEnvironment'` and can interfere with
  browser history/state.
- The actual fix ended up being two-layered: `lib/yandexSdk.ts`'s `getYsdk()` skips calling
  `window.YaGames.init()` entirely when `isVkEnvironment()`, **and** the VK-only build
  (`NEXT_PUBLIC_REQUIRE_VK=true`) omits the `<script>` tag from `Header.tsx` altogether, so it never
  loads at all in that build.

## Next.js static export + relative asset paths

- Not VK-specific, but it manifested as "sounds/music don't load in VK": `next.config.js` needs
  `trailingSlash: true`. Without it, Next's client router "corrects" the URL on hydration via
  `history.replaceState`, silently dropping the trailing slash the static export actually needs
  (each route is `.../colorit/index.html`, served at `.../colorit/`). Once the trailing slash is
  gone, every relative `./sounds/...` URL built at runtime resolves one directory too high.
- Confirmed the fix (and originally diagnosed the bug) with a headless-Chrome probe navigating the
  real deployed URL with `vk_user_id` params and inspecting `document.location`/`new
  Audio(...).src` after hydration - reproducing this from server logs alone was not reliable
  enough (the deployed JS bundle's hash and Referer-based cache checks kept looking "fine" from a
  static analysis).

## Deployment (this is manual, not CI)

- No CI/CD. Release process: `NEXT_PUBLIC_REQUIRE_VK=true yarn next build && yarn next export`,
  then `rsync -az --delete out/ server-games:/opt/games/site/vk/colorit/`.
- Server: SSH alias `server-games`. Caddy (`caddy-games` container, config at
  `/opt/games/Caddyfile` on the host, bind-mounted) serves the static files and does the
  hotlink/cache/auth gating described above. The payments + launch-auth service
  (`vk-payments-colorit` container, code at `/opt/games/vk-payments/server.js` on the host,
  bind-mounted) needs `docker restart vk-payments-colorit` after any edit - it doesn't hot-reload.
- **`Caddyfile` and `vk-payments/server.js` are server-only files, not part of this git repo.**
  There is no version control for them beyond manual timestamped `.bak-*` copies made ad hoc next
  to the originals during editing. If a future session touches VK auth/payments/caching config,
  consider bringing these under version control (e.g. a small ops repo) instead of continuing to
  rely on `.bak-*` copies.
- Caddy directive gotcha: `respond`/`header` get silently re-sorted by Caddy's default directive
  order unless the whole block is wrapped in `route { ... }` - a hotlink-protection `respond 403`
  silently never fired because it ran after `file_server` had already answered the request. Always
  use `route {}` when directive order matters.
- Caddy `path` matcher gotcha (Caddy 2.11.4): wildcards (`*` and `**`) **only ever match within a
  single path segment** - `**` is not a working cross-segment glob here, contrary to how it reads.
  A pattern like `/vk/*/_next/static/**` silently matches nothing nested. Use `path_regexp` for
  anything that needs to match variable-depth paths (e.g. `^/vk/[^/]+/sounds/` to catch both
  `sounds/click.wav` and `sounds/music/menu.mp3`).
- Caddy `forward_auth` requires the `uri` subdirective in this version (omitting it is a config
  error, not "forward as-is" as the docs might suggest) - use `uri {http.request.uri}` to forward
  the original path+query unchanged to the auth backend.
