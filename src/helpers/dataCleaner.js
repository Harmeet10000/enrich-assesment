export const cleanVendorResponse = (vendorData) => {
  if (!vendorData || typeof vendorData !== 'object') {
    return vendorData;
  }

  const cleaned = {};
  for (const key in vendorData) {
    if (Object.prototype.hasOwnProperty.call(vendorData, key)) {
      const value = vendorData[key];
      if (typeof value === 'string') {
        cleaned[key] = value.trim();
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = cleanVendorResponse(value);
      } else {
        cleaned[key] = value;
      }
    }
  }

  if (cleaned.customerEmail) {
    delete cleaned.customerEmail;
  }
  if (cleaned.ssn) {
    delete cleaned.ssn;
  }

  return cleaned;
};
