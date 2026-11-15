// =================================================================
// E-Shop Frontend Script - v31.0 (CALMER FESTIVAL THEMES, SHIPPING RULES, VIDEO FIX)
// Features: Festival themes (live backgrounds, graphics, moving animations),
//           robust price parsing, marketing, cart, chatbot
// Preview any theme without waiting for its dates:  yoursite.com/?festival=Christmas
// =================================================================

// ===========================================================
// [ 1.0 ] GLOBAL CONFIGURATION & STATE
// ===========================================================
const googleScriptURL = (window.FL_CONFIG && window.FL_CONFIG.SCRIPT_URL) || '';   // set in config.js
if (!googleScriptURL) console.error('config.js is missing. Upload it next to index.html.');

let products = [];
let allJobs = [];
let cart = [];
let chatSession = {};
let catalogLoaded = false;
let checkoutInFlight = false;
let checkoutAttempt = null;
let lastConfirmedOrder = null;
const CART_STORAGE_KEY = 'fl-cart-v1';
let catalogTag = '';
let shippingRules = []; // [{ minSpend, charge }] from the ShippingRules sheet

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250"><rect width="100%" height="100%" fill="#eef2f0"/>' +
    '<text x="50%" y="50%" fill="#7a8a83" font-family="sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">Forever Living by Muhd Isa</text></svg>'
);

// Escape text before putting it into HTML (stops broken markup and script injection from sheet data)
function esc(v) {
    return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
// Safe argument for inline handlers, e.g. onclick="addToCart(${jsArg(id)})"
function jsArg(v) {
    return esc(JSON.stringify(String(v === undefined || v === null ? '' : v)));
}

// Safely parse price regardless of sheet casing or string format (e.g., "RM 95.00", "95", 95)
function parseSafePrice(item) {
    if (!item) return 0;
    const raw = item.price ?? item.Price ?? item.retailPrice ?? item.RetailPrice ?? item.rsp ?? 0;
    const cleaned = String(raw).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

// ===========================================================
// [ 1.5 ] FESTIVALS live in festival.js (FestivalFX, FESTIVAL_THEMES, getPreviewTheme).
// ===========================================================

// ===========================================================
// [ 1.8 ] SHOP LAYOUT (5 per row) & PRODUCT PAGES
// ===========================================================
const viewState = { current: 'homepage', listScroll: 0, baseTitle: document.title, pdQty: 1 };
// Contact number comes from the AboutUs sheet (cell M2) and is set when the shop data loads.
const BRAND_NAME = 'Forever Living by Muhd Isa';   // always shown in full, never just "Forever Living"
let WHATSAPP_NUMBER = '601154443154';
let CONTACT_DISPLAY = '+60 11-5444 3154';
function applyContactNumber(content) {
    if (!content) return;
    if (content.WhatsAppNumber) WHATSAPP_NUMBER = String(content.WhatsAppNumber).replace(/\D/g, '');
    if (content.ContactNumber) CONTACT_DISPLAY = content.ContactNumber;
}

// ---- routing: each product has its own address, e.g.  yoursite.com/#product/12 ----
function productRoute() {
    const queryProduct = new URLSearchParams(location.search).get('product');
    if (queryProduct) return queryProduct;
    const m = String(window.location.hash || '').match(/^#product\/(.+)$/);
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

function activateTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    viewState.current = tabId;
    if (tabId !== 'product-detail') { document.title = viewState.baseTitle; updateProductMetadata(); }
}

function openProduct(id) {
    viewState.listScroll = window.scrollY || 0;
    const url = new URL(location.href); url.searchParams.set('product', id); url.hash = '';
    history.pushState(null, '', url); renderProductPage(id);
}

function backToProducts() {
    // always return to the product list, even after browsing through several related products
    try { window.history.replaceState(null, '', window.location.pathname + (() => { const query = new URLSearchParams(location.search); query.delete('product'); return query.size ? '?' + query : ''; })()); } catch (e) { /* ignore */ }
    activateTab('products');
    window.scrollTo(0, viewState.listScroll || 0);
}

function handleRoute() {
    const id = productRoute();
    if (id !== null) { renderProductPage(id); return; }
    if (viewState.current === 'product-detail') {
        activateTab('products');
        window.scrollTo(0, viewState.listScroll || 0);
    }
}

function findProduct(id) {
    return products.find(p => String(p.id) === String(id));
}

function renderProductPage(id) {
    const box = document.getElementById('product-detail');
    if (!box) return;
    const p = findProduct(id);
    viewState.pdQty = 1;

    if (!p) {
        box.innerHTML = '<div class="pd-wrap"><p>Sorry, we could not find that product.</p><button class="btn btn-primary" onclick="backToProducts()">Back to products</button></div>';
        activateTab('product-detail');
        window.scrollTo(0, 0);
        return;
    }

    const idx = products.indexOf(p);
    const related = StoreCore.relatedProducts(p, products);
    const waText = 'Hi, I would like to know more about ' + p.name + ' ' + window.location.href;
    const waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waText);

    box.innerHTML = `
    <div class="pd-wrap">
        <nav class="pd-crumbs" aria-label="Breadcrumb"><a onclick="backToProducts()">&larr; All products</a> &nbsp;›&nbsp; <span>${esc(p.name)}</span></nav>
        <article class="pd-card">
            ${FestivalFX.cardOrnament(idx)}
            <div class="pd-media"><img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG"></div>
            <div class="pd-info">
                ${FestivalFX.cardRibbon()}
                <h1>${esc(p.name)}</h1>
                <div class="pd-price">${p.price === null ? 'Price unavailable' : 'RM ' + Number(p.price).toFixed(2)}</div>
                ${p.benefits ? `<div class="pd-block"><h3>Benefits</h3><p>${esc(p.benefits)}</p></div>` : ''}
                ${p.consumption ? `<div class="pd-block"><h3>How to use</h3><p>${esc(p.consumption)}</p></div>` : ''}
                <div class="pd-buy">
                    <div class="pd-qty">
                        <button type="button" aria-label="Decrease quantity" onclick="pdChangeQty(-1)">&minus;</button>
                        <span id="pd-qty" aria-live="polite">1</span>
                        <button type="button" aria-label="Increase quantity" onclick="pdChangeQty(1)">+</button>
                    </div>
                    <button type="button" id="pd-add" class="btn btn-primary" ${p.price === null ? 'disabled' : ''} onclick="pdAddToCart(${jsArg(p.id)})">Add to Cart</button>
                </div>
                <div class="pd-links">
                    <a href="${esc(waUrl)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Ask on WhatsApp</a>
                    <button type="button" id="pd-share" onclick="shareProduct(${jsArg(p.id)})"><i class="fa-solid fa-share-nodes"></i> Share</button>
                </div>
            </div>
        </article>
        ${related.length ? `<section class="pd-related"><h2>You may also like</h2><div class="pd-related-grid">${related.map(r => `
            <div class="pd-mini" role="link" tabindex="0" onclick="openProduct(${jsArg(r.id)})" onkeydown="if(event.key==='Enter')openProduct(${jsArg(r.id)})">
                <img src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG">
                <div>${esc(r.name)}<small>RM ${r.price === null ? '—' : Number(r.price).toFixed(2)}</small></div>
            </div>`).join('')}</div></section>` : ''}
    </div>`;

    activateTab('product-detail');
    document.title = p.name + ' | ' + viewState.baseTitle;
    updateProductMetadata(p);
    window.scrollTo(0, 0);
}

function pdChangeQty(delta) {
    viewState.pdQty = Math.min(99, Math.max(1, viewState.pdQty + delta));
    const el = document.getElementById('pd-qty');
    if (el) el.textContent = viewState.pdQty;
}

function pdAddToCart(id) {
    addToCart(id, viewState.pdQty);
    const btn = document.getElementById('pd-add');
    if (btn) {
        btn.textContent = 'Added ✓';
        setTimeout(() => { const b = document.getElementById('pd-add'); if (b) b.textContent = 'Add to Cart'; }, 1400);
    }
}

function shareProduct(id) {
    const p = findProduct(id);
    if (!p) return;
    const url = window.location.href;
    const done = () => {
        const b = document.getElementById('pd-share');
        if (b) { b.textContent = 'Link copied ✓'; setTimeout(() => { const x = document.getElementById('pd-share'); if (x) x.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Share'; }, 1600); }
    };
    if (navigator.share) {
        navigator.share({ title: p.name, url: url }).catch(() => { /* cancelled */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(() => window.prompt('Copy this link:', url));
    } else {
        window.prompt('Copy this link:', url);
    }
}

// ===========================================================
// [ 2.0 ] MAIN CONTROLLER & INITIALIZATION
// ===========================================================
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    renderMainContentShell();
    buildEnquiryForm(); buildCartModal(); buildJobApplicationModal(); buildFabButtons(); buildChatbotWidget(); updateCartDisplay(false); setupShopAccount();
    document.getElementById('enquiry-form')?.addEventListener('submit', handleEnquirySubmit);
    document.getElementById('job-application-form')?.addEventListener('submit', handleJobApplicationSubmit);
    activateTab('homepage');
    document.getElementById('homepage-hero').innerHTML = '<h2>Welcome to our shop</h2><p role="status">Loading the latest collection…</p>';
    window.addEventListener('storage', event => {
        if (event.key === CART_STORAGE_KEY && catalogLoaded) { cart = StoreCore.restoreCart(event.newValue, products); updateCartDisplay(false); }
    });
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(googleScriptURL, { signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();

        if (data.status !== 'success') throw new Error(data.message || 'Unknown backend error');
        if (data.failedSections && data.failedSections.length) console.warn('Backend sections failed:', data.failedSections);

        const marketingData = data.marketingData || {};
        const activeTheme = getPreviewTheme() || data.activeTheme || null;

        // 1. Maintenance Mode Check
        if (String(marketingData.MaintenanceMode).trim().toUpperCase() === 'TRUE') {
            const storeWrapper = document.getElementById('store-wrapper');
            if (storeWrapper) storeWrapper.style.display = 'none';
            const overlay = document.getElementById('maintenance-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                const msg = document.getElementById('maintenance-message');
                if (msg) msg.textContent = marketingData.MaintenanceMessage || 'Site is down for maintenance.';
            }
            return;
        }

        // 2. Apply Theme & Marketing Banners
        applyTheme(activeTheme);
        applyMarketing(marketingData, activeTheme);

        // 3. Normalize products safely (handles case mismatches and missing fields)
        const rawProducts = Array.isArray(data.products) ? data.products : [];
        products = rawProducts.map(StoreCore.normalizeProduct).map(p => ({ ...p, image: StoreUI.image(p.image) || PLACEHOLDER_IMG }));
        catalogTag = marketingData.ProductTagText || '';
        if (!catalogLoaded) {
            try { cart = StoreCore.restoreCart(localStorage.getItem(CART_STORAGE_KEY), products); } catch { cart = []; }
        } else { cart = StoreCore.restoreCart(StoreCore.savedCart(cart), products); }
        catalogLoaded = true;

        shippingRules = normaliseShippingRules(data.shippingRules);
        allJobs = data.jobsListings || [];

        applyContactNumber(data.aboutUsContent);
        renderStaticContent(data.aboutUsContent);
        renderHomepageContent(data.aboutUsContent, allJobs, data.testimonies);
        FestivalFX.mountHero();
        buildCatalogControls();
        applyCatalogFilters();
        renderRewardsPage(data.rewardsRules || data.rewardsConfig);
        renderAboutUs(data.aboutUsContent);
        renderJobs(allJobs);

        updateCartDisplay();

        if (marketingData.PopupMessageText || marketingData.PopupImageURL) {
            buildPopupModal(marketingData.PopupMessageText, marketingData.PopupImageURL);
        }

        const updateElem = document.getElementById('update-timestamp');
        if (updateElem) updateElem.textContent = `${new Date().toLocaleDateString('en-GB')} (v31.0)`;


        if (productRoute() !== null) { renderProductPage(productRoute()); } else { showTab('homepage'); }

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        const main = document.getElementById('main-content');
        let why = String(error && error.message || error);
        if (!googleScriptURL) why = 'config.js was not found. Upload config.js next to index.html.';
        else if (/Failed to fetch|NetworkError|Load failed/i.test(why)) why = 'The store server could not be reached. In Apps Script, deploy as Web app with access set to "Anyone", then check the address in config.js.';
        else if (/JSON|Unexpected token/i.test(why)) why = 'The store server did not return store data. Check that config.js has the latest Web app address and that access is set to "Anyone".';
        if (main) { const errorHtml = `<p style="text-align: center; color: red;">Error loading store. Please try again later.</p><p style="text-align:center;color:#888;font-size:.85rem;max-width:560px;margin:10px auto;">${esc(why)}</p><button type="button" class="btn btn-secondary retry-catalog">Try loading again</button>`;
            document.getElementById('homepage-hero').innerHTML = errorHtml;
            document.getElementById('product-list-container').innerHTML = errorHtml;
            main.querySelectorAll('.retry-catalog').forEach(button => button.addEventListener('click', () => { button.disabled = true; fetchData().finally(() => { button.disabled = false; }); }));
        }
    }
}

// ===========================================================
// [ 3.0 ] UI & DYNAMIC CONTENT RENDERING
// ===========================================================
function renderStaticContent(content) {
    if (!content) return;
    const headerElem = document.getElementById('company-name-header');
    if (headerElem) {
        headerElem.innerHTML = `${esc(BRAND_NAME)} <span class="by-line">${esc(content.Owner)} - ${esc(content.Role)}</span> <span class="slogan">${esc(content.Slogan)}</span>`;
    }
    const footerElem = document.getElementById('footer-text');
    if (footerElem) {
        footerElem.innerHTML = esc(content.Footer || `© ${new Date().getFullYear()} ${BRAND_NAME}`) + ` &nbsp;|&nbsp; <a href="https://wa.me/${esc(WHATSAPP_NUMBER)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp ${esc(CONTACT_DISPLAY)}</a> &nbsp;|&nbsp; <a href="agent.html">Business partner</a>`;
    }
}

function renderMainContentShell() {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
        <div id="homepage" class="tab-content">
            <section id="homepage-hero" class="hero-section"></section>
            <section id="why-choose-us" class="dynamic-content-wrapper"></section>
            <section id="youtube-videos" class="dynamic-content-wrapper"></section>
            <section id="homepage-testimonies" class="dynamic-content-wrapper"><h2>What Our Customers Say</h2><div id="testimonies-container"></div></section>
            <section id="homepage-featured-jobs" class="dynamic-content-wrapper"><h2>Join Our Team</h2><div id="featured-jobs-container"></div><a onclick="showTab('jobs')" class="btn btn-secondary" style="display: table; margin: 20px auto 0; max-width: 300px;">View All Career Opportunities</a></section>
        </div>
        <div id="products" class="tab-content"><div id="catalog-controls"></div><p id="catalog-count" role="status"></p><div id="product-list-container"></div></div>
        <div id="product-detail" class="tab-content"></div>
        <div id="about" class="tab-content"><section id="about-us-content" class="dynamic-content-wrapper"></section></div>
        <div id="jobs" class="tab-content"><section id="jobs-content" class="dynamic-content-wrapper"><h2>All Career Opportunities</h2><div id="job-listings-container"></div></section></div>
        <div id="enquiries" class="tab-content"><section id="enquiries-form-content" class="dynamic-content-wrapper"></section></div>
        <div id="rewards" class="tab-content"><section id="rewards-content" class="dynamic-content-wrapper"></section></div><div id="order-confirmation-view" class="tab-content"></div>
    `;
    renderRewardsPage();
}

// Accepts watch links, youtu.be links, shorts/embed/live links, links without https://, a bare 11-character
// video ID, or a whole pasted <iframe ...> embed code.
function youtubeId(input) {
    let str = String(input || '').trim();
    if (!str) return null;
    const src = str.match(/src\s*=\s*["']([^"']+)["']/i);
    if (src) str = src[1];
    if (/^[\w-]{11}$/.test(str)) return str;
    if (!/^https?:\/\//i.test(str)) str = 'https://' + str.replace(/^\/\//, '');
    try {
        const u = new URL(str);
        const host = u.hostname.replace(/^(www|m)\./i, '').toLowerCase();
        let id = null;
        if (host === 'youtu.be') id = u.pathname.split('/')[1] || null;
        else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            id = u.searchParams.get('v');
            if (!id) { const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]+)/); if (m) id = m[2]; }
        }
        return id && /^[\w-]{6,}$/.test(id) ? id : null;
    } catch (e) { return null; }
}

// Click-to-play video card. The thumbnail loads first; the real player is only created when someone clicks,
// and a plain "Watch on YouTube" link is always shown, so the section still works if embedding is blocked.
function playYoutube(btn) {
    const frame = btn.closest('.yt-frame');
    if (!frame) return;
    const id = frame.dataset.vid;
    frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1" title="YouTube video" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
        'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
}

function ytThumbFailed(img) {
    const frame = img.closest('.yt-frame');
    if (!frame) return;
    const id = frame.dataset.vid;
    frame.innerHTML = '<a class="yt-fallback" href="https://www.youtube.com/watch?v=' + encodeURIComponent(id) + '" target="_blank" rel="noopener">' +
        '<span class="yt-btn"></span><span>Preview unavailable on this connection.<br>Tap to watch on YouTube</span></a>';
}

function renderHomepageContent(about, jobs, testimonies) {
    about = about || { CompanyName: "Forever Living by Muhd Isa", Slogan: "Premium Wellness & Beauty" };
    const heroContainer = document.getElementById('homepage-hero');
    if (heroContainer) heroContainer.innerHTML = `<h2>${esc(about.CompanyName || 'Welcome')}</h2><p>${esc(about.Slogan || 'High-quality wellness products')}</p>`;

    const whyChooseUsContainer = document.getElementById('why-choose-us');
    if (whyChooseUsContainer) {
        whyChooseUsContainer.innerHTML = `<h2>${esc(about.WhyChooseUs_Title || 'Why Choose Us')}</h2><div class="why-choose-us-grid"><div><i class="${esc(about.Point1_Icon || 'fa-solid fa-check')}"></i><p>${esc(about.Point1_Text)}</p></div><div><i class="${esc(about.Point2_Icon || 'fa-solid fa-check')}"></i><p>${esc(about.Point2_Text)}</p></div><div><i class="${esc(about.Point3_Icon || 'fa-solid fa-check')}"></i><p>${esc(about.Point3_Text)}</p></div></div>`;
    }

    const youtubeSection = document.getElementById('youtube-videos');
    const videoIds = about.YoutubeURL ? String(about.YoutubeURL).split(/[,\n]+/).map(youtubeId).filter(Boolean) : [];
    if (youtubeSection && videoIds.length > 0) {
        const videosHtml = videoIds.map(id => `
            <div class="yt-item">
                <div class="yt-frame" data-vid="${esc(id)}">
                    <button type="button" class="yt-play" onclick="playYoutube(this)" aria-label="Play video">
                        <img src="https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg" alt="" loading="lazy" onerror="ytThumbFailed(this)">
                        <span class="yt-btn"></span>
                    </button>
                </div>
                <a class="yt-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener">Watch on YouTube &#8599;</a>
            </div>`).join('');
        youtubeSection.innerHTML = `<h2>${esc(about.YoutubeSection_Title || 'Learn More')}</h2><div id="youtube-videos-container">${videosHtml}</div>`;
    } else if (youtubeSection) {
        youtubeSection.style.display = 'none';
    }

    const testimoniesContainer = document.getElementById('testimonies-container');
    if (testimoniesContainer && testimonies && testimonies.length > 0) {
        testimoniesContainer.innerHTML = testimonies.map(t => {
            let stars = '';
            const rating = Number(t.Rating) || 5;
            for (let i = 0; i < 5; i++) { stars += `<i class="fa-solid fa-star" style="color: ${i < rating ? 'var(--secondary-color)' : '#ccc'}"></i>`; }
            return `<div class="testimony-card"><div class="testimony-header"><h4>${esc(t.ClientName || 'Valued Customer')}</h4><div class="testimony-rating">${stars}</div></div><p>"${esc(t.Quote)}"</p></div>`;
        }).join('');
    } else {
        const homeTestimonies = document.getElementById('homepage-testimonies');
        if (homeTestimonies) homeTestimonies.style.display = 'none';
    }

    const featuredJobsContainer = document.getElementById('featured-jobs-container');
    const featuredJobs = jobs ? jobs.filter(j => j.isFeatured) : [];
    if (featuredJobsContainer && featuredJobs.length > 0) {
        featuredJobsContainer.innerHTML = featuredJobs.map(job => `<div class="job-listing-summary"><h4>${esc(job.position)}</h4><p>${esc(job.location)} | ${esc(job.type)}</p></div>`).join('');
    } else {
        const homeJobs = document.getElementById('homepage-featured-jobs');
        if (homeJobs) homeJobs.style.display = 'none';
    }
}

function renderProducts(productsToRender, tagText) {
    const container = document.getElementById('product-list-container');
    if (!container) return;
    if (!productsToRender || productsToRender.length === 0) { container.innerHTML = `<p>No products available.</p>`; return; }

    const tagHtml = tagText ? `<div class="product-tag">${esc(tagText)}</div>` : '';

    container.innerHTML = `<div class="product-list">${productsToRender.map((p, i) => {
        const displayPrice = p.price === null ? 'Price unavailable' : 'RM ' + Number(p.price).toFixed(2);
        return `
        <div class="product" data-pid="${esc(p.id)}" role="link" tabindex="0" aria-label="View ${esc(p.name)}" style="position: relative;">
            ${FestivalFX.cardOrnament(i)}
            ${tagHtml}
            <div class="product-image-container"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG"></div>
            <div class="product-info">
                ${FestivalFX.cardRibbon()}
                <h3>${esc(p.name)}</h3>
                <div class="price-section"><span class="new-price">${displayPrice}</span></div>
                <div class="product-benefits">${esc(p.benefits)}</div>
                <div class="product-consumption"><strong>Usage:</strong> ${esc(p.consumption)}</div>
                <div class="product-more">View details &rarr;</div>
                <div class="product-actions"><button type="button" class="btn btn-primary" onclick="addToCart(${jsArg(p.id)})" ${p.price === null ? 'disabled' : ''}>Add to Cart</button></div>
            </div>
        </div>`;
    }).join('')}</div>`;

    // Whole card opens the product page (the Add to Cart button keeps its own action)
    const list = container.querySelector('.product-list');
    if (list) {
        list.addEventListener('click', e => {
            if (e.target.closest('button, a')) return;
            const card = e.target.closest('.product');
            if (card) openProduct(card.dataset.pid);
        });
        list.addEventListener('keydown', e => {
            if (e.key !== 'Enter' || e.target.closest('button, a')) return;
            const card = e.target.closest('.product');
            if (card) openProduct(card.dataset.pid);
        });
    }
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!container) return;
    if (!content) { container.innerHTML = '<p>About information is unavailable.</p>'; return; }
    const historySection = content.History ? `<div class="about-section"><h4>Our History</h4><p>${esc(content.History)}</p></div>` : '';
    container.innerHTML = `
        <h2>About ${esc(BRAND_NAME)}</h2>
        <div class="owner-profile">
            <img src="assets/owner.webp" width="320" height="318" loading="lazy" decoding="async" alt="${esc(content.Owner || 'Owner')}" class="owner-image" onerror="this.style.display='none'">
            <div class="owner-details">
                <h3>${esc(content.Owner)} - ${esc(content.Role)}</h3>
                <div>${StoreUI.safeRichText(content.MoreDetails)}</div>
            </div>
        </div>
        <div class="about-section">
            <h4>Our Mission</h4>
            <p>${esc(content.OurMission)}</p>
        </div>
        <div class="about-section">
            <h4>Our Vision</h4>
            <p>${esc(content.OurVision)}</p>
        </div>
        ${historySection}`;
}

function renderJobs(jobs) {
    const container = document.getElementById('job-listings-container');
    if (!container) return;
    if (!jobs || jobs.length === 0) { container.innerHTML = '<p>There are currently no open positions.</p>'; return; }
    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-header"><h3>${esc(job.position)}</h3></div>
            <div class="job-body">
                <div class="job-details">
                    <div class="job-detail-item"><i class="fa-solid fa-location-dot"></i> <span>${esc(job.location)} | ${esc(job.type)}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-money-bill-wave"></i> <span>${esc(job.salary || '0')} RM</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-house-user"></i> <span>${esc(job.accommodation)}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-calendar-days"></i> <span>${esc(job.workDayPattern)}</span></div>
                </div>
                <div class="job-description">${StoreUI.safeRichText(job.description)}</div>
                <button class="btn btn-primary" onclick="toggleJobModal(true, ${jsArg(job.jobId)}, ${jsArg(job.position)})">Apply Now</button>
            </div>
        </div>`).join('');
}

function buildEnquiryForm() {
    const container = document.getElementById('enquiries-form-content');
    if (!container) return;
    container.innerHTML = `<h2>Send Us An Enquiry</h2><form id="enquiry-form" class="enquiry-form"><input type="text" id="enquiry-name" placeholder="Your Full Name" required><input type="email" id="enquiry-email" placeholder="Your Email Address" required><input type="tel" id="enquiry-phone" placeholder="Your Phone Number" required><select id="enquiry-type" required><option value="" disabled selected>Select Enquiry Type...</option><option value="General Question">General</option><option value="Product Support">Product</option></select><textarea id="enquiry-message" placeholder="Your Message" rows="6" required></textarea><button type="submit" class="btn btn-primary" style="width: 100%;">Submit</button><p id="enquiry-status"></p></form>`;
}

function buildCartModal() {
    const container = document.getElementById('cart-modal');
    if (!container) return;
    container.style.cssText = "display:none; position:fixed; z-index:999999; left:0; top:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); backdrop-filter:blur(3px); justify-content:center; align-items:center; padding:12px; box-sizing:border-box;";
    container.onclick = e => { if (e.target === container) toggleCart(true); };
    container.innerHTML = `
        <div class="modal-content" style="background:#fff !important; width:100% !important; max-width:460px !important; max-height:86vh !important; display:flex !important; flex-direction:column !important; border-radius:12px !important; overflow:hidden !important; box-shadow:0 15px 35px rgba(0,0,0,0.3) !important;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
                <h2 style="margin:0; font-size:1.15rem; color:#113626; font-weight:700;">Your Cart</h2>
                <button type="button" aria-label="Close cart" onclick="toggleCart(true)" style="background:none; border:none; font-size:1.6rem; line-height:1; color:#64748b; cursor:pointer;">&times;</button>
            </div>

            <div style="overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; padding:14px 18px; flex:1 1 auto;">
                <div id="cart-items" style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;"><p style="text-align:center; padding:15px 0;">Your cart is empty.</p></div>
                <div id="cart-checkout-area"><p id="cart-account-note" class="cart-account-note" hidden></p><p id="checkout-status" class="checkout-status" role="alert"></p>
                    <div style="border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; padding:10px 0; margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#475569; margin-bottom:3px;"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
                        <div id="cart-shipping-row" style="display:none; justify-content:space-between; font-size:0.85rem; color:#475569; margin-bottom:3px;"><span>Shipping</span><span id="cart-shipping">RM 0.00</span></div>
                        <div id="cart-ship-hint" style="display:none; font-size:0.76rem; color:#b45309; background:#fffbeb; border-radius:6px; padding:5px 8px; margin:4px 0 6px;"></div>
                        <div style="display:flex; justify-content:space-between; font-size:1.05rem; font-weight:bold; color:#113626;"><span>Total</span><span id="cart-total">RM 0.00</span></div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:10px;">
                        <h3 style="font-size:0.82rem; margin:0 0 8px 0; color:#113626; text-transform:uppercase; letter-spacing:0.5px;">Customer Info</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                            <input type="text" id="customer-name" aria-label="Full name" autocomplete="name" placeholder="Full Name" required style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
                            <input type="tel" id="customer-phone" aria-label="Phone number" autocomplete="tel" placeholder="WhatsApp No." required style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <input type="email" id="customer-email" aria-label="Email (optional)" autocomplete="email" placeholder="Email (Optional)" style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:6px; box-sizing:border-box;">
                        <textarea id="customer-address" aria-label="Delivery address" autocomplete="street-address" placeholder="Delivery Address" required style="width:100%; height:44px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; resize:none; box-sizing:border-box;"></textarea>
                    </div>
                </div>
            </div>

            <div style="padding:12px 18px 14px; background:#f8fafc; border-top:1px solid #e2e8f0; flex-shrink:0;">
                <button type="button" id="checkout-btn" onclick="initiateCheckout()" style="width:100%; padding:10px; font-size:0.95rem; font-weight:700; background:#113626; color:#ffffff; border:none; border-radius:6px; cursor:pointer;">Complete Order</button>
            </div>
        </div>`;
}

function buildJobApplicationModal() {
    const container = document.getElementById('job-application-modal');
    if (!container) return;
    container.innerHTML = `<div class="modal-content"><span class="close" onclick="toggleJobModal(false)">&times;</span><h2>Apply for <span id="job-modal-title"></span></h2><form id="job-application-form" class="enquiry-form"><input type="hidden" id="job-id-input"><input type="hidden" id="job-position-input"><input type="text" id="applicant-name" placeholder="Full Name" required><input type="email" id="applicant-email" placeholder="Email" required><input type="tel" id="applicant-phone" placeholder="Phone" required><input type="text" id="applicant-citizenship" placeholder="Citizenship" required><textarea id="applicant-message" placeholder="Tell us about yourself" rows="4"></textarea><label for="applicant-resume">Upload Resume (Mandatory)</label><input type="file" id="applicant-resume" required><button type="submit" class="btn btn-primary">Submit</button><p id="job-application-status"></p></form></div>`;
}

function buildFabButtons() {
    const container = document.getElementById('fab-container');
    if (!container) return;
    container.innerHTML = `<button type="button" id="floating-cart" class="fab floating-cart-btn" aria-label="Open shopping cart" onclick="toggleCart()">${chatIcon('shop')}<span id="cart-count">0</span></button><button type="button" class="fab chatbot-fab" aria-label="Open shop assistant" aria-controls="eshop-chat-widget" aria-expanded="false" onclick="toggleChatWidget(true)">${chatIcon('chat')}</button>`;
}

function buildChatbotWidget() {
    const container = document.getElementById('eshop-chat-widget');
    if (!container) return;
    container.setAttribute('role', 'dialog'); container.setAttribute('aria-labelledby', 'chat-title');
    container.setAttribute('aria-hidden', 'true'); container.inert = true;
    container.innerHTML = `
        <div id="chat-header">
            <div class="chat-brand"><span class="chat-brandmark">${chatIcon('leaf')}</span><div><span class="chat-brand-label">FOREVER LIVING</span><h2 id="chat-title">Shop assistant</h2><span id="chat-account-state">Shopping & account support</span></div></div>
            <div class="chat-header-actions"><button type="button" id="chat-menu-btn" aria-label="Show assistant options" title="Options">${chatIcon('menu')}</button><button type="button" id="close-chat-btn" aria-label="Close assistant" title="Close">${chatIcon('close')}</button></div>
        </div>
        <div id="chat-body" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation"></div>
        <form id="chat-input-container"><label for="chat-input" class="chat-sr-only">Your message</label><input type="text" id="chat-input" placeholder="Ask me anything about the shop…" autocomplete="off" maxlength="2000"><button type="submit" id="chat-send-btn" aria-label="Send message">${chatIcon('send')}</button></form>
        <div class="chat-footer">Your shopping companion, every step of the way.</div>`;
    container.querySelector('#chat-input-container').addEventListener('submit', handleChatSubmit);
    container.querySelector('#close-chat-btn').addEventListener('click', () => toggleChatWidget(false));
    container.querySelector('#chat-menu-btn').addEventListener('click', displayMainMenu);
    container.addEventListener('keydown', event => { if (event.key === 'Escape') toggleChatWidget(false); });
    container.addEventListener('click', event => {
        const orderButton = event.target.closest('[data-chat-order]');
        if (orderButton && !chatBusy && chatSession.token) {
            const order = chatSession.recentOrders?.find(item => item.invoiceId === orderButton.dataset.chatOrder);
            if (!order) return;
            chatSession.selectedOrderId = order.invoiceId;
            const topic = chatSession.pendingOrderTopic;
            delete chatSession.pendingOrderTopic;
            addChatMessage('user', 'Order ' + order.invoiceId);
            runChatTask(() => chatOrderHelp(topic || 'summary'));
            return;
        }
        const productButton = event.target.closest('[data-chat-product], [data-chat-view-product]');
        if (productButton && !chatBusy) {
            const product = findProduct(productButton.dataset.chatProduct || productButton.dataset.chatViewProduct);
            if (!product) return;
            chatSession.selectedProductId = product.id; chatSession.focus = 'product'; delete chatSession.pendingProductChoice;
            if (productButton.dataset.chatViewProduct) { openProduct(product.id); toggleChatWidget(false); }
            else { addChatMessage('user', product.name); chatProductAnswer(productButton.dataset.chatQuestion || product.name, productButton.dataset.chatTopic || 'product', product.id); }
            return;
        }
        const button = event.target.closest('[data-chat-action]');
        if (!button || button.disabled || chatBusy) return;
        const option = chatOptions.find(item => item.id === button.dataset.chatAction);
        addChatMessage('user', option?.title || button.textContent.trim());
        runChatTask(() => handleChatAction(button.dataset.chatAction));
    });
}

// ===========================================================
// [ 4.0 ] CART LOGIC
// ===========================================================
function addToCart(productId, qty = 1) {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product || product.price === null) return;
    const amount = Math.max(1, parseInt(qty, 10) || 1);
    const existingItem = cart.find(item => String(item.id) === String(productId));
    if (existingItem) {
        existingItem.quantity = Math.min(99, existingItem.quantity + amount);
    } else {
        cart.push({ ...product, quantity: Math.min(99, amount) });
    }
    updateCartDisplay();
}

function increaseQuantity(productId) {
    const item = cart.find(i => String(i.id) === String(productId));
    if (item) { item.quantity = Math.min(99, item.quantity + 1); }
    updateCartDisplay();
}

function decreaseQuantity(productId) {
    const item = cart.find(i => String(i.id) === String(productId));
    if (item) {
        item.quantity--;
        if (item.quantity <= 0) { removeItemFromCart(productId); }
        else { updateCartDisplay(); }
    }
}

function removeItemFromCart(productId) {
    cart = cart.filter(item => String(item.id) !== String(productId));
    updateCartDisplay();
}

// Shipping rules come from the ShippingRules sheet (only rows with Apply ticked are sent).
//   Tiered   = normal bands: spend between MinSpend and MaxSpend pays Charge
//   Free     = promotion: free shipping in that range      FlatRate = promotion: flat Charge in that range
// A running promotion beats the normal tiers. Spend below the lowest tier pays the lowest tier's charge.
function normaliseShippingRules(raw) { return StoreCore.normaliseShippingRules(raw); }
function calcShipping(subtotal) { return StoreCore.calcShipping(subtotal, shippingRules); }

// The next band up that would make shipping cheaper (used for the "add RM x more" hint)
function nextCheaperTier(subtotal) {
    const current = calcShipping(subtotal);
    return shippingRules.find(r => r.type === 'tiered' && r.minSpend > subtotal && r.charge < current) || null;
}

function updateCartDisplay(persist = true) {
    if (persist && catalogLoaded) { try { localStorage.setItem(CART_STORAGE_KEY, StoreCore.savedCart(cart)); } catch { /* Private browsing or full storage: cart remains usable in this tab. */ } }
    const cartItemsContainer = document.getElementById('cart-items');
    const checkoutArea = document.getElementById('cart-checkout-area');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartCountElem = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    if (cartCountElem) cartCountElem.textContent = totalItems;
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; padding: 20px 0;">Your cart is empty.</p>';
        if (checkoutArea) checkoutArea.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    if (checkoutArea) checkoutArea.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${esc(item.image)}" alt="${esc(item.name)}" class="cart-item-image" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG"/>
            <div class="cart-item-details">
                <strong>${esc(item.name)}</strong>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity(${jsArg(item.id)})">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity(${jsArg(item.id)})">+</button>
                </div>
            </div>
            <strong>RM ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</strong>
            <button class="remove-item-btn" aria-label="Remove item" onclick="removeItemFromCart(${jsArg(item.id)})"><i class="fa-solid fa-trash-can"></i></button>
        </div>`).join('');

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const subtotalElem = document.getElementById('cart-subtotal');
    const totalElem = document.getElementById('cart-total');
    const shipping = calcShipping(subtotal);
    if (subtotalElem) subtotalElem.textContent = `RM ${subtotal.toFixed(2)}`;
    if (totalElem) totalElem.textContent = `RM ${(subtotal + shipping).toFixed(2)}`;

    const shipRow = document.getElementById('cart-shipping-row');
    const shipElem = document.getElementById('cart-shipping');
    const hintElem = document.getElementById('cart-ship-hint');
    if (shipRow) shipRow.style.display = shippingRules.length ? 'flex' : 'none';
    if (shipElem) shipElem.textContent = shipping > 0 ? `RM ${shipping.toFixed(2)}` : 'FREE';
    if (hintElem) {
        // tell the customer how far they are from the next, cheaper shipping tier
        const next = nextCheaperTier(subtotal);
        if (next) {
            const more = (next.minSpend - subtotal).toFixed(2);
            hintElem.textContent = next.charge === 0 ? `Add RM ${more} more to get FREE shipping!` : `Add RM ${more} more to reduce shipping to RM ${next.charge.toFixed(2)}.`;
            hintElem.style.display = 'block';
        } else {
            hintElem.style.display = 'none';
        }
    }
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    modal.style.display = hide ? 'none' : 'flex';
    if (!hide) updateCartDisplay();
}

async function initiateCheckout() {
    // FIX: the button lives outside #cart-checkout-area, so the old selector never found it
    const checkoutBtn = document.getElementById('checkout-btn');
    const resetBtn = () => { if (checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.textContent = 'Complete Order'; } };

    if (checkoutInFlight) return;
    if (cart.length === 0) { alert('Your cart is empty.'); return; }

    const name = document.getElementById('customer-name')?.value.trim();
    const phone = document.getElementById('customer-phone')?.value.trim();
    const address = document.getElementById('customer-address')?.value.trim();
    const email = document.getElementById('customer-email')?.value.trim();

    if (!name || !phone || !address) {
        alert(CustomerAuth.getState().authenticated ? 'Your saved profile needs a name, phone and delivery address. Update My profile before ordering.' : 'Please fill in all required customer details: Name, Phone, and Address.');
        return;
    }

    for (const id of ['customer-name', 'customer-phone', 'customer-address', 'customer-email']) {
        const field = document.getElementById(id); if (field && !field.reportValidity()) return;
    }
    checkoutInFlight = true;
    const status = document.getElementById('checkout-status'); if (status) status.textContent = '';
    if (checkoutBtn) { checkoutBtn.disabled = true; checkoutBtn.textContent = 'Processing...'; }

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const shippingFee = calcShipping(subtotal);
    const totalAmount = subtotal + shippingFee;
    const itemsPurchased = cart.map(item => `${item.id}x${item.quantity}`).join(', ');

    const payload = {
        action: 'logInitialOrder',
        data: {
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            customerAddress: address,
            itemsPurchased: itemsPurchased,
            cart: cart,
            totalAmount: totalAmount,
            shippingFee: shippingFee,
            totalPointsForThisPurchase: 0
        }
    };

    const signature = JSON.stringify({ session: CustomerAuth.getState().sessionId, data: payload.data });
    if (!checkoutAttempt || checkoutAttempt.signature !== signature) checkoutAttempt = { signature, requestId: crypto.randomUUID() };
    payload.data.requestId = checkoutAttempt.requestId;
    try {
        const result = await CustomerAuth.submitOrder(payload.data);
        if (!StoreCore.confirmedOrder(result)) throw new Error('The shop did not return a confirmed order reference.');
        lastConfirmedOrder = result;
        renderOrderConfirmation(result);
        cart = [];
        checkoutAttempt = null;
        toggleCart(true);
        updateCartDisplay();
    } catch (error) {
        console.error('Checkout failed:', error);
        if (status && error.code === 'ACCOUNT_UNVERIFIED') status.textContent = error.message;
        else if (status) status.innerHTML = 'Your order could not be confirmed. Your cart has been kept. Check <a href="customer.html" target="_blank" rel="noopener">My Account</a> or contact the shop before submitting again if you may already have placed this order.';
    } finally {
        checkoutInFlight = false;
        resetBtn();
    }
}

// ===========================================================
// [ 5.0 ] FORMS LOGIC
// ===========================================================
function toggleJobModal(show = false, jobId = '', jobTitle = '') {
    const modal = document.getElementById('job-application-modal');
    if (!modal) return;
    if (show) {
        const titleElem = document.getElementById('job-modal-title');
        const idInput = document.getElementById('job-id-input');
        const posInput = document.getElementById('job-position-input');
        if (titleElem) titleElem.textContent = jobTitle;
        if (idInput) idInput.value = jobId;
        if (posInput) posInput.value = jobTitle;
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
        const form = document.getElementById('job-application-form');
        if (form) form.reset();
    }
}

async function handleEnquirySubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('enquiry-status');
    if (statusEl) statusEl.textContent = 'Sending...';
    try {
        const payload = { action: 'logEnquiry', data: { name: document.getElementById('enquiry-name')?.value, email: document.getElementById('enquiry-email')?.value, phone: document.getElementById('enquiry-phone')?.value, type: document.getElementById('enquiry-type')?.value, message: document.getElementById('enquiry-message')?.value } };
        await postDataToGScript(payload);
        if (statusEl) statusEl.textContent = 'Enquiry sent successfully!';
        event.target.reset();
    } catch (error) {
        console.error('Enquiry failed:', error);
        if (statusEl) statusEl.textContent = 'An error occurred. Please try again.';
    }
}

async function handleJobApplicationSubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('job-application-status');
    const fileInput = document.getElementById('applicant-resume');
    if (!fileInput || fileInput.files.length === 0) {
        if (statusEl) statusEl.textContent = 'Resume upload is mandatory.';
        return;
    }
    if (statusEl) statusEl.textContent = 'Submitting...';
    try {
        const file = fileInput.files[0];
        if (file.size > 5 * 1024 * 1024) {
            if (statusEl) statusEl.textContent = 'Resume must be under 5 MB.';
            return;
        }
        const base64File = await getBase64(file);
        const payload = {
            action: 'logJobApplication',
            data: {
                jobId: document.getElementById('job-id-input')?.value,
                position: document.getElementById('job-position-input')?.value,
                name: document.getElementById('applicant-name')?.value,
                email: document.getElementById('applicant-email')?.value,
                phone: document.getElementById('applicant-phone')?.value,
                citizenship: document.getElementById('applicant-citizenship')?.value,
                message: document.getElementById('applicant-message')?.value,
                resumeFile: base64File.split(',')[1],
                resumeMimeType: file.type,
                resumeFileName: file.name
            }
        };
        await postDataToGScript(payload);
        if (statusEl) statusEl.textContent = 'Application submitted successfully!';
        setTimeout(() => { toggleJobModal(false); }, 3000);
    } catch (error) {
        console.error('Job application failed:', error);
        if (statusEl) statusEl.textContent = 'An error occurred. Please try again.';
    }
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ===========================================================
// [ 6.0 ] CHATBOT LOGIC
// ===========================================================
function chatIcon(name) {
    const paths = {
        leaf: '<path d="M20 4c0 10-4 16-10 16a6 6 0 0 1-6-6C4 8 10 4 20 4Z"/><path d="m4 20 10-10M10 14v-4m0 4h4"/>',
        chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-8.5A8.5 8.5 0 0 1 11.5 4h1a8.5 8.5 0 0 1 8.5 7.5Z"/><path d="M8 11h8M8 15h5"/>',
        orders: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h3"/>',
        status: '<path d="M3 6h11v12H3zM14 10h4l3 4v4h-7M3 10h5"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
        rewards: '<path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/>',
        profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
        shop: '<path d="M5 7h14l2 14H3L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
        browse: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        human: '<path d="M21 11.5A9 9 0 0 1 8 19.6L3 21l1.4-5A9 9 0 1 1 21 11.5Z"/><path d="M8 7c0 4 2 7 6 9l2-2-3-2-1 1c-1.5-.8-2.5-1.8-3-3l1-1-2-2Z"/>',
        lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
        close: '<path d="m6 6 12 12M6 18 18 6"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        send: '<path d="m3 3 18 9-18 9 4-9-4-9ZM7 12h14"/>',
        arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
        external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        logout: '<path d="M9 4H4v16h5m5-12 4 4-4 4M8 12h12"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.chat}</svg>`;
}

function scrollChatToEnd() {
    const body = document.getElementById('chat-body');
    if (body) body.scrollTop = body.scrollHeight;
}

function updateChatIdentity() {
    const state = document.getElementById('chat-account-state');
    if (state) state.textContent = chatSession.token ? 'Signed in · Your personal account' : 'Shopping & account support';
}

function toggleChatWidget(show) {
    const widget = document.getElementById('eshop-chat-widget');
    if (!widget) return;
    widget.classList.toggle('active', !!show);
    widget.setAttribute('aria-hidden', String(!show));
    widget.inert = !show;
    const launcher = document.querySelector('.chatbot-fab');
    if (launcher) launcher.setAttribute('aria-expanded', String(!!show));
    if (show) {
        const body = document.getElementById('chat-body');
        if (body && !body.children.length) displayMainMenu();
    } else if (widget.contains(document.activeElement)) {
        launcher?.focus({ preventScroll: true });
    }
}

function addChatMessage(sender, text, type = 'text') {
    const body = document.getElementById('chat-body');
    if (!body) return null;
    const message = document.createElement('div');
    message.classList.add('chat-message', sender === 'bot' ? 'bot-message' : 'user-message');
    if (type === 'html') message.innerHTML = text;
    else { message.textContent = text; message.classList.add('chat-text'); }
    body.appendChild(message);
    scrollChatToEnd();
    return message;
}

const chatOptions = [
    { id: 'orders', title: 'Check orders', detail: 'Your purchase history', icon: 'orders', personal: true },
    { id: 'status', title: 'Order status', detail: 'Follow your delivery', icon: 'status', personal: true },
    { id: 'rewards', title: 'Reward points', detail: 'See your balance', icon: 'rewards', personal: true },
    { id: 'profile', title: 'My profile', detail: 'Update your details', icon: 'profile', personal: true },
    { id: 'shop', title: 'Place an order', detail: 'Help with your cart', icon: 'shop' },
    { id: 'browse', title: 'Browse products', detail: 'Explore the collection', icon: 'browse' }
];
let chatBusy = false;

function chatWhatsAppUrl() {
    return 'https://wa.me/' + String(WHATSAPP_NUMBER || '').replace(/\D/g, '');
}

function displayMainMenu() {
    // Clear abandoned password/profile forms when returning to the options.
    document.querySelectorAll('#chat-body .chat-form-card').forEach(card => {
        card.querySelector('form')?.reset(); card.remove();
    });
    document.querySelectorAll('#chat-body .chat-menu-card').forEach(card => card.remove());
    delete chatSession.pendingAction;
    chatSession.state = 'main_menu';
    updateChatIdentity();
    const customerName = chatSession.customer?.customerName?.trim().split(/\s+/)[0];
    const title = chatSession.token && customerName ? `Welcome back, ${esc(customerName)}.` : 'How can I help you?';
    const host = addChatMessage('bot', `
        <div class="chat-menu-intro"><span class="chat-eyebrow">A LITTLE HELP, ANYTIME</span><h3>${title}</h3><p>Choose an option, or ask a question below.</p>${chatSession.token ? `<button type="button" class="chat-signout" data-chat-action="logout">${chatIcon('logout')} Sign out of my account</button>` : ''}</div>
        <div class="chat-options">${chatOptions.map(option => `
            <button type="button" class="chat-option" data-chat-action="${option.id}">
                <span class="chat-option-icon">${chatIcon(option.icon)}</span>
                <span class="chat-option-copy"><strong>${option.title}</strong><small>${option.detail}</small></span>
                ${option.personal && !chatSession.token ? `<span class="chat-option-lock" title="Sign in for personal details">${chatIcon('lock')}</span>` : ''}
            </button>`).join('')}
            <a class="chat-human-link" href="${chatWhatsAppUrl()}" target="_blank" rel="noopener noreferrer">
                <span class="chat-human-icon">${chatIcon('human')}</span><span><strong>Talk to a human</strong><small>Continue on WhatsApp</small></span>${chatIcon('external')}
            </a>
        </div>
        ${!chatSession.token ? '<p class="chat-menu-note">'+chatIcon('lock')+' Sign in only for personal details.</p>' : ''}
    `, 'html');
    host.classList.add('chat-menu-card');
    scrollChatToEnd();
}

function displayMyAccountMenu() { displayMainMenu(); }

function setChatBusy(busy) {
    chatBusy = busy;
    document.querySelectorAll('#eshop-chat-widget [data-chat-action], #eshop-chat-widget [data-chat-order], #eshop-chat-widget [data-chat-product], #eshop-chat-widget [data-chat-view-product], #chat-send-btn, #chat-menu-btn').forEach(button => { button.disabled = busy; });
    document.getElementById('chat-body')?.setAttribute('aria-busy', String(busy));
}

async function runChatTask(task) {
    if (chatBusy) return;
    setChatBusy(true);
    const thinking = addChatMessage('bot', '<span class="chat-typing" aria-hidden="true"><span></span><span></span><span></span></span><span class="chat-sr-only">Getting your answer…</span>', 'html');
    thinking.classList.add('chat-thinking');
    try { await task(); }
    catch (error) {
        if (error.message !== 'SESSION_EXPIRED') addChatMessage('bot', error.message || 'Sorry, I couldn’t load that. Please try again.');
    } finally {
        thinking.remove(); setChatBusy(false); scrollChatToEnd();
    }
}

async function handleChatSubmit(event) {
    event?.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    if (!text || chatBusy) return;
    input.value = '';
    addChatMessage('user', text);
    await runChatTask(() => handleMainMenu(text));
}

async function handleMainMenu(text) {
    const intent = text.toLowerCase().trim();
    if (chatSession.pendingProductChoice) {
        const choice = chatSession.pendingProductChoice;
        const selected = AssistantKnowledge.selection(text, choice.ids.length);
        if (selected !== null) { chatProductAnswer(choice.question, choice.topic, choice.ids[selected]); return; }
    }
    if (chatSession.pendingOrderTopic) {
        const ids = chatSession.recentOrders?.map(order => order.invoiceId) || [];
        const selected = AssistantKnowledge.selection(text, ids.length);
        if (selected !== null) {
            const topic = chatSession.pendingOrderTopic;
            chatSession.selectedOrderId = ids[selected]; delete chatSession.pendingOrderTopic;
            await chatOrderHelp(topic); return;
        }
    }
    const numeric = { '1': 'orders', '2': 'status', '3': 'rewards', '4': 'profile', '5': 'shop', '6': 'browse', '7': 'human' };
    if (numeric[intent]) return handleChatAction(numeric[intent]);
    if (/^(menu|home|help|my account|options)$/.test(intent)) return displayMainMenu();
    if (/^(sign out|log out|logout)$/.test(intent)) return handleChatAction('logout');
    if (/talk.*human|speak.*(human|person)|contact.*(admin|support)|^whatsapp$/.test(intent)) return handleChatAction('human');
    if (await answerShopQuestion(text)) return;
    if (/order status|delivery status|track.*order|where.*(order|parcel)/.test(intent)) return chatOrderHelp('status', text);
    if (/^(orders|my orders|check orders|previous orders|order history)$/.test(intent)) return handleChatAction('orders');
    if (/^(points|rewards|my points|reward points|my rewards|check.*points)$/.test(intent)) return handleChatAction('rewards');
    if (/my profile|update.*profile|change.*(address|phone)|^profile$/.test(intent)) return handleChatAction('profile');
    if (/place.*order|how.*order|^buy$|checkout|^cart$/.test(intent)) return handleChatAction('shop');
    if (/^(browse products|browse|catalog|catalogue|products|collections)$/.test(intent)) return handleChatAction('browse');
    const productMatches = AssistantKnowledge.productMatches(text, products);
    if (productMatches.length) { chatProductAnswer(text, 'product'); return; }
    addChatMessage('bot', AssistantKnowledge.answer(text).answer);
    chatHelpSuggestions([['browse', 'Find a product'], ['orders', 'My orders'], ['human', 'Ask the shop']]);
}

function chatFormField(form, labelText, type, value = '') {
    const label = document.createElement('label');
    label.textContent = labelText;
    const field = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') field.type = type;
    field.value = value;
    label.appendChild(field); form.appendChild(label);
    return field;
}

// Personal requests use the same sign-in as the storefront and customer portal.
function showChatLogin(action) {
    if (CustomerAuth.getState().authenticated) {
        chatSession.token = CustomerAuth.getState().sessionId; chatSession.customer = CustomerAuth.getState().customer;
        if (action) handleChatAction(action); return;
    }
    document.querySelectorAll('#chat-body .chat-form-card').forEach(card => card.remove());
    const host = addChatMessage('bot', 'Sign in to your customer account to view personal details. The shop, your profile and this assistant use the same login.');
    const link = document.createElement('a'); link.href = 'customer.html?login=1'; link.className = 'chat-help-button'; link.textContent = 'Sign in to my account';
    link.addEventListener('click', () => rememberChatReturn(action || 'orders')); host.appendChild(link);
    scrollChatToEnd();
}

async function customerChatRequest(action, data = {}) {
    if (!chatSession.token) { showChatLogin(); return null; }
    const identity = chatSession.token;
    const pending = chatSession.lastPersonalAction;
    try {
        const result = await CustomerAuth.request(action, data);
        if (chatSession.token !== identity) throw new Error('Your session changed. Please try again.');
        return result;
    } catch (failure) {
        if (failure.code === 'SESSION_EXPIRED') { showChatLogin(pending || 'orders'); throw new Error('SESSION_EXPIRED'); }
        throw failure;
    }
}

function showChatProfile() {
    document.querySelectorAll('#chat-body .chat-form-card').forEach(card => card.remove());
    const customer = chatSession.customer || {};
    const host = addChatMessage('bot', '<span class="chat-form-icon">'+chatIcon('profile')+'</span><h3>Your delivery details</h3><p>Keep your name, phone and address up to date. Your account email stays the same.</p>', 'html');
    host.classList.add('chat-form-card');
    const form = document.createElement('form'); form.className = 'chat-form';
    const fields = {};
    for (const [key, labelText] of [['customerName', 'Full name'], ['customerPhone', 'Phone'], ['customerAddress', 'Delivery address']]) {
        const field = chatFormField(form, labelText, key === 'customerAddress' ? 'textarea' : key === 'customerPhone' ? 'tel' : 'text', customer[key] || '');
        field.required = key !== 'customerAddress'; field.maxLength = 2000; fields[key] = field;
    }
    const actions = document.createElement('div'); actions.className = 'chat-form-actions';
    actions.innerHTML = '<button type="submit" class="chat-primary-btn">Save profile</button><button type="button" class="chat-secondary-btn">Cancel</button>'; form.appendChild(actions);
    const save = actions.querySelector('[type="submit"]'); const cancel = actions.querySelector('[type="button"]');
    cancel.addEventListener('click', () => host.remove());
    const status = document.createElement('p'); status.className = 'chat-form-status'; status.setAttribute('role', 'status'); form.appendChild(status);
    form.addEventListener('submit', async event => {
        event.preventDefault(); if (chatBusy) return;
        save.disabled = true; cancel.disabled = true; setChatBusy(true); status.textContent = 'Saving…';
        const payload = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value.trim()]));
        try {
            const result = await customerChatRequest('updateCustomerProfile', payload);
            if (!result?.success) throw new Error(result?.message || 'Profile was not saved.');
            Object.assign(chatSession.customer, payload); host.remove(); addChatMessage('bot', 'Profile saved.');
        } catch (error) { status.textContent = error.message || 'Could not save profile.'; }
        finally { save.disabled = false; cancel.disabled = false; setChatBusy(false); scrollChatToEnd(); }
    });
    host.appendChild(form); scrollChatToEnd();
}

function renderChatOrders(result, tracking, selectionOnly = false) {
    const rawOrders = Array.isArray(result.orders) ? result.orders : [];
    if (!selectionOnly) { chatSession.focus = 'order'; chatSession.displayedOrderIds = rawOrders.map(order => order.invoiceId); chatSession.recentOrders = rawOrders; if (rawOrders.length === 1) chatSession.selectedOrderId = rawOrders[0].invoiceId; }
    const orders = rawOrders.map(order => ({ ...order, status: StoreCore.customerOrderStatus(order), items: chatOrderLines(order).map(item => item.name + (item.quantity === null ? ' (quantity not provided)' : ' × ' + item.quantity)).join(', ') }));
    if (!orders.length) { addChatMessage('bot', 'No orders yet. Browse the collection to find something you’ll love.'); return; }
    const stages = ['Pending payment', 'Paid', 'Awaiting Shipment', 'On the Way', 'Delivered'];
    const host = addChatMessage('bot', `<div class="chat-result-heading">${chatIcon(tracking ? 'status' : 'orders')}<h3>${tracking ? 'Your order status' : 'Your orders'}</h3></div>` + orders.map(order => {
        const stage = stages.indexOf(order.status);
        return `<article class="chat-order-card">
            <div class="chat-order-top"><strong>${esc(order.invoiceId)}</strong><span class="chat-status-badge${order.status === 'Delivered' ? ' is-delivered' : ''}">${esc(order.status)}</span></div>
            <span class="chat-order-date">${esc(order.date)}</span>
            ${tracking && stage >= 0 ? `<ol class="chat-order-timeline" aria-label="Order progress">${stages.map((label, i) => `<li class="${i < stage ? 'is-done' : i === stage ? 'is-current' : ''}"${i === stage ? ' aria-current="step"' : ''}><span class="chat-step-dot">${i < stage ? chatIcon('check') : ''}</span><span>${esc(label)}</span></li>`).join('')}</ol>` : `<p class="chat-order-items">${esc(order.items)}</p><div class="chat-order-total"><span>Order total</span><strong>RM ${esc(order.total)}</strong></div>`}
            ${order.remarks ? `<p class="chat-order-remarks">${esc(order.remarks)}</p>` : ''}
            <button type="button" class="chat-help-button" data-chat-order="${esc(order.invoiceId)}">Ask about this order</button>
        </article>`;
    }).join(''), 'html');
    host.classList.add('chat-results'); scrollChatToEnd();
}

async function handleChatAction(action) {
    if (action.startsWith('help-') && ['cancel', 'returns', 'amend', 'invoice', 'receipt', 'payment', 'status', 'summary', 'items', 'quantity', 'total', 'shipping', 'date', 'address', 'prices', 'products', 'count'].includes(action.slice(5))) return chatOrderHelp(action.slice(5));
    if (action === 'choose-orders') {
        delete chatSession.selectedOrderId;
        return handleChatAction('orders');
    }
    const option = chatOptions.find(item => item.id === action);
    if (option?.personal && !chatSession.token) { showChatLogin(action); return; }
    if (option?.personal) chatSession.lastPersonalAction = action;
    if (action === 'orders' || action === 'status') {
        const result = await customerChatRequest('getCustomerOrders');
        if (!result?.success) { addChatMessage('bot', result?.message || 'Could not load orders. Please try again.'); return; }
        renderChatOrders(result, action === 'status');
    } else if (action === 'rewards') {
        const result = await customerChatRequest('getCustomerRewards');
        if (!result?.success) { addChatMessage('bot', result?.message || 'Could not load rewards.'); return; }
        const balance = Number(result.balance);
        const host = addChatMessage('bot', `<div class="chat-result-heading">${chatIcon('rewards')}<h3>Your rewards</h3></div><div class="chat-rewards-card"><span>AVAILABLE POINTS</span><strong>${Number.isFinite(balance) ? balance.toLocaleString() : '—'}</strong><p>Thank you for shopping with us.</p></div>`, 'html');
        host.classList.add('chat-results');
    } else if (action === 'profile') { showChatProfile(); }
    else if (action === 'shop') {
        chatSession.focus = 'cart'; delete chatSession.pendingProductChoice;
        toggleCart(false);
        const customer = chatSession.customer || {};
        for (const [id, key] of [['customer-name', 'customerName'], ['customer-phone', 'customerPhone'], ['customer-email', 'customerEmail'], ['customer-address', 'customerAddress']]) {
            const input = document.getElementById(id);
            if (chatSession.token && input && !input.value.trim()) input.value = customer[key] || '';
        }
        addChatMessage('bot', 'Your cart is open. Add products from the collection, review your items and delivery details, then press Complete Order when you’re ready. You can shop without signing in.');
        toggleChatWidget(false);
    } else if (action === 'browse') {
        chatSession.focus = 'product'; delete chatSession.pendingProductChoice;
        showTab('products'); toggleChatWidget(false);
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'human') {
        addChatMessage('bot', `<a class="chat-human-link" href="${chatWhatsAppUrl()}" target="_blank" rel="noopener noreferrer"><span class="chat-human-icon">${chatIcon('human')}</span><span><strong>Talk to a human</strong><small>Continue on WhatsApp</small></span>${chatIcon('external')}</a>`, 'html');
    } else if (action === 'logout') {
        try { await CustomerAuth.logout(); }
        finally {
            chatSession = {}; document.getElementById('chat-body')?.replaceChildren(); updateChatIdentity();
            addChatMessage('bot', 'You’re signed out. You can still browse and ask questions.'); displayMainMenu();
        }
    }
}

async function handleMyAccountMenu(text) { return handleMainMenu(text); }

// ===========================================================
// [ 7.0 ] GLOBAL UTILITIES & API HELPERS
// ===========================================================
function showTab(tabId) {
    // leaving a product page through the menu: drop its address so Back/refresh behave
    if (productRoute() !== null && tabId !== 'product-detail') {
        try { window.history.replaceState(null, '', window.location.pathname + (() => { const query = new URLSearchParams(location.search); query.delete('product'); return query.size ? '?' + query : ''; })()); } catch (e) { /* ignore */ }
    }
    activateTab(tabId);
}

// FIX: the old "no-cors" request could never read the server's reply, so the shop showed
// "order placed" even when the backend rejected the order. A text/plain POST needs no
// CORS pre-flight with Apps Script and lets us read the real result.
// Saves a PDF sent as base64 straight to the customer's downloads
function downloadPdfBase64(base64, filename) {
    try {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url; a.download = filename || 'Invoice.pdf';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
    } catch (e) { console.error('PDF download failed:', e); return false; }
}

async function postDataToGScript(payload) {
    const response = await fetch(googleScriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
        redirect: 'follow'
    });
    if (!response.ok) throw new Error('Server responded with ' + response.status);
    const result = await response.json();
    if (!result || typeof result !== 'object' || result.status === 'error' || result.success === false) {
        throw new Error(result?.message || 'Request was rejected by the server.');
    }
    if (result.success !== true && result.status !== 'success') throw new Error('The shop did not confirm this request.');
    return result;
}

// ===========================================================
// [ 8.0 ] THEME & MARKETING
// ===========================================================
function applyTheme(theme) {
    FestivalFX.init(theme || null);
}

function applyMarketing(marketing, theme) {
    const banner = document.getElementById('promo-running-banner');
    if (!banner) return;
    const bannerText = marketing.BannerText || (theme ? theme.WelcomeMessage : null);

    if (bannerText) {
        const textElem = document.getElementById('promo-banner-text');
        if (textElem) textElem.textContent = bannerText;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function buildPopupModal(message, imageUrl) {
    if (!message && !imageUrl) return;
    if (sessionStorage.getItem('eshopPopupShown') === 'true') return;

    const container = document.getElementById('popup-modal');
    if (!container) return;
    let modalHTML = '';

    if (imageUrl) {
        modalHTML = `
        <div class="modal-content" style="max-width: 500px; padding: 0;">
             <button class="close" aria-label="Close" style="position: absolute; top: 10px; right: 20px; font-size: 30px; background: white; border-radius: 50%; width: 40px; height: 40px; opacity: 0.8;" onclick="togglePopup(true)">&times;</button>
             <img src="${esc(imageUrl)}" style="width: 100%; border-radius: var(--border-radius);" onerror="this.parentElement.style.display='none'">
        </div>`;
    } else {
        modalHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Welcome!</h2>
                <button class="close" aria-label="Close" onclick="togglePopup(true)">&times;</button>
            </div>
            <div class="modal-body" style="padding: 30px; font-size: 1.1rem; text-align: center;">
                ${esc(message)}
            </div>
        </div>`;
    }

    container.innerHTML = modalHTML;
    togglePopup(false);
    sessionStorage.setItem('eshopPopupShown', 'true');
}

function togglePopup(hide = false) {
    const modal = document.getElementById('popup-modal');
    if (modal) modal.style.display = hide ? 'none' : 'flex';
}
