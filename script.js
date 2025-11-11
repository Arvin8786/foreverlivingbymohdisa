// =================================================================
// E-Shop Frontend Script - v31.0 (Built from Scratch)
// Powers the Public Customer-Facing Website
// =================================================================

// [ 1.0 ] GLOBAL CONFIGURATION & STATE
const googleScriptURL = 'https://script.google.com/macros/s/AKfycby4MtPVpYIBv0VlFE3PjwGIwSTcYQmBkp1JbEFlFwHxwijQZ8FJZ5MhqzR6Q7H5oVjCvw/exec'; // <-- IMPORTANT: PASTE YOUR DEPLOYED URL HERE

// --- Global State Variables ---
let products = [];
let allJobs = [];
let cart = [];
let shippingRules = [];
let aboutUsContent = {};
let currentInvoiceId = null; // Used for the new checkout flow

// =================================================================
// [ 2.0 ] MAIN CONTROLLER & INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', fetchData);

/**
 * Main function to fetch all necessary data from the backend and render the entire page.
 */
async function fetchData() {
    try {
        const response = await fetch(googleScriptURL);
        if (!response.ok) { throw new Error('Network response failed. Please check the backend URL and deployment status.'); }
        
        const data = await response.json();
        if (data.status !== 'success') { throw new Error(data.message || 'The backend returned an error.'); }

        // Store fetched data in global state
        products = data.products || [];
        allJobs = data.jobsListings || [];
        shippingRules = data.shippingRules || [];
        aboutUsContent = data.aboutUsContent || {};

        // Set page title from backend data
        document.title = aboutUsContent.CompanyName || 'E-Shop';

        // --- Render all page components ---
        renderStaticContent(aboutUsContent);
        renderNavigation();
        renderMainContentShell();
        renderHomepageContent(aboutUsContent, allJobs);
        renderProducts(products);
        renderAboutUs(aboutUsContent);
        renderJobs(allJobs);
        buildEnquiryForm();
        buildCartModal(); // Builds the modal structure for the new checkout flow
        buildJobApplicationModal();
        buildFabButtons();
        
        document.getElementById('update-timestamp').textContent = new Date().toLocaleDateString('en-GB');
        
        // --- Attach global event listeners ---
        document.getElementById('enquiry-form').addEventListener('submit', handleEnquirySubmit);
        document.getElementById('job-application-form').addEventListener('submit', handleJobApplicationSubmit);

        // Show the homepage by default
        showTab('homepage');

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        document.getElementById('main-content').innerHTML = `<div style="text-align: center; padding: 40px; background: #fff; border-radius: 12px; box-shadow: var(--shadow);">
            <h2 style="color: var(--danger-color);">Store Currently Unavailable</h2>
            <p>We're sorry, but we couldn't load the store data. Please try again later.</p>
            <p style="font-size: 0.8rem; color: #777;">Error: ${error.message}</p>
        </div>`;
    }
}

// =================================================================
// [ 3.0 ] UI & DYNAMIC CONTENT RENDERING
// =================================================================

/**
 * Renders static content like header and footer.
 */
function renderStaticContent(content) {
    document.getElementById('company-name-header').innerHTML = `${content.CompanyName || ''} <span class="by-line" style="font-size: 1.1rem; font-weight: 500; display: block;">${content.Owner || ''} - ${content.Role || ''}</span> <span class="slogan" style="font-size: 0.9rem; color: #555; font-weight: 400; display: block; margin-top: 4px;">${content.Slogan || ''}</span>`;
    document.getElementById('footer-text').textContent = content.Footer || `© ${new Date().getFullYear()} ${content.CompanyName}`;
}

/**
 * Builds the main navigation links.
 */
function renderNavigation() {
    const navContainer = document.getElementById('main-nav');
    navContainer.innerHTML = `
        <li><a id="nav-homepage" onclick="showTab('homepage')">Homepage</a></li>
        <li><a id="nav-products" onclick="showTab('products')">Products</a></li>
        <li><a id="nav-about" onclick="showTab('about')">About Us</a></li>
        <li><a id="nav-jobs" onclick="showTab('jobs')">Careers</a></li>
        <li><a id="nav-enquiries" onclick="showTab('enquiries')">Contact Us</a></li>
    `;
}

/**
 * Renders the shell containers for all the different page views.
 */
function renderMainContentShell() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div id="homepage" class="tab-content"></div>
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
    `;
}

/**
 * Renders all content for the homepage.
 */
function renderHomepageContent(about, jobs) {
    const container = document.getElementById('homepage');
    const heroHtml = `<section class="hero-section"><h2>${about.CompanyName || 'Welcome'}</h2><p>${about.Slogan || 'High-quality wellness products'}</p></section>`;
    // Add other homepage sections here if needed (e.g., testimonies, featured products)
    container.innerHTML = heroHtml + `<div class="dynamic-content-wrapper"><p>${about.MoreDetails || 'Welcome to our official e-shop.'}</p></div>`;
}

/**
 * Renders the product grid.
 */
function renderProducts(productsToRender) {
    const container = document.getElementById('product-list-container');
    if (!productsToRender || productsToRender.length === 0) {
        container.innerHTML = `<p>No products available at the moment.</p>`;
        return;
    }
    container.innerHTML = `<div class="product-list">${productsToRender.map(p => `
        <div class="product">
            <div class="product-image-container"><img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/250';"></div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-section"><span class="new-price">RM ${p.price.toFixed(2)}</span></div>
                <div class="product-actions"><button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button></div>
            </div>
        </div>`).join('')}</div>`;
}

/**
 * Renders the About Us page content.
 */
function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    container.innerHTML = `<h2>About ${content.CompanyName}</h2><div>${content.MoreDetails || ''}</div>`;
}

/**
 * Renders the job listings.
 */
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
                <p><strong>Location:</strong> ${job.location} | <strong>Type:</strong> ${job.type}</p>
                <div class="job-description">${job.description}</div>
                <button class="btn btn-primary" onclick="toggleJobModal(true, '${job.jobId}', '${job.position}')" style="width: auto;">Apply Now</button>
            </div>
        </div>`).join('');
}

/**
 * Builds the HTML for the enquiry form.
 */
function buildEnquiryForm() {
    const container = document.getElementById('enquiries-form-content');
    container.innerHTML = `<h2>Send Us An Enquiry</h2><form id="enquiry-form"><input type="text" id="enquiry-name" placeholder="Your Full Name" required><input type="email" id="enquiry-email" placeholder="Your Email Address" required><textarea id="enquiry-message" placeholder="Your Message" rows="6" required></textarea><button type="submit" class="btn btn-primary">Submit Enquiry</button><p id="enquiry-status"></p></form>`;
}

/**
 * Builds the structure for the job application modal.
 */
function buildJobApplicationModal() {
    const container = document.getElementById('job-application-modal');
    container.innerHTML = `<div class="modal-content"><span class="close" onclick="toggleJobModal(false)">&times;</span><h2>Apply for <span id="job-modal-title"></span></h2><form id="job-application-form"><input type="hidden" id="job-id-input"><input type="hidden" id="job-position-input"><input type="text" id="applicant-name" placeholder="Full Name" required><input type="email" id="applicant-email" placeholder="Email" required><label for="applicant-resume">Upload Resume</label><input type="file" id="applicant-resume" required><button type="submit" class="btn btn-primary">Submit Application</button><p id="job-application-status"></p></form></div>`;
}

/**
 * Builds the Floating Action Button for the cart.
 */
function buildFabButtons() {
    const container = document.getElementById('fab-container');
    container.innerHTML = `<div id="floating-cart" class="fab" onclick="toggleCart(true)"><i class="fa-solid fa-cart-shopping"></i><span id="cart-count">0</span></div>`;
}

// =================================================================
// [ 4.0 ] CART & NEW CHECKOUT WORKFLOW
// =================================================================

/**
 * Builds the cart modal with views for both cart display and payment/proof upload.
 */
function buildCartModal() {
    const container = document.getElementById('cart-modal');
    container.innerHTML = `
    <div class="modal-content">
        <span class="close" onclick="toggleCart(false)">&times;</span>
        
        <!-- View 1: Cart & Customer Details (Visible by default) -->
        <div id="cart-view">
            <h2>Your Cart</h2>
            <div id="cart-items"><p style="text-align:center;">Your cart is empty.</p></div>
            <div class="cart-summary">
                <div class="summary-line"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
                <div class="summary-line"><span>Shipping</span><span id="cart-shipping">RM 0.00</span></div>
                <div class="summary-line total"><span>Total</span><span id="cart-total">RM 0.00</span></div>
            </div>
            <div class="customer-info-form">
                <h3>Your Details</h3>
                <input type="text" id="customer-name" placeholder="Full Name" required>
                <input type="tel" id="customer-phone" placeholder="WhatsApp Number" required>
                <input type="email" id="customer-email" placeholder="Email" required>
                <textarea id="customer-address" placeholder="Shipping Address" rows="3" required></textarea>
            </div>
            <button id="checkout-btn" class="btn btn-primary" style="margin-top: 20px;" onclick="initiateCheckout()">Place Order</button>
            <p id="checkout-status" style="text-align: center; margin-top: 10px;"></p>
        </div>

        <!-- View 2: Payment & Proof Upload (Hidden by default) -->
        <div id="payment-view" class="hidden">
            <h2>Payment Required</h2>
            <p style="text-align:center;">Your order has been logged. Please complete payment to finalize.</p>
            <p style="text-align:center;"><strong>Invoice ID: <span id="payment-invoice-id"></span></strong></p>
            
            <div class="payment-instructions">
                <h4>Please transfer the total amount to:</h4>
                <p><strong>Bank Name:</strong> YOUR BANK NAME<br>
                   <strong>Account Number:</strong> 1234567890<br>
                   <strong>Account Name:</strong> YOUR COMPANY NAME</p>
                <p>or scan the DuitNow QR code below:</p>
                <img src="YOUR_QR_CODE_IMAGE_URL" alt="DuitNow QR Code" onerror="this.style.display='none'">
            </div>

            <div id="proof-submission-section">
                <h4>Step 2: Upload Payment Proof</h4>
                <p>Please upload a screenshot or receipt of your transaction.</p>
                <input type="file" id="payment-proof-input" accept="image/*,application/pdf" required>
                <button id="submit-proof-btn" class="btn btn-primary" style="margin-top: 15px;" onclick="handleProofSubmission()">Confirm & Submit Proof</button>
                <p id="proof-status" style="text-align: center; margin-top: 10px;"></p>
            </div>
        </div>

        <!-- View 3: Thank You Message (Hidden by default) -->
        <div id="thank-you-view" class="hidden" style="text-align:center;">
            <h2 style="color: var(--success-color);">Thank You!</h2>
            <p>Your payment proof has been submitted successfully.</p>
            <p>We will verify your payment and process your order shortly. Your invoice ID is <strong><span id="final-invoice-id"></span></strong>.</p>
            <button class="btn btn-secondary" style="margin-top:20px" onclick="toggleCart(false)">Close</button>
        </div>
    </div>`;
}

function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    const existingItem = cart.find(item => item.id == productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartDisplay();
}

function increaseQuantity(productId) {
    const item = cart.find(i => i.id == productId);
    if (item) item.quantity++;
    updateCartDisplay();
}

function decreaseQuantity(productId) {
    const item = cart.find(i => i.id == productId);
    if (item && item.quantity > 1) {
        item.quantity--;
    } else {
        removeItemFromCart(productId);
    }
    updateCartDisplay();
}

function removeItemFromCart(productId) {
    cart = cart.filter(item => item.id != productId);
    updateCartDisplay();
}

/**
 * Updates the entire cart UI, including items, totals, and counts.
 */
function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = totalItems;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center;">Your cart is empty.</p>';
        if (checkoutBtn) checkoutBtn.disabled = true;
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
        if (checkoutBtn) checkoutBtn.disabled = false;
    }
        
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let shippingFee = 0; 
    if (shippingRules && shippingRules.length > 0) {
        const sortedRules = [...shippingRules].sort((a, b) => b.minSpend - a.minSpend); 
        const bestRule = sortedRules.find(rule => subtotal >= rule.minSpend);
        if (bestRule) shippingFee = bestRule.charge;
    }
    
    const total = subtotal + shippingFee;

    document.getElementById('cart-subtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('cart-shipping').textContent = `RM ${shippingFee.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `RM ${total.toFixed(2)}`;
}

/**
 * Toggles the visibility of the cart modal and resets its state when closed.
 */
function toggleCart(show) {
    const modal = document.getElementById('cart-modal');
    if (show) {
        updateCartDisplay();
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
        // Reset the modal to the initial cart view when closed
        document.getElementById('cart-view').classList.remove('hidden');
        document.getElementById('payment-view').classList.add('hidden');
        document.getElementById('thank-you-view').classList.add('hidden');
        document.getElementById('checkout-status').textContent = '';
        document.getElementById('proof-status').textContent = '';
    }
}

/**
 * WORKFLOW STEP 1: Logs the initial order and transitions the UI to the payment view.
 */
async function initiateCheckout() {
    const checkoutBtn = document.getElementById('checkout-btn');
    const statusEl = document.getElementById('checkout-status');
    
    // --- Form Validation ---
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const email = document.getElementById('customer-email').value.trim();

    if (!name || !phone || !address || !email) {
        statusEl.textContent = 'Please fill in all your details.';
        statusEl.style.color = 'var(--danger-color)';
        return;
    }

    checkoutBtn.disabled = true;
    statusEl.textContent = 'Processing...';
    statusEl.style.color = 'var(--dark-text)';

    // --- Prepare Payload ---
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = parseFloat(document.getElementById('cart-shipping').textContent.replace('RM ', ''));
    
    const payload = {
        action: 'logInitialOrder', 
        data: {
            customerName: name, customerPhone: phone, customerEmail: email, customerAddress: address,
            itemsPurchased: cart.map(item => `${item.name} (x${item.quantity})`).join(', '),
            cart: cart,
            totalAmount: subtotal + shippingFee,
            shippingFee: shippingFee,
        }
    };
    
    try {
        const response = await postDataToGScript(payload);
        if (response.status !== 'success' || !response.invoiceId) {
            throw new Error(response.message || 'Failed to log order.');
        }

        currentInvoiceId = response.invoiceId; // Save invoice ID for proof submission

        // --- UI Transition ---
        document.getElementById('cart-view').classList.add('hidden');
        document.getElementById('payment-invoice-id').textContent = currentInvoiceId;
        document.getElementById('payment-view').classList.remove('hidden');

    } catch (error) {
        console.error('Checkout failed:', error);
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = 'var(--danger-color)';
        checkoutBtn.disabled = false;
    }
}

/**
 * WORKFLOW STEP 2: Handles the payment proof upload and finalizes the submission.
 */
async function handleProofSubmission() {
    const submitBtn = document.getElementById('submit-proof-btn');
    const statusEl = document.getElementById('proof-status');
    const proofInput = document.getElementById('payment-proof-input');

    if (proofInput.files.length === 0) {
        statusEl.textContent = 'Please select a file to upload.';
        statusEl.style.color = 'var(--danger-color)';
        return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = 'Uploading...';
    statusEl.style.color = 'var(--dark-text)';
    
    try {
        const file = proofInput.files[0];
        const base64File = await getBase64(file);

        const payload = {
            action: 'addPaymentProof',
            data: {
                invoiceId: currentInvoiceId,
                paymentProof: {
                    file: base64File.split(',')[1],
                    mimeType: file.type,
                }
            }
        };

        const response = await postDataToGScript(payload);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to submit proof.');
        }

        // --- UI Transition to Thank You View ---
        document.getElementById('payment-view').classList.add('hidden');
        document.getElementById('final-invoice-id').textContent = currentInvoiceId;
        document.getElementById('thank-you-view').classList.remove('hidden');

        // Reset cart for next purchase
        cart = [];
        updateCartDisplay();

    } catch (error) {
        console.error('Proof submission failed:', error);
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = 'var(--danger-color)';
        submitBtn.disabled = false;
    }
}


// =================================================================
// [ 5.0 ] FORMS & UTILITIES
// =================================================================

function filterProducts() {
    const searchTerm = document.getElementById("product-search").value.toLowerCase();
    const productElements = document.querySelectorAll(".product");
    productElements.forEach(productEl => {
        const productName = productEl.querySelector("h3").textContent.toLowerCase();
        productEl.style.display = productName.includes(searchTerm) ? "flex" : "none";
    });
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');
}

function toggleJobModal(show, jobId = '', jobTitle = '') {
    const modal = document.getElementById('job-application-modal');
    if (show) {
        document.getElementById('job-modal-title').textContent = jobTitle;
        document.getElementById('job-id-input').value = jobId;
        document.getElementById('job-position-input').value = jobTitle;
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
        document.getElementById('job-application-form').reset();
        document.getElementById('job-application-status').textContent = '';
    }
}

async function handleEnquirySubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('enquiry-status');
    statusEl.textContent = 'Sending...';
    try {
        const payload = { action: 'logEnquiry', data: { name: document.getElementById('enquiry-name').value, email: document.getElementById('enquiry-email').value, message: document.getElementById('enquiry-message').value } };
        await postDataToGScript(payload);
        statusEl.textContent = 'Enquiry sent successfully!';
        statusEl.style.color = 'var(--success-color)';
        event.target.reset();
    } catch (error) { 
        statusEl.textContent = 'An error occurred. Please try again.';
        statusEl.style.color = 'var(--danger-color)';
    }
}

async function handleJobApplicationSubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('job-application-status');
    const fileInput = document.getElementById('applicant-resume');
    if (fileInput.files.length === 0) {
        statusEl.textContent = 'Resume upload is mandatory.';
        statusEl.style.color = 'var(--danger-color)';
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
            resumeFile: base64File.split(',')[1],
            resumeMimeType: file.type,
            resumeFileName: file.name
        }
    };
    try {
        await postDataToGScript(payload);
        statusEl.textContent = 'Application submitted successfully!';
        statusEl.style.color = 'var(--success-color)';
        setTimeout(() => toggleJobModal(false), 3000);
    } catch (error) { 
        statusEl.textContent = 'An error occurred. Please try again.';
        statusEl.style.color = 'var(--danger-color)';
    }
}

/**
 * Utility to convert a file to a Base64 string.
 */
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            return reject(new Error("File size exceeds 5MB limit."));
        }
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Reusable utility for sending POST requests to the Google Apps Script backend.
 */
async function postDataToGScript(payload) {
    try {
        const response = await fetch(googleScriptURL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Use text/plain for Apps Script POST
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Network response was not ok: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error posting to Google Script:', error);
        throw error;
    }
}
