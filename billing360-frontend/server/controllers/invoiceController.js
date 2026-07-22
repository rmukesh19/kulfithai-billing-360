import fs from 'fs';
import path from 'path';

const INVOICES_FILE = path.join(process.cwd(), 'server', 'data', 'invoices.json');

// Helper to ensure the data folder and file exists
const ensureFileExists = () => {
  const dir = path.dirname(INVOICES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(INVOICES_FILE)) {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify([], null, 2), 'utf8');
  }
};

export const syncInvoices = (req, res) => {
  const { invoices } = req.body;

  if (!invoices || !Array.isArray(invoices)) {
    return res.status(400).json({
      success: false,
      error: 'Invoices array is required'
    });
  }

  try {
    ensureFileExists();
    const fileData = fs.readFileSync(INVOICES_FILE, 'utf8');
    const existingInvoices = JSON.parse(fileData);

    const syncedInvoices = [];
    const duplicates = [];

    invoices.forEach((inv) => {
      // Basic check for duplicates
      const isDuplicate = existingInvoices.some((existing) => existing.invoiceNumber === inv.invoiceNumber);
      if (!isDuplicate) {
        const withTimestamp = {
          ...inv,
          syncedAt: new Date().toISOString()
        };
        existingInvoices.push(withTimestamp);
        syncedInvoices.push(withTimestamp);
      } else {
        duplicates.push(inv.invoiceNumber);
      }
    });

    fs.writeFileSync(INVOICES_FILE, JSON.stringify(existingInvoices, null, 2), 'utf8');

    console.log(`[Sync Server] Successfully synchronized ${syncedInvoices.length} invoices. Duplicates skipped: ${duplicates.length}`);

    return res.json({
      success: true,
      message: `Successfully synchronized ${syncedInvoices.length} invoices.`,
      count: syncedInvoices.length,
      skipped: duplicates.length,
      data: syncedInvoices
    });
  } catch (error) {
    console.error('Server sync failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

export const getInvoices = (req, res) => {
  try {
    ensureFileExists();
    const fileData = fs.readFileSync(INVOICES_FILE, 'utf8');
    const invoices = JSON.parse(fileData);

    return res.json({
      success: true,
      data: invoices.filter(inv => !inv.is_deleted)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

export const deleteInvoice = (req, res) => {
  const { id } = req.params;
  try {
    ensureFileExists();
    const fileData = fs.readFileSync(INVOICES_FILE, 'utf8');
    const invoices = JSON.parse(fileData);

    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: `Invoice '${id}' not found`
      });
    }

    invoice.is_deleted = 1;
    invoice.deleted_at = new Date().toISOString();

    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');

    return res.json({
      success: true,
      message: 'Invoice soft deleted successfully',
      data: invoice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
