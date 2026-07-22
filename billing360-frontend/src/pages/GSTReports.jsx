import { useState, useEffect } from 'react';
import { FileJson, FileSpreadsheet, Download, Filter, HelpCircle, Calendar, Tag, ShieldCheck, Wallet, ArrowRightLeft, BookOpen, Warehouse } from 'lucide-react';
import { cn } from '../lib/utils';
import { InvoiceService, PurchaseService, SettingsService, BranchService } from '../services/dataService';
import { useAuth } from '../lib/AuthContext';
import { translations } from '../lib/translations';
import { useLocalization } from '../lib/LocalizationContext';
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

export default function GSTReports() {
  const { userProfile } = useAuth();
  const { config: globalConfig, currencySymbol, formatCurrency } = useLocalization();
  const taxName = globalConfig?.tax_type || 'GST';
  const cgstLabel = taxName === 'GST' ? 'CGST' : 'Local ' + taxName;
  const sgstLabel = taxName === 'GST' ? 'SGST' : 'State ' + taxName;
  const igstLabel = taxName === 'GST' ? 'IGST' : 'Integrated ' + taxName;
  const [activeReport, setActiveReport] = useState('gstr1');
  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [config, setConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (userProfile?.branchId) {
      SettingsService.getConfig(userProfile.branchId, setConfig);
      
      const unsubInvoices = InvoiceService.getAllInvoices(userProfile.branchId, (data) => {
        setInvoices(data || []);
      });
      const unsubPurchases = PurchaseService.getAllPurchases(userProfile.branchId, (data) => {
        setPurchases(data || []);
      });
      const unsubBranches = BranchService.getBranches((data) => {
        setBranches(data || []);
      });

      return () => {
        unsubInvoices();
        unsubPurchases();
        unsubBranches();
      };
    }
  }, [userProfile?.branchId]);

  const isWithinRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const isBranchMatched = (item) => {
    if (selectedBranch === 'all') return true;
    return item.branchId === selectedBranch;
  };

  const isSearchMatched = (item, isSale = true) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = (isSale ? item.customerName : item.supplierName) || '';
    const num = (isSale ? item.invoiceNumber : item.purchaseNumber) || '';
    const phone = item.customerPhone || item.supplierPhone || '';
    return name.toLowerCase().includes(query) || num.toLowerCase().includes(query) || phone.includes(query);
  };

  // Filter lists based on date, branch, search, and GST status
  const filteredInvoices = invoices.filter(inv => isWithinRange(inv.createdAt) && isBranchMatched(inv) && isSearchMatched(inv, true) && inv.isGst !== false);
  const filteredPurchases = purchases.filter(p => isWithinRange(p.createdAt) && isBranchMatched(p) && isSearchMatched(p, false) && p.isGst !== false);

  // Pagination Logic
  const getPaginatedData = (dataList) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return dataList.slice(startIndex, startIndex + itemsPerPage);
  };

  // Compute GSTR-1 Aggregations
  const taxableValue = filteredInvoices.reduce((acc, inv) => acc + (inv.subtotal || 0), 0);
  const totalCgst = filteredInvoices.reduce((acc, inv) => acc + (inv.cgst_amount || 0), 0);
  const totalSgst = filteredInvoices.reduce((acc, inv) => acc + (inv.sgst_amount || 0), 0);
  const totalIgst = filteredInvoices.reduce((acc, inv) => acc + (inv.igst_amount || 0), 0);
  const totalGst = filteredInvoices.reduce((acc, inv) => acc + (inv.totalTax || 0), 0);
  const grandTotal = filteredInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

  // Compute GSTR-2 Aggregations
  const purchaseTaxableValue = filteredPurchases.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const purchaseTotalCgst = filteredPurchases.reduce((acc, p) => acc + (p.cgst_amount || 0), 0);
  const purchaseTotalSgst = filteredPurchases.reduce((acc, p) => acc + (p.sgst_amount || 0), 0);
  const purchaseTotalIgst = filteredPurchases.reduce((acc, p) => acc + (p.igst_amount || 0), 0);
  const purchaseTotalGst = filteredPurchases.reduce((acc, p) => acc + (p.totalTax || 0), 0);
  const purchaseGrandTotal = filteredPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  // Compute HSN Summaries
  const getHsnSummary = () => {
    const hsnMap = {};
    filteredInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        const hsn = item.hsn || '8517';
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsn,
            description: item.category || 'Electronics',
            qty: 0,
            val: 0,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            gst: 0
          };
        }
        const qty = item.quantity || 1;
        const total = item.total || 0;
        const taxable = item.taxable_amount !== undefined ? item.taxable_amount : (item.price * qty);
        
        hsnMap[hsn].qty += qty;
        hsnMap[hsn].val += total;
        hsnMap[hsn].taxable += taxable;
        hsnMap[hsn].cgst += (item.cgst_amount || 0);
        hsnMap[hsn].sgst += (item.sgst_amount || 0);
        hsnMap[hsn].igst += (item.igst_amount || 0);
        hsnMap[hsn].gst += (item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0);
      });
    });
    return Object.values(hsnMap);
  };

  const hsnSummaryList = getHsnSummary();

  const t = translations[config?.language || 'English'] || translations.English;

  // Active list mapping for pagination
  const getActiveListLength = () => {
    if (activeReport === 'gstr1') return filteredInvoices.length;
    if (activeReport === 'gstr2') return filteredPurchases.length;
    if (activeReport === 'hsn') return hsnSummaryList.length;
    return 0;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeReport, searchQuery, fromDate, toDate, selectedBranch]);

  // Export functions
  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rich columns
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${taxName} Report - ${activeReport.toUpperCase()}`, 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate} | Branch: ${selectedBranch === 'all' ? 'All Outlets' : selectedBranch}`, 14, 20);
    doc.line(14, 22, 282, 22);

    let columns = [];
    let rows = [];

    if (activeReport === 'gstr1') {
      columns = ["Inv No", "Customer", "Subtotal (Taxable)", cgstLabel, sgstLabel, igstLabel, `Total ${taxName}`, "Grand Total"];
      rows = filteredInvoices.map(inv => [
        inv.invoiceNumber,
        inv.customerName || 'Walk-in',
        `${currencySymbol}${(inv.subtotal || 0).toFixed(2)}`,
        `${currencySymbol}${(inv.cgst_amount || 0).toFixed(2)}`,
        `${currencySymbol}${(inv.sgst_amount || 0).toFixed(2)}`,
        `${currencySymbol}${(inv.igst_amount || 0).toFixed(2)}`,
        `${currencySymbol}${(inv.totalTax || 0).toFixed(2)}`,
        `${currencySymbol}${(inv.totalAmount || 0).toFixed(2)}`
      ]);
    } else if (activeReport === 'gstr2') {
      columns = ["Purchase No", "Supplier", "Subtotal (Taxable)", cgstLabel, sgstLabel, igstLabel, `Total ${taxName}`, "Grand Total"];
      rows = filteredPurchases.map(p => [
        p.purchaseNumber,
        p.supplierName,
        `${currencySymbol}${(p.subtotal || 0).toFixed(2)}`,
        `${currencySymbol}${(p.cgst_amount || 0).toFixed(2)}`,
        `${currencySymbol}${(p.sgst_amount || 0).toFixed(2)}`,
        `${currencySymbol}${(p.igst_amount || 0).toFixed(2)}`,
        `${currencySymbol}${(p.totalTax || 0).toFixed(2)}`,
        `${currencySymbol}${(p.totalAmount || 0).toFixed(2)}`
      ]);
    } else if (activeReport === 'hsn') {
      columns = ["HSN Code", "Description", "Qty Sold", "Taxable Value", cgstLabel, sgstLabel, igstLabel, `Total ${taxName}`, "Total Value"];
      rows = hsnSummaryList.map(h => [
        h.hsn,
        h.description,
        h.qty,
        `${currencySymbol}${h.taxable.toFixed(2)}`,
        `${currencySymbol}${h.cgst.toFixed(2)}`,
        `${currencySymbol}${h.sgst.toFixed(2)}`,
        `${currencySymbol}${h.igst.toFixed(2)}`,
        `${currencySymbol}${h.gst.toFixed(2)}`,
        `${currencySymbol}${h.val.toFixed(2)}`
      ]);
    } else if (activeReport === 'gstr3b') {
      columns = ["Tax Component Type", "Outward Supplies (Sales Liability)", "Inward Supplies (Purchase ITC)", `Net ${taxName} Tax Payable`];
      rows = [
        [`Central ${taxName} (${cgstLabel})`, `${currencySymbol}${totalCgst.toFixed(2)}`, `${currencySymbol}${purchaseTotalCgst.toFixed(2)}`, `${currencySymbol}${Math.max(0, totalCgst - purchaseTotalCgst).toFixed(2)}`],
        [`State ${taxName} (${sgstLabel})`, `${currencySymbol}${totalSgst.toFixed(2)}`, `${currencySymbol}${purchaseTotalSgst.toFixed(2)}`, `${currencySymbol}${Math.max(0, totalSgst - purchaseTotalSgst).toFixed(2)}`],
        [`Integrated ${taxName} (${igstLabel})`, `${currencySymbol}${totalIgst.toFixed(2)}`, `${currencySymbol}${purchaseTotalIgst.toFixed(2)}`, `${currencySymbol}${Math.max(0, totalIgst - purchaseTotalIgst).toFixed(2)}`],
        [`Total ${taxName} Breakdown`, `${currencySymbol}${totalGst.toFixed(2)}`, `${currencySymbol}${purchaseTotalGst.toFixed(2)}`, `${currencySymbol}${Math.max(0, totalGst - purchaseTotalGst).toFixed(2)}`]
      ];
    }

    doc.autoTable({
      head: [columns],
      body: rows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [33, 41, 54] }
    });

    doc.save(`${taxName}_Report_${activeReport}_${fromDate}_to_${toDate}.pdf`);
  };

  const handleExportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeReport === 'gstr1') {
      csvContent += `Invoice Number,Customer Name,Taxable Subtotal,${cgstLabel},${sgstLabel},${igstLabel},Total ${taxName},Grand Total\n`;
      filteredInvoices.forEach(inv => {
        csvContent += `"${inv.invoiceNumber}","${inv.customerName || 'Walk-in'}","${inv.subtotal}","${inv.cgst_amount || 0}","${inv.sgst_amount || 0}","${inv.igst_amount || 0}","${inv.totalTax}","${inv.totalAmount}"\n`;
      });
    } else if (activeReport === 'gstr2') {
      csvContent += `Purchase Number,Supplier Name,Taxable Subtotal,${cgstLabel},${sgstLabel},${igstLabel},Total ${taxName},Grand Total\n`;
      filteredPurchases.forEach(p => {
        csvContent += `"${p.purchaseNumber}","${p.supplierName}","${p.subtotal}","${p.cgst_amount || 0}","${p.sgst_amount || 0}","${p.igst_amount || 0}","${p.totalTax}","${p.totalAmount}"\n`;
      });
    } else if (activeReport === 'hsn') {
      csvContent += `HSN Code,Description,Qty Sold,Taxable Value,${cgstLabel},${sgstLabel},${igstLabel},Total ${taxName},Total Value\n`;
      hsnSummaryList.forEach(h => {
        csvContent += `"${h.hsn}","${h.description}","${h.qty}","${h.taxable}","${h.cgst}","${h.sgst}","${h.igst}","${h.gst}","${h.val}"\n`;
      });
    } else if (activeReport === 'gstr3b') {
      csvContent += `Tax Type,Outward Sales Tax,Inward Purchase ITC,Net Payable\n`;
      csvContent += `"${cgstLabel}","${totalCgst}","${purchaseTotalCgst}","${Math.max(0, totalCgst - purchaseTotalCgst)}"\n`;
      csvContent += `"${sgstLabel}","${totalSgst}","${purchaseTotalSgst}","${Math.max(0, totalSgst - purchaseTotalSgst)}"\n`;
      csvContent += `"${igstLabel}","${totalIgst}","${purchaseTotalIgst}","${Math.max(0, totalIgst - purchaseTotalIgst)}"\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GST_${activeReport}_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Tally prime compatible multi-ledger sales vouchers envelope XML!
  const handleExportTallyXML = () => {
    if (filteredInvoices.length === 0) {
      alert("No sales invoice found in selected date filters to export to Tally.");
      return;
    }

    let xml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${config?.companyName || "Billing360 Outlets"}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
`;

    filteredInvoices.forEach(inv => {
      const dateStr = new Date(inv.createdAt || Date.now()).toISOString().split('T')[0].replace(/-/g, '');
      const cgstVal = (inv.cgst_amount || 0).toFixed(2);
      const sgstVal = (inv.sgst_amount || 0).toFixed(2);
      const igstVal = (inv.igst_amount || 0).toFixed(2);
      const taxableVal = (inv.subtotal || 0).toFixed(2);
      const totalVal = (inv.totalAmount || 0).toFixed(2);
      
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="AccountingVoucher">
            <DATE>${dateStr}</DATE>
            <VOUCHERNUMBER>${inv.invoiceNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${inv.customerName || 'Cash Customer'}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>AccountingVoucher</PERSISTEDVIEW>
            
            <!-- Customer Debit Entry -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${inv.customerName || 'Cash Customer'}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            
            <!-- Revenue Sales Credit Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>GST Sales Output</LEDGERNAME>
              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>
              <AMOUNT>${taxableVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;

      if (inv.cgst_amount > 0) {
        xml += `            <!-- CGST Output Taxation Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Central GST Output</LEDGERNAME>
              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>
              <AMOUNT>${cgstVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;
      }
      
      if (inv.sgst_amount > 0) {
        xml += `            <!-- SGST Output Taxation Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>State GST Output</LEDGERNAME>
              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>
              <AMOUNT>${sgstVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;
      }

      if (inv.igst_amount > 0) {
        xml += `            <!-- IGST Output Taxation Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Integrated GST Output</LEDGERNAME>
              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>
              <AMOUNT>${igstVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;
      }

      xml += `          </VOUCHER>
        </TALLYMESSAGE>
`;
    });

    xml += `      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const blob = new Blob([xml], { type: "text/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Tally_GST_Sales_${fromDate}_To_${toDate}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reports = [
    { id: 'gstr1', label: `${taxName}-1 (Sales)`, icon: <Tag size={16} className="text-blue-500" />, description: `Details of outward supplies (taxable sells columns breakdown).` },
    { id: 'gstr2', label: `${taxName}-2 (Purchases)`, icon: <BookOpen size={16} className="text-orange-500" />, description: `Inward purchase bills, commodity details, and Input Tax Credit (ITC).` },
    { id: 'gstr3b', label: `${taxName}-3B (Returns)`, icon: <Wallet size={16} className="text-emerald-500" />, description: `Self-declaration of consolidated output liability vs Input ITC.` },
    { id: 'hsn', label: `HSN/Commodity Summary`, icon: <ArrowRightLeft size={16} className="text-amber-500" />, description: `Groupwise summaries arranged by item HSN/Commodity code tariff details.` },
  ];

  const totalPages = Math.ceil(getActiveListLength() / itemsPerPage) || 1;

  return (
    <div className="space-y-6">
      {/* Upper header action banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <ShieldCheck size={22} className="stroke-[2.5]" />
            </span>
            {taxName} Filing & Audit Center
          </h2>
          <p className="text-slate-500 text-sm">Download {taxName}-1, {taxName}-2, direct 3B reconciliation, or export transaction vouchers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeReport === 'gstr1' && (
            <button 
              onClick={handleExportTallyXML}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-xs font-bold text-white shadow-md shadow-amber-150 transition-all cursor-pointer"
            >
              <FileJson size={16} />
              Export Tally XML
            </button>
          )}
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white shadow-md shadow-emerald-150 transition-all cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            Export Excel (CSV)
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer"
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Filters (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Filter size={12} className="text-indigo-500" />
              GST Modules
            </h4>
            
            <div className="space-y-1.5">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => {
                    setActiveReport(report.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer",
                    activeReport === report.id 
                      ? "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-50 shadow-sm" 
                      : "bg-white border-slate-150 hover:bg-slate-50/50 hover:border-slate-200"
                  )}
                >
                  <span className="mt-0.5 shrink-0">{report.icon}</span>
                  <div>
                    <h5 className={cn("text-xs font-extrabold transition-colors", activeReport === report.id ? "text-indigo-700" : "text-slate-800")}>
                      {report.label}
                    </h5>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed leading-[1.3]">{report.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick branch & date configs */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Calendar size={12} className="text-orange-500" />
              Date & Location Filters
            </h4>

            {/* Date select ranges */}
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">From Date</label>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 w-full bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-505"
                />
              </div>
              
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">To Date</label>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 w-full bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-505"
                />
              </div>

              {/* Branch filter dropdown */}
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Branch / Outlet</label>
                <div className="relative">
                  <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-600 outline-none focus:bg-white focus:border-indigo-500"
                  >
                    <option value="all">All Outlets / Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Module Content (9 Cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Summary Cards Row */}
          {activeReport !== 'gstr3b' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Taxable Base</p>
                <p className="text-lg font-black text-slate-900 leading-tight">{currencySymbol}{(activeReport === 'gstr1' ? taxableValue : purchaseTaxableValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 shadow-sm">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-0.5">Central CGST</p>
                <p className="text-lg font-black text-blue-700 font-mono leading-tight">{currencySymbol}{(activeReport === 'gstr1' ? totalCgst : purchaseTotalCgst).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 shadow-sm">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-0.5">State SGST</p>
                <p className="text-lg font-black text-indigo-700 font-mono leading-tight">{currencySymbol}{(activeReport === 'gstr1' ? totalSgst : purchaseTotalSgst).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 shadow-sm">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-0.5">Integrated IGST</p>
                <p className="text-lg font-black text-amber-700 font-mono leading-tight">{currencySymbol}{(activeReport === 'gstr1' ? totalIgst : purchaseTotalIgst).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          ) : (
            // Reconciliation GSTR-3B Net Taxation Card
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 font-bold uppercase rounded-md tracking-widest text-[9px]">GSTR-3B Automated reconciliation</span>
                  <h3 className="text-lg font-extrabold mt-1">Summary Tax Liability Balance</h3>
                </div>
                <HelpCircle size={18} className="text-slate-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Outward liability (Sells Output)</p>
                  <p className="text-xl font-black font-mono mt-1 text-red-400">{currencySymbol}{totalGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-slate-400 italic mt-0.5">Tax base is {currencySymbol}{taxableValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Inward liability credit (Purchase ITC)</p>
                  <p className="text-xl font-black font-mono mt-1 text-emerald-400">{currencySymbol}{purchaseTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-slate-400 italic mt-0.5">ITC base is {currencySymbol}{purchaseTaxableValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-200 font-black uppercase tracking-wider">NET GST Cash payable</p>
                  <p className="text-2xl font-black font-mono mt-1 text-blue-400">{currencySymbol}{Math.max(0, totalGst - purchaseTotalGst).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[9px] text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded italic w-max mt-1">Offsetting {taxName}-1 & 2 directly</p>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Table Grid Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 uppercase text-xs tracking-widest">
                {activeReport === 'gstr1' && `${taxName}-1 Outward taxable register`}
                {activeReport === 'gstr2' && `${taxName}-2 Purchases register`}
                {activeReport === 'gstr3b' && `${taxName}-3B Tax component offset calculations`}
                {activeReport === 'hsn' && "HSN/Commodity Summary register"}
              </h3>

              {activeReport !== 'gstr3b' && (
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search supplier, customer, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 w-full bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold font-mono outline-none focus:bg-white focus:border-indigo-500 placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>

            {/* Render tables based on selection */}
            {activeReport === 'gstr1' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 italic">
                        <th className="pb-3 px-4">Invoice No</th>
                        <th className="pb-3">Customer / Recipient</th>
                        <th className="pb-3 text-right">Taxable Valor</th>
                        <th className="pb-3 text-right">{cgstLabel}</th>
                        <th className="pb-3 text-right">{sgstLabel}</th>
                        <th className="pb-3 text-right">{igstLabel}</th>
                        <th className="pb-3 text-right">Total {taxName}</th>
                        <th className="pb-3 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {getPaginatedData(filteredInvoices).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-indigo-600 font-mono">{item.invoiceNumber}</td>
                          <td className="py-4">
                            <p className="font-bold text-slate-800">{item.customerName || 'Walk-in'}</p>
                            <span className="text-[9px] text-slate-400 italic">Place: {item.customer_state || 'Local State'}</span>
                          </td>
                          <td className="py-4 text-right font-mono font-bold">{currencySymbol}{(item.subtotal || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{(item.cgst_amount || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{(item.sgst_amount || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{(item.igst_amount || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono font-bold text-blue-600">{currencySymbol}{(item.totalTax || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono font-black text-slate-900">{currencySymbol}{(item.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {filteredInvoices.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-20 text-center text-slate-400 font-bold italic bg-slate-50/20 uppercase tracking-wider">No sales invoice available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-bold">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeReport === 'gstr2' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 italic">
                        <th className="pb-3 px-4">Purchase Bill</th>
                        <th className="pb-3">Supplier Name / Vendor</th>
                        <th className="pb-3 text-right">Taxable Valor</th>
                        <th className="pb-3 text-right">{cgstLabel}</th>
                        <th className="pb-3 text-right">{sgstLabel}</th>
                        <th className="pb-3 text-right">{igstLabel}</th>
                        <th className="pb-3 text-right">ITC credit</th>
                        <th className="pb-3 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {getPaginatedData(filteredPurchases).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-orange-600 font-mono">{item.purchaseNumber}</td>
                          <td className="py-4">
                            <p className="font-bold text-slate-800">{item.supplierName}</p>
                            <span className="text-[9px] text-slate-400 italic">GSTIN: {item.supplierGstin || '27AAAA0000X1Z1'}</span>
                          </td>
                          <td className="py-4 text-right font-mono font-bold">{currencySymbol}{(item.subtotal || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{(item.cgst_amount || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{(item.sgst_amount || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{(item.igst_amount || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono font-bold text-emerald-600">{currencySymbol}{(item.totalTax || 0).toFixed(2)}</td>
                          <td className="py-4 text-right font-mono font-black text-slate-900">{currencySymbol}{(item.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {filteredPurchases.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-20 text-center text-slate-400 font-bold italic bg-slate-50/20 uppercase tracking-wider">No purchase invoices or ITC bills found in this duration.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination purchase */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-bold">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeReport === 'hsn' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 italic">
                      <th className="pb-3 px-4">HSN Code</th>
                      <th className="pb-3">Description / Group</th>
                      <th className="pb-3 text-center">Qty Sold</th>
                      <th className="pb-3 text-right">Taxable Value</th>
                      <th className="pb-3 text-right">{cgstLabel}</th>
                      <th className="pb-3 text-right">{sgstLabel}</th>
                      <th className="pb-3 text-right">{igstLabel}</th>
                      <th className="pb-3 text-right">Total {taxName}</th>
                      <th className="pb-3 text-right">Total value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {hsnSummaryList.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-amber-600 font-mono">{h.hsn}</td>
                        <td className="py-4 italic font-medium text-slate-500">{h.description}</td>
                        <td className="py-4 text-center font-bold">{h.qty}</td>
                        <td className="py-4 text-right font-mono text-slate-900">{currencySymbol}{h.taxable.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{h.cgst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{h.sgst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono text-slate-500">{currencySymbol}{h.igst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-bold text-blue-600">{currencySymbol}{h.gst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-black">{currencySymbol}{h.val.toFixed(2)}</td>
                      </tr>
                    ))}
                    {hsnSummaryList.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-20 text-center text-slate-400 font-bold italic bg-slate-50/20 uppercase tracking-widest">No products with valid HSN details were sold within selected period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeReport === 'gstr3b' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Consolidated statutory offset balance</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Form {taxName}-3B tracks exact Central ({cgstLabel}), State ({sgstLabel}) and Integrated ({igstLabel}) liabilities to be paid in cash after setting off Input Tax Credits (ITC).</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-55/40 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 italic">
                        <th className="py-3 px-4">Tax Description</th>
                        <th className="py-3 text-right">Outward Tax (Liability)</th>
                        <th className="py-3 text-right">Inward Tax (ITC Asset)</th>
                        <th className="py-3 text-right">Net Tax Balance Payable (Cash)</th>
                        <th className="py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      <tr>
                        <td className="py-4 px-4 font-bold text-slate-800">Central Tax ({cgstLabel})</td>
                        <td className="py-4 text-right font-mono font-bold text-rose-500">{currencySymbol}{totalCgst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-bold text-emerald-500">{currencySymbol}{purchaseTotalCgst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-black text-blue-600">{currencySymbol}{Math.max(0, totalCgst - purchaseTotalCgst).toFixed(2)}</td>
                        <td className="py-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                            totalCgst <= purchaseTotalCgst ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-orange-50 text-orange-600 border border-orange-100"
                          )}>
                            {totalCgst <= purchaseTotalCgst ? 'ITC POSITIVE' : 'CASH PAYABLE'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-bold text-slate-800">State/UT Tax ({sgstLabel})</td>
                        <td className="py-4 text-right font-mono font-bold text-rose-500">{currencySymbol}{totalSgst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-bold text-emerald-500">{currencySymbol}{purchaseTotalSgst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-black text-blue-600">{currencySymbol}{Math.max(0, totalSgst - purchaseTotalSgst).toFixed(2)}</td>
                        <td className="py-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                            totalSgst <= purchaseTotalSgst ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-orange-50 text-orange-600 border border-orange-100"
                          )}>
                            {totalSgst <= purchaseTotalSgst ? 'ITC POSITIVE' : 'CASH PAYABLE'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-bold text-slate-800">Integrated Interest Tax ({igstLabel})</td>
                        <td className="py-4 text-right font-mono font-bold text-rose-500">{currencySymbol}{totalIgst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-bold text-emerald-500">{currencySymbol}{purchaseTotalIgst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-black text-blue-600">{currencySymbol}{Math.max(0, totalIgst - purchaseTotalIgst).toFixed(2)}</td>
                        <td className="py-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                            totalIgst <= purchaseTotalIgst ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-orange-50 text-orange-600 border border-orange-100"
                          )}>
                            {totalIgst <= purchaseTotalIgst ? 'ITC POSITIVE' : 'CASH PAYABLE'}
                          </span>
                        </td>
                      </tr>
                      {/* Heavy summary row */}
                      <tr className="bg-slate-50 font-black">
                        <td className="py-4 px-4 text-slate-900 border-t-2 border-slate-905">Total TAX Summarized</td>
                        <td className="py-4 text-right font-mono text-rose-600 border-t-2 border-slate-905">{currencySymbol}{totalGst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono text-emerald-600 border-t-2 border-slate-905">{currencySymbol}{purchaseTotalGst.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono text-blue-700 border-t-2 border-slate-905">{currencySymbol}{Math.max(0, totalGst - purchaseTotalGst).toFixed(2)}</td>
                        <td className="py-4 text-center border-t-2 border-slate-905">
                          <span className="px-2 py-0.5 bg-blue-105 text-blue-800 rounded font-black text-[9px] uppercase tracking-wider border border-blue-200">Reconciled</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
