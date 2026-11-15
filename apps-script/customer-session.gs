// Add this helper to the existing Apps Script project.
// In doPost's Customer Portal switch, add:
// case 'getCustomerSession': response = getCustomerSession(data.data); break;
function getCustomerSession(data) {
  const pac = requireCustomerSession_(data);
  const customer = getCustomerRow_(pac);
  if (!customer) throw new Error('SESSION_EXPIRED');
  return {
    success: true,
    customer: {
      pac: customer.pac,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      totalPoints: customer.points
    }
  };
}
