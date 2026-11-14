const { test, expect } = require('@playwright/test');
const catalog = {
    status: 'success', products: [
        { id: 'A1', name: 'Aloe cream', price: 40, category: 'Skin care', image: 'FL.jpg', benefits: 'Daily skin care' },
        { id: 'A2', name: 'Aloe lotion', price: 20, category: 'Skin care', image: 'aloe-body-lotion.jpg' },
        { id: 'T1', name: 'Herbal tea', price: 15, category: 'Nutrition', image: 'aloe-herbal-tea.jpg' },
        { id: 'N1', name: 'Unavailable price', category: 'Nutrition' }
    ], aboutUsContent: {}, testimonies: [], jobsListings: [],
    shippingRules: [{ MinSpend: 0, MaxSpend: 99.99, Charge: 10 }, { MinSpend: 100, Charge: 0 }]
};
async function setup(page) {
    const state = { failed: false, reply: {}, requests: [], catalog: structuredClone(catalog), bot: [], botExpired: false, botOrders: [{ invoiceId: 'INV-1', status: 'On the Way', total: 40, items: 'Aloe cream', paid: true }], customerOrders: [{ invoiceId: 'INV-1', date: 'Today', status: 'Cancelled', total: 40, items: 'Aloe cream', paid: false }] };
    await page.route('**/*', async route => {
        const req = route.request(); const url = new URL(req.url());
        if (url.hostname === 'script.google.com') {
            if (state.failed && req.method() === 'GET') return route.fulfill({ status: 503, body: 'Unavailable' });
            if (req.method() === 'GET') return route.fulfill({ json: state.catalog });
            const body = req.postDataJSON(); state.requests.push(body);
            const replies = {
                logInitialOrder: state.reply, getContactInfo: { success: true, whatsappNumber: '601234', contactNumber: 'Test contact' },
                verifyCustomer: { success: true, token: 'portal-session', customer: { customerName: 'Test customer', pac: 'C1' } },
                getCustomerOrders: { success: true, orders: state.customerOrders, stages: ['Processed', 'Paid', 'Awaiting Shipment', 'On the Way', 'Delivered'] },
                verifyAgent: { success: true, token: 'agent-session', agent: { name: 'Test agent', id: 'AG1' }, target: 100, currentSales: 0, profile: {}, isAdmin: false, isManager: false },
                getPortalData: { success: true, products: [], customers: [], shippingRules: [] }, getOpenOrders: { success: true, orders: [] }
            };
            return route.fulfill({ json: replies[body.action] || { success: false, message: 'Forbidden' } });
        }
        if (url.hostname === 'whatsapp-eshop-bot.onrender.com') {
            const body = req.postDataJSON(); state.bot.push(body);
            if (state.botExpired && body.action !== 'customerLogin') return route.fulfill({ status: 401, json: { success: false, message: 'SESSION_EXPIRED' } });
            if (body.action === 'getSmartAnswer') return route.fulfill({ json: { success: true, answer: 'Catalog help is available.' } });
            if (body.action === 'customerLogin') return route.fulfill({ json: { success: true, token: 'bot-session', customer: { customerName: 'Test customer', customerEmail: 'test@example.com', customerPhone: '60123', customerAddress: 'Test address' } } });
            if (body.action === 'getCustomerOrders') return route.fulfill({ json: { success: true, orders: state.botOrders } });
            if (body.action === 'getCustomerDocument') return route.fulfill({ json: { success: true, filename: 'invoice-test.pdf', base64: Buffer.from('%PDF-1.4\nTest invoice').toString('base64') } });
            return route.fulfill({ json: { success: false, message: 'SESSION_EXPIRED' }, status: 401 });
        }
        if (url.hostname !== '127.0.0.1') return route.abort();
        return route.continue();
    });
    return state;
}
async function loaded(page) { await page.goto('/'); await expect(page.locator('#catalog-count')).toContainText('4 of 4'); }
async function cart(page) {
    await page.evaluate(() => { addToCart('A1'); toggleCart(false); });
    await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Local test');
    await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill('6012345');
    await page.getByRole('textbox', { name: 'Delivery address', exact: true }).fill('Test address');
}

test('search, categories, sorting, current prices and public product links', async ({ page }) => {
    await setup(page); await loaded(page); await page.evaluate(() => showTab('products'));
    await expect(page.locator('.product img').first()).toHaveAttribute('src', /assets\/logo.webp$/);
    await page.getByRole('searchbox', { name: 'Search products' }).fill('aloe');
    await page.getByLabel('Sort by', { exact: true }).selectOption('price-asc');
    await expect(page.locator('.product h3')).toHaveText(['Aloe lotion', 'Aloe cream']);
    await page.getByLabel('Category', { exact: true }).selectOption('Nutrition');
    await expect(page.getByText('No matches yet.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('.product').filter({ hasText: 'Unavailable price' }).getByRole('button')).toBeDisabled();
    await page.evaluate(() => openProduct('A1'));
    await expect(page).toHaveURL(/\?product=A1$/);
    await expect(page.locator('.pd-related')).toContainText('Aloe lotion');
    await expect(page.locator('.pd-related')).not.toContainText('Herbal tea');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /index.html\?product=A1$/);
    await page.reload(); await expect(page.locator('.pd-info h1')).toHaveText('Aloe cream');
});

test('saved carts restore current prices and never persist customer information', async ({ page }) => {
    const state = await setup(page); await loaded(page); await cart(page);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('fl-cart-v1'))).toContain('A1');
    const stored = await page.evaluate(() => localStorage.getItem('fl-cart-v1'));
    expect(stored).not.toMatch(/customer|Test address|price|Local test/);
    state.catalog.products[0].price = 45;
    await page.reload(); await expect(page.locator('#cart-count')).toHaveText('1');
    await page.evaluate(() => toggleCart(false));
    await expect(page.locator('#cart-subtotal')).toHaveText('RM 45.00');
    await expect(page.locator('#customer-name')).toHaveValue('');
    await page.evaluate(() => removeItemFromCart('A1'));
    await page.reload(); await expect(page.locator('#cart-count')).toHaveText('0');
});

test('unconfirmed checkout keeps cart; confirmed checkout has a reference and payment instructions', async ({ page }) => {
    const state = await setup(page); await loaded(page); await cart(page);
    await page.getByRole('button', { name: 'Complete Order', exact: true }).click();
    await expect(page.locator('#checkout-status')).toContainText('could not be confirmed');
    await expect(page.locator('#cart-count')).toHaveText('1');
    const firstId = state.requests.find(r => r.action === 'logInitialOrder').data.requestId;
    state.reply = { status: 'success', invoiceId: 'INV-TEST', totalAmount: 50, shippingFee: 10 };
    await page.getByRole('button', { name: 'Complete Order', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Thank you for your order.', exact: true })).toBeVisible();
    await expect(page.locator('.order-confirmation')).toContainText('INV-TEST');
    await expect(page.locator('.confirmation-total')).toContainText('RM 50.00');
    await expect(page.locator('.order-confirmation')).toContainText('does not mean payment is confirmed');
    await expect(page.locator('#cart-count')).toHaveText('0');
    expect(state.requests.filter(r => r.action === 'logInitialOrder').at(-1).data.requestId).toBe(firstId);
});

test('concurrent checkout calls make one request', async ({ page }) => {
    const state = await setup(page); state.reply = { success: true, invoiceId: 'INV-ONE' };
    await loaded(page); await cart(page);
    await page.evaluate(() => Promise.all([initiateCheckout(), initiateCheckout()]));
    expect(state.requests.filter(r => r.action === 'logInitialOrder')).toHaveLength(1);
});

test('rich sheet content keeps safe formatting and removes executable markup', async ({ page }) => {
    const state = await setup(page);
    const html = '<p><strong>Safe formatting</strong><img src="/bad" onerror="window.unsafe=true"><a href="javascript:window.unsafe=true">Unsafe link</a></p><svg onload="window.unsafe=true"></svg>';
    state.catalog.jobsListings = [{ position: 'Test job', description: html }]; state.catalog.aboutUsContent.MoreDetails = html;
    await loaded(page); await page.evaluate(() => showTab('jobs'));
    await expect(page.locator('.job-description strong')).toHaveText('Safe formatting');
    await expect(page.locator('.job-description img, .job-description svg, .job-description [onerror]')).toHaveCount(0);
    await expect(page.locator('.job-description a')).not.toHaveAttribute('href');
    expect(await page.evaluate(() => window.unsafe)).toBeUndefined();
});

test('catalog failures leave assistant available and recover with retry', async ({ page }) => {
    const state = await setup(page); state.failed = true; await page.goto('/');
    await expect(page.getByText('Error loading store. Please try again later.', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Open shop assistant', exact: true }).click();
    await page.getByRole('textbox', { name: 'Your message', exact: true }).fill('What can you help with?');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.locator('#chat-body')).toContainText('Could you tell me a little more?');
    expect(state.bot).toHaveLength(0);
    await page.getByRole('button', { name: 'Close assistant', exact: true }).click();
    state.failed = false; await page.getByRole('button', { name: 'Try loading again', exact: true }).first().click();
    await expect(page.locator('#catalog-count')).toContainText('4 of 4');
});

test('rewards explain account access and personal chat actions require login', async ({ page }) => {
    const state = await setup(page); await loaded(page); await page.evaluate(() => showTab('rewards'));
    await expect(page.locator('#rewards-content')).not.toContainText('coming soon');
    await expect(page.getByRole('link', { name: 'View my rewards', exact: true })).toHaveAttribute('href', 'customer.html');
    await page.getByRole('button', { name: 'Open shop assistant', exact: true }).click();
    await page.getByRole('button', { name: /Order status/ }).click();
    await page.getByLabel('Email', { exact: true }).fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your order status', exact: true })).toBeVisible();
    await expect(page.locator('#chat-body')).not.toContainText('test-password');
    expect(state.bot.map(r => r.action)).toEqual(['customerLogin', 'getCustomerOrders']);
});

test('customer portal shows cancelled status without processed progress and sends session token', async ({ page }) => {
    const state = await setup(page); await page.goto('/customer.html');
    await page.locator('#customer-email-input').fill('test@example.com'); await page.locator('#customer-password-input').fill('test-password');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.locator('.order-status-note')).toHaveText('Current status: Cancelled');
    await expect(page.locator('.tracker .now')).toHaveCount(0);
    expect(state.requests.find(r => r.action === 'getCustomerOrders').data).toEqual({ token: 'portal-session' });
});

test('agent UI hides admin actions for a normal agent and sends only the session after login', async ({ page }) => {
    const state = await setup(page); await page.goto('/agent.html');
    await page.locator('#agent-id-input').fill('AG1'); await page.locator('#agent-password-input').fill('test-password');
    await page.locator('#login-btn').click();
    await expect(page.locator('#portal-view')).toBeVisible();
    await expect(page.locator('#nav-admin-dashboard-btn')).toBeHidden();
    await expect(page.locator('#nav-team-btn')).toBeHidden();
    expect(state.requests.find(r => r.action === 'getPortalData').data).toEqual({ token: 'agent-session' });
});

test('catalog toolbar and confirmation fit a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); const state = await setup(page); await loaded(page);
    await page.evaluate(() => showTab('products')); await expect(page.getByRole('searchbox')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/catalog-mobile.png', fullPage: true });
    state.reply = { success: true, invoiceId: 'INV-PHONE', totalAmount: 50, shippingFee: 10 };
    await cart(page); await page.getByRole('button', { name: 'Complete Order', exact: true }).click();
    await expect(page.locator('.order-confirmation')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/confirmation-mobile.png', fullPage: true });
});


test('customer history displays product names and remains pending until payment verification', async ({ page }) => {
    const state = await setup(page);
    state.customerOrders = [{ invoiceId: 'INV-PENDING', date: 'Today', status: 'Delivered', total: 95, shippingFee: 0, items: 'A1x2, T1x1', paid: false, points: 95 }];
    await page.goto('/customer.html');
    await page.locator('#customer-email-input').fill('test@example.com'); await page.locator('#customer-password-input').fill('test-password');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    const order = page.locator('.order-card');
    await expect(order.locator('.order-items-line').first()).toHaveText('Aloe cream × 2, Herbal tea × 1');
    await expect(order.locator('.badge')).toHaveText('Pending payment');
    await expect(order.locator('.tracker .now .lbl')).toHaveText('Pending payment');
    await expect(order.getByRole('button', { name: 'Receipt', exact: true })).toHaveCount(0);
    await expect(order.locator('.pts')).toHaveCount(0);
    state.customerOrders[0].paid = true; state.customerOrders[0].status = 'Processed';
    await page.locator('#nav-my-orders-btn').click();
    await expect(order.locator('.badge')).toHaveText('Paid');
    await expect(order.getByRole('button', { name: 'Receipt', exact: true })).toBeVisible();
    state.customerOrders[0].paymentStatus = 'Unpaid'; state.customerOrders[0].status = 'On the Way';
    await page.locator('#nav-my-orders-btn').click();
    await expect(order.locator('.badge')).toHaveText('Pending payment');
    state.customerOrders[0].paymentStatus = 'Paid';
    await page.locator('#nav-my-orders-btn').click();
    await expect(order.locator('.badge')).toHaveText('On the Way');
});

test('historical saved names work without the public catalog and remain escaped', async ({ page }) => {
    const state = await setup(page); state.failed = true;
    state.customerOrders = [{ invoiceId: 'OLD', status: 'Processed', paid: false, total: 10, itemDetails: [{ id: 'DELISTED', name: '<img src=x onerror=alert(1)> Saved product', quantity: 2 }] }];
    await page.goto('/customer.html');
    await page.locator('#customer-email-input').fill('test@example.com'); await page.locator('#customer-password-input').fill('test-password');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.locator('.order-items-line').first()).toHaveText('<img src=x onerror=alert(1)> Saved product × 2');
    await expect(page.locator('.order-items-line img')).toHaveCount(0);
    await expect(page.locator('.order-card .badge')).toHaveText('Pending payment');
});


async function chatText(page, text) {
    await page.getByRole('textbox', { name: 'Your message', exact: true }).fill(text);
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.locator('#chat-body')).toHaveAttribute('aria-busy', 'false');
}
async function signIntoChat(page) {
    await page.getByRole('button', { name: 'Open shop assistant', exact: true }).click();
    await page.getByRole('button', { name: /Check orders/ }).click();
    await page.locator('#chat-body').getByLabel('Email', { exact: true }).fill('test@example.com');
    await page.locator('#chat-body').getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your orders', exact: true })).toBeVisible();
}
test('screenshot cancellation question uses the current order and only prepares a request draft', async ({ page }) => {
    const state = await setup(page);
    state.botOrders = [{ invoiceId: 'INV-2026-ONE', status: 'Processed', paid: false, total: 240, items: 'A1x2' }];
    await loaded(page); await signIntoChat(page);
    await chatText(page, 'can i cancel this order ?');
    await expect(page.locator('#chat-body')).toContainText('INV-2026-ONE is currently Pending payment');
    await expect(page.locator('#chat-body')).toContainText('I have not cancelled this order or sent a request');
    const link = page.getByRole('link', { name: 'Ask the shop on WhatsApp', exact: true });
    const url = new URL(await link.getAttribute('href'));
    expect(url.hostname).toBe('wa.me'); expect(url.searchParams.get('text')).toContain('INV-2026-ONE');
    expect(url.searchParams.get('text')).not.toMatch(/test@example|Test address/);
    expect(state.bot.every(r => ['customerLogin', 'getCustomerOrders'].includes(r.action))).toBe(true);
    await chatText(page, 'I have already paid');
    await expect(page.locator('#chat-body')).toContainText('do not pay again');
    expect(state.bot.some(r => /cancel|refund|update|submit/i.test(r.action))).toBe(false);
});
test('multiple orders require explicit selection; unknown references do not select another account record', async ({ page }) => {
    const state = await setup(page);
    state.botOrders = [
        { invoiceId: 'INV-ONE', status: 'Processed', paid: false, items: 'A1x1' },
        { invoiceId: 'INV-TWO', status: 'Delivered', paid: true, items: 'T1x1' }
    ];
    await loaded(page); await signIntoChat(page); await chatText(page, 'can I cancel this order');
    await expect(page.locator('#chat-body')).toContainText('Which order do you mean?');
    await page.getByRole('button', { name: 'INV-TWO · Delivered', exact: true }).click();
    await expect(page.locator('#chat-body')).toContainText('INV-TWO is currently Delivered');
    await chatText(page, 'cancel INV-NOT-MINE');
    await expect(page.locator('#chat-body')).toContainText('not in the orders returned for your signed-in account');
    expect(state.bot.some(r => r.action === 'cancelOrder')).toBe(false);
});
test('screenshot product question uses matching Sheets benefits, context price, and no invented claims', async ({ page }) => {
    const state = await setup(page);
    state.catalog.products = [
        { id: 'GEL', name: 'Forever Aloe Vera Gel', price: 99, benefits: 'Published benefit one. Published benefit two.', consumption: 'Follow the bottle label.', image: 'aloe-vera-gel.jpg' },
        { id: 'GELLY', name: 'Forever Aloe Vera Gelly', price: 55, benefits: 'External skin product.', image: 'aloe-vera-gelly.jpg' }
    ];
    await page.goto('/'); await expect(page.locator('#catalog-count')).toContainText('2 of 2');
    await page.getByRole('button', { name: 'Open shop assistant', exact: true }).click();
    await chatText(page, 'what are the benefits of aloe vera gel');
    await expect(page.locator('#chat-body')).toContainText('Published benefit one. Published benefit two.');
    await expect(page.locator('#chat-body')).not.toContainText('100% pure');
    await expect(page.locator('#chat-body')).not.toContainText('External skin product');
    await chatText(page, 'how much?');
    await expect(page.locator('#chat-body')).toContainText('RM 99.00');
    await chatText(page, 'can it cure diabetes');
    await expect(page.locator('#chat-body')).toContainText('qualified healthcare professional');
    await chatText(page, 'how do I use aloe');
    await page.getByRole('button', { name: 'Forever Aloe Vera Gel', exact: true }).click();
    await expect(page.locator('#chat-body')).toContainText('Follow the bottle label.');
    expect(state.bot).toHaveLength(0);
});
test('unpaid receipt requests do not download receipts; missing benefits are disclosed', async ({ page }) => {
    const state = await setup(page); state.botOrders = [{ invoiceId: 'INV-UNPAID', paid: false, status: 'Processed', items: 'T1x1' }];
    await loaded(page); await signIntoChat(page); await chatText(page, 'can I get my receipt');
    await expect(page.locator('#chat-body')).toContainText('receipt is available only after');
    expect(state.bot.some(r => r.action === 'getCustomerDocument')).toBe(false);
    await chatText(page, 'what are the benefits of herbal tea');
    await expect(page.locator('#chat-body')).toContainText('does not include benefit information');
    await page.evaluate(() => { const c = document.createElement('canvas'); c.id = 'fl-fx-canvas'; c.style.cssText = 'position:fixed;inset:0;z-index:1000;pointer-events:none'; document.body.appendChild(c); });
    await expect(page.locator('#eshop-chat-widget')).toHaveCSS('z-index', '1000');
    await expect(page.locator('#fl-fx-canvas')).toHaveCSS('z-index', '999');
});


test('invoice downloads use the selected authenticated order and no mutation action', async ({ page }) => {
    const state = await setup(page); state.botOrders = [{ invoiceId: 'INV-DOC', status: 'Processed', paid: false, items: 'A1x1' }];
    await loaded(page); await signIntoChat(page);
    const downloaded = page.waitForEvent('download');
    await chatText(page, 'download my invoice');
    const doc = await downloaded;
    expect(doc.suggestedFilename()).toBe('invoice-test.pdf');
    expect(state.bot.find(r => r.action === 'getCustomerDocument').data).toEqual({ invoiceId: 'INV-DOC', type: 'invoice', token: 'bot-session' });
    await expect(page.locator('#chat-body')).toContainText('Your invoice download for INV-DOC has started');
});


test('expired order-help context is cleared and a new login uses only newly returned orders', async ({ page }) => {
    const state = await setup(page); state.botOrders = [{ invoiceId: 'INV-PRIVATE-OLD', paid: false, status: 'Processed', items: 'A1x1' }];
    await loaded(page); await signIntoChat(page);
    state.botExpired = true;
    await chatText(page, 'cancel my order');
    await expect(page.locator('#chat-body').getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.locator('#chat-body')).not.toContainText('INV-PRIVATE-OLD');
    state.botExpired = false; state.botOrders = [{ invoiceId: 'INV-NEW', paid: false, status: 'Processed', items: 'T1x1' }];
    await page.locator('#chat-body').getByLabel('Email', { exact: true }).fill('different@example.com');
    await page.locator('#chat-body').getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('#chat-body')).toContainText('INV-NEW is currently Pending payment');
    await expect(page.locator('#chat-body')).not.toContainText('INV-PRIVATE-OLD');
});
