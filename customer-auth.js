/* One customer session for the storefront, customer portal and assistant. */
(function () {
    'use strict';
    const TTL = 6 * 60 * 60 * 1000;
    const KEY = 'fl-customer-session-v1:' + new URL('.', document.baseURI).pathname;
    const EVENT_KEY = KEY + ':profile-event';
    const privateActions = new Set(['getCustomerSession', 'getCustomerOrders', 'getCustomerRewards', 'getCustomerDocument', 'getCustomerPortalData', 'updateCustomerProfile', 'changeCustomerPassword', 'saveCustomerCart']);
    const publicActions = new Set(['registerCustomer', 'requestPasswordReset', 'resetPassword', 'getContactInfo']);
    const listeners = new Set();
    let record = null, customer = null, status = 'guest', sessionId = null;
    let generation = 0, restoring = null, timer = null, initialized = false, lastValidation = 0;
    const endpoint = () => window.FL_CONFIG?.SCRIPT_URL || '';
    const error = (message, code) => Object.assign(new Error(message), { code });
    const safeCustomer = source => ({
        pac: String(source?.pac ?? ''), customerName: String(source?.customerName ?? ''), customerEmail: String(source?.customerEmail ?? ''),
        customerPhone: String(source?.customerPhone ?? ''), customerAddress: String(source?.customerAddress ?? ''), totalPoints: Number(source?.totalPoints) || 0
    });
    function state() {
        return { status, authenticated: status === 'signed-in', customer: customer ? { ...customer } : null, sessionId, expiresAt: record?.expiresAt || null };
    }
    function notify(reason) {
        const snapshot = state();
        for (const listener of listeners) listener(snapshot, reason);
        window.dispatchEvent(new CustomEvent('customer-auth-change', { detail: { ...snapshot, reason } }));
    }
    function removeStored() {
        for (const storage of ['localStorage', 'sessionStorage']) { try { window[storage].removeItem(KEY); } catch { /* Storage may be disabled. */ } }
    }
    function clear(reason = 'logout') {
        generation++; record = null; customer = null; sessionId = null; status = 'guest';
        clearTimeout(timer); removeStored(); notify(reason); return state();
    }
    function readStored() {
        for (const storage of ['localStorage', 'sessionStorage']) {
            try {
                const saved = JSON.parse(window[storage].getItem(KEY) || 'null');
                if (saved?.version === 1 && typeof saved.token === 'string' && saved.token.length > 0 && saved.token.length <= 512 && Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now() && saved.endpoint === endpoint()) return saved;
            } catch { /* Try session storage if persistent storage is unavailable. */ }
        }
        return null;
    }
    function persist(saved) {
        const serialized = JSON.stringify(saved);
        try { localStorage.setItem(KEY, serialized); try { sessionStorage.removeItem(KEY); } catch {} return; } catch { /* Private browser mode may only support this tab. */ }
        try { sessionStorage.setItem(KEY, serialized); return; } catch { throw error('Your browser is blocking sign-in storage. Allow site storage and try again.', 'STORAGE_UNAVAILABLE'); }
    }
    function expiryTimer() {
        clearTimeout(timer);
        if (record) timer = setTimeout(() => clear('expired'), Math.max(0, record.expiresAt - Date.now()));
    }
    async function raw(action, data) {
        if (!endpoint()) throw error('The account service is not configured. Please contact the shop.', 'UNAVAILABLE');
        let response;
        try {
            response = await fetch(endpoint(), { method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, data }), signal: AbortSignal.timeout(25000) });
        } catch { throw error('The account service could not be reached. Please try again.', 'UNAVAILABLE'); }
        if (!response.ok) throw error('The account service is unavailable. Please try again.', 'UNAVAILABLE');
        let result;
        try { result = await response.json(); } catch { throw error('The account service returned an invalid response. Please try again.', 'UNAVAILABLE'); }
        if (!result || typeof result !== 'object' || Array.isArray(result)) throw error('The account service returned an invalid response.', 'UNAVAILABLE');
        if (result.success === false && result.message === 'SESSION_EXPIRED') throw error('Your session expired. Please sign in again.', 'SESSION_EXPIRED');
        return result;
    }
    function restore(force = false) {
        initialized = true;
        if (restoring && !force) return restoring;
        const saved = readStored();
        if (!saved) { clear(record ? 'expired' : 'guest'); return Promise.resolve(state()); }
        if (!force && record?.token === saved.token && status === 'signed-in') return Promise.resolve(state());
        const same = record?.token === saved.token;
        const revision = ++generation;
        lastValidation = Date.now();
        record = saved;
        if (!same) { customer = null; sessionId = crypto.randomUUID(); }
        if (!customer) status = 'checking';
        notify('checking'); expiryTimer();
        const pending = (async () => {
            try {
                const result = await raw('getCustomerSession', { token: saved.token });
                if (revision !== generation) return state();
                if (!result.success || !result.customer?.pac) throw error('Your account could not be checked. Please try again.', 'UNAVAILABLE');
                customer = safeCustomer(result.customer); status = 'signed-in'; lastValidation = Date.now(); notify('restored');
            } catch (failure) {
                if (revision !== generation) return state();
                if (failure.code === 'SESSION_EXPIRED') clear('expired');
                else { status = customer ? 'signed-in' : 'unavailable'; notify('unavailable'); }
            }
            return state();
        })();
        restoring = pending;
        pending.finally(() => { if (restoring === pending) restoring = null; });
        return pending;
    }
    async function login(email, password) {
        if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) throw error('Email and password are required.', 'INVALID_LOGIN');
        const revision = ++generation;
        const previous = record;
        const result = await raw('verifyCustomer', { email: email.trim(), password });
        if (revision !== generation) throw error('Your sign-in changed. Please try again.', 'SESSION_CHANGED');
        if (!result.success || typeof result.token !== 'string' || !result.token || !result.customer?.pac) throw error(result.message || 'Check your email and password.', 'INVALID_LOGIN');
        const saved = { version: 1, token: result.token, endpoint: endpoint(), expiresAt: Date.now() + TTL };
        try { persist(saved); } catch (failure) { raw('customerLogout', { token: saved.token }).catch(() => {}); throw failure; }
        record = saved; customer = safeCustomer(result.customer); sessionId = crypto.randomUUID(); status = 'signed-in'; initialized = true;
        lastValidation = Date.now(); expiryTimer(); notify('login');
        if (previous?.token && previous.token !== record.token) raw('customerLogout', { token: previous.token }).catch(() => {});
        return state();
    }
    async function logout() {
        const token = record?.token || readStored()?.token;
        clear('logout');
        if (!token) return { serverConfirmed: true };
        try { const result = await raw('customerLogout', { token }); return { serverConfirmed: result.success === true }; }
        catch { return { serverConfirmed: false }; }
    }
    async function requireSession() {
        if (initialized && readStored()?.token !== record?.token) await restore(true);
        if (!initialized || status === 'checking') await restore();
        if (record && record.expiresAt <= Date.now()) clear('expired');
        if (status === 'unavailable') throw error('Your existing sign-in could not be checked. Retry sign-in, or sign out to continue as a guest.', 'UNAVAILABLE');
        if (!record || status !== 'signed-in') throw error('Please sign in to view your account.', 'SESSION_EXPIRED');
    }
    async function request(action, data = {}) {
        if (!privateActions.has(action)) throw error('This account action is not supported.', 'UNSUPPORTED_ACTION');
        await requireSession();
        const token = record.token, identity = sessionId;
        let result;
        try { result = await raw(action, { ...data, token }); }
        catch (failure) { if (failure.code === 'SESSION_EXPIRED' && identity === sessionId) clear('expired'); throw failure; }
        if (identity !== sessionId || token !== record?.token) throw error('Your session changed. Please try again.', 'SESSION_CHANGED');
        if (action === 'updateCustomerProfile' && result.success) {
            customer = { ...customer, customerName: String(data.customerName ?? customer.customerName), customerPhone: String(data.customerPhone ?? customer.customerPhone), customerAddress: String(data.customerAddress ?? customer.customerAddress) };
            notify('profile');
            try { localStorage.setItem(EVENT_KEY, crypto.randomUUID()); } catch { /* The current page remains up to date. */ }
        }
        return result;
    }
    async function submitOrder(data) {
        if (initialized && readStored()?.token !== record?.token) await restore(true);
        if (!initialized || status === 'checking') await restore();
        if (status === 'unavailable') throw error('Your sign-in could not be checked. Please retry or sign out before ordering.', 'ACCOUNT_UNVERIFIED');
        if (record && record.expiresAt <= Date.now()) { clear('expired'); throw error('Your session expired. Please sign in again or review your details as a guest.', 'SESSION_EXPIRED'); }
        const token = status === 'signed-in' ? record.token : null;
        const identity = sessionId;
        let result;
        try { result = await raw('logInitialOrder', { ...data, ...(token ? { token } : {}) }); }
        catch (failure) { if (failure.code === 'SESSION_EXPIRED' && identity === sessionId) clear('expired'); throw failure; }
        if (identity !== sessionId) throw error('Your account changed while the order was submitted. Check My Account before retrying.', 'SESSION_CHANGED');
        return result;
    }
    window.addEventListener('storage', event => {
        if (event.key === KEY) {
            const saved = readStored();
            if (!saved) clear('logout');
            else if (saved.token !== record?.token) restore(true);
        } else if (event.key === EVENT_KEY && record) restore(true);
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && readStored() && Date.now() - lastValidation > 60000) restore(true); });
    window.addEventListener('pageshow', event => { if (event.persisted) restore(true); });
    window.CustomerAuth = {
        initialize: () => restore(), refresh: () => restore(true), getState: state, login, logout, request, submitOrder,
        publicRequest: (action, data = {}) => publicActions.has(action) ? raw(action, data) : Promise.reject(error('Unsupported public action.', 'UNSUPPORTED_ACTION')),
        subscribe: listener => { listeners.add(listener); listener(state(), 'initial'); return () => listeners.delete(listener); }
    };
})();
