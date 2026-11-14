// Replace the existing getCustomerOrders(pac) in Code.gs with this function.
// This uses the existing authenticated doPost dispatcher and existing helpers.
// Do not add a second getCustomerOrders definition. No credentials are needed here.
function getCustomerOrders(pac) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ORDER_LOG);
  const h = ensureHeaders_(sheet, ORDER_COLS);
  const rows = sheet.getDataRange().getValues();
  const productNames = new Map();
  try {
    // Include unpublished products: a previous customer still owns that history.
    const master = ss.getSheetByName(SHEET_PRODUCT_MASTER);
    if (master) {
      const ph = getColumnIndexes(master);
      const products = master.getDataRange().getValues();
      if (ph['SKU'] && ph['ProductName']) {
        for (let i = 1; i < products.length; i++) {
          productNames.set(String(products[i][ph['SKU'] - 1]).trim(), String(products[i][ph['ProductName'] - 1] || '').trim());
        }
      }
    }
  } catch (e) { /* Historical Cart_Data names remain usable if master lookup fails. */ }
  const orders = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!sameId_(r[h['PAC'] - 1], pac)) continue;
    const cell = name => h[name] ? r[h[name] - 1] : '';
    const paymentStatus = String(cell('PaymentStatus') || '').trim();
    const paid = isPaidValue_(paymentStatus);
    let savedItems = [];
    try { savedItems = JSON.parse(cell('Cart_Data') || '[]'); } catch (e) { /* Use the legacy SKU list below. */ }
    if (!Array.isArray(savedItems)) savedItems = [];
    if (!savedItems.length) {
      savedItems = String(cell('ItemsPurchased') || '').split(',').map(part => {
        const match = part.trim().match(/^(.+?)\s*[xX×*]\s*(\d+)$/);
        return match ? { id: match[1].trim(), quantity: Number(match[2]) } : null;
      }).filter(Boolean);
    }
    const itemDetails = savedItems.filter(item => item && typeof item === 'object').map(item => {
      const id = String(item.id !== undefined && item.id !== null ? item.id : item.sku || '').trim();
      const savedName = String(item.name || item.productName || '').trim();
      const name = (savedName && savedName !== id ? savedName : productNames.get(id)) || 'Product name unavailable';
      return { id: id, name: name, quantity: Math.max(1, parseInt(item.quantity || item.qty, 10) || 1) };
    });
    const rawStatus = String(cell('Status') || '').trim();
    const terminal = /^(cancelled|canceled|refunded)$/i.test(rawStatus);
    const status = terminal ? (/^refunded$/i.test(rawStatus) ? 'Refunded' : 'Cancelled')
      : paid ? customerStatus_(paymentStatus, rawStatus, cell('DeliveryStatus')) : 'Pending payment';
    orders.push({
      invoiceId: String(cell('InvoiceID')), date: formatDateSafe_(cell('Timestamp')),
      items: itemDetails.map(item => item.name + ' × ' + item.quantity).join(', '), itemDetails: itemDetails,
      total: parseMoney_(cell('TotalAmount')).toFixed(2), shippingFee: parseMoney_(cell('ShippingFee')).toFixed(2),
      remarks: String(cell('SpecialRemarks') || ''), status: status, paid: paid, paymentStatus: paymentStatus,
      points: paid ? parseMoney_(cell('PointsEarned')) : 0
    });
  }
  return { success: true, orders: orders.reverse(), stages: ['Pending payment', 'Paid', 'Awaiting Shipment', 'On the Way', 'Delivered'] };
}
