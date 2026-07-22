import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Fallback in case prototype registration fails under ES module bundles
if (typeof jsPDF.prototype.autoTable !== 'function') {
  jsPDF.prototype.autoTable = function (options) {
    autoTable(this, options);
    this.previousAutoTable = this.previousAutoTable || this.lastAutoTable;
    return this;
  };
}

/**
 * Enterprise Dynamic PDF Invoice Generator for Billing360
 * Generates beautiful, compliant invoices based on global country settings.
 */
export function exportInvoicePDF(invoice, config) {
  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const companyName = config?.companyName || config?.businessName || 'Billing360 Ltd';
    const address = config?.address || 'Plot A-1, Industrial Park';
    const phone = config?.phone || '9876543210';
    const email = config?.email || 'sales@billing360.com';
    const gstIn = config?.gstIn || config?.tax_registration_number || '22AAAAA0000A1Z1';
    const state = config?.state || 'Maharashtra';
    const bankName = config?.bankName || 'HDFC Bank Ltd';
    const bankAccount = config?.bankAccount || '50200012345678';
    const bankIfsc = config?.bankIfsc || 'HDFC0000123';
    
    const country = config?.country || 'India';
    const taxTypeLabel = config?.tax_type || 'GST';
    const currencyLabel = config?.currency || 'INR';
    const isIndiaGst = (country === 'India') && (taxTypeLabel === 'GST');

    // Determine badge title based on localization
    let badgeTitle = "TAX INVOICE";
    if (country === 'Thailand' || country === 'UAE') {
      badgeTitle = "VAT INVOICE";
    } else if (country === 'USA') {
      badgeTitle = "SALES TAX INVOICE";
    } else if (country === 'India') {
      badgeTitle = "TAX INVOICE (GST)";
    } else if (config?.tax_type) {
      badgeTitle = `${config.tax_type.toUpperCase()} INVOICE`;
    }

    // Background and frame colors
    const primaryColor = [22, 119, 242]; // rgb blue
    const darkGray = [33, 41, 54];
    
    // 1. Header (Primary top border and banner)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(companyName.toUpperCase(), 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 110, 125);
    doc.text([
      address,
      `State: ${state} | Phone: ${phone} | Email: ${email}`,
      `${taxTypeLabel} REG No: ${gstIn}`
    ], 14, 25);
    
    // Right side: Billed Title / Badge
    doc.setFillColor(243, 244, 246);
    doc.rect(130, 13, 66, 12, 'F');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(badgeTitle, 163, 21, { align: 'center' });
    
    // Invoice Meta Grid
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.rect(14, 42, 182, 20);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 135);
    doc.text("INVOICE NO:", 16, 48);
    doc.setTextColor(17, 24, 39);
    doc.text(invoice.invoiceNumber || 'INV-000', 42, 48);
    
    doc.setTextColor(110, 120, 135);
    doc.text("INVOICE DATE:", 16, 56);
    doc.setTextColor(17, 24, 39);
    doc.text(new Date(invoice.createdAt || Date.now()).toLocaleDateString(), 42, 56);
    
    doc.setTextColor(110, 120, 135);
    doc.text("PLACE OF SUPPLY:", 110, 48);
    doc.setTextColor(17, 24, 39);
    doc.text(invoice.customer_state || invoice.customerState || state, 146, 48);
    
    doc.setTextColor(110, 120, 135);
    doc.text("PAYMENT MODE:", 110, 56);
    doc.setTextColor(17, 24, 39);
    doc.text((invoice.paymentMode || 'CASH').toUpperCase(), 146, 56);
    
    // Bill To details
    doc.setFillColor(249, 250, 251);
    doc.rect(14, 68, 182, 22, 'F');
    doc.rect(14, 68, 182, 22);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("BILL TO (RECIPIENT):", 18, 74);
    
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(invoice.customerName || 'Walk-in Customer', 18, 80);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 110, 125);
    const billingState = invoice.customer_state || 'Local State';
    doc.text(`Contact: ${invoice.customerId ? `ID #${invoice.customerId}` : 'Walk-in'} | Destination State: ${billingState}`, 18, 85);
    
    // Items table setup dynamically
    const columns = [
      { title: "S.No", key: "sno" },
      { title: "Product / Service", key: "name" },
      { title: "Code", key: "hsn" },
      { title: "Qty", key: "qty" },
      { title: `Rate (${currencyLabel})`, key: "rate" },
      { title: `Taxable (${currencyLabel})`, key: "taxable" }
    ];

    if (isIndiaGst) {
      columns.push(
        { title: "CGST", key: "cgst" },
        { title: "SGST", key: "sgst" },
        { title: "IGST", key: "igst" }
      );
    } else {
      columns.push(
        { title: `${taxTypeLabel}`, key: "tax" }
      );
    }

    columns.push({ title: `Final (${currencyLabel})`, key: "total" });
    
    const rows = invoice.items.map((item, idx) => {
      const qty = item.quantity || 1;
      const rate = item.price || 0;
      const taxable = item.taxable_amount !== undefined ? item.taxable_amount : (rate * qty);
      
      const cgstAmt = item.cgst_amount || 0;
      const sgstAmt = item.sgst_amount || 0;
      const igstAmt = item.igst_amount || 0;
      const totalTaxAmt = item.total_tax_amount || (cgstAmt + sgstAmt + igstAmt) || 0;
      const totalAmount = item.grand_total !== undefined ? item.grand_total : (taxable + totalTaxAmt);
      
      const rowData = {
        sno: idx + 1,
        name: item.name || 'Product Item',
        hsn: item.hsn || '8517',
        qty: qty,
        rate: `${currencyLabel} ${parseFloat(rate).toFixed(2)}`,
        taxable: `${currencyLabel} ${parseFloat(taxable).toFixed(2)}`,
        total: `${currencyLabel} ${parseFloat(totalAmount).toFixed(2)}`
      };

      if (isIndiaGst) {
        rowData.cgst = cgstAmt > 0 ? `${item.cgst_percentage || (config?.tax_percentage / 2) || 0}% \n(${currencyLabel} ${cgstAmt.toFixed(2)})` : '0%';
        rowData.sgst = sgstAmt > 0 ? `${item.sgst_percentage || (config?.tax_percentage / 2) || 0}% \n(${currencyLabel} ${sgstAmt.toFixed(2)})` : '0%';
        rowData.igst = igstAmt > 0 ? `${item.igst_percentage || config?.tax_percentage || 0}% \n(${currencyLabel} ${igstAmt.toFixed(2)})` : '0%';
      } else {
        rowData.tax = totalTaxAmt > 0 ? `${item.gstPercent || config?.tax_percentage || 0}% \n(${currencyLabel} ${totalTaxAmt.toFixed(2)})` : '0%';
      }

      return rowData;
    });
    
    doc.autoTable({
      columns: columns.map(c => ({ header: c.title, dataKey: c.key })),
      body: rows,
      startY: 96,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        halign: 'center',
        valign: 'middle',
        lineColor: [229, 231, 235],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [31, 41, 55], 
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        name: { halign: 'left', cellWidth: 40 },
        rate: { halign: 'right' },
        taxable: { halign: 'right' },
        cgst: { fontSize: 6.8 },
        sgst: { fontSize: 6.8 },
        igst: { fontSize: 6.8 },
        tax: { fontSize: 6.8 },
        total: { halign: 'right', fontStyle: 'bold' }
      }
    });
    
    const finalY = doc.previousAutoTable.finalY + 8;
    
    if (finalY + 70 > 285) {
      doc.addPage();
      doc.text("", 14, 15);
    }
    
    const blockY = Math.max(finalY, 140);
    
    // Bank details card
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.rect(14, blockY, 95, 38);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("BANK REMITTANCE ACCOUNT:", 18, blockY + 6);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(50, 60, 75);
    doc.text([
      `Bank: ${bankName}`,
      `A/C Holder: ${companyName}`,
      `A/C Number: ${bankAccount}`,
      `IFSC / Swift: ${bankIfsc}`
    ], 18, blockY + 12);
    
    // Barcode manually
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(30, 30, 30);
    for (let i = 0; i < 24; i++) {
      const lineW = (i % 3 === 0) ? 0.8 : (i % 2 === 0) ? 0.3 : 0.55;
      doc.rect(18 + (i * 1.5), blockY + 28, lineW, 7, 'F');
    }
    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.text(`*${invoice.invoiceNumber || 'INV-000'}*`, 35, blockY + 36);
    
    // Right side summaries box
    doc.setFillColor(249, 250, 251);
    doc.rect(114, blockY, 82, 38, 'F');
    doc.rect(114, blockY, 82, 38);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 110, 125);
    
    const discount = invoice.discount || 0;
    const totalTax = invoice.totalTax || invoice.total_tax_amount || 0;
    const grand = invoice.totalAmount || invoice.grand_total || 0;
    
    doc.text("TAXABLE AMOUNT:", 118, blockY + 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${currencyLabel} ${parseFloat(invoice.subtotal || 0).toFixed(2)}`, 190, blockY + 7, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 110, 125);
    doc.text(`TOTAL ${taxTypeLabel} TAX (+):`, 118, blockY + 14);
    doc.setTextColor(59, 130, 246);
    doc.text(`${currencyLabel} ${parseFloat(totalTax).toFixed(2)}`, 190, blockY + 14, { align: 'right' });
    
    if (discount > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 110, 125);
      doc.text("DISCOUNT (-):", 118, blockY + 21);
      doc.setTextColor(239, 68, 68);
      doc.text(`${currencyLabel} ${parseFloat(discount).toFixed(2)}`, 190, blockY + 21, { align: 'right' });
    }
    
    // Draw thick total outline divider
    doc.setDrawColor(31, 41, 55);
    doc.line(114, blockY + 26, 196, blockY + 26);
    
    doc.setFont("helvetica", "black");
    doc.setFontSize(10.5);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("NET GRAND TOTAL:", 118, blockY + 32);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${currencyLabel} ${parseFloat(grand).toFixed(2)}`, 190, blockY + 32, { align: 'right' });
    
    // Declarations
    const promoY = blockY + 44;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("Terms and Conditions:", 14, promoY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(120, 130, 145);
    doc.text([
      "1. All disputes are subject to local judicial statutory limits only.",
      "2. This is a computer-rendered bill that needs no real signatures to be legally valid.",
      "3. Tax collected is declared fully as statutory returns matching outward databases.",
      "4. Goods once sold cannot be refunded but can only be exchanged under explicit store warrants."
    ], 14, promoY + 4);
    
    // Signature slot
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("For " + companyName.toUpperCase(), 160, promoY + 2);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(145, promoY + 16, 195, promoY + 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Authorized Signature / Seal", 170, promoY + 20, { align: 'center' });
    
    // Save/Download triggering
    doc.save(`Invoice_${invoice.invoiceNumber || 'INV'}_${Date.now()}.pdf`);
    return true;
  } catch (err) {
    console.error("PDF generation failed: ", err);
    return false;
  }
}
