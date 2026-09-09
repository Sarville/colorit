# Colorit
A Yandex Games build based on a [Flowit](https://github.com/Flowit-Game/Flowit) clone, using typescript / react / nextjs.

# Licensing
Is licenced as AGPL-3.0.

## Getting Started
To build colorit locally, first, install the node modules:
```bash
yarn
```

Next clone the levels repository
```bash
git clone https://github.com/Flowit-Game/Levels.git
```

Then convert the levels to the expected format
```bash
yarn convert-levels
```

Now you can run the development server:
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Building a release
Ensure you have downloaded and converted the levels. Then run 
```bash
yarn next build
yarn next export
```

This will create an `out` directory with static files that can be hosted (e.g. On GitHub pages or Amazon S3) to create the site.

For the VK build specifically, set `NEXT_PUBLIC_REQUIRE_VK=true` before building - this omits the
Yandex Games SDK script and makes the page refuse to render outside a real VK launch:
```bash
NEXT_PUBLIC_REQUIRE_VK=true yarn next build
yarn next export
```

VK Games doesn't accept a zip upload - its developer cabinet only takes an iframe URL, so `out/`
needs to be hosted somewhere with HTTPS and that URL entered as the app's "Адрес iframe" at
vk.com/dev (app platform "Встраиваемое приложение", type "Игра").

### Deploying the VK build
There's no CI for this - it's a manual rsync to the game server:
```bash
rsync -az --delete out/ server-games:/opt/games/site/vk/colorit/
```
(`server-games` is an SSH alias; ask whoever set up the server for access.) The server also runs a
small Caddy config and a `vk-payments-colorit` Node service (payments webhook + VK launch-params
auth gate), tracked in [`ops/`](./ops/) - see [`ops/README.md`](./ops/README.md) for how to deploy
changes to them (a `git commit` alone doesn't touch the live server). Read
[`docs/vk-gotchas.md`](./docs/vk-gotchas.md) before touching anything VK-related, it covers several
non-obvious traps (payments response shape, storage size limits, Caddy config quirks, launch-auth
signature) that already cost real debugging time once.

If you have docker available and want a quick preview of the site, you can run
```bash
cd out
docker run --rm -p 3001:80 -v $PWD:/usr/share/nginx/html nginx
```
And then browse to [http://localhost:3001](http://localhost:3001)
