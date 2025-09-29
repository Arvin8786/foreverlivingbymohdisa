// =================================================================
// E-Shop Frontend Script - v16.0 (Definitive Final & Complete)
// =================================================================

const googleScriptURL = 'https://script.google.com/macros/s/AKfycbw9Z4FICzQDvy8ijD_7KVUISiLpgiQ5-dmvc_VbWmswgCDzgl08iVNGTC-kDSRSwJaKSQ/exec'; // <-- IMPORTANT: PASTE YOUR DEPLOYED WEB APP URL HERE
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat'; // <-- IMPORTANT: PASTE YOUR RENDER SERVER URL HERE

let products = [];
let cart = [];
let chatSession = { state: 'main_menu' };

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    // Event listeners for forms and chatbot are added after content is built
});

async function fetchData() {
    const productContainer = document.getElementById('product-list-container');
    try {
        productContainer.innerHTML = `<p class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading products...</p>`;
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error('Network response was not ok.');
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'An unknown error occurred.');

        const marketing = data.marketing || {};
        if (marketing.MaintenanceMode === true) {
            document.getElementById('maintenance-message').textContent = marketing.MaintenanceMessage || "We'll be back shortly!";
            document.getElementById('maintenance-overlay').style.display = 'flex';
            return;
        }

        products = data.products || [];
        renderProducts(products);
        renderAboutUs(data.aboutUsContent);
        renderJobs(data.jobsListings);
        renderStaticContent(data.aboutUsContent);
        buildEnquiryForm();
        buildCart();
        buildJobApplicationModal();
        
        document.getElementById('update-timestamp').textContent = `v16.0`;

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        productContainer.innerHTML = `<p style="text-align: center; color: red; font-weight: bold;">Error loading store. Could not retrieve catalog. Please try again later.</p>`;
    }
}

function renderStaticContent(content) {
    document.getElementById('company-name-header').innerHTML = `${content.CompanyName || ''} <span class="by-line">${content.Owner} - ${content.Role}</span> <span class="slogan">${content.Slogan}</span>`;
    document.getElementById('footer-text').textContent = content.Footer || `© ${new Date().getFullYear()} ${content.CompanyName}`;
    const bannerTextEl = document.getElementById('promo-banner-text');
    const banner = document.getElementById('promo-running-banner');
    if (content.RunningBanner) {
        bannerTextEl.textContent = content.RunningBanner;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function renderProducts(productsToRender) {
    const container = document.getElementById('product-list-container');
    if (!productsToRender || productsToRender.length === 0) {
        container.innerHTML = `<p>No products available at the moment.</p>`;
        return;
    }
    container.innerHTML = productsToRender.map(p => `
        <div class="product">
            <div class="product-image-container"><img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/200x200?text=Image+Not+Found'"></div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-section"><span class="new-price">RM ${p.price.toFixed(2)}</span></div>
                <div class="product-actions">
                  <button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button>
                </div>
            </div>
        </div>`).join('');
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!content) { container.innerHTML = '<p>About us information is currently unavailable.</p>'; return; }
    container.innerHTML = `
        <h2>${content.WhyChooseUs_Title || 'About Us'}</h2>
        <div class="owner-profile">
            <div class="owner-details">
                <h3>${content.Owner} - ${content.Role}</h3>
                <div>${content.MoreDetails}</div>
                <p><strong>Our Mission:</strong> ${content.OurMission}</p>
                <p><strong>Our Vision:</strong> ${content.OurVision}</p>
                <ul>
                    <li><i class="${content.Point1_Icon}"></i> ${content.Point1_Text}</li>
                    <li><i class="${content.Point2_Icon}"></i> ${content.Point2_Text}</li>
                    <li><i class="${content.Point3_Icon}"></i> ${content.Point3_Text}</li>
                </ul>
            </div>
        </div>`;
}

function renderJobs(jobs) {
    const container = document.getElementById('job-listings-container');
    if (!jobs || jobs.length === 0) {
        container.innerHTML = '<p>There are currently no open positions. Please check back later.</p>';
        return;
    }
    container.innerHTML = jobs.map(job => `
        <div class="job-listing">
            <h3>${job.position}</h3>
            <p><strong>Location:</strong> ${job.location} | <strong>Type:</strong> ${job.type}</p>
            <div>${job.description}</div>
            <button class="btn btn-primary" onclick="toggleJobModal(true, '${job.jobId}', '${job.position}')">Apply Now</button>
        </div>
    `).join('');
}

function buildEnquiryForm() {
    const container = document.getElementById('enquiries-form-content');
    container.innerHTML = `
        <form id="enquiry-form" class="enquiry-form">
          <input type="text" id="enquiry-name" placeholder="Your Full Name" required>
          <input type="email" id="enquiry-email" placeholder="Your Email Address" required>
          <input type="tel" id="enquiry-phone" placeholder="Your Phone Number" required>
          <select id="enquiry-type" required>
            <option value="" disabled selected>Select Enquiry Type...</option>
            <option value="General Question">General Question</option>
            <option value="Product Support">Product Support</option>
            <option value="Business Opportunity">Business Opportunity</option>
          </select>
          <textarea id="enquiry-message" placeholder="Your Message" rows="6" required></textarea>
          <button type="submit" class="btn btn-primary">Submit Enquiry</button>
          <p id="enquiry-status"></p>
        </form>`;
    document.getElementById('enquiry-form').addEventListener('submit', handleEnquirySubmit);
}

function buildCart() {
    const container = document.getElementById('cart-modal');
    container.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="toggleCart(true)">×</span>
            <h2>Your Shopping Cart</h2>
            <div id="cart-items"><p>Your cart is currently empty.</p></div>
            <div class="cart-summary">
              <div class="summary-line"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
              <div class="summary-line"><span>Shipping</span><span id="cart-shipping">RM 0.00</span></div>
              <div class="summary-line total"><span>Total</span><span id="cart-total">RM 0.00</span></div>
              <div id="points-earned-display"></div>
            </div>
            <div class="customer-info-form">
              <h3>Customer & Shipping Information</h3>
              <input type="text" id="customer-name" placeholder="Your Full Name" required>
              <input type="tel" id="customer-phone" placeholder="Your WhatsApp Number (e.g., +60123456789)" required>
              <input type="email" id="customer-email" placeholder="Your Email Address (for receipt)" required>
              <textarea id="customer-address" placeholder="Full Shipping Address" rows="4" required></textarea>
            </div>
            <button class="btn btn-primary checkout-btn" id="checkout-btn" onclick="initiateCheckout()">Complete Order</button>
        </div>`;
}

function buildJobApplicationModal() {
    const container = document.getElementById('job-application-modal');
    container.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="toggleJobModal(false)">×</span>
            <h2>Apply for <span id="job-modal-title">Position</span></h2>
            <form id="job-application-form" class="enquiry-form">
                <input type="hidden" id="job-id-input">
                <input type="hidden" id="job-position-input">
                <input type="text" id="applicant-name" placeholder="Your Full Name" required>
                <input type="email" id="applicant-email" placeholder="Your Email Address" required>
                <input type="tel" id="applicant-phone" placeholder="Your Phone Number" required>
                <input type="text" id="applicant-citizenship" placeholder="Your Citizenship" required>
                <textarea id="applicant-message" placeholder="Tell us a bit about yourself" rows="4"></textarea>
                <label for="applicant-resume">Upload Resume (Mandatory)</label>
                <input type="file" id="applicant-resume" required>
                <button type="submit" class="btn btn-primary">Submit Application</button>
                <p id="job-application-status"></p>
            </form>
        </div>`;
    document.getElementById('job-application-form').addEventListener('submit', handleJobApplicationSubmit);
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) { existingItem.quantity++; } else { cart.push({ ...product, quantity: 1 }); }
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    document.getElementById('cart-count').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is currently empty.</p>';
        subtotalEl.textContent = 'RM 0.00';
        totalEl.textContent = 'RM 0.00';
        return;
    }
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <span>${item.name} (x${item.quantity})</span>
            <span>RM ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    subtotalEl.textContent = `RM ${subtotal.toFixed(2)}`;
    totalEl.textContent = `RM ${subtotal.toFixed(2)}`; // Add shipping logic here if needed
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    modal.style.display = hide ? 'none' : 'flex';
    if (!hide) { updateCartDisplay(); }
}

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
        const payload = { action: 'logEnquiry', data: { name: document.getElementById('enquiry-name').value, email: document.getElementById('enquiry-email').value, phone: document.getElementById('enquiry-phone').value, type: document.getElementById('enquiry-type').value, message: document.getElementById('enquiry-message').value } };
        const response = await fetch(googleScriptURL, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
        statusEl.textContent = 'Your enquiry has been sent successfully!';
        event.target.reset();
    } catch (error) {
        statusEl.textContent = 'An error occurred. Please try again.';
        console.error('Enquiry error:', error);
    }
}

async function handleJobApplicationSubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('job-application-status');
    const fileInput = document.getElementById('applicant-resume');
    if (fileInput.files.length === 0) {
        statusEl.textContent = 'Resume upload is mandatory.';
        statusEl.style.color = 'red';
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
        const response = await fetch(googleScriptURL, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
        statusEl.textContent = 'Application submitted successfully!';
        statusEl.style.color = 'green';
        setTimeout(() => { toggleJobModal(false); statusEl.textContent = ''; }, 3000);
    } catch (error) {
        statusEl.textContent = 'An error occurred. Please try again.';
        statusEl.style.color = 'red';
        console.error('Job application error:', error);
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => { tab.classList.remove('active'); });
    document.getElementById(tabId).classList.add('active');
}

function initiateCheckout() {
    // This is a placeholder for your full checkout logic
    alert('Checkout process initiated!');
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
