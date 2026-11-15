// Replace the matching logo constants/functions in Code.gs; do not append duplicates.
// This snippet relies on the existing project settings, QR code and authenticated dispatcher.

// ---------- Logo for PDFs ----------
// The logo is FL.jpg in your GitHub repository (the same file the website uses).
// FL.jpg is a PNG despite its filename; use the actual bytes to identify its type.
const LOGO_REPO = { owner: 'Arvin8786', repo: 'foreverlivingbymohdisa', branch: 'main', file: 'FL.jpg' };
const COMPANY_LOGO_URL = '';          // optional: use a full address instead of the repository above
const COMPANY_LOGO_DRIVE_ID = '';     // optional: or a Google Drive file ID

function logoUrl_() {
  if (COMPANY_LOGO_URL) return COMPANY_LOGO_URL;
  if (LOGO_REPO.owner && LOGO_REPO.repo) return 'https://raw.githubusercontent.com/' + LOGO_REPO.owner + '/' + LOGO_REPO.repo + '/' + LOGO_REPO.branch + '/' + LOGO_REPO.file;
  return '';
}

function getLogoDataUri_() {
  try {
    const cache = CacheService.getScriptCache();
    const hit = cache.get('pdf_logo_fl_v3');
    if (hit) return hit;
    let blob = null;
    if (COMPANY_LOGO_DRIVE_ID) blob = DriveApp.getFileById(COMPANY_LOGO_DRIVE_ID).getBlob();
    else {
      let url = logoUrl_();
      if (!url) { const about = getAboutUsContent() || {}; url = String(about.Logo || about.LogoURL || about.LogoUrl || ''); }
      if (url) { const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true }); if (r.getResponseCode() === 200) blob = r.getBlob(); }
    }
    if (!blob) return '';
    const bytes = blob.getBytes();
    const signature = bytes.slice(0, 8).map(b => (b + 256) % 256);
    const type = signature[0] === 137 && signature[1] === 80 && signature[2] === 78 && signature[3] === 71 ? 'image/png'
      : signature[0] === 255 && signature[1] === 216 && signature[2] === 255 ? 'image/jpeg' : '';
    if (!type) throw new Error('Repository logo is not a PNG or JPEG image.');
    const uri = 'data:' + type + ';base64,' + Utilities.base64Encode(bytes);
    if (uri.length < 90000) cache.put('pdf_logo_fl_v3', uri, 21600);
    return uri;
  } catch (e) { console.error('Logo not loaded: ' + e); return ''; }
}

// Builds the printable page. Uses plain tables and inline styles because Google's PDF converter ignores modern CSS.
function buildDocHtml_(doc, kind) {
  const co = getCompanyInfo_();
  const logo = getLogoDataUri_();
  if (!logo) throw new Error('The shop logo could not be loaded. Please retry the document download.');
  const isReceipt = kind === 'receipt';
  const tz = Session.getScriptTimeZone();
  const fmt = d => { const x = new Date(d); return isNaN(x.getTime()) ? '' : Utilities.formatDate(x, tz, 'dd MMM yyyy'); };
  const green = '#064e3b', deep = '#053f31', gold = '#b8932a', goldLight = '#d4af37', grey = '#5f6e67', line = '#e3e6e1', ink = '#14211c', cream = '#f7f5ec';
  const th = (t, al) => `<td style="background:${green};color:#ffffff;font-size:8.5px;font-weight:bold;letter-spacing:1px;padding:10px 7px;text-align:${al || 'left'};">${t}</td>`;
  const cs = (i, al) => `padding:10px 7px;border-bottom:1px solid ${line};font-size:10.5px;text-align:${al || 'left'};background:${i % 2 ? '#fbfaf5' : '#ffffff'};`;
  const rows = doc.lines.map((l, i) => `<tr>
      <td style="${cs(i, 'center')}color:${grey};">${i + 1}</td>
      <td style="${cs(i)}font-family:Courier New,monospace;font-size:9.5px;color:${deep};"><b>${htmlEsc_(l.sku)}</b></td>
      <td style="${cs(i)}"><b>${htmlEsc_(l.name)}</b></td>
      <td style="${cs(i, 'right')}">${documentMoney_(l.list)}</td>
      <td style="${cs(i, 'center')}">${l.qty}</td>
      <td style="${cs(i, 'center')}">${l.discountPct > 0 ? l.discountPct + '%' : '-'}</td>
      <td style="${cs(i, 'right')}">${documentMoney_(l.unit)}</td>
      <td style="${cs(i, 'right')}"><b>${documentMoney_(l.line)}</b></td></tr>`).join('');
  const meta = (k, v) => `<tr><td style="font-size:9.5px;color:${grey};padding:3px 0;">${k}</td><td style="font-size:10.5px;padding:3px 0 3px 18px;text-align:right;"><b>${v}</b></td></tr>`;
  const docNo = (isReceipt ? 'RCP-' : '') + doc.invoiceId;
  const orderDate = new Date(doc.date);
  const dueDate = isNaN(orderDate.getTime()) ? '' : fmt(new Date(orderDate.getTime() + INVOICE_DUE_DAYS * 86400000));
  const statusBox = isReceipt
    ? `<table align="right" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr><td style="border:3px solid #1f8a4c;color:#1f8a4c;font-size:17px;font-weight:bold;letter-spacing:5px;padding:6px 22px;">PAID</td></tr></table>`
    : `<table align="right" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr><td style="border:2px solid ${gold};color:${gold};font-size:10.5px;font-weight:bold;letter-spacing:2px;padding:6px 14px;">PAYMENT PENDING</td></tr></table>`;

  const banner = `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;"><tr>
      <td style="padding:14px 18px;background:${cream};border-left:5px solid ${isReceipt ? '#1f8a4c' : goldLight};">
        <div style="font-size:8.5px;letter-spacing:2px;color:${grey};font-weight:bold;">${isReceipt ? 'AMOUNT RECEIVED' : 'AMOUNT TO BE PAID'}</div>
        <div style="font-family:Georgia,serif;font-size:27px;font-weight:bold;color:${green};margin-top:2px;">${documentMoney_(doc.total)}</div>
      </td>
      <td style="padding:14px 18px;background:${cream};text-align:right;font-size:10px;color:${grey};line-height:1.8;">
        ${isReceipt ? `Received on <b style="color:${ink};">${(doc.paidDate ? fmt(doc.paidDate) : 'Not recorded')}</b><br>For invoice <b style="color:${ink};">${htmlEsc_(doc.invoiceId)}</b>` : `Invoice date <b style="color:${ink};">${fmt(doc.date)}</b><br>Please pay by <b style="color:${ink};">${dueDate}</b>`}
      </td></tr></table>`;

  const payPanel = isReceipt ? '' : `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border:2px solid ${green};"><tr>
      <td width="64%" valign="top" style="padding:16px 18px;">
        <div style="font-size:8.5px;color:${gold};font-weight:bold;letter-spacing:2px;">HOW TO PAY</div>
        <div style="font-family:Georgia,serif;font-size:16px;font-weight:bold;color:${green};margin:4px 0 8px 0;">Scan the QR code to pay ${documentMoney_(doc.total)}</div>
        <div style="font-size:10.5px;color:#2f3d37;line-height:1.75;">
          1. Open your banking or e-wallet app and choose <b>Scan QR</b>.<br>
          2. Scan the code on the right.<br>
          3. Enter the exact amount: <b>${documentMoney_(doc.total)}</b>.<br>
          4. In the reference or message box, type <b>${htmlEsc_(doc.invoiceId)}</b>.<br>
          5. Send your payment slip to <b>${htmlEsc_(co.phone)}</b> on WhatsApp.</div>
        ${PAYMENT_EXTRA_INSTRUCTIONS ? `<div style="font-size:10px;color:${grey};margin-top:8px;line-height:1.5;">${PAYMENT_EXTRA_INSTRUCTIONS}</div>` : ''}
      </td>
      <td width="36%" valign="middle" align="center" style="padding:14px;background:${cream};">
        <img src="data:image/png;base64,${PAYMENT_QR_BASE64}" width="150" height="150" alt="Payment QR" style="display:block;margin:0 auto;border:4px solid #ffffff;">
        <div style="font-size:8.5px;color:${grey};margin-top:6px;letter-spacing:1px;">SCAN TO PAY</div>
      </td></tr></table>`;

  const remarksBlock = doc.remarks ? `<div style="font-size:8.5px;color:${gold};font-weight:bold;letter-spacing:2px;margin-bottom:5px;">SPECIAL REMARKS</div><div style="font-size:10.5px;color:#2f3d37;line-height:1.5;border-left:3px solid ${goldLight};padding-left:10px;">${htmlEsc_(doc.remarks)}</div>` : '';
  const pointsBlock = isReceipt && doc.pointsEarned > 0 ? `<div style="margin-top:14px;font-size:10.5px;color:${green};background:#e4f6ec;padding:9px 12px;"><b>Loyalty points earned on this order: ${doc.pointsEarned}</b><br><span style="font-size:9px;">Keep collecting. Points can be redeemed for rewards soon.</span></div>` : '';
  const approvedBlock = isReceipt ? `<div style="margin-top:14px;font-size:10px;color:${grey};">Payment status: <b style="color:#1f8a4c;">APPROVED</b></div>` : '';
  const footerText = isReceipt
    ? 'Thank you for your purchase. This is an official receipt confirming that payment has been received and approved.'
    : 'Goods are released after payment is confirmed. Prices are in Malaysian Ringgit (RM). Please quote the invoice number when you pay.';
  const logoCell = logo
    ? `<td width="80" valign="middle" style="padding:0 12px 0 0;"><img src="${logo}" width="68" height="68" alt="Forever Living by Muhd Isa logo" style="display:block;"></td>` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page { size:A4; margin:12mm; } table { border-collapse:collapse; } a { text-decoration:underline; }</style></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:${ink};margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;"><tr>
  <td width="67%" style="background:#ffffff;padding:16px 12px 16px 0;" valign="middle">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>${logoCell}
      <td valign="middle">
        <div style="font-family:Georgia,serif;font-size:18px;color:${green};font-weight:bold;line-height:1.25;">${htmlEsc_(co.name)}</div>
        <div style="font-size:9.5px;color:${grey};margin-top:6px;line-height:1.7;">${co.address ? htmlEsc_(co.address) + '<br>' : ''}${[('WhatsApp ' + co.phone), co.email].filter(Boolean).map(htmlEsc_).join('  |  ')}<br><a href="${htmlEsc_(SITE_URL)}" style="color:${green};text-decoration:underline;">Forever Living by Muhd Isa Eshop</a></div>
      </td></tr></table>
  </td>
  <td width="33%" style="background:#ffffff;padding:16px 0 16px 12px;text-align:right;" valign="middle">
    <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:2px;color:${goldLight};font-weight:bold;">${isReceipt ? 'RECEIPT' : 'INVOICE'}</div>
    <div style="font-size:8px;letter-spacing:1px;color:${grey};margin-top:3px;">${isReceipt ? 'OFFICIAL PAYMENT RECEIPT' : 'REQUEST FOR PAYMENT'}</div>
    <div style="font-size:10px;color:${ink};margin-top:8px;word-wrap:break-word;">No. <b>${htmlEsc_(docNo)}</b></div>
  </td></tr>
  <tr><td colspan="2" style="background:${goldLight};height:5px;font-size:1px;line-height:5px;">&nbsp;</td></tr>
  <tr><td colspan="2" style="background:${deep};height:2px;font-size:1px;line-height:2px;">&nbsp;</td></tr></table>

<div style="padding:0 28px 18px 28px;">
<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px 0;"><tr>
  <td width="55%" valign="top" style="padding:0;">
    <div style="font-size:8.5px;color:${gold};font-weight:bold;letter-spacing:2px;margin-bottom:6px;">${isReceipt ? 'RECEIVED FROM' : 'BILL TO'}</div>
    <div style="font-family:Georgia,serif;font-size:15px;font-weight:bold;color:${green};">${htmlEsc_(doc.customer.name)}</div>
    <div style="font-size:10.5px;color:#2f3d37;line-height:1.65;margin-top:3px;">
      ${doc.customer.address ? htmlEsc_(doc.customer.address) + '<br>' : ''}
      ${doc.customer.phone ? 'Tel: ' + htmlEsc_(doc.customer.phone) + '<br>' : ''}
      ${doc.customer.email ? htmlEsc_(doc.customer.email) + '<br>' : ''}
      ${doc.customer.pac ? 'Customer ID: ' + htmlEsc_(doc.customer.pac) : ''}</div>
  </td>
  <td width="45%" valign="top" style="padding:0;">
    <table align="right" cellpadding="0" cellspacing="0">
      ${meta(isReceipt ? 'Receipt no.' : 'Invoice no.', htmlEsc_(docNo))}
      ${isReceipt ? meta('Invoice no.', htmlEsc_(doc.invoiceId)) : ''}
      ${meta('Order date', fmt(doc.date))}
      ${isReceipt ? meta('Payment date', (doc.paidDate ? fmt(doc.paidDate) : 'Not recorded')) : meta('Payment due', dueDate)}
      ${doc.agentName ? meta('Served by', htmlEsc_(doc.agentName)) : ''}
    </table>
    <div style="clear:both;"></div>${statusBox}
  </td></tr></table>

${banner}

<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:18px;">
  <tr>${th('#', 'center')}${th('SKU')}${th('PRODUCT')}${th('UNIT PRICE', 'right')}${th('QTY', 'center')}${th('DISC.', 'center')}${th('NET PRICE', 'right')}${th('AMOUNT', 'right')}</tr>
  ${rows || `<tr><td colspan="8" style="padding:14px;text-align:center;color:${grey};">No items</td></tr>`}
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
  <td width="52%" valign="top" style="padding:0 10px 0 0;">${remarksBlock}${pointsBlock}${approvedBlock}</td>
  <td width="48%" valign="top">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:10.5px;padding:6px 8px;color:${grey};">Products subtotal</td><td style="font-size:10.5px;padding:6px 8px;text-align:right;">${documentMoney_(doc.subtotal)}</td></tr>
      <tr><td style="font-size:10.5px;padding:6px 8px;color:${grey};border-bottom:1px solid ${line};">Shipping</td><td style="font-size:10.5px;padding:6px 8px;text-align:right;border-bottom:1px solid ${line};">${doc.shipping === null ? 'Not recorded' : doc.shipping > 0 ? documentMoney_(doc.shipping) : 'FREE'}</td></tr>
      <tr><td style="font-size:12.5px;padding:12px 8px;background:${green};color:#ffffff;font-weight:bold;">${isReceipt ? 'TOTAL PAID' : 'TOTAL DUE'}</td><td style="font-size:14px;padding:12px 8px;background:${green};color:${goldLight};font-weight:bold;text-align:right;">${documentMoney_(doc.total)}</td></tr>
    </table>
  </td></tr></table>

${doc.hasMissingPrices ? '<p style="font-size:9px;color:#5f6e67;">Some historical line prices were not recorded. The saved order total is shown; current catalog prices have not been substituted.</p>' : ''}
${payPanel}

<div style="margin-top:26px;padding-top:12px;border-top:2px solid ${goldLight};font-size:9.5px;color:${grey};text-align:center;line-height:1.7;">
  ${footerText}<br>Questions? WhatsApp us at <b>${htmlEsc_(co.phone)}</b>. This document is computer generated and does not require a signature.</div>
</div>
</body></html>`;
}

const TRANSACTION_PDF_VERSION = 'fl-logo-link-v1';

function savePdf_(html, fileName, folderId) {
  const blob = Utilities.newBlob(html, 'text/html', fileName + '.html').getAs('application/pdf').setName(fileName + '.pdf');
  const file = DriveApp.getFolderById(folderId).createFile(blob);
  file.setDescription('Forever Living transaction template: ' + TRANSACTION_PDF_VERSION);
  return file;
}

function transactionPdfIsCurrent_(url) {
  const id = fileIdFromUrl_(url);
  if (!id) return false;
  try { return DriveApp.getFileById(id).getDescription() === 'Forever Living transaction template: ' + TRANSACTION_PDF_VERSION; }
  catch (e) { return false; }
}

// PaymentStatus is the authority. Delivery/fulfilment progress is not payment verification.
function rowIsPaid_(row, h) {
  return !!h['PaymentStatus'] && isPaidValue_(row[h['PaymentStatus'] - 1]);
}

function createInvoiceForRow_(sheet, h, rowIndex) {
  h = ensureHeaders_(sheet, ORDER_COLS);
  const doc = getOrderDocData_(sheet, h, rowIndex);
  if (!doc.invoiceId) return '';
  const file = savePdf_(buildDocHtml_(doc, 'invoice'), 'Invoice_' + doc.invoiceId, PROFORMA_INVOICE_FOLDER_ID);
  const url = file.getUrl();
  sheet.getRange(rowIndex, h['InvoiceURL']).setValue(url);
  // Keep previously issued financial PDFs in Drive; only the current sheet link changes.
  return url;
}

function ensureTransactionPdf_(sheet, h, rowIndex, type) {
  const receipt = type === 'receipt';
  const column = receipt ? 'FinalReceiptURL' : 'InvoiceURL';
  const readRow = () => sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  let row = readRow();
  if (receipt && !rowIsPaid_(row, h)) throw new Error('No receipt yet. Payment must be verified by the shop.');
  let url = String(row[h[column] - 1] || '');
  if (transactionPdfIsCurrent_(url)) return url;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Document preparation is busy. Please try again.');
  try {
    row = readRow();
    if (receipt && !rowIsPaid_(row, h)) throw new Error('No receipt yet. Payment must be verified by the shop.');
    url = String(row[h[column] - 1] || '');
    if (transactionPdfIsCurrent_(url)) return url;
    if (!receipt) return createInvoiceForRow_(sheet, h, rowIndex);
    if (!/^https?:/i.test(url)) return confirmPayment_(sheet, rowIndex).receiptUrl;
    // Rebrand an existing receipt without changing payment, dates, points or amounts.
    url = createReceiptForRow_(sheet, h, rowIndex);
    sheet.getRange(rowIndex, h[column]).setValue(url);
    return url;
  } finally { lock.releaseLock(); }
}

// Access is checked before checking Drive metadata or preparing a document.
function getOrderDocument_(who, invoiceId, type) {
  if (type !== 'invoice' && type !== 'receipt') return { success: false, message: 'Unknown document type.' };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ORDER_LOG);
  const h = ensureHeaders_(sheet, ORDER_COLS);
  const hit = findOrderRow_(sheet, h, invoiceId);
  if (!hit) return { success: false, message: 'Order not found.' };
  const r = hit.row;
  if (who.pac !== undefined) { if (!sameId_(r[h['PAC'] - 1], who.pac)) return { success: false, message: 'Order not found.' }; }
  else if (!who.isAdmin && !sameId_(r[h['AgentID'] - 1], who.agentId)) return { success: false, message: 'This order belongs to another agent.' };
  if (type === 'receipt' && !rowIsPaid_(r, h)) return { success: false, message: 'No receipt yet. A receipt is issued once payment is confirmed.' };
  const url = ensureTransactionPdf_(sheet, h, hit.rowIndex, type);
  return readPdfBase64_(url, (type === 'receipt' ? 'Receipt_' : 'Invoice_') + invoiceId + '.pdf');
}


function documentMoney_(value) {
  return value === null || value === undefined ? 'Not recorded' : money2_(value);
}

function getOrderDocData_(sheet, h, rowIndex) {
  const r = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const cell = name => h[name] ? r[h[name] - 1] : '';
  const amount = value => {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const number = Number(String(value).replace(/MYR|RM|,/gi, '').trim());
    return isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
  };
  let items = [];
  try { items = JSON.parse(cell('Cart_Data') || '[]'); } catch (e) { items = []; }
  if (!Array.isArray(items)) items = [];
  if (!items.length) {
    const names = new Map();
    try {
      const master = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCT_MASTER);
      const ph = getColumnIndexes(master), rows = master.getDataRange().getValues();
      if (ph['SKU'] && ph['ProductName']) for (let i = 1; i < rows.length; i++) names.set(String(rows[i][ph['SKU'] - 1]).trim(), String(rows[i][ph['ProductName'] - 1] || ''));
    } catch (e) { /* Names may be unavailable; never look up current prices. */ }
    items = String(cell('ItemsPurchased') || '').split(',').map(t => {
      const m = t.trim().match(/^(.+?)\s*[xX×*]\s*(\d+)$/);
      return m ? { id: m[1].trim(), name: names.get(m[1].trim()) || 'Product name unavailable', quantity: Number(m[2]) } : null;
    }).filter(Boolean);
  }
  const lines = items.filter(i => i && typeof i === 'object').map(i => {
    const list = amount(i.price), custom = amount(i.customPrice), unit = custom !== null ? custom : list, qty = parseInt(i.quantity, 10) || 1;
    const disc = list > 0 && unit !== null && unit < list ? Math.round((list - unit) / list * 1000) / 10 : 0;
    return { sku: String(i.id || i.sku || ''), name: String(i.name || i.productName || 'Product name unavailable'), qty: qty, list: list !== null ? list : unit, discountPct: disc, unit: unit, line: unit === null ? null : Math.round(unit * qty * 100) / 100 };
  });
  const shipping = amount(cell('ShippingFee'));
  const total = amount(cell('TotalAmount'));
  const hasMissingPrices = !lines.length || lines.some(l => l.unit === null);
  const subtotal = !hasMissingPrices ? Math.round(lines.reduce((sum, l) => sum + l.line, 0) * 100) / 100
    : total !== null && shipping !== null ? Math.round((total - shipping) * 100) / 100 : null;
  return {
    invoiceId: String(cell('InvoiceID')), date: cell('Timestamp'), paidDate: cell('PaidDate'),
    customer: { pac: String(cell('PAC') || ''), name: String(cell('CustomerName') || ''), email: String(cell('CustomerEmail') || ''), phone: String(cell('CustomerPhone') || ''), address: String(cell('CustomerAddress') || '') },
    agentName: String(cell('AgentName') || ''), lines: lines, subtotal: subtotal, shipping: shipping,
    total: total !== null ? total : subtotal !== null && shipping !== null ? subtotal + shipping : null,
    remarks: String(cell('SpecialRemarks') || ''), pointsEarned: parseMoney_(cell('PointsEarned')), hasMissingPrices: hasMissingPrices
  };
}

function createReceiptForRow_(sheet, h, rowIndex) {
  const doc = getOrderDocData_(sheet, h, rowIndex);
  // The verified PaidDate is authoritative; a template refresh is not a new payment.
  doc.paidDate = sheet.getRange(rowIndex, h['PaidDate']).getValue() || '';
  const file = savePdf_(buildDocHtml_(doc, 'receipt'), 'Receipt_' + doc.invoiceId, FINAL_RECEIPT_FOLDER_ID);
  return file.getUrl();
}

function showSelectedOrderDocuments() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEET_ORDER_LOG) { ui.alert('Open the OrderLog sheet and click a cell in the order you want.'); return; }
  const row = sheet.getActiveCell().getRow();
  if (row < 2) { ui.alert('Click a cell in an order row first.'); return; }
  const h = ensureHeaders_(sheet, ORDER_COLS);
  const id = String(sheet.getRange(row, h['InvoiceID']).getValue() || '');
  if (!id) { ui.alert('That row has no invoice number.'); return; }
  const inv = ensureTransactionPdf_(sheet, h, row, 'invoice');
  const paid = rowIsPaid_(sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0], h);
  const rcp = paid ? ensureTransactionPdf_(sheet, h, row, 'receipt') : '';
  const dl = u => 'https://drive.google.com/uc?export=download&id=' + fileIdFromUrl_(u);
  const link = (label, u) => u ? '<p><a href="' + dl(u) + '" target="_blank" style="font:600 14px Arial;color:#064e3b;">&#11015; Download ' + label + '</a> &nbsp; <a href="' + u + '" target="_blank" style="font:12px Arial;color:#666;">open</a></p>' : '<p style="font:14px Arial;color:#888;">' + label + ': not available yet (payment not confirmed).</p>';
  const html = HtmlService.createHtmlOutput('<div style="padding:8px 4px;"><p style="font:700 15px Arial;margin:0 0 12px;">' + htmlEsc_(id) + '</p>' + link('invoice (PDF)', inv) + link('receipt (PDF)', paid ? rcp : '') + '</div>').setWidth(380).setHeight(190);
  ui.showModalDialog(html, 'Order documents');
}
