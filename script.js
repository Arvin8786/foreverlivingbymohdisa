// =================================================================
// E-Shop Frontend Script - v35.0 (ROBUST FIX)
// =================================================================

// [ 1.0 ] GLOBAL CONFIGURATION
// CRITICAL: Update this URL to match your latest Code.gs deployment
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbxdJ2vGxgnSqVLusH1txOR8ZkhTEP_8brLSz2lXdBbleisT3c-nYyrudcGbYxnoRShFjg/exec'; 
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';
const apiKey = '9582967';

let products = [];
let allJobs = [];
let cart = [];
let chatSession = {};

// [ 2.0 ] INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // --- Attach Static Listeners ---
    const loginBtn = document.getElementById('nav-login-btn');
    if(loginBtn) loginBtn.addEventListener('click', () => toggleLoginModal(true));
    
    const closeLoginBtn = document.getElementById('close-login-modal-btn');
    if(closeLoginBtn) closeLoginBtn.addEventListener('click', () => toggleLoginModal(false));
    
    // Start fetching data immediately
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();
        
        // Check status but proceed even if partial data
        if (data.status !== 'success') console.warn('Backend reported issue:', data.message);

        // --- ROBUST DATA EXTRACTION (Prevents crashes) ---
        const marketing = data.marketingData || {};
        const theme = data.activeTheme || null;
        products = data.products || [];
        allJobs = data.jobsListings || [];
        const about = data.aboutUsContent || {};
        const testimonies = data.testimonies || [];

        // 1. Maintenance Mode Check
        if (marketing.MaintenanceMode === 'TRUE') {
            document.getElementById('store-wrapper').style.display = 'none';
            const overlay = document.getElementById('maintenance-overlay');
            if(overlay) {
                overlay.style.display = 'flex';
                const msg = document.getElementById('maintenance-message');
                if(msg) msg.textContent = marketing.MaintenanceMessage || 'We are currently under maintenance.';
            }
            return; // Stop execution
        }

        // 2. Apply Theme & Marketing (Safely)
        if (theme) applyTheme(theme);
        if (marketing) applyMarketing(marketing, theme);
        if (marketing.PopupMessageText || marketing.PopupImageURL) {
            buildPopupModal(marketing.PopupMessageText, marketing.PopupImageURL);
        }

        // 3. Render Core Content
        renderMainContentShell();
        renderStaticContent(about);
        renderHomepageContent(about, allJobs, testimonies);
        renderProducts(products, marketing.ProductTagText);
        renderAboutUs(about);
        renderJobs(allJobs);
        
        // 4. Build Modals
        buildEnquiryForm();
        buildCartModal();
        buildJobApplicationModal();
        buildFabButtons();
        
        // 5. Timestamp
        const ts = document.getElementById('update-timestamp');
        if(ts) ts.textContent = `${new Date().toLocaleDateString('en-GB')} (v35.0)`;

        // 6. Attach Form Listeners
        const enqForm = document.getElementById('enquiry-form');
        if(enqForm) enqForm.addEventListener('submit', handleEnquirySubmit);
        
        const jobForm = document.getElementById('job-application-form');
        if(jobForm) jobForm.addEventListener('submit', handleJobApplicationSubmit);

        // 7. Show Homepage
        showTab('homepage');

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        const main = document.getElementById('main-content');
        if(main) main.innerHTML = `<div style="text-align:center; padding:40px; color:#a83232;">
            <h2>System Unavailable</h2>
            <p>We are having trouble connecting to the store.</p>
            <p style="font-size:0.9em; color:#666;">Technical Details: ${error.message}</p>
        </div>`;
    }
}

// [ 3.0 ] UI RENDERING
function renderStaticContent(content) {
    if (!content) return;
    const header = document.getElementById('company-name-header');
    const footer = document.getElementById('footer-text');
    
    if(header) header.innerHTML = `${content.CompanyName || ''} <span class="by-line">${content.Owner || ''} - ${content.Role || ''}</span> <span class="slogan">${content.Slogan || ''}</span>`;
    if(footer) footer.textContent = content.Footer || `© ${new Date().getFullYear()} ${content.CompanyName || 'Company Name'}`;
}

function renderMainContentShell() {
    const main = document.getElementById('main-content');
    if(!main) return;
    main.innerHTML = `
        <div id="homepage" class="tab-content">
            <section id="homepage-hero" class="hero-section"></section>
            <section id="why-choose-us" class="dynamic-content-wrapper"></section>
            <section id="youtube-videos" class="dynamic-content-wrapper"></section>
            <section id="homepage-testimonies" class="dynamic-content-wrapper"><h2>What Our Customers Say</h2><div id="testimonies-container"></div></section>
            <section id="homepage-featured-jobs" class="dynamic-content-wrapper"><h2>Join Our Team</h2><div id="featured-jobs-container"></div><a onclick="showTab('jobs')" class="btn btn-secondary" style="display: table; margin: 20px auto 0; max-width: 300px;">View All Career Opportunities</a></section>
        </div>
        <div id="products" class="tab-content"><div id="product-list-container"></div></div>
        <div id="about" class="tab-content"><section id="about-us-content" class="dynamic-content-wrapper"></section></div>
        <div id="jobs" class="tab-content"><section id="jobs-content" class="dynamic-content-wrapper"><h2>All Career Opportunities</h2><div id="job-listings-container"></div></section></div>
        <div id="enquiries" class="tab-content"><section id="enquiries-form-content" class="dynamic-content-wrapper"></section></div>
        <div id="rewards" class="tab-content"><section class="dynamic-content-wrapper"><h2>Rewards</h2><p>This feature is coming soon!</p></section></div>
    `;
}

function renderHomepageContent(about, jobs, testimonies) {
    if (!about) return;
    
    const hero = document.getElementById('homepage-hero');
    if(hero) hero.innerHTML = `<h2>${about.CompanyName || 'Welcome'}</h2><p>${about.Slogan || ''}</p>`;

    const why = document.getElementById('why-choose-us');
    if(why) why.innerHTML = `<h2>${about.WhyChooseUs_Title || 'Why Us?'}</h2><div class="why-choose-us-grid"><div><i class="${about.Point1_Icon}"></i><p>${about.Point1_Text}</p></div><div><i class="${about.Point2_Icon}"></i><p>${about.Point2_Text}</p></div><div><i class="${about.Point3_Icon}"></i><p>${about.Point3_Text}</p></div></div>`;

    const ytSection = document.getElementById('youtube-videos');
    const videoUrls = about.YoutubeURL ? String(about.YoutubeURL).split(',') : [];
    if (ytSection && videoUrls.length > 0 && videoUrls[0]) {
        const videosHtml = videoUrls.map(url => {
            try {
                const videoId = new URL(url.trim()).searchParams.get('v');
                if (videoId) return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
            } catch(e) { return ''; }
            return '';
        }).join('');
        ytSection.innerHTML = `<h2>${about.YoutubeSection_Title || 'Learn More'}</h2><div id="youtube-videos-container">${videosHtml}</div>`;
    } else if(ytSection) { ytSection.style.display = 'none'; }

    const testContainer = document.getElementById('testimonies-container');
    if (testContainer && testimonies && testimonies.length > 0) {
        testContainer.innerHTML = testimonies.map(t => {
            let stars = ''; for (let i = 0; i < 5; i++) stars += `<i class="fa-solid fa-star" style="color: ${i < t.Rating ? 'var(--secondary-color)' : '#ccc'}"></i>`;
            return `<div class="testimony-card"><div class="testimony-header"><h4>${t.ClientName}</h4><div class="testimony-rating">${stars}</div></div><p>"${t.Quote}"</p></div>`;
        }).join('');
    } else if(testContainer) { document.getElementById('homepage-testimonies').style.display = 'none'; }

    const jobContainer = document.getElementById('featured-jobs-container');
    const featured = jobs ? jobs.filter(j => j.isFeatured) : [];
    if (jobContainer && featured.length > 0) {
        jobContainer.innerHTML = featured.map(j => `<div class="job-listing-summary"><h4>${j.position}</h4><p>${j.location} | ${j.type}</p></div>`).join('');
    } else if(jobContainer) { document.getElementById('homepage-featured-jobs').style.display = 'none'; }
}

// --- LUXURY PRODUCT RENDERER ---
function renderProducts(productsToRender, tagText) {
    const container = document.getElementById('product-list-container');
    if (!productsToRender || productsToRender.length === 0) { 
        container.innerHTML = `<p style="text-align:center; padding:40px;">No products found.</p>`; 
        return; 
    }
    
    const tagHtml = tagText ? `<div class="product-tag">${tagText}</div>` : '';

    container.innerHTML = `<div class="product-list">${productsToRender.map(p => `
        <div class="product-card" onclick="openProductDetails('${p.id}')">
            ${tagHtml}
            <div class="product-img-wrapper">
                <img src="${p.image}" alt="${p.name}" onerror="this.style.display='none'">
            </div>
            <div class="product-info-mini">
                <div class="product-title">${p.name}</div>
                <div class="product-tag">RM ${p.price.toFixed(2)}</div>
            </div>
            <div class="product-overlay">
                <span class="click-info-btn">View Details</span>
            </div>
        </div>`).join('')}</div>`;
}

// --- PRODUCT DETAILS MODAL LOGIC ---
function openProductDetails(productId) {
    const p = products.find(x => String(x.id) === String(productId));
    if (!p) return;

    const img = document.getElementById('pm-img');
    if(img) img.src = p.image;
    
    const title = document.getElementById('pm-title');
    if(title) title.textContent = p.name;
    
    const price = document.getElementById('pm-price');
    if(price) price.textContent = `RM ${p.price.toFixed(2)}`;
    
    const desc = document.getElementById('pm-desc');
    if(desc) desc.textContent = p.name + " is a premium product designed for your wellness.";
    
    const ben = document.getElementById('pm-ben');
    if(ben) ben.textContent = p.benefits || "Contact agent for details.";
    
    const use = document.getElementById('pm-use');
    if(use) use.textContent = p.consumption || "Contact agent for usage instructions.";
    
    // Re-bind Add Button
    const btn = document.getElementById('pm-add-btn');
    if(btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => { addToCart(p.id); closeProductModal(); };
    }

    const modal = document.getElementById('product-detail-modal');
    if(modal) modal.style.display = 'flex';
}

function closeProductModal() {
    const modal = document.getElementById('product-detail-modal');
    if(modal) modal.style.display = 'none';
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!content) return;
    const history = content.History ? `<div class="about-section"><h4>Our History</h4><p>${content.History}</p></div>` : '';
    container.innerHTML = `
        <h2>About ${content.CompanyName}</h2>
        <div class="owner-profile">
            <img src="arvind.jpg" alt="${content.Owner}" class="owner-image" onerror="this.style.display='none'">
            <div class="owner-details"><h3>${content.Owner} - ${content.Role}</h3><div>${content.MoreDetails}</div></div>
        </div>
        <div class="about-section"><h4>Our Mission</h4><p>${content.OurMission}</p></div>
        <div class="about-section"><h4>Our Vision</h4><p>${content.OurVision}</p></div>
        ${history}`;
}

function renderJobs(jobs) {
    const container = document.getElementById('job-listings-container');
    if (!jobs || jobs.length === 0) { container.innerHTML = '<p>No open positions.</p>'; return; }
    container.innerHTML = jobs.map(j => `
        <div class="job-card">
            <div class="job-header"><h3>${j.position}</h3></div>
            <div class="job-body">
                <div class="job-details">
                    <div class="job-detail-item"><i class="fa-solid fa-location-dot"></i> <span>${j.location} | ${j.type}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-money-bill-wave"></i> <span>${j.salary} RM</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-house-user"></i> <span>${j.accommodation}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-calendar-days"></i> <span>${j.workDayPattern}</span></div>
                </div>
                <div class="job-description">${j.description}</div>
                <button class="btn btn-primary" onclick="toggleJobModal(true, '${j.jobId}', '${j.position}')">Apply Now</button>
            </div>
        </div>`).join('');
}

function buildEnquiryForm() {
    const container = document.getElementById('enquiries-form-content');
    if(container) container.innerHTML = `
        <div class="enquiry-layout">
            <div class="contact-info-block">
                <h3>Get In Touch</h3>
                <p>We're here to help and answer any question you might have.</p>
                <div class="contact-detail"><i class="fa-solid fa-phone-volume"></i> <div><strong>Phone</strong><br><a href="tel:+60123456789">+601111033154</a></div></div>
                <div class="contact-detail"><i class="fa-solid fa-envelope"></i> <div><strong>Email</strong><br><a href="mailto:contact@example.com">cs.foreverlivingbymuhdarvindisa@gmail.com</a></div></div>
            </div>
            <form id="enquiry-form" class="enquiry-form">
                <div class="form-group"><input type="text" id="enquiry-name" class="form-input" placeholder=" " required><label class="form-label">Full Name</label></div>
                <div class="form-group"><input type="email" id="enquiry-email" class="form-input" placeholder=" " required><label class="form-label">Email</label></div>
                <div class="form-group"><input type="tel" id="enquiry-phone" class="form-input" placeholder=" " required><label class="form-label">Phone</label></div>
                <div class="form-group"><textarea id="enquiry-message" class="form-input" placeholder=" " rows="5" required></textarea><label class="form-label">Message</label></div>
                <button type="submit" class="btn btn-primary">Send Message</button>
                <p id="enquiry-status"></p>
            </form>
        </div>`;
}

function buildCartModal() {
    const container = document.getElementById('cart-modal');
    if(container) container.innerHTML = `
        <div class="modal-content">
            <div class="modal-header"><h2>Shopping Bag</h2><button class="close" onclick="toggleCart(true)">&times;</button></div>
            <div class="modal-body" id="cart-items-container"></div>
            <div id="cart-checkout-area" style="display:none;">
                <div class="modal-footer">
                    <div class="summary-line"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
                    <div class="summary-line total"><span>Total</span><span id="cart-total">RM 0.00</span></div>
                </div>
                <div class="customer-info-form">
                    <h3>Details</h3>
                    <input type="text" id="customer-name" class="form-input" placeholder="Full Name" required>
                    <input type="tel" id="customer-phone" class="form-input" placeholder="WhatsApp" required>
                    <input type="email" id="customer-email" class="form-input" placeholder="Email (Optional)">
                    <textarea id="customer-address" class="form-input" placeholder="Address" rows="2" required></textarea>
                </div>
                <div style="padding: 0 30px 30px;"><button class="btn btn-primary" style="width: 100%;" onclick="initiateCheckout()">Place Order</button></div>
            </div>
        </div>`;
}

function buildJobApplicationModal() {
    const container = document.getElementById('job-application-modal');
    if(container) container.innerHTML = `<div class="modal-content"><span class="close" onclick="toggleJobModal(false)">&times;</span><h2>Apply for <span id="job-modal-title"></span></h2><form id="job-application-form" class="enquiry-form"><input type="hidden" id="job-id-input"><input type="hidden" id="job-position-input"><input type="text" id="applicant-name" class="form-input" placeholder="Full Name" required><input type="email" id="applicant-email" class="form-input" placeholder="Email" required><input type="tel" id="applicant-phone" class="form-input" placeholder="Phone" required><input type="text" id="applicant-citizenship" class="form-input" placeholder="Citizenship" required><textarea id="applicant-message" class="form-input" placeholder="About yourself" rows="4"></textarea><label>Resume (Required)</label><input type="file" id="applicant-resume" required><button type="submit" class="btn btn-primary">Submit</button><p id="job-application-status"></p></form></div>`;
}

function buildFabButtons() {
    const container = document.getElementById('fab-container');
    if(container) container.innerHTML = `<div id="floating-cart" class="fab floating-cart-btn" onclick="toggleCart()"><i class="fa-solid fa-cart-shopping"></i><span id="cart-count">0</span></div>`;
}

function buildChatbotWidget() { /* Removed as requested */ }

// [ 4.0 ] CART LOGIC
function addToCart(id) {
    const p = products.find(x => x.id == id);
    const item = cart.find(x => x.id == id);
    if (item) item.quantity++; else cart.push({ ...p, quantity: 1 });
    updateCartDisplay();
}
function increaseQuantity(id) { const item = cart.find(x => x.id == id); if(item) item.quantity++; updateCartDisplay(); }
function decreaseQuantity(id) { const item = cart.find(x => x.id == id); if(item) { item.quantity--; if(item.quantity <= 0) removeItemFromCart(id); else updateCartDisplay(); } }
function removeItemFromCart(id) { cart = cart.filter(x => x.id != id); updateCartDisplay(); }

function updateCartDisplay() {
    const container = document.getElementById('cart-items-container');
    const checkout = document.getElementById('cart-checkout-area');
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cart-count');
    if(badge) badge.textContent = count;
    
    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fa-solid fa-shopping-bag" style="font-size:3rem; color:#eee; margin-bottom:10px;"></i><p style="color:#999;">Your bag is empty.</p></div>';
        checkout.style.display = 'none';
        return;
    }
    
    checkout.style.display = 'block';
    container.innerHTML = cart.map(i => `
        <div class="cart-item">
            <img src="${i.image}" class="cart-item-image">
            <div class="cart-item-details">
                <strong>${i.name}</strong>
                <p class="cart-item-price">RM ${(i.price * i.quantity).toFixed(2)}</p>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity(${i.id})">-</button>
                    <span>${i.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity(${i.id})">+</button>
                </div>
            </div>
            <button class="remove-item-btn" onclick="removeItemFromCart(${i.id})">Remove</button>
        </div>`).join('');
        
    const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    document.getElementById('cart-subtotal').textContent = `RM ${sub.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `RM ${sub.toFixed(2)}`;
}

function toggleCart(hide) {
    const modal = document.getElementById('cart-modal');
    if(modal) modal.style.display = hide ? 'none' : 'flex';
    if(!hide) updateCartDisplay();
}

async function initiateCheckout() {
    const btn = document.querySelector('#cart-checkout-area button');
    btn.disabled = true; btn.textContent = 'Processing...';
    
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const address = document.getElementById('customer-address').value;
    const email = document.getElementById('customer-email').value;

    if(!name || !phone || !address) { alert('Name, Phone and Address required.'); btn.disabled=false; btn.textContent='Place Order'; return; }

    const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const payload = {
        action: 'logInitialOrder',
        data: {
            customerName: name, customerPhone: phone, customerEmail: email, customerAddress: address,
            itemsPurchased: cart.map(i => `${i.id}x${i.quantity}`).join(', '),
            cart: cart, totalAmount: sub, shippingFee: 0.0, totalPointsForThisPurchase: 0
        }
    };

    try {
        await postDataToGScript(payload);
        alert('Order placed successfully! An agent will contact you shortly.');
        cart = []; toggleCart(true); updateCartDisplay();
    } catch(e) { alert('Error placing order.'); }
    finally { btn.disabled = false; btn.textContent = 'Place Order'; }
}

// [ 5.0 ] FORM & UTILS
function toggleJobModal(show, id='', title='') {
    const m = document.getElementById('job-application-modal');
    if(show) {
        document.getElementById('job-modal-title').textContent = title;
        document.getElementById('job-id-input').value = id;
        document.getElementById('job-position-input').value = title;
        m.style.display = 'flex';
    } else { m.style.display = 'none'; document.getElementById('job-application-form').reset(); }
}

async function handleEnquirySubmit(e) {
    e.preventDefault();
    const status = document.getElementById('enquiry-status');
    status.textContent = 'Sending...';
    try {
        await postDataToGScript({ action: 'logEnquiry', data: { 
            name: document.getElementById('enquiry-name').value, 
            email: document.getElementById('enquiry-email').value, 
            phone: document.getElementById('enquiry-phone').value, 
            message: document.getElementById('enquiry-message').value 
        }});
        status.textContent = 'Sent successfully!'; e.target.reset();
    } catch(err) { status.textContent = 'Error sending.'; }
}

async function handleJobApplicationSubmit(e) {
    e.preventDefault();
    const status = document.getElementById('job-application-status');
    const file = document.getElementById('applicant-resume').files[0];
    if(!file) { status.textContent = 'Resume required.'; return; }
    status.textContent = 'Uploading...';
    const base64 = await getBase64(file);
    try {
        await postDataToGScript({ action: 'logJobApplication', data: {
            jobId: document.getElementById('job-id-input').value,
            position: document.getElementById('job-position-input').value,
            name: document.getElementById('applicant-name').value,
            email: document.getElementById('applicant-email').value,
            phone: document.getElementById('applicant-phone').value,
            citizenship: document.getElementById('applicant-citizenship').value,
            message: document.getElementById('applicant-message').value,
            resumeFile: base64.split(',')[1], resumeMimeType: file.type, resumeFileName: file.name
        }});
        status.textContent = 'Submitted!'; setTimeout(() => toggleJobModal(false), 2000);
    } catch(err) { status.textContent = 'Error.'; }
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// [ 6.0 ] UTILS
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById(id);
    if(tab) tab.classList.add('active');
}

async function postDataToGScript(payload) {
    await fetch(googleScriptURL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
    return { status: 'success' };
}

// [ 7.0 ] THEME & MARKETING
function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;
    const themes = {
        'Christmas': {p:'#d90429', s:'#FFD700'},
        'HariRaya': {p:'#006400', s:'#f0e68c'},
        'CNY': {p:'#E00000', s:'#FFD700'},
        'Valentines': {p:'#D70040', s:'#FFC0CB'}
    };
    const c = themes[theme.ThemeName];
    if (c) {
        root.style.setProperty('--primary-color', c.p);
        root.style.setProperty('--secondary-color', c.s);
    }
    document.body.className = `theme-${theme.ThemeName}`;
    if (theme.ThemeName === 'Christmas' && typeof startSnowing === 'function') startSnowing('Christmas');
}

function applyMarketing(marketing, theme) {
    const b = document.getElementById('promo-running-banner');
    const txt = marketing.BannerText || (theme ? theme.WelcomeMessage : '');
    if(txt) { document.getElementById('promo-banner-text').textContent = txt; b.style.display = 'block'; }
    else b.style.display = 'none';
}

function buildPopupModal(msg, img) {
    if((!msg && !img) || sessionStorage.getItem('shownPopup')) return;
    const c = document.getElementById('popup-modal');
    c.innerHTML = `<div class="modal-content" style="max-width:500px;text-align:center;">
        <button class="close" onclick="togglePopup(true)" style="float:right;margin:10px;">&times;</button>
        <div class="modal-body">${img ? `<img src="${img}" style="width:100%">` : `<p>${msg}</p>`}</div>
    </div>`;
    togglePopup(false);
    sessionStorage.setItem('shownPopup', 'true');
}

function togglePopup(hide) { document.getElementById('popup-modal').style.display = hide ? 'none' : 'flex'; }
function toggleLoginModal(show) { document.getElementById('login-modal').style.display = show ? 'flex' : 'none'; }
