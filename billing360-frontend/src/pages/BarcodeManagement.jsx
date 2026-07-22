import { useState, useEffect, useRef } from 'react';
import { Search, Printer, Download, Eye, CheckSquare, Square, RefreshCcw, Settings, Grid, FileBarChart, Layers, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { ProductService, CategoryService, SettingsService } from '../services/dataService';
import { useAuth } from '../lib/AuthContext';
import { translations } from '../lib/translations';
import jsPDF from 'jspdf';

// Dynamic Barcode Component that renders clean SVG barcode utilizing standard jsbarcode.
function BarcodeSVG({ value, format = "CODE128", width = 1.5, height = 40, displayValue = true, fontSize = 10 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && window.JsBarcode && value) {
      try {
        window.JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error("JsBarcode generation failed: ", err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  return <svg ref={svgRef} className="mx-auto max-w-full" />;
}

export default function BarcodeManagement() {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState({});
  const [printQuantities, setPrintQuantities] = useState({});
  const [printSize, setPrintSize] = useState('thermal'); // thermal (50x25mm), a4 (2x7 grid), small (38x25mm)
  const [includeMrp, setIncludeMrp] = useState(true);
  const [includeBatch, setIncludeBatch] = useState(false);
  const [includeExpiry, setIncludeExpiry] = useState(false);
  const [jsBarcodeLoaded, setJsBarcodeLoaded] = useState(false);

  // Load JsBarcode dynamically if not present
  useEffect(() => {
    if (window.JsBarcode) {
      setJsBarcodeLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js";
    script.async = true;
    script.onload = () => setJsBarcodeLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (userProfile?.branchId) {
      const unsubProducts = ProductService.getProducts(userProfile.branchId, (data) => {
        setProducts(data || []);
        // Initialize print quantities with 1 or 2 by default
        const initialQtys = {};
        data?.forEach(p => {
          initialQtys[p.id] = 2;
        });
        setPrintQuantities(initialQtys);
      });

      const unsubCategories = CategoryService.getCategories(userProfile.branchId, (data) => {
        setCategories(data || []);
      });

      const unsubConfig = SettingsService.getConfig(userProfile.branchId, (data) => {
        setConfig(data);
      });

      return () => {
        unsubProducts();
        unsubCategories();
        unsubConfig();
      };
    }
  }, [userProfile?.branchId]);

  const t = translations[config?.language || 'English'] || translations.English;
  const companyName = config?.companyName || "Billing360 Shop";

  // List of unique brands
  const brands = ['all', ...new Set(products.map(p => p.brand).filter(Boolean))];

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;

    return matchesSearch && matchesCategory && matchesBrand;
  });

  // Toggle selection
  const toggleSelectProduct = (id) => {
    setSelectedProducts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = () => {
    const newSelected = {};
    filteredProducts.forEach(p => {
      newSelected[p.id] = true;
    });
    setSelectedProducts(newSelected);
  };

  const handleDeselectAll = () => {
    setSelectedProducts({});
  };

  const handleQtyChange = (id, val) => {
    const qty = Math.max(1, parseInt(val) || 1);
    setPrintQuantities(prev => ({
      ...prev,
      [id]: qty
    }));
  };

  // Generate label items array based on selected items and quantities
  const getSelectedLabelItems = () => {
    const items = [];
    products.forEach(p => {
      if (selectedProducts[p.id] && p.barcode) {
        const count = printQuantities[p.id] || 1;
        for (let i = 0; i < count; i++) {
          items.push({
            ...p,
            labelIndex: i
          });
        }
      }
    });
    return items;
  };

  // Print function: styles can be injected in secondary document or window
  const handlePrintLabels = () => {
    const labelItems = getSelectedLabelItems();
    if (labelItems.length === 0) {
      alert("Please select at least one product with a valid barcode to print.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow pop-ups to print barcodes.");
      return;
    }

    // Generate HTML with tailored styles for specific print sizes
    let itemStyle = '';
    let containerStyle = '';

    if (printSize === 'thermal') {
      // 50x25 mm single sticker layout
      containerStyle = 'display: flex; flex-direction: column; align-items: center; justify-content: center; width: 50mm; height: 25mm; padding: 2px; box-sizing: border-box; overflow: hidden; page-break-inside: avoid; page-break-after: always; text-align: center; font-family: sans-serif;';
      itemStyle = 'width: 50mm; height: 25mm;';
    } else if (printSize === 'small') {
      // 38x25 mm small retail label
      containerStyle = 'display: flex; flex-direction: column; align-items: center; justify-content: center; width: 38mm; height: 25mm; padding: 1px; box-sizing: border-box; overflow: hidden; page-break-inside: avoid; page-break-after: always; text-align: center; font-family: sans-serif;';
      itemStyle = 'width: 38mm; height: 25mm;';
    } else {
      // A4 sheets: 2 columns, 7 rows layout (14 labels per sheet)
      containerStyle = 'display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 95mm; height: 38mm; margin: 2mm; border: 1px dashed #ccc; padding: 4px; box-sizing: border-box; overflow: hidden; page-break-inside: avoid; text-align: center; font-family: sans-serif;';
      itemStyle = 'width: 95mm; height: 38mm;';
    }

    const labelsHTML = labelItems.map(item => {
      const barcodeValue = item.barcode || '00000000';
      return `
        <div class="label-box" style="${containerStyle}">
          <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; margin-bottom: 1px; color:#111; overflow-hidden; white-space: nowrap; text-overflow: ellipsis; width: 100%;">${companyName}</div>
          <div style="font-size: 9px; font-weight: 700; margin-bottom: 1px; line-height: 1.1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; width: 100%;">${item.name}</div>
          <div style="font-size: 8px; font-weight: bold; margin-bottom: 2px; color: #444;">
            ₹${item.sellingPrice || 0} ${includeMrp && item.mrp ? `<span style="text-decoration: line-through; font-size: 7px; color: #888;">MRP: ₹${item.mrp}</span>` : ''}
          </div>
          <div class="barcode-svg-container" style="display-flex; justify-content: center; align-items: center;">
            <svg class="barcode-svg" data-value="${barcodeValue}" style="max-height: 38px; max-width: 100%;"></svg>
          </div>
          ${includeBatch && item.batchNumber ? `<div style="font-size: 6px; color:#666; margin-top:1px;">B: ${item.batchNumber}</div>` : ''}
          ${includeExpiry && item.expiryDate ? `<div style="font-size: 6px; color:#666;">EXP: ${item.expiryDate}</div>` : ''}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcodes - ${companyName}</title>
          <style>
            @page {
              margin: 0;
              size: ${printSize === 'a4' ? 'A4 portrait' : 'auto'};
            }
            body {
              margin: ${printSize === 'a4' ? '10mm' : '0'};
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            .labels-container {
              display: ${printSize === 'a4' ? 'grid' : 'block'};
              grid-template-columns: ${printSize === 'a4' ? 'repeat(2, 1fr)' : 'none'};
              gap: ${printSize === 'a4' ? '4mm' : '0'};
              justify-content: center;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="labels-container">
            ${labelsHTML}
          </div>
          <script>
            window.onload = function() {
              const svgs = document.querySelectorAll('.barcode-svg');
              svgs.forEach(svg => {
                const val = svg.getAttribute('data-value');
                try {
                  JsBarcode(svg, val, {
                    format: "CODE128",
                    width: ${printSize === 'a4' ? 1.6 : 1.2},
                    height: ${printSize === 'a4' ? 26 : 22},
                    displayValue: true,
                    fontSize: 8,
                    margin: 0
                  });
                } catch(e) {
                  console.error(e);
                }
              });
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download PDF format
  const handleDownloadPDF = () => {
    const labelItems = getSelectedLabelItems();
    if (labelItems.length === 0) {
      alert("Please select at least one product with a valid barcode to download.");
      return;
    }

    try {
      // Create jsPDF instance
      // Using standard portrait A4
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Barcode Labels Sheet - ${companyName}`, 15, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 15, 20);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 22, 195, 22);

      let x = 15;
      let y = 28;
      const colWidth = 90;
      const rowHeight = 35;
      const maxCols = 2;
      const maxRows = 6;
      let colIdx = 0;
      let rowIdx = 0;

      labelItems.forEach((item, index) => {
        if (y + rowHeight > 280) {
          doc.addPage();
          x = 15;
          y = 15;
          colIdx = 0;
          rowIdx = 0;
        }

        const currX = x + (colIdx * (colWidth + 5));
        const currY = y + (rowIdx * (rowHeight + 5));

        // Draw Sticker border
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(255, 255, 255);
        doc.rect(currX, currY, colWidth, rowHeight, "FD");

        // Write Shop Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.text(companyName.substring(0, 45).toUpperCase(), currX + colWidth / 2, currY + 4, { align: 'center' });

        // Write Product Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(item.name.substring(0, 40), currX + colWidth / 2, currY + 9, { align: 'center' });

        // Pricing
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(20, 100, 20);
        const priceText = `Price: Rs. ${item.sellingPrice || 0}`;
        doc.text(priceText, currX + colWidth / 2, currY + 13, { align: 'center' });

        // Draw barcode representation (fallback standard code lines + test strings)
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(`* ${item.barcode} *`, currX + colWidth / 2, currY + 28, { align: 'center' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);

        let detailsString = `SKU: ${item.sku || 'N/A'}`;
        if (includeBatch && item.batchNumber) detailsString += ` / B: ${item.batchNumber}`;
        if (includeExpiry && item.expiryDate) detailsString += ` / E: ${item.expiryDate}`;
        doc.text(detailsString, currX + colWidth / 2, currY + 32, { align: 'center' });

        colIdx++;
        if (colIdx >= maxCols) {
          colIdx = 0;
          rowIdx++;
        }
      });

      doc.save(`Barcodes_${companyName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF. Please verify your selected products.");
    }
  };

  const selectedCount = getSelectedLabelItems().length;

  return (
    <div className="space-y-6">
      {/* Header view */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Printer size={22} className="stroke-[2.5]" />
            </span>
            Barcode Management
          </h2>
          <p className="text-slate-500 text-sm">Search products, configure label metadata, and bulk print stickers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handlePrintLabels}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-100 transition-all cursor-pointer"
          >
            <Printer size={16} />
            Print ({selectedCount}) Labels
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Filters & Config Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-2 pb-3 border-b border-slate-100 uppercase tracking-widest text-[10px]">
              <Settings size={15} className="text-blue-500" />
              Sticker Settings
            </h3>

            {/* Print Size Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Print Layout Size</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setPrintSize('thermal')}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start justify-between transition-all cursor-pointer",
                    printSize === 'thermal' ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100" : "bg-white border-slate-200"
                  )}
                >
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900">Thermal Sticker (50x25 mm)</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Perfect for roll barcode sticker printers (Xprinter, TSC).</p>
                  </div>
                  <Tag className={cn("shrink-0 ml-2 scale-90", printSize === 'thermal' ? "text-blue-600" : "text-slate-300")} size={16} />
                </button>

                <button
                  onClick={() => setPrintSize('small')}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start justify-between transition-all cursor-pointer",
                    printSize === 'small' ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100" : "bg-white border-slate-200"
                  )}
                >
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900">Small Retail Label (38x25 mm)</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Micro sticker layout optimized for jewelry, toys, small FMCGs.</p>
                  </div>
                  <Tag className={cn("shrink-0 ml-2 scale-90", printSize === 'small' ? "text-blue-600" : "text-slate-300")} size={16} />
                </button>

                <button
                  onClick={() => setPrintSize('a4')}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start justify-between transition-all cursor-pointer",
                    printSize === 'a4' ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100" : "bg-white border-slate-200"
                  )}
                >
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900">A4 Laser Label Sheet (2x7 Grid)</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Consolidated paper grid for printing multi-row stickers on A4 paper.</p>
                  </div>
                  <Grid className={cn("shrink-0 ml-2 scale-90", printSize === 'a4' ? "text-blue-600" : "text-slate-300")} size={16} />
                </button>
              </div>
            </div>

            {/* Custom Metadata to Include */}
            <div className="space-y-3 pb-2 pt-1 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-2">Include Attributes</label>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={includeMrp} 
                    onChange={(e) => setIncludeMrp(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                  />
                  Show Strike-Through MRP
                </label>

                <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={includeBatch} 
                    onChange={(e) => setIncludeBatch(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                  />
                  Show Batch Number
                </label>

                <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={includeExpiry} 
                    onChange={(e) => setIncludeExpiry(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                  />
                  Show Expiry Date
                </label>
              </div>
            </div>
            
            {/* Live Preview Panel */}
            <div className="border-t border-slate-100 pt-5 space-y-3 bg-slate-50 p-4 rounded-2xl">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Eye size={12} className="text-orange-500" />
                Live sticker preview
              </h4>
              <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-[8px] font-black tracking-widest uppercase text-slate-400 mb-1">{companyName}</p>
                <p className="text-xs font-bold text-slate-900 truncate max-w-full">Demo Product Item</p>
                <div className="flex items-center gap-2 my-1 text-[11px] font-black text-emerald-600">
                  <span>₹250</span>
                  {includeMrp && <span className="text-[9px] line-through text-slate-400 font-normal">MRP: ₹299</span>}
                </div>
                
                {jsBarcodeLoaded ? (
                  <BarcodeSVG value="89012345678" height={22} width={1.2} fontSize={8} />
                ) : (
                  <div className="w-40 h-8 bg-slate-100 text-[10px] text-slate-400 flex items-center justify-center italic rounded">Loading Barcode Engine...</div>
                )}
                
                {includeBatch && <div className="text-[7px] text-slate-500 mt-1 font-mono">B: BATCH-4491</div>}
                {includeExpiry && <div className="text-[7px] text-slate-500 font-mono">EXP: 12/2027</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Table Section Filter (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            
            {/* Upper filtering parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Product */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Query barcode, SKU, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Categories */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 w-full bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-600 outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="all">Category: All</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Brands */}
              <div>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="px-3 py-2 w-full bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-600 outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="all">Brand: All</option>
                  {brands.filter(b => b !== 'all').map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-2 items-center justify-between flex-wrap pb-2 border-b border-slate-100">
              <div className="flex gap-2">
                <button 
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer"
                >
                  Select All
                </button>
                <button 
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Showing {filteredProducts.length} Products
              </span>
            </div>

            {/* Products Barcode Print Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">
                    <th className="px-4 py-3 text-center">Print</th>
                    <th className="px-4 py-3">S.No</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Barcode Value</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-center w-28">Qty Print</th>
                    <th className="px-4 py-3 text-center">Live Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredProducts.map((p, index) => {
                    const isSelected = !!selectedProducts[p.id];
                    return (
                      <tr 
                        key={p.id} 
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors group",
                          isSelected ? "bg-blue-50/20" : ""
                        )}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <button 
                            type="button"
                            onClick={() => toggleSelectProduct(p.id)}
                            className="text-slate-400 hover:text-blue-600 transition-colors inline-block"
                          >
                            {isSelected ? (
                              <CheckSquare className="text-blue-600 fill-blue-50" size={18} />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-extrabold text-slate-900 leading-tight">{p.name || 'N/A'}</p>
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{p.brand || 'No Brand'} | SKU: {p.sku || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-slate-800">
                            <span>{p.barcode || 'N/A'}</span>
                            {!p.barcode && (
                              <span className="text-[8px] bg-red-50 text-red-600 px-1 rounded uppercase font-black tracking-wide">Missing Barcode</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold">₹{p.sellingPrice || 0}</td>
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="number"
                            min="1"
                            disabled={!isSelected}
                            value={printQuantities[p.id] || 2}
                            onChange={(e) => handleQtyChange(p.id, e.target.value)}
                            className={cn(
                              "w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border outline-none font-mono",
                              isSelected 
                                ? "bg-white border-slate-350 text-slate-900 focus:border-blue-500" 
                                : "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed"
                            )}
                          />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black font-mono",
                            p.stock > 10 ? "bg-emerald-55 text-emerald-700" : "bg-orange-50 text-orange-600"
                          )}>
                            {p.stock || 0} {p.unit || 'pcs'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 italic">No products found for this query. You can add barcodes to items inside the Master Inventory sheet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
