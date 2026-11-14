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
