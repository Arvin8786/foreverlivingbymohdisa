// =================================================================
// E-Shop Frontend Script - v21.0 (Final Verified Complete)
// =================================================================

// ===========================================================
// [ 1.0 ] GLOBAL CONFIGURATION & STATE
// ===========================================================
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbxipPCaKAmspCLBuN7GeXmUdWBMuQoAcVCQa9RqmiSZjjV4gmEBfTnFlbAzH_qrmXgkbg/exec';
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';
const apiKey = '9582967';

let products = [];
let allJobs = [];
let cart = [];
let chatSession = {};
let shippingRules = [];
let discountInfo = null;

// ===========================================================
// [ 2.0 ] MAIN CONTROLLER & INITIALIZATION
// ===========================================================
document.addEventListener('DOMContentLoaded', fetchData);

async function fetchData() {
    try {
        // Display a loading message to the user while data is being fetched
        document.getElementById('main-content').innerHTML = `<p style="text-align: center; font-size: 1.2rem; padding: 2rem;">Loading store, please wait...</p>`;

        const response = await fetch(googleScriptURL);
        if (!response.ok) {
            throw new Error('Network response failed. Please check the backend URL and deployment.');
        }

        const data = await response.json();
        if (data.status !== 'success') {
            throw new Error(data.message || 'The backend returned an error.');
        }

        // --- CRITICAL DATA ASSIGNMENT ---
        // These lines take the data from your Google Sheet and store it in the global variables.
        // This is where the shipping rules are loaded into the application.
        products = data.products || [];
        allJobs = data.jobsListings || [];
        shippingRules = data.shippingRules || []; // <-- THIS LINE IS ESSENTIAL FOR SHIPPING LOGIC

        // --- RENDER THE ENTIRE PAGE ---
        // Now that all the data has been loaded, call all the functions to build the HTML.
        renderMainContentShell();
        renderStaticContent(data.aboutUsContent);
        renderHomepageContent(data.aboutUsContent, allJobs, data.testimonies);
        renderProducts(products);
        renderAboutUs(data.aboutUsContent);
        renderJobs(allJobs);
        buildEnquiryForm();
        
        buildCartModal(data.aboutUsContent);
        buildJobApplicationModal();
        buildFabButtons();
        buildChatbotWidget();
        
        // Update the timestamp in the footer
        document.getElementById('update-timestamp').textContent = `${new Date().toLocaleDateString('en-GB')} (v21.0)`;
        
        // --- ADD EVENT LISTENERS ---
        // Make the forms and buttons interactive.
        document.getElementById('enquiry-form').addEventListener('submit', handleEnquirySubmit);
        document.getElementById('job-application-form').addEventListener('submit', handleJobApplicationSubmit);
        document.getElementById('chat-send-btn').addEventListener('click', handleChatSubmit);
        document.getElementById('chat-input').addEventListener('keyup', (event) => { 
            if (event.key === "Enter") handleChatSubmit(); 
        });

        // Finally, show the homepage tab
        showTab('homepage');

    } catch (error) {
        // If anything fails, log the error and show a user-friendly message.
        console.error("Fatal Error fetching store data:", error);
        document.getElementById('main-content').innerHTML = `<p style="text-align: center; color: red;">Error loading store. Please try again later.</p>`;
    }
}

// ===========================================================
// [ 3.0 ] UI & DYNAMIC CONTENT RENDERING
// ===========================================================
function renderStaticContent(content) {
    if (!content) return;
    document.getElementById('company-name-header').innerHTML = `${content.CompanyName || ''} <span class="by-line">${content.Owner} - ${content.Role}</span> <span class="slogan">${content.Slogan}</span>`;
    document.getElementById('footer-text').textContent = content.Footer || `© ${new Date().getFullYear()} ${content.CompanyName}`;
}

function renderMainContentShell() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div id="homepage" class="tab-content">
            <!-- Homepage content will be rendered here -->
        </div>
        <div id="products" class="tab-content">
            <div class="search-container">
                <input type="text" id="product-search" onkeyup="filterProducts()" placeholder="Search for products by name...">
                <i class="fa-solid fa-search search-icon"></i>
            </div>
            <div id="product-list-container"></div>
        </div>
        <div id="about" class="tab-content"><section id="about-us-content" class="dynamic-content-wrapper"></section></div>
        <div id="jobs" class="tab-content"><section id="jobs-content" class="dynamic-content-wrapper"><h2>All Career Opportunities</h2><div id="job-listings-container"></div></section></div>
        <div id="enquiries" class="tab-content"><section id="enquiries-form-content" class="dynamic-content-wrapper"></section></div>
        <div id="rewards" class="tab-content"><section class="dynamic-content-wrapper"><h2>Rewards</h2><p>This feature is coming soon!</p></section></div>
    `;
}

function renderHomepageContent(about, jobs, testimonies) {
    const container = document.getElementById('homepage');
    if (!about) {
        container.innerHTML = '<p>Welcome</p>';
        return;
    }

    const heroHtml = `<section id="homepage-hero" class="hero-section"><h2>${about.CompanyName || 'Welcome'}</h2><p>${about.Slogan || 'High-quality wellness products'}</p></section>`;

    const aiSuggesterHtml = `
        <section class="ai-suggestion-box">
            <h3><i class="fa-solid fa-robot"></i> AI Product Suggester</h3>
            <p>Describe your health concern (e.g., "dry skin", "low energy") and our AI will suggest a product for you.</p>
            <input type="text" id="symptom-input" placeholder="Enter your symptom or concern...">
            <button id="suggest-btn" class="btn" onclick="suggestProduct()">Get Suggestion</button>
            <div id="suggestion-result"></div>
        </section>`;

    const whyChooseUsHtml = `<section id="why-choose-us" class="dynamic-content-wrapper"><h2>${about.WhyChooseUs_Title || 'Why Choose Us?'}</h2><div class="why-choose-us-grid"><div><i class="${about.Point1_Icon}"></i><p>${about.Point1_Text}</p></div><div><i class="${about.Point2_Icon}"></i><p>${about.Point2_Text}</p></div><div><i class="${about.Point3_Icon}"></i><p>${about.Point3_Text}</p></div></div></section>`;

    let youtubeHtml = '';
    const videoUrls = about.YoutubeURL ? String(about.YoutubeURL).split(',').map(url => url.trim()) : [];
    if (videoUrls.length > 0 && videoUrls[0]) {
        const youtubeTitle = about.YoutubeSection_Title || 'Learn More';
        const videosHtml = videoUrls.map(url => {
            try {
                const videoId = new URL(url).searchParams.get('v');
                if (videoId) return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
            } catch (e) {}
            return '';
        }).join('');
        youtubeHtml = `<section id="youtube-videos" class="dynamic-content-wrapper"><h2>${youtubeTitle}</h2><div id="youtube-videos-container">${videosHtml}</div></section>`;
    }

    let testimoniesHtml = '';
    if (testimonies && testimonies.length > 0) {
        const testimoniesContent = testimonies.map(t => {
            let stars = '';
            for (let i = 0; i < 5; i++) {
                stars += `<i class="fa-solid fa-star" style="color: ${i < t.Rating ? 'var(--secondary-color)' : '#ccc'}"></i>`;
            }
            return `<div class="testimony-card"><div class="testimony-header"><h4>${t.ClientName}</h4><div class="testimony-rating">${stars}</div></div><p>"${t.Quote}"</p></div>`;
        }).join('');
        testimoniesHtml = `<section id="homepage-testimonies" class="dynamic-content-wrapper"><h2>What Our Customers Say</h2><div id="testimonies-container">${testimoniesContent}</div></section>`;
    }

    let featuredJobsHtml = '';
    const featuredJobs = jobs ? jobs.filter(j => j.isFeatured) : [];
    if (featuredJobs.length > 0) {
        const jobsContent = featuredJobs.map(job => `<div class="job-listing-summary"><h4>${job.position}</h4><p>${job.location} | ${job.type}</p></div>`).join('');
        featuredJobsHtml = `<section id="homepage-featured-jobs" class="dynamic-content-wrapper"><h2>Join Our Team</h2><div id="featured-jobs-container">${jobsContent}</div><a onclick="showTab('jobs')" class="btn btn-secondary" style="display: table; margin: 20px auto 0; max-width: 300px;">View All Career Opportunities</a></section>`;
    }

    container.innerHTML = heroHtml + aiSuggesterHtml + whyChooseUsHtml + youtubeHtml + testimoniesHtml + featuredJobsHtml;
}


function renderProducts(productsToRender) {
    const container = document.getElementById('product-list-container');
    if (!productsToRender || productsToRender.length === 0) {
        container.innerHTML = `<p>No products available.</p>`;
        return;
    }
    container.innerHTML = `<div class="product-list">${productsToRender.map(p => `
        <div class="product">
            <div class="product-image-container"><img src="${p.image}" alt="${p.name}"></div>
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
    if (!content) {
        container.innerHTML = '<p>About information is unavailable.</p>';
        return;
    }
    const historySection = content.History ? `<div class="about-section"><h4>Our History</h4><p>${content.History}</p></div>` : '';
    const emailLink = content.EmailAddress ? `<a href="mailto:${content.EmailAddress}"><i class="fa-solid fa-envelope"></i> ${content.EmailAddress}</a>` : '';
    const whatsappLink = content.Whatsapp ? `<a href="https://wa.me/${String(content.Whatsapp).replace(/\D/g,'')}" target="_blank"><i class="fa-brands fa-whatsapp"></i> ${content.Whatsapp}</a>` : '';
    const addressLink = content.Address ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.Address)}" target="_blank"><i class="fa-solid fa-location-dot"></i> ${content.Address}</a>` : '';
    const contactLinksHtml = (emailLink || whatsappLink || addressLink) ? `<div class="contact-links">${emailLink}${whatsappLink}${addressLink}</div>` : '';

    container.innerHTML = `
        <h2>About ${content.CompanyName}</h2>
        <div class="owner-profile">
            <img src="arvind.jpg" alt="${content.Owner}" class="owner-image" onerror="this.style.display='none'">
            <div class="owner-details">
                <h3>${content.Owner} - ${content.Role}</h3>
                ${contactLinksHtml}
                <div>${content.MoreDetails}</div>
            </div>
        </div>
        <div class="about-section">
            <h4>Our Mission</h4>
            <p>${content.OurMission}</p>
        </div>
        <div class="about-section">
            <h4>Our Vision</h4>
            <p>${content.OurVision}</p>
        </div>
        ${historySection}`;
}

function renderJobs(jobs) {
    const container = document.getElementById('job-listings-container');
    if (!jobs || jobs.length === 0) {
        container.innerHTML = '<p>There are currently no open positions.</p>';
        return;
    }
    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-header"><h3>${job.position}</h3></div>
            <div class="job-body">
                <div class="job-details">
                    <div class="job-detail-item"><i class="fa-solid fa-location-dot"></i> <span>${job.location} | ${job.type}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-money-bill-wave"></i> <span>${job.salary} RM</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-house-user"></i> <span>${job.accommodation}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-calendar-days"></i> <span>${job.workDayPattern}</span></div>
                </div>
                <div class="job-description">${job.description}</div>
                <button class="btn btn-primary" onclick="toggleJobModal(true, '${job.jobId}', '${job.position}')" style="width: auto;">Apply Now</button>
            </div>
        </div>`).join('');
}

function buildEnquiryForm() {
    const container = document.getElementById('enquiries-form-content');
    container.innerHTML = `<h2>Send Us An Enquiry</h2><form id="enquiry-form" class="enquiry-form"><input type="text" id="enquiry-name" placeholder="Your Full Name" required><input type="email" id="enquiry-email" placeholder="Your Email Address" required><input type="tel" id="enquiry-phone" placeholder="Your Phone Number" required><select id="enquiry-type" required><option value="" disabled selected>Select Enquiry Type...</option><option value="General Question">General</option><option value="Product Support">Product</option></select><textarea id="enquiry-message" placeholder="Your Message" rows="6" required></textarea><button type="submit" class="btn btn-primary" style="width: 100%;">Submit</button><p id="enquiry-status"></p></form>`;
}

function buildJobApplicationModal() {
    const container = document.getElementById('job-application-modal');
    container.innerHTML = `<div class="modal-content"><span class="close" onclick="toggleJobModal(false)">&times;</span><h2>Apply for <span id="job-modal-title"></span></h2><form id="job-application-form" class="enquiry-form"><input type="hidden" id="job-id-input"><input type="hidden" id="job-position-input"><input type="text" id="applicant-name" placeholder="Full Name" required><input type="email" id="applicant-email" placeholder="Email" required><input type="tel" id="applicant-phone" placeholder="Phone" required><input type="text" id="applicant-citizenship" placeholder="Citizenship" required><textarea id="applicant-message" placeholder="Tell us about yourself" rows="4"></textarea><label for="applicant-resume">Upload Resume (Mandatory)</label><input type="file" id="applicant-resume" required><button type="submit" class="btn btn-primary">Submit</button><p id="job-application-status"></p></form></div>`;
}

function buildFabButtons() {
    const container = document.getElementById('fab-container');
    container.innerHTML = `<div id="floating-cart" class="fab floating-cart-btn" onclick="toggleCart()"><i class="fa-solid fa-cart-shopping"></i><span id="cart-count">0</span></div><div class="fab chatbot-fab" onclick="toggleChatWidget(true)"><i class="fa-solid fa-robot"></i></div>`;
}

function buildChatbotWidget() {
    const container = document.getElementById('eshop-chat-widget');
    container.innerHTML = `<div id="chat-header"><span>FL e-Shop Assistant</span><button id="close-chat-btn" onclick="toggleChatWidget(false)">&times;</button></div><div id="chat-body"></div><div id="chat-input-container"><input type="text" id="chat-input" placeholder="Type your message..."><button id="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button></div>`;
}

// ===========================================================
// [ 4.0 ] CART LOGIC
// ===========================================================
function buildCartModal(content) {
    const container = document.getElementById('cart-modal');

    container.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="toggleCart(true)">&times;</span>
            <h2>Your Cart</h2>
            <div id="cart-items"></div>
            <div class="cart-summary">
                <div class="summary-line"><span>Subtotal</span><span id="cart-subtotal"></span></div>
                <div class="summary-line"><span>Shipping</span><span id="cart-shipping"></span></div>
                <div class="summary-line total"><span>Total</span><span id="cart-total"></span></div>
            </div>
            <div class="customer-info-form">
                <h3>Your Details</h3>
                <input type="text" id="customer-name" placeholder="Full Name" required>
                <input type="tel" id="customer-phone" placeholder="WhatsApp Number" required>
                <input type="email" id="customer-email" placeholder="Email (Optional)">
                <textarea id="customer-address" placeholder="Shipping Address" rows="3" required></textarea>
            </div>
            <p style="text-align:center; margin-top:1rem; font-size:0.9rem;">
                Clicking the button below will log your order and open WhatsApp to finalize payment.
            </p>
            <button id="checkout-btn" class="btn btn-primary" style="width: 100%; margin: 20px 0 0;" onclick="initiateCheckout()">Place Order via WhatsApp</button>
        </div>`;
}

function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    const existingItem = cart.find(item => item.id == productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product,
            quantity: 1
        });
    }
    updateCartDisplay();
}

function increaseQuantity(productId) {
    const item = cart.find(i => i.id == productId);
    if (item) {
        item.quantity++;
    }
    updateCartDisplay();
}

function decreaseQuantity(productId) {
    const item = cart.find(i => i.id == productId);
    if (item) {
        item.quantity--;
        if (item.quantity <= 0) {
            removeItemFromCart(productId);
        } else {
            updateCartDisplay();
        }
    }
}

function removeItemFromCart(productId) {
    cart = cart.filter(item => item.id != productId);
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = totalItems;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center;">Your cart is empty.</p>';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" />
                <div class="cart-item-details">
                    <strong>${item.name}</strong>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="decreaseQuantity(${item.id})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="increaseQuantity(${item.id})">+</button>
                    </div>
                </div>
                <strong>RM ${(item.price * item.quantity).toFixed(2)}</strong>
                <button class="remove-item-btn" onclick="removeItemFromCart(${item.id})"><i class="fa-solid fa-trash-can"></i></button>
            </div>`).join('');
        if (checkoutBtn) checkoutBtn.style.display = 'block';
    }
        
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // =====================================================
    // == START OF NEW, MORE ROBUST SHIPPING LOGIC        ==
    // =====================================================
    let shippingFee = 0; // Default to 0 if no rules apply

    if (shippingRules && shippingRules.length > 0) {
        // 1. Find all rules where the subtotal is high enough to qualify.
        const applicableRules = shippingRules.filter(rule => subtotal >= rule.minSpend);

        if (applicableRules.length > 0) {
            // 2. Find the best rule by selecting the one with the highest minimum spend.
            // This correctly finds the most specific tier (e.g., "Spend > 100" wins over "Spend > 50").
            const bestRule = applicableRules.reduce((best, current) => {
                return (current.minSpend > best.minSpend) ? current : best;
            });
            
            // 3. Set the shipping fee from the best matching rule.
            shippingFee = bestRule.charge;
        }
    }
    // =====================================================
    // == END OF NEW SHIPPING LOGIC                       ==
    // =====================================================
    
    const total = subtotal + shippingFee;

    document.getElementById('cart-subtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('cart-shipping').textContent = `RM ${shippingFee.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `RM ${total.toFixed(2)}`;
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    const isCurrentlyVisible = modal.style.display === 'flex';

    if (hide) {
        modal.style.display = 'none';
    } else {
        if (isCurrentlyVisible) {
            modal.style.display = 'none';
        } else {
            modal.style.display = 'flex';
            updateCartDisplay();
        }
    }
}

async function initiateCheckout() {
    const checkoutBtn = document.getElementById('checkout-btn');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing...';

    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const email = document.getElementById('customer-email') ? document.getElementById('customer-email').value.trim() : 'N/A';

    if (!name || !phone || !address) {
        alert('Please fill in your Name, WhatsApp Number, and Address.');
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Place Order via WhatsApp';
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = parseFloat(document.getElementById('cart-shipping').textContent.replace('RM ', ''));
    const totalAmount = subtotal + shippingFee;
    
    const itemsSummaryForWhatsapp = cart.map(item => `- ${item.name} (x${item.quantity})`).join('\n');
    const itemsPurchasedForSheet = cart.map(item => `${item.name} (x${item.quantity})`).join(', ');

    try {
        const payload = {
            action: 'logPendingOrder',
            data: {
                customerName: name, customerPhone: phone, customerEmail: email, customerAddress: address,
                itemsPurchased: itemsPurchasedForSheet, cart: cart,
                totalAmount: totalAmount, shippingFee: shippingFee,
            }
        };
        const response = await postDataToGScript(payload, true);

        if (response.status !== 'success' || !response.invoiceId) {
            throw new Error(response.message || 'Failed to log order.');
        }

        const adminPhoneNumber = "601111033154"; // Your WhatsApp number
        const whatsappMessage = `Hi, I would like to place an order:\n\n*Invoice ID:* ${response.invoiceId}\n\n*Items:*\n${itemsSummaryForWhatsapp}\n\n*Subtotal:* RM ${subtotal.toFixed(2)}\n*Shipping:* RM ${shippingFee.toFixed(2)}\n*TOTAL:* RM ${totalAmount.toFixed(2)}\n\n*My Details:*\nName: ${name}\nPhone: ${phone}\nAddress: ${address}\n\nPlease advise on payment. Thank you!`;
        const whatsappUrl = `https://wa.me/${adminPhoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        
        document.getElementById('main-content').innerHTML = `
            <div class="dynamic-content-wrapper" style="text-align: center;">
                <h2>Thank You! Your Order Has Been Logged.</h2>
                <p><strong>Invoice Number:</strong> ${response.invoiceId}</p>
                <p>We are now redirecting you to WhatsApp to finalize payment with our team.</p>
                <a href="${whatsappUrl}" class="btn btn-primary" style="max-width: 300px; margin: 20px auto 0;">Click here if not redirected</a>
            </div>`;
        
        cart = [];
        toggleCart(true);
        updateCartDisplay();
        
        setTimeout(() => {
            window.location.href = whatsappUrl;
        }, 2500);

    } catch (error) {
        console.error('Checkout failed:', error);
        alert('There was an error placing your order. Please try again or contact us directly.');
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Place Order via WhatsApp';
    }
}

// ===========================================================
// [ 5.0 ] FORMS, CHATBOT & UTILITIES
// ===========================================================
function toggleJobModal(show = false, jobId = '', jobTitle = '') {
    const modal = document.getElementById('job-application-modal');
    if (show) {
        document.getElementById('job-modal-title').textContent = jobTitle;
        document.getElementById('job-id-input').value = jobId;
        document.getElementById('job-position-input').value = jobTitle;
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
        document.getElementById('job-application-form').reset();
    }
}

async function handleEnquirySubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('enquiry-status');
    statusEl.textContent = 'Sending...';
    try {
        const payload = {
            action: 'logEnquiry',
            data: {
                name: document.getElementById('enquiry-name').value,
                email: document.getElementById('enquiry-email').value,
                phone: document.getElementById('enquiry-phone').value,
                type: document.getElementById('enquiry-type').value,
                message: document.getElementById('enquiry-message').value
            }
        };
        await postDataToGScript(payload);
        statusEl.textContent = 'Enquiry sent successfully!';
        event.target.reset();
    } catch (error) {
        statusEl.textContent = 'An error occurred.';
    }
}

async function handleJobApplicationSubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('job-application-status');
    const fileInput = document.getElementById('applicant-resume');
    if (fileInput.files.length === 0) {
        statusEl.textContent = 'Resume upload is mandatory.';
        return;
    }
    statusEl.textContent = 'Submitting...';
    const file = fileInput.files[0];
    const base64File = await getBase64(file);
    const payload = {
        action: 'logJobApplication',
        data: {
            jobId: document.getElementById('job-id-input').value,
            position: document.getElementById('job-position-input').value,
            name: document.getElementById('applicant-name').value,
            email: document.getElementById('applicant-email').value,
            phone: document.getElementById('applicant-phone').value,
            citizenship: document.getElementById('applicant-citizenship').value,
            message: document.getElementById('applicant-message').value,
            resumeFile: base64File.split(',')[1],
            resumeMimeType: file.type,
            resumeFileName: file.name
        }
    };
    try {
        await postDataToGScript(payload);
        statusEl.textContent = 'Application submitted successfully!';
        setTimeout(() => {
            toggleJobModal(false);
        }, 3000);
    } catch (error) {
        statusEl.textContent = 'An error occurred.';
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

function toggleChatWidget(show) {
    const chatWidget = document.getElementById('eshop-chat-widget');
    const fabContainer = document.getElementById('fab-container');
    if (show) {
        chatWidget.classList.add('active');
        fabContainer.style.right = '370px';
        if (document.getElementById('chat-body').innerHTML.trim() === '') {
            displayMainMenu();
        }
    } else {
        chatWidget.classList.remove('active');
        fabContainer.style.right = '20px';
    }
}

function addChatMessage(sender, text, type = 'html') {
    const chatBody = document.getElementById('chat-body');
    const msg = document.createElement('div');
    msg.classList.add('chat-message', sender === 'bot' ? 'bot-message' : 'user-message');
    msg.innerHTML = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
}

function displayMainMenu() {
    chatSession.state = 'main_menu';
    const menu = `<strong>Welcome! How can I help you?</strong><br>1. My Account<br>2. General Answers<br>3. Talk to a Human`;
    addChatMessage('bot', menu);
}

async function handleChatSubmit() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    addChatMessage('user', text);
    input.value = '';
    const thinkingMsg = addChatMessage('bot', '<i>Thinking...</i>');

    try {
        if (chatSession.state === 'awaiting_identifier') {
            await startVerification(text);
        } else if (chatSession.state === 'awaiting_code') {
            await submitVerificationCode(text);
        } else if (chatSession.state === 'my_account_menu') {
            await handleMyAccountMenu(text);
        } else {
            await handleMainMenu(text);
        }
    } catch (error) {
        thinkingMsg.innerHTML = 'There was an error connecting to the assistant.';
    }
}

async function handleMainMenu(text) {
    const lastBotMsg = document.querySelector('#chat-body .bot-message:last-child');
    if (text === '1') {
        if (sessionStorage.getItem('eshop_session_token')) {
            lastBotMsg.remove();
            displayMyAccountMenu();
        } else {
            chatSession.state = 'awaiting_identifier';
            lastBotMsg.innerHTML = 'Please enter your PAC or Email to verify your account.';
        }
    } else if (text === '2') {
        lastBotMsg.innerHTML = 'Please ask any general question you have.';
    } else if (text === '3') {
        lastBotMsg.innerHTML = 'To talk to a human, please contact our admin on WhatsApp: <a href="https://wa.me/601111033154" target="_blank">Click Here</a>';
    } else {
        const response = await postToRender('getSmartAnswer', {
            question: text
        });
        lastBotMsg.innerHTML = response.answer || 'Sorry, I had trouble finding an answer.';
    }
}

async function startVerification(identifier) {
    const lastBotMsg = document.querySelector('#chat-body .bot-message:last-child');
    const result = await postToRender('issueChatVerificationCode', {
        identifier: identifier
    });
    if (result.success) {
        chatSession.state = 'awaiting_code';
        chatSession.pac = result.pac;
        lastBotMsg.innerHTML = 'A code has been sent to your WhatsApp. Please enter it here.';
    } else {
        chatSession.state = 'main_menu';
        lastBotMsg.innerHTML = `Verification failed: ${result.message}`;
    }
}

async function submitVerificationCode(code) {
    const lastBotMsg = document.querySelector('#chat-body .bot-message:last-child');
    const result = await postToRender('verifyChatCode', {
        pac: chatSession.pac,
        code: code
    });
    if (result.success) {
        sessionStorage.setItem('eshop_session_token', result.token);
        lastBotMsg.innerHTML = 'Verified!';
        displayMyAccountMenu();
    } else {
        chatSession.state = 'main_menu';
        lastBotMsg.innerHTML = `Verification failed: ${result.message}`;
    }
}

function displayMyAccountMenu() {
    chatSession.state = 'my_account_menu';
    addChatMessage('bot', '<strong>My Account</strong><br>1. View My Last 5 Orders<br>2. Check My Total Points<br>3. Back to Main Menu');
}

async function handleMyAccountMenu(text) {
    const lastBotMsg = document.querySelector('#chat-body .bot-message:last-child');
    let action = '';
    if (text === '1') {
        action = 'getPurchaseHistory';
    } else if (text === '2') {
        action = 'getPointsHistory';
    } else if (text === '3') {
        lastBotMsg.remove();
        displayMainMenu();
        return;
    } else {
        lastBotMsg.innerHTML = 'Invalid option. Please choose from the menu.';
        addChatMessage('bot', '<strong>My Account</strong><br>1. View My Last 5 Orders<br>2. Check My Total Points<br>3. Back to Main Menu');
        return;
    }

    const token = sessionStorage.getItem('eshop_session_token');
    const result = await postToRender(action, {
        token: token
    });
    let message = '';
    if (result.success) {
        if (action === 'getPurchaseHistory') {
            message = "<strong>Your Last 5 Orders:</strong><br>";
            if (result.history.length === 0) {
                message = 'You have no purchase history.';
            } else {
                result.history.forEach(order => {
                    message += `<br><strong>ID:</strong> ${order.invoiceId}<br><strong>Date:</strong> ${order.date}<br><strong>Total:</strong> RM ${order.totalAmount}<br><strong>Status:</strong> ${order.status}`;
                });
            }
        } else {
            message = `Your total points: <strong>${result.currentBalance}</strong>`;
        }
    } else {
        message = `Error: ${result.message}`;
    }
    lastBotMsg.innerHTML = message;
    displayMyAccountMenu();
}


async function postDataToGScript(payload, expectJsonResponse = false) {
    try {
        // First, send a preflight request to handle CORS
        await fetch(googleScriptURL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preflight: true }),
            redirect: 'follow'
        });

        // Now, send the actual data request
        const response = await fetch(googleScriptURL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        
        if (expectJsonResponse) {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network response was not ok: ${errorText}`);
            }
            return await response.json();
        }
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action,
                apiKey,
                data
            })
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

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// ===========================================================
// [ 6.0 ] AI SUGGESTER & SEARCH FUNCTIONS
// ===========================================================

function filterProducts() {
    const searchTerm = document.getElementById("product-search").value.toLowerCase();
    const products = document.querySelectorAll("#product-list-container .product");

    products.forEach(product => {
        const productName = product.querySelector("h3").textContent.toLowerCase();
        if (productName.includes(searchTerm)) {
            product.style.display = "flex";
        } else {
            product.style.display = "none";
        }
    });
}

function suggestProduct() {
    const symptom = document.getElementById("symptom-input").value.toLowerCase().trim();
    const resultDiv = document.getElementById("suggestion-result");
    
    // Clear previous results and show a thinking message
    resultDiv.innerHTML = '<i>Finding suggestions...</i>';

    if (!symptom) {
        resultDiv.innerHTML = '<p style="color:red">Please enter a symptom or health concern.</p>';
        return;
    }

    // The hard-coded "database" of symptoms and corresponding product IDs
    const symptomDB = {
        // --- EXISTING CATEGORIES (EXPANDED) ---
        'digestion': { 
            keywords: ['digestion', 'stomach', 'tummy', 'bloated', 'indigestion', 'constipation', 'gastric', 'gerd', 'acid reflux', 'pedih ulu hati', 'sembelit', 'cirit-birit', 'buasir', 'angin', 'wind'], 
            ids: [1, 2, 3, 7, 11, 18] 
        },
        'immune': { 
            keywords: ['immune', 'sick', 'flu', 'cold', 'cough', 'fever', 'infection', 'selesema', 'batuk', 'demam', 'jangkitan', 'allergy', 'alahan', 'resdung', 'sinus'], 
            ids: [1, 2, 14, 15, 17] 
        },
        'energy': { 
            keywords: ['energy', 'tired', 'fatigue', 'stamina', 'lethargic', 'weak', 'letih', 'lesu', 'tak bertenaga', 'mengantuk', 'penat', 'brain fog', 'focus'], 
            ids: [12, 13, 15, 8] 
        },
        'weight': { 
            keywords: ['weight', 'diet', 'slim', 'lose weight', 'kurus', 'gemuk', 'berat badan', 'bakar lemak', 'fat burn', 'metabolism', 'metabolisma', 'obesity', 'kegemukan'], 
            ids: [4, 5, 6, 7] 
        },
        'skin': { 
            keywords: ['skin', 'dry', 'acne', 'eczema', 'sunburn', 'aging', 'wrinkles', 'kulit', 'jerawat', 'jeragat', 'parut', 'scar', 'pigmentation', 'gatal', 'itchy', 'psoriasis', 'kulit kusam', 'dull skin'], 
            ids: [30, 32, 29, 39, 52, 24, 21, 22, 31, 38, 41] 
        },
        'joint': { 
            keywords: ['joint', 'muscle', 'pain', 'sore', 'arthritis', 'sakit', 'otot', 'sakit sendi', 'lenguh', 'gout', 'sakit lutut', 'sakit belakang', 'back pain', 'knee pain', 'inflammation', 'radang'], 
            ids: [34, 16, 33] 
        },
        'heart': { 
            keywords: ['heart', 'cholesterol', 'blood pressure', 'jantung', 'darah tinggi', 'high blood', 'cardiovascular', 'strok'], 
            ids: [16] 
        },
        'bone': { 
            keywords: ['bone', 'calcium', 'osteoporosis', 'tulang', 'tulang rapuh', 'bone density'], 
            ids: [19] 
        },
        'headache': { 
            keywords: ['headache', 'migraine', 'pening', 'sakit kepala', 'stress', 'tekanan'], 
            ids: [33] 
        }, // <-- COMMA WAS MISSING HERE

        // --- NEW CATEGORIES ---
        'detox': {
            keywords: ['detox', 'cuci usus', 'toksin', 'nyah toksin', 'cleanse'],
            ids: [1, 2, 7]
        },
        'womens_health': {
            keywords: ['women', 'wanita', 'period pain', 'senggugut', 'pms', 'menopause', 'keputihan', 'kesuburan', 'fertility'],
            ids: [1, 15, 19]
        },
        'mens_health': {
            keywords: ['men', 'lelaki', 'prostate', 'testosterone', 'tenaga batin'],
            ids: [8, 12, 13, 15]
        },
        'stress_sleep': {
            keywords: ['stress', 'tekanan', 'susah tidur', 'insomnia', 'anxiety', 'risau', 'gelisah', 'sleep', 'relax'],
            ids: [33, 12]
        },
        'hair_nails': {
            keywords: ['hair loss', 'rambut gugur', 'kelemumur', 'dandruff', 'kuku rapuh', 'brittle nails', 'hair growth'],
            ids: [30, 31, 32, 1]
        },
        'eyes': {
            keywords: ['eye', 'mata', 'penglihatan', 'vision', 'rabun', 'eye strain', 'silau'],
            ids: [15]
        }
    };

    const suggestedSKUs = new Set();

    // Iterate over each category in our database.
    for (const category in symptomDB) {
        // For each category, iterate over its list of keywords.
        for (const keyword of symptomDB[category].keywords) {
            // Check if the user's FULL input string contains the current keyword.
            // This correctly handles multi-word keywords like "lose weight".
            if (symptom.includes(keyword)) {
                // If a match is found, add all associated product IDs to our set.
                symptomDB[category].ids.forEach(id => suggestedSKUs.add(id));
            }
        }
    }
    
    if (suggestedSKUs.size > 0) {
        let suggestionsHtml = "<h4>Based on your concern, we suggest:</h4>";
        
        // Convert the Set to an array and limit to a maximum of 3 suggestions
        [...suggestedSKUs].slice(0, 3).forEach(sku => {
            const product = products.find(p => p.id === sku);
            if (product) {
                suggestionsHtml += `
                    <div class="suggestion-product">
                        <span><strong>${product.name}</strong> - ${product.benefits.split(",")[0]}</span>
                        <button class="btn btn-primary" style="width:auto;padding:8px 15px" onclick="addToCart(${product.id});toggleCart()">Add</button>
                    </div>`;
            }
        });
        resultDiv.innerHTML = suggestionsHtml;
    } else {
        resultDiv.innerHTML = "<p>We could not find a specific match. Try searching for products directly on the Products page.</p>";
    }
}
