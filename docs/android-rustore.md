# Android (Capacitor) build for RuStore

Third build target next to Yandex and VK: the static export (`out/`) is bundled into an APK/AAB by
Capacitor, so the game is fully offline. Only ads and purchases need the network.

## Build
```bash
npm run build:android          # NEXT_PUBLIC_ANDROID=true next build && next export && cap sync android
cd android
export JAVA_HOME=<JDK 21>      # Gradle 8.14 / Capacitor 8 need JDK 21 (JDK 25 doesn't work)
./gradlew assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease        # signed AAB (needs android/keystore.properties, see below)
```
`NEXT_PUBLIC_ANDROID=true` drops the Yandex Games SDK `<script>` and switches `lib/ads.ts` /
`lib/support.ts` to their Android branches (`lib/android.ts`).

## Before the first release (not automatable)
1. **Package name**: `ru.sarville.colorit` (`capacitor.config.ts`, `android/app/build.gradle`,
   Java package). Change *before* the first upload - it can't change afterwards.
2. **Signing key**: `keytool -genkeypair -v -keystore colorit-release.jks -alias colorit -keyalg RSA
   -keysize 2048 -validity 10000`, then `android/keystore.properties` with `storeFile`,
   `storePassword`, `keyAlias`, `keyPassword`. Back the .jks up somewhere safe - losing it means no
   more updates for the app.
3. **RuStore Console**: create the app, note its "ID приложения" -> `rustoreConsoleAppId` in
   `android/gradle.properties`. Submit the *monetization application* for the IE (ИП) - Pay SDK
   payments don't work until it's approved.
4. **Products** (Console -> Monetization), ids must match `lib/support.ts`:
   - `support_author` - NON_CONSUMABLE, ad-free entitlement + thank-you animation, ~100 RUB
   - `support_more` - CONSUMABLE, repeatable pure donation, ~100 RUB
   Use test payments for your account to try the flow before publishing.
5. **Ads** (Yandex РСЯ cabinet): add the app (RuStore link), create one banner + one interstitial
   unit, then build with `NEXT_PUBLIC_YAN_BANNER_ID` / `NEXT_PUBLIC_YAN_INTERSTITIAL_ID` set to the
   real `R-M-...` ids. Unset = Yandex demo units, which never pay.
6. Launcher icon / splash (currently Capacitor's defaults), 512x512 store icon, screenshots, age
   rating, privacy policy URL (ads + payments collect data; `setUserConsent(true)` is passed to the
   ads SDK unconditionally).

## How purchases work
- RuStore Pay SDK 10.5.0 (`ru.rustore.sdk:pay`, RuStore's own Maven repo, added in
  `android/app/build.gradle`). Bridge: `RuStorePayPlugin.java` -> `lib/rustorePay.ts`.
- `support_author` bought -> `adsDisabled` saved locally. On every launch `restorePurchases()`
  re-derives the flag from `getPurchases` (survives reinstall); offline it keeps the local flag.
- Once ads are off, the support button buys `support_more`, acknowledged right away
  (`updateAcknowledgementState`); un-acknowledged ones are swept at next launch.
- Not verified on a device against a real console app: which `status` values a finished one-step
  purchase reports (code accepts PAID or CONFIRMED) - check with a test payment.
- Billing SDK (`billingclient`) is dead since 2026-08-01; don't use `capacitor-rustore-billing`.
- Self-employed accounts can't use RuStore payments (since 2026-02-01) - this is why it needs an ИП.

## Findings / gotchas (session 2026-09-24)
- **Gradle/JDK**: JDK 21 only (JDK 25 breaks Gradle 8.14). Stack: AGP 8.13, minSdk 24, target/compileSdk 36.
- **Package name and signing key are irreversible** - see "Before the first release". Without
  `keystore.properties`, `assembleRelease` silently makes an *unsigned* APK.
- **Pay SDK from Java**: it's a Kotlin API; optional params are nullable and the `$default`
  overloads are invisible from Java, so pass `null` explicitly. Read the API straight from the AAR
  (rustore.ru/help returns 429 to scripts).
- **Deeplink return from banking apps (SBP/SberPay)** needs all three: VIEW intent-filter with
  scheme `coloritpay`, `sdk_pay_scheme_value` meta-data, and `proceedIntent()` in both `onCreate`
  (only when `savedInstanceState == null`) and `onNewIntent` (`launchMode=singleTask`).
- `console_app_id_value` comes from `rustoreConsoleAppId` (`gradle.properties`, default `0` - must
  be replaced before release).
- **Yandex demo ad units never pay** - real `R-M-...` ids must be passed via
  `NEXT_PUBLIC_YAN_BANNER_ID` / `NEXT_PUBLIC_YAN_INTERSTITIAL_ID` at build time.
- Interstitial is preloaded (`load` -> ready flag -> `show`) and reloaded on dismiss/fail; audio is
  paused on `interstitialAdShown`. `setUserConsent(true)` is unconditional - privacy policy needed.
- The Yandex `<script>` is not emitted in the Android build (`Header.tsx`) - same handshake problem
  as the VK build.
- Back button: SPA history via `webView.goBack()`; swallowed at the root so the app never closes.
- Purchase order: grant first, acknowledge second (crash-safe, retried by `restorePurchases()`).
- API renames from this work: `restoreYandexPurchases` -> `restorePurchases`,
  `purchaseSupportAuthor(alreadySupported)`.
- Two lockfiles now (yarn.lock + untracked package-lock.json) - `build:android` uses `npm run`.
- None of the Android work is committed yet (working tree only) and there is no `sessions/` entry.
