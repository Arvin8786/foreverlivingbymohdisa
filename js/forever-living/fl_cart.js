// =================================================================
// Forever Living Cart Module - v19.3 (Definitive Final & Complete)
// Handles all shopping cart and checkout logic for the FL business.
// =================================================================

let fl_cart = [];
let fl_shippingRules = {}; // Will be populated by main.js

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = fl_cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        fl_cart.push({ ...product, quantity: 1 });
    }
    updateCartDisplay();
}

function increaseQuantity(productId) {
    const item = fl_cart.find(i => i.id === productId);
    if (item) { item.quantity++; }
    updateCartDisplay();
}

function decreaseQuantity(productId) {
    const item = fl_cart.find(i => i.id === productId);
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
    fl_cart = fl_cart.filter(item => item.id !== productId);
    updateCartDisplay();
}

function calculateCartTotals() {
    const subtotal = fl_cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let shippingFee = 14.00; // Default fallback shipping
    const defaultRule = Object.values(fl_shippingRules).find(rule => rule.isDefault);
    if (defaultRule && subtotal >= defaultRule.minSpend) {
        shippingFee = defaultRule.charge;
    }

    const total = subtotal + shippingFee;
    const totalPoints = Math.floor(subtotal); // 1 RM = 1 Point, excluding shipping

    return { subtotal, shippingFee, total, totalPoints };
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCountEl = document.getElementById('cart-count');
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const totalEl = document.getElementById('cart-total');
    const pointsEl = document.getElementById('points-earned-display');

    if (cartCountEl) {
      cartCountEl.textContent = fl_cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    if (!cartItemsContainer) return;

    if (fl_cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is currently empty.</p>';
        if(subtotalEl) subtotalEl.textContent = 'RM 0.00';
        if(shippingEl) shippingEl.textContent = 'RM 0.00';
        if(totalEl) totalEl.textContent = 'RM 0.00';
        if(pointsEl) pointsEl.innerHTML = '';
        return;
    }

    cartItemsContainer.innerHTML = fl_cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-details">
                <strong>${item.name}</strong>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity(${item.id})">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity(${item.id})">+</button>
                </div>
            </div>
            <div style="text-align:right">RM ${(item.price * item.quantity).toFixed(2)}</div>
            <button class="remove-item-btn" onclick="removeItemFromCart(${item.id})">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
    
    const { subtotal, shippingFee, total, totalPoints } = calculateCartTotals();
    
    if(subtotalEl) subtotalEl.textContent = `RM ${subtotal.toFixed(2)}`;
    if(shippingEl) shippingEl.textContent = `RM ${shippingFee.toFixed(2)}`;
    if(totalEl) totalEl.textContent = `RM ${total.toFixed(2)}`;
    if(pointsEl) pointsEl.innerHTML = `<div class="points-earned"><i class="fa-solid fa-star"></i> Points to be Earned: ${totalPoints}</div>`;
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.style.display = hide ? 'none' : 'flex';
        if (!hide) {
            // Ensure all views are correctly shown/hidden
            const cartView = document.getElementById('cart-view');
            const paymentView = document.getElementById('payment-options-view');
            const uploadView = document.getElementById('upload-proof-view');
            if (cartView) cartView.style.display = 'block';
            if (paymentView) paymentView.style.display = 'none';
            if (uploadView) uploadView.style.display = 'none';
            updateCartDisplay();
        }
    }
}

function initiateCheckout() {
    if (fl_cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const consent = document.getElementById('consent-checkbox').checked;

    if (!name || !phone || !email || !address) {
        alert('Please fill in all customer and shipping information.');
        return;
    }
    if (!consent) {
        alert('You must consent to the data collection policy to proceed.');
        return;
    }

    document.getElementById('cart-view').style.display = 'none';
    document.getElementById('payment-options-view').style.display = 'block';
}

function proceedToUpload() {
    document.getElementById('payment-options-view').style.display = 'none';
    document.getElementById('upload-proof-view').style.display = 'block';
}

async function uploadProof() {
    const statusEl = document.getElementById('upload-status');
    const fileInput = document.getElementById('payment-proof-upload');
    const file = fileInput.files[0];

    if (!file) {
        statusEl.textContent = 'Please select a payment proof file to upload.';
        statusEl.style.color = 'red';
        return;
    }

    statusEl.textContent = 'Submitting order...';
    statusEl.style.color = 'blue';
    document.getElementById('upload-proof-btn').disabled = true;

    const totals = calculateCartTotals();
    const orderData = {
        customerName: document.getElementById('customer-name').value.trim(),
        customerPhone: document.getElementById('customer-phone').value.trim(),
        customerEmail: document.getElementById('customer-email').value.trim(),
        customerAddress: document.getElementById('customer-address').value.trim(),
        cart: fl_cart,
        itemsPurchased: fl_cart.map(item => `${item.name} (x${item.quantity})`).join('; '),
        totalAmount: totals.total.toFixed(2),
        shippingFee: totals.shippingFee.toFixed(2),
        totalPointsForThisPurchase: totals.totalPoints,
    };

    try {
        const base64File = await getBase64(file);
        const payload = {
            action: 'logInitialOrder',
            data: {
                ...orderData,
                paymentProofFile: base64File.split(',')[1],
                paymentProofMimeType: file.type,
                paymentProofFileName: file.name
            }
        };

        const result = await postDataToGScript(payload);

        const uploadView = document.getElementById('upload-proof-view');
        uploadView.innerHTML = `
            <div style="text-align: center;">
                <h3 style="color: var(--accent-color);">Order Submitted Successfully!</h3>
                <p>Your order has been logged. You will receive a notification once payment is verified.</p>
                <a href="${result.proformaUrl}" class="btn btn-primary" target="_blank" style="margin-top: 15px;">Download Proforma Invoice</a>
            </div>`;
        
        // Reset cart
        fl_cart = [];
        setTimeout(() => {
            toggleCart(true);
        }, 10000);

    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = 'red';
        document.getElementById('upload-proof-btn').disabled = false;
    }
}

function cancelCheckout() {
    // Simply close the cart, data is not saved yet
    toggleCart(true);
}
