// =================================================================
// E-Shop Frontend Script - v13.0 (Definitive Final)
// =================================================================
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwYTrZkOzFob6bweHvObnY5BU1dT4g72uq0JWa2WGZVk7FgvsJslvdXNRnPHEH-SE0vcQ/exec';

let products = [];
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    document.getElementById('enquiry-form').addEventListener('submit', handleEnquirySubmit);
    document.getElementById('job-application-form').addEventListener('submit', handleJobApplicationSubmit);
});

async function fetchData() {
    const productContainer = document.getElementById('product-list-container');
    try {
        productContainer.innerHTML = `<p style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading products...</p>`;
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
        
        const aboutContent = data.aboutUsContent || {};
        document.getElementById('company-name-header').innerHTML = `${aboutContent.CompanyName || ''} <span class="by-line">${aboutContent.Slogan || ''}</span>`;
        document.getElementById('hero-title').innerHTML = `<i class="fa-solid fa-store"></i> ${aboutContent.CompanyName || 'Welcome'}`;
        document.getElementById('hero-subtitle').textContent = aboutContent.Slogan || 'High-quality wellness products';
        document.getElementById('promo-banner-text').textContent = aboutContent.RunningBanner || '';
        document.getElementById('footer-text').textContent = aboutContent.Footer || `© ${new Date().getFullYear()}`;

        if(aboutContent.RunningBanner) {
            document.getElementById('promo-running-banner').style.display = 'block';
        }
        
        document.getElementById('update-timestamp').textContent = `${new Date().toLocaleDateString('en-GB')} (v13.0)`;

    } catch (error) {
        console.error("Error fetching store data:", error);
        productContainer.innerHTML = `<p style="text-align: center; color: red; font-weight: bold;">Error loading store. Could not retrieve catalog. Please try again later.</p>`;
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
            <div class="product-image-container">
                <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/200'">
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="new-price">RM ${p.price.toFixed(2)}</div>
                <div class="product-actions">
                  <button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!content) { container.innerHTML = '<p>About us information is currently unavailable.</p>'; return; }
    container.innerHTML = `
        <h2>${content.WhyChooseUs_Title || 'About Us'}</h2>
        <div class="owner-profile">
            <div class="owner-details">
                <h3>${content.Owner} - ${content.Role}</h3>
                ${content.MoreDetails}
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

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    document.getElementById('cart-count').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

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
    totalEl.textContent = `RM ${subtotal.toFixed(2)}`; // Placeholder for now, add shipping later
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    if (hide) {
        modal.style.display = 'none';
    } else {
        updateCartDisplay();
        modal.style.display = 'flex';
    }
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
    try {
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
    statusEl.textContent = 'Submitting...';
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
            resumeUrl: document.getElementById('applicant-resume-url').value
        }
    };
    try {
        const response = await fetch(googleScriptURL, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
        statusEl.textContent = 'Application submitted successfully!';
        setTimeout(() => {
            toggleJobModal(false);
        }, 2000);
    } catch (error) {
        statusEl.textContent = 'An error occurred. Please try again.';
        console.error('Job application error:', error);
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

function initiateCheckout() {
  // Placeholder function for checkout logic
  alert('Checkout process initiated!');
}
