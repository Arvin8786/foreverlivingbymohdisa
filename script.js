// =================================================================
// E-Shop Frontend Script - v12.9 (Definitive Final Version)
// =================================================================
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbyqM8a6EhBC3KAX1ubH8cs8J64jy3hXpR7PiAo1Fv2zDemltLbi9kmZMe2JEebt84MNkA/exec'; // <-- IMPORTANT: Make sure this is your correct deployed URL

let products = [];
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    document.getElementById('enquiry-form').addEventListener('submit', handleEnquirySubmit);
});

async function fetchData() {
    const productContainer = document.getElementById('product-list-container');
    try {
        productContainer.innerHTML = `<p style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading products...</p>`;
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error('Network response was not ok.');
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'An unknown error occurred.');

        // Handle Maintenance Mode
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
        
        const companyName = data.aboutUsContent.CompanyName || 'Forever Living by Muhd Arvind Isa';
        document.getElementById('footer-text').textContent = `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`;
        document.getElementById('update-timestamp').textContent = `${new Date().toLocaleDateString('en-GB')} (v12.9)`;

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
                <button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!content) { container.innerHTML = '<p>About us information is currently unavailable.</p>'; return; }
    container.innerHTML = `
        <div class="owner-profile">
            <img src="${content.About_Image_URL}" alt="${content.About_Profile_Name}" class="owner-image">
            <div class="owner-details">
                <h3>${content.About_Profile_Name} - ${content.About_Profile_Title}</h3>
                ${content.About_Intro_HTML}
                <p><strong>Contact Information:</strong></p>
                ${content.About_Contact_Info_HTML}
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
    document.getElementById('cart-count').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is currently empty.</p>';
        // Reset totals
        return;
    }
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <span>${item.name} (x${item.quantity})</span>
            <span>RM ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    // Update totals logic here
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    if (hide) {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
        updateCartDisplay();
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
        const response = await fetch(googleScriptURL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);
        statusEl.textContent = 'Your enquiry has been sent successfully!';
        event.target.reset();
    } catch (error) {
        statusEl.textContent = 'An error occurred. Please try again.';
        console.error('Enquiry error:', error);
    }
}

// ... Add other functions like showTab, checkout, etc.
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}
