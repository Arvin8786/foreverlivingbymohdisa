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
