# Apps Script backend checks and compatible contracts

The backend source is maintained only in the Apps Script editor. No backend code,
Sheets permissions, credentials, password scheme or deployments were changed.
Review the actual source before adapting these requirements; do not replace it
with guessed handlers or copy live customer data into this repository.

## Order confirmation and deduplication

`logInitialOrder` must return either `{ success: true, invoiceId: "..." }` or
`{ status: "success", invoiceId: "..." }` only after the order is durably stored.
Optional server totals and invoice PDF remain supported. Error/ambiguous responses
must not claim success. The frontend keeps the cart if no confirmation is returned.

The additive `data.requestId` identifies an identical retry within the current
browser page. Store its result server-side and return the same invoice for a
repeat request. Use an atomic lock around checking the key and writing the order;
compare/validate payloads so the same key cannot overwrite an unrelated order.
Define a retention/cleanup policy and do not expose order details solely by key.
The frontend flag alone cannot prevent duplicates across tabs, devices or restarts.

## Prices, permissions and privacy

- Re-read products by stable ID and calculate quantity, price, shipping, discounts
  and points from trusted records; never trust client totals/minimum prices.
- Check customer sessions and derive customer identity from them for every order,
  rewards, profile and document action. A supplied PAC/email/invoice ID is not proof
  of ownership. Test attempts to access another customer's orders/documents.
- Enforce agent/manager/admin scope on the server, including order reassignment,
  price overrides, commissions and customer lists. Hidden buttons are not controls.
- Inspect password storage and registration/account-claim flows. Require strong
  password hashing, verified account ownership, rate limits and expiring sessions.
  Do not log passwords, session tokens or full customer records.
- Validate uploads server-side for type, size, access permissions and filenames.
- Use explicit cancellation/refund statuses rather than mapping them to Processed.

## Verification with a dedicated test account

After source review, test an ordinary customer, another customer, an agent and an
admin. Verify ownership/role denials, incorrect passwords, expired sessions,
server-repriced manipulated carts, simultaneous/repeated order submissions and
payment versus order status. Use test records and explicit confirmation for writes.
The browser tests in this repo simulate these APIs; they cannot prove backend
security or production data integrity.
