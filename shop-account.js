/* Storefront navigation and assistant share the customer portal's authentication. */
const CHAT_RETURN_KEY = 'fl-chat-return-v1:' + new URL('.', document.baseURI).pathname;
const CHAT_RETURN_ACTIONS = new Set(['orders', 'status', 'rewards', 'profile', 'help-cancel', 'help-returns', 'help-amend', 'help-invoice', 'help-receipt', 'help-payment', 'help-status', 'help-summary', 'help-items', 'help-quantity', 'help-total', 'help-shipping', 'help-date', 'help-address', 'help-prices', 'help-products', 'help-count']);
function rememberChatReturn(action) {
    if (!CHAT_RETURN_ACTIONS.has(action)) return;
    try { sessionStorage.setItem(CHAT_RETURN_KEY, JSON.stringify({ action, expiresAt: Date.now() + 10 * 60 * 1000 })); } catch { /* Signing in still works without a chat return hint. */ }
}
function consumeChatReturn() {
    if (!CustomerAuth.getState().authenticated) return;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(CHAT_RETURN_KEY) || 'null'); sessionStorage.removeItem(CHAT_RETURN_KEY); } catch { return; }
    if (saved?.expiresAt > Date.now() && CHAT_RETURN_ACTIONS.has(saved.action) && CustomerAuth.getState().authenticated) {
        toggleChatWidget(true); runChatTask(() => handleChatAction(saved.action));
    }
}
function syncCheckoutAccount(state) {
    const fields = { 'customer-name': 'customerName', 'customer-email': 'customerEmail', 'customer-phone': 'customerPhone', 'customer-address': 'customerAddress' };
    for (const [id, property] of Object.entries(fields)) {
        const field = document.getElementById(id); if (!field) continue;
        if (state.authenticated) {
            field.value = state.customer[property] || ''; field.disabled = true; field.dataset.accountOwned = 'true';
        } else if (field.dataset.accountOwned) {
            field.value = ''; field.disabled = false; delete field.dataset.accountOwned;
        }
    }
    const note = document.getElementById('cart-account-note');
    if (note) {
        note.hidden = !state.authenticated;
        note.replaceChildren();
        if (state.authenticated) {
            note.append(document.createTextNode('Using your saved account and delivery details. '));
            const link = document.createElement('a'); link.href = 'customer.html#profile'; link.textContent = 'Update My profile before ordering'; note.appendChild(link);
        }
    }
}
function setupShopAccount() {
    const loginItem = document.getElementById('nav-login-item');
    const profileItem = document.getElementById('nav-profile-item');
    const logoutItem = document.getElementById('nav-logout-item');
    const login = document.getElementById('nav-login-btn');
    CustomerAuth.subscribe((state, reason) => {
        loginItem.hidden = state.authenticated; profileItem.hidden = !state.authenticated; logoutItem.hidden = !state.authenticated && state.status !== 'unavailable';
        login.textContent = state.status === 'checking' ? 'Checking sign-in…' : 'Login';
        if (state.status === 'checking') { login.removeAttribute('href'); login.setAttribute('aria-disabled', 'true'); }
        else { login.href = 'customer.html?login=1'; login.removeAttribute('aria-disabled'); }
        const previous = chatSession.token;
        if (previous && (!state.authenticated || previous !== state.sessionId)) {
            chatSession = {}; document.getElementById('chat-body')?.replaceChildren();
        }
        if (state.authenticated) { chatSession.token = state.sessionId; chatSession.customer = state.customer; }
        else { delete chatSession.token; delete chatSession.customer; }
        updateChatIdentity(); syncCheckoutAccount(state);
        if (previous !== chatSession.token && document.getElementById('eshop-chat-widget')?.classList.contains('active')) displayMainMenu();
        if (reason === 'logout') { try { sessionStorage.removeItem(CHAT_RETURN_KEY); } catch {} }
        if (reason === 'expired') document.getElementById('shop-account-notice').textContent = 'Your sign-in expired. General shopping is still available; sign in again for personal details.';
        else if (reason === 'login' || reason === 'restored') document.getElementById('shop-account-notice').textContent = '';
    });
    document.getElementById('nav-logout-btn').addEventListener('click', async () => {
        const result = await CustomerAuth.logout();
        document.getElementById('shop-account-notice').textContent = result.serverConfirmed ? 'You are signed out.' : 'You are signed out on this browser. The account service could not confirm server logout.';
    });
    CustomerAuth.initialize().then(() => consumeChatReturn());
}
