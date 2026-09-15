const http = require("http");
const crypto = require("crypto");

// OK (Odnoklassniki) is configured as a platform under this same dev.vk.ru app - one app, one
// secret, just two different notification URLs (classic VK one + OK's own, see below). Confirmed
// against the live server: only VK_APP_SECRET is set there, no separate OK secret exists.
const APP_SECRET = process.env.VK_APP_SECRET || "";
const ITEM_ID = "support_author";
const ITEM_TITLE = "Поддержать автора";
// Chosen prices per platform's currency (not 1:1 with RUB or with each other - see
// docs/vk-gotchas.md's OK payments section for why). Keep these two in sync with lib/support.ts's
// VK_ITEM_PRICE/OK_ITEM_PRICE, which mirror them for the client-side button label.
const ITEM_PRICE = 20; // голосов
const ITEM_PRICE_OK = 100; // ОКи

// VK's classic Payments API signature: md5 of every param except sig, sorted by name and
// concatenated as name=value with no separator, plus the app's secret key appended. Also used for
// OK's `get_item` notification (same classic POST channel/secret regardless of which platform the
// purchase originates on) and for OK's own confirmation notification (handleOkPaymentNotification
// below) - same formula, same APP_SECRET, just a different set of params being signed.
function isValidSig(params) {
  if (!APP_SECRET) {
    return false;
  }
  const {sig, ...rest} = params;
  const joined = Object.keys(rest).sort().map((key) => `${key}=${rest[key]}`).join("");
  const expected = crypto.createHash("md5").update(joined + APP_SECRET).digest("hex");
  return sig === expected;
}

// VK's Mini App *launch params* signature is a different scheme from the Payments one above:
// HMAC-SHA256 (not md5) over just the vk_-prefixed params, base64url-encoded. Verified against a
// real captured launch URL before deploying this. This is what proves a request to the game page
// actually came from VK and wasn't just a copy-pasted URL (the browser's own address bar can't be
// trusted - vk_user_id being present proves nothing on its own, anyone can paste it elsewhere).
const LAUNCH_MAX_AGE_SECONDS = 8 * 60 * 60; // ponytail: tune if real sessions need to live longer

function isValidLaunchParams(searchParams) {
  if (!APP_SECRET) {
    return false;
  }
  const sign = searchParams.get("sign");
  if (!sign) {
    return false;
  }
  const vkKeys = [...searchParams.keys()].filter((k) => k.startsWith("vk_")).sort();
  const joined = vkKeys.map((k) => `${k}=${searchParams.get(k)}`).join("&");
  const expected = crypto.createHmac("sha256", APP_SECRET).update(joined).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (expected !== sign) {
    return false;
  }
  let ts = Number(searchParams.get("vk_ts"));
  // OK sends vk_ts in *milliseconds*, not seconds like VK - confirmed from real captured OK
  // launches (e.g. vk_ts=1789483279190 vs a VK launch's vk_ts=1789477153 at almost the same real
  // time). Without this, every real OK launch computed a multi-billion-second-old age and got
  // rejected here, even with a fully valid signature. A seconds timestamp for "now" is ~1.8e9;
  // nothing legitimate reaches 1e12 in seconds for centuries, so treat anything past that as ms.
  if (ts > 1e12) {
    ts = ts / 1000;
  }
  const ageSeconds = Date.now() / 1000 - ts;
  return Boolean(ts) && ageSeconds >= -60 && ageSeconds <= LAUNCH_MAX_AGE_SECONDS;
}

// Soft check, on top of the sign: a real VK Mini App launch loads the page inside an iframe on
// vk.com/vk.ru (they rebranded from .com to .ru), which sends that as the Referer. A signed link
// pasted straight into a browser's address bar (no iframe) sends no Referer at all - this catches
// that case without the sign check needing to expire fast. Missing entirely is NOT rejected: some
// browsers/privacy settings strip Referer even for legitimate iframe loads, and punishing that
// would block real players over a header we can't force them to send.
function isAcceptableReferer(referer) {
  if (!referer) {
    return true;
  }
  try {
    const host = new URL(referer).hostname;
    // A real OK Mini App launch embeds this same iframe from ok.ru, not vk.com/vk.ru - without this,
    // every genuine OK player would be 403'd by this soft check alone, even with a fully valid
    // launch-params signature (found while reviewing the OK launch path, not from a live report).
    return host === "vk.com" || host.endsWith(".vk.com") || host === "vk.ru" || host.endsWith(".vk.ru")
      || host === "ok.ru" || host.endsWith(".ok.ru");
  } catch {
    return false;
  }
}

// OK's purchase-confirmation notification (apiok.ru `callbacks.payment`): a GET request with its
// own param set (uid/transaction_id/transaction_time/amount/product_code/sig/...), signed with the
// same APP_SECRET as isValidSig above (one app, one secret - see the note at APP_SECRET's
// declaration). Response shape is OK-specific - JSON `true` on success (not an object), a JSON
// error object plus an `Invocation-error` header on failure. Not verified against a real captured
// OK notification yet (unlike the VK launch-params signature, which was) - check a real request
// from OK's own "Тестовый" probe before relying on this in production, the same way
// docs/vk-gotchas.md describes doing for the VK side.
function handleOkPaymentNotification(searchParams, res) {
  const params = Object.fromEntries(searchParams);

  function fail(code, msg) {
    res.writeHead(200, {"Content-Type": "application/json", "Invocation-error": String(code)});
    res.end(JSON.stringify({error_code: code, error_msg: msg, error_data: null}));
  }

  if (!isValidSig(params)) {
    return fail(1001, "CALLBACK_INVALID_SIGNATURE: invalid sig");
  }
  if (!params.uid || !params.transaction_id || !params.transaction_time || !params.amount) {
    return fail(1001, "CALLBACK_INVALID_PAYMENT: missing required field");
  }
  if (params.product_code !== ITEM_ID || Number(params.amount) !== ITEM_PRICE_OK) {
    return fail(1001, "CALLBACK_INVALID_PAYMENT: unknown item or price");
  }

  res.writeHead(200, {"Content-Type": "application/json"});
  res.end("true");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://placeholder");

  // Gate for the game page itself: Caddy's forward_auth mirrors the original request (path,
  // query, and headers, including Referer) here before deciding whether to serve the file, so
  // this checks the real entry paths rather than a dedicated one - keeps the query string intact
  // without needing Caddy placeholder tricks to re-attach it.
  if (req.method === "GET" && (url.pathname === "/vk/colorit" || url.pathname === "/vk/colorit/")) {
    const ok = isValidLaunchParams(url.searchParams) && isAcceptableReferer(req.headers.referer);
    res.writeHead(ok ? 200 : 403);
    return res.end();
  }

  // OK's purchase-confirmation notification is a *separate* channel from VK's classic scheme
  // above: a GET request (not POST), its own param set/signature secret, and its own response
  // shape - set as the app's "URL для платёжных уведомлений Одноклассников" in the dev.vk.ru
  // cabinet, distinct from the classic URL above (kept on the same process/port, just a different
  // path, since there's no reason to run a second container for one extra route).
  if (req.method === "GET" && url.pathname === "/vk/colorit-payments/ok") {
    return handleOkPaymentNotification(url.searchParams, res);
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    return res.end();
  }
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    const params = Object.fromEntries(new URLSearchParams(body));
    res.writeHead(200, {"Content-Type": "application/json"});

    if (!isValidSig(params)) {
      return res.end(JSON.stringify({error: {error_code: 10, error_msg: "Invalid signature"}}));
    }

    // VK's "Test" button in the payments cabinet sends the same notifications with "_test"
    // appended to notification_type - strip it so the sandbox probe gets the same valid
    // response as a real notification (there's no separate state to fake here).
    const notificationType = (params.notification_type || "").replace(/_test$/, "");

    // `site` tells apart a get_item lookup triggered from the VK client vs the OK client - both
    // arrive on this same classic endpoint (OK only gets its own separate channel for the purchase
    // *confirmation*, not this catalog lookup), so this is the one place that needs to answer with
    // the right currency's price for whichever platform is asking.
    if (notificationType === "get_item" && params.item === ITEM_ID) {
      const price = params.site === "ok" ? ITEM_PRICE_OK : ITEM_PRICE;
      return res.end(JSON.stringify({response: {title: ITEM_TITLE, price, item_id: ITEM_ID}}));
    }

    if (notificationType === "order_status_change" && params.status === "chargeable") {
      return res.end(JSON.stringify({response: {order_id: Number(params.order_id), app_order_id: Number(params.order_id)}}));
    }

    res.end(JSON.stringify({error: {error_code: 20, error_msg: "Unknown item or notification"}}));
  });
});

if (require.main === module) {
  server.listen(3000, () => console.log("vk-payments listening on :3000"));
}

module.exports = {isValidSig, handleOkPaymentNotification, isAcceptableReferer, isValidLaunchParams};
