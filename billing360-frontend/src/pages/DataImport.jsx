import { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  FileSpreadsheet, 
  ArrowRight, 
  Trash2, 
  Settings, 
  Columns, 
  AlertCircle, 
  Undo, 
  FileText, 
  Check, 
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { translations } from '../lib/translations';
import { db, serverTimestamp } from '../lib/firebase';
import { SettingsService, ProductService, CustomerService, SupplierService, LedgerService } from '../services/dataService';

export default function DataImport() {
  const { userProfile } = useAuth();
  const [config, setConfig] = useState(null);
  const [importType, setImportType] = useState('products');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [importedRows, setImportedRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [preflightData, setPreflightData] = useState([]);
  const [importStats, setImportStats] = useState({ valid: 0, duplicates: 0, errors: 0 });
  const [loading, setLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [importStep, setImportStep] = useState(1); // 1: Select/Download, 2: Upload, 3: Column Map, 4: Preview validation, 5: Done
  const [textPaste, setTextPaste] = useState('');
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip', 'overwrite'
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all', 'duplicates', 'errors', 'valid'

  // Master lists for duplicate checking
  const [liveProducts, setLiveProducts] = useState([]);
  const [liveCustomers, setLiveCustomers] = useState([]);
  const [liveSuppliers, setLiveSuppliers] = useState([]);
  const [liveLedgers, setLiveLedgers] = useState([]);

  useEffect(() => {
    if (userProfile?.branchId) {
      SettingsService.getConfig(userProfile.branchId, setConfig);
      
      // Load current datasets for duplicate pre-scans
      const unsubProducts = ProductService.getProducts(userProfile.branchId, setLiveProducts);
      const unsubCustomers = CustomerService.getCustomers(userProfile.branchId, setLiveCustomers);
      const unsubSuppliers = SupplierService.getSuppliers(userProfile.branchId, setLiveSuppliers);
      const unsubLedgers = LedgerService.getLedgers(userProfile.branchId, setLiveLedgers);

      fetchHistory();

      return () => {
        unsubProducts();
        unsubCustomers();
        unsubSuppliers();
        unsubLedgers();
      };
    }
  }, [userProfile?.branchId]);

  const fetchHistory = async () => {
    if (!userProfile?.branchId) return;
    try {
      const response = await fetch(`/api/modular/imports/history?branchId=${userProfile.branchId}`);
      const json = await response.json();
      if (json.success) {
        setHistoryLogs(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load import history logs', e);
    }
  };

  const t = translations[config?.language || 'English'] || translations.English;

  // Schema properties based on selection
  const schemas = {
    products: {
      name: 'Products Master',
      icon: <FileSpreadsheet className="text-emerald-500" size={24} />,
      desc: 'Contains critical stock inventories with associated barcodes, purchase values, and selling pricing.',
      fields: [
        { key: 'name', label: 'Product Name', required: true, desc: 'Primary identification text, e.g., Coca Cola 500ml' },
        { key: 'barcode', label: 'Barcode', required: false, desc: 'Optional unique product scan code, e.g. 8901031200124' },
        { key: 'sku', label: 'SKU', required: false, desc: 'Stock Keeping Unit identifier code, e.g. COKE-500-PT' },
        { key: 'hsn', label: 'HSN/SAC', required: false, desc: 'Standard item taxation code for invoice prints' },
        { key: 'gstPercent', label: 'GST Percentage', required: false, desc: 'Standard tax margin e.g., 18 or 12' },
        { key: 'sellingPrice', label: 'Selling Price', required: true, desc: 'Final store valuation to client' },
        { key: 'purchasePrice', label: 'Purchase Price', required: false, desc: 'Cost at inward supply' },
        { key: 'stock', label: 'Opening Stock', required: false, desc: 'Current available physical count' },
        { key: 'unit', label: 'Unit', required: false, desc: 'Measurement key (pcs, kg, box)' },
        { key: 'category', label: 'Category', required: false, desc: 'Department clustering (Beverages, Groceries)' }
      ],
      sampleCSV: `Product Name,Barcode,SKU,HSN,GST,Price,Stock,Unit,Category\nParle-G 100g,8901719101117,PG-100,1905,18,10,250,pcs,Snacks\nBritannia Marie Gold 250g,8901063142218,BMG-250,1905,18,30,120,pcs,Snacks\nColgate MaxFresh 150g,8901117275150,COLG-100,3306,18,115,80,pcs,Cosmetics`
    },
    customers: {
      name: 'Customers Master',
      icon: <Database className="text-blue-500" size={24} />,
      desc: 'Registers corporate/retail entities for receivable credit ledgers and ledger accounts.',
      fields: [
        { key: 'name', label: 'Customer Name', required: true, desc: 'Full business name or individual' },
        { key: 'phone', label: 'Phone Number', required: false, desc: 'Mobile/receivable cell (10 digits)' },
        { key: 'balance', label: 'Opening Balance', required: false, desc: 'Historic unpaid dues (e.g. 5000)' },
        { key: 'city', label: 'City / Location', required: false, desc: 'Geographic distribution region' }
      ],
      sampleCSV: `Customer Name,Phone,Balance,City\nRajesh Kumar,9876543210,1250,Delhi\nSaraswathi Agencies,9444012345,15000,Bangalore\nJohn Doe,9999912345,0,Mumbai`
    },
    suppliers: {
      name: 'Suppliers Master',
      icon: <Database className="text-orange-500" size={24} />,
      desc: 'Saves wholesale supply vendors, enabling simple purchase ledger reconciliation.',
      fields: [
        { key: 'name', label: 'Supplier Name', required: true, desc: 'Primary wholesale corporate identity' },
        { key: 'phone', label: 'Mobile / Contact', required: false, desc: 'Principal support contact number' },
        { key: 'gstNumber', label: 'GSTIN', required: false, desc: 'Supplier Standard India Tax Number (15 char)' },
        { key: 'address', label: 'Address', required: false, desc: 'Vendor corporate physical address' }
      ],
      sampleCSV: `Supplier Name,Mobile,GSTIN,Address\nUniversal Distributors,9811122233,07AAAAA1111A1Z1,Chandi Chowk Sector 5 Delhi\nSupreme Traders,8822334455,29BBBBB2222B2Z2,Majestic Metro Lane Bangalore\nNational Bakers,9000100020,33CCCCC3333C3Z3,Mount Road Chennai`
    },
    opening_stock: {
      name: 'Opening Stock',
      icon: <FileSpreadsheet className="text-purple-500" size={24} />,
      desc: 'Upload initial warehouse stock details with batch tracking, expiry dates, and actual cost prices.',
      fields: [
        { key: 'sku', label: 'Product SKU / Barcode', required: true, desc: 'Link parameter. Must match existing SKU or Barcode' },
        { key: 'batchNumber', label: 'Batch Number', required: false, desc: 'Manufacturers chemical batch grouping, e.g. B-9988' },
        { key: 'quantity', label: 'Quantity', required: true, desc: 'Opening inventory count to register' },
        { key: 'expiryDate', label: 'Expiry Date', required: false, desc: 'YYYY-MM-DD standardized date format' },
        { key: 'purchasePrice', label: 'Purchase Price', required: false, desc: 'Valuation cost for current batch' }
      ],
      sampleCSV: `Product SKU / Barcode,Batch Number,Quantity,Expiry Date,Purchase Price\n8901719101117,B-PG2026,50,2026-12-31,8.20\nBMG-250,B-BMG12,80,2026-09-30,24.50\nCOLG-100,B-COLG01,40,2027-05-15,92.00`
    },
    accounts_ledger: {
      name: 'Accounts Ledger',
      icon: <FileText className="text-indigo-500" size={24} />,
      desc: 'Upload general accounting ledgers to build customized chart of accounts instantly.',
      fields: [
        { key: 'name', label: 'Ledger Name', required: true, desc: 'Ledger primary designation text e.g., Rent A/C' },
        { key: 'code', label: 'Code', required: false, desc: 'Internal account index reference number' },
        { key: 'group', label: 'Group', required: true, desc: 'Standard ledger groups: Expense, Income, Assets, Liabilities' },
        { key: 'openingBalance', label: 'Opening Balance', required: false, desc: 'Starting financial capital value' },
        { key: 'type', label: 'Type (Dr/Cr)', required: false, desc: 'Balance standard type - debit (Dr) or credit (Cr)' }
      ],
      sampleCSV: `Ledger Name,Code,Group,Opening Balance,Type (Dr/Cr)\nOffice Rent Account,LEDG-501,Expense,0,Dr\nCash Reserve Account,LEDG-101,Assets,25000,Dr\nState Bank Account SB,LEDG-102,Assets,450000,Dr\nOutstanding Audit Fee,LEDG-205,Liabilities,5000,Cr`
    },
    gst_data: {
      name: 'GST Compliance Data',
      icon: <FileSpreadsheet className="text-rose-500" size={24} />,
      desc: 'Bulk upload transaction level sheets to audit central GSTR reporting compliance logs.',
      fields: [
        { key: 'invoiceNumber', label: 'Transaction Invoice Number', required: true, desc: 'Historical compliance bill ID e.g., INV-0012' },
        { key: 'customerGstin', label: 'Customer Phone / GSTIN', required: false, desc: 'Associated tax reference metadata' },
        { key: 'gstPercent', label: 'Item GST Percent', required: true, desc: 'Tax category mapping percentage e.g., 18' },
        { key: 'taxableValue', label: 'Taxable Value', required: true, desc: 'Pre-tax baseline billing valuation' },
        { key: 'igst', label: 'Integrated Tax', required: false, desc: 'Interstate tax valuation amount' },
        { key: 'cgst', label: 'Central Tax', required: false, desc: 'Intrastate CGST component amount' },
        { key: 'sgst', label: 'State Tax', required: false, desc: 'Intrastate SGST component amount' }
      ],
      sampleCSV: `Transaction Invoice Number,Customer Phone / GSTIN,Item GST Percent,Taxable Value,Integrated Tax,Central Tax,State Tax\nINV-2026-901,29AAAAA1111A1Z1,18,10000,0,900,900\nINV-2026-902,33CCCCC3333C3Z3,12,5000,600,0,0\nINV-2026-903,9876543210,18,2500,0,225,225`
    }
  };

  const handleTemplateDownload = () => {
    const csvContent = schemas[importType].sampleCSV;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${importType}_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseRowData = (text) => {
    if (!text.trim()) return;

    // Detect CSV or Tab delimited
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    const isCSV = lines[0].includes(',');
    let parsedHeaders = [];
    let parsedRows = [];

    if (isCSV) {
      // Basic CSV parser handling potential escape quotes
      parsedHeaders = splitCSVLine(lines[0]);
      parsedRows = lines.slice(1).map(line => splitCSVLine(line));
    } else {
      // TSV (Tab separated, e.g. Excel Paste)
      parsedHeaders = lines[0].split('\t').map(h => h.trim());
      parsedRows = lines.slice(1).map(line => line.split('\t').map(val => val.trim()));
    }

    setHeaders(parsedHeaders);
    setImportedRows(parsedRows);

    // Dynamic auto-mapper based on similarities
    const defaultMapping = {};
    schemas[importType].fields.forEach(field => {
      const matchIndex = parsedHeaders.findIndex(header => {
        const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        return h === fKey || h === fLabel || h.includes(fKey) || fLabel.includes(h);
      });
      if (matchIndex > -1) {
        defaultMapping[field.key] = matchIndex;
      } else {
        defaultMapping[field.key] = '';
      }
    });

    setColumnMapping(defaultMapping);
    setImportStep(3); // Go to Column Mapping Step
  };

  const splitCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setFileContent(text);
      parseRowData(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setFileContent(text);
        parseRowData(text);
      };
      reader.readAsText(file);
    }
  };

  const handlePasteSubmit = () => {
    if (textPaste.trim()) {
      setFileName('Excel_Pasted_Data.tsv');
      setFileContent(textPaste);
      parseRowData(textPaste);
    }
  };

  const handleUpdateMapping = (fieldKey, value) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: value !== '' ? parseInt(value) : ''
    }));
  };

  const runPreflightAnalysis = async () => {
    if (!userProfile?.branchId) return;
    setLoading(true);

    // Map rows according to user's selections
    const mappedPayload = importedRows.map(row => {
      const record = {};
      schemas[importType].fields.forEach(field => {
        const mappedColIdx = columnMapping[field.key];
        if (mappedColIdx !== undefined && mappedColIdx !== '') {
          record[field.key] = row[mappedColIdx] || '';
        } else {
          record[field.key] = '';
        }
      });
      return record;
    });

    // Package existing lists to let server perform duplicate scan audits
    const existingDataset = {
      products: liveProducts.map(p => ({ barcode: p.barcode, sku: p.sku })),
      customers: liveCustomers.map(c => ({ phone: c.phone })),
      suppliers: liveSuppliers.map(s => ({ gstNumber: s.gstNumber, phone: s.phone })),
    };

    try {
      const response = await fetch('/api/modular/imports/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: userProfile.branchId,
          importType,
          data: mappedPayload,
          existingRecords: existingDataset,
          fileName: fileName || `${importType}_manual_import.csv`
        })
      });

      const json = await response.json();
      if (json.success && json.data) {
        setPreflightData(json.data.records || []);
        setImportStats({
          valid: json.data.validatedCount || 0,
          duplicates: json.data.duplicateCount || 0,
          errors: json.data.invalidCount || 0
        });
        setImportStep(4); // Move to Preview Audit step
      } else {
        alert('Validation error: ' + (json.error || 'Unknown issue'));
      }
    } catch (e) {
      console.error('Audit validation failed', e);
      alert('An unexpected network error occurred while running the duplicate prescan audit.');
    } finally {
      setLoading(false);
    }
  };

  const commitDataToDatabase = async () => {
    if (!userProfile?.branchId || preflightData.length === 0) return;
    setLoading(true);

    try {
      // Loop over processed records and insert to client-side subscribers
      let commitCount = 0;
      let skipCount = 0;

      for (const row of preflightData) {
        if (!row.isValid) {
          skipCount++;
          continue;
        }

        // If duplicate exists and strategy is 'skip', do not perform save
        if (row.isDuplicate && duplicateStrategy === 'skip') {
          skipCount++;
          continue;
        }

        const id = row.id;

        if (importType === 'products') {
          // Check if strategy is 'overwrite' and find matching registered item
          let targetId = id;
          if (row.isDuplicate && duplicateStrategy === 'overwrite') {
            const matches = liveProducts.find(p => p.barcode?.toLowerCase() === row.barcode?.toLowerCase() || p.sku?.toLowerCase() === row.sku?.toLowerCase());
            if (matches) targetId = matches.id;
          }

          const path = `branches/${userProfile.branchId}/products/${targetId}`;
          db.set(path, {
            id: targetId,
            name: row.name,
            barcode: row.barcode || '',
            sku: row.sku || '',
            hsn: row.hsn || '',
            gstPercent: row.gstPercent || 0,
            purchasePrice: row.purchasePrice || 0,
            sellingPrice: row.sellingPrice || 0,
            stock: row.stock || 0,
            unit: row.unit || 'pcs',
            category: row.category || 'General',
            updatedAt: serverTimestamp()
          });
          commitCount++;

        } else if (importType === 'customers') {
          let targetId = id;
          if (row.isDuplicate && duplicateStrategy === 'overwrite') {
            const matches = liveCustomers.find(c => c.phone === row.phone);
            if (matches) targetId = matches.id;
          }

          const path = `branches/${userProfile.branchId}/customers/${targetId}`;
          db.set(path, {
            id: targetId,
            name: row.name,
            phone: row.phone || '',
            balance: row.balance || 0,
            city: row.city || ''
          });
          commitCount++;

        } else if (importType === 'suppliers') {
          let targetId = id;
          if (row.isDuplicate && duplicateStrategy === 'overwrite') {
            const matches = liveSuppliers.find(s => s.gstNumber?.toLowerCase() === row.gstNumber?.toLowerCase() || s.phone === row.phone);
            if (matches) targetId = matches.id;
          }

          const path = `branches/${userProfile.branchId}/suppliers/${targetId}`;
          db.set(path, {
            id: targetId,
            name: row.name,
            phone: row.phone || '',
            gstNumber: row.gstNumber || '',
            address: row.address || ''
          });
          commitCount++;

        } else if (importType === 'opening_stock') {
          // Updates stocks of associated item linked by SKU or Barcode
          const matchProd = liveProducts.find(p => p.sku?.toLowerCase() === row.sku?.toLowerCase() || p.barcode?.toLowerCase() === row.sku?.toLowerCase());
          if (matchProd) {
            const path = `branches/${userProfile.branchId}/products/${matchProd.id}`;
            db.set(path, {
              ...matchProd,
              stock: (matchProd.stock || 0) + (row.quantity || 0),
              purchasePrice: row.purchasePrice || matchProd.purchasePrice || 0,
              updatedAt: serverTimestamp()
            });
            commitCount++;
          } else {
            console.warn(`Product SKU not found: ${row.sku}`);
            skipCount++;
          }

        } else if (importType === 'accounts_ledger') {
          const path = `branches/${userProfile.branchId}/ledgers/${id}`;
          db.set(path, {
            id,
            name: row.name,
            code: row.code || '',
            group: row.group || 'Income',
            openingBalance: row.openingBalance || 0,
            currentBalance: row.openingBalance || 0,
            createdAt: serverTimestamp()
          });
          commitCount++;

        } else if (importType === 'gst_data') {
          // Creates simulated invoices inside the live invoice ledger to reconcile tax GSTR
          const path = `branches/${userProfile.branchId}/invoices/${id}`;
          db.set(path, {
            id,
            invoiceNumber: row.invoiceNumber,
            customerName: 'Compliance GSTR-Import',
            customerPhone: row.customerGstin || 'Unregistered',
            createdAt: serverTimestamp(),
            paymentMode: 'cash',
            isGst: true,
            subtotal: row.taxableValue,
            totalTax: (row.igst || row.cgst + row.sgst || 0),
            discount: 0,
            totalAmount: row.taxableValue + (row.igst || row.cgst + row.sgst || 0),
            items: [
              {
                id: 'imported_tax',
                name: 'Compliance Asset Transfer',
                quantity: 1,
                price: row.taxableValue,
                gstPercent: row.gstPercent,
                cgst_amount: row.cgst || 0,
                sgst_amount: row.sgst || 0,
                total: row.taxableValue + (row.cgst + row.sgst || 0)
              }
            ]
          });
          commitCount++;
        }
      }

      setImportStep(5); // Show success splash
      fetchHistory(); // Refresh audit logs tables
    } catch (e) {
      console.error('Core write operations failed', e);
      alert('Failed to copy imported rows to memory directories.');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (importId) => {
    if (!userProfile?.branchId) return;
    if (!window.confirm('WARNING: Are you sure you want to perform a full ROLLBACK on this import session? Doing so will permanently delete all records imported in this batch.')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/modular/imports/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: userProfile.branchId,
          importId
        })
      });

      const json = await response.json();
      if (json.success && json.data) {
        const { rolledBackIds, importType } = json.data;

        // Perform clean cascade delete on client-side subscribers
        let deletedNum = 0;
        rolledBackIds.forEach(id => {
          let path = '';
          if (importType === 'products') path = `branches/${userProfile.branchId}/products/${id}`;
          else if (importType === 'customers') path = `branches/${userProfile.branchId}/customers/${id}`;
          else if (importType === 'suppliers') path = `branches/${userProfile.branchId}/suppliers/${id}`;
          else if (importType === 'accounts_ledger') path = `branches/${userProfile.branchId}/ledgers/${id}`;
          else if (importType === 'gst_data') path = `branches/${userProfile.branchId}/invoices/${id}`;

          if (path && db.get(path)) {
            db.delete(path);
            deletedNum++;
          }
        });

        alert(`ROLLBACK COMPLETE: Successfully deleted ${deletedNum} registered database rows associated with import session ${importId}.`);
        fetchHistory();
      } else {
        alert('Rollback failed: ' + (json.error || 'Server error'));
      }
    } catch (e) {
      console.error('Rollback network error', e);
      alert('Rollback request failed.');
    } finally {
      setLoading(false);
    }
  };

  const deleteLogItem = async (id) => {
    if (!window.confirm('Delete this audit log from your list history? This action will NOT delete the actual items in the database (use Rollback instead).')) return;
    try {
      const response = await fetch(`/api/modular/imports/${id}`, {
        method: 'DELETE'
      });
      const json = await response.json();
      if (json.success) {
        fetchHistory();
      }
    } catch (e) {
      console.error('Delete log failed', e);
    }
  };

  const resetImportController = () => {
    setFileName('');
    setFileContent('');
    setImportedRows([]);
    setHeaders([]);
    setColumnMapping({});
    setPreflightData([]);
    setTextPaste('');
    setImportStep(1);
  };

  const currentSchema = schemas[importType];

  const filteredPreviewData = preflightData.filter(row => {
    if (previewFilter === 'all') return true;
    if (previewFilter === 'duplicates') return row.isDuplicate;
    if (previewFilter === 'errors') return !row.isValid;
    if (previewFilter === 'valid') return row.isValid && !row.isDuplicate;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Dynamic Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Database className="text-blue-600" size={26} />
            Data Import Management
          </h2>
          <p className="text-slate-500 text-sm">Professional ERP bulk-data wizard and cloud migration center</p>
        </div>
        <button 
          onClick={resetImportController}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
        >
          <RefreshCw size={14} />
          Reset Wizard
        </button>
      </div>

      {/* Visual Workspace Track Stepper */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <div className="relative max-w-4xl mx-auto flex items-center justify-between">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
          
          {[
            { step: 1, label: 'Download Template' },
            { step: 2, label: 'Upload File' },
            { step: 3, label: 'Column Mapping' },
            { step: 4, label: 'Preflight Preview' },
            { step: 5, label: 'Completed' }
          ].map((item) => (
            <div key={item.step} className="relative z-10 flex flex-col items-center gap-2">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                importStep > item.step ? "bg-emerald-500 text-white shadow-md" :
                importStep === item.step ? "bg-blue-600 text-white ring-4 ring-blue-100 scale-110 shadow-lg" :
                "bg-white text-slate-400 border-2 border-slate-200"
              )}>
                {importStep > item.step ? <Check size={16} /> : item.step}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider text-center hidden sm:block",
                importStep === item.step ? "text-blue-600" : "text-slate-400"
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Wizard Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Select Import Category (Always displays in Step 1) */}
        {importStep === 1 && (
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">1. Choose Migration Master Sheet</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(schemas).map(([key, schema]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setImportType(key);
                      setImportStep(2); // Instantly move to upload
                    }}
                    className={cn(
                      "flex flex-col items-start p-6 rounded-2xl border text-left transition-all hover:shadow-md group active:scale-[0.98]",
                      importType === key 
                        ? "border-blue-500 bg-blue-50/20 shadow-sm" 
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      {schema.icon}
                    </div>
                    <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm">{schema.name}</h4>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{schema.desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-blue-600 italic">
                      Move Forward <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Unified Step 2: Sample Templates & File Uploader */}
        {importStep === 2 && (
          <div className="xl:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Guide & Sample Template DL Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-black tracking-widest">
                  <Database size={16} />
                  <span>Module Config: {currentSchema.name}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Prepare Clean Spreadsheet</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Make sure your file columns match standard fields or contains labels.
                  Download the official structured template to write your rows safely before uploading.
                </p>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered Target Fields:</p>
                  <div className="flex flex-wrap gap-1.5 h-48 overflow-y-auto no-scrollbar pr-2">
                    {currentSchema.fields.map(f => (
                      <div key={f.key} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 flex items-center gap-1 shadow-sm">
                        <span>{f.label}</span>
                        {f.required ? <span className="text-red-500 text-xs">*</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-3">
                <button
                  onClick={handleTemplateDownload}
                  type="button"
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest active:scale-[0.98] hover:bg-blue-100 transition-all border border-blue-200"
                >
                  <Download size={14} />
                  Download Sample CSV
                </button>
                <button
                  onClick={() => setImportStep(1)}
                  type="button"
                  className="w-full text-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Change Import Type
                </button>
              </div>
            </div>

            {/* Direct File drop field & Paste panel */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">2. Load File onto Server</h3>

              {/* Drag file Box */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="relative h-64 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <input 
                  type="file" 
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 bg-white border border-slate-100 group-hover:scale-105 transition-transform rounded-full flex items-center justify-center shadow-lg shadow-slate-100 text-slate-400 group-hover:text-blue-500 mb-4">
                  <Upload size={24} />
                </div>
                <p className="font-bold text-slate-700 text-sm">Drag and drop file here</p>
                <p className="text-slate-400 text-xs mt-1">Accepts standard .csv, .tsv or .txt exports</p>
                
                <div className="mt-4 px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                  Or Browse Files
                </div>
              </div>

              {/* Direct text paste zone */}
              <div className="border border-slate-100 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paste direct from Excel</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold uppercase text-[9px] tracking-wider rounded">TSV Mode</span>
                </div>
                <textarea
                  value={textPaste}
                  onChange={e => setTextPaste(e.target.value)}
                  placeholder="Paste table columns from Excel here (with headers as first row)..."
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-xs font-mono font-bold"
                ></textarea>
                {textPaste.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    className="mt-2 w-full py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 active:scale-[0.98]"
                  >
                    Parse Pasted Text
                  </button>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Step 3: Column Mapping Selectors */}
        {importStep === 3 && (
          <div className="xl:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-blue-600 text-xs uppercase font-black tracking-widest">
                  <Columns size={16} />
                  <span>Map File Attributes</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Match File Columns to ERP Properties</h3>
                <p className="text-slate-400 text-xs mt-1">Verify that each target Database field links cleanly. Non-mapped optional values default to empty.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl">
                <FileSpreadsheet size={16} />
                <span className="text-xs font-bold font-mono">Found {headers.length} columns | {importedRows.length} rows</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentSchema.fields.map(field => {
                const isMapped = columnMapping[field.key] !== '';
                return (
                  <div 
                    key={field.key} 
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[120px]",
                      isMapped ? "bg-white border-blue-500/20 shadow-sm" : "bg-slate-50 border-slate-100"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-red-500">*</span>}
                        </span>
                        
                        {isMapped ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg">MAPPED</span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-500 rounded-lg">UNMAPPED</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{field.desc}</p>
                    </div>

                    <select
                      value={columnMapping[field.key]}
                      onChange={e => handleUpdateMapping(field.key, e.target.value)}
                      className="w-full mt-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Ignore Field --</option>
                      {headers.map((hdr, hIdx) => (
                        <option key={hIdx} value={hIdx}>{hdr} (Col {hIdx + 1})</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-4">
              <button
                onClick={() => setImportStep(2)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
              >
                Back to Upload
              </button>
              <button
                disabled={currentSchema.fields.filter(f => f.required).some(f => columnMapping[f.key] === '')}
                onClick={runPreflightAnalysis}
                className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                Run Validation Preflight
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preflight Table Preview & Rules Settings */}
        {importStep === 4 && (
          <div className="xl:col-span-4 space-y-6">
            
            {/* Split controls & stats badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-3xl border border-slate-200">
              
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bulk Import Options</h4>
                
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">If entity barcode/phone exists:</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl mt-1.5 gap-1">
                    <button
                      type="button"
                      onClick={() => setDuplicateStrategy('skip')}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all",
                        duplicateStrategy === 'skip' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                      )}
                    >
                      Skip Record
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateStrategy('overwrite')}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all",
                        duplicateStrategy === 'overwrite' ? "bg-blue-600 text-white shadow-sm" : "text-slate-400"
                      )}
                    >
                      Overwrite Value
                    </button>
                  </div>
                </div>
              </div>

              {/* Pre-scan alerts counts */}
              <div className="col-span-2 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Duplicate & Security Audit</h4>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">{importStats.valid}</div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Validated</p>
                        <p className="text-xs font-black text-slate-800">No Audits Fail</p>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">{importStats.duplicates}</div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Duplicates</p>
                        <p className="text-xs font-black text-slate-800">{duplicateStrategy === 'skip' ? 'Skipping' : 'Updating'}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">{importStats.errors}</div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Errors</p>
                        <p className="text-xs font-black text-slate-800">Need Correc</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Validation Table Sheet */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4">
                <span className="text-sm font-bold text-slate-800">Preflight Raw Table Logs</span>
                
                {/* Tables filters */}
                <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {[
                    { key: 'all', label: 'All Items' },
                    { key: 'valid', label: 'Ready' },
                    { key: 'duplicates', label: 'Duplicates' },
                    { key: 'errors', label: 'Errors' }
                  ].map(btn => (
                    <button
                      key={btn.key}
                      onClick={() => setPreviewFilter(btn.key)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                        previewFilter === btn.key ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-400"
                      )}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-5 py-3">Status</th>
                      {currentSchema.fields.map(f => (
                        <th key={f.key} className="px-5 py-3">{f.label}</th>
                      ))}
                      <th className="px-5 py-3">Conflict notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredPreviewData.map((row, rIdx) => {
                      const hasErr = !row.isValid;
                      const hasDup = row.isDuplicate;

                      let statusBadge = (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold uppercase text-[9px] tracking-wider">OK / READY</span>
                      );
                      if (hasErr) statusBadge = (
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full font-bold uppercase text-[9px] tracking-wider">ERROR</span>
                      );
                      else if (hasDup) statusBadge = (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-500 rounded-full font-bold uppercase text-[9px] tracking-wider">CONFLICT</span>
                      );

                      return (
                        <tr 
                          key={rIdx} 
                          className={cn(
                            "hover:bg-slate-50/50 transition-colors",
                            hasErr ? "bg-red-50/20" : hasDup ? "bg-amber-50/20" : ""
                          )}
                        >
                          <td className="px-5 py-3.5 font-bold">{statusBadge}</td>
                          {currentSchema.fields.map(f => (
                            <td key={f.key} className="px-5 py-3.5 font-semibold text-slate-700">
                              {row[f.key] !== undefined ? String(row[f.key]) : '-'}
                            </td>
                          ))}
                          <td className="px-5 py-3.5 text-slate-400 italic font-medium">
                            {hasErr ? row.errors.join(', ') : hasDup ? row.duplicateReason : 'All systems clean'}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredPreviewData.length === 0 && (
                      <tr>
                        <td colSpan={currentSchema.fields.length + 2} className="px-5 py-12 text-center text-slate-400 italic">
                          No matching preview records filtered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setImportStep(3)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl transition-colors"
              >
                Modify Mapping
              </button>
              <button
                onClick={commitDataToDatabase}
                disabled={preflightData.filter(d => d.isValid).length === 0}
                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                Confirm and Import {preflightData.filter(d => d.isValid && (!d.isDuplicate || duplicateStrategy === 'overwrite')).length} Valid Rows
              </button>
            </div>

          </div>
        )}

        {/* Step 5: Completed splashing success */}
        {importStep === 5 && (
          <div className="xl:col-span-4 bg-white p-12 rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
              <CheckCircle2 size={42} />
            </div>
            
            <div className="space-y-2 max-w-xl">
              <h3 className="text-2xl font-black text-slate-900">Database Migration Succeeded!</h3>
              <p className="text-slate-400 text-sm">
                Your uploaded excel matrix has been processed and saved inside the local ERP indices.
                All related inventories, supplier accounts, and master summaries have updated actively.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={resetImportController}
                className="px-6 py-3.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}

        {/* Audit Logs and Import History */}
        <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-blue-500" size={18} />
              <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Enterprise Import History & Rollback Logs</span>
            </div>
            <span className="text-slate-400 text-[10px] font-bold">SQL Logs actively verified</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-3">Logged Date</th>
                  <th className="px-5 py-3">File Reference</th>
                  <th className="px-5 py-3">Migrated Type</th>
                  <th className="px-5 py-3 text-center">Row Count</th>
                  <th className="px-5 py-3">Database Stage</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {historyLogs.map(log => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  let typeBg = 'bg-slate-50 text-slate-500';
                  if (log.importType === 'products') typeBg = 'bg-emerald-50 text-emerald-600';
                  else if (log.importType === 'suppliers') typeBg = 'bg-orange-50 text-orange-600';
                  else if (log.importType === 'customers') typeBg = 'bg-blue-50 text-blue-600';
                  else if (log.importType === 'accounts_ledger') typeBg = 'bg-indigo-50 text-indigo-600';
                  else if (log.importType === 'gst_data') typeBg = 'bg-rose-50 text-rose-600';

                  let statusBadge = (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-bold uppercase text-[9px] tracking-wider">COMPLETED</span>
                  );
                  if (log.status === 'rolled_back') {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-600 rounded-full font-bold uppercase text-[9px] tracking-wider">ROLLED BACK</span>
                    );
                  } else if (log.status === 'partial') {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-500 rounded-full font-bold uppercase text-[9px] tracking-wider">PARTIAL</span>
                    );
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-500">{formattedDate}</td>
                      <td className="px-5 py-4 font-semibold text-slate-700 flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-400" />
                        <span>{log.fileName}</span>
                      </td>
                      <td className="px-5 py-4 uppercase">
                        <span className={cn("px-2.5 py-0.5 rounded-full font-bold text-[9px] tracking-wider", typeBg)}>
                          {log.importType}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-slate-800">{log.recordCount}</td>
                      <td className="px-5 py-4">{statusBadge}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {log.status !== 'rolled_back' ? (
                            <button
                              onClick={() => handleRollback(log.id)}
                              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 transition-all"
                              title="Rollback items"
                            >
                              <Undo size={10} />
                              Rollback
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No Actions</span>
                          )}
                          <button
                            onClick={() => deleteLogItem(log.id)}
                            className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                            title="Delete log"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {historyLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 italic">
                      No previous migration history recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
