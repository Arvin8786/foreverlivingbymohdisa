// =================================================================
// E-Shop Frontend Script - v33.0 (Lead Capture Only)
// =================================================================

// [ 1.0 ] GLOBAL CONFIGURATION
// CRITICAL: Update this URL to match your latest Code.gs deployment
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbxfO-dgBDSFAAD4PUqLQDXEYxM5S-MAzEjfhVFo-7YstAYw6ShcnpeIxc81t4zr0s5mWA/exec'; 
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';
const apiKey = '9582967';

let products = [];
let allJobs = [];
let cart = [];
let chatSession = {};

// [ 2.0 ] INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // Login Modal Listeners (For Agent Access)
    const loginBtn = document.getElementById('nav-login-btn');
    if(loginBtn) loginBtn.addEventListener('click', () => toggleLoginModal(true));
    
    const closeLoginBtn = document.getElementById('close-login-modal-btn');
    if(closeLoginBtn) closeLoginBtn.addEventListener('click', () => toggleLoginModal(false));

    // Chatbot Listeners
    const chatSend = document.getElementById('chat-send-btn');
    if(chatSend) chatSend.addEventListener('click', handleChatSubmit);
    
    const chatInput = document.getElementById('chat-input');
    if(chatInput) chatInput.addEventListener('keyup', (e) => { if (e.key === "Enter") handleChatSubmit(); });

    // Load Store Data
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();
        
        if (data.status !== 'success') throw new Error(data.message || 'Unknown backend error');

        const marketing = data.marketingData || {};
        const theme = data.activeTheme || null;

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

        // 2. Apply Theme & Marketing
        if (theme) applyTheme(theme);
        if (marketing) applyMarketing(marketing, theme);
        if (marketing.PopupMessageText || marketing.PopupImageURL) {
            buildPopupModal(marketing.PopupMessageText, marketing.PopupImageURL);
        }

        // 3. Load Content
        products = data.products || [];
        allJobs = data.jobsListings || [];

        renderMainContentShell();
        renderStaticContent(data.aboutUsContent);
        renderHomepageContent(data.aboutUsContent, allJobs, data.testimonies);
        renderProducts(products, marketing.ProductTagText);
        renderAboutUs(data.aboutUsContent);
        renderJobs(allJobs);
        
        buildEnquiryForm();
        buildCartModal();
        buildJobApplicationModal();
        buildFabButtons();
        buildChatbotWidget();

        document.getElementById('update-timestamp').textContent = `${new Date().toLocaleDateString('en-GB')} (v33.0)`;

        // Dynamic Listeners
        const enqForm = document.getElementById('enquiry-form');
        if(enqForm) enqForm.addEventListener('submit', handleEnquirySubmit);
        
        const jobForm = document.getElementById('job-application-form');
        if(jobForm) jobForm.addEventListener('submit', handleJobApplicationSubmit);

        showTab('homepage');

    } catch (error) {
        console.error("Fatal Error:", error);
        const main = document.getElementById('main-content');
        if(main) main.innerHTML = `<p style="text-align: center; color: red; padding:20px;">Store is currently unavailable. Please try again later.</p>`;
    }
}

// [ 3.0 ] UI RENDERING
function renderStaticContent(content) {
    if (!content) return;
    document.getElementById('company-name-header').innerHTML = `${content.CompanyName || ''} <span class="by-line">${content.Owner} - ${content.Role}</span> <span class="slogan">${content.Slogan}</span>`;
    document.getElementById('footer-text').textContent = content.Footer || `© ${new Date().getFullYear()} ${content.CompanyName}`;
}

function renderMainContentShell() {
    const main = document.getElementById('main-content');
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
    if(why) why.innerHTML = `<h2>${about.WhyChooseUs_Title}</h2><div class="why-choose-us-grid"><div><i class="${about.Point1_Icon}"></i><p>${about.Point1_Text}</p></div><div><i class="${about.Point2_Icon}"></i><p>${about.Point2_Text}</p></div><div><i class="${about.Point3_Icon}"></i><p>${about.Point3_Text}</p></div></div>`;

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
    if (testimonies && testimonies.length > 0) {
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

function renderProducts(productsToRender, tagText) {
    const container = document.getElementById('product-list-container');
    if (!productsToRender || productsToRender.length === 0) { container.innerHTML = `<p>No products available.</p>`; return; }
    
    const tagHtml = tagText ? `<div class="product-tag">${tagText}</div>` : '';
    container.innerHTML = `<div class="product-list">${productsToRender.map(p => `
        <div class="product" style="position: relative;">
            ${tagHtml}
            <div class="product-image-container"><img src="${p.image}" alt="${p.name}" onerror="this.style.display='none'"></div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-section"><span class="new-price">RM ${p.price.toFixed(2)}</span></div>
                <div class="product-benefits"><strong>Benefits:</strong> ${p.benefits || ''}</div>
                <div class="product-consumption"><strong>Usage:</strong> ${p.consumption || ''}</div>
                <div class="product-actions"><button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button></div>
            </div>
        </div>`).join('')}</div>`;
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
    document.getElementById('enquiries-form-content').innerHTML = `<h2>Send Us An Enquiry</h2><form id="enquiry-form" class="enquiry-form"><input type="text" id="enquiry-name" placeholder="Your Full Name" required><input type="email" id="enquiry-email" placeholder="Your Email" required><input type="tel" id="enquiry-phone" placeholder="Your Phone" required><select id="enquiry-type" required><option value="" disabled selected>Type...</option><option value="General">General</option><option value="Product">Product</option></select><textarea id="enquiry-message" placeholder="Message" rows="6" required></textarea><button type="submit" class="btn btn-primary" style="width: 100%;">Submit</button><p id="enquiry-status"></p></form>`;
}

function buildCartModal() {
    document.getElementById('cart-modal').innerHTML = `
        <div class="modal-content">
            <div class="modal-header"><h2>Your Cart</h2><button class="close" onclick="toggleCart(true)">&times;</button></div>
            <div class="modal-body" id="cart-items"><p>Cart is empty.</p></div>
            <div id="cart-checkout-area">
                <div class="modal-footer">
                    <div class="summary-line"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
                    <div class="summary-line total"><span>Total</span><span id="cart-total">RM 0.00</span></div>
                </div>
                <div class="customer-info-form">
                    <h3>Customer Info</h3>
                    <input type="text" id="customer-name" placeholder="Full Name" required>
                    <input type="tel" id="customer-phone" placeholder="WhatsApp Number" required>
                    <input type="email" id="customer-email" placeholder="Email (Optional)">
                    <textarea id="customer-address" placeholder="Shipping Address" rows="3" required></textarea>
                </div>
                <div style="padding: 0 30px 20px;"><button class="btn btn-primary" style="width: 100%;" onclick="initiateCheckout()">Place Order</button></div>
            </div>
        </div>`;
}

function buildJobApplicationModal() {
    document.getElementById('job-application-modal').innerHTML = `<div class="modal-content"><span class="close" onclick="toggleJobModal(false)">&times;</span><h2>Apply for <span id="job-modal-title"></span></h2><form id="job-application-form" class="enquiry-form"><input type="hidden" id="job-id-input"><input type="hidden" id="job-position-input"><input type="text" id="applicant-name" placeholder="Full Name" required><input type="email" id="applicant-email" placeholder="Email" required><input type="tel" id="applicant-phone" placeholder="Phone" required><input type="text" id="applicant-citizenship" placeholder="Citizenship" required><textarea id="applicant-message" placeholder="About yourself" rows="4"></textarea><label>Resume (Required)</label><input type="file" id="applicant-resume" required><button type="submit" class="btn btn-primary">Submit</button><p id="job-application-status"></p></form></div>`;
}

function buildFabButtons() {
    document.getElementById('fab-container').innerHTML = `<div id="floating-cart" class="fab floating-cart-btn" onclick="toggleCart()"><i class="fa-solid fa-cart-shopping"></i><span id="cart-count">0</span></div><div class="fab chatbot-fab" onclick="toggleChatWidget(true)"><i class="fa-solid fa-robot"></i></div>`;
}

function buildChatbotWidget() {
    document.getElementById('eshop-chat-widget').innerHTML = `<div id="chat-header"><span>Assistant</span><button id="close-chat-btn" onclick="toggleChatWidget(false)">&times;</button></div><div id="chat-body"></div><div id="chat-input-container"><input type="text" id="chat-input" placeholder="Message..."><button id="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button></div>`;
}

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
    const container = document.getElementById('cart-items');
    const checkout = document.getElementById('cart-checkout-area');
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('cart-count').textContent = count;
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px 0;">Your cart is empty.</p>';
        checkout.style.display = 'none';
        return;
    }
    
    checkout.style.display = 'block';
    container.innerHTML = cart.map(i => `
        <div class="cart-item">
            <img src="${i.image}" class="cart-item-image">
            <div class="cart-item-details"><strong>${i.name}</strong><div class="quantity-controls"><button class="quantity-btn" onclick="decreaseQuantity(${i.id})">-</button><span>${i.quantity}</span><button class="quantity-btn" onclick="increaseQuantity(${i.id})">+</button></div></div>
            <strong>RM ${(i.price * i.quantity).toFixed(2)}</strong>
            <button class="remove-item-btn" onclick="removeItemFromCart(${i.id})"><i class="fa-solid fa-trash-can"></i></button>
        </div>`).join('');
        
    const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    document.getElementById('cart-subtotal').textContent = `RM ${sub.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `RM ${sub.toFixed(2)}`;
}

function toggleCart(hide) {
    document.getElementById('cart-modal').style.display = hide ? 'none' : 'flex';
    if(!hide) updateCartDisplay();
}

async function initiateCheckout() {
    const btn = document.querySelector('#cart-checkout-area button');
    btn.disabled = true; btn.textContent = 'Processing...';
    
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const email = document.getElementById('customer-email').value.trim();

    if(!name || !phone || !address) { alert('Name, Phone and Address required.'); btn.disabled=false; btn.textContent='Complete Order'; return; }

    const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    // Lead Capture Mode: Send Order with status "Open for Pickup"
    // Shipping Fee sent as 0 initially; will be handled by Agent.
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
        alert('Thank you for your order! Our sales consultant will be in touch shortly to confirm.');
        cart = []; toggleCart(true); updateCartDisplay();
    } catch(e) { alert('Error placing order.'); }
    finally { btn.disabled = false; btn.textContent = 'Place Order'; }
}

// [ 5.0 ] FORMS & MODAL LOGIC
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
            type: document.getElementById('enquiry-type').value, 
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

// [ 6.0 ] CHATBOT LOGIC
function toggleChatWidget(show) {
    const w = document.getElementById('eshop-chat-widget');
    const f = document.getElementById('fab-container');
    if(show) { w.classList.add('active'); f.style.right = '370px'; if(!document.getElementById('chat-body').innerHTML.trim()) displayMainMenu(); }
    else { w.classList.remove('active'); f.style.right = '20px'; }
}
function addChatMessage(who, text, html) {
    const b = document.getElementById('chat-body');
    const d = document.createElement('div');
    d.className = `chat-message ${who==='bot'?'bot-message':'user-message'}`;
    if(html) d.innerHTML=text; else d.textContent=text;
    b.appendChild(d); b.scrollTop=b.scrollHeight;
}
function displayMainMenu() { chatSession.state = 'menu'; addChatMessage('bot', '<b>Welcome!</b><br>1. Track Order<br>2. Contact Human', true); }
async function handleChatSubmit() {
    const i = document.getElementById('chat-input');
    const txt = i.value.trim();
    if(!txt) return;
    addChatMessage('user', txt); i.value='';
    
    if(chatSession.state === 'menu') {
        if(txt==='1') { chatSession.state = 'track'; addChatMessage('bot', 'Enter your Order ID to track status:'); }
        else if(txt==='2') addChatMessage('bot', '<a href="https://wa.me/601111033154">WhatsApp Us</a>', true);
        else {
             const res = await postToRender('getSmartAnswer', { question: txt });
             addChatMessage('bot', res.answer || "I don't know.");
        }
    } else if (chatSession.state === 'track') {
         // Basic tracking simulation - backend connection optional for V1
         addChatMessage('bot', 'Please contact our agent for real-time status.');
         chatSession.state = 'menu';
    }
}

// [ 7.0 ] UTILS
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
async function postDataToGScript(payload) {
    await fetch(googleScriptURL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
    return { status: 'success' };
}
async function postToRender(act, data) {
    const res = await fetch(botServerURL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action:act, apiKey, data}) });
    return await res.json();
}

// [ 8.0 ] THEME & MARKETING
function applyTheme(theme) {
    const root = document.documentElement;
    const themes = {
        'Christmas': {p:'#d90429', s:'#FFD700', a:'#004B23'},
        'HariRaya': {p:'#006400', s:'#f0e68c', a:'#27ae60'},
        'CNY': {p:'#E00000', s:'#FFD700', a:'#C04000'},
        'Thaipusam': {p:'#FF9933', s:'#4B0082', a:'#F0E68C'},
        'Deepavali': {p:'#FF8C00', s:'#FF00FF', a:'#FFD700'},
        'NationalDay': {p:'#000066', s:'#FFCC00', a:'#CC0000'},
        'MalaysiaDay': {p:'#000066', s:'#FFCC00', a:'#CC0000'},
        'MooncakeFestival': {p:'#1a237e', s:'#ffab00', a:'#ff6f00'},
        'Valentines': {p:'#e91e63', s:'#ffc1e3', a:'#c2185b'},
        'GrandOpening': {p:'#2c3e50', s:'#f39c12', a:'#27ae60'}
    };
    const c = themes[theme.ThemeName] || {p:'#1a5276', s:'#f39c12', a:'#27ae60'};
    root.style.setProperty('--primary-color', c.p);
    root.style.setProperty('--secondary-color', c.s);
    root.style.setProperty('--accent-color', c.a);
    document.body.classList.add(`theme-${theme.ThemeName}`); // For animations in index.html

    if(theme.ThemeName === 'Christmas' && typeof startSnowing === 'function') startSnowing();
}
function applyMarketing(m, t) {
    const b = document.getElementById('promo-running-banner');
    const txt = m.BannerText || (t ? t.WelcomeMessage : '');
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
