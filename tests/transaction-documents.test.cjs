'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../apps-script/transaction-documents.gs'), 'utf8');
const logo = fs.readFileSync(path.join(__dirname, '../FL.jpg'));
function context(extra = {}) {
    const ctx = vm.createContext({
        console, CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
        UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getBlob: () => ({ getBytes: () => Array.from(logo), getContentType: () => 'image/jpeg' }) }) },
        Utilities: { base64Encode: bytes => Buffer.from(bytes).toString('base64'), formatDate: () => '15 Nov 2026' },
        Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
        getCompanyInfo_: () => ({ name: 'Forever Living by Muhd Isa', address: 'Johor Bahru, Johor, Malaysia', phone: '+60 11-5444 3154' }),
        SITE_URL: 'https://arvin8786.github.io/foreverlivingbymohdisa/',
        htmlEsc_: value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
        money2_: value => 'RM ' + Number(value).toFixed(2), INVOICE_DUE_DAYS: 7, PAYMENT_EXTRA_INSTRUCTIONS: '', PAYMENT_QR_BASE64: '',
        isPaidValue_: value => /^(paid|approved|completed|yes|true)$/i.test(String(value).trim()), ...extra
    });
    vm.runInContext(code, ctx); return ctx;
}
const doc = { invoiceId: 'INV-SAMPLE', date: '2026-11-15', paidDate: '2026-11-15', lines: [{ sku: 'A1', name: 'Sample product', qty: 2, list: 40, unit: 40, line: 80, discountPct: 0 }], customer: { name: '<script>Sample</script>', address: 'Sample address' }, subtotal: 80, total: 90, shipping: 10, pointsEarned: 80 };
test('invoice and receipt embed the actual repository PNG and a named clickable shop link', () => {
    const fetched = []; const ctx = context();
    ctx.UrlFetchApp.fetch = url => { fetched.push(url); return { getResponseCode: () => 200, getBlob: () => ({ getBytes: () => Array.from(logo), getContentType: () => 'image/jpeg' }) }; };
    for (const type of ['invoice', 'receipt']) {
        const html = ctx.buildDocHtml_(doc, type);
        assert.match(html, /src="data:image\/png;base64,/);
        const encoded = html.match(/src="data:image\/png;base64,([^"]+)/)[1];
        assert.deepEqual(Buffer.from(encoded, 'base64'), logo);
        assert.match(html, /<a href="https:\/\/arvin8786.github.io\/foreverlivingbymohdisa\/"[^>]*>Forever Living by Muhd Isa Eshop<\/a>/);
        assert.ok(!html.includes('<script>Sample</script>')); assert.ok(html.includes('&lt;script&gt;Sample&lt;/script&gt;'));
        assert.ok(html.indexOf('alt="Forever Living by Muhd Isa logo"') < html.indexOf('>Forever Living by Muhd Isa</div>'));
        assert.match(html, type === 'receipt' ? /TOTAL PAID/ : /TOTAL DUE/);
    }
    assert.ok(fetched.every(url => url === 'https://raw.githubusercontent.com/Arvin8786/foreverlivingbymohdisa/main/FL.jpg'));
});
test('unavailable or invalid logo never silently produces an unbranded financial PDF', () => {
    const ctx = context({ console: { error: () => {} }, UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404 }) } });
    assert.throws(() => ctx.buildDocHtml_(doc, 'invoice'), /logo could not be loaded/);
});
test('payment verification is required even when fulfilment says completed or delivered', () => {
    const ctx = context();
    assert.equal(ctx.rowIsPaid_(['Unpaid', 'Completed', 'Delivered'], { PaymentStatus: 1, Status: 2, DeliveryStatus: 3 }), false);
    assert.equal(ctx.rowIsPaid_(['', 'Paid'], { PaymentStatus: 1, Status: 2 }), false);
    assert.equal(ctx.rowIsPaid_(['Paid'], { PaymentStatus: 1 }), true);
    assert.equal(ctx.rowIsPaid_(['Completed'], { Status: 1 }), false);
});
test('customer and agent document authorization happens before Drive or PDF generation', () => {
    const h = { PAC: 1, AgentID: 2, PaymentStatus: 3 }; const prepared = [];
    const ctx = context({ SHEET_ORDER_LOG: 'OrderLog', ORDER_COLS: [], SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => ({}) }) },
        ensureHeaders_: () => h, findOrderRow_: () => ({ rowIndex: 2, row: ['C1', 'A1', 'Unpaid'] }), sameId_: (a, b) => a === b,
        readPdfBase64_: (url, filename) => ({ success: true, filename }) });
    ctx.ensureTransactionPdf_ = (...args) => { prepared.push(args); return 'private-document'; };
    assert.equal(ctx.getOrderDocument_({ pac: 'C2' }, 'INV-SAMPLE', 'invoice').success, false);
    assert.equal(ctx.getOrderDocument_({ agentId: 'A2' }, 'INV-SAMPLE', 'invoice').success, false);
    assert.equal(ctx.getOrderDocument_({ pac: 'C1' }, 'INV-SAMPLE', 'receipt').success, false);
    assert.equal(ctx.getOrderDocument_({ pac: 'C1' }, 'INV-SAMPLE', 'other').success, false);
    assert.equal(prepared.length, 0);
    assert.equal(ctx.getOrderDocument_({ pac: 'C1' }, 'INV-SAMPLE', 'invoice').filename, 'Invoice_INV-SAMPLE.pdf');
    assert.equal(prepared.length, 1);
});
test('rebranding an existing receipt keeps payment, dates, totals and points and reuses the branded file', () => {
    const h = { PaymentStatus: 1, FinalReceiptURL: 2, TotalAmount: 3, PaidDate: 4, PointsEarned: 5 };
    const row = ['Paid', 'https://drive.google.com/old', 90, '2026-11-15', 80]; const before = row.slice();
    const sheet = { getLastColumn: () => row.length, getRange: (r, col, count) => count ? { getValues: () => [row.slice()] } : { setValue: value => { row[col - 1] = value; } } };
    let generated = 0, confirmations = 0, releases = 0;
    const ctx = context({ LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => { releases++; } }) },
        createReceiptForRow_: () => { generated++; return 'https://drive.google.com/branded'; }, confirmPayment_: () => { confirmations++; } });
    ctx.createReceiptForRow_ = () => { generated++; return 'https://drive.google.com/branded'; };
    ctx.transactionPdfIsCurrent_ = url => url.endsWith('/branded');
    assert.equal(ctx.ensureTransactionPdf_(sheet, h, 2, 'receipt'), 'https://drive.google.com/branded');
    assert.equal(ctx.ensureTransactionPdf_(sheet, h, 2, 'receipt'), 'https://drive.google.com/branded');
    assert.equal(generated, 1); assert.equal(confirmations, 0); assert.equal(releases, 1);
    assert.deepEqual([row[0], ...row.slice(2)], [before[0], ...before.slice(2)]);
    row[0] = 'Unpaid'; assert.throws(() => ctx.ensureTransactionPdf_(sheet, h, 2, 'receipt'), /Payment must be verified/);
});

test('historical rebranding never reprices legacy order items from the current catalog', () => {
    const h = { Cart_Data: 1, ItemsPurchased: 2, TotalAmount: 3, ShippingFee: 4, InvoiceID: 5, PointsEarned: 6 };
    const row = ['', 'A1x2', 90, 10, 'INV-LEGACY', 80];
    const sheet = { getLastColumn: () => row.length, getRange: () => ({ getValues: () => [row] }) };
    const ctx = context({ parseMoney_: value => Number(value) || 0, priceCartFromMaster_: () => { throw new Error('Must not reprice an existing order'); } });
    const result = ctx.getOrderDocData_(sheet, h, 2);
    assert.equal(result.total, 90); assert.equal(result.subtotal, 80); assert.equal(result.shipping, 10);
    assert.equal(result.lines[0].unit, null); assert.equal(result.lines[0].line, null);
    assert.match(ctx.buildDocHtml_(result, 'receipt'), /Not recorded/);
    assert.match(ctx.buildDocHtml_(result, 'receipt'), /current catalog prices have not been substituted/);
    row[0] = JSON.stringify([{ id: 'A1', name: 'Recorded product', price: 40, customPrice: 0, quantity: 2 }]);
    const free = ctx.getOrderDocData_(sheet, h, 2);
    assert.equal(free.lines[0].unit, 0); assert.equal(free.subtotal, 0); assert.equal(free.total, 90);
});
test('saved PDFs carry the template version and only matching Drive metadata is considered current', () => {
    let description = '', filename = '';
    const file = { setDescription: value => { description = value; }, getDescription: () => description };
    const ctx = context({ DriveApp: { getFolderById: () => ({ createFile: () => file }), getFileById: () => file }, fileIdFromUrl_: url => url ? 'file-id' : '' });
    ctx.Utilities.newBlob = () => ({ getAs: type => { assert.equal(type, 'application/pdf'); return { setName: value => { filename = value; return {}; } }; } });
    assert.equal(ctx.transactionPdfIsCurrent_('https://drive.google.com/legacy'), false);
    ctx.savePdf_('<html>sample</html>', 'Receipt_SAMPLE', 'folder');
    assert.equal(filename, 'Receipt_SAMPLE.pdf');
    assert.equal(description, 'Forever Living transaction template: fl-logo-link-v1');
    assert.equal(ctx.transactionPdfIsCurrent_('https://drive.google.com/current'), true);
    assert.equal(ctx.transactionPdfIsCurrent_(''), false);
});
