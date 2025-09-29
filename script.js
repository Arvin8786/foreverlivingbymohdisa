// =================================================================
// SECTION A: E-SHOP & CHATBOT SCRIPT (NEW INTEGRATED WORKFLOW)
// =================================================================
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwYTrZkOzFob6bweHvObnY5BU1dT4g72uq0JWa2WGZVk7FgvsJslvdXNRnPHEH-SE0vcQ/exec';
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';

let products = []; let cart = []; let activeFestival = null; let activePromotions = [];
let shippingRules = {}; let availableDiscountCodes = {}; let appliedDiscount = null;

let chatSession = {
    state: 'main_menu', 
    isVerified: false,
    pac: null,
    sessionTimeout: null,
    nextState: null
};

const generalEnquiries = {
    "1": {
        question: "Shipping & Delivery",
        answer: "Shipping will be done within 2 working days. You should receive your goods within a maximum of 5 working days after the order is processed."
    },
    "2": {
        question: "Payment Methods",
        answer: "We currently accept manual payments via Maybank online transfer and Touch 'n Go eWallet. Please follow the instructions during checkout."
    },
    "3": {
        question: "Product Authenticity",
        answer: "All our products are 100% authentic and sourced directly from Forever Living Products. We guarantee the quality and genuineness of every item."
    },
    "4": {
        question: "Business Opportunity",
        answer: "We offer a rewarding business opportunity! To learn more, please click on the 'Business Opportunity' tab in the main menu or contact our admin directly via WhatsApp."
    }
};

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', handleChatSubmit);
        chatInput.addEventListener('keyup', (event) => { if (event.key === "Enter") handleChatSubmit(); });
    }
});

async function fetchData() {
    const productListContainer = document.getElementById("product-list-container");
    try {
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error(`Network response error: ${response.statusText}`);
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Failed to parse data.');
        const marketingSettings = data.marketing || {};
        if (marketingSettings.MaintenanceMode === true) {
            document.getElementById('maintenance-message').textContent = marketingSettings.MaintenanceMessage || "We'll be back shortly!";
            document.getElementById('maintenance-overlay').style.display = 'flex';
            return;
        }
        products = data.products || [];
        activeFestival = data.activeFestival || null;
        activePromotions = data.activePromotions || [];
        shippingRules = data.shippingRules || {};
        availableDiscountCodes = data.discountCodes || {};
        initializeUI(marketingSettings);
    } catch (error) {
        console.error("Error fetching store data:", error);
        if (productListContainer) {
            productListContainer.innerHTML = `<p style="text-align: center; color: red; width: 100%;"><i class="fa-solid fa-triangle-exclamation"></i> Error loading store data. Please try again later.</p>`;
        }
    }
    document.getElementById('update-timestamp').textContent = `${new Date().toLocaleDateString('en-GB')} (v10.3)`;
    showTab('products');
}

// --- Core E-Shop Functions ---
function initializeUI(marketingSettings) {
    const body = document.body;
    body.removeAttribute("data-festival");
    if (activeFestival && activeFestival.theme) {
        const themeMap = { "CNY": "cny", "NationalDay": "national-day", "MalaysiaDay": "malaysia-day", "MooncakeFestival": "mid-autumn", "Thaipusam": "thaipusam", "HariRaya": "hari-raya", "Deepavali": "deepavali", "Christmas": "christmas", "GrandOpening": "grand-opening", "NewYear": "new-year"};
        const festiveAttr = themeMap[activeFestival.theme];
        if(festiveAttr) { body.setAttribute("data-festival", festiveAttr); }
        document.getElementById('hero-title').innerHTML = `<i class="fa-solid fa-gift"></i> ${activeFestival.name}`;
        document.getElementById('hero-subtitle').textContent = "Enjoy special festive offers!";
    } else {
        document.getElementById('hero-title').innerHTML = `<i class="fa-solid fa-store"></i> Welcome to Our Store`;
        document.getElementById('hero-subtitle').textContent = "Enjoy high-quality wellness products for a healthier lifestyle.";
    }
    const banner = document.getElementById('promo-running-banner');
    const bannerTextEl = document.getElementById('promo-banner-text');
    if (marketingSettings.BannerText) {
        bannerTextEl.textContent = `🔥 ${marketingSettings.BannerText} 🔥`;
        banner.style.display = 'block';
    } else if (activePromotions.length > 0) {
        const promoNames = activePromotions.map(p => p.description).join(' | ');
        bannerTextEl.textContent = `✨ ONGOING PROMOTIONS: ${promoNames} ✨`;
        banner.style.display = 'block';
    }
    renderProducts();
}

function renderProducts(){
    const productListContainer = document.getElementById("product-list-container");
    if (!productListContainer) return;
    if (products.length === 0) {
        productListContainer.innerHTML = `<p style="text-align: center; width: 100%;">No products found in the catalog.</p>`;
        return;
    }
    let html = "";
    let displayedProductIds = new Set();
    if (activePromotions && activePromotions.length > 0) {
        activePromotions.forEach(promo => {
            const productsInPromo = products.filter(p => promo.productIDs.includes(p.id));
            if (productsInPromo.length > 0) {
                html += `<section class="promo-section"><h2>${promo.description}</h2><div class="product-list">`;
                productsInPromo.forEach(product => {
                    html += renderSingleProduct(product);
                    displayedProductIds.add(product.id);
                });
                html += `</div></section>`;
            }
        });
    }
    const remainingProducts = products.filter(p => !displayedProductIds.has(p.id));
    if (remainingProducts.length > 0) {
        html += `<section class="promo-section"><h2>All Products</h2><div class="product-list">`;
        remainingProducts.forEach(product => { html += renderSingleProduct(product); });
        html += `</div></section>`;
    }
    productListContainer.innerHTML = html;
}

function renderSingleProduct(product) {
    let priceHTML = '';
    if (product.originalPrice && product.originalPrice > product.price) {
        priceHTML = `<span class="original-price">RM ${product.originalPrice.toFixed(2)}</span><span class="new-price promo-price">RM ${product.price.toFixed(2)}</span>`;
    } else {
        priceHTML = `<span class="new-price">RM ${product.price.toFixed(2)}</span>`;
    }
    return `
        <div class="product">
            <div class="halal-badge">HALAL</div>
            <div class="product-image-container"><img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/200x200?text=Image+Not+Found'"></div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="price-section">${priceHTML}</div>
                <div class="benefits"><strong>Benefits:</strong> ${product.benefits || ''}</div>
                <div class="consumption"><strong>Usage:</strong> ${product.consumption || ''}</div>
                <div class="product-actions"><button class="btn btn-primary" onclick="addToCart(${product.id})"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button></div>
            </div>
        </div>`;
}

function addToCart(productId) {
    const productToAdd = products.find(p => p.id === productId);
    if (!productToAdd) return;
    const existingItemInCart = cart.find(item => item.id === productId);
    if (existingItemInCart) {
        existingItemInCart.quantity++;
    } else {
        const productMaster = products.find(p => p.id === productId);
        cart.push({ id: productToAdd.id, name: productToAdd.name, basePrice: productMaster.originalPrice || productMaster.price, price: productToAdd.price, quantity: 1 });
    }
    updateCartDisplay();
}

function increaseQuantity(productId) { const item = cart.find(i => i.id === productId); if (item) { item.quantity++; } updateCartDisplay(); }
function decreaseQuantity(productId) { const item = cart.find(i => i.id === productId); if (item) { item.quantity--; if (item.quantity <= 0) { removeItemFromCart(productId); } else { updateCartDisplay(); } } }
function removeItemFromCart(productId) { cart = cart.filter(item => item.id !== productId); updateCartDisplay(); }
function updateCartCount() { document.getElementById('cart-count').textContent = cart.reduce((total, item) => total + item.quantity, 0); }

function applyDiscount() {
    const input = document.getElementById("discount-code-input"); const statusEl = document.getElementById("discount-status"); const code = input.value.trim().toUpperCase();
    if (!code) { statusEl.textContent = "Please enter a code."; statusEl.style.color = "orange"; return; }
    const discountData = availableDiscountCodes[code];
    if (discountData) { appliedDiscount = { code: code, ...discountData }; statusEl.textContent = `Code "${code}" applied successfully!`; statusEl.style.color = "green"; } 
    else { appliedDiscount = null; statusEl.textContent = "Invalid or expired discount code."; statusEl.style.color = "red"; }
    updateCartDisplay();
}

function calculateCartTotals() {
    let originalSubtotal = 0, finalSubtotal = 0;
    let tempCart = JSON.parse(JSON.stringify(cart));
    tempCart.forEach(item => { const productInfo = products.find(p => p.id === item.id); item.basePrice = productInfo.originalPrice || productInfo.price; originalSubtotal += item.basePrice * item.quantity; });
    const bundlePromos = activePromotions.filter(p => p.type === 'BUNDLE' && p.bundle);
    const itemPromos = activePromotions.filter(p => p.type === 'PERCENT' || p.type === 'FIXED');
    bundlePromos.forEach(promo => {
        const eligibleItems = tempCart.filter(item => promo.productIDs.includes(item.id));
        const totalEligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
        const numberOfBundles = Math.floor(totalEligibleQuantity / promo.bundle.quantity);
        if (numberOfBundles > 0) {
            finalSubtotal += numberOfBundles * promo.bundle.price;
            let itemsToDiscount = numberOfBundles * promo.bundle.quantity;
            eligibleItems.sort((a, b) => a.basePrice - b.basePrice);
            for (const item of eligibleItems) { const discountable = Math.min(item.quantity, itemsToDiscount); item.quantity -= discountable; itemsToDiscount -= discountable; }
        }
    });
    tempCart.forEach(item => {
        if (item.quantity > 0) {
            const itemPromo = itemPromos.find(p => p.productIDs.includes(item.id));
            let unitPrice = item.basePrice;
            if (itemPromo) {
                if (itemPromo.type === 'FIXED') { unitPrice = itemPromo.value; } 
                else if (itemPromo.type === 'PERCENT') { unitPrice = unitPrice * (1 - parseFloat(itemPromo.value) / 100); }
            }
            finalSubtotal += item.quantity * unitPrice;
        }
    });
    let totalDiscount = originalSubtotal - finalSubtotal;
    if (appliedDiscount) {
        let discountFromCode = 0;
        if (appliedDiscount.type.toLowerCase() === 'fixed') { discountFromCode = Math.min(finalSubtotal, parseFloat(appliedDiscount.value)); }
        else if (appliedDiscount.type.toLowerCase() === 'percentage') { discountFromCode = finalSubtotal * (parseFloat(appliedDiscount.value) / 100); }
        finalSubtotal -= discountFromCode;
        totalDiscount += discountFromCode;
    }
    const shipping = calculateShipping(cart, finalSubtotal);
    const finalTotal = finalSubtotal + shipping.fee;
    return { originalSubtotal, totalDiscount, finalTotal, shipping, totalPoints: Math.floor(finalSubtotal) };
}

function updateCartDisplay() {
    const cartItemsEl = document.getElementById("cart-items"), subtotalEl = document.getElementById("cart-subtotal"), discountLineEl = document.getElementById("discount-line"), discountEl = document.getElementById("cart-discount"), shippingEl = document.getElementById("cart-shipping"), totalEl = document.getElementById("cart-total"), pointsEl = document.getElementById("points-earned-display"), savingsLineEl = document.getElementById("savings-line"), savingsEl = document.getElementById("cart-savings");
    updateCartCount();
    if (cart.length === 0) {
        cartItemsEl.innerHTML = "<p>Your cart is currently empty.</p>";
        subtotalEl.textContent = "RM 0.00"; shippingEl.textContent = "RM 0.00"; totalEl.textContent = "RM 0.00";
        pointsEl.innerHTML = ""; discountLineEl.style.display = "none"; savingsLineEl.style.display = "none";
        return;
    }
    const { originalSubtotal, totalDiscount, finalTotal, shipping, totalPoints } = calculateCartTotals();
    let itemsHtml = "";
    cart.forEach(item => { itemsHtml += `<div class="cart-item"><div class="cart-item-details"><strong>${item.name}</strong><div class="quantity-controls"><button class="quantity-btn" onclick="decreaseQuantity(${item.id})">-</button><span class="quantity-display">${item.quantity}</span><button class="quantity-btn" onclick="increaseQuantity(${item.id})">+</button></div></div><div style="text-align:right">RM ${item.basePrice.toFixed(2)}</div><button class="remove-item-btn" onclick="removeItemFromCart(${item.id})"><i class="fa-solid fa-trash-can"></i></button></div>`; });
    cartItemsEl.innerHTML = itemsHtml;
    subtotalEl.textContent = `RM ${originalSubtotal.toFixed(2)}`;
    if (totalDiscount > 0.01) { discountEl.textContent = `- RM ${totalDiscount.toFixed(2)}`; discountLineEl.style.display = "flex"; savingsEl.textContent = `RM ${totalDiscount.toFixed(2)}`; savingsLineEl.style.display = "flex"; } else { discountLineEl.style.display = "none"; savingsLineEl.style.display = "none"; }
    shippingEl.innerHTML = shipping.fee === 0 ? `<span style="color:var(--accent-color);font-weight:700">FREE</span>` : `RM ${shipping.fee.toFixed(2)}`;
    totalEl.textContent = `RM ${finalTotal.toFixed(2)}`;
    pointsEl.innerHTML = `<div class="points-earned"><i class="fa-solid fa-star"></i> Points to be Earned: ${totalPoints}</div>`;
}

function calculateShipping(currentCart, totalAfterDiscounts) {
    if (currentCart.length === 0) return { fee: 0 };
    let applicableRule = null;
    const defaultRules = Object.values(shippingRules).filter(rule => rule.isDefault);
    for (const rule of defaultRules) { if (totalAfterDiscounts >= rule.minSpend && totalAfterDiscounts <= rule.maxSpend) { applicableRule = rule; break; } }
    if (!applicableRule) return { fee: 14 }; // Fallback default
    return { fee: parseFloat(applicableRule.charge) || 0 };
}

// --- Simplified Checkout Flow ---
function initiateCheckout() {
    if (!document.getElementById('consent-checkbox').checked) { alert("You must agree to the data collection consent."); return; }
    if (cart.length === 0) { alert("Your cart is empty."); return; }
    const requiredFields = ['customer-name', 'customer-phone', 'customer-email', 'customer-address1', 'customer-city', 'customer-state', 'customer-postcode'];
    if (requiredFields.some(id => !document.getElementById(id).value.trim())) { alert("Please fill in all required customer and shipping fields."); return; }
    if (!document.getElementById('customer-phone').value.trim().startsWith('+')) { alert("Invalid phone number. Please include the country code (e.g., +60)."); return; }
    document.getElementById('cart-view').style.display = 'none';
    document.getElementById('payment-options-view').style.display = 'block';
}

function proceedToUpload() {
    document.getElementById('payment-options-view').style.display = 'none';
    document.getElementById('verification-view').style.display = 'block';
}

async function uploadProof() {
    const fileInput = document.getElementById('payment-proof-upload'), statusEl = document.getElementById('upload-status'), uploadBtn = document.getElementById('upload-proof-btn'), paymentMethod = document.getElementById('payment-method').value, file = fileInput.files[0];
    if (!file) { statusEl.textContent = "Please select a file to upload."; statusEl.style.color = "red"; return; }
    if (!paymentMethod) { statusEl.textContent = "Please select the payment method you used."; statusEl.style.color = "red"; return; }
    uploadBtn.disabled = true; statusEl.textContent = "Submitting order & generating proforma invoice..."; statusEl.style.color = "blue";
    const customerName = document.getElementById('customer-name').value.trim(), customerPhone = document.getElementById('customer-phone').value.trim(), customerEmail = document.getElementById('customer-email').value.trim(), address1 = document.getElementById('customer-address1').value.trim(), address2 = document.getElementById('customer-address2').value.trim(), city = document.getElementById('customer-city').value.trim(), state = document.getElementById('customer-state').value.trim(), postcode = document.getElementById('customer-postcode').value.trim();
    const totals = calculateCartTotals();
    const fullAddress = `${address1}, ${address2 ? address2 + ", " : ""}${postcode} ${city}, ${state}.`;
    try {
        const base64File = await getBase64(file);
        const payload = { action: "logInitialOrderWithProof", customerName, customerPhone, customerEmail, customerAddress: fullAddress, cart: cart, itemsPurchased: cart.map(item => `${item.name} (x${item.quantity})`).join('; '), totalAmount: totals.finalTotal.toFixed(2), shippingFee: totals.shipping.fee.toFixed(2), discountApplied: `Total Discount - RM ${totals.totalDiscount.toFixed(2)}`, discountCodeUsed: appliedDiscount ? appliedDiscount.code : "N/A", totalPointsForThisPurchase: totals.totalPoints, paymentProofFile: base64File.split(",")[1], paymentProofMimeType: file.type, paymentProofFileName: file.name };
        const response = await fetch(googleScriptURL, { method: "POST", body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === 'success' && result.proformaUrl) {
            document.getElementById('verification-view').innerHTML = `<h2 style="color:var(--accent-color);">Order Logged Successfully!</h2><p>Your order (<strong>${result.invoiceId}</strong>) has been submitted. A proforma invoice is ready for your records.</p><p>You will receive a <strong>WhatsApp notification</strong> once payment is verified and your order is processed.</p><a href="${result.proformaUrl}" class="btn btn-primary" target="_blank">Download Proforma Invoice</a><button class="btn btn-secondary" style="margin-top: 20px;" onclick="closeAndResetCart()">Close</button>`;
            cart = []; appliedDiscount = null; updateCartDisplay();
        } else { throw new Error(result.message || 'Unknown server error'); }
    } catch (error) { statusEl.textContent = `Submission Error: ${error.message}`; statusEl.style.color = "red"; uploadBtn.disabled = false; }
}

function cancelVerification(){ if(confirm("Are you sure? This will clear your cart and cancel the order process.")){ window.location.reload(); } }
function closeAndResetCart() { toggleCart(true); window.location.reload(); }

// --- Helper & UI Functions ---
function toggleCart(t=!1){const e=document.getElementById("cart-modal");if(t)return void(e.style.display="none");"flex"===e.style.display?e.style.display="none":(e.style.display="flex",e.querySelector("#cart-view").style.display="block",e.querySelector("#payment-options-view").style.display="none",e.querySelector("#verification-view").style.display="none",updateCartDisplay())}
function getBase64(t){return new Promise((e,o)=>{const n=new FileReader;n.readAsDataURL(t),n.onload=()=>e(n.result),n.onerror=t=>o(t)})}
function filterProducts(){const t=document.getElementById("product-search").value.toLowerCase();document.querySelectorAll(".product-list").forEach(e=>{let o=!1;e.querySelectorAll(".product").forEach(e=>{e.querySelector("h3").textContent.toLowerCase().includes(t)?(e.style.display="flex",o=!0):e.style.display="none"});const n=e.closest(".promo-section");n&&(n.style.display=o?"block":"none")})}
function toggleCheckoutButton() { document.getElementById('checkout-btn').disabled = !document.getElementById('consent-checkbox').checked; }
function showTab(tabId) { document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active')); const tab = document.getElementById(tabId); if (tab) tab.classList.add('active'); }

// =================================================================
// SECTION B: NEW E-SHOP CHATBOT LOGIC
// =================================================================

function toggleChatWidget(show) {
    const chatWidget = document.getElementById('eshop-chat-widget');
    const fabContainer = document.getElementById('fab-container');
    if (show) {
        chatWidget.classList.add('active');
        if(fabContainer) fabContainer.style.right = '400px'; 
        if (document.querySelectorAll('.chat-message').length === 0) { displayMainMenu(); }
    } else {
        chatWidget.classList.remove('active');
        if(fabContainer) fabContainer.style.right = '20px';
    }
}

function addChatMessage(sender, text, type = 'text') {
    const chatBody = document.getElementById('chat-body');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', sender === 'bot' ? 'bot-message' : 'user-message');
    if (type === 'html') { messageDiv.innerHTML = text; } 
    else { messageDiv.textContent = text; }
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function displayMainMenu() {
    chatSession.state = 'main_menu';
    const menuText = `<strong>Welcome to our FL eShop by Muhd Isa</strong><br><br>Please choose an option:<br>1. My Account (Orders & Points)<br>2. General Questions<br>3. Update Account<br>4. Talk to a Human`;
    addChatMessage('bot', menuText, 'html');
}

async function handleChatSubmit() {
    const chatInput = document.getElementById('chat-input');
    const userInput = chatInput.value.trim();
    if (!userInput) return;
    addChatMessage('user', userInput);
    chatInput.value = ''; chatInput.disabled = true;
    switch (chatSession.state) {
        case 'main_menu': await handleMainMenu(userInput); break;
        case 'general_questions_menu': await handleGeneralQuestions(userInput); break;
        case 'awaiting_identifier': await startVerification(userInput); break;
        case 'awaiting_code': await submitVerificationCode(userInput); break;
        case 'my_account_menu': await handleMyAccountMenu(userInput); break;
    }
    chatInput.disabled = false; chatInput.focus();
}

async function handleMainMenu(userInput) {
    switch(userInput) {
        case '1': case '3':
            if (chatSession.isVerified) {
                if (userInput === '1') displayMyAccountMenu();
                else { addChatMessage('bot', 'Update Account feature is coming soon!'); setTimeout(displayMainMenu, 1500); }
            } else {
                chatSession.state = 'awaiting_identifier';
                chatSession.nextState = (userInput === '1') ? 'my_account_menu' : 'update_account_menu';
                addChatMessage('bot', 'To access your account, please enter your PAC or registered Email address.');
            }
            break;
        case '2':
            chatSession.state = 'general_questions_menu';
            let questionsMenu = '<strong>General Questions</strong><br><br>';
            for (const key in generalEnquiries) { questionsMenu += `${key}. ${generalEnquiries[key].question}<br>`; }
            questionsMenu += '5. Back to Main Menu';
            addChatMessage('bot', questionsMenu, 'html');
            break;
        case '4':
            addChatMessage('bot', 'To speak with our admin, please click the link below to contact them directly on WhatsApp:');
            addChatMessage('bot', '<a href="https://wa.me/601111033154" target="_blank">Contact Admin on WhatsApp</a>', 'html');
            setTimeout(displayMainMenu, 2000);
            break;
        default:
            addChatMessage('bot', "Invalid option. Please type a number from the menu.");
            setTimeout(displayMainMenu, 1000);
            break;
    }
}

async function handleGeneralQuestions(userInput) {
    if (generalEnquiries[userInput]) { addChatMessage('bot', generalEnquiries[userInput].answer); } 
    else if (userInput !== '5') { addChatMessage('bot', "That's not a valid option."); }
    setTimeout(displayMainMenu, 2000);
}

async function startVerification(identifier) {
    addChatMessage('bot', '<i>Verifying identity...</i>', 'html');
    try {
        const response = await fetch(botServerURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'startChatVerification', data: { identifier }}) });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        chatSession.state = 'awaiting_code';
        chatSession.pac = result.pac;
        addChatMessage('bot', `Thank you. A 10-digit verification code has been sent to your registered WhatsApp number. Please enter it here.`);
    } catch (error) {
        addChatMessage('bot', `Verification failed: ${error.message}. Please try again.`);
        setTimeout(displayMainMenu, 2000);
    }
}

async function submitVerificationCode(code) {
    addChatMessage('bot', '<i>Checking code...</i>', 'html');
    try {
        const response = await fetch(botServerURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verifyChatCode', data: { pac: chatSession.pac, code }}) });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        chatSession.isVerified = true;
        addChatMessage('bot', '✅ Verification Successful! You are securely logged in for 15 minutes.');
        clearTimeout(chatSession.sessionTimeout);
        chatSession.sessionTimeout = setTimeout(() => {
            chatSession.isVerified = false; chatSession.pac = null;
            addChatMessage('bot', 'Your secure session has expired. Please log in again for account-related questions.');
            displayMainMenu();
        }, 15 * 60 * 1000);
        if (chatSession.nextState === 'my_account_menu') displayMyAccountMenu();
        else displayMainMenu();
    } catch (error) {
        addChatMessage('bot', `Verification failed: ${error.message}. Please try again.`);
        setTimeout(displayMainMenu, 2000);
    }
}

function displayMyAccountMenu() {
    chatSession.state = 'my_account_menu';
    const menuText = `<strong>My Account</strong><br><br>1. View My Last 5 Orders<br>2. Check My Total Points<br>3. Back to Main Menu`;
    addChatMessage('bot', menuText, 'html');
}

async function handleMyAccountMenu(userInput) {
    const lastBotMessageContainer = document.querySelector('#chat-body .bot-message:last-child');
    addChatMessage('bot', '<i>Fetching your data...</i>', 'html');
    let result = {};
    try {
        switch(userInput) {
            case '1':
                result = await fetch(botServerURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getPurchaseHistory', data: { pac: chatSession.pac }}) }).then(res => res.json());
                if (!result.success || result.history.length === 0) { addChatMessage('bot', 'You have no purchase history on record.'); } 
                else {
                    let historyText = "<strong>Your Last 5 Orders:</strong><br>";
                    result.history.forEach(order => { historyText += `<br><strong>ID:</strong> ${order.invoiceId}<br><strong>Date:</strong> ${order.date}<br><strong>Total:</strong> RM ${order.totalAmount}<br><strong>Status:</strong> ${order.status}`; });
                    addChatMessage('bot', historyText, 'html');
                }
                break;
            case '2':
                result = await fetch(botServerURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getPointsHistory', data: { pac: chatSession.pac }}) }).then(res => res.json());
                if (!result.success) { addChatMessage('bot', 'Could not retrieve your points balance.'); }
                else { addChatMessage('bot', `Your total accumulated points balance is: <strong>${result.currentBalance}</strong>`, 'html'); }
                break;
            case '3':
                displayMainMenu(); return;
            default: addChatMessage('bot', "Invalid option."); break;
        }
    } catch (error) { addChatMessage('bot', "Sorry, an error occurred while retrieving your data."); }
    
    const thinkingMsg = document.querySelector('#chat-body .bot-message:last-child');
    if (thinkingMsg && thinkingMsg.innerHTML === '<i>Fetching your data...</i>') {
        thinkingMsg.remove();
    }
    setTimeout(displayMyAccountMenu, 3000);
}
