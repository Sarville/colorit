# ops

Server-side config that isn't part of the Next.js app but is required to run it. These files are
**not deployed automatically** - they're edited here, then copied to the server by hand. There is
no CI for this.

- `Caddyfile` → lives on the server at `/opt/games/Caddyfile`, bind-mounted into the `caddy-games`
  container as `/etc/caddy/Caddyfile`. Serves the static export, plus hotlink protection, caching,
  and the VK launch-auth gate (`forward_auth` to `vk-payments-colorit`).
- `vk-payments/server.js` → lives on the server at `/opt/games/vk-payments/server.js`,
  bind-mounted into the `vk-payments-colorit` container as `/server.js` (runs on `node:22-alpine`,
  `node /server.js`, listens on :3000). Handles the VK payments webhook and the launch-params
  signature check used by the Caddy gate above. Needs `VK_APP_SECRET` set in the container's
  environment (not in this repo - configured directly on the server).

See [`../docs/vk-gotchas.md`](../docs/vk-gotchas.md) before changing either of these - both have
non-obvious traps already discovered once (Caddy directive ordering / `path` matcher wildcards not
crossing segments, VK's two different signature schemes, etc).

## Deploying a change

```bash
# Caddyfile
ssh server-games "cp /opt/games/Caddyfile /opt/games/Caddyfile.bak-$(date +%Y%m%d%H%M%S)"
scp ops/Caddyfile server-games:/opt/games/Caddyfile.new
ssh server-games "docker exec -i caddy-games caddy validate --config /dev/stdin --adapter caddyfile" < ops/Caddyfile
ssh server-games "cp /opt/games/Caddyfile.new /opt/games/Caddyfile && rm -f /opt/games/Caddyfile.new"
ssh server-games "docker exec caddy-games caddy reload --config /etc/caddy/Caddyfile"

# vk-payments/server.js
node --check ops/vk-payments/server.js
ssh server-games "cp /opt/games/vk-payments/server.js /opt/games/vk-payments/server.js.bak-$(date +%Y%m%d%H%M%S)"
scp ops/vk-payments/server.js server-games:/opt/games/vk-payments/server.js.new
ssh server-games "cp /opt/games/vk-payments/server.js.new /opt/games/vk-payments/server.js && rm -f /opt/games/vk-payments/server.js.new"
ssh server-games "docker restart vk-payments-colorit"  # no hot-reload
```

After either change, verify against the live site (status codes, headers) rather than trusting the
deploy alone - see recent session logs under `sessions/` for the exact curl checks used.

**Keep this directory in sync with the server.** If you edit the live files directly over SSH
during an incident, copy the final version back here and commit it afterward so the repo doesn't
silently drift from what's actually running.
