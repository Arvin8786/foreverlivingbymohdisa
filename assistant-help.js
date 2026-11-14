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
function chatRecordedAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
    if (typeof value !== 'string' || !/^\s*(?:RM\s*)?\d[\d,]*(?:\.\d+)?\s*$/i.test(value)) return null;
    const amount = Number(value.replace(/RM|,|\s/gi, ''));
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
function chatOrderLines(order) {
    const names = StoreCore.customerOrderItems(order, products);
    const saved = Array.isArray(order.itemDetails) && order.itemDetails.length ? order.itemDetails : Array.isArray(order.items) ? order.items : null;
    const legacy = typeof order.items === 'string' ? order.items.split(',').map(value => value.trim()).filter(Boolean) : [];
    return names.map((item, index) => {
        const detail = saved?.[index];
        const match = legacy[index]?.match(/^(.+?)\s*[xX×*]\s*(\d+)$/);
        const rawQuantity = detail ? detail.quantity ?? detail.qty : match?.[2];
        const quantity = Number(rawQuantity);
        const knownQuantity = rawQuantity !== undefined && rawQuantity !== null && Number.isInteger(quantity) && quantity > 0;
        const unitPrice = detail ? chatRecordedAmount(detail.unitPrice ?? detail.customPrice ?? detail.price) : null;
        return { name: item.name, id: detail?.id ?? detail?.sku ?? match?.[1]?.trim(), quantity: knownQuantity ? quantity : null, unitPrice };
    });
}
function chatOrderSummary(order, topic = 'summary') {
    const items = chatOrderLines(order);
    const total = chatRecordedAmount(order.total ?? order.totalAmount);
    const shipping = chatRecordedAmount(order.shippingFee);
    const status = StoreCore.customerOrderStatus(order);
    const money = amount => amount === null ? 'Not provided in this order record' : `RM ${amount.toFixed(2)}`;
    const titles = { summary: 'Your order details', items: 'Items in this order', total: 'Your order total', shipping: 'Shipping for this order', quantity: 'Quantities ordered', date: 'Order date', address: 'Order delivery address', prices: 'Recorded item prices' };
    const heading = titles[topic] || titles.summary;
    const rows = [];
    if (topic === 'summary' || topic === 'date') rows.push(['Ordered on', order.date || 'Date not provided in this order record']);
    if (['summary', 'total', 'shipping'].includes(topic)) {
        if (topic !== 'shipping') rows.push(['Order total', money(total)]);
        rows.push(['Shipping charge', money(shipping)]);
        if (topic !== 'shipping' && total !== null && shipping !== null && shipping <= total) rows.push(['Total excluding shipping', money(Math.round((total - shipping) * 100) / 100)]);
    }
    if (topic === 'summary' || topic === 'address') {
        const address = order.customerAddress || order.deliveryAddress || order.customer?.address;
        if (address) rows.push(['Delivery address on this order', address]);
        else if (topic === 'address') rows.push(['Delivery address', 'Not included in this order response. Open the invoice to check it; your current profile address may differ.']);
    }
    let itemHtml = '';
    if (['summary', 'items', 'quantity', 'prices'].includes(topic)) {
        itemHtml = items.length ? `<ul class="chat-order-line-list">${items.map(item => `<li><strong>${esc(item.name)}</strong><span>${item.quantity === null ? 'Quantity not provided' : 'Quantity: ' + esc(item.quantity)}${topic === 'prices' ? '<br>Recorded unit price: ' + esc(money(item.unitPrice)) + (item.unitPrice !== null && item.quantity !== null ? '<br>Line total: ' + esc(money(Math.round(item.unitPrice * item.quantity * 100) / 100)) : '') : ''}</span></li>`).join('')}</ul>` : '<p>No item details were returned for this order.</p>';
        if (items.length && items.every(item => item.quantity !== null)) rows.push(['Items ordered', `${items.length} product ${items.length === 1 ? 'line' : 'lines'} · ${items.reduce((sum, item) => sum + item.quantity, 0)} units in total`]);
    }
    const notes = [];
    if (topic === 'prices' && items.some(item => item.unitPrice === null)) notes.push('Historical unit prices are not included for every item. Use the invoice for the original breakdown; today’s catalog prices may be different.');
    if (topic === 'shipping' && shipping === null) notes.push('I will not substitute today’s cart shipping rate for a missing historical charge. The invoice has the order’s original figures.');
    if (['summary', 'total'].includes(topic)) notes.push(StoreCore.paymentVerified(order) ? 'Payment is marked verified in the shop’s record.' : 'Payment is still awaiting shop verification. If you have already paid, do not pay again—ask the shop to check your reference.');
    const host = addChatMessage('bot', `<div class="chat-result-heading">${chatIcon('orders')}<h3>${heading}</h3></div><article class="chat-order-card"><div class="chat-order-top"><strong>${esc(order.invoiceId)}</strong><span class="chat-status-badge${status === 'Delivered' ? ' is-delivered' : ''}">${esc(status)}</span></div>${itemHtml}<dl class="chat-order-facts">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${topic === 'summary' && order.remarks ? `<p class="chat-order-remarks">${esc(order.remarks)}</p>` : ''}${notes.map(note => `<p class="chat-order-note">${esc(note)}</p>`).join('')}</article>`, 'html');
    host.classList.add('chat-results');
    chatSession.lastOrderTopic = topic;
    chatHelpSuggestions([['help-items', 'Items ordered'], ['help-total', 'Order totals'], ['help-shipping', 'Shipping charge'], ['help-invoice', 'Download invoice'], ['help-products', 'About these products']]);
    scrollChatToEnd();
}
function chatOrderedProducts(order, question) {
    const lines = chatOrderLines(order);
    const matches = lines.map(item => products.find(product => String(product.id) === String(item.id)) || products.find(product => AssistantKnowledge.normalize(product.name) === AssistantKnowledge.normalize(item.name))).filter(Boolean);
    if (!matches.length) {
        addChatMessage('bot', 'The current catalog does not contain details for these ordered items. Your order history is still available, but I cannot invent benefits or usage instructions. The shop can help identify the products.');
        chatShopRequest('products', order); return;
    }
    if (matches.length === 1) { chatProductAnswer(question || matches[0].name, 'product', matches[0].id); return; }
    const host = addChatMessage('bot', 'Which item from this order would you like to know more about? I’ll use its current published product information, not treat today’s price as the price you originally paid.');
    chatSession.pendingProductChoice = { ids: matches.map(p => p.id), question: question || 'benefits', topic: 'product' };
    for (const product of matches) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-help-button';
        button.dataset.chatProduct = product.id; button.dataset.chatTopic = 'product'; button.dataset.chatQuestion = question || 'benefits'; button.textContent = product.name; host.appendChild(button);
    }
}

async function chatOrderHelp(topic, question = '') {
    if (!chatSession.token) { showChatLogin('help-' + topic); return; }
    delete chatSession.pendingProductChoice;
    chatSession.lastPersonalAction = 'help-' + topic;
    const result = await customerChatRequest('getCustomerOrders');
    if (!result?.success) { addChatMessage('bot', result?.message || 'I could not check your orders. Please try again.'); return; }
    const orders = Array.isArray(result.orders) ? result.orders : [];
    chatSession.recentOrders = orders;
    if (topic === 'count') {
        chatSession.focus = 'order'; chatSession.lastOrderTopic = topic;
        const pending = orders.filter(order => StoreCore.customerOrderStatus(order) === 'Pending payment').length;
        addChatMessage('bot', `The shop returned ${orders.length} ${orders.length === 1 ? 'order' : 'orders'} for your account. ${pending} ${pending === 1 ? 'is' : 'are'} currently Pending payment. Cancelled/refunded orders are included in the total if present in your history.`);
        chatHelpSuggestions([['orders', 'View all my orders']]); return;
    }
    if (!orders.length) { addChatMessage('bot', 'There are no orders in this account yet. If you ordered with another email, sign in with that account or ask the shop to check your order reference.'); return; }
    const references = question.match(/\bINV-[a-z0-9-]+/gi) || [];
    const displayedOrders = chatSession.displayedOrderIds || orders.map(order => order.invoiceId);
    const position = AssistantKnowledge.selection(question, displayedOrders.length, true);
    const newest = /\b(latest|most recent|last order)\b/i.test(question);
    if (references.length > 1) { addChatMessage('bot', 'Please choose one order reference so I do not mix their details.'); chatChooseOrder(topic, orders.filter(order => references.some(ref => ref.toLowerCase() === String(order.invoiceId).toLowerCase()))); return; }
    let order = references.length ? orders.find(o => references.some(ref => ref.toLowerCase() === String(o.invoiceId).toLowerCase())) : newest ? orders[0] : position !== null ? orders.find(order => order.invoiceId === displayedOrders[position]) : orders.find(o => o.invoiceId === chatSession.selectedOrderId);
    if (references.length && !order) {
        addChatMessage('bot', 'That reference is not in the orders returned for your signed-in account. Please choose one of your orders or check that you used the right email.');
        chatChooseOrder(topic, orders); return;
    }
    if (!order && orders.length === 1) order = orders[0];
    if (!order) { chatChooseOrder(topic, orders); return; }
    chatSession.selectedOrderId = order.invoiceId;
    chatSession.focus = 'order';
    chatSession.lastOrderTopic = topic;
    if (['summary', 'items', 'quantity', 'total', 'shipping', 'date', 'address', 'prices'].includes(topic)) { chatOrderSummary(order, topic); return; }
    if (topic === 'products') { chatOrderedProducts(order, question); return; }
    const status = StoreCore.customerOrderStatus(order);
    const reference = String(order.invoiceId);
    if (topic === 'status') {
        renderChatOrders({ orders: [order] }, true, true);
        if (/\b(when|arrive|how long|receive|days|weeks)\b/i.test(question)) { addChatMessage('bot', 'This order record provides a delivery stage rather than a confirmed arrival date. The shop can help check courier timing.'); chatShopRequest('status', order); }
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
    const followup = /\b(it|its|this|that|the product)\b/i.test(question) || /^(and )?(the )?(price|how much|usage|benefits|what is the price|whats the price|tell me more|more|details|product details)$/.test(AssistantKnowledge.normalize(question));
    if (!matches.length && followup && chatSession.pendingProductChoice) matches = products.filter(product => chatSession.pendingProductChoice.ids.includes(product.id));
    if (!matches.length && followup && current) matches = [current];
    if (!matches.length) return false;
    const host = addChatMessage('bot', '');
    if (matches.length > 1) {
        chatSession.focus = 'product'; delete chatSession.pendingOrderTopic;
        chatSession.pendingProductChoice = { ids: matches.slice(0, 8).map(p => p.id), question, topic };
        host.textContent = 'There are several matching products. Which one do you mean? Choose a name so I use its own price and product details.';
        for (const product of matches.slice(0, 8)) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-help-button';
            button.dataset.chatProduct = product.id; button.dataset.chatTopic = topic; button.dataset.chatQuestion = question; button.textContent = product.name; host.appendChild(button);
        }
        scrollChatToEnd(); return true;
    }
    const product = matches[0]; chatSession.selectedProductId = product.id; chatSession.focus = 'product'; delete chatSession.pendingProductChoice; delete chatSession.pendingOrderTopic;
    const detailed = /\b(more|details|information|tell|about)\b/i.test(question);
    if (detailed && topic === 'product') host.textContent = `${product.name} — published catalog details\n\nBenefits / product information:\n${product.benefits || 'Not provided in the current catalog.'}\n\nUsage information:\n${product.consumption || 'Not provided in the current catalog; check the product label.'}\n\nCurrent catalog price: ${product.price === null ? 'Not available' : 'RM ' + Number(product.price).toFixed(2)}. This is today’s catalog information, not a historical order-price breakdown.`;
    else if (topic === 'price') host.textContent = product.price === null ? `The catalog does not provide a valid current price for ${product.name}. Please ask the shop before ordering.` : `${product.name} is listed at RM ${Number(product.price).toFixed(2)}. Shipping is calculated separately in the cart. The shop confirms the final order total.`;
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
const explicitProduct = AssistantKnowledge.productMatches(text, products).length > 0 && !/\b(order|ordered|bought|purchased|invoice|each|per item|was|did|charged)\b/i.test(text);
    const topic = AssistantKnowledge.intent(text, { focus: explicitProduct ? 'product' : chatSession.focus, previousTopic: chatSession.lastOrderTopic });
    if (topic?.startsWith('order-')) { await chatOrderHelp(topic.slice(6), text); return true; }
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
    if (!topic && chatSession.focus === 'order' && /\b(order|items?|purchase|details|more|it|this|that)\b/i.test(text)) { await chatOrderHelp('summary', text); return true; }
    return false;
}
