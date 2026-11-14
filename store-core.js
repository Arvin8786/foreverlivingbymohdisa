/* Shared, dependency-free storefront rules. Also used by the release tests. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.StoreCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const text = value => String(value ?? '');
    const number = value => Number.parseFloat(text(value).replace(/[^0-9.\-]/g, ''));
    function category(product) {
        const explicit = product.category ?? product.Category ?? product.ProductCategory;
        if (explicit && text(explicit).trim()) return text(explicit).trim();
        const name = text(product.name ?? product.Name ?? product.ProductName).toLowerCase();
        if (/shampoo|conditioner|soap|tooth|deodorant|lips|body wash/.test(name)) return 'Personal care';
        if (/creme|cream|lotion|sunscreen|activator|gelly|first/.test(name)) return 'Skin care';
        if (/coffee|tea|tarik|malt|aloe.*(gel|nectar|peach)|honey/.test(name)) return 'Drinks & nutrition';
        return 'Supplements & wellness';
    }
    function normalizeProduct(p, index = 0) {
        const price = number(p.price ?? p.Price ?? p.retailPrice ?? p.RetailPrice ?? p.rsp);
        return {
            id: text(p.id ?? p.ID ?? p.productId ?? index + 1),
            name: text(p.name ?? p.Name ?? p.ProductName ?? 'Product'),
            price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
            image: text(p.image ?? p.Image ?? p.imageURL ?? p.ImageURL),
            benefits: text(p.benefits ?? p.Benefits), consumption: text(p.consumption ?? p.Consumption ?? p.Usage),
            category: category(p)
        };
    }
    function filterProducts(products, query = '', selected = '', sort = 'featured') {
        const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const result = products.filter(p => (!selected || p.category === selected) && terms.every(term => `${p.id} ${p.name} ${p.category} ${p.benefits}`.toLowerCase().includes(term)));
        if (sort === 'price-asc' || sort === 'price-desc') result.sort((a, b) => {
            if (a.price === null) return b.price === null ? 0 : 1;
            if (b.price === null) return -1;
            return sort === 'price-asc' ? a.price - b.price : b.price - a.price;
        });
        if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
        return result;
    }
    function relatedProducts(product, products, limit = 4) {
        const words = new Set(product.name.toLowerCase().split(/\W+/).filter(w => w.length > 3 && w !== 'forever'));
        const score = p => (p.category === product.category ? 10 : 0) + p.name.toLowerCase().split(/\W+/).filter(w => words.has(w)).length * 2;
        return products.filter(p => p.id !== product.id && score(p) > 0).sort((a, b) => score(b) - score(a) || Math.abs((a.price || 0) - (product.price || 0)) - Math.abs((b.price || 0) - (product.price || 0))).slice(0, limit);
    }
    function savedCart(cart) {
        return JSON.stringify({ version: 1, items: cart.map(p => ({ id: text(p.id), quantity: Math.min(99, Math.max(1, Math.floor(Number(p.quantity) || 1))) })) });
    }
    function restoreCart(serialized, products) {
        try {
            const data = JSON.parse(serialized);
            if (data.version !== 1 || !Array.isArray(data.items)) return [];
            const quantities = new Map();
            for (const item of data.items.slice(0, 200)) {
                const qty = Number(item.quantity);
                if (Number.isFinite(qty) && Math.floor(qty) >= 1) quantities.set(text(item.id), Math.min(99, (quantities.get(text(item.id)) || 0) + Math.floor(qty)));
            }
            return products.filter(p => p.price !== null && quantities.has(p.id)).map(p => ({ ...p, quantity: quantities.get(p.id) }));
        } catch { return []; }
    }
    function confirmedOrder(result) {
        return !!result && typeof result === 'object' && result.success !== false && result.status !== 'error' &&
            (result.success === true || result.status === 'success') && typeof result.invoiceId === 'string' && !!result.invoiceId.trim();
    }
    function normaliseShippingRules(raw) {
        if (!Array.isArray(raw)) return [];
        const num = v => number(v) || 0;
        return raw.map(r => {
            let type = text(r.type || r.RuleType || 'tiered').toLowerCase().replace(/[^a-z]/g, '');
            if (!['free', 'flatrate'].includes(type)) type = 'tiered';
            const max = num(r.maxSpend ?? r.MaxSpend);
            return { type, minSpend: num(r.minSpend ?? r.MinSpend), maxSpend: max > 0 ? max : 999999999, charge: type === 'free' ? 0 : Math.max(0, num(r.charge ?? r.Charge)) };
        }).sort((a, b) => a.minSpend - b.minSpend);
    }
    function calcShipping(subtotal, rules) {
        if (!rules.length) return 0;
        const amount = Math.round(Number(subtotal) * 100) / 100;
        const inRange = r => amount >= r.minSpend && amount <= r.maxSpend;
        const promos = rules.filter(r => r.type !== 'tiered' && inRange(r));
        if (promos.length) return Math.min(...promos.map(r => r.charge));
        const tiers = rules.filter(r => r.type === 'tiered');
        if (!tiers.length) return 0;
        return (tiers.filter(inRange).pop() || tiers.filter(r => amount > r.maxSpend).pop() || tiers[0]).charge;
    }
    function productPath(product) { return `products/p-${encodeURIComponent(product.id).replace(/~/g, '%7E').replace(/%/g, '~')}/`; }
    return { normalizeProduct, filterProducts, relatedProducts, savedCart, restoreCart, confirmedOrder, normaliseShippingRules, calcShipping, productPath };
});
