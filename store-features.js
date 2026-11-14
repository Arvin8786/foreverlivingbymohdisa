/* Catalog discovery, account information and checkout presentation. */
function buildCatalogControls() {
    const host = document.getElementById('catalog-controls');
    if (host.querySelector('input')) return;
    const categories = [...new Set(products.map(p => p.category))].sort();
    host.innerHTML = `<div class="catalog-heading"><span class="section-eyebrow">THE COLLECTION</span><h2>Find your everyday favourites.</h2><p>Explore our products and choose what fits your routine.</p></div>
        <div class="catalog-toolbar"><label>Search products<input type="search" id="catalog-search" placeholder="Name, category or product code" autocomplete="off"></label>
        <label>Category<select id="catalog-category" aria-label="Category"><option value="">All categories</option>${categories.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
        <label>Sort by<select id="catalog-sort" aria-label="Sort by"><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option></select></label>
        <button class="btn btn-secondary" type="button" id="catalog-reset">Reset</button></div>`;
    host.querySelector('input').addEventListener('input', applyCatalogFilters);
    host.querySelectorAll('select').forEach(select => select.addEventListener('change', applyCatalogFilters));
    host.querySelector('button').addEventListener('click', () => {
        host.querySelector('input').value = ''; document.getElementById('catalog-category').value = ''; document.getElementById('catalog-sort').value = 'featured'; applyCatalogFilters();
    });
}
function applyCatalogFilters() {
    const result = StoreCore.filterProducts(products, document.getElementById('catalog-search')?.value || '', document.getElementById('catalog-category')?.value || '', document.getElementById('catalog-sort')?.value || 'featured');
    renderProducts(result, catalogTag);
    const count = document.getElementById('catalog-count');
    if (count) count.textContent = `${result.length} of ${products.length} products`;
    if (!result.length) document.getElementById('product-list-container').innerHTML = '<div class="catalog-empty"><h3>No matches yet.</h3><p>Try another name, product code or category.</p></div>';
}
function renderRewardsPage(rules) {
    const host = document.getElementById('rewards-content'); if (!host) return;
    const rate = Number(rules?.pointsPerRm);
    host.innerHTML = `<span class="section-eyebrow">A LITTLE THANK YOU</span><h2>More to enjoy with every order.</h2>
        <p>Sign in to your customer account to see your reward balance and points history.</p>
        <div class="rewards-steps"><article><span>01</span><h3>Shop your favourites</h3><p>Use the same email on your orders so purchases can be linked to your account.</p></article><article><span>02</span><h3>Follow your points</h3><p>${Number.isFinite(rate) && rate > 0 ? `Your current earning rate is ${esc(rate)} points per RM1. Check your account for eligible purchases and adjustments.` : 'Your account shows the current earning rate, points earned and adjustments.'}</p></article><article><span>03</span><h3>Check your account</h3><p>See the balance and history recorded by the shop. Ask us about current redemption options.</p></article></div>
        <div class="rewards-actions"><a class="btn btn-primary" href="customer.html">View my rewards</a><a class="btn btn-secondary" href="customer.html#register">Set up my account</a><button class="btn btn-secondary" type="button" onclick="showTab('products')">Browse products</button></div>`;
}
function renderOrderConfirmation(result) {
    const host = document.getElementById('order-confirmation-view');
    const total = Number(result.totalAmount); const shipping = Number(result.shippingFee);
    host.innerHTML = `<section class="order-confirmation"><span class="confirmation-mark" aria-hidden="true">✓</span><span class="section-eyebrow">ORDER RECEIVED</span><h2>Thank you for your order.</h2>
        <p>Your order reference is <strong>${esc(result.invoiceId)}</strong>. Keep this reference for payment and delivery enquiries.</p>
        ${Number.isFinite(total) ? `<div class="confirmation-total"><span>Order total</span><strong>RM ${total.toFixed(2)}</strong>${Number.isFinite(shipping) ? `<small>Includes shipping of RM ${shipping.toFixed(2)}</small>` : ''}</div>` : ''}
        <div class="confirmation-next"><h3>What happens next?</h3><ol><li>Open your invoice to review the order and payment instructions.</li><li>Follow the payment instructions supplied by the shop. An order confirmation does not mean payment is confirmed.</li><li>Use My Account to check your order status and retrieve your invoice or receipt.</li></ol></div>
        <div class="rewards-actions">${result.invoicePdf?.base64 ? '<button class="btn btn-primary" id="confirmation-invoice" type="button">Download invoice</button>' : ''}<a class="btn btn-secondary" href="customer.html">View my orders</a><button class="btn btn-secondary" type="button" onclick="showTab('products')">Continue shopping</button></div><p id="confirmation-document-status" role="status"></p></section>`;
    document.getElementById('confirmation-invoice')?.addEventListener('click', () => {
        const downloaded = downloadPdfBase64(result.invoicePdf.base64, result.invoicePdf.filename);
        document.getElementById('confirmation-document-status').textContent = downloaded ? 'Your invoice download has started.' : 'The invoice could not be downloaded. Open My Account to retrieve it.';
    });
    showTab('order-confirmation-view');
    host.setAttribute('tabindex', '-1'); host.focus({ preventScroll: true }); window.scrollTo(0, 0);
}
function updateProductMetadata(product) {
    const description = product ? `${product.name}. ${product.benefits || 'View product information and shop the collection.'}`.slice(0, 160) : 'Shop Forever Living products, explore the collection, track your orders and manage your rewards with Forever Living by Muhd Isa.';
    const base = new URL('.', location.href);
    const url = product ? (window.FL_STATIC_CATALOG ? new URL(StoreCore.productPath(product), base).href : new URL('index.html?product=' + encodeURIComponent(product.id), base).href) : base.href;
    const image = product?.image || new URL('assets/social.jpg', base).href;
    for (const [selector, value] of [['meta[name="description"]', description], ['meta[property="og:description"]', description], ['meta[property="og:title"]', product ? `${product.name} | Forever Living by Muhd Isa` : viewState.baseTitle], ['meta[property="og:url"]', url], ['meta[property="og:image"]', image]]) {
        document.querySelector(selector)?.setAttribute('content', value);
    }
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
    let structured = document.getElementById('product-structured-data');
    if (!product) { structured?.remove(); return; }
    if (!structured) { structured = document.createElement('script'); structured.type = 'application/ld+json'; structured.id = 'product-structured-data'; document.head.appendChild(structured); }
    const data = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, sku: product.id, description, image };
    if (product.price !== null) data.offers = { '@type': 'Offer', priceCurrency: 'MYR', price: product.price, url };
    structured.textContent = JSON.stringify(data);
}
