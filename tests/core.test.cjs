const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Core = require('../store-core');
const { build } = require('../tools/build-site.cjs');
const products = [
    { id: '1', name: 'Aloe cream', price: 40, category: 'Skin care', benefits: 'Aloe moisturiser' },
    { id: '2', name: 'Aloe lotion', price: 20, category: 'Skin care' },
    { id: '3', name: 'Herbal tea', price: 15, category: 'Drinks' },
    { id: '4', name: 'Missing price', price: null, category: 'Drinks' }
];
test('prices require a positive finite value, preserving valid currency values', () => {
    assert.equal(Core.normalizeProduct({ Price: 'RM 95.50' }).price, 95.5);
    for (const price of [undefined, 'invalid', 0, -5]) assert.equal(Core.normalizeProduct({ price }).price, null);
});
test('search combines terms, category and stable price sorting without changing source', () => {
    assert.deepEqual(Core.filterProducts(products, 'aloe', 'Skin care', 'price-asc').map(p => p.id), ['2', '1']);
    assert.deepEqual(Core.filterProducts(products, '', 'Drinks', 'price-desc').map(p => p.id), ['3', '4']);
    assert.deepEqual(products.map(p => p.id), ['1', '2', '3', '4']);
});
test('related products use category/relevance rather than unrelated following rows', () => {
    assert.deepEqual(Core.relatedProducts(products[0], products).map(p => p.id), ['2']);
});
test('saved cart contains only IDs/quantities and restores current catalog prices', () => {
    const encoded = Core.savedCart([{ ...products[0], quantity: 2, password: 'do-not-save', customerEmail: 'private' }]);
    assert.deepEqual(JSON.parse(encoded).items, [{ id: '1', quantity: 2 }]);
    const restored = Core.restoreCart(encoded, [{ ...products[0], price: 50 }]);
    assert.equal(restored[0].price, 50); assert.equal(restored[0].quantity, 2);
    assert.equal(Core.restoreCart(encoded, []).length, 0);
});
test('corrupt carts, unavailable prices and invalid quantities cannot create purchases', () => {
    assert.deepEqual(Core.restoreCart('broken', products), []);
    assert.deepEqual(Core.restoreCart(JSON.stringify({ version: 1, items: [{ id: '4', quantity: 5 }, { id: '1', quantity: -2 }] }), products), []);
});
test('checkout requires positive confirmation and an invoice reference', () => {
    for (const result of [{}, null, [], { success: true }, { invoiceId: 'INV1' }, { status: 'error', invoiceId: 'INV1' }, { success: false, status: 'success', invoiceId: 'INV1' }]) assert.equal(Core.confirmedOrder(result), false);
    assert.equal(Core.confirmedOrder({ success: true, invoiceId: 'INV1' }), true);
    assert.equal(Core.confirmedOrder({ status: 'success', invoiceId: 'INV1' }), true);
});
test('shipping handles boundaries, gaps and promotional overrides consistently', () => {
    const rules = Core.normaliseShippingRules([{ MinSpend: 0, MaxSpend: 99.99, Charge: 10 }, { MinSpend: 100, Charge: 0 }]);
    assert.equal(Core.calcShipping(99.99, rules), 10); assert.equal(Core.calcShipping(100, rules), 0);
    const promo = Core.normaliseShippingRules([{ MinSpend: 0, Charge: 15 }, { RuleType: 'FlatRate', MinSpend: 50, MaxSpend: 100, Charge: 5 }]);
    assert.equal(Core.calcShipping(60, promo), 5); assert.equal(Core.calcShipping(101, promo), 15);
});
test('static build emits crawler-visible metadata, safe content, sitemap and checkout links', async () => {
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'fl-build-'));
    try {
        const source = { status: 'success', products: [{ id: '../unsafe', name: '<script>bad</script>', Price: 'RM 25', benefits: 'Details', image: 'javascript:bad' }] };
        await build({ catalog: source, siteUrl: 'https://example.com/shop/', outDir: out });
        const product = Core.normalizeProduct(source.products[0]);
        const page = await fs.readFile(path.join(out, Core.productPath(product), 'index.html'), 'utf8');
        assert.match(page, /application\/ld\+json/); assert.match(page, /&lt;script&gt;bad/);
        assert.doesNotMatch(page, /<script>bad|src="javascript:/);
        assert.match(page, /index.html\?product=/); assert.match(page, /"priceCurrency":"MYR"/);
        assert.match(await fs.readFile(path.join(out, 'sitemap.xml'), 'utf8'), /products\/p-/);
        assert.match(await fs.readFile(path.join(out, 'robots.txt'), 'utf8'), /Disallow: \/shop\/customer.html/);
        assert.match(await fs.readFile(path.join(out, 'index.html'), 'utf8'), /https:\/\/example.com\/shop\/assets\/social.jpg/);
        assert.equal((await fs.stat(path.join(out, 'assets/logo.webp'))).size < 20000, true);
    } finally { await fs.rm(out, { recursive: true, force: true }); }
});
test('invalid catalog build fails without publishing empty product pages', async () => {
    await assert.rejects(() => build({ catalog: { status: 'error' }, siteUrl: 'https://example.com/' }), /Catalog response/);
});

test('customer history resolves legacy SKUs and preserves saved historical names', () => {
    assert.deepEqual(Core.customerOrderItems({ items: '1x2, 3X1' }, products), [{ name: 'Aloe cream', quantity: 2 }, { name: 'Herbal tea', quantity: 1 }]);
    assert.deepEqual(Core.customerOrderItems({ itemDetails: [{ id: '1', name: 'Original cream name', quantity: 3 }] }, products), [{ name: 'Original cream name', quantity: 3 }]);
    assert.deepEqual(Core.customerOrderItems({ items: 'REMOVEDx2' }, products), [{ name: 'Product name unavailable', quantity: 2 }]);
});
test('payment must be verified before fulfilment stages or a paid receipt are shown', () => {
    for (const status of ['Processed', 'Paid', 'Awaiting Shipment', 'On the Way', 'Delivered']) {
        assert.equal(Core.customerOrderStatus({ status, paid: false }), 'Pending payment');
    }
    assert.equal(Core.customerOrderStatus({ status: 'Processed', paid: true }), 'Paid');
    assert.equal(Core.customerOrderStatus({ status: 'On the Way', paid: true }), 'On the Way');
    assert.equal(Core.customerOrderStatus({ status: 'Cancelled', paid: false }), 'Cancelled');
    assert.equal(Core.customerOrderStatus({ status: 'Refunded', paid: true }), 'Refunded');
    assert.equal(Core.paymentVerified({ paid: 'false' }), false);
    assert.equal(Core.paymentVerified({ paid: true, paymentStatus: 'Unpaid' }), false);
    assert.equal(Core.paymentVerified({ paymentStatus: 'Paid' }), true);
});

test('Apps Script patch returns names and pending payment only for the authenticated customer', async () => {
    const vm = require('node:vm');
    const columns = ['PAC', 'InvoiceID', 'Timestamp', 'ItemsPurchased', 'Cart_Data', 'PaymentStatus', 'Status', 'DeliveryStatus', 'TotalAmount', 'ShippingFee', 'SpecialRemarks', 'PointsEarned'];
    const h = Object.fromEntries(columns.map((name, i) => [name, i + 1]));
    const row = values => columns.map(name => values[name] ?? '');
    const orderRows = [columns,
        row({ PAC: 'C1', InvoiceID: 'PENDING', ItemsPurchased: 'HIDDENx2', PaymentStatus: 'Unpaid', Status: 'Completed', DeliveryStatus: 'Delivered', TotalAmount: 30, PointsEarned: 20 }),
        row({ PAC: 'C1', InvoiceID: 'PAID', Cart_Data: JSON.stringify([{ id: 'OLD', name: 'Historical name', quantity: 1 }]), PaymentStatus: 'Paid', Status: 'Processed', TotalAmount: 10 }),
        row({ PAC: 'OTHER', InvoiceID: 'PRIVATE', ItemsPurchased: 'HIDDENx3', PaymentStatus: 'Paid' })];
    const sheets = { OrderLog: { getDataRange: () => ({ getValues: () => orderRows }) }, ProductMaster: { getDataRange: () => ({ getValues: () => [['SKU', 'ProductName', 'IsPublished'], ['HIDDEN', 'Retired product', false]] }) } };
    const context = vm.createContext({ SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] }) }, SHEET_ORDER_LOG: 'OrderLog', SHEET_PRODUCT_MASTER: 'ProductMaster', ORDER_COLS: columns,
        ensureHeaders_: () => h, getColumnIndexes: () => ({ SKU: 1, ProductName: 2 }), sameId_: (a, b) => a === b,
        isPaidValue_: value => /^(paid|approved|completed|yes|true)$/i.test(value),
        customerStatus_: () => 'Paid', parseMoney_: value => Number(value) || 0, formatDateSafe_: () => 'Today' });
    vm.runInContext(await fs.readFile(path.join(__dirname, '../apps-script/customer-orders.gs'), 'utf8'), context);
    const result = JSON.parse(JSON.stringify(context.getCustomerOrders('C1')));
    assert.equal(result.orders.length, 2);
    const pending = result.orders.find(o => o.invoiceId === 'PENDING');
    assert.equal(pending.items, 'Retired product × 2'); assert.equal(pending.status, 'Pending payment'); assert.equal(pending.paid, false); assert.equal(pending.points, 0);
    assert.equal(result.orders.find(o => o.invoiceId === 'PAID').items, 'Historical name × 1');
    assert.equal(result.stages[0], 'Pending payment');
});

test('assistant knowledge separates product variants and avoids unsupported operational claims', () => {
    const knowledge = require('../assistant-knowledge');
    assert.equal(knowledge.intent('can i cancel this order ?'), 'cancel');
    assert.match(knowledge.answer('I already paid').answer, /do not pay again/);
    assert.match(knowledge.answer('delivery time').answer, /not|cannot|ask/i);
    assert.equal(knowledge.intent('can aloe cure diabetes'), 'health');
    assert.deepEqual(knowledge.productMatches('benefits of aloe vera gel', [{ id: '1', name: 'Forever Aloe Vera Gel' }, { id: '2', name: 'Forever Aloe Vera Gelly' }]).map(p => p.id), ['1']);
});

test('shared-session Apps Script endpoint derives the profile from its token and excludes password fields', async () => {
    const vm = require('node:vm');
    const context = vm.createContext({ requireCustomerSession_: data => { if (data.token !== 'valid') throw new Error('SESSION_EXPIRED'); return 'C1'; }, getCustomerRow_: pac => ({ pac, name: 'Customer', email: 'customer@example.com', phone: '123', address: 'Address', points: 10, password: 'must-not-be-returned' }) });
    vm.runInContext(await fs.readFile(path.join(__dirname, '../apps-script/customer-session.gs'), 'utf8'), context);
    const result = JSON.parse(JSON.stringify(context.getCustomerSession({ token: 'valid', pac: 'OTHER' })));
    assert.equal(result.customer.pac, 'C1'); assert.equal(result.customer.password, undefined);
    assert.throws(() => context.getCustomerSession({ token: 'invalid' }), /SESSION_EXPIRED/);
});
