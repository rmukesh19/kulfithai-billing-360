import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'server', 'data', 'config.json');

const ensureFileExists = () => {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = {
      companyName: 'Billing360 Enterprise',
      version: '2.5.0',
      features: {
        gst: true,
        inventory: true,
        reports: true,
        aiInsights: true
      },
      supportContact: 'support@billing360.com',
      country: 'India',
      currency: 'INR',
      language: 'English',
      timezone: 'Asia/Kolkata',
      tax_type: 'GST',
      tax_percentage: 18,
      accounting_system: 'TallyPrime',
      gstIn: '',
      address: '',
      invoicePrefix: 'INV-',
      enableGst: true,
      gstType: 'Regular',
      businessType: 'General Retail',
      ownerName: '',
      panNumber: '',
      cinNumber: '',
      msmeNumber: '',
      fssaiNumber: '',
      drugLicense: '',
      phone: '',
      alternatePhone: '',
      email: '',
      whatsappNumber: '',
      website: '',
      city: '',
      state: '',
      pincode: '',
      financialYear: '2026-27',
      decimalSettings: 2,
      defaultGstPercent: 18,
      inclusiveTax: false,
      enableHsn: true,
      hsnDigitCount: 4,
      enableEInvoice: false,
      eInvoiceUsername: '',
      invoiceStartingNumber: 1,
      invoiceFooter: '',
      termsConditions: '',
      autoInvoiceNumber: true,
      showBarcodeInInvoice: false,
      showQrInInvoice: true,
      printSize: 'Thermal',
      showProductImageInInvoice: false,
      upiId: '',
      upiQrUrl: '',
      bankDetails: '',
      printerName: '',
      printerType: 'Thermal',
      paperSize: '80mm',
      autoPrint: true,
      enableWhatsApp: false,
      whatsappApiToken: '',
      autoShareInvoice: false,
      autoBackup: false,
      backupFrequency: 'Daily',
      backupLocation: 'Google Drive',
      enableTallyExport: false,
      tallyVersion: 'TallyPrime',
      tallyIp: '127.0.0.1',
      tallyPort: '9000',
      requireMfa: false,
      restrictLoginByHours: false,
      ipWhitelisting: false,
      minPasswordLength: 8,
      passwordExpiryDays: 90,
      logoUrl: '',
      signatureUrl: '',
      faviconUrl: ''
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
  }
};

export const getConfig = (req, res) => {
  try {
    ensureFileExists();
    const fileData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(fileData);
    return res.json({
      success: true,
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to read configuration'
    });
  }
};

export const saveConfig = (req, res) => {
  try {
    ensureFileExists();
    const newConfig = req.body;

    // Apply country-specific overrides (Dynamic Logic)
    if (newConfig.country === 'India') {
      newConfig.currency = 'INR';
      newConfig.tax_type = 'GST';
      newConfig.accounting_system = 'TallyPrime';
      newConfig.timezone = 'Asia/Kolkata';
      newConfig.currencyFormat = '₹X,XXX.XX';
      newConfig.dateFormat = 'DD-MM-YYYY';
    } else if (newConfig.country === 'Thailand') {
      newConfig.currency = 'THB';
      newConfig.tax_type = 'VAT';
      newConfig.accounting_system = 'TallyPrime';
      newConfig.timezone = 'Asia/Bangkok';
      newConfig.currencyFormat = '฿X,XXX.XX';
      newConfig.dateFormat = 'DD-MM-YYYY';
    } else if (newConfig.country === 'Singapore') {
      newConfig.currency = 'SGD';
      newConfig.tax_type = 'GST';
      newConfig.accounting_system = 'Xero';
      newConfig.timezone = 'Asia/Singapore';
      newConfig.currencyFormat = 'S$X,XXX.XX';
      newConfig.dateFormat = 'DD-MM-YYYY';
    } else if (newConfig.country === 'Malaysia') {
      newConfig.currency = 'MYR';
      newConfig.tax_type = 'SST';
      newConfig.accounting_system = 'None';
      newConfig.timezone = 'Asia/Kuala_Lumpur';
      newConfig.currencyFormat = 'RM X,XXX.XX';
      newConfig.dateFormat = 'DD-MM-YYYY';
    } else if (newConfig.country === 'UAE') {
      newConfig.currency = 'AED';
      newConfig.tax_type = 'VAT';
      newConfig.accounting_system = 'Zoho Books';
      newConfig.timezone = 'Asia/Dubai';
      newConfig.currencyFormat = 'AED X,XXX.XX';
      newConfig.dateFormat = 'DD-MM-YYYY';
    } else if (newConfig.country === 'USA') {
      newConfig.currency = 'USD';
      newConfig.tax_type = 'Sales Tax';
      newConfig.accounting_system = 'QuickBooks';
      newConfig.timezone = 'America/New_York';
      newConfig.currencyFormat = '$X,XXX.XX';
      newConfig.dateFormat = 'MM-DD-YYYY';
    } else if (newConfig.country === 'UK') {
      newConfig.currency = 'GBP';
      newConfig.tax_type = 'VAT';
      newConfig.accounting_system = 'None';
      newConfig.timezone = 'Europe/London';
      newConfig.currencyFormat = '£X,XXX.XX';
      newConfig.dateFormat = 'DD-MM-YYYY';
    } else if (newConfig.country === 'Europe') {
      newConfig.currency = 'EUR';
      newConfig.tax_type = 'VAT';
      newConfig.accounting_system = 'None';
      newConfig.timezone = 'Europe/Paris';
      newConfig.currencyFormat = '€X,XXX.XX';
      newConfig.dateFormat = 'DD-MM-YYYY';
    }

    const fileData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const existingConfig = JSON.parse(fileData);
    
    const mergedConfig = {
      ...existingConfig,
      ...newConfig
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(mergedConfig, null, 2), 'utf8');

    console.log('[Config Server] Configuration saved successfully:', mergedConfig.companyName);

    return res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: mergedConfig
    });
  } catch (error) {
    console.error('Failed to save configuration:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to save configuration'
    });
  }
};

