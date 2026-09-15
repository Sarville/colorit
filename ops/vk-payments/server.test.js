// Minimal self-check for the sig formula and the OK confirmation route's branches - no framework,
// run with `node ops/vk-payments/server.test.js`. Not wired into CI (there is none for ops/, see
// ops/README.md); run by hand after touching this file, same as `node --check`.
const assert = require("assert");
const crypto = require("crypto");

const SECRET = "test-app-secret";
process.env.VK_APP_SECRET = SECRET;
const {isValidSig, handleOkPaymentNotification} = require("./server.js");

function sign(params) {
  const joined = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("");
  return crypto.createHash("md5").update(joined + SECRET).digest("hex");
}

// isValidSig: matches a manually computed md5, rejects a tampered param.
{
  const params = {a: "1", b: "2"};
  const sig = sign(params);
  assert.strictEqual(isValidSig({...params, sig}), true);
  assert.strictEqual(isValidSig({...params, sig, a: "9"}), false);
}

function fakeRes() {
  return {status: null, headers: null, body: null,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; }};
}

// handleOkPaymentNotification: accepts a correctly signed, matching purchase (signed with the same
// APP_SECRET as the VK channel - OK has no secret of its own here); rejects bad sig, missing
// fields, and a mismatched product/price.
{
  const good = {uid: "1", transaction_id: "t1", transaction_time: "2026-09-15 12:00:00",
    amount: "100", product_code: "support_author"};
  const res = fakeRes();
  handleOkPaymentNotification(new URLSearchParams({...good, sig: sign(good)}), res);
  assert.strictEqual(res.body, "true");

  const badSig = fakeRes();
  handleOkPaymentNotification(new URLSearchParams({...good, sig: "wrong"}), badSig);
  assert.strictEqual(badSig.headers["Invocation-error"], "1001");

  const missing = fakeRes();
  const {amount, ...noAmount} = good;
  handleOkPaymentNotification(new URLSearchParams({...noAmount, sig: sign(noAmount)}), missing);
  assert.strictEqual(JSON.parse(missing.body).error_code, 1001);

  const wrongPrice = {...good, amount: "1"};
  const wrongPriceRes = fakeRes();
  handleOkPaymentNotification(new URLSearchParams({...wrongPrice, sig: sign(wrongPrice)}), wrongPriceRes);
  assert.strictEqual(JSON.parse(wrongPriceRes.body).error_code, 1001);
}

console.log("ok");
