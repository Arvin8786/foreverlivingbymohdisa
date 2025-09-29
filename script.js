const googleScriptURL = 'https://script.google.com/macros/s/AKfycbysamg2i7-1PKBgXqk_CWECNpCwfO-ImjcmWbPcvyvGSxm1NTOX7l1gAJoIf82iexBS/exec';
let products = []; let cart = []; let activeFestival = null; let activePromotions = [];
let shippingRules = {}; let availableDiscountCodes = {}; let appliedDiscount = null;

document.addEventListener('DOMContentLoaded', fetchData);

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
            productListContainer.innerHTML = `<p style="text-align: center; color: red; font-weight: bold; width: 100%; padding: 40px 0;"><i class="fa-solid fa-triangle-exclamation"></i> Error loading store.<br>Could not retrieve catalog. Please try again later.</p>`;
        }
    }
    document.getElementById('update-timestamp').textContent = `${new Date().toLocaleDateString('en-GB')} (v18.2)`;
    if (sessionStorage.getItem('pendingOrder')) { 
        toggleCart(); 
    } 
    else { showTab('products'); }
}

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
        banner.style.backgroundColor = 'var(--primary-color)';
        banner.style.color = 'white';
        banner.style.display = 'block';
    } else if (activePromotions.length > 0) {
        const promoNames = activePromotions.map(p => p.description).join(' | ');
        bannerTextEl.textContent = `✨ ONGOING PROMOTIONS: ${promoNames} ✨`;
        banner.style.backgroundColor = 'var(--accent-color)';
        banner.style.color = 'white';
        banner.style.display = 'block';
    }
    renderProducts();
}

function renderProducts(){
    const productListContainer = document.getElementById("product-list-container"); if (!productListContainer) return;
    if (products.length === 0) { productListContainer.innerHTML = `<p style="text-align: center; width: 100%;">No products found in the catalog.</p>`; return; }
    let html = ""; let displayedProductIds = new Set();
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
    const itemPromo = activePromotions.find(p => p.productIDs.includes(product.id));
    let promoDescriptionHTML = '';
    if (itemPromo && itemPromo.type === 'BUNDLE') {
        promoDescriptionHTML = `<p class="promo-description">${itemPromo.description}</p>`;
    }
    return `
        <div class="product ${itemPromo ? 'promo-highlight' : ''}">
            <div class="halal-badge">HALAL</div>
            ${itemPromo ? '<div class="featured-badge">On Offer!</div>' : ''}
            <div class="product-image-container">
                <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/200x200?text=Image+Not+Found'">
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="price-section">${priceHTML}</div>
                ${promoDescriptionHTML}
                <div class="benefits"><strong>Benefits:</strong> ${product.benefits || ''}</div>
                <div class="consumption"><strong>Usage:</strong> ${product.consumption || ''}</div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="addToCart(${product.id})"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
                </div>
            </div>
        </div>
    `;
}

function addToCart(productId) {
    const productToAdd = products.find(p => p.id === productId);
    if (!productToAdd) return;
    const existingItemInCart = cart.find(item => item.id === productId);
    if (existingItemInCart) {
        existingItemInCart.quantity++;
    } else {
        cart.push({
            id: productToAdd.id,
            name: productToAdd.name,
            basePrice: productToAdd.originalPrice || productToAdd.price,
            price: productToAdd.price,
            quantity: 1
        });
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
    let originalSubtotal = 0;
    let finalSubtotal = 0;
    let totalDiscount = 0;
    let appliedPromoDescriptions = new Set();
    let potentialShippingRuleIds = new Set();
    const finalPrices = {};

    cart.forEach(item => {
        finalPrices[item.id] = item.price;
        originalSubtotal += item.basePrice * item.quantity;
    });
    
    let tempCart = JSON.parse(JSON.stringify(cart));
    const allApplicablePromos = activePromotions.filter(promo => cart.some(item => promo.productIDs.includes(item.id)));
    const bundlePromos = allApplicablePromos.filter(p => p.type === 'BUNDLE' && p.bundle);
    const itemPromos = allApplicablePromos.filter(p => p.type === 'PERCENT' || p.type === 'FIXED');

    cart.forEach(item => {
        const itemPromo = itemPromos.find(p => p.productIDs.includes(item.id));
        if (itemPromo) {
            appliedPromoDescriptions.add(itemPromo.description);
            if (itemPromo.type === 'PERCENT') {
                finalPrices[item.id] = item.basePrice * (1 - parseFloat(itemPromo.value) / 100);
            } else if (itemPromo.type === 'FIXED') {
                finalPrices[item.id] = item.basePrice - parseFloat(itemPromo.value);
            }
        } else {
             finalPrices[item.id] = item.basePrice;
        }
    });
    
    bundlePromos.forEach(promo => {
        const eligibleItems = cart.filter(item => promo.productIDs.includes(item.id));
        const totalEligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
        const numberOfBundles = Math.floor(totalEligibleQuantity / promo.bundle.quantity);

        if (numberOfBundles > 0) {
            appliedPromoDescriptions.add(promo.description);
            if (promo.shippingRuleId) potentialShippingRuleIds.add(promo.shippingRuleId);
            let itemsToProcessForBundle = numberOfBundles * promo.bundle.quantity;
            const pricePerItemInBundle = promo.bundle.price / promo.bundle.quantity;
            
            for (const item of eligibleItems) {
                if (itemsToProcessForBundle <= 0) break;
                const quantityToBundle = Math.min(item.quantity, itemsToProcessForBundle);
                
                for(let i=0; i < quantityToBundle; i++) {
                     if (!item.priceAdjustments) item.priceAdjustments = [];
                     item.priceAdjustments.push(pricePerItemInBundle);
                }
                itemsToProcessForBundle -= quantityToBundle;
            }
        }
    });

    finalSubtotal = cart.reduce((total, item) => {
        let itemTotal = 0;
        if(item.priceAdjustments && item.priceAdjustments.length > 0) {
            const bundledQty = item.priceAdjustments.length;
            const nonBundledQty = item.quantity - bundledQty;
            itemTotal += bundledQty * item.priceAdjustments[0];
            if (nonBundledQty > 0) {
                itemTotal += nonBundledQty * finalPrices[item.id];
            }
        } else {
             itemTotal = item.quantity * finalPrices[item.id];
        }
        delete item.priceAdjustments;
        return total + itemTotal;
    }, 0);
    
    totalDiscount = originalSubtotal - finalSubtotal;

    let discountFromCode = 0;
    if (appliedDiscount) {
        if (appliedDiscount.type === 'Fixed') { discountFromCode = Math.min(finalSubtotal, parseFloat(appliedDiscount.value)); }
        else if (appliedDiscount.type === 'Percentage') { discountFromCode = finalSubtotal * (parseFloat(appliedDiscount.value) / 100); }
        finalSubtotal -= discountFromCode;
        totalDiscount += discountFromCode;
    }
    
    const shipping = calculateShipping(cart, finalSubtotal, Array.from(potentialShippingRuleIds)[0]);
    const finalTotal = finalSubtotal + shipping.fee;
    const totalPoints = Math.floor(finalSubtotal);
    return { originalSubtotal, totalDiscount, finalSubtotal, shipping, finalTotal, totalPoints, appliedPromoDescriptions: Array.from(appliedPromoDescriptions), finalPrices };
}

function updateCartDisplay() {
    const cartItemsEl = document.getElementById("cart-items");
    const subtotalEl = document.getElementById("cart-subtotal");
    const discountLineEl = document.getElementById("discount-line");
    const discountEl = document.getElementById("cart-discount");
    const shippingEl = document.getElementById("cart-shipping");
    const totalEl = document.getElementById("cart-total");
    const pointsEl = document.getElementById("points-earned-display");
    const savingsLineEl = document.getElementById("savings-line");
    const savingsEl = document.getElementById("cart-savings");
    updateCartCount();
    const oldPromoList = document.getElementById('applied-promos-list-container');
    if (oldPromoList) oldPromoList.remove();
    if (cart.length === 0) {
        cartItemsEl.innerHTML = "<p>Your cart is currently empty.</p>";
        subtotalEl.textContent = "RM 0.00";
        shippingEl.textContent = "RM 0.00";
        totalEl.textContent = "RM 0.00";
        pointsEl.innerHTML = "";
        discountLineEl.style.display = "none";
        savingsLineEl.style.display = "none";
        return;
    }
    const { originalSubtotal, totalDiscount, finalSubtotal, shipping, finalTotal, totalPoints, appliedPromoDescriptions, finalPrices } = calculateCartTotals();
    let itemsHtml = "";
    cart.forEach(item => {
        const displayPrice = finalPrices[item.id] || item.basePrice;
        const lineSubtotal = item.quantity * item.basePrice;
        let lineFinalTotal = 0;
        const itemPromo = activePromotions.find(p => p.type === 'BUNDLE' && p.bundle && p.productIDs.includes(item.id));
        if(itemPromo){
            const eligibleItemsForBundle = cart.filter(cartItem => itemPromo.productIDs.includes(cartItem.id));
            const totalEligibleQuantity = eligibleItemsForBundle.reduce((sum, i) => sum + i.quantity, 0);
            if(totalEligibleQuantity >= itemPromo.bundle.quantity){
                 const pricePerItemInBundle = itemPromo.bundle.price / itemPromo.bundle.quantity;
                 lineFinalTotal = item.quantity * pricePerItemInBundle;
            } else {
                 lineFinalTotal = item.quantity * displayPrice;
            }
        } else {
            lineFinalTotal = item.quantity * displayPrice;
        }
       
        const hasLineDiscount = lineSubtotal.toFixed(2) !== lineFinalTotal.toFixed(2);
        itemsHtml += `
        <div class="cart-item">
            <div class="cart-item-details">
                <strong>${item.name}</strong>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity(${item.id})">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity(${item.id})">+</button>
                </div>
            </div>
            <div style="text-align:right">
                ${hasLineDiscount ? `<div class="original-cart-price">RM ${lineSubtotal.toFixed(2)}</div>` : ''}
                <div class="final-cart-price">RM ${lineFinalTotal.toFixed(2)}</div>
            </div>
            <button class="remove-item-btn" onclick="removeItemFromCart(${item.id})"><i class="fa-solid fa-trash-can"></i></button>
        </div>`;
    });
    cartItemsEl.innerHTML = itemsHtml;
    subtotalEl.textContent = `RM ${originalSubtotal.toFixed(2)}`;
    if (totalDiscount > 0) {
        discountEl.textContent = `- RM ${totalDiscount.toFixed(2)}`;
        discountLineEl.style.display = "flex";
        savingsEl.textContent = `RM ${totalDiscount.toFixed(2)}`;
        savingsLineEl.style.display = "flex";
    } else {
        discountLineEl.style.display = "none";
        savingsLineEl.style.display = "none";
    }
    if (appliedPromoDescriptions.length > 0) {
        let promoListHTML = appliedPromoDescriptions.map(desc => `<li><small>${desc}</small></li>`).join('');
        const promoListContainerHTML = `<div class="summary-line" id="applied-promos-list-container" style="font-size: 0.9em; color: #555;"><span>Applied Promotions:</span><ul style="padding-left: 15px; margin: 0; text-align: right; list-style-type: none;">${promoListHTML}</ul></div>`;
        shippingEl.parentElement.insertAdjacentHTML('beforebegin', promoListContainerHTML);
    }
    shippingEl.innerHTML = shipping.message === "FREE" ? `<span style="color:var(--accent-color);font-weight:700"><i class="fa-solid fa-truck-fast"></i> FREE! <small>(${shipping.reason || ''})</small></span>` : `RM ${shipping.fee.toFixed(2)}`;
    totalEl.textContent = `RM ${finalTotal.toFixed(2)}`;
    pointsEl.innerHTML = `<div class="points-earned"><i class="fa-solid fa-star"></i> Points to be Earned: ${totalPoints}</div>`;
}

function calculateShipping(currentCart, totalAfterDiscounts, promoShippingRuleId) {
    if (currentCart.length === 0) return { fee: 0, message: "RM 0.00" };
    let applicableRule = null;
    if (promoShippingRuleId && shippingRules[promoShippingRuleId]) {
        const promoRule = shippingRules[promoShippingRuleId];
        if (totalAfterDiscounts >= promoRule.minSpend) {
            applicableRule = { ...promoRule, reason: "Promotion Applied" };
        }
    }
    if (!applicableRule && appliedDiscount && appliedDiscount.type === 'FreeShipping') {
         applicableRule = { type: 'Free', charge: 0, reason: "Discount Code" };
    }
    if (!applicableRule) {
        const defaultRules = Object.values(shippingRules).filter(rule => rule.isDefault);
        for (const rule of defaultRules) {
            if (totalAfterDiscounts >= rule.minSpend && totalAfterDiscounts <= rule.maxSpend) {
                applicableRule = { ...rule, reason: `Order total is RM ${totalAfterDiscounts.toFixed(2)}`};
                break;
            }
        }
    }
    if (!applicableRule) return { fee: 14, message: "RM 14.00 (Default)" };
    const charge = parseFloat(applicableRule.charge) || 0;
    let message = `RM ${charge.toFixed(2)}`;
    if (charge === 0) message = "FREE";
    return { fee: charge, message: message, reason: applicableRule.reason };
}

function initiateCheckout() {
    if (!document.getElementById('consent-checkbox').checked) { alert("You must agree to the data collection consent before proceeding."); return; }
    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const customerEmail = document.getElementById('customer-email').value.trim();
    const address1 = document.getElementById('customer-address1').value.trim();
    const address2 = document.getElementById('customer-address2').value.trim();
    const city = document.getElementById('customer-city').value.trim();
    const state = document.getElementById('customer-state').value.trim();
    const postcode = document.getElementById('customer-postcode').value.trim();
    if (!customerName || !customerPhone || !customerEmail || !address1 || !city || !state || !postcode) { alert("Please fill in all required customer and shipping information fields."); return; }
    if (cart.length === 0) { alert("Your cart is empty."); return; }
    
    const totals = calculateCartTotals();
    const fullAddress = `${address1}, ${address2 ? address2 + ", " : ""}${postcode} ${city}, ${state}.`;
    
    const orderData = {
        customerName, customerPhone, customerEmail, customerAddress: fullAddress,
        cart: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, finalPrice: totals.finalPrices[item.id] || item.basePrice })),
        itemsPurchased: cart.map(item => `${item.name} (x${item.quantity})`).join('; '),
        totalAmount: totals.finalTotal.toFixed(2),
        shippingFee: totals.shipping.fee.toFixed(2),
        discountApplied: `Total Discount - RM ${totals.totalDiscount.toFixed(2)}`,
        discountCodeUsed: appliedDiscount ? appliedDiscount.code : "N/A",
        totalPointsForThisPurchase: totals.totalPoints,
        appliedPromotions: Array.from(totals.appliedPromoDescriptions)
    };
    sessionStorage.setItem("pendingOrder", JSON.stringify(orderData));
    
    let waMessage = `Hi, I would like to place an order:\n\n*Customer Details:*\nName: ${customerName}\nPhone: ${customerPhone}\nEmail: ${customerEmail}\nAddress: ${fullAddress}\n\n--- ORDER SUMMARY ---\nSubtotal: RM ${totals.originalSubtotal.toFixed(2)}\nDiscount: - RM ${totals.totalDiscount.toFixed(2)}\nShipping: ${totals.shipping.message}\n*TOTAL: RM ${totals.finalTotal.toFixed(2)}*\n\nPlease provide payment details. Thank you!`;
    window.open(`https://wa.me/601111033154?text=${encodeURIComponent(waMessage)}`, "_blank");

    document.getElementById('cart-view').style.display = 'none';
    document.getElementById('verification-view').style.display = 'block';
    updateVerificationUI();
}

async function uploadProof() {
    const fileInput = document.getElementById('payment-proof-upload');
    const statusEl = document.getElementById('upload-status');
    const uploadBtn = document.getElementById('upload-proof-btn');
    const file = fileInput.files[0];
    let pendingOrder = JSON.parse(sessionStorage.getItem("pendingOrder"));
    if (!file) { statusEl.textContent = "Please select a file to upload."; statusEl.style.color = "red"; return; }
    if (!pendingOrder) { statusEl.textContent = "Error: No pending order found. Please refresh."; statusEl.style.color = "red"; return; }
    uploadBtn.disabled = true;
    statusEl.textContent = "Uploading...";
    statusEl.style.color = "blue";
    try {
        const base64File = await getBase64(file);
        const payload = {
            action: "logInitialOrderWithProof",
            ...pendingOrder,
            paymentProofFile: base64File.split(",")[1], 
            paymentProofMimeType: file.type,
            paymentProofFileName: `${pendingOrder.customerEmail.split("@")[0]}-${Date.now()}`
        };
        const response = await fetch(googleScriptURL, { method: "POST", body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === 'success') {
            statusEl.textContent = "Proof uploaded successfully!"; statusEl.style.color = "green";
            pendingOrder.proofUploaded = true;
            sessionStorage.setItem("pendingOrder", JSON.stringify(pendingOrder));
            updateVerificationUI();
        } else { throw new Error(result.message || 'Unknown server error'); }
    } catch (error) {
        statusEl.textContent = `Upload Error: ${error.message}`;
        statusEl.style.color = "red";
        uploadBtn.disabled = false;
    }
}

async function finalizeOrder(){
    const codeInput = document.getElementById("verification-code").value.trim().toUpperCase();
    const finalizeBtn = document.getElementById("finalize-order-btn");
    const statusEl = document.getElementById("verification-status");
    let pendingOrder = JSON.parse(sessionStorage.getItem("pendingOrder"));
    if (!codeInput) { statusEl.textContent = "Please enter the verification code."; statusEl.style.color = "red"; return; }
    if (!pendingOrder) { statusEl.textContent = "Error: No pending order found."; statusEl.style.color = "red"; return; }
    finalizeBtn.disabled = true;
    statusEl.textContent = "Verifying...";
    statusEl.style.color = "blue";
    try {
        const payload = { action: "finalizeOrder", usedCode: codeInput, ...pendingOrder };
        const response = await fetch(googleScriptURL, { method: "POST", body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status !== 'success') { throw new Error(result.message); }
        handleSuccessfulFinalization(result.receiptUrl);
    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = "red";
        finalizeBtn.disabled = false;
    }
}

function handleSuccessfulFinalization(receiptUrl) {
    const statusEl = document.getElementById("verification-status");
    statusEl.innerHTML = `Order Verified!<br><br><a href="${receiptUrl}" class="btn btn-primary" style="text-decoration:none;" target="_blank">Click Here to Download Receipt</a>`;
    statusEl.style.color = "green";
    cart = []; sessionStorage.removeItem("pendingOrder"); updateCartDisplay(); appliedDiscount = null;
    document.getElementById("discount-code-input").value = "";
    document.getElementById("discount-status").textContent = "";
    setTimeout(() => {
        toggleCart(true);
        updateVerificationUI(true);
    }, 15000); 
}

function updateVerificationUI(reset = false) {
    const proofStep = document.getElementById('proof-upload-step'), codeStep = document.getElementById('code-verification-step');
    const uploadBtn = document.getElementById('upload-proof-btn'), finalizeBtn = document.getElementById('finalize-order-btn');
    const codeInput = document.getElementById('verification-code'), uploadStatus = document.getElementById('upload-status'), verifyStatus = document.getElementById('verification-status');
    if (reset) {
        proofStep.classList.add('active'); proofStep.classList.remove('completed'); codeStep.classList.remove('active');
        uploadBtn.disabled = false; finalizeBtn.disabled = true; codeInput.disabled = true;
        uploadStatus.textContent = ""; verifyStatus.innerHTML = "";
        document.getElementById('payment-proof-upload').value = ""; codeInput.value = ""; return;
    }
    const pendingOrder = JSON.parse(sessionStorage.getItem("pendingOrder"));
    if (pendingOrder && pendingOrder.proofUploaded) {
        proofStep.classList.remove('active'); proofStep.classList.add('completed'); codeStep.classList.add('active');
        uploadBtn.disabled = true; finalizeBtn.disabled = false; codeInput.disabled = false;
        uploadStatus.textContent = "Proof Uploaded Successfully!"; uploadStatus.style.color = "green";
    } else {
        proofStep.classList.add('active'); proofStep.classList.remove('completed'); codeStep.classList.remove('active');
        uploadBtn.disabled = false; finalizeBtn.disabled = true; codeInput.disabled = true;
    }
}

function cancelVerification(){if(confirm("Are you sure? This will cancel the pending order.")){sessionStorage.removeItem("pendingOrder"),toggleCart(!0),updateVerificationUI(!0)}}
function toggleCart(t=!1){const e=document.getElementById("cart-modal");if(t)return void(e.style.display="none");"flex"===e.style.display?e.style.display="none":(e.style.display="flex",JSON.parse(sessionStorage.getItem("pendingOrder"))?(document.getElementById("cart-view").style.display="none",document.getElementById("verification-view").style.display="block",updateVerificationUI()):(document.getElementById("cart-view").style.display="block",document.getElementById("verification-view").style.display="none",updateCartDisplay(),updateVerificationUI(!0)))}
function getBase64(t){return new Promise((e,o)=>{const n=new FileReader;n.readAsDataURL(t),n.onload=()=>e(n.result),n.onerror=t=>o(t)})}
function filterProducts(){const t=document.getElementById("product-search").value.toLowerCase();document.querySelectorAll(".product-list").forEach(e=>{let o=!1;e.querySelectorAll(".product").forEach(e=>{e.querySelector("h3").textContent.toLowerCase().includes(t)?(e.style.display="flex",o=!0):e.style.display="none"});const n=e.closest(".promo-section");n&&(n.style.display=o?"block":"none")})}
function suggestProduct(){const t=document.getElementById("symptom-input").value.toLowerCase().trim(),e=document.getElementById("suggestion-result");if(!t)return void(e.innerHTML='<p style="color:red">Please enter a symptom or health concern.</p>');const o={'digestion':{keywords:['digestion','stomach','tummy','bloated','indigestion','constipation'],ids:[1,2,3,7,11,18]},'immune':{keywords:['immune','sick','flu','cold','cough','fever','infection'],ids:[1,2,14,15,17]},'energy':{keywords:['energy','tired','fatigue','stamina','lethargic','weak'],ids:[12,13,15,8]},'weight':{keywords:['weight','diet','slim','lose weight','kurus'],ids:[4,5,6,7]},'skin':{keywords:['skin','dry','acne','eczema','sunburn','aging','wrinkles','kulit'],ids:[30,32,29,39,52,24,21,22,31,38,41]},'joint':{keywords:['joint','muscle','pain','sore','arthritis','sakit','otot'],ids:[34,16,33]},'heart':{keywords:['heart','cholesterol','blood pressure','jantung'],ids:[16]},'bone':{keywords:['bone','calcium','osteoporosis','tulang'],ids:[19]},'headache':{keywords:['headache','migraine','pening','sakit kepala'],ids:[33]}},n=new Set,i=t.split(" ");i.forEach(t=>{for(const e in o)o[e].keywords.includes(t)&&o[e].ids.forEach(t=>n.add(t))}),n.size>0?(e.innerHTML="<h4>Based on your concern, we suggest:</h4>",[...n].slice(0,3).forEach(t=>{const n=products.find(e=>e.id===t);let i=n.price;const r=activePromotions.find(e=>e.productIDs.includes(t));"PERCENT"===r?.type?i*=(1-parseFloat(r.value)/100):"FIXED"===r?.type&&(i-=parseFloat(r.value)),e.innerHTML+=`<div class="suggestion-product"><span><strong>${n.name}</strong> - ${n.benefits.split(",")[0]}</span><button class="btn btn-primary" style="width:auto;padding:8px 15px" onclick="addToCart(${n.id});toggleCart()">Add</button></div>`})):(e.innerHTML="<p>We could not find a specific match. Try searching for products directly.</p>")}
function sendFeedbackEmail(t){t.preventDefault();const e=document.getElementById("feedback-submit-btn"),o=document.getElementById("feedback-status");if("YOUR_SERVICE_ID"==='YOUR_SERVICE_ID'||"YOUR_TEMPLATE_ID"==='YOUR_TEMPLATE_ID')return o.textContent="Feedback form is not configured. Please contact the owner directly.",void(o.style.color="orange");e.disabled=!0,o.textContent="Sending...",o.style.color="blue"}
function toggleCheckoutButton() { document.getElementById('checkout-btn').disabled = !document.getElementById('consent-checkbox').checked; }
function showTab(tabId) { document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active')); const tab = document.getElementById(tabId); if (tab) tab.classList.add('active'); }
