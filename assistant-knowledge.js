/* Website assistant knowledge v3. Shared verbatim with assistant-knowledge.js. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.AssistantKnowledge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    function normalize(question) {
        return String(question || '').toLowerCase().replace(/[’']/g, '').replace(/\b(cancle|cansel|cancal|cancell)\b/g, 'cancel').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    // Resolve questions by the information being requested, with explicit scope.
    // Context contains only focus/previous topic; it never supplies private records.
    function orderQuestion(question, context = {}) {
        const q = normalize(question);
        if (/\b(cart|checkout|new order)\b/.test(q) && !/\b(placed|previous|old|existing)\b/.test(q)) return null;
        const explicit = /\b(orders?|ordered|purchases?|purchased|bought|pesanan|INV-[a-z0-9-]+)\b/i.test(q) || /\b(what|which)\b.*\b(did i|have i|i have)\b.*\b(buy|order|purchase)\b/.test(q);
        const focused = context.focus === 'order';
        if (/\b(points?|rewards?)\b/.test(q)) return null;
        const followup = focused && (/\b(items?|contents?|quantity|quantities|how many|how much|how long|total|shipping|delivery|details|date|summary|breakdown)\b/.test(q) || /\b(it|its|this|that|those|them|one|ones)\b/.test(q) || /^(and |what about |how about )?(the )?(items|products|quantity|quantities|how many|how much|shipping|delivery charge|total|date|details|more|tell me more|show me everything)$/.test(q));
        const scope = explicit || followup;
        if (!scope) return null;
        if (/\b(change|amend|edit|update)\b/.test(q)) return null;
        if (focused && /^(the )?(order )?date$/.test(q)) return 'date';
        if (/\b(when|date)\b/.test(q) && /\b(placed|ordered|order|bought|purchased|purchase|made)\b/.test(q) && !/\b(will|arrive|arrival|deliver|delivery|ship|shipped)\b/.test(q)) return 'date';
        if (/\b(address|going|destination)\b/.test(q) || /\b(ship|deliver|sent) to\b/.test(q)) return 'address';
        if (/\b(shipping|delivery|postage)\b/.test(q) && (/\b(fee|fees|charge|charges|cost|amount|how much)\b/.test(q) || /^(and |what about )?(the )?(shipping|delivery charge)$/.test(q))) return 'shipping';
        if (/\b(how many|number of|count)\b.*\borders\b/.test(q)) return 'count';
        if (/\bhow many (days|weeks)\b/.test(q) || /\bhow long\b/.test(q)) return 'status';
        if (/\b(each|per item|per product|unit price|individual price|item prices)\b/.test(q)) return 'prices';
        if (/\b(how many|quantity|quantities|count|number of|units|pieces|bottles)\b/.test(q)) return 'quantity';
        if (/\b(benefits|usage|ingredients|used for)\b/.test(q) || /\bmore about\b.*\b(items?|products?|them)\b/.test(q)) return 'products';
        if (/\b(total|amount|how much|cost|payable|price)\b/.test(q) && !/\b(is it paid|have paid|already paid|payment status)\b/.test(q)) return 'total';
        if (/\b(items?|products?|contents?|contains?|included)\b/.test(q) || /\bwhat\b.*\b(did i|have i|i have|i|was|is in)\b.*\b(order|buy|purchase|bought|purchased)\b/.test(q) || /\bwhat\b.*\b(in|inside)\b.*\border\b/.test(q)) return 'items';
        if (/\b(status|track|where|arrive|arrival|delivery|shipment|shipped|pending|progress)\b/.test(q)) return 'status';
        if (/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth) order\b/.test(q)) return 'summary';
        if (/\b(tell|show|explain)\b.*\b(about|this|that|my)\b.*\border\b/.test(q)) return 'summary';
        if (/\b(summary|details|detail|breakdown|everything|information|latest|recent|last order)\b/.test(q) || (focused && /^(tell me more|more|details|show me everything)$/.test(q)) || /^inv-[a-z0-9-]+$/.test(q)) return 'summary';
        return null;
    }
    function selection(question, count, embedded = false) {
        const q = normalize(question);
        const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
        const direct = q.match(/^(?:(?:show|choose|select|pick|use)(?: me)? )?(?:the )?(\d+|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last)(?: (?:one|order|item|product))?(?: please)?$/);
        const match = direct || (embedded ? q.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth) order\b/) : null);
        if (!match) return null;
        const word = match[1];
        const index = word === 'last' ? count - 1 : /^\d+$/.test(word) ? Number(word) - 1 : words.indexOf(word);
        return index >= 0 && index < count ? index : null;
    }
    function intent(question, context = {}) {
        const q = normalize(question);
        if (/\b(cancer|diabetes|pregnan\w*|breastfeed\w*|medication|medicine|cure|diagnos\w*|disease|side effects?|allerg\w*)\b/.test(q)) return 'health';
        if (/\b(cancel\w*|batal\w*)\b/.test(q)) return 'cancel';
        if (/\b(refund\w*|return\w*|damaged|broken|wrong item|missing item|pulangkan)\b/.test(q)) return 'returns';
        if (/\b(change|amend|edit|update|tukar|ubah)\b/.test(q) && /\b(order|pesanan)\b/.test(q)) return 'amend';
        if (context.focus === 'product' && /^(tell me more|more|details|product details|what about it|tell me about it)$/.test(q)) return 'product';
        const orderTopic = orderQuestion(question, context);
        if (orderTopic) return 'order-' + orderTopic;
        if (/\b(receipt|resit)\b/.test(q)) return 'receipt';
        if (/\b(invoice|invois|qr code|payment instructions)\b/.test(q)) return 'invoice';
        if (/\b(pay\w*|paid|bayar\w*|bank transfer|duitnow|proof)\b/.test(q)) return 'payment';
        if (/\b(when|how long)\b.*\b(arrive|receive|reach|parcel|delivery|order)\b/.test(q)) return 'status';
        if (/\b(track\w*|status|where|mana)\b/.test(q) && /\b(order|delivery|parcel|pesanan|shipment)\b/.test(q)) return 'status';
        if (/\b(shipping|delivery|postage|courier|dispatch|penghantaran)\b/.test(q)) return 'shipping';
        if (/\b(points?|rewards?|mata ganjaran)\b/.test(q)) return 'rewards';
        if (/\b(password|forgot|reset|log ?in|sign ?in|register|kata laluan)\b/.test(q)) return 'account';
        if (/\b(stock|available|availability|in stock|sold out|stok)\b/.test(q)) return 'stock';
        if (/\b(discount|coupon|promotion|promo|offer|free gift)\b/.test(q)) return 'discount';
        if (/\b(price|prices|cost|how much|harga|rm\d*)\b/.test(q)) return 'price';
        if (/\b(use|usage|consume|consumption|ingredients?|benefits?|take|dosage|dose|apply|cara guna)\b/.test(q)) return 'product';
        if (/\b(discount|coupon|promotion|promo|offer|free gift)\b/.test(q)) return 'discount';
        if (/\b(place|make|buy|purchase|checkout|cart|beli)\b/.test(q)) return 'shopping';
        if (/\b(my|previous|past|show|check|view|list)\b.*\b(orders?|purchases?)\b/.test(q)) return 'orders';
        if (/^(hi|hello|hey|hai|salam|good morning|good afternoon|good evening)\b/.test(q)) return 'greeting';
        if (/^(thanks|thank you|tq|terima kasih)\b/.test(q)) return 'thanks';
        return null;
    }
    const answers = {
        cancel: 'You can ask the shop to cancel an order. I cannot cancel it automatically or guarantee approval. Choose the order first, then contact the shop with its reference; it remains active until the shop confirms the cancellation.',
        returns: 'For a return, refund, damaged delivery or wrong item, contact the shop with your order reference and describe the issue. The shop must confirm eligibility, next steps and any refund timing. I cannot approve a return or refund in chat.',
        amend: 'Changing your profile does not change an order you already placed. Choose the order and ask the shop to confirm whether its items or delivery details can still be changed. I will not modify an existing order automatically.',
        invoice: 'Your invoice is available under My Account → My Orders → Invoice. It contains the order and payment instructions. Sign in here and choose an order if you want help finding it.',
        receipt: 'A payment receipt is available after the shop verifies payment in Google Sheets. An invoice or order confirmation alone is not proof of payment. Check My Account → My Orders after verification.',
        payment: 'Use the payment instructions on your order invoice. “Pending payment” means the shop has not yet confirmed payment in its records. If you already paid, do not pay again just because that label is still showing; ask the shop to verify your payment using the order reference. I cannot verify a transfer from a chat message or screenshot.',
        status: 'Sign in and choose Order status to view the latest status recorded by the shop. I cannot infer a delivery date from an order number or guarantee courier timing.',
        shipping: 'Shipping charges depend on the current shop rules and cart value. Add products to your cart to see the applicable charge before submitting. For an existing delivery, sign in and check Order status; ask the shop about timing if no date is recorded.',
        rewards: 'My Account shows your reward balance and history after sign-in. Order points depend on the shop’s earning rules and payment verification. I cannot promise a redemption, discount or points adjustment that the shop has not confirmed.',
        account: 'Use the email and password registered in the customer portal. Choose My Account to sign in; use Forgot password in the sign-in form to reset it. Never type a password or verification code into the chat transcript.',
        stock: 'Being listed in the catalog does not by itself confirm stock. Open the product for its published details, or ask the shop to confirm availability and quantities before paying.',
        price: 'Which product would you like the price for? Tell me its name or product code, or choose Browse products. I will use the current website catalog rather than guess a price.',
        product: 'Which product do you mean? Tell me its name or choose a product page so I can use its published details and usage information.',
        health: 'I can help locate published product information, but cannot diagnose a condition, promise a cure or determine whether a supplement is safe with medicines, pregnancy or allergies. Check the ingredients and label with a qualified healthcare professional before using it.',
        discount: 'I can show published prices and the cart’s shipping offers. I cannot create discount codes, promise free gifts or apply an unlisted offer. The final order must be confirmed by the shop.',
        shopping: 'Browse products, add the items and quantities you want, then open the cart. Review the current prices, shipping and delivery details before pressing Complete Order. You can shop without signing in; chatting alone does not place an order.',
        greeting: 'Hello! I can help with product details and prices, shopping, payment instructions, invoices, orders, reward points and profile updates. General questions do not need login; personal details do.',
        thanks: 'You’re welcome. What else can I help you with?',
        orders: 'Sign in and choose Check orders to view the purchases associated with your customer portal account.',
        unknown: 'Could you tell me a little more? I can help with a product name or price, placing an order, payment, an invoice, delivery status, reward points, or a cancellation/return request. Choose an option or describe what you want to do.'
    };
    function answer(question) {
        const topic = intent(question);
        const orderAnswer = topic?.startsWith('order-') ? 'Sign in and choose an order. I can show its recorded items and quantities, order date, totals, shipping charge, payment and delivery status. Historical details come from the order record or invoice, not today’s catalog prices.' : null;
        return { success: true, intent: topic || 'unknown', answer: orderAnswer || answers[topic || 'unknown'] };
    }
    function productMatches(question, products) {
        const q = normalize(question);
        const includesPhrase = value => {
            const phrase = normalize(value).replace(/^forever /, '');
            return phrase && (' ' + q + ' ').includes(' ' + phrase + ' ');
        };
        const exact = products.filter(p => {
            const id = normalize(p.id);
            const codeMatch = /^\d+$/.test(id) ? q === id || ['code ', 'sku ', 'product '].some(prefix => (' ' + q + ' ').includes(' ' + prefix + id + ' ')) : includesPhrase(id);
            return codeMatch || includesPhrase(p.name);
        });
        if (exact.length) return exact;
        const terms = new Set(q.split(' ').filter(w => w.length > 2 && !['the', 'what', 'are', 'how', 'does', 'for', 'this', 'that', 'can', 'you', 'benefits', 'price', 'use', 'product', 'forever'].includes(w)));
        const scored = products.map(product => ({ product, score: normalize(product.name).split(' ').filter(w => w.length > 2 && terms.has(w)).length }));
        const best = Math.max(0, ...scored.map(p => p.score));
        return best ? scored.filter(p => p.score === best).map(p => p.product) : [];
    }
    return { normalize, intent, answer, orderQuestion, selection, productMatches, version: 3 };
});
