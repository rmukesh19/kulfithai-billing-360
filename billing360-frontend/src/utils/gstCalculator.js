/**
 * Global Dynamic Tax Engine & Utilities for Billing360
 * Supporting CGST/SGST/IGST (India GST) and VAT/SST/Sales Tax (International) dynamically.
 */

export function isIntrastate(companyState, customerState) {
  if (!companyState || !customerState) return true;
  return companyState.trim().toLowerCase() === customerState.trim().toLowerCase();
}

/**
 * Calculates tax based on country-specific tax rules and types.
 */
export function calculateGST({ 
  companyState, 
  customerState, 
  taxableAmount, 
  gstPercent, 
  taxType = 'GST', 
  country = 'India' 
}) {
  const base = parseFloat(taxableAmount) || 0;
  const rate = parseFloat(gstPercent) || 0;
  const intra = isIntrastate(companyState, customerState);

  let cgst_percentage = 0;
  let cgst_amount = 0;
  let sgst_percentage = 0;
  let sgst_amount = 0;
  let igst_percentage = 0;
  let igst_amount = 0;

  // Indian GST splits into CGST & SGST (Intrastate) or IGST (Interstate)
  if (country === 'India' && taxType === 'GST') {
    if (intra) {
      cgst_percentage = rate / 2;
      sgst_percentage = rate / 2;
      cgst_amount = Math.round(((base * cgst_percentage) / 100) * 100) / 100;
      sgst_amount = Math.round(((base * sgst_percentage) / 100) * 100) / 100;
    } else {
      igst_percentage = rate;
      igst_amount = Math.round(((base * igst_percentage) / 100) * 100) / 100;
    }
  } else {
    // Single-tier Taxes (VAT, SST, Sales Tax, Custom Tax)
    igst_percentage = rate;
    igst_amount = Math.round(((base * rate) / 100) * 100) / 100;
  }

  const total_tax_amount = Math.round((cgst_amount + sgst_amount + igst_amount) * 100) / 100;
  const grand_total = Math.round((base + total_tax_amount) * 100) / 100;

  return {
    taxable_amount: base,
    cgst_percentage,
    cgst_amount,
    sgst_percentage,
    sgst_amount,
    igst_percentage,
    igst_amount,
    total_tax_amount,
    grand_total,
    company_state: companyState || '',
    customer_state: customerState || '',
    tax_type: taxType,
    country
  };
}

/**
 * Calculates overall invoice totals from individual cart items.
 */
export function calculateInvoiceTotals({ 
  items, 
  companyState, 
  customerState, 
  discountAmount = 0,
  taxType = 'GST',
  country = 'India'
}) {
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let overallTaxAmount = 0;

  const itemGSTDetails = items.map(item => {
    const itemSubtotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity || item.qty) || 0);
    const itemGST = calculateGST({
      companyState,
      customerState,
      taxableAmount: itemSubtotal,
      gstPercent: item.gstPercent || 0,
      taxType,
      country
    });

    totalTaxable += itemSubtotal;
    totalCgst += itemGST.cgst_amount;
    totalSgst += itemGST.sgst_amount;
    totalIgst += itemGST.igst_amount;
    overallTaxAmount += itemGST.total_tax_amount;

    return {
      ...item,
      taxable_amount: itemSubtotal,
      cgst_percentage: itemGST.cgst_percentage,
      cgst_amount: itemGST.cgst_amount,
      sgst_percentage: itemGST.sgst_percentage,
      sgst_amount: itemGST.sgst_amount,
      igst_percentage: itemGST.igst_percentage,
      igst_amount: itemGST.igst_amount,
      total_tax_amount: itemGST.total_tax_amount,
      grand_total: itemGST.grand_total
    };
  });

  const adjustedTaxableAmount = Math.max(0, totalTaxable - discountAmount);
  const discountRatio = totalTaxable > 0 ? (adjustedTaxableAmount / totalTaxable) : 0;
  
  const finalCgst = Math.round(totalCgst * discountRatio * 100) / 100;
  const finalSgst = Math.round(totalSgst * discountRatio * 100) / 100;
  const finalIgst = Math.round(totalIgst * discountRatio * 100) / 100;
  const finalTaxAmount = Math.round((finalCgst + finalSgst + finalIgst) * 100) / 100;
  const finalGrandTotal = Math.round((adjustedTaxableAmount + finalTaxAmount) * 100) / 100;

  return {
    items: itemGSTDetails,
    taxable_amount: adjustedTaxableAmount,
    cgst_amount: finalCgst,
    sgst_amount: finalSgst,
    igst_amount: finalIgst,
    total_tax_amount: finalTaxAmount,
    grand_total: finalGrandTotal,
    company_state: companyState || '',
    customer_state: customerState || '',
    tax_type: taxType,
    country
  };
}
