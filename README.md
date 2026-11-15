# Forever Living by Muhd Isa

Static storefront, customer portal and agent portal backed by the existing Google
Apps Script deployment. `config.js` is the single source of its URL. No production
credentials or customer records belong in this repository.

## Develop and verify

Use Node.js 24. Install exactly the locked tools with `npm ci`. The browser has no
runtime npm dependencies: all storefront scripts are served as ordinary JS.

- `npm test`: price/search/related-product/cart/shipping rules and static SEO build.
- `npx playwright install chromium`, then `npm run test:browser`: mocked storefront,
  checkout, customer login, agent UI, retries, sanitizer and mobile regressions.
- `node tools/test-server.cjs`: local site at port 4173.
- For a locally installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its
  executable. CI installs the Playwright-managed browser instead.
- `npm run images`: refresh optimized assets after replacing original images.

Tests intercept account and catalog requests; they do not create production orders,
send messages, or verify the deployed backend's authorization. The normal-agent
UI test checks visible controls and session propagation, not server permissions.

## Storefront features and data

The catalog accepts `category`, `Category` or `ProductCategory`. Without an explicit
category, conservative name-based groups are used; add real categories in the
sheet for better filters and recommendations. Product IDs must remain stable.
Products without a positive valid price cannot be purchased from the website.
Search covers product codes, names, categories and benefits. Related products use
category/name relevance and price proximity instead of spreadsheet row order.

Cart storage (`fl-cart-v1`) contains only product IDs and quantities. On refresh,
the live catalog supplies current prices; removed or unavailable items are dropped.
Cart contents synchronize between tabs. Storage failures do not block shopping.
No customer addresses, emails, tokens or passwords are written to this cart store.

Checkout requires `success: true` or `status: "success"` plus a nonempty string
`invoiceId` before clearing the cart. The response may also supply `totalAmount`,
`shippingFee` and `invoicePdf: { base64, filename }`. A dedicated confirmation page
shows the reference, server totals, payment instructions, invoice download and
account link. An order confirmation does not imply payment confirmation.
Unconfirmed/network-failed submissions keep the cart and advise checking My Account
before retrying. Concurrent submits in one tab are blocked. An additive `requestId`
is reused for identical retries in the same page; the server must honor it for
cross-request duplicate protection. No unsafe automatic mutation retries are used.

Guest browsing, checkout and general assistant questions remain open. Personal
account features require the customer portal password through one shared login.
See the shared-session behavior below. Agent authentication remains separate.

Sheet HTML is sanitized by an allowlist that preserves basic paragraphs, lists,
emphasis and HTTP(S)/email links. Scripts, images, embeds, event handlers, unsafe
protocols and arbitrary attributes are removed. Existing original image filenames
remain available so links in Sheets and external sites keep working. `image-map.js`
uses compressed, content-deduplicated WebP assets for same-origin catalog images.

## Search and social sharing build

`npm run build` reads **public catalog data only** from the URL in `config.js` and
creates `_site/` with crawler-readable product pages, product JSON-LD, canonical
URLs, social cards, directory, sitemap and robots file. It also copies the live
shop/portals/assets. It fails on unavailable/invalid catalogs instead of deploying
an empty directory. No customer-login or order endpoints are called by the build.

Set `PUBLIC_SITE_URL` to the deployed site URL, including any repository path and
trailing slash. The default is the standard GitHub Pages URL for this repository.
Use this variable for a custom domain. For offline validation, set `CATALOG_FILE`
to a local public catalog JSON fixture; do not commit customer data.

Live product links (`index.html?product=ID`) work on static hosting and legacy
`#product/ID` links remain supported. Static product pages display a catalog
snapshot and send shoppers back to the live shop for current prices/checkout.
Prices must still be checked by the backend when an order is submitted.

The GitHub Actions workflow runs tests on pushes/PRs, builds the full public site
on main and uploads a Pages artifact. Existing branch-based hosting still serves
the upgraded root files, but **static product pages and sitemap require deploying
`_site/`**. To publish the complete build on GitHub Pages, set Pages source to
**GitHub Actions**, then set repository variable `PUBLISH_PAGES=true` or manually
run the workflow with Publish enabled. For another static host, publish `_site/`.
No hosting plan is upgraded or paid AI/WhatsApp service added by this change.

## Shared customer sign-in

`customer-auth.js` owns the Apps Script customer session used by the storefront,
customer portal and assistant. Login in `customer.html?login=1` returns to
`index.html`; a signed-in header shows **My profile** and **Logout**. My profile
opens `customer.html#profile`, with the existing orders/rewards/profile interface.
Guest assistant requests for private data link to this same login and resume the
chosen account action after sign-in. There is no second assistant password form.

The browser remembers the opaque token, its endpoint and an expiry for up to six
hours, matching the existing Apps Script session lifetime. It validates that token
with `getCustomerSession` before displaying account details on a returning visit.
The server can expire a session earlier. Only the token metadata is persisted in
localStorage (sessionStorage fallback); passwords and customer profiles are not
persisted. This is a browser-readable bearer token, not an HttpOnly cookie. Sign
out on shared devices. Logout clears browser state, account-owned checkout fields
and private chat context across open tabs, and attempts server revocation.

Signed-in checkout sends that same token and uses the saved customer details,
matching the backend's existing behavior. Update My profile before ordering to
change those details. Guest checkout sends no customer token. A temporary session
validation outage preserves the remembered token and blocks checkout until the
customer retries validation or signs out; it does not silently change an account
order into a guest order. Late private responses from another session are dropped.

The backend must include [the session helper](apps-script/customer-session.gs) and
its authenticated `getCustomerSession` dispatch case, documented in
[Apps Script deployment notes](apps-script/README.md). The owner deploys the full
project in the Apps Script editor. Update the existing deployment to keep
`config.js` unchanged. This website change needs no Render redeployment.

## Backend verification still required

The Apps Script code lives in the owner's editor and is absent from this repo.
The website cannot guarantee its password hashing, customer authorization,
agent/admin roles, upload safety, server pricing or atomic duplicate prevention.
See [the backend handoff](docs/apps-script-handoff.md) before making backend changes.

## Customer order names and payment display

The customer portal displays names/quantities rather than legacy `SKUxQty` lists.
Existing responses are resolved through the public catalog; saved `itemDetails`
names take precedence. Unresolved historical names are labelled explicitly.
Active unpaid orders show **Pending payment** regardless of delivery progress;
receipts and earned points are shown only after the API confirms payment.
Cancelled/refunded orders retain their terminal status. Reopen My Orders or refresh
the page after an administrator updates payment in Sheets.

The owner-supplied Apps Script has a legacy paid-status fallback. The optional
[customer orders replacement](apps-script/README.md) exposes `PaymentStatus`
explicitly and resolves unpublished/historical product names from saved carts and
ProductMaster. Applying this replacement requires updating the existing Apps
Script deployment; the frontend GitHub deployment does not change that service.

## Grounded assistant answers

`assistant-knowledge.js` contains the same versioned, dependency-free shop rules as
`knowledge.js` in the bot repository. The website answers product questions using
its loaded public catalog, preserving the actual Benefits/Consumption and price
fields. Similar products require selection; missing details are disclosed rather
than replaced with medical claims, purity claims, stock guarantees or guesses.
These answers use local rules and published data; no paid model/API is used.

`assistant-help.js` fetches current authenticated orders for private follow-ups.
An explicit order reference must belong to that returned account; multiple orders
require selection. Context is in memory and is cleared with the chat session.
Cancellation, return/refund and amendment answers explain the limitation and open
a WhatsApp draft containing only the order reference and request type. The
customer reviews/sends it and the shop must confirm it. No mutation endpoint or
automatic WhatsApp send is used. A profile edit does not amend an existing order.

Payment help distinguishes invoice/order confirmation from verified payment and
warns against paying twice while verification is pending. Invoices and receipts
use the authenticated `getCustomerDocument` action; unpaid receipts are not
requested. Customer requests go directly to the existing Apps Script service
through the shared session; the website no longer needs a separate Render login.
Festival foreground effects are lowered while chat is open so they do not cover
messages. General shop help remains available even if Render is asleep or the
public catalog is unavailable; factual product/order answers require their data.

### Detailed order conversations

Selecting an order immediately fetches and shows its recorded summary. Follow-up
questions resolve order items, quantities, totals, historical shipping charges,
date, delivery address and item prices without requiring an exact menu phrase.
Examples include “what did I buy?”, “what are the items ordered?”, “how many?”,
“how much was shipping?”, “when was it placed?” and “tell me more”. Short follow-ups
use the current order/product focus; explicit product names and order references
override it. Clarification lists also accept “the second one”.

Only fields returned for the authenticated order are used. Missing quantities,
amounts or addresses are disclosed. A current catalog price is never used as a
historical price, and a current profile address is never used as an order address.
When unit prices are absent, the invoice remains the source for that breakdown.
Ordered products can be selected for their current published benefits/usage/price;
that switches the conversation to product information rather than order totals.
