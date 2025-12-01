<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Sales Portal</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" type="image/jpeg" href="FL.jpg">
    
    <style>
        /* ================================================================= */
        /* [ 1.0 ] CORE STYLES & VARIABLES */
        /* ================================================================= */
        :root {
            --primary-color: #1a5276; 
            --secondary-color: #f39c12; 
            --success-color: #198754; 
            --light-gray: #f4f6f8; 
            --mid-gray: #e9ecef; 
            --dark-text: #333; 
            --light-text: #fff;
            --danger-color: #dc3545;
            --border-radius-lg: 12px;
            --border-radius-sm: 8px;
            --shadow-lg: 0 10px 30px rgba(0,0,0,0.08);
            --font-family: 'Poppins', sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0;}
        
        body { font-family: var(--font-family); background: var(--light-gray); color: var(--dark-text); line-height: 1.5; }
        .container { max-width: 1300px; margin: 30px auto; padding: 0 20px; }
        h1, h2, h3 { color: var(--dark-text); font-weight: 600; }
        h2 { font-size: 1.8rem; margin-bottom: 1.5rem; }
        
        /* Buttons */
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 25px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s ease; font-size: 1rem; gap: 8px; }
        .btn-primary { background: var(--primary-color); color: var(--light-text); border-radius: 50px; box-shadow: 0 4px 10px rgba(26, 82, 118, 0.3); }
        .btn-primary:hover:not(:disabled) { background: #113a56; box-shadow: 0 6px 12px rgba(26, 82, 118, 0.4); transform: translateY(-2px); }
        .btn-secondary { background: var(--mid-gray); color: var(--dark-text); border-radius: var(--border-radius-sm); }
        .btn-secondary:hover:not(:disabled) { background: #d0d7dd; }
        .btn:disabled { background-color: #ccc !important; cursor: not-allowed !important; box-shadow: none; transform: none; }
        
        /* Cards & Form Elements */
        .card { background: var(--light-text); border-radius: var(--border-radius-lg); box-shadow: var(--shadow-lg); padding: 30px; margin-bottom: 25px; }
        .card h3 { border-bottom: 2px solid var(--mid-gray); padding-bottom: 10px; margin-bottom: 20px; }
        input, select, textarea { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: var(--border-radius-sm); font-family: inherit; font-size: 1rem; }
        .hidden { display: none !important; }

        /* [ 2.0 ] LOGIN & HEADER STYLES */
        #login-view { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #1a5276 0%, #34495e 100%); }
        #login-box { padding: 50px; max-width: 400px; text-align: center; background: #fff; border-radius: 15px; border-top: 5px solid var(--primary-color); }
        
        #portal-view header { padding: 15px 30px; display: flex; align-items: center; }
        #header-content { display: flex; flex-direction: column; align-items: flex-start; flex-grow: 1; margin-right: 20px; }
        .target-bar-container { width: 100%; max-width: 450px; margin-top: 5px; height: 20px; background-color: var(--mid-gray); border-radius: 10px; overflow: hidden; position: relative; }
        .target-progress { background: linear-gradient(90deg, #f39c12, #ffc107); height: 100%; }
        .target-text { position: absolute; width: 100%; text-align: center; font-size: 0.8rem; line-height: 20px; color: #000; font-weight: 600; }
        
        /* Navigation Bar */
        #portal-view nav { display: flex; flex-wrap: wrap; gap: 0; margin-bottom: 25px; background-color: var(--primary-color); border-radius: var(--border-radius-sm); overflow: hidden; box-shadow: 0 4px 10px rgba(26, 82, 118, 0.3); }
        #portal-view nav .btn { background: transparent; color: var(--light-text); border: none; border-radius: 0; flex-grow: 1; padding: 15px 20px; }
        #portal-view nav .btn.active { background: var(--secondary-color); color: var(--dark-text); box-shadow: none; }
        #portal-view nav .btn:hover:not(.active) { background: rgba(255, 255, 255, 0.1); }
        #portal-view nav .btn.hidden { display: none; }

        /* [ 3.0 ] ORDER CREATION & DATA TABLES */
        #order-creation-workflow { display: grid; grid-template-columns: 1fr 400px; gap: 30px; align-items: flex-start; }
        #product-selection-list { max-height: 500px; overflow-y: auto; border: 1px solid var(--mid-gray); border-radius: var(--border-radius-sm); }
        .product-item-selectable { display: grid; grid-template-columns: 60px 1fr auto; align-items: center; gap: 15px; padding: 10px; border-bottom: 1px solid var(--mid-gray); cursor: pointer; transition: background 0.1s; }
        .product-item-selectable:hover { background: #f0f8ff; }
        .product-item-selectable img { width: 50px; height: 50px; object-fit: contain; border-radius: 4px; }
        
        #summary-items-list .summary-item { display: grid; grid-template-columns: 1fr 60px 80px 30px; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px dashed var(--mid-gray); }
        .price-error-message { font-size: 0.75rem; color: var(--danger-color); font-weight: 500; }
        .price-input-invalid { border: 2px solid var(--danger-color) !important; background: #fff5f5; }
        .summary-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .summary-line.total { font-size: 1.6rem; color: var(--primary-color); font-weight: 700; margin-top: 10px; }

        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #eee; }
        th { background-color: var(--mid-gray); font-weight: 600; text-transform: uppercase; font-size: 0.85rem; }

        /* [ 4.0 ] PROFILE GRID STYLES */
        .profile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .profile-section h4 { color: var(--primary-color); border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
        .edit-badge { font-size: 0.8rem; font-weight: 600; color: var(--secondary-color); background-color: #fef5e7; padding: 3px 8px; border-radius: 12px; }
        .profile-item { margin-bottom: 15px; }
        .profile-item label { font-weight: 600; display: block; color: #666; margin-bottom: 2px; }
        .profile-item input, .profile-item textarea { background: #f9f9f9; width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
        .profile-item input:disabled, .profile-item textarea:disabled { background: #eee; color: #777; cursor: not-allowed; border-color: #eee; }
        .profile-item input:enabled, .profile-item textarea:enabled { background: #fff; border: 1px solid var(--primary-color); }

        @media (max-width: 1000px) {
            #order-creation-workflow { grid-template-columns: 1fr; }
            #order-summary-card { position: static; }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script> 
</head>
<body>

<div id="login-view">
    <div class="card" id="login-box">
        <img src="FL.jpg" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
        <h1>Agent Portal Login</h1>
        <p>Enter your credentials to access the sales platform.</p>
        <form id="login-form" onsubmit="event.preventDefault(); handleLogin();">
            <input type="text" id="agent-id-input" placeholder="Agent ID" required>
            <input type="password" id="agent-password-input" placeholder="Password" required> 
            <button type="submit" id="login-btn" class="btn btn-primary" style="width:100%;">
                <i class="fa-solid fa-right-to-bracket"></i> Login
            </button>
            <p id="login-status"></p>
        </form>
    </div>
</div>

<div id="password-change-view" class="container hidden" style="min-height: 100vh;">
    <div class="card" style="max-width: 400px; margin: 50px auto; text-align: center;">
        <h2>Mandatory Password Change</h2>
        <p id="change-view-agent-id" style="font-weight: 600;"></p>
        <p style="color: var(--danger-color); font-weight: 600;">For security, you must change your default password immediately.</p>
        <input type="password" id="new-password-input" placeholder="New Password" required>
        <input type="password" id="confirm-password-input" placeholder="Confirm New Password" required>
        <button id="change-password-btn" class="btn btn-primary" style="width:100%;">Set New Password</button>
        <p id="password-change-status" style="margin-top: 15px;"></p>
    </div>
</div>

<div id="portal-view" class="container hidden">
    <header>
        <div id="header-content">
            <h2 id="agent-welcome-header"></h2>
            <p id="agent-details-display" style="font-size: 1.1rem; color: #555; font-weight: 500; margin-top: -10px; margin-bottom: 15px;"></p>

            <div id="target-bar-display"></div>
            <button id="refresh-data-btn" class="btn btn-secondary" style="margin-top: 10px; padding: 5px 10px;">
                <i class="fa-solid fa-arrows-rotate"></i> Refresh Data
            </button>
        </div>
        <button id="logout-btn" class="btn btn-primary"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
    </header>

    <nav>
        <button id="nav-create-order-btn" class="btn active"><i class="fa-solid fa-cart-plus"></i> New Order</button>
        <button id="nav-products-btn" class="btn"><i class="fa-solid fa-boxes-stacked"></i> Products</button>
        <button id="nav-my-orders-btn" class="btn"><i class="fa-solid fa-receipt"></i> My Orders</button>
        <button id="nav-my-commission-btn" class="btn"><i class="fa-solid fa-wallet"></i> My Commission</button>
        <button id="nav-profile-btn" class="btn"><i class="fa-solid fa-id-card"></i> My Profile</button>
        <button id="nav-team-btn" class="btn hidden"><i class="fa-solid fa-users"></i> My Team</button> 
        <button id="nav-admin-dashboard-btn" class="btn hidden"><i class="fa-solid fa-user-shield"></i> Admin Dashboard</button> 
    </nav>

    <div id="create-order-view" class="view">
        <div id="order-creation-workflow">
            <div>
                <div class="card">
                    <h3>Customer Information</h3>
                    <select id="customer-dropdown"></select>
                    <button id="new-customer-btn" class="btn" style="background-color: var(--mid-gray); color: var(--dark-text); margin-top: 10px; border-radius: var(--border-radius-sm);">
                        <i class="fa-solid fa-user-plus"></i> Create New Customer
                    </button>
                    <div id="new-customer-form" class="hidden" style="margin-top: 15px; background: var(--light-gray); padding: 15px; border-radius: var(--border-radius-sm);">
                        <input type="text" id="new-customer-name" placeholder="Customer Name" required>
                        <input type="email" id="new-customer-email" placeholder="Customer Email" required>
                        <input type="tel" id="new-customer-phone" placeholder="Customer Phone (WhatsApp)" required>
                        <textarea id="new-customer-address" placeholder="Customer Address" rows="3" required></textarea>
                    </div>
                </div>
                <div class="card">
                    <h3>Product Selection</h3>
                    <input type="text" id="product-order-search" placeholder="Search product name or SKU...">
                    <div id="product-selection-list"></div>
                </div>
            </div>
            <div id="order-summary-card" class="card">
                <h3>Order Summary</h3>
                <div id="summary-items-list"></div>
                <div class="summary-total">
                    <div class="summary-line"><span>Subtotal:</span><span id="summary-subtotal">RM 0.00</span></div>
                    <div class="summary-line"><span>Shipping:</span><span id="summary-shipping">RM 0.00</span></div>
                    <div class="summary-line total"><span>Total:</span><span id="summary-total">RM 0.00</span></div>
                </div>
                <div id="finalize-order-section" style="margin-top: 30px;">
                    <h3>Payment & Submit</h3>
                    <label for="payment-proof">Upload Payment Proof (Required)</label>
                    <input type="file" id="payment-proof" required>
                    <button id="submit-order-btn" class="btn btn-primary" style="width:100%; margin-top: 15px;">
                        <i class="fa-solid fa-paper-plane"></i> Submit Order
                    </button>
                    <p id="submit-status" style="text-align: center; margin-top: 10px; font-weight: 600;"></p>
                </div>
            </div>
        </div>
    </div>

    <div id="products-view" class="view hidden card">
        <h2>Product Catalog</h2>
        <table>
            <thead><tr><th>SKU</th><th>Name</th><th>RSP (RM)</th><th>CC</th></tr></thead>
            <tbody id="product-catalog-table"></tbody>
        </table>
    </div>

    <div id="my-orders-view" class="view hidden card">
        <h2>My Past Orders</h2>
        <div id="my-orders-list"></div>
    </div>
    
    <div id="my-commission-view" class="view hidden card">
        <h2>My Commission Records</h2>
        <p>Review your processed commission payouts and team overrides.</p>
        <div id="my-commission-list"></div>
    </div>

    <div id="profile-view" class="view hidden card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:20px;">
            <h2>My Profile</h2>
            <button id="save-profile-btn" class="btn btn-primary hidden" onclick="saveProfile()">Save Changes</button>
        </div>
        <p id="profile-status" style="text-align:right; font-size:0.9rem; margin-top:-10px;"></p>
        <div class="profile-grid">
            <div class="profile-section">
                <h4>Personal & Contact Info <span id="edit-badge-contact" class="edit-badge" style="display:none;">(Editable)</span></h4>
                <div class="profile-item"><label>Full Name</label><input type="text" id="prof-employeeName" disabled></div>
                <div class="profile-item"><label>Agent ID</label><input type="text" id="prof-agentID" disabled></div>
                <div class="profile-item"><label>Phone Number</label><input type="tel" id="prof-employeePhone" disabled></div>
                <div class="profile-item"><label>Email Address</label><input type="email" id="prof-employeeEmail" disabled></div>
                <div class="profile-item"><label>Mailing Address</label><textarea id="prof-employeeAddress" rows="3" disabled style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-family: inherit;"></textarea></div>
            </div>
            <div class="profile-section">
                <h4>Employment Details</h4>
                <div class="profile-item"><label>Position</label><input type="text" id="prof-position" disabled></div>
                <div class="profile-item"><label>Status</label><input type="text" id="prof-employeeStatus" disabled></div>
                <div class="profile-item"><label>Agent Type</label><input type="text" id="prof-agentType" disabled></div>
                <div class="profile-item"><label>Commission Rate</label><input type="text" id="prof-commissionRate" disabled></div>
                <div class="profile-item"><label>Monthly Target</label><input type="text" id="prof-target" disabled></div>
                <div class="profile-item"><label>Reporting To</label><input type="text" id="prof-managerID" disabled></div>
            </div>
            <div class="profile-section">
                <h4>Payment Information <span id="edit-badge-payment" class="edit-badge" style="display:none;">(Editable)</span></h4>
                <div class="profile-item"><label>Bank Name</label><input type="text" id="prof-bankName" disabled></div>
                <div class="profile-item"><label>Account Holder Name</label><input type="text" id="prof-accountHolderName" disabled></div>
                <div class="profile-item"><label>Account Number</label><input type="text" id="prof-accountNumber" disabled></div>
            </div>
        </div>
    </div>

    <div id="team-view" class="view hidden card">
        <h2>My Team Performance</h2>
        <div class="card" style="background:#e8f5e9; border-top:4px solid #2e7d32; margin-bottom:20px;">
            <h4>Total Override Income Earned</h4>
            <p id="team-total-override" style="font-size:1.5rem; font-weight:700; color:#2e7d32;">Loading...</p>
        </div>
        <h3>Direct Subordinates</h3>
        <ul id="subordinates-list" style="list-style:none; padding:0;">Loading...</ul>
    </div>

    <div id="admin-dashboard-view" class="view hidden card">
        <h2>Admin Dashboard: Performance Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
            <div class="card" style="padding: 15px; border-top: 4px solid var(--primary-color);"><h4 style="margin-bottom: 5px;">Total Sales (RM)</h4><p id="admin-total-sales" style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color);">Loading...</p></div>
            <div class="card" style="padding: 15px; border-top: 4px solid var(--success-color);"><h4 style="margin-bottom: 5px;">Total CC</h4><p id="admin-total-cc" style="font-size: 1.5rem; font-weight: 700; color: var(--success-color);">Loading...</p></div>
            <div class="card" style="padding: 15px; border-top: 4px solid var(--secondary-color);"><h4 style="margin-bottom: 5px;">Agents On Target</h4><p id="admin-agents-on-target" style="font-size: 1.5rem; font-weight: 700; color: #f39c12;">Loading...</p></div>
        </div>
        <h3>Agent Performance Chart</h3>
        <div style="background: white; padding: 20px; border-radius: var(--border-radius-lg);"><canvas id="performanceChart" height="100"></canvas></div>
        <h3 style="margin-top:30px;">Team Breakdown</h3>
        <div id="admin-data-table" style="margin-top: 20px;"></div>
    </div>
</div>

<script>
// =================================================================
// AGENT PORTAL SCRIPT - FINAL DEFINITIVE CODE
// =================================================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx84SfcmMHmWLVq2PqZn9tuj_wr47UJDYk2ks2Juwd1tDjKZXv8nYaayYA6aSX1pgC17Q/exec'; // Update this URL

let products = [], customers = [], shippingRules = [], currentAgent = null, currentOrder = { items: [] }, performanceChartInstance = null;
let currentProfile = {}, canEditProfile = false;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', (event) => { event.preventDefault(); handleLogin(); });
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('refresh-data-btn').addEventListener('click', refreshPageData);

    document.getElementById('nav-create-order-btn').addEventListener('click', () => showView('create-order-view'));
    document.getElementById('nav-products-btn').addEventListener('click', () => showView('products-view'));
    document.getElementById('nav-my-orders-btn').addEventListener('click', () => showView('my-orders-view'));
    document.getElementById('nav-my-commission-btn').addEventListener('click', () => showView('my-commission-view'));
    
    // NEW LISTENERS
    document.getElementById('nav-profile-btn').addEventListener('click', () => showView('profile-view'));
    document.getElementById('nav-team-btn').addEventListener('click', () => showView('team-view'));
    document.getElementById('nav-admin-dashboard-btn').addEventListener('click', () => showView('admin-dashboard-view'));

    document.getElementById('change-password-btn').addEventListener('click', handleChangePassword);
    document.getElementById('new-customer-btn').addEventListener('click', handleNewCustomerToggle);
    document.getElementById('customer-dropdown').addEventListener('change', handleCustomerSelection);
    document.getElementById('submit-order-btn').addEventListener('click', submitOrder);
    document.getElementById('product-order-search').addEventListener('keyup', renderProductSelectionList);
});

async function handleLogin() {
    const agentId = document.getElementById('agent-id-input').value.trim();
    const password = document.getElementById('agent-password-input').value; 
    const loginBtn = document.getElementById('login-btn');
    const loginStatus = document.getElementById('login-status');
    
    if (!agentId || !password) { loginStatus.textContent = "ID and Password are required."; loginStatus.style.color = 'var(--danger-color)'; return; }
    loginBtn.disabled = true; loginStatus.textContent = "Verifying..."; loginStatus.style.color = 'var(--dark-text)';

    try {
        const response = await postToGoogleScript('verifyAgent', { agentId, password });
        if (response.success) {
            currentAgent = response.agent;
            currentAgent.target = parseFloat(response.target) || 0; 
            currentAgent.currentSales = parseFloat(response.currentSales) || 0; 
            currentAgent.isAdmin = response.isAdmin || false;
            
            // NEW: Capture new response data
            currentProfile = response.profile;
            currentAgent.isManager = response.isManager || false;
            canEditProfile = response.allowEdit || false;
            
            if (response.mustChangePassword) {
                 document.getElementById('login-view').classList.add('hidden');
                 document.getElementById('password-change-view').classList.remove('hidden');
                 document.getElementById('change-view-agent-id').textContent = `Agent ID: ${agentId}`;
                 return; 
            }

            await fetchPortalData();
            
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('portal-view').classList.remove('hidden');
            
            // NEW: Update Header Display
            document.getElementById('agent-welcome-header').textContent = `${currentAgent.name} (${currentAgent.id})`;
            document.getElementById('agent-details-display').textContent = `${response.position} | ID: ${currentAgent.id}`;
            
            // FIX: Show/Hide Role Buttons
            if (currentAgent.isAdmin) document.getElementById('nav-admin-dashboard-btn').classList.remove('hidden');
            else document.getElementById('nav-admin-dashboard-btn').classList.add('hidden');
            
            if (currentAgent.isManager) document.getElementById('nav-team-btn').classList.remove('hidden');
            else document.getElementById('nav-team-btn').classList.add('hidden');

            // NEW: Init Profile
            renderProfileView();
            renderTargetBar(); 
            showView('create-order-view'); 
        } else {
            loginStatus.textContent = response.message;
            loginStatus.style.color = 'var(--danger-color)';
        }
    } catch (error) {
        loginStatus.textContent = "Connection failed.";
        loginStatus.style.color = 'var(--danger-color)';
    } finally {
        loginBtn.disabled = false;
    }
}

// NEW: Profile Logic
function renderProfileView() {
    // Fill fields
    document.getElementById('prof-agentID').value = currentProfile.agentID || '';
    document.getElementById('prof-employeeName').value = currentProfile.employeeName || '';
    document.getElementById('prof-employeePhone').value = currentProfile.employeePhone || '';
    document.getElementById('prof-employeeEmail').value = currentProfile.employeeEmail || '';
    document.getElementById('prof-employeeAddress').value = currentProfile.employeeAddress || '';
    
    document.getElementById('prof-position').value = currentProfile.position || '';
    document.getElementById('prof-employeeStatus').value = currentProfile.employeeStatus || '';
    document.getElementById('prof-agentType').value = currentProfile.agentType || '';
    document.getElementById('prof-commissionRate').value = currentProfile.commissionRate || '';
    document.getElementById('prof-target').value = `RM ${currentProfile.target}`;
    document.getElementById('prof-managerID').value = currentProfile.managerId || 'None';
    
    document.getElementById('prof-bankName').value = currentProfile.bankName;
    document.getElementById('prof-accountHolderName').value = currentProfile.accHolder;
    document.getElementById('prof-accountNumber').value = currentProfile.accNumber;

    // Editable Fields List
    const editable = [
        document.getElementById('prof-employeePhone'),
        document.getElementById('prof-employeeEmail'),
        document.getElementById('prof-employeeAddress'),
        document.getElementById('prof-bankName'), 
        document.getElementById('prof-accountHolderName'), 
        document.getElementById('prof-accountNumber')
    ];
    const saveBtn = document.getElementById('save-profile-btn');
    const badges = document.querySelectorAll('.edit-badge');

    if(canEditProfile) {
        editable.forEach(el => el.disabled = false);
        saveBtn.classList.remove('hidden');
        badges.forEach(el => el.style.display = 'inline');
    } else {
        editable.forEach(el => el.disabled = true);
        saveBtn.classList.add('hidden');
        badges.forEach(el => el.style.display = 'none');
    }
}

async function saveProfile() {
    const btn = document.getElementById('save-profile-btn');
    const status = document.getElementById('profile-status');
    btn.textContent = "Saving..."; btn.disabled = true; status.textContent = "";
    
    const payload = {
        agentId: currentAgent.id,
        phone: document.getElementById('prof-employeePhone').value,
        email: document.getElementById('prof-employeeEmail').value,
        address: document.getElementById('prof-employeeAddress').value,
        bankName: document.getElementById('prof-bankName').value,
        accHolder: document.getElementById('prof-accountHolderName').value,
        accNumber: document.getElementById('prof-accountNumber').value
    };
    
    try {
        const res = await postToGoogleScript('updateAgentProfile', payload);
        status.style.color = res.success ? 'green' : 'red';
        status.textContent = res.message;
        if(res.success) {
            currentProfile.employeePhone = payload.phone;
            currentProfile.employeeEmail = payload.email;
            currentProfile.employeeAddress = payload.address;
            currentProfile.bankName = payload.bankName;
            currentProfile.accHolder = payload.accHolder;
            currentProfile.accNumber = payload.accNumber;
        }
    } catch(e) { status.style.color = 'red'; status.textContent = "Error."; }
    finally { btn.textContent = "Save Changes"; btn.disabled = false; }
}

async function handleChangePassword() {
    const p1 = document.getElementById('new-password-input').value;
    const p2 = document.getElementById('confirm-password-input').value;
    if (p1.length < 6 || p1 !== p2) { alert("Password invalid."); return; }
    await postToGoogleScript('updatePassword', { agentId: currentAgent.id, newPassword: p1 });
    alert("Success! Please log in again."); location.reload();
}

function handleLogout() { location.reload(); }

function refreshPageData() {
    const active = document.querySelector('.view:not(.hidden)');
    if(!active) return;
    const btn = document.getElementById('refresh-data-btn');
    btn.innerHTML = 'Refreshing...'; btn.disabled = true;
    
    postToGoogleScript('verifyAgent', { agentId: currentAgent.id, password: document.getElementById('agent-password-input').value })
        .then(res => {
            if (res.success) {
                currentAgent.target = res.target; 
                currentAgent.currentSales = res.currentSales; 
                renderTargetBar();
                showView(active.id, true);
            }
        })
        .finally(() => {
            setTimeout(() => { btn.disabled = false; btn.innerHTML = 'Refresh Data'; }, 1000);
        });
}

function showView(viewId, isRefresh = false) {
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    document.querySelectorAll('nav .btn').forEach(btn => btn.classList.remove('active'));

    const view = document.getElementById(viewId);
    const btn = document.getElementById(`nav-${viewId.replace('-view', '-btn')}`);
    
    if(view) view.classList.remove('hidden');
    if(btn) btn.classList.add('active');

    if (!isRefresh) {
        if (viewId === 'my-orders-view') renderMyOrders();
        if (viewId === 'my-commission-view') renderMyCommission();
        if (viewId === 'team-view') renderTeamView();
        if (viewId === 'admin-dashboard-view') renderAdminDashboard();
        if (viewId === 'profile-view') renderProfileView();
    }
}

function renderTargetBar() {
    const container = document.getElementById('target-bar-display');
    const pct = Math.min(100, currentAgent.target > 0 ? (currentAgent.currentSales / currentAgent.target) * 100 : 0);
    container.innerHTML = `<div style="font-size: 0.9rem; margin-bottom: 5px;">Monthly Target: RM ${currentAgent.currentSales.toFixed(2)} / RM ${currentAgent.target.toFixed(2)} (${pct.toFixed(1)}%)</div><div class="target-bar-container"><div class="target-text">RM ${currentAgent.currentSales.toFixed(2)} / RM ${currentAgent.target.toFixed(2)}</div><div class="target-progress" style="width: ${pct}%;"></div></div>`;
}

function renderProductCatalog() { 
    document.getElementById('product-catalog-table').innerHTML = products.map(p => `<tr><td>${p.id}</td><td>${p.name}</td><td>RM ${p.rsp.toFixed(2)}</td><td>${p.cc.toFixed(3)}</td></tr>`).join('');
}

function renderProductSelectionList() { 
    const term = document.getElementById('product-order-search').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term) || String(p.id).toLowerCase().includes(term));
    document.getElementById('product-selection-list').innerHTML = filtered.length ? filtered.map(p => `
        <div class="product-item-selectable" onclick="addProductToOrder('${p.id}')">
            <img src="${p.image || 'FL.jpg'}" onerror="this.style.display='none'">
            <div><strong>${p.name} (${p.id})</strong><p style="font-size:0.85rem">RSP: RM ${p.rsp.toFixed(2)}</p></div>
            <button class="btn btn-primary" style="pointer-events:none">Add</button>
        </div>`).join('') : "<p style='padding:15px;text-align:center'>No products.</p>";
}

function renderCustomerDropdown() { 
    const select = document.getElementById('customer-dropdown');
    select.innerHTML = `<option value="">-- Select Existing Customer --</option>` + customers.map(c => `<option value="${c.pac}">${c.name} (${c.phone||c.email})</option>`).join('');
}

function renderOrderSummary() { 
    const container = document.getElementById('summary-items-list');
    if (currentOrder.items.length === 0) { container.innerHTML = "<p style='text-align:center; padding: 20px 0;'>Add products to begin.</p>"; } 
    else {
        container.innerHTML = currentOrder.items.map(item => {
            const isInvalid = item.customPrice < item.minPrice;
            return `<div class="summary-item" data-id="${item.id}">
                <div class="summary-item-info"><strong>${item.name}</strong><div class="price-error-message">${isInvalid ? `Min: RM ${item.minPrice.toFixed(2)}` : ''}</div></div>
                <input type="number" value="${item.quantity}" onchange="updateQuantity('${item.id}', this.value)" style="width:60px">
                <input type="number" step="0.01" value="${item.customPrice.toFixed(2)}" onchange="updatePrice('${item.id}', this.value)" class="${isInvalid?'price-input-invalid':''}" style="width:80px">
                <span onclick="removeItemFromOrder('${item.id}')" style="cursor:pointer; color:var(--danger-color);"><i class="fa-solid fa-trash"></i></span>
            </div>`;
        }).join('');
    }
    calculateTotals();
}

async function renderMyOrders() {
    const container = document.getElementById('my-orders-list');
    container.innerHTML = '<p>Loading...</p>';
    try {
        const res = await postToGoogleScript('getAgentOrders', { agentId: currentAgent.id });
        container.innerHTML = res.orders.length ? `<table><thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>${res.orders.map(o => `<tr><td>${o.invoiceId}</td><td>${o.date}</td><td>${o.customerName}</td><td>RM ${o.total}</td><td>${o.status}</td></tr>`).join('')}</tbody></table>` : '<p>No orders found.</p>';
    } catch(e) { container.innerHTML = '<p>Error loading orders.</p>'; }
}

// UPDATED: Shows Status and Overrides
function renderMyCommission() {
    const container = document.getElementById('my-commission-list');
    container.innerHTML = '<p>Loading...</p>';
    postToGoogleScript('getAgentCommission', { agentId: currentAgent.id }).then(res => {
        if (res.records.length) {
            container.innerHTML = `<table><thead><tr><th>Invoice</th><th>Type</th><th>Sales (RM)</th><th>Earned (RM)</th><th>Status</th></tr></thead><tbody>
            ${res.records.map(r => {
                const isOverride = r.overrideAmount > 0;
                const type = isOverride ? "Team Override" : "Direct Sale";
                const earned = isOverride ? r.overrideAmount : r.commissionAmount;
                const sales = isOverride ? "-" : r.salesAmount.toFixed(2);
                return `<tr><td>${r.invoiceId}</td><td>${type}</td><td>${sales}</td><td><strong>${earned.toFixed(2)}</strong></td><td>${r.status}</td></tr>`;
            }).join('')}</tbody></table>`;
        } else { container.innerHTML = '<p>No records found.</p>'; }
    });
}

// NEW: Render My Team View
async function renderTeamView() {
    const list = document.getElementById('subordinates-list');
    const overrideEl = document.getElementById('team-total-override');
    list.innerHTML = '<li>Loading...</li>';
    try {
        const res = await postToGoogleScript('getSubordinatesData', { agentId: currentAgent.id });
        if(res.success) {
            overrideEl.textContent = `RM ${res.totalOverride.toFixed(2)}`;
            list.innerHTML = res.subordinates.length ? res.subordinates.map(s => `<li><strong>${s.name}</strong> (${s.id}) - <span style="color:var(--primary-color)">${s.position}</span></li>`).join('') : '<li>No direct subordinates found.</li>';
        }
    } catch(e) { list.innerHTML = 'Error.'; }
}

// UPDATED: Render Admin Dashboard (Grouped)
async function renderAdminDashboard() {
    const dataTable = document.getElementById('admin-data-table');
    dataTable.innerHTML = '<p>Loading...</p>';
    try {
        const res = await postToGoogleScript('getAdminData', { agentId: currentAgent.id });
        if (res.success && res.data.length > 0) {
            document.getElementById('admin-total-sales').textContent = `RM ${res.grandTotalSales.toFixed(2)}`;
            document.getElementById('admin-total-cc').textContent = res.grandTotalCC.toFixed(3);
            document.getElementById('admin-agents-on-target').textContent = `${res.data.filter(a => a.targetAchieved >= 1).length} / ${res.data.length}`;
            
            const teams = {}; const noMgr = [];
            res.data.forEach(a => { (a.managerId && a.managerId !== "") ? (teams[a.managerId] = teams[a.managerId] || []).push(a) : noMgr.push(a); });

            let html = '';
            if (noMgr.length) html += `<h3>Independent Agents</h3>${buildAdminTable(noMgr)}`;
            for (const [mgr, members] of Object.entries(teams)) {
                html += `<h3 style="margin-top:30px; color:var(--primary-color); border-bottom:2px solid #eee;">Team: ${mgr}</h3>${buildAdminTable(members)}`;
            }
            dataTable.innerHTML = html;
            drawPerformanceChart(res.data);
        } else { dataTable.innerHTML = '<p>No data.</p>'; }
    } catch(e) { dataTable.innerHTML = '<p>Error.</p>'; }
}

function buildAdminTable(agents) {
    return `<table style="width:100%"><thead><tr><th>Name</th><th>Target</th><th>Sales</th><th>Achieved</th></tr></thead><tbody>
    ${agents.map(a => `<tr><td>${a.name}</td><td>RM ${a.target.toFixed(2)}</td><td>RM ${a.totalSales.toFixed(2)}</td><td style="color:${a.targetAchieved>=1?'green':'red'}">${(a.targetAchieved*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>`;
}

function drawPerformanceChart(data) {
    const ctx = document.getElementById('performanceChart');
    if (performanceChartInstance) performanceChartInstance.destroy();
    performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: data.map(a => a.name), datasets: [{ label: 'Sales (RM)', data: data.map(a => a.totalSales), backgroundColor: 'rgba(0,123,255,0.8)' }] },
        options: { responsive: true }
    });
}

function startNewOrder() { 
    currentOrder = { items: [] };
    document.getElementById('customer-dropdown').value = '';
    document.getElementById('new-customer-form').classList.add('hidden');
    document.getElementById('customer-dropdown').disabled = false;
    document.getElementById('new-customer-name').value = '';
    document.getElementById('new-customer-email').value = '';
    document.getElementById('new-customer-phone').value = '';
    document.getElementById('new-customer-address').value = '';
    document.getElementById('payment-proof').value = '';
    document.getElementById('submit-status').textContent = '';
    document.getElementById('submit-order-btn').disabled = false;
    renderOrderSummary();
}
function handleNewCustomerToggle() {
    const form = document.getElementById('new-customer-form');
    const dropdown = document.getElementById('customer-dropdown');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) { dropdown.value = ''; dropdown.disabled = true; } else { dropdown.disabled = false; }
}
function handleCustomerSelection() {
    if (document.getElementById('customer-dropdown').value) document.getElementById('new-customer-form').classList.add('hidden');
}
function addProductToOrder(productIdStr) {
    const p = products.find(x => String(x.id) === String(productIdStr));
    if (!p) return;
    if (!currentOrder.items.some(i => String(i.id) === String(productIdStr))) {
        currentOrder.items.push({ id: p.id, name: p.name, quantity: 1, rsp: p.rsp, cc: p.cc, customPrice: p.rsp, minPrice: p.minPrice });
    }
    renderOrderSummary();
}
function removeItemFromOrder(id) { currentOrder.items = currentOrder.items.filter(i => String(i.id) !== String(id)); renderOrderSummary(); }
function updateQuantity(id, qty) { const i = currentOrder.items.find(x => String(x.id) === String(id)); if(i) i.quantity = parseInt(qty)||1; renderOrderSummary(); }
function updatePrice(id, pr) { const i = currentOrder.items.find(x => String(x.id) === String(id)); if(i) i.customPrice = parseFloat(pr)||0; renderOrderSummary(); }
function calculateTotals() {
    const sub = currentOrder.items.reduce((s, i) => s + (i.customPrice * i.quantity), 0);
    const shipRule = shippingRules.find(r => sub >= r.minSpend);
    const ship = shipRule ? shipRule.charge : 0;
    document.getElementById('summary-subtotal').textContent = `RM ${sub.toFixed(2)}`;
    document.getElementById('summary-shipping').textContent = `RM ${ship.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `RM ${(sub+ship).toFixed(2)}`;
}
async function submitOrder() {
    const btn = document.getElementById('submit-order-btn');
    const status = document.getElementById('submit-status');
    if(btn.disabled) return;
    btn.disabled = true; status.textContent = "Validating...";
    
    if(!currentOrder.items.length) { status.textContent = "Add products first."; btn.disabled = false; return; }
    if(currentOrder.items.some(i => i.customPrice < i.minPrice)) { status.textContent = "Price too low."; btn.disabled = false; return; }
    
    let cust;
    const existPac = document.getElementById('customer-dropdown').value;
    if(existPac) cust = customers.find(c => c.pac === existPac);
    else {
        cust = { name: document.getElementById('new-customer-name').value, email: document.getElementById('new-customer-email').value, phone: document.getElementById('new-customer-phone').value, address: document.getElementById('new-customer-address').value };
        if(!cust.name) { status.textContent = "Customer details required."; btn.disabled = false; return; }
    }

    const file = document.getElementById('payment-proof').files[0];
    if(!file) { status.textContent = "Proof required."; btn.disabled = false; return; }
    
    status.textContent = "Uploading...";
    try {
        const base64 = await getBase64(file);
        const subtotal = currentOrder.items.reduce((s, i) => s + (i.customPrice * i.quantity), 0);
        const shipRule = shippingRules.find(r => sub >= r.minSpend);
        const payload = { action: 'submitAgentOrder', data: { agent: currentAgent, customer: cust, items: currentOrder.items, shippingFee: shipRule ? shipRule.charge : 0, paymentProof: { file: base64.split(',')[1], mimeType: file.type } } };
        const res = await postToGoogleScript(payload);
        if(res.success) {
            status.style.color = 'green'; status.textContent = `Success! ID: ${res.invoiceId}`;
            setTimeout(startNewOrder, 2000);
        } else { throw new Error(res.message); }
    } catch(e) { status.textContent = "Error: " + e.message; btn.disabled = false; }
}

async function postToGoogleScript(actionOrPayload, data = {}) {
    const payload = (typeof actionOrPayload === 'object' && actionOrPayload.action) ? actionOrPayload : { action: actionOrPayload, data: data };
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        return await res.json();
    } catch (e) { throw e; }
}
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
</script>
</body>
</html>
