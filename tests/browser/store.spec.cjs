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
    const state = { failed: false, reply: {}, requests: [], catalog: structuredClone(catalog), bot: [] };
    await page.route('**/*', async route => {
        const req = route.request(); const url = new URL(req.url());
        if (url.hostname === 'script.google.com') {
            if (state.failed && req.method() === 'GET') return route.fulfill({ status: 503, body: 'Unavailable' });
            if (req.method() === 'GET') return route.fulfill({ json: state.catalog });
            const body = req.postDataJSON(); state.requests.push(body);
            const replies = {
                logInitialOrder: state.reply, getContactInfo: { success: true, whatsappNumber: '601234', contactNumber: 'Test contact' },
                verifyCustomer: { success: true, token: 'portal-session', customer: { customerName: 'Test customer', pac: 'C1' } },
                getCustomerOrders: { success: true, orders: [{ invoiceId: 'INV-1', date: 'Today', status: 'Cancelled', total: 40, items: 'Aloe cream', paid: false }] },
                verifyAgent: { success: true, token: 'agent-session', agent: { name: 'Test agent', id: 'AG1' }, target: 100, currentSales: 0, profile: {}, isAdmin: false, isManager: false },
                getPortalData: { success: true, products: [], customers: [], shippingRules: [] }, getOpenOrders: { success: true, orders: [] }
            };
            return route.fulfill({ json: replies[body.action] || { success: false, message: 'Forbidden' } });
        }
        if (url.hostname === 'whatsapp-eshop-bot.onrender.com') {
            const body = req.postDataJSON(); state.bot.push(body);
            if (body.action === 'getSmartAnswer') return route.fulfill({ json: { success: true, answer: 'Catalog help is available.' } });
            if (body.action === 'customerLogin') return route.fulfill({ json: { success: true, token: 'bot-session', customer: { customerName: 'Test customer', customerEmail: 'test@example.com', customerPhone: '60123', customerAddress: 'Test address' } } });
            if (body.action === 'getCustomerOrders') return route.fulfill({ json: { success: true, orders: [{ invoiceId: 'INV-1', status: 'On the Way', total: 40, items: 'Aloe cream' }] } });
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
    await expect(page.getByText('Catalog help is available.', { exact: true })).toBeVisible();
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
