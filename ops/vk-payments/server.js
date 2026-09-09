const http = require("http");
const crypto = require("crypto");

const APP_SECRET = process.env.VK_APP_SECRET || "";
const ITEM_ID = "support_author";
const ITEM_TITLE = "Поддержать автора";
const ITEM_PRICE = 100; // votes ("голоса")

// VK's classic Payments API signature: md5 of every param except sig, sorted by name and
// concatenated as name=value with no separator, plus the app's secret key appended.
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
  const ts = Number(searchParams.get("vk_ts"));
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
    return host === "vk.com" || host.endsWith(".vk.com") || host === "vk.ru" || host.endsWith(".vk.ru");
  } catch {
    return false;
  }
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

    if (notificationType === "get_item" && params.item === ITEM_ID) {
      return res.end(JSON.stringify({response: {title: ITEM_TITLE, price: ITEM_PRICE, item_id: ITEM_ID}}));
    }

    if (notificationType === "order_status_change" && params.status === "chargeable") {
      return res.end(JSON.stringify({response: {order_id: Number(params.order_id), app_order_id: Number(params.order_id)}}));
    }

    res.end(JSON.stringify({error: {error_code: 20, error_msg: "Unknown item or notification"}}));
  });
});

server.listen(3000, () => console.log("vk-payments listening on :3000"));
