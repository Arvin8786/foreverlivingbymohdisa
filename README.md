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

Tests intercept Google and bot requests; they do not create production orders,
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

Only personal assistant features require a customer portal password. Guest
questions, browsing and shopping help remain open. Customer/agent portals continue
to use their existing Apps Script sessions and actions.

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

## Backend verification still required

The Apps Script code lives in the owner's editor and is absent from this repo.
The website cannot guarantee its password hashing, customer authorization,
agent/admin roles, upload safety, server pricing or atomic duplicate prevention.
See [the backend handoff](docs/apps-script-handoff.md) before making backend changes.
