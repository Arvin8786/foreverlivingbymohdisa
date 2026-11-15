# Customer order history update

This small replacement matches the Apps Script source supplied by the owner.
The uploaded full project is not committed, since it may contain private settings.

The website update works with the currently deployed API: it resolves legacy SKU
lists using the public catalog and uses the server's boolean `paid` flag. It does
not infer payment from delivery progress. If the product is missing from the public
catalog, it shows “Product name unavailable” rather than inventing a name.

For complete historical names, including unpublished products, apply this patch:

1. Open the existing Apps Script project.
2. Replace the existing **getCustomerOrders(pac)** function with the function in
   `customer-orders.gs`. Do not leave duplicate definitions or replace the whole
   project with this snippet. Keep the authenticated doPost dispatcher unchanged.
3. Save, then use **Deploy → Manage deployments → Edit → New version → Deploy**
   to update the existing web app without changing its URL.

The replacement preserves saved names from `OrderLog.Cart_Data`, falls back to
`ProductMaster` SKU/ProductName (including unpublished rows), and keeps SKU IDs
out of the displayed item summary. Payment verification comes from OrderLog's
**PaymentStatus** column, not a delivery status or uploaded payment proof. Until
that field is Paid/Approved (or another existing recognized paid value), the
customer sees **Pending payment**. Cancelled/refunded orders retain their status.
After verification, the existing delivery stages and receipt availability apply.
No payment records are changed by this read-only endpoint.

The existing source's `onOrderEdit`/`confirmPayment_` workflow handles admin payment
updates in Sheets. This patch does not change triggers, passwords, pricing or
server authorization. The editor deployment still has to be done by the owner;
a GitHub push alone does not update Apps Script.


## Shared customer session

`customer-session.gs` is an additive helper for the existing customer session
implementation (`requireCustomerSession_` and `getCustomerRow_`). Add the function
to the existing project, then add this case to the Customer Portal switch in
`doPost`, alongside `getCustomerOrders`:

```js
case 'getCustomerSession': response = getCustomerSession(data.data); break;
```

The helper derives the customer ID from the validated token. It returns only the
safe profile fields used by the storefront; passwords, password hashes and raw
sheet rows are excluded. It does not extend or renew the existing six-hour
CacheService session. Invalid/expired tokens return the existing SESSION_EXPIRED
error through the dispatcher.

Keep the earlier order-history replacement and all other project code. Save and
update the existing deployment with **Manage deployments → Edit → New version →
Deploy**. Reusing the deployment keeps the URL in `config.js` unchanged. The full
owner-supplied project remains outside version control.

## Invoice and receipt branding

`transaction-documents.gs` contains replacement PDF functions and three new
helpers. It relies on the existing company settings, payment QR, folder IDs and
authenticated customer/agent dispatcher; it is **not a complete Code.gs**.
Use the complete updated Code.gs supplied separately, or replace existing
same-named declarations with this snippet and add its new declarations once.
Do not append duplicate logo constants or function definitions.

This update:

- Embeds the repository's exact `FL.jpg` next to the business name on invoices
  and receipts. Its contents are PNG, so the image MIME type is detected from
  its bytes rather than its filename or HTTP Content-Type.
- Prints **Forever Living by Muhd Isa Eshop** as a clickable link to the storefront.
- Requires a verified **OrderLog.PaymentStatus** before serving a receipt.
  `Status=Completed` or `DeliveryStatus=Delivered` alone does not qualify.
- Tags newly generated files with a template version in Drive metadata. Existing
  PDFs requested through customer/agent APIs or the spreadsheet admin download
  dialog are regenerated once when their template is old. New links are saved
  to InvoiceURL/FinalReceiptURL; previous issued files remain in Drive.
- Uses stored historical amounts. Missing line prices are labelled “Not recorded”
  rather than replaced with today's catalog prices. A branding refresh of an
  existing receipt does not award points again or change its payment date.

After saving the complete project, use **Deploy → Manage deployments → Edit →
New version → Deploy** on the existing deployment. Keep the current `config.js`
URL. A GitHub push cannot update the Apps Script PDF generator.

After an administrator verifies payment, the customer opens **My profile → My
Orders → Refresh orders → Download receipt**. The existing invoice/receipt
triggers remain supported; no new paid service or Render deployment is needed.
