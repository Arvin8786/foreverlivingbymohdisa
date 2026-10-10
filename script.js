// =================================================================
// E-Shop Frontend Script - v28.1 (RESILIENT & DEFENSIVE)
// Features: Robust Price Parsing, Themes, Marketing, Cart, Chatbot
// =================================================================

// ===========================================================
// [ 1.0 ] GLOBAL CONFIGURATION & STATE
// ===========================================================
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwgbm0F9tCktQCeLJyrY1qZb3aU9NA8iP-T1FjCnRl2erH1y9Qo6tr4uKAPiFtyXSOU1w/exec';
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';
const apiKey = '9582967';

let products = [];
let allJobs = [];
let cart = [];
let chatSession = {};

// Helper: Safely parse price regardless of sheet casing or string format (e.g., "RM 95.00", "95", 95)
function parseSafePrice(item) {
    if (!item) return 0;
    const raw = item.price ?? item.Price ?? item.retailPrice ?? item.RetailPrice ?? 0;
    const cleaned = String(raw).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

// ===========================================================
// [ 2.0 ] MAIN CONTROLLER & INITIALIZATION
// ===========================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('nav-login-btn');
    if(loginBtn) loginBtn.addEventListener('click', () => toggleLoginModal(true));
    
    const closeLoginBtn = document.getElementById('close-login-modal-btn');
    if(closeLoginBtn) closeLoginBtn.addEventListener('click', () => toggleLoginModal(false));

    const chatSend = document.getElementById('chat-send-btn');
    if(chatSend) chatSend.addEventListener('click', handleChatSubmit);
    
    const chatInput = document.getElementById('chat-input');
    if(chatInput) chatInput.addEventListener('keyup', (e) => { if (e.key === "Enter") handleChatSubmit(); });

    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();
        
        if (data.status !== 'success') throw new Error(data.message || 'Unknown backend error');

        const marketingData = data.marketingData || {};
        const activeTheme = data.activeTheme || null;

        // 1. Maintenance Mode Check
        if (String(marketingData.MaintenanceMode).trim().toUpperCase() === 'TRUE') {
            const storeWrapper = document.getElementById('store-wrapper');
            if (storeWrapper) storeWrapper.style.display = 'none';
            const overlay = document.getElementById('maintenance-overlay');
            if(overlay) {
                overlay.style.display = 'flex';
                const msg = document.getElementById('maintenance-message');
                if(msg) msg.textContent = marketingData.MaintenanceMessage || 'Site is down for maintenance.';
            }
            return;
        }

        // 2. Apply Theme & Marketing Banners
        if (activeTheme) {
            applyTheme(activeTheme);
        }
        if (marketingData) {
            applyMarketing(marketingData, activeTheme);
        }

        // 3. Normalize products safely (handles case mismatches and missing fields)
        const rawProducts = data.products || [];
        products = rawProducts.map((p, idx) => ({
            id: p.id ?? p.ID ?? p.productId ?? idx + 1,
            name: p.name ?? p.Name ?? p.ProductName ?? 'Product Item',
            price: parseSafePrice(p),
            image: p.image ?? p.Image ?? p.imageURL ?? p.ImageURL ?? '',
            benefits: p.benefits ?? p.Benefits ?? '',
            consumption: p.consumption ?? p.Consumption ?? p.Usage ?? ''
        }));

        allJobs = data.jobsListings || [];
        
        renderMainContentShell();
        renderStaticContent(data.aboutUsContent);
        renderHomepageContent(data.aboutUsContent, allJobs, data.testimonies);
        renderProducts(products, marketingData.ProductTagText); 
        renderAboutUs(data.aboutUsContent);
        renderJobs(allJobs);
        
        buildEnquiryForm();
        buildCartModal();
        buildJobApplicationModal();
        buildFabButtons();
        buildChatbotWidget();
        
        if (marketingData.PopupMessageText || marketingData.PopupImageURL) {
            buildPopupModal(marketingData.PopupMessageText, marketingData.PopupImageURL);
        }

        const updateElem = document.getElementById('update-timestamp');
        if (updateElem) updateElem.textContent = `${new Date().toLocaleDateString('en-GB')} (v28.1)`;
        
        const enqForm = document.getElementById('enquiry-form');
        if(enqForm) enqForm.addEventListener('submit', handleEnquirySubmit);
        
        const jobForm = document.getElementById('job-application-form');
        if(jobForm) jobForm.addEventListener('submit', handleJobApplicationSubmit);

        showTab('homepage');

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        const main = document.getElementById('main-content');
        if(main) main.innerHTML = `<p style="text-align: center; color: red;">Error loading store. Please try again later.</p>`;
    }
}

// ===========================================================
// [ 3.0 ] UI & DYNAMIC CONTENT RENDERING
// ===========================================================
function renderStaticContent(content) {
    if (!content) return;
    const headerElem = document.getElementById('company-name-header');
    if (headerElem) {
        headerElem.innerHTML = `${content.CompanyName || ''} <span class="by-line">${content.Owner || ''} - ${content.Role || ''}</span> <span class="slogan">${content.Slogan || ''}</span>`;
    }
    const footerElem = document.getElementById('footer-text');
    if (footerElem) {
        footerElem.textContent = content.Footer || `© ${new Date().getFullYear()} ${content.CompanyName || 'Forever Living'}`;
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
        <div id="products" class="tab-content"><div id="product-list-container"></div></div>
        <div id="about" class="tab-content"><section id="about-us-content" class="dynamic-content-wrapper"></section></div>
        <div id="jobs" class="tab-content"><section id="jobs-content" class="dynamic-content-wrapper"><h2>All Career Opportunities</h2><div id="job-listings-container"></div></section></div>
        <div id="enquiries" class="tab-content"><section id="enquiries-form-content" class="dynamic-content-wrapper"></section></div>
        <div id="rewards" class="tab-content"><section class="dynamic-content-wrapper"><h2>Rewards</h2><p>This feature is coming soon!</p></section></div>
    `;
}

function renderHomepageContent(about, jobs, testimonies) {
    about = about || { CompanyName: "Forever Living", Slogan: "Premium Wellness & Beauty" };
    const heroContainer = document.getElementById('homepage-hero');
    if (heroContainer) heroContainer.innerHTML = `<h2>${about.CompanyName || 'Welcome'}</h2><p>${about.Slogan || 'High-quality wellness products'}</p>`;
    
    const whyChooseUsContainer = document.getElementById('why-choose-us');
    if (whyChooseUsContainer) {
        whyChooseUsContainer.innerHTML = `<h2>${about.WhyChooseUs_Title || 'Why Choose Us'}</h2><div class="why-choose-us-grid"><div><i class="${about.Point1_Icon || 'fa-solid fa-check'}"></i><p>${about.Point1_Text || ''}</p></div><div><i class="${about.Point2_Icon || 'fa-solid fa-check'}"></i><p>${about.Point2_Text || ''}</p></div><div><i class="${about.Point3_Icon || 'fa-solid fa-check'}"></i><p>${about.Point3_Text || ''}</p></div></div>`;
    }
        
    const youtubeSection = document.getElementById('youtube-videos');
    const videoUrls = about.YoutubeURL ? String(about.YoutubeURL).split(',').map(url => url.trim()) : [];
    if (youtubeSection && videoUrls.length > 0 && videoUrls[0]) {
        const videosHtml = videoUrls.map(url => {
            try {
                const videoId = new URL(url).searchParams.get('v');
                if (videoId) return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
            } catch(e) { console.error("Invalid YouTube URL:", url); }
            return '';
        }).join('');
        const youtubeTitle = about.YoutubeSection_Title || 'Learn More';
        youtubeSection.innerHTML = `<h2>${youtubeTitle}</h2><div id="youtube-videos-container">${videosHtml}</div>`;
    } else if(youtubeSection) {
        youtubeSection.style.display = 'none';
    }

    const testimoniesContainer = document.getElementById('testimonies-container');
    if (testimonies && testimonies.length > 0) {
        testimoniesContainer.innerHTML = testimonies.map(t => {
            let stars = '';
            const rating = Number(t.Rating) || 5;
            for (let i = 0; i < 5; i++) { stars += `<i class="fa-solid fa-star" style="color: ${i < rating ? 'var(--secondary-color)' : '#ccc'}"></i>`; }
            return `<div class="testimony-card"><div class="testimony-header"><h4>${t.ClientName || 'Valued Customer'}</h4><div class="testimony-rating">${stars}</div></div><p>"${t.Quote || ''}"</p></div>`;
        }).join('');
    } else if (testimoniesContainer) {
        const homeTestimonies = document.getElementById('homepage-testimonies');
        if (homeTestimonies) homeTestimonies.style.display = 'none';
    }

    const featuredJobsContainer = document.getElementById('featured-jobs-container');
    const featuredJobs = jobs ? jobs.filter(j => j.isFeatured) : [];
    if (featuredJobsContainer && featuredJobs.length > 0) {
        featuredJobsContainer.innerHTML = featuredJobs.map(job => `<div class="job-listing-summary"><h4>${job.position}</h4><p>${job.location} | ${job.type}</p></div>`).join('');
    } else if (featuredJobsContainer) {
        const homeJobs = document.getElementById('homepage-featured-jobs');
        if (homeJobs) homeJobs.style.display = 'none';
    }
}

function renderProducts(productsToRender, tagText) {
    const container = document.getElementById('product-list-container');
    if (!container) return;
    if (!productsToRender || productsToRender.length === 0) { container.innerHTML = `<p>No products available.</p>`; return; }
    
    const tagHtml = tagText ? `<div class="product-tag">${tagText}</div>` : '';

    container.innerHTML = `<div class="product-list">${productsToRender.map(p => {
        const displayPrice = Number(p.price || 0).toFixed(2);
        return `
        <div class="product" style="position: relative;">
            ${tagHtml}
            <div class="product-image-container"><img src="${p.image || ''}" alt="${p.name || ''}" onerror="this.src='https://via.placeholder.com/250?text=Forever+Living'"></div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-section"><span class="new-price">RM ${displayPrice}</span></div>
                <div class="product-benefits"><strong>Benefits:</strong> ${p.benefits || ''}</div>
                <div class="product-consumption"><strong>Usage:</strong> ${p.consumption || ''}</div>
                <div class="product-actions"><button class="btn btn-primary" onclick="addToCart('${p.id}')">Add to Cart</button></div>
            </div>
        </div>`;
    }).join('')}</div>`;
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!container) return;
    if (!content) { container.innerHTML = '<p>About information is unavailable.</p>'; return; }
    const historySection = content.History ? `<div class="about-section"><h4>Our History</h4><p>${content.History}</p></div>` : '';
    container.innerHTML = `
        <h2>About ${content.CompanyName || 'Us'}</h2>
        <div class="owner-profile">
            <img src="arvind.jpg" alt="${content.Owner || 'Owner'}" class="owner-image" onerror="this.style.display='none'">
            <div class="owner-details">
                <h3>${content.Owner || ''} - ${content.Role || ''}</h3>
                <div>${content.MoreDetails || ''}</div>
            </div>
        </div>
        <div class="about-section">
            <h4>Our Mission</h4>
            <p>${content.OurMission || ''}</p>
        </div>
        <div class="about-section">
            <h4>Our Vision</h4>
            <p>${content.OurVision || ''}</p>
        </div>
        ${historySection}`;
}

function renderJobs(jobs) {
    const container = document.getElementById('job-listings-container');
    if (!container) return;
    if (!jobs || jobs.length === 0) { container.innerHTML = '<p>There are currently no open positions.</p>'; return; }
    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-header"><h3>${job.position || ''}</h3></div>
            <div class="job-body">
                <div class="job-details">
                    <div class="job-detail-item"><i class="fa-solid fa-location-dot"></i> <span>${job.location || ''} | ${job.type || ''}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-money-bill-wave"></i> <span>${job.salary || '0'} RM</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-house-user"></i> <span>${job.accommodation || ''}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-calendar-days"></i> <span>${job.workDayPattern || ''}</span></div>
                </div>
                <div class="job-description">${job.description || ''}</div>
                <button class="btn btn-primary" onclick="toggleJobModal(true, '${job.jobId || ''}', '${job.position || ''}')">Apply Now</button>
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
    container.innerHTML = `
        <div class="modal-content" style="background:#fff !important; width:100% !important; max-width:460px !important; max-height:86vh !important; display:flex !important; flex-direction:column !important; border-radius:12px !important; overflow:hidden !important; box-shadow:0 15px 35px rgba(0,0,0,0.3) !important;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
                <h2 style="margin:0; font-size:1.15rem; color:#113626; font-weight:700;">Your Cart</h2>
                <button type="button" onclick="toggleCart(true)" style="background:none; border:none; font-size:1.6rem; line-height:1; color:#64748b; cursor:pointer;">&times;</button>
            </div>
            
            <div style="overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; padding:14px 18px; flex:1 1 auto;">
                <div id="cart-items" style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;"><p style="text-align:center; padding:15px 0;">Your cart is empty.</p></div>
                <div id="cart-checkout-area">
                    <div style="border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; padding:10px 0; margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#475569; margin-bottom:3px;"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
                        <div style="display:flex; justify-content:space-between; font-size:1.05rem; font-weight:bold; color:#113626;"><span>Total</span><span id="cart-total">RM 0.00</span></div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:10px;">
                        <h3 style="font-size:0.82rem; margin:0 0 8px 0; color:#113626; text-transform:uppercase; letter-spacing:0.5px;">Customer Info</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                            <input type="text" id="customer-name" placeholder="Full Name" required style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
                            <input type="tel" id="customer-phone" placeholder="WhatsApp No." required style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <input type="email" id="customer-email" placeholder="Email (Optional)" style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:6px; box-sizing:border-box;">
                        <textarea id="customer-address" placeholder="Delivery Address" required style="width:100%; height:44px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; resize:none; box-sizing:border-box;"></textarea>
                    </div>
                </div>
            </div>
            
            <div style="padding:12px 18px 14px; background:#f8fafc; border-top:1px solid #e2e8f0; flex-shrink:0;">
                <button type="button" onclick="initiateCheckout()" style="width:100%; padding:10px; font-size:0.95rem; font-weight:700; background:#113626; color:#ffffff; border:none; border-radius:6px; cursor:pointer;">Complete Order</button>
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
    container.innerHTML = `<div id="floating-cart" class="fab floating-cart-btn" onclick="toggleCart()"><i class="fa-solid fa-cart-shopping"></i><span id="cart-count">0</span></div><div class="fab chatbot-fab" onclick="toggleChatWidget(true)"><i class="fa-solid fa-robot"></i></div>`;
}

function buildChatbotWidget() {
    const container = document.getElementById('eshop-chat-widget');
    if (!container) return;
    container.innerHTML = `<div id="chat-header"><span>FL e-Shop Assistant</span><button id="close-chat-btn" onclick="toggleChatWidget(false)">&times;</button></div><div id="chat-body"></div><div id="chat-input-container"><input type="text" id="chat-input" placeholder="Type your message..."><button id="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button></div>`;
}

// ===========================================================
// [ 4.0 ] CART LOGIC
// ===========================================================
function addToCart(productId) {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;
    const existingItem = cart.find(item => String(item.id) === String(productId));
    if (existingItem) { 
        existingItem.quantity++; 
    } else { 
        cart.push({ ...product, quantity: 1 }); 
    }
    updateCartDisplay();
}

function increaseQuantity(productId) { 
    const item = cart.find(i => String(i.id) === String(productId)); 
    if (item) { item.quantity++; } 
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

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const checkoutArea = document.getElementById('cart-checkout-area');
    const cartCountElem = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    
    if (cartCountElem) cartCountElem.textContent = totalItems;
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; padding: 20px 0;">Your cart is empty.</p>';
        if (checkoutArea) checkoutArea.style.display = 'none';
        return;
    }
    
    if (checkoutArea) checkoutArea.style.display = 'block';
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image || ''}" alt="${item.name || ''}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80?text=FL'"/>
            <div class="cart-item-details">
                <strong>${item.name}</strong>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity('${item.id}')">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity('${item.id}')">+</button>
                </div>
            </div>
            <strong>RM ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</strong>
            <button class="remove-item-btn" onclick="removeItemFromCart('${item.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>`).join('');
        
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const subtotalElem = document.getElementById('cart-subtotal');
    const totalElem = document.getElementById('cart-total');
    if (subtotalElem) subtotalElem.textContent = `RM ${subtotal.toFixed(2)}`;
    if (totalElem) totalElem.textContent = `RM ${subtotal.toFixed(2)}`;
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    modal.style.display = hide ? 'none' : 'flex';
    if (!hide) updateCartDisplay();
}

async function initiateCheckout() {
    const checkoutBtn = document.querySelector('#cart-checkout-area button');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing...';
    }

    const name = document.getElementById('customer-name')?.value.trim();
    const phone = document.getElementById('customer-phone')?.value.trim();
    const address = document.getElementById('customer-address')?.value.trim();
    const email = document.getElementById('customer-email')?.value.trim();

    if (!name || !phone || !address) {
        alert('Please fill in all required customer details: Name, Phone, and Address.');
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Complete Order';
        }
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const shippingFee = 0.0; 
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

    try {
        await postDataToGScript(payload);
        alert('Your order has been placed successfully! We will contact you via WhatsApp shortly to confirm payment and shipping.');
        
        cart = []; 
        toggleCart(true); 
        updateCartDisplay(); 

    } catch (error) {
        console.error('Checkout failed:', error);
        alert('There was an error placing your order. Please try again or contact us directly.');
    } finally {
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Complete Order';
        }
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
        if (statusEl) statusEl.textContent = 'An error occurred.';
    }
}

async function handleJobApplicationSubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('job-application-status');
    const fileInput = document.getElementById('applicant-resume');
    if (fileInput && fileInput.files.length === 0) {
        if (statusEl) statusEl.textContent = 'Resume upload is mandatory.';
        return;
    }
    if (statusEl) statusEl.textContent = 'Submitting...';
    try {
        const file = fileInput.files[0];
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
        if (statusEl) statusEl.textContent = 'An error occurred.';
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
function toggleChatWidget(show) {
    const chatWidget = document.getElementById('eshop-chat-widget');
    const fabContainer = document.getElementById('fab-container');
    if (!chatWidget) return;
    if (show) {
        chatWidget.classList.add('active');
        if (fabContainer) fabContainer.style.right = '370px';
        const body = document.getElementById('chat-body');
        if (body && body.innerHTML.trim() === '') {
            displayMainMenu();
        }
    } else {
        chatWidget.classList.remove('active');
        if (fabContainer) fabContainer.style.right = '20px';
    }
}

function addChatMessage(sender, text, type = 'text') {
    const chatBody = document.getElementById('chat-body');
    if (!chatBody) return null;
    const msg = document.createElement('div');
    msg.classList.add('chat-message', sender === 'bot' ? 'bot-message' : 'user-message');
    if (type === 'html') { msg.innerHTML = text; } else { msg.textContent = text; }
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
}

function displayMainMenu() {
    chatSession.state = 'main_menu';
    const menu = `<strong>Welcome!</strong><br>1. My Account<br>2. Talk to a Human<br>Or ask a question.`;
    addChatMessage('bot', menu, 'html');
}

async function handleChatSubmit() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    addChatMessage('user', text);
    input.value = '';
    const thinkingMsg = addChatMessage('bot', '<i>Thinking...</i>', 'html');

    if (chatSession.state === 'awaiting_identifier') { await startVerification(text); }
    else if (chatSession.state === 'awaiting_code') { await submitVerificationCode(text); }
    else if (chatSession.state === 'my_account_menu') { await handleMyAccountMenu(text); }
    else { await handleMainMenu(text); }

    if (thinkingMsg) thinkingMsg.remove();
}

async function handleMainMenu(text) {
    if (text === '1') {
        if (sessionStorage.getItem('eshop_session_token')) {
            displayMyAccountMenu();
        } else {
            chatSession.state = 'awaiting_identifier';
            addChatMessage('bot', 'Enter your PAC or Email to verify.');
        }
    } else if (text === '2') {
        addChatMessage('bot', '<a href="https://wa.me/601111033154" target="_blank">Contact Admin</a>', 'html');
    } else {
        const response = await postToRender('getSmartAnswer', { question: text });
        addChatMessage('bot', response.answer || 'Sorry, I had trouble finding an answer.');
    }
}

async function startVerification(identifier) {
    const result = await postToRender('issueChatVerificationCode', { identifier: identifier });
    if (result.success) {
        chatSession.state = 'awaiting_code';
        chatSession.pac = result.pac;
        addChatMessage('bot', 'A code has been sent to your WhatsApp. Please enter it here.');
    } else {
        addChatMessage('bot', `Verification failed: ${result.message}`);
        chatSession.state = 'main_menu';
    }
}

async function submitVerificationCode(code) {
    const result = await postToRender('verifyChatCode', { pac: chatSession.pac, code: code });
    if (result.success) {
        sessionStorage.setItem('eshop_session_token', result.token);
        addChatMessage('bot', 'Verified!');
        displayMyAccountMenu();
    } else {
        addChatMessage('bot', `Verification failed: ${result.message}`);
        chatSession.state = 'main_menu';
    }
}

function displayMyAccountMenu() {
    chatSession.state = 'my_account_menu';
    addChatMessage('bot', '<strong>My Account</strong><br>1. View My Last 5 Orders<br>2. Check My Total Points<br>3. Back to Main Menu', 'html');
}

async function handleMyAccountMenu(text) {
    let action = '';
    if (text === '1') action = 'getPurchaseHistory';
    else if (text === '2') action = 'getPointsHistory';
    else if (text === '3') { displayMainMenu(); return; }
    else { addChatMessage('bot', 'Invalid option.'); return; }

    const token = sessionStorage.getItem('eshop_session_token');
    const result = await postToRender(action, { token: token });
    if(result.success) {
        if(action === 'getPurchaseHistory') {
            let historyText = "<strong>Your Last 5 Orders:</strong><br>";
            if (!result.history || result.history.length === 0) { historyText = 'You have no purchase history.'; }
            else { result.history.forEach(order => { historyText += `<br><strong>ID:</strong> ${order.invoiceId}<br><strong>Date:</strong> ${order.date}<br><strong>Total:</strong> RM ${order.totalAmount}<br><strong>Status:</strong> ${order.status}`; }); }
            addChatMessage('bot', historyText, 'html');
        } else {
            addChatMessage('bot', `Your total points: <strong>${result.currentBalance}</strong>`, 'html');
        }
    } else {
        addChatMessage('bot', `Error: ${result.message}`);
    }
}

// ===========================================================
// [ 7.0 ] GLOBAL UTILITIES & API HELPERS
// ===========================================================
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
}

async function postDataToGScript(payload) {
    try {
        await fetch(googleScriptURL, { method: 'POST', mode: 'no-cors', cache: 'no-cache', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'follow' });
        return { status: 'success' };
    } catch (error) {
        console.error('Error posting to Google Script:', error);
        throw error;
    }
}

async function postToRender(action, data) {
    try {
        const response = await fetch(botServerURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, apiKey, data })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Server error');
        }
        return await response.json();
    } catch (error) {
        console.error('Error posting to Render:', error);
        throw error;
    }
}

// ===========================================================
// [ 8.0 ] THEME, MARKETING & LOGIN MODAL LOGIC
// ===========================================================
function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;

    const themes = {
        'Christmas': { primary: '#d90429', secondary: '#FFD700', accent: '#004B23' },
        'HariRaya': { primary: '#006400', secondary: '#f0e68c', accent: '#27ae60' },
        'CNY': { primary: '#E00000', secondary: '#FFD700', accent: '#C04000' },
        'Thaipusam': { primary: '#FF9933', secondary: '#4B0082', accent: '#F0E68C' },
        'NationalDay': { primary: '#000066', secondary: '#FFCC00', accent: '#CC0000' },
        'MalaysiaDay': { primary: '#000066', secondary: '#FFCC00', accent: '#CC0000' },
        'MooncakeFestival': { primary: '#C04000', secondary: '#FFD700', accent: '#E00000' },
        'Deepavali': { primary: '#FF8C00', secondary: '#FF00FF', accent: '#FFD700' },
        'NewYear': { primary: '#111111', secondary: '#FFD700', accent: '#C0C0C0' },
        'Valentines': { primary: '#D70040', secondary: '#FFC0CB', accent: '#C71585' },
        'GrandOpening': { primary: '#1a5276', secondary: '#f39c12', accent: '#27ae60' }
    };

    const colors = themes[theme.ThemeName];
    if (colors) {
        root.style.setProperty('--primary-color', colors.primary);
        root.style.setProperty('--secondary-color', colors.secondary);
        root.style.setProperty('--accent-color', colors.accent);
    }
    
    if (theme.ThemeName === 'Christmas' && typeof startSnowing === 'function') {
        startSnowing();
    }
}

function applyMarketing(marketing, theme) {
    const banner = document.getElementById('promo-running-banner');
    if (!banner) return;
    let bannerText = marketing.BannerText || (theme ? theme.WelcomeMessage : null);
    
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
             <button class="close" style="position: absolute; top: 10px; right: 20px; font-size: 30px; background: white; border-radius: 50%; width: 40px; height: 40px; opacity: 0.8;" onclick="togglePopup(true)">&times;</button>
             <img src="${imageUrl}" style="width: 100%; border-radius: var(--border-radius);" onerror="this.parentElement.style.display='none'">
        </div>`;
    } else {
        modalHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Welcome!</h2>
                <button class="close" onclick="togglePopup(true)">&times;</button>
            </div>
            <div class="modal-body" style="padding: 30px; font-size: 1.1rem; text-align: center;">
                ${message}
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

function toggleLoginModal(show) {
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = show ? 'flex' : 'none';
}

function calculateMonthlySales() {
    const orders = JSON.parse(localStorage.getItem('orders_DATA')) || [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalSales = 0;
    let count = 0;

    orders.forEach(order => {
        const orderDate = new Date(order.timestamp || order.date);
        if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
            let orderAmount = parseFloat(order.total);
            if (!isNaN(orderAmount)) {
                totalSales += orderAmount;
                count++;
            }
        }
    });

    const salesDisplay = document.getElementById('monthly-sales');
    const countDisplay = document.getElementById('monthly-orders-count');
    
    if (salesDisplay) salesDisplay.innerText = 'RM ' + totalSales.toFixed(2);
    if (countDisplay) countDisplay.innerText = count;
    
    return totalSales;
}
