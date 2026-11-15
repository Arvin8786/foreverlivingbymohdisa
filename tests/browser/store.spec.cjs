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
    const profile = { pac: 'C1', customerName: 'Test customer', customerEmail: 'test@example.com', customerPhone: '60123', customerAddress: 'Test address' };
    const state = { failed: false, reply: {}, requests: [], catalog: structuredClone(catalog), customerRequests: [], expired: false, sessions: new Map(), customer: profile, loginCount: 0, networkLogoutFailure: false, rejectLogin: false, sessionFailure: false, orderHold: null, catalogHold: null, catalogPending: false,
        orders: [{ invoiceId: 'INV-1', date: 'Today', status: 'Cancelled', total: 40, items: 'Aloe cream', paid: false }] };
    await page.context().route('**/*', async route => {
        const req = route.request(); const url = new URL(req.url());
        if (url.hostname === 'script.google.com') {
            if (state.failed && req.method() === 'GET') return route.fulfill({ status: 503, body: 'Unavailable' });
            if (req.method() === 'GET') {
                if (state.catalogHold) { state.catalogPending = true; await state.catalogHold; }
                return route.fulfill({ json: state.catalog });
            }
            const body = req.postDataJSON(); state.requests.push(body);
            const customerActions = ['verifyCustomer', 'getCustomerSession', 'getCustomerOrders', 'getCustomerRewards', 'getCustomerDocument', 'updateCustomerProfile', 'changeCustomerPassword', 'customerLogout'];
            if (customerActions.includes(body.action)) state.customerRequests.push(body);
            if (body.action === 'verifyCustomer') {
                if (state.rejectLogin) return route.fulfill({ json: { success: false, message: 'Invalid email or password.' } });
                const token = ++state.loginCount === 1 ? 'portal-session' : 'portal-session-' + state.loginCount;
                state.sessions.set(token, { ...state.customer });
                return route.fulfill({ json: { success: true, token, customer: state.customer } });
            }
            if (body.action === 'customerLogout') {
                if (state.networkLogoutFailure) return route.abort();
                state.sessions.delete(body.data.token); return route.fulfill({ json: { success: true } });
            }
            if (customerActions.includes(body.action)) {
                if (state.expired || !state.sessions.has(body.data.token)) return route.fulfill({ json: { success: false, message: 'SESSION_EXPIRED' } });
                if (body.action === 'getCustomerSession' && state.sessionFailure) return route.fulfill({ status: 503, body: 'Unavailable' });
                if (body.action === 'getCustomerSession') return route.fulfill({ json: { success: true, customer: state.sessions.get(body.data.token) } });
                if (body.action === 'updateCustomerProfile') {
                    Object.assign(state.sessions.get(body.data.token), { customerName: body.data.customerName, customerPhone: body.data.customerPhone, customerAddress: body.data.customerAddress });
                    return route.fulfill({ json: { success: true, message: 'Profile saved.' } });
                }
            }
            const ordersAtRequest = structuredClone(state.orders);
            if (body.action === 'getCustomerOrders' && state.orderHold) await state.orderHold;
            const replies = {
                logInitialOrder: state.reply, getContactInfo: { success: true, whatsappNumber: '601234', contactNumber: 'Test contact' },
                getCustomerOrders: { success: true, orders: ordersAtRequest, stages: ['Processed', 'Paid', 'Awaiting Shipment', 'On the Way', 'Delivered'] },
                getCustomerRewards: { success: true, balance: 50, history: [], pointsPerRm: 1 },
                getCustomerDocument: { success: true, filename: body.data.type === 'receipt' ? 'Receipt_' + body.data.invoiceId + '.pdf' : 'invoice-test.pdf', base64: Buffer.from('%PDF-1.4\nTest invoice').toString('base64') },
                changeCustomerPassword: { success: true },
                verifyAgent: { success: true, token: 'agent-session', agent: { name: 'Test agent', id: 'AG1' }, target: 100, currentSales: 0, profile: {}, isAdmin: false, isManager: false },
                getPortalData: { success: true, products: [], customers: [], shippingRules: [] }, getOpenOrders: { success: true, orders: [] }
            };
            return route.fulfill({ json: replies[body.action] || { success: false, message: 'Forbidden' } });
        }
        if (url.hostname !== '127.0.0.1') return route.abort();
        return route.continue();
    });
    return state;
}
async function primaryLogin(page, email = 'test@example.com') {
    await page.locator('#customer-email-input').fill(email); await page.locator('#customer-password-input').fill('test-password');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/index.html$/);
    await expect(page.getByRole('link', { name: 'My profile', exact: true })).toBeVisible();
}
async function openAccountOrders(page) {
    await primaryLogin(page);
    await page.getByRole('link', { name: 'My profile', exact: true }).click();
    await expect(page.locator('#portal-view')).toBeVisible();
    await page.locator('#nav-my-orders-btn').click();
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
    expect(state.requests.filter(r => r.action === 'logInitialOrder').every(request => !Object.hasOwn(request.data, 'token'))).toBe(true);
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
    expect(state.customerRequests).toHaveLength(0);
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
    await page.getByRole('link', { name: 'Sign in to my account', exact: true }).click();
    await primaryLogin(page);
    await expect(page.getByRole('heading', { name: 'Your order status', exact: true })).toBeVisible();
    await expect(page.locator('#chat-body')).not.toContainText('test-password');
    expect(state.customerRequests.map(r => r.action)).toEqual(['verifyCustomer', 'getCustomerSession', 'getCustomerOrders']);
});

test('customer portal shows cancelled status without processed progress and sends session token', async ({ page }) => {
    const state = await setup(page); await page.goto('/customer.html');
    await openAccountOrders(page);
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
    state.orders = [{ invoiceId: 'INV-PENDING', date: 'Today', status: 'Delivered', total: 95, shippingFee: 0, items: 'A1x2, T1x1', paid: false, points: 95 }];
    await page.goto('/customer.html');
    await openAccountOrders(page);
    const order = page.locator('.order-card');
    await expect(order.locator('.order-items-line').first()).toHaveText('Aloe cream × 2, Herbal tea × 1');
    await expect(order.locator('.badge')).toHaveText('Pending payment');
    await expect(order.locator('.tracker .now .lbl')).toHaveText('Pending payment');
    await expect(order.getByRole('button', { name: 'Download receipt', exact: true })).toHaveCount(0);
    await expect(order.locator('.pts')).toHaveCount(0);
    state.orders[0].paid = true; state.orders[0].status = 'Processed';
    await page.locator('#nav-my-orders-btn').click();
    await expect(order.locator('.badge')).toHaveText('Paid');
    await expect(order.getByRole('button', { name: 'Download receipt', exact: true })).toBeVisible();
    state.orders[0].paymentStatus = 'Unpaid'; state.orders[0].status = 'On the Way';
    await page.locator('#nav-my-orders-btn').click();
    await expect(order.locator('.badge')).toHaveText('Pending payment');
    state.orders[0].paymentStatus = 'Paid';
    await page.locator('#nav-my-orders-btn').click();
    await expect(order.locator('.badge')).toHaveText('On the Way');
});

test('historical saved names work without the public catalog and remain escaped', async ({ page }) => {
    const state = await setup(page); state.failed = true;
    state.orders = [{ invoiceId: 'OLD', status: 'Processed', paid: false, total: 10, itemDetails: [{ id: 'DELISTED', name: '<img src=x onerror=alert(1)> Saved product', quantity: 2 }] }];
    await page.goto('/customer.html');
    await openAccountOrders(page);
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
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await primaryLogin(page);
    await page.getByRole('button', { name: 'Open shop assistant', exact: true }).click();
    await page.getByRole('button', { name: /Check orders/ }).click();
    await expect(page.getByRole('heading', { name: 'Your orders', exact: true })).toBeVisible();
}
test('screenshot cancellation question uses the current order and only prepares a request draft', async ({ page }) => {
    const state = await setup(page);
    state.orders = [{ invoiceId: 'INV-2026-ONE', status: 'Processed', paid: false, total: 240, items: 'A1x2' }];
    await loaded(page); await signIntoChat(page);
    await chatText(page, 'can i cancel this order ?');
    await expect(page.locator('#chat-body')).toContainText('INV-2026-ONE is currently Pending payment');
    await expect(page.locator('#chat-body')).toContainText('I have not cancelled this order or sent a request');
    const link = page.getByRole('link', { name: 'Ask the shop on WhatsApp', exact: true });
    const url = new URL(await link.getAttribute('href'));
    expect(url.hostname).toBe('wa.me'); expect(url.searchParams.get('text')).toContain('INV-2026-ONE');
    expect(url.searchParams.get('text')).not.toMatch(/test@example|Test address/);
    expect(state.customerRequests.every(r => ['verifyCustomer', 'getCustomerSession', 'getCustomerOrders'].includes(r.action))).toBe(true);
    await chatText(page, 'I have already paid');
    await expect(page.locator('#chat-body')).toContainText('do not pay again');
    expect(state.customerRequests.some(r => /cancel|refund|update|submit/i.test(r.action))).toBe(false);
});
test('multiple orders require explicit selection; unknown references do not select another account record', async ({ page }) => {
    const state = await setup(page);
    state.orders = [
        { invoiceId: 'INV-ONE', status: 'Processed', paid: false, items: 'A1x1' },
        { invoiceId: 'INV-TWO', status: 'Delivered', paid: true, items: 'T1x1' }
    ];
    await loaded(page); await signIntoChat(page); await chatText(page, 'can I cancel this order');
    await expect(page.locator('#chat-body')).toContainText('Which order do you mean?');
    await page.getByRole('button', { name: 'INV-TWO · Delivered', exact: true }).click();
    await expect(page.locator('#chat-body')).toContainText('INV-TWO is currently Delivered');
    await chatText(page, 'cancel INV-NOT-MINE');
    await expect(page.locator('#chat-body')).toContainText('not in the orders returned for your signed-in account');
    expect(state.customerRequests.some(r => r.action === 'cancelOrder')).toBe(false);
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
    expect(state.customerRequests).toHaveLength(0);
});
test('unpaid receipt requests do not download receipts; missing benefits are disclosed', async ({ page }) => {
    const state = await setup(page); state.orders = [{ invoiceId: 'INV-UNPAID', paid: false, status: 'Processed', items: 'T1x1' }];
    await loaded(page); await signIntoChat(page); await chatText(page, 'can I get my receipt');
    await expect(page.locator('#chat-body')).toContainText('receipt is available only after');
    expect(state.customerRequests.some(r => r.action === 'getCustomerDocument')).toBe(false);
    await chatText(page, 'what are the benefits of herbal tea');
    await expect(page.locator('#chat-body')).toContainText('does not include benefit information');
    await page.evaluate(() => { const c = document.createElement('canvas'); c.id = 'fl-fx-canvas'; c.style.cssText = 'position:fixed;inset:0;z-index:1000;pointer-events:none'; document.body.appendChild(c); });
    await expect(page.locator('#eshop-chat-widget')).toHaveCSS('z-index', '1000');
    await expect(page.locator('#fl-fx-canvas')).toHaveCSS('z-index', '999');
});


test('invoice downloads use the selected authenticated order and no mutation action', async ({ page }) => {
    const state = await setup(page); state.orders = [{ invoiceId: 'INV-DOC', status: 'Processed', paid: false, items: 'A1x1' }];
    await loaded(page); await signIntoChat(page);
    const downloaded = page.waitForEvent('download');
    await chatText(page, 'download my invoice');
    const doc = await downloaded;
    expect(doc.suggestedFilename()).toBe('invoice-test.pdf');
    expect(state.customerRequests.find(r => r.action === 'getCustomerDocument').data).toEqual({ invoiceId: 'INV-DOC', type: 'invoice', token: 'portal-session' });
    await expect(page.locator('#chat-body')).toContainText('Your invoice download for INV-DOC has started');
});


test('expired order-help context is cleared and a new login uses only newly returned orders', async ({ page }) => {
    const state = await setup(page); state.orders = [{ invoiceId: 'INV-PRIVATE-OLD', paid: false, status: 'Processed', items: 'A1x1' }];
    await loaded(page); await signIntoChat(page);
    state.expired = true;
    await chatText(page, 'cancel my order');
    await expect(page.getByRole('link', { name: 'Sign in to my account', exact: true })).toBeVisible();
    await expect(page.locator('#chat-body')).not.toContainText('INV-PRIVATE-OLD');
    state.expired = false; state.orders = [{ invoiceId: 'INV-NEW', paid: false, status: 'Processed', items: 'T1x1' }];
    await page.getByRole('link', { name: 'Sign in to my account', exact: true }).click();
    await primaryLogin(page, 'different@example.com');
    await expect(page.locator('#chat-body')).toContainText('INV-NEW is currently Pending payment');
    await expect(page.locator('#chat-body')).not.toContainText('INV-PRIVATE-OLD');
});

test('selected order immediately shows a summary and answers the screenshot item question with recorded detail', async ({ page }) => {
    const state = await setup(page);
    state.orders = [{ invoiceId: 'INV-DETAILED', date: '14 Nov 2026', status: 'Processed', paid: false, total: '125.00', shippingFee: '10.00', itemDetails: [
        { id: 'A1', name: 'Historical Aloe cream', quantity: 2, customPrice: 35 }, { id: 'T1', name: 'Herbal tea', quantity: 3, price: 15 }
    ] }];
    state.catalog.products[2].benefits = 'Published tea information.'; state.catalog.products[2].consumption = 'Tea label directions.';
    await loaded(page); await signIntoChat(page);
    await page.getByRole('button', { name: 'Ask about this order', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your order details', exact: true })).toBeVisible();
    await expect(page.locator('.chat-results').last()).toContainText('Historical Aloe cream');
    await expect(page.locator('.chat-results').last()).toContainText('14 Nov 2026');
    await expect(page.locator('.chat-results').last()).toContainText('RM 125.00');
    await chatText(page, 'what are the items ordered');
    let answer = page.locator('.chat-results').last();
    await expect(answer.getByRole('heading', { name: 'Items in this order', exact: true })).toBeVisible();
    await expect(answer.locator('.chat-order-line-list li')).toHaveCount(2);
    await expect(answer).toContainText('Quantity: 2'); await expect(answer).toContainText('Quantity: 3');
    await chatText(page, 'how many?');
    await expect(page.locator('.chat-results').last()).toContainText('5 units in total');
    await chatText(page, 'how much?');
    await expect(page.locator('.chat-results').last()).toContainText('Order total');
    await expect(page.locator('.chat-results').last()).toContainText('RM 125.00');
    await chatText(page, 'how much was shipping?');
    await expect(page.locator('.chat-results').last()).toContainText('RM 10.00');
    await chatText(page, 'when was it placed?');
    await expect(page.locator('.chat-results').last()).toContainText('14 Nov 2026');
    await chatText(page, 'where is it going?');
    await expect(page.locator('.chat-results').last()).toContainText('current profile address may differ');
    await expect(page.locator('.chat-results').last()).not.toContainText('Test address');
    await chatText(page, 'what was the price of each item in this order');
    await expect(page.locator('.chat-results').last()).toContainText('RM 35.00');
    await expect(page.locator('.chat-results').last()).not.toContainText('RM 40.00');
    await chatText(page, 'tell me more about those items');
    await expect(page.locator('#chat-body')).toContainText('Which item from this order');
    await chatText(page, 'the second one');
    await expect(page.locator('#chat-body')).toContainText('Published tea information.');
    await chatText(page, 'how much?');
    await expect(page.locator('.chat-text').last()).toContainText('Herbal tea is listed at RM 15.00');
    await chatText(page, 'tell me more');
    await expect(page.locator('.chat-text').last()).toContainText('Published tea information.');
    await expect(page.locator('.chat-text').last()).toContainText('Tea label directions.');
    await expect(page.locator('.chat-text').last()).toContainText('Current catalog price: RM 15.00');
    expect(state.customerRequests.every(request => ['verifyCustomer', 'getCustomerSession', 'getCustomerOrders'].includes(request.action))).toBe(true);
});

test('order clarification accepts ordinals and keeps explicit references ahead of latest-order wording', async ({ page }) => {
    const state = await setup(page);
    state.orders = [{ invoiceId: 'INV-RECENT', status: 'Processed', paid: false, items: 'A1x1', total: 50, shippingFee: 10 }, { invoiceId: 'INV-OLDER', status: 'Paid', paid: true, items: 'T1x2', total: 30, shippingFee: 0 }];
    await loaded(page); await signIntoChat(page); await chatText(page, 'how many orders do I have?');
    await expect(page.locator('.chat-text').last()).toContainText('2 orders for your account');
    await chatText(page, 'what did I buy?');
    await expect(page.locator('#chat-body')).toContainText('Which order do you mean?');
    await chatText(page, 'the second one');
    await expect(page.locator('.chat-results').last()).toContainText('INV-OLDER');
    await expect(page.locator('.chat-results').last()).toContainText('Herbal tea');
    await chatText(page, 'show my latest order');
    await expect(page.locator('.chat-results').last()).toContainText('INV-RECENT');
    await chatText(page, 'show my latest order INV-NOT-MINE');
    await expect(page.locator('.chat-text').filter({ hasText: 'That reference is not in the orders' }).last()).toBeVisible();
});

test('missing historical quantities and prices are disclosed without guessing or replacing them with current prices', async ({ page }) => {
    const state = await setup(page); state.orders = [{ invoiceId: 'INV-INCOMPLETE', status: 'Processed', paid: false, items: 'Aloe cream' }];
    await loaded(page); await signIntoChat(page); await chatText(page, 'give me the order details');
    await expect(page.locator('.chat-results').last()).toContainText('Quantity not provided');
    await expect(page.locator('.chat-results').last()).toContainText('Not provided in this order record');
    await expect(page.locator('.chat-results').last()).not.toContainText('RM 0.00');
    await chatText(page, 'item prices');
    await expect(page.locator('.chat-results').last()).toContainText('today’s catalog prices may be different');
    await expect(page.locator('.chat-results').last()).not.toContainText('RM 40.00');
    const reads = state.customerRequests.length;
    await chatText(page, 'how much is shipping for the cart');
    expect(state.customerRequests.length).toBe(reads);
    await expect(page.locator('.chat-text').last()).toContainText('Add the products');
});

test('order-item questions require login and use fresh state after the session expires', async ({ page }) => {
    const state = await setup(page); state.orders = [{ invoiceId: 'INV-SECRET', paid: false, items: 'A1x1' }];
    await loaded(page); await page.getByRole('button', { name: 'Open shop assistant', exact: true }).click();
    await chatText(page, 'what are the items ordered');
    await expect(page.getByRole('link', { name: 'Sign in to my account', exact: true })).toBeVisible();
    expect(state.customerRequests).toHaveLength(0);
    await page.getByRole('link', { name: 'Sign in to my account', exact: true }).click();
    await primaryLogin(page);
    await expect(page.locator('.chat-results').last()).toContainText('INV-SECRET');
    state.expired = true;
    await chatText(page, 'how many items?');
    await expect(page.getByRole('link', { name: 'Sign in to my account', exact: true })).toBeVisible();
    await expect(page.locator('#chat-body')).not.toContainText('INV-SECRET');
});

test('returning customers restore one shared login without storing their password or profile in browser storage', async ({ page, context }) => {
    const state = await setup(page); await loaded(page);
    await page.getByRole('link', { name: 'Login', exact: true }).click(); await primaryLogin(page);
    const values = await page.evaluate(() => Object.values(localStorage));
    expect(values.join(' ')).not.toMatch(/test-password|Test address|customerName|customerEmail/);
    const saved = values.map(value => { try { return JSON.parse(value); } catch { return null; } }).find(value => value?.token);
    expect(Object.keys(saved).sort()).toEqual(['endpoint', 'expiresAt', 'token', 'version']);
    expect(saved.expiresAt).toBeGreaterThan(Date.now());
    expect(saved.expiresAt).toBeLessThanOrEqual(Date.now() + 6 * 60 * 60 * 1000);
    await page.close();
    const returning = await context.newPage(); await returning.goto('/index.html');
    await expect(returning.getByRole('link', { name: 'My profile', exact: true })).toBeVisible();
    await expect(returning.getByRole('link', { name: 'Login', exact: true })).toHaveCount(0);
    await returning.getByRole('button', { name: 'Open shop assistant', exact: true }).click();
    await returning.getByRole('button', { name: /Check orders/ }).click();
    await expect(returning.getByRole('heading', { name: 'Your orders', exact: true })).toBeVisible();
    await expect(returning.locator('#chat-body input[type="password"]')).toHaveCount(0);
    expect(state.loginCount).toBe(1);
    expect(state.customerRequests.filter(request => request.action === 'getCustomerSession').length).toBeGreaterThan(0);
});

test('My profile opens the existing customer interface and signed-in checkout uses the same verified session', async ({ page }) => {
    const state = await setup(page); await loaded(page);
    await page.evaluate(() => addToCart('A1'));
    await page.getByRole('link', { name: 'Login', exact: true }).click(); await primaryLogin(page);
    await expect(page.locator('#cart-count')).toHaveText('1');
    await page.getByRole('link', { name: 'My profile', exact: true }).click();
    await expect(page.locator('#my-profile-view')).toBeVisible();
    await page.getByLabel('Delivery address', { exact: true }).fill('Updated delivery address');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('#profile-status')).toHaveText('Profile saved.');
    await page.getByRole('link', { name: 'Back to shop', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Open shopping cart/ }).click();
    await expect(page.locator('#customer-address')).toHaveValue('Updated delivery address');
    await expect(page.locator('#customer-address')).toBeDisabled();
    await expect(page.locator('#cart-account-note')).toContainText('saved account');
    state.reply = { success: true, invoiceId: 'INV-SHARED', totalAmount: 50, shippingFee: 10 };
    await page.getByRole('button', { name: 'Complete Order', exact: true }).click();
    await expect(page.locator('.order-confirmation')).toContainText('INV-SHARED');
    const order = state.requests.find(request => request.action === 'logInitialOrder');
    expect(order.data.token).toBe('portal-session'); expect(order.data.customerAddress).toBe('Updated delivery address');
    expect(state.loginCount).toBe(1);
});

test('logging out from the profile clears shared state and private chat history in every open tab', async ({ page, context }) => {
    const state = await setup(page); state.orders = [{ invoiceId: 'INV-PRIVATE', status: 'Processed', paid: false, items: 'A1x1' }];
    await loaded(page); await signIntoChat(page);
    await expect(page.locator('#chat-body')).toContainText('INV-PRIVATE');
    const profile = await context.newPage(); await profile.goto('/customer.html#profile');
    await expect(profile.locator('#prof-name')).toHaveValue('Test customer');
    await profile.getByRole('button', { name: 'Log out', exact: true }).click();
    await expect(profile.locator('#login-form')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('#chat-body')).not.toContainText('INV-PRIVATE');
    await expect(page.getByRole('link', { name: 'My profile', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('portal-session')))).toBe(false);
    expect(state.sessions.size).toBe(0);
});

test('failed login never creates a shared session and guest browsing remains available', async ({ page }) => {
    const state = await setup(page); state.rejectLogin = true; await loaded(page);
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await page.locator('#customer-email-input').fill('test@example.com'); await page.locator('#customer-password-input').fill('wrong-password');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.locator('#login-status')).toHaveText('Invalid email or password.');
    await expect(page.locator('#customer-password-input')).toHaveValue('');
    expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('token')))).toBe(false);
    await page.getByRole('link', { name: 'Continue browsing as a guest', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('#catalog-count')).toContainText('4 of 4');
    await page.evaluate(() => showTab('products')); await expect(page.getByRole('searchbox')).toBeVisible();
});

test('an expired saved session is discarded on return without blocking the guest storefront', async ({ page }) => {
    await setup(page); await loaded(page); await page.getByRole('link', { name: 'Login', exact: true }).click(); await primaryLogin(page);
    await page.evaluate(() => {
        const key = Object.keys(localStorage).find(key => key.startsWith('fl-customer-session-v1:') && !key.endsWith(':profile-event'));
        const saved = JSON.parse(localStorage.getItem(key)); saved.expiresAt = Date.now() - 1; localStorage.setItem(key, JSON.stringify(saved));
    });
    await page.reload(); await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My profile', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open shop assistant', exact: true }).click();
    await page.getByRole('button', { name: /Check orders/ }).click();
    await expect(page.getByRole('link', { name: 'Sign in to my account', exact: true })).toBeVisible();
});

test('a temporary session-check outage preserves the token but blocks silent guest checkout', async ({ page }) => {
    const state = await setup(page); await loaded(page); await page.evaluate(() => addToCart('A1'));
    await page.getByRole('link', { name: 'Login', exact: true }).click(); await primaryLogin(page);
    state.sessionFailure = true; await page.reload();
    await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Open shopping cart/ }).click();
    await page.locator('#customer-name').fill('Guest draft'); await page.locator('#customer-phone').fill('123'); await page.locator('#customer-address').fill('Address');
    await page.getByRole('button', { name: 'Complete Order', exact: true }).click();
    await expect(page.locator('#checkout-status')).toContainText('sign-in could not be checked');
    expect(state.requests.some(request => request.action === 'logInitialOrder')).toBe(false);
    expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('portal-session')))).toBe(true);
    await page.evaluate(() => toggleCart(true));
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry existing sign-in', exact: true })).toBeVisible();
    state.sessionFailure = false; await page.getByRole('button', { name: 'Retry existing sign-in', exact: true }).click();
    await expect(page).toHaveURL(/index.html$/); await expect(page.getByRole('link', { name: 'My profile', exact: true })).toBeVisible();
    expect(state.loginCount).toBe(1);
});

test('logout clears browser credentials even when server logout is unavailable', async ({ page }) => {
    const state = await setup(page); await loaded(page); await page.getByRole('link', { name: 'Login', exact: true }).click(); await primaryLogin(page);
    state.networkLogoutFailure = true; await page.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('#shop-account-notice')).toContainText('could not confirm server logout');
    expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('portal-session')))).toBe(false);
});

test('an in-flight private response cannot cross a logout and another account login', async ({ page }) => {
    const state = await setup(page); await loaded(page); await page.getByRole('link', { name: 'Login', exact: true }).click(); await primaryLogin(page);
    let release; state.orderHold = new Promise(resolve => { release = resolve; });
    await page.evaluate(() => { window.oldPrivateResult = 'pending'; CustomerAuth.request('getCustomerOrders').then(result => { window.oldPrivateResult = result; }).catch(failure => { window.oldPrivateResult = failure.code; }); });
    await expect.poll(() => state.requests.some(request => request.action === 'getCustomerOrders')).toBe(true);
    await page.evaluate(() => CustomerAuth.logout());
    state.customer = { ...state.customer, pac: 'C2', customerName: 'Another customer', customerEmail: 'different@example.com' };
    await page.evaluate(() => CustomerAuth.login('different@example.com', 'test-password'));
    release();
    await expect.poll(() => page.evaluate(() => window.oldPrivateResult)).toBe('SESSION_CHANGED');
    await expect(page.locator('#chat-body')).not.toContainText('INV-1');
});

test('logging out during historical product-name lookup prevents late private orders from reappearing', async ({ page }) => {
    const state = await setup(page); state.orders = [{ invoiceId: 'INV-LOOKUP-PRIVATE', items: 'A1x1', paid: false }];
    await loaded(page); await page.getByRole('link', { name: 'Login', exact: true }).click(); await primaryLogin(page);
    await page.getByRole('link', { name: 'My profile', exact: true }).click();
    await expect(page.locator('#my-profile-view')).toBeVisible();
    let release; state.catalogHold = new Promise(resolve => { release = resolve; });
    await page.evaluate(() => { window.pendingPortalOrder = renderMyOrders(); });
    await expect.poll(() => state.catalogPending).toBe(true);
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await expect(page.locator('#login-form')).toBeVisible();
    release(); await page.evaluate(() => window.pendingPortalOrder);
    await expect(page.locator('#my-orders-list')).toBeEmpty();
});

test('customer receipts download only after verified payment and a refresh uses the shared account session', async ({ page }) => {
    const state = await setup(page);
    state.orders = [{ invoiceId: 'INV-RECEIPT', items: 'A1x1', paid: false, paymentStatus: 'Unpaid', status: 'Delivered' }];
    await page.goto('/customer.html'); await openAccountOrders(page);
    await expect(page.getByRole('button', { name: 'Download receipt', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Download invoice', exact: true })).toBeVisible();
    state.orders[0].paymentStatus = 'Paid'; state.orders[0].paid = true;
    await page.getByRole('button', { name: 'Refresh orders', exact: true }).click();
    const receipt = page.getByRole('button', { name: 'Download receipt', exact: true });
    await expect(receipt).toBeVisible();
    const downloadEvent = page.waitForEvent('download'); await receipt.click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('Receipt_INV-RECEIPT.pdf');
    expect(await download.failure()).toBeNull();
    await expect(page.locator('#document-status')).toHaveText('Your receipt download has started.');
    const request = state.customerRequests.find(request => request.action === 'getCustomerDocument');
    expect(request.data).toMatchObject({ invoiceId: 'INV-RECEIPT', type: 'receipt', token: 'portal-session' });
    state.orders[0].paymentStatus = 'Unpaid';
    await page.getByRole('button', { name: 'Refresh orders', exact: true }).click();
    await expect(receipt).toHaveCount(0);
});
