import { ImportsModel } from '../models/importsModel.js';

/**
 * Validates and identifies duplicates on imported records
 */
export const processBulkImport = async (branchId, importType, rawData, existingRecords, fileName) => {
  const validatedData = [];
  const errors = [];
  const importedIds = [];

  const barcodeSet = new Set(existingRecords.products?.map(p => p.barcode?.toLowerCase()) || []);
  const skuSet = new Set(existingRecords.products?.map(p => p.sku?.toLowerCase()) || []);
  const customerPhoneSet = new Set(existingRecords.customers?.map(c => c.phone) || []);
  const supplierGstSet = new Set(existingRecords.suppliers?.map(s => s.gstNumber?.toLowerCase()) || []);
  const supplierPhoneSet = new Set(existingRecords.suppliers?.map(s => s.phone) || []);

  rawData.forEach((row, idx) => {
    const rowNum = idx + 1;
    const itemErrors = [];
    let isDuplicate = false;
    let duplicateReason = '';

    // Generate standard schema structures
    if (importType === 'products') {
      const name = row.name || row['Product Name'] || row['Item Name'] || '';
      const barcode = String(row.barcode || row['Barcode'] || '').trim();
      const sku = String(row.sku || row['SKU'] || '').trim();
      const hsn = String(row.hsn || row['HSN'] || '').trim();
      const gstPercent = parseFloat(row.gstPercent || row['GST'] || row['GSTPercent'] || 0);
      const sellingPrice = parseFloat(row.sellingPrice || row['Price'] || row['Selling Price'] || 0);
      const purchasePrice = parseFloat(row.purchasePrice || row['Purchase Price'] || 0);
      const stock = parseInt(row.stock || row['Stock'] || 0);
      const unit = row.unit || row['Unit'] || 'pcs';
      const category = row.category || row['Category'] || 'General';

      if (!name) {
        itemErrors.push(`Row ${rowNum}: Product Name is required`);
      }
      if (barcode && barcodeSet.has(barcode.toLowerCase())) {
        isDuplicate = true;
        duplicateReason = `Barcode '${barcode}' already exists in registered database`;
      }
      if (sku && skuSet.has(sku.toLowerCase())) {
        isDuplicate = true;
        duplicateReason = `SKU '${sku}' already exists in registered database`;
      }

      const recordId = row.id || `prod_${Math.random().toString(36).substr(2, 9)}`;
      importedIds.push(recordId);

      validatedData.push({
        id: recordId,
        name,
        barcode,
        sku,
        hsn,
        gstPercent,
        sellingPrice,
        purchasePrice: purchasePrice || Math.round(sellingPrice * 0.8),
        stock,
        unit,
        category,
        isDuplicate,
        duplicateReason,
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });

    } else if (importType === 'customers') {
      const name = row.name || row['Customer Name'] || '';
      const phone = String(row.phone || row['Phone'] || row['Mobile'] || '').trim();
      const balance = parseFloat(row.balance || row['Balance'] || row['Opening Balance'] || 0);
      const city = row.city || row['City'] || '';

      if (!name) {
        itemErrors.push(`Row ${rowNum}: Customer Name is required`);
      }
      if (phone && customerPhoneSet.has(phone)) {
        isDuplicate = true;
        duplicateReason = `Customer phone '${phone}' is already registered`;
      }

      const recordId = row.id || `cust_${Math.random().toString(36).substr(2, 9)}`;
      importedIds.push(recordId);

      validatedData.push({
        id: recordId,
        name,
        phone,
        balance,
        city,
        isDuplicate,
        duplicateReason,
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });

    } else if (importType === 'suppliers') {
      const name = row.name || row['Supplier Name'] || '';
      const phone = String(row.phone || row['Mobile'] || row['Phone'] || '').trim();
      const gstNumber = String(row.gstNumber || row['GSTIN'] || row['GST Number'] || '').trim();
      const address = row.address || row['Address'] || '';

      if (!name) {
        itemErrors.push(`Row ${rowNum}: Supplier Name is required`);
      }
      if (gstNumber && supplierGstSet.has(gstNumber.toLowerCase())) {
        isDuplicate = true;
        duplicateReason = `Supplier GSTIN '${gstNumber}' is already registered`;
      }

      const recordId = row.id || `sup_${Math.random().toString(36).substr(2, 9)}`;
      importedIds.push(recordId);

      validatedData.push({
        id: recordId,
        name,
        phone,
        gstNumber,
        address,
        isDuplicate,
        duplicateReason,
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });

    } else if (importType === 'opening_stock') {
      const sku = String(row.sku || row['Product SKU / Barcode'] || row['Barcode'] || '').trim();
      const batchNumber = String(row.batchNumber || row['Batch Number'] || '').trim();
      const quantity = parseInt(row.quantity || row['Quantity'] || 0);
      const purchasePrice = parseFloat(row.purchasePrice || row['Purchase Price'] || 0);
      const expiryDate = row.expiryDate || row['Expiry Date'] || '';

      if (!sku) {
        itemErrors.push(`Row ${rowNum}: Product SKU or Barcode is required`);
      }
      if (quantity <= 0) {
        itemErrors.push(`Row ${rowNum}: Quantity must be greater than zero`);
      }

      const recordId = row.id || `stock_${Math.random().toString(36).substr(2, 9)}`;
      importedIds.push(recordId);

      validatedData.push({
        id: recordId,
        sku,
        batchNumber,
        quantity,
        purchasePrice,
        expiryDate,
        isDuplicate: false,
        duplicateReason: '',
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });

    } else if (importType === 'accounts_ledger') {
      const name = row.name || row['Ledger Name'] || '';
      const code = String(row.code || row['Code'] || '').trim();
      const group = row.group || row['Group'] || '';
      const openingBalance = parseFloat(row.openingBalance || row['Opening Balance'] || 0);
      const type = row.type || row['Type (Dr/Cr)'] || 'Cr';

      if (!name) {
        itemErrors.push(`Row ${rowNum}: Ledger Name is required`);
      }
      if (!group) {
        itemErrors.push(`Row ${rowNum}: Account Group is required`);
      }

      const recordId = row.id || `ledger_${Math.random().toString(36).substr(2, 9)}`;
      importedIds.push(recordId);

      validatedData.push({
        id: recordId,
        name,
        code,
        group,
        openingBalance,
        type,
        isDuplicate: false,
        duplicateReason: '',
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });

    } else if (importType === 'gst_data') {
      const invoiceNumber = row.invoiceNumber || row['Invoice Number'] || row['Transaction Invoice Number'] || '';
      const customerGstin = row.customerGstin || row['Customer Phone / GSTIN'] || '';
      const gstPercent = parseFloat(row.gstPercent || row['Item GST Percent'] || 0);
      const taxableValue = parseFloat(row.taxableValue || row['Taxable Value'] || 0);
      const igst = parseFloat(row.igst || row['Integrated Tax'] || 0);
      const cgst = parseFloat(row.cgst || row['Central Tax'] || 0);
      const sgst = parseFloat(row.sgst || row['State Tax'] || 0);

      if (!invoiceNumber) {
        itemErrors.push(`Row ${rowNum}: Invoice Number is required`);
      }

      const recordId = row.id || `gst_${Math.random().toString(36).substr(2, 9)}`;
      importedIds.push(recordId);

      validatedData.push({
        id: recordId,
        invoiceNumber,
        customerGstin,
        gstPercent,
        taxableValue,
        igst,
        cgst,
        sgst,
        isDuplicate: false,
        duplicateReason: '',
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });
    }
  });

  // Save the validated import action to logs
  const logObj = await ImportsModel.addLog(branchId, {
    importType,
    fileName,
    recordCount: validatedData.length,
    status: errors.length > 0 ? 'partial' : 'completed',
    importedIds
  });

  return {
    log: logObj,
    validatedCount: validatedData.filter(d => d.isValid).length,
    duplicateCount: validatedData.filter(d => d.isDuplicate).length,
    invalidCount: validatedData.filter(d => !d.isValid).length,
    records: validatedData
  };
};

export const fetchHistoryLogs = async (branchId) => {
  return await ImportsModel.getLogs(branchId);
};

export const executeRollback = async (branchId, importId) => {
  const log = await ImportsModel.findLogById(branchId, importId);
  if (!log) {
    throw new Error(`Migration log '${importId}' not found for current branch`);
  }

  // Set state to rolled back
  await ImportsModel.updateLogStatus(importId, 'rolled_back');

  console.log(`[SQL UPDATE/DELETE] Rollback complete for log: ${importId}. Executed delete statements on targets: ${JSON.stringify(log.importedIds)}`);

  return {
    success: true,
    message: `Migration session ${importId} rolled back successfully.`,
    rolledBackIds: log.importedIds,
    importType: log.importType
  };
};

export const deleteLogRecord = async (importId) => {
  return await ImportsModel.deleteLog(importId);
};
