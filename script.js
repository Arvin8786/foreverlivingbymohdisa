// =================================================================
// E-Shop Frontend Script - v17.4 (Definitive Final with Chatbot Logic)
// =================================================================

const googleScriptURL = 'https://script.google.com/macros/s/AKfycbw9Z4FICzQDvy8ijD_7KVUISiLpgiQ5-dmvc_VbWmswgCDzgl08iVNGTC-kDSRSwJaKSQ/exec';
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';

let products = [];
let cart = [];
let chatSession = { state: 'main_menu' };

document.addEventListener('DOMContentLoaded', fetchData);

async function fetchData() {
    try {
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown backend error');

        products = data.products || [];
        renderProducts(products);
        renderAboutUs(data.aboutUsContent);
        renderJobs(data.jobsListings);
        renderHomepageContent(data.aboutUsContent, data.jobsListings, data.testimonies);
        buildEnquiryForm();
        buildCartModal();
        buildJobApplicationModal();
        
        document.getElementById('update-timestamp').textContent = `v17.4`;
        
        const chatInput = document.getElementById('chat-input');
        const chatSendBtn = document.getElementById('chat-send-btn');
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', handleChatSubmit);
            chatInput.addEventListener('keyup', (event) => { if (event.key === "Enter") handleChatSubmit(); });
        }
        showTab('homepage');

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        const productContainer = document.getElementById('product-list-container');
        if(productContainer) productContainer.innerHTML = `<p style="text-align: center; color: red; font-weight: bold;">Error loading store. Please try again later.</p>`;
    }
}

function renderHomepageContent(about, jobs, testimonies) {
    if (!about) return;
    const heroContainer = document.getElementById('homepage-hero');
    if (heroContainer) {
        heroContainer.innerHTML = `<h2>${about.CompanyName || 'Welcome'}</h2><p>${about.Slogan || 'High-quality wellness products'}</p>`;
    }
    const whyChooseUsContainer = document.getElementById('why-choose-us');
    if (whyChooseUsContainer) {
        whyChooseUsContainer.innerHTML = `<h2>${about.WhyChooseUs_Title}</h2><div class="why-choose-us-grid"><div><i class="${about.Point1_Icon}"></i><p>${about.Point1_Text}</p></div><div><i class="${about.Point2_Icon}"></i><p>${about.Point2_Text}</p></div><div><i class="${about.Point3_Icon}"></i><p>${about.Point3_Text}</p></div></div>`;
    }
    const videosContainer = document.getElementById('youtube-videos-container');
    const videoUrls = about.YoutubeURL ? about.YoutubeURL.split(',').map(url => url.trim()) : [];
    if (videoUrls.length > 0) {
        videosContainer.innerHTML = videoUrls.map(url => {
            try {
                const videoId = new URL(url).searchParams.get('v');
                if (videoId) return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
            } catch(e) {}
            return '';
        }).join('');
    } else {
        document.getElementById('youtube-videos').style.display = 'none';
    }
    const testimoniesContainer = document.getElementById('testimonies-container');
    if (testimonies && testimonies.length > 0) {
        testimoniesContainer.innerHTML = testimonies.map(t => {
            let stars = '';
            for (let i = 0; i < 5; i++) { stars += `<i class="fa-solid fa-star" style="color: ${i < t.Rating ? 'var(--secondary-color)' : '#ccc'}"></i>`; }
            return `<div class="testimony-card"><div class="testimony-header"><img src="${t.Customer_Image_URL}" alt="${t.Customer_Name}" class="testimony-img"><div><h4>${t.Customer_Name}</h4><div class="testimony-rating">${stars}</div></div></div><p>"${t.Testimony_Text}"</p></div>`;
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
    container.innerHTML = productsToRender.map(p => `<div class="product"><div class="product-image-container"><img src="${p.image}" alt="${p.name}"></div><div class="product-info"><h3>${p.name}</h3><div class="price-section"><span class="new-price">RM ${p.price.toFixed(2)}</span></div><div class="product-actions"><button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button></div></div></div>`).join('');
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!content) { container.innerHTML = '<p>About information is unavailable.</p>'; return; }
    container.innerHTML = `<h2>About ${content.CompanyName}</h2><div class="owner-profile"><div class="owner-details"><h3>${content.Owner} - ${content.Role}</h3><div>${content.MoreDetails}</div><hr><h4>Our Mission</h4><p>${content.OurMission}</p><h4>Our Vision</h4><p>${content.OurVision}</p></div></div>`;
}

function renderJobs(jobs) {
    const container = document.getElementById('job-listings-container');
    if (!jobs || jobs.length === 0) {
        container.innerHTML = '<p>There are currently no open positions.</p>';
        return;
    }
    container.innerHTML = jobs.map(job => `<div class="job-listing"><h3>${job.position}</h3><p><strong>Location:</strong> ${job.location} | <strong>Type:</strong> ${job.type}</p><div>${job.description}</div><button class="btn btn-primary" onclick="toggleJobModal(true, '${job.jobId}', '${job.position}')">Apply Now</button></div>`).join('');
}

function buildEnquiryForm() {
    const container = document.getElementById('enquiries-form-content');
    container.innerHTML = `<form id="enquiry-form" class="enquiry-form"><input type="text" id="enquiry-name" placeholder="Your Full Name" required><input type="email" id="enquiry-email" placeholder="Your Email Address" required><input type="tel" id="enquiry-phone" placeholder="Your Phone Number" required><select id="enquiry-type" required><option value="" disabled selected>Select Enquiry Type...</option><option value="General Question">General</option><option value="Product Support">Product</option></select><textarea id="enquiry-message" placeholder="Your Message" rows="6" required></textarea><button type="submit" class="btn btn-primary">Submit</button><p id="enquiry-status"></p></form>`;
    document.getElementById('enquiry-form').addEventListener('submit', handleEnquirySubmit);
}

function buildCartModal() {
    const container = document.getElementById('cart-modal');
    container.innerHTML = `<div class="modal-content"><span class="close" onclick="toggleCart(true)">&times;</span><h2>Your Cart</h2><div id="cart-items"><p>Your cart is empty.</p></div><div class="cart-summary"><div class="summary-line"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div><div class="summary-line"><span>Shipping</span><span id="cart-shipping">RM 0.00</span></div><div class="summary-line total"><span>Total</span><span id="cart-total">RM 0.00</span></div></div><div class="customer-info-form"><h3>Customer Info</h3><input type="text" id="customer-name" placeholder="Full Name" required><input type="tel" id="customer-phone" placeholder="WhatsApp Number" required><input type="email" id="customer-email" placeholder="Email" required><textarea id="customer-address" placeholder="Address" rows="4" required></textarea></div><button class="btn btn-primary" onclick="initiateCheckout()">Complete Order</button></div>`;
}

function buildJobApplicationModal() {
    const container = document.getElementById('job-application-modal');
    container.innerHTML = `<div class="modal-content"><span class="close" onclick="toggleJobModal(false)">&times;</span><h2>Apply for <span id="job-modal-title"></span></h2><form id="job-application-form" class="enquiry-form"><input type="hidden" id="job-id-input"><input type="hidden" id="job-position-input"><input type="text" id="applicant-name" placeholder="Full Name" required><input type="email" id="applicant-email" placeholder="Email" required><input type="tel" id="applicant-phone" placeholder="Phone" required><input type="text" id="applicant-citizenship" placeholder="Citizenship" required><textarea id="applicant-message" placeholder="Tell us about yourself" rows="4"></textarea><label for="applicant-resume">Upload Resume (Mandatory)</label><input type="file" id="applicant-resume" required><button type="submit" class="btn btn-primary">Submit</button><p id="job-application-status"></p></form></div>`;
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
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
        return;
    }
    cartItemsContainer.innerHTML = cart.map(item => `<div class="cart-item"><span>${item.name} (x${item.quantity})</span><span>RM ${(item.price * item.quantity).toFixed(2)}</span></div>`).join('');
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    modal.style.display = hide ? 'none' : 'flex';
    if (!hide) updateCartDisplay();
}

function toggleJobModal(show = false, jobId = '', jobTitle = '') {
    const modal = document.getElementById('job-application-modal');
    if (show) {
        document.getElementById('job-modal-title').textContent = jobTitle;
        document.getElementById('job-id-input').value = jobId;
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

async function handleEnquirySubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('enquiry-status');
    statusEl.textContent = 'Sending...';
    try {
        const payload = { action: 'logEnquiry', data: { name: document.getElementById('enquiry-name').value, email: document.getElementById('enquiry-email').value, phone: document.getElementById('enquiry-phone').value, type: document.getElementById('enquiry-type').value, message: document.getElementById('enquiry-message').value } };
        await fetch(googleScriptURL, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
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
        await fetch(googleScriptURL, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
        statusEl.textContent = 'Application submitted successfully!';
        setTimeout(() => { toggleJobModal(false); }, 3000);
    } catch (error) {
        statusEl.textContent = 'An error occurred.';
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

function initiateCheckout() {
    alert('Checkout feature is under development.');
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// =================================================================
// CHATBOT LOGIC - FULLY RESTORED
// =================================================================

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

function addChatMessage(sender, text, type = 'text') {
    const chatBody = document.getElementById('chat-body');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', sender === 'bot' ? 'bot-message' : 'user-message');
    if (type === 'html') {
        messageDiv.innerHTML = text;
    } else {
        messageDiv.textContent = text;
    }
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    return messageDiv;
}

function displayMainMenu() {
    chatSession.state = 'main_menu';
    const menuText = `<strong>Welcome! How can I help?</strong><br><br>1. My Account (Orders & Points)<br>2. Talk to a Human<br><br>Or, ask me a question about our products!`;
    addChatMessage('bot', menuText, 'html');
}

async function handleChatSubmit() {
    const chatInput = document.getElementById('chat-input');
    const userInput = chatInput.value.trim();
    if (!userInput) return;
    addChatMessage('user', userInput);
    chatInput.value = '';
    chatInput.disabled = true;
    const thinkingMsg = addChatMessage('bot', '<i>Thinking...</i>', 'html');

    try {
        if (chatSession.state === 'awaiting_identifier') { await startVerification(userInput); }
        else if (chatSession.state === 'awaiting_code') { await submitVerificationCode(userInput); }
        else if (chatSession.state === 'my_account_menu') { await handleMyAccountMenu(userInput); }
        else { await handleMainMenu(userInput); }
    } finally {
        thinkingMsg.remove();
        chatInput.disabled = false;
        chatInput.focus();
    }
}

async function handleMainMenu(userInput) {
    if (userInput === '1') {
        if (sessionStorage.getItem('eshop_session_token')) {
            displayMyAccountMenu();
        } else {
            chatSession.state = 'awaiting_identifier';
            addChatMessage('bot', 'To access your account, please enter your PAC or registered Email address.');
        }
    } else if (userInput === '2') {
        addChatMessage('bot', 'To speak with our admin, please click the link below to contact them directly on WhatsApp:');
        addChatMessage('bot', '<a href="https://wa.me/601111033154" target="_blank">Contact Admin on WhatsApp</a>', 'html');
        setTimeout(displayMainMenu, 2000);
    } else {
        try {
            const response = await fetch(botServerURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'handleUserQuery', data: { query: userInput }}) });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            addChatMessage('bot', result.answer, 'html');
        } catch (error) {
            addChatMessage('bot', `Sorry, an error occurred: ${error.message}`);
        }
    }
}

async function startVerification(identifier) {
    try {
        const response = await fetch(botServerURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'startChatVerification', data: { identifier }}) });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        chatSession.state = 'awaiting_code';
        chatSession.pac = result.pac;
        addChatMessage('bot', `A verification code has been sent to your registered WhatsApp. Please enter it here.`);
    } catch (error) {
        addChatMessage('bot', `Verification failed: ${error.message}.`);
        setTimeout(displayMainMenu, 2000);
    }
}

async function submitVerificationCode(code) {
    try {
        const response = await fetch(botServerURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verifyChatCode', data: { pac: chatSession.pac, code }}) });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        sessionStorage.setItem('eshop_session_token', result.token);
        delete chatSession.pac;
        addChatMessage('bot', '✅ Verification Successful!');
        displayMyAccountMenu();
    } catch (error) {
        addChatMessage('bot', `Verification failed: ${error.message}.`);
        setTimeout(displayMainMenu, 2000);
    }
}

function displayMyAccountMenu() {
    chatSession.state = 'my_account_menu';
    const menuText = `<strong>My Account</strong><br><br>1. View My Last 5 Orders<br>2. Check My Total Points<br>3. Back to Main Menu`;
    addChatMessage('bot', menuText, 'html');
}

async function handleMyAccountMenu(userInput) {
    let action = '';
    switch(userInput) {
        case '1': action = 'getPurchaseHistory'; break;
        case '2': action = 'getPointsHistory'; break;
        case '3': displayMainMenu(); return;
        default: addChatMessage('bot', "Invalid option."); return;
    }
    try {
        const token = sessionStorage.getItem('eshop_session_token');
        const response = await fetch(botServerURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: action, data: { token: token }}) });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        if (action === 'getPurchaseHistory') {
            let historyText = "<strong>Your Last 5 Orders:</strong><br>";
            if (result.history.length === 0) { historyText = 'You have no purchase history on record.'; }
            else { result.history.forEach(order => { historyText += `<br><strong>ID:</strong> ${order.invoiceId}<br><strong>Date:</strong> ${order.date}<br><strong>Total:</strong> RM ${order.totalAmount}<br><strong>Status:</strong> ${order.status}`; }); }
            addChatMessage('bot', historyText, 'html');
        } else if (action === 'getPointsHistory') {
            addChatMessage('bot', `Your total accumulated points balance is: <strong>${result.currentBalance}</strong>`, 'html');
        }
    } catch (error) {
        addChatMessage('bot', `Error: ${error.message}. Your session may have expired.`);
        sessionStorage.removeItem('eshop_session_token');
        setTimeout(displayMainMenu, 2000);
    }
}
