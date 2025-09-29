// =================================================================
// E-Shop Frontend Script - v17.2 (Definitive Final & Complete)
// =================================================================

const googleScriptURL = 'https://script.google.com/macros/s/AKfycbw9Z4FICzQDvy8ijD_7KVUISiLpgiQ5-dmvc_VbWmswgCDzgl08iVNGTC-kDSRSwJaKSQ/exec';
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';

let products = [];
let cart = [];
let chatSession = { state: 'main_menu' };

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        const productContainer = document.getElementById('product-list-container');
        productContainer.innerHTML = `<p class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading products...</p>`;
        
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown backend error');

        const marketing = data.marketing || {};
        if (marketing.MaintenanceMode === true) {
            document.getElementById('maintenance-message').textContent = marketing.MaintenanceMessage || "We'll be back shortly!";
            document.getElementById('maintenance-overlay').style.display = 'flex';
            return;
        }

        products = data.products || [];
        renderHomepageContent(data.aboutUsContent, data.jobsListings, data.testimonies);
        renderProducts(products);
        renderAboutUs(data.aboutUsContent);
        renderJobs(data.jobsListings);
        buildEnquiryForm();
        buildCartModal();
        buildJobApplicationModal();
        
        document.getElementById('update-timestamp').textContent = `v17.2`;
        
        const chatInput = document.getElementById('chat-input');
        const chatSendBtn = document.getElementById('chat-send-btn');
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', handleChatSubmit);
            chatInput.addEventListener('keyup', (event) => { if (event.key === "Enter") handleChatSubmit(); });
        }
        showTab('homepage');

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        document.getElementById('product-list-container').innerHTML = `<p style="color: red;">Error: Could not load store data. Please try again later.</p>`;
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

function renderHomepageContent(about, jobs, testimonies) {
    if (!about) return;
    const heroContainer = document.getElementById('homepage-hero');
    heroContainer.innerHTML = `<h2>${about.CompanyName || 'Welcome'}</h2><p>${about.Slogan || 'High-quality wellness products'}</p>`;

    const whyChooseUsContainer = document.getElementById('why-choose-us');
    whyChooseUsContainer.innerHTML = `
        <h2>${about.WhyChooseUs_Title}</h2>
        <div class="why-choose-us-grid">
            <div><i class="${about.Point1_Icon}"></i><p>${about.Point1_Text}</p></div>
            <div><i class="${about.Point2_Icon}"></i><p>${about.Point2_Text}</p></div>
            <div><i class="${about.Point3_Icon}"></i><p>${about.Point3_Text}</p></div>
        </div>`;
        
    const videosContainer = document.getElementById('youtube-videos-container');
    const videoUrls = about.YoutubeURL ? about.YoutubeURL.split(',').map(url => url.trim()) : [];
    if (videoUrls.length > 0) {
        videosContainer.innerHTML = videoUrls.map(url => {
            try {
                const videoId = new URL(url).searchParams.get('v');
                if (videoId) {
                    return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
                }
            } catch(e) { /* ignore invalid urls */ }
            return '';
        }).join('');
    } else {
        document.getElementById('youtube-videos').style.display = 'none';
    }

    const testimoniesContainer = document.getElementById('testimonies-container');
    if (testimonies && testimonies.length > 0) {
        testimoniesContainer.innerHTML = testimonies.map(t => {
            let stars = '';
            for (let i = 0; i < 5; i++) {
                stars += `<i class="fa-solid fa-star" style="color: ${i < t.Rating ? 'var(--secondary-color)' : '#ccc'}"></i>`;
            }
            return `
                <div class="testimony-card">
                    <div class="testimony-header">
                        <img src="${t.Customer_Image_URL}" alt="${t.Customer_Name}" class="testimony-img">
                        <div>
                            <h4>${t.Customer_Name}</h4>
                            <div class="testimony-rating">${stars}</div>
                        </div>
                    </div>
                    <p>"${t.Testimony_Text}"</p>
                </div>`;
        }).join('');
    } else {
        document.getElementById('homepage-testimonies').style.display = 'none';
    }

    const featuredJobsContainer = document.getElementById('featured-jobs-container');
    const featuredJobs = jobs ? jobs.filter(j => j.isFeatured) : [];
    if (featuredJobs.length > 0) {
        featuredJobsContainer.innerHTML = featuredJobs.map(job => `<div class="job-listing-summary"><h4>${job.position}</h4><p>${job.location} | ${job.type}</p></div>`).join('');
    } else {
        document.getElementById('homepage-featured-jobs').style.display = 'none';
    }
}

function renderProducts(productsToRender) {
    const container = document.getElementById('product-list-container');
    if (!productsToRender || productsToRender.length === 0) {
        container.innerHTML = `<p>No products available.</p>`;
        return;
    }
    container.innerHTML = productsToRender.map(p => `
        <div class="product">
            <div class="product-image-container"><img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/200x200?text=Image+Not+Found'"></div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-section"><span class="new-price">RM ${p.price.toFixed(2)}</span></div>
                <div class="product-actions"><button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button></div>
            </div>
        </div>`).join('');
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!content) { container.innerHTML = '<p>About information is unavailable.</p>'; return; }
    container.innerHTML = `
        <h2>About ${content.CompanyName}</h2>
        <div class="owner-profile">
            <div class="owner-details">
                <h3>${content.Owner} - ${content.Role}</h3>
                <div>${content.MoreDetails}</div>
                <hr>
                <h4>Our Mission</h4>
                <p>${content.OurMission}</p>
                <h4>Our Vision</h4>
                <p>${content.OurVision}</p>
            </div>
        </div>`;
}

function renderJobs(jobs) {
    const container = document.getElementById('job-listings-container');
    if (!jobs || jobs.length === 0) {
        container.innerHTML = '<p>There are currently no open positions.</p>';
        return;
    }
    container.innerHTML = jobs.map(job => `
        <div class="job-listing">
            <h3>${job.position}</h3>
            <p><strong>Location:</strong> ${job.location} | <strong>Type:</strong> ${job.type}</p>
            <p><strong>Citizenship:</strong> ${job.citizenship} | <strong>Gender:</strong> ${job.gender} | <strong>Age:</strong> ${job.ageRange}</p>
            <p><strong>Salary:</strong> ${job.salary} SGD | <strong>Accommodation:</strong> ${job.accommodation}</p>
            <p><strong>Work Pattern:</strong> ${job.workDayPattern}</p>
            <div class="job-description">${job.description}</div>
            <button class="btn btn-primary" onclick="toggleJobModal(true, '${job.jobId}', '${job.position}')">Apply Now</button>
        </div>`).join('');
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

function buildCartModal() {
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
    totalEl.textContent = `RM ${subtotal.toFixed(2)}`;
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
        await fetch(googleScriptURL, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
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
        await fetch(googleScriptURL, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
        statusEl.textContent = 'Application submitted successfully!';
        statusEl.style.color = 'green';
        setTimeout(() => { toggleJobModal(false); }, 3000);
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
    alert('This feature is under development.');
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
    chatWidget.classList.toggle('active', show);
}
