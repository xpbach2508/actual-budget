# Bank-Driven Gold Price Sync Design

## Goal
Make `bank-webhook` the sole gold-price fetcher and update Actual’s `gold_current_price_per_chi` account metadata daily and on an Android Bank Listener manual refresh, without creating revaluation transactions.

## Architecture

### Price refresh service
`personal_finance` owns a single refresh service. It fetches and validates SJC sell price, records provider, price, UTC fetch time, and last error in durable service storage, then updates every open Gold account in Actual with the new price field only.

The service preserves the prior valid price if fetching or validation fails. A valid response requires a positive price from an actual numeric provider parse; hardcoded fallback values are forbidden.

### Automatic schedule
The bank-webhook process starts a dedicated daily scheduler. It runs once per day at 09:00 `Asia/Ho_Chi_Minh`, invokes the same refresh service as manual refresh, and logs success or failure. A restart must not run duplicate refreshes concurrently.

### Android manual trigger
Bank Listener adds a `Refresh gold price` button to its main Compose screen. The button uses the configured base URL and webhook secret to call an authenticated bank-webhook endpoint. The UI disables duplicate taps while loading and displays provider, price, and timestamp on success, or a safe error message on failure.

### Actual integration
Bank-webhook updates only `accounts.gold_current_price_per_chi` through Actual’s supported client/sync path. It never inserts or modifies a price-revaluation transaction. Actual’s virtual valuation UI reads the synced field and updates current Off-Budget and Net Worth presentation as designed separately.

### Actual UI cleanup
Remove the browser/Web Worker live-price lookup and its Docker/public URL candidate list from Actual. The Gold account panel retains manual price entry only as an explicit override, and its displayed price reflects synced account metadata.

## Security
The manual refresh endpoint requires the existing `X-Webhook-Secret` and optional configured Cloudflare Access service token. The endpoint returns aggregate price metadata only and does not expose Actual credentials.

## Tests
- Python tests cover valid refresh, provider failure retaining stored state, Actual account-field updates without transactions, authenticated manual endpoint, and scheduler scheduling.
- Android JVM tests cover the new WebhookClient call and UI state reducer/view model behavior.
- Actual tests verify the browser fetch IPC and URL fallbacks are removed while manual account price updates still work.
