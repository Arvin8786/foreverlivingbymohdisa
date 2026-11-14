/* Grounded answers: public facts stay in the catalog; private facts use authenticated APIs. */
function chatHelpSuggestions(options) {
    const host = addChatMessage('bot', '', 'html'); host.classList.add('chat-help-actions');
    for (const [action, label] of options) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-help-button';
        button.dataset.chatAction = action; button.textContent = label; host.appendChild(button);
    }
    return host;
}
function chatShopRequest(topic, order) {
    const requests = {
        cancel: `Hi, I would like to request cancellation of order ${order.invoiceId}. Please confirm whether it can be cancelled.`,
        returns: `Hi, I need help with a return/refund or item issue for order ${order.invoiceId}. Please tell me the next steps.`,
        amend: `Hi, I would like to request a change to order ${order.invoiceId}. Please confirm what can still be changed.`,
        payment: `Hi, please help me verify payment for order ${order.invoiceId}.`
    };
    const host = addChatMessage('bot', '', 'html');
    const link = document.createElement('a'); link.className = 'chat-human-link'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.href = chatWhatsAppUrl() + '?text=' + encodeURIComponent(requests[topic] || `Hi, I need help with order ${order.invoiceId}.`);
    link.textContent = 'Ask the shop on WhatsApp'; host.appendChild(link);
    const note = document.createElement('small'); note.className = 'chat-request-note';
    note.textContent = 'Opens a draft for you to review and send. No request has been sent yet.'; host.appendChild(note);
}
function chatChooseOrder(topic, orders) {
    chatSession.pendingOrderTopic = topic;
    const host = addChatMessage('bot', 'Which order do you mean? Choose its reference so I use the right record.');
    for (const order of orders) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-help-button';
        button.dataset.chatOrder = order.invoiceId; button.textContent = `${order.invoiceId} · ${StoreCore.customerOrderStatus(order)}`;
        host.appendChild(button);
    }
    scrollChatToEnd();
}
async function chatOrderHelp(topic, question = '') {
    if (!chatSession.token) { showChatLogin('help-' + topic); return; }
    chatSession.lastPersonalAction = 'help-' + topic;
    const result = await customerChatRequest('getCustomerOrders');
    if (!result?.success) { addChatMessage('bot', result?.message || 'I could not check your orders. Please try again.'); return; }
    const orders = Array.isArray(result.orders) ? result.orders : [];
    chatSession.recentOrders = orders;
    if (!orders.length) { addChatMessage('bot', 'There are no orders in this account yet. If you ordered with another email, sign in with that account or ask the shop to check your order reference.'); return; }
    const references = question.match(/\bINV-[a-z0-9-]+/gi) || [];
    let order = references.length ? orders.find(o => references.some(ref => ref.toLowerCase() === String(o.invoiceId).toLowerCase())) : orders.find(o => o.invoiceId === chatSession.selectedOrderId);
    if (references.length && !order) {
        addChatMessage('bot', 'That reference is not in the orders returned for your signed-in account. Please choose one of your orders or check that you used the right email.');
        chatChooseOrder(topic, orders); return;
    }
    if (!order && orders.length === 1) order = orders[0];
    if (!order) { chatChooseOrder(topic, orders); return; }
    chatSession.selectedOrderId = order.invoiceId;
    const status = StoreCore.customerOrderStatus(order);
    const reference = String(order.invoiceId);
    if (topic === 'status') {
        renderChatOrders({ orders: [order] }, true, true);
        if (/\b(when|arrive|how long|receive)\b/i.test(question)) { addChatMessage('bot', 'This order record provides a delivery stage rather than a confirmed arrival date. The shop can help check courier timing.'); chatShopRequest('status', order); }
        return;
    }
    if (topic === 'invoice' || topic === 'receipt') {
        if (topic === 'receipt' && !StoreCore.paymentVerified(order)) {
            addChatMessage('bot', `Order ${reference} is ${status}. A receipt is available only after the shop verifies payment. If you already paid, ask the shop to check it; do not pay again just because verification is pending.`);
            chatShopRequest('payment', order); chatHelpSuggestions([['help-invoice', 'Get my invoice']]); return;
        }
        const doc = await customerChatRequest('getCustomerDocument', { invoiceId: reference, type: topic });
        if (!doc?.success || !doc.base64) { addChatMessage('bot', doc?.message || `The ${topic} is not available yet. You can also check My Account → My Orders.`); return; }
        addChatMessage('bot', downloadPdfBase64(doc.base64, doc.filename || `${reference}-${topic}.pdf`) ? `Your ${topic} download for ${reference} has started.` : 'The document could not be downloaded. Open My Account → My Orders to try again.');
        return;
    }
    if (topic === 'payment') {
        addChatMessage('bot', StoreCore.paymentVerified(order)
            ? `The shop’s record confirms payment for ${reference}. Its current order status is ${status}. If you have a payment discrepancy, ask the shop to check the reference.`
            : `${reference} is Pending payment: the shop has not confirmed payment in its records. If you have not paid, follow the invoice instructions. If you already paid, do not pay again; ask the shop to verify it. I cannot approve a bank transfer from chat.`);
        chatHelpSuggestions([['help-invoice', 'Get my invoice']]); chatShopRequest('payment', order); return;
    }
    if (topic === 'cancel') {
        if (status === 'Cancelled' || status === 'Refunded') {
            addChatMessage('bot', `${reference} is already marked ${status} in the shop’s records. Ask the shop if you need clarification about payment or a refund; I cannot confirm a refund transfer.`); return;
        }
        const dispatched = ['On the Way', 'Delivered'].includes(status);
        addChatMessage('bot', `${reference} is currently ${status}. ${dispatched ? 'Because it is marked as dispatched or delivered, ask the shop about cancellation or return options.' : 'I can help you request a cancellation, but the shop must review and confirm it.'} I have not cancelled this order or sent a request. Until the shop updates its record, do not assume it has been cancelled.`);
    } else if (topic === 'amend') {
        addChatMessage('bot', `${reference} is currently ${status}. Tell the shop which items or delivery details you want to change and ask it to confirm. Updating your profile will not change this existing order. I have not changed or submitted anything.`);
    } else {
        addChatMessage('bot', `${reference} is currently ${status}. Describe the item issue to the shop using this reference. The shop must confirm return/refund eligibility and next steps; I cannot promise approval, an amount or a refund date.`);
    }
    chatShopRequest(topic, order);
    chatHelpSuggestions([['help-status', 'Check this order’s status'], ['choose-orders', 'Choose another order']]);
}
function chatProductAnswer(question, topic, chosenId) {
    let matches = chosenId ? products.filter(product => product.id === chosenId) : AssistantKnowledge.productMatches(question, products);
    const current = findProduct(productRoute()) || findProduct(chatSession.selectedProductId);
    if (!matches.length && current && (/\b(it|its|this|that|the product)\b/i.test(question) || /^(and )?(the )?(price|how much|usage|benefits|what is the price|whats the price)$/.test(AssistantKnowledge.normalize(question)))) matches = [current];
    if (!matches.length) return false;
    const host = addChatMessage('bot', '');
    if (matches.length > 1) {
        host.textContent = 'There are several matching products. Which one do you mean? Choose a name so I use its own price and product details.';
        for (const product of matches.slice(0, 8)) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-help-button';
            button.dataset.chatProduct = product.id; button.dataset.chatTopic = topic; button.dataset.chatQuestion = question; button.textContent = product.name; host.appendChild(button);
        }
        scrollChatToEnd(); return true;
    }
    const product = matches[0]; chatSession.selectedProductId = product.id;
    if (topic === 'price') host.textContent = product.price === null ? `The catalog does not provide a valid current price for ${product.name}. Please ask the shop before ordering.` : `${product.name} is listed at RM ${Number(product.price).toFixed(2)}. Shipping is calculated separately in the cart. The shop confirms the final order total.`;
    else if (topic === 'stock') host.textContent = `${product.name} appears in the catalog, but the public data does not confirm stock quantities. Ask the shop to confirm availability before paying.`;
    else {
        const usage = /\b(use|usage|consume|consumption|take|dosage|cara guna)\b/i.test(question);
        const details = usage ? product.consumption : product.benefits;
        host.textContent = details ? `${product.name} — ${usage ? 'published usage information' : 'published product information'}:\n${details}` : `The catalog does not include ${usage ? 'usage instructions' : 'benefit information'} for ${product.name}. Check the product label or ask the shop; I will not invent details.`;
    }
    const open = document.createElement('button'); open.type = 'button'; open.className = 'chat-help-button'; open.dataset.chatViewProduct = product.id; open.textContent = 'View this product'; host.appendChild(open);
    scrollChatToEnd(); return true;
}
async function answerShopQuestion(text) {
    const topic = AssistantKnowledge.intent(text);
    const privateReference = /\b(my|this|that|it|INV-[a-z0-9-]+|saya|ini)\b/i.test(text);
    const orderTopics = ['cancel', 'returns', 'amend', 'invoice', 'receipt', 'payment'];
    if (orderTopics.includes(topic)) {
        if (chatSession.token && (chatSession.selectedOrderId || privateReference)) { await chatOrderHelp(topic, text); return true; }
        if (!chatSession.token && privateReference) { showChatLogin('help-' + topic); return true; }
        addChatMessage('bot', AssistantKnowledge.answer(text).answer);
        chatHelpSuggestions([['help-' + topic, 'Choose my order'], ['human', 'Ask the shop']]); return true;
    }
    if (topic === 'status') { await chatOrderHelp('status', text); return true; }
    if (topic === 'orders') { await handleChatAction('orders'); return true; }
    if (topic === 'rewards') {
        if (/\b(my|balance|total|how many|do i have|saya)\b/i.test(text)) await handleChatAction('rewards');
        else { addChatMessage('bot', AssistantKnowledge.answer(text).answer); chatHelpSuggestions([['rewards', 'Check my reward points']]); }
        return true;
    }
    if (topic === 'health') { addChatMessage('bot', AssistantKnowledge.answer(text).answer); return true; }
    if (['price', 'product', 'stock'].includes(topic)) {
        if (chatProductAnswer(text, topic)) return true;
        addChatMessage('bot', AssistantKnowledge.answer(text).answer); chatHelpSuggestions([['browse', 'Browse products']]); return true;
    }
    if (topic === 'shipping') {
        if (shippingRules.length && catalogLoaded) {
            const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
            addChatMessage('bot', cart.length ? `Your current cart subtotal is RM ${subtotal.toFixed(2)} and the applicable shipping charge is RM ${calcShipping(subtotal).toFixed(2)}. Review both in your cart before submitting. This is not a delivery-date guarantee.` : 'Shipping is calculated from the current shop rules and cart value. Add the products you want to see the applicable charge before ordering. I do not have a confirmed courier delivery date.');
        } else addChatMessage('bot', AssistantKnowledge.answer(text).answer);
        chatHelpSuggestions([['shop', 'Open my cart'], ['help-status', 'Track my order']]); return true;
    }
    if (['account', 'discount', 'greeting', 'thanks', 'shopping'].includes(topic)) {
        addChatMessage('bot', AssistantKnowledge.answer(text).answer);
        if (topic === 'account') chatHelpSuggestions([['orders', 'Sign in to my account']]);
        if (topic === 'shopping') chatHelpSuggestions([['browse', 'Browse products'], ['shop', 'Open my cart']]);
        return true;
    }
    return false;
}
