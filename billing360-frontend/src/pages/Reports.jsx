import { useState, useEffect } from "react";
import {
  Download,
  FileBarChart,
  TrendingUp,
  Calendar,
  ShoppingCart,
  Package,
  IndianRupee,
  Layers,
  Users,
  Building,
  ClipboardList,
  Printer,
  FileSpreadsheet,
  FileText,
  Filter,
  X,
  ArrowDownCircle,
  QrCode,
  CreditCard,
  Banknote,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Fallback in case prototype registration fails under ES module bundles
if (typeof jsPDF.prototype.autoTable !== "function") {
  jsPDF.prototype.autoTable = function (options) {
    autoTable(this, options);
    this.previousAutoTable = this.previousAutoTable || this.lastAutoTable;
    return this;
  };
}
import {
  InvoiceService,
  PurchaseService,
  VoucherService,
  ProductService,
  EmployeeService,
  CustomerService,
  SupplierService,
  SettingsService,
} from "@/src/services/dataService";
import { useAuth } from "@/src/lib/AuthContext";
import { translations } from "@/src/lib/translations";
import { useLocalization } from "@/src/lib/LocalizationContext";

export default function Reports() {
  const { userProfile } = useAuth();
  const { formatCurrency, formatDate, currencySymbol } = useLocalization();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeReport, setActiveReport] = useState(tabParam || "sales");
  useEffect(() => {
    if (
      tabParam &&
      [
        "sales",
        "purchase",
        "stock",
        "gst",
        "profit",
        "expense",
        "employee",
        "branch",
        "customer_ledger",
        "supplier_ledger",
      ].includes(tabParam)
    ) {
      setActiveReport(tabParam);
    }
  }, [tabParam]);

  const handleReportChange = (report) => {
    setActiveReport(report);
    setSearchParams({ tab: report });
  };

  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [staffFilter, setStaffFilter] = useState("all");
  const [billTypeFilter, setBillTypeFilter] = useState("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [gstTab, setGstTab] = useState("summary");
  const [config, setConfig] = useState(null);

  // Quick Settle State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState(0);
  const [settlePaymentMode, setSettlePaymentMode] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickSettle = async () => {
    if (!selectedEntityId || !userProfile?.branchId || settleAmount <= 0)
      return;
    setIsSubmitting(true);
    try {
      const type = activeReport === "customer_ledger" ? "receipt" : "payment";
      const entityType =
        activeReport === "customer_ledger" ? "customer" : "supplier";
      const name =
        entityType === "customer"
          ? customers.find((c) => c.id === selectedEntityId)?.name
          : suppliers.find((s) => s.id === selectedEntityId)?.name;

      await VoucherService.addVoucher(userProfile.branchId, {
        type,
        date: new Date().toISOString(),
        amount: settleAmount,
        description: `Settlement: ${name} (${type})`,
        entityId: selectedEntityId,
        entityType,
        paymentMode: settlePaymentMode,
        branchId: userProfile.branchId,
      });
      setShowSettleModal(false);
      setSettleAmount(0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (userProfile?.branchId) {
      SettingsService.getConfig(userProfile.branchId, setConfig);
      const unsubInvoices = InvoiceService.getAllInvoices(
        userProfile.branchId,
        setInvoices,
      );
      const unsubPurchases = PurchaseService.getAllPurchases(
        userProfile.branchId,
        setPurchases,
      );
      const unsubVouchers = VoucherService.getVouchers(
        userProfile.branchId,
        setVouchers,
      );
      const unsubProducts = ProductService.getProducts(
        userProfile.branchId,
        setProducts,
      );
      const unsubEmployees = EmployeeService.getEmployees(
        userProfile.branchId,
        setEmployees,
      );
      const unsubCustomers = CustomerService.getCustomers(
        userProfile.branchId,
        setCustomers,
      );
      const unsubSuppliers = SupplierService.getSuppliers(
        userProfile.branchId,
        setSuppliers,
      );

      setLoading(false);
      return () => {
        unsubInvoices();
        unsubPurchases();
        unsubVouchers();
        unsubProducts();
        unsubEmployees();
        unsubCustomers();
        unsubSuppliers();
      };
    }
  }, [userProfile?.branchId]);

  const t = translations[config?.language || "English"] || translations.English;

  const reportTypes = [
    { id: "sales", label: t.sales_report, icon: ShoppingCart, color: "blue" },
    {
      id: "purchase",
      label: t.purchase_report,
      icon: ClipboardList,
      color: "orange",
    },
    { id: "stock", label: t.stock_report, icon: Package, color: "emerald" },
    { id: "gst", label: t.gst_reports, icon: Layers, color: "indigo" },
    { id: "profit", label: t.profit_loss, icon: TrendingUp, color: "rose" },
    { id: "expense", label: t.expense_report, icon: IndianRupee, color: "red" },
    { id: "employee", label: t.employee_report, icon: Users, color: "cyan" },
    { id: "branch", label: t.branch_report, icon: Building, color: "purple" },
    {
      id: "customer_ledger",
      label: t.customer_ledger,
      icon: FileText,
      color: "slate",
    },
    {
      id: "supplier_ledger",
      label: t.supplier_ledger,
      icon: FileText,
      color: "gray",
    },
  ];

  const handleExport = (format) => {
    if (format === "tally") {
      exportToTally();
      return;
    }

    const reportTitle = `${activeReport.replace("_", " ").toUpperCase()} REPORT`;

    if (format === "csv" || format === "excel") {
      let csvContent = "data:text/csv;charset=utf-8,";
      if (activeReport === "sales") {
        csvContent +=
          "Invoice No,Date,Customer,State,Taxable Amt,CGST,SGST,IGST,Total Tax,Grand Total\n";
        filteredInvoices.forEach((inv) => {
          let taxable =
            inv.taxable_amount !== undefined
              ? inv.taxable_amount
              : inv.subtotal || 0;
          let cgst = inv.cgst_amount !== undefined ? inv.cgst_amount : 0;
          let sgst = inv.sgst_amount !== undefined ? inv.sgst_amount : 0;
          let igst = inv.igst_amount !== undefined ? inv.igst_amount : 0;
          let totTax =
            inv.total_tax_amount !== undefined
              ? inv.total_tax_amount
              : inv.totalTax || 0;
          let grand =
            inv.grand_total !== undefined
              ? inv.grand_total
              : inv.totalAmount || 0;

          if (
            inv.isGst !== false &&
            totTax > 0 &&
            cgst === 0 &&
            sgst === 0 &&
            igst === 0
          ) {
            const companyState = config?.state || "";
            const customerState = inv.customer_state || "";
            const isSameState =
              !companyState ||
              !customerState ||
              companyState.trim().toLowerCase() ===
                customerState.trim().toLowerCase();
            if (isSameState) {
              cgst = totTax / 2;
              sgst = totTax / 2;
            } else {
              igst = totTax;
            }
          }

          csvContent += `"${inv.invoiceNumber}","${new Date(inv.createdAt).toLocaleDateString()}","${inv.customerName}","${inv.customer_state || "Local"}",${taxable},${cgst},${sgst},${igst},${totTax},${grand}\n`;
        });
      } else if (activeReport === "purchase") {
        csvContent +=
          "Purchase No,Date,Supplier,Taxable Amt,Total Tax,Grand Total\n";
        filteredPurchases.forEach((p) => {
          csvContent += `"${p.purchaseNumber}","${new Date(p.createdAt).toLocaleDateString()}","${p.supplierName}",${p.subtotal},${p.totalTax},${p.totalAmount}\n`;
        });
      } else {
        csvContent += "Record Description,Date,Component,Value\n";
        csvContent += `"${activeReport.toUpperCase()} Consolidated",${new Date().toLocaleDateString()},"TOTALS",0\n`;
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `${activeReport}_report_${fromDate}_to_${toDate}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (format === "pdf") {
      try {
        const doc = new jsPDF("l", "mm", "a4");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`${reportTitle}`, 14, 15);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(
          `Period: ${fromDate} to ${toDate} | Filtered Outlets Dashboard`,
          14,
          20,
        );
        doc.line(14, 22, 282, 22);

        let tableColumns = [];
        let tableRows = [];

        if (activeReport === "sales") {
          tableColumns = [
            "Invoice No",
            "Date",
            "Customer Name",
            "Taxable Value",
            "CGST",
            "SGST",
            "IGST",
            "Total GST",
            "Grand Total",
          ];
          tableRows = filteredInvoices.map((inv) => {
            let taxable =
              inv.taxable_amount !== undefined
                ? inv.taxable_amount
                : inv.subtotal || 0;
            let cgst = inv.cgst_amount !== undefined ? inv.cgst_amount : 0;
            let sgst = inv.sgst_amount !== undefined ? inv.sgst_amount : 0;
            let igst = inv.igst_amount !== undefined ? inv.igst_amount : 0;
            let totTax =
              inv.total_tax_amount !== undefined
                ? inv.total_tax_amount
                : inv.totalTax || 0;
            let grand =
              inv.grand_total !== undefined
                ? inv.grand_total
                : inv.totalAmount || 0;

            if (
              inv.isGst !== false &&
              totTax > 0 &&
              cgst === 0 &&
              sgst === 0 &&
              igst === 0
            ) {
              const companyState = config?.state || "";
              const customerState = inv.customer_state || "";
              const isSameState =
                !companyState ||
                !customerState ||
                companyState.trim().toLowerCase() ===
                  customerState.trim().toLowerCase();
              if (isSameState) {
                cgst = totTax / 2;
                sgst = totTax / 2;
              } else {
                igst = totTax;
              }
            }

            return [
              inv.invoiceNumber,
              new Date(inv.createdAt).toLocaleDateString(),
              inv.customerName || "Walk-in",
              `Rs.${taxable.toFixed(2)}`,
              `Rs.${cgst.toFixed(2)}`,
              `Rs.${sgst.toFixed(2)}`,
              `Rs.${igst.toFixed(2)}`,
              `Rs.${totTax.toFixed(2)}`,
              `Rs.${grand.toFixed(2)}`,
            ];
          });
        } else if (activeReport === "purchase") {
          tableColumns = [
            "Purchase Ref",
            "Date",
            "Supplier Name",
            "Taxable Value",
            "CGST",
            "SGST",
            "IGST",
            "ITC Credit",
            "Grand Total",
          ];
          tableRows = filteredPurchases.map((p) => {
            const cg = p.isGst !== false ? p.totalTax / 2 : 0;
            const sg = p.isGst !== false ? p.totalTax / 2 : 0;
            return [
              p.purchaseNumber,
              new Date(p.createdAt).toLocaleDateString(),
              p.supplierName,
              `Rs.${p.subtotal.toFixed(2)}`,
              `Rs.${cg.toFixed(2)}`,
              `Rs.${sg.toFixed(2)}`,
              `Rs.0.00`,
              `Rs.${(p.isGst !== false ? p.totalTax : 0).toFixed(2)}`,
              `Rs.${p.totalAmount.toFixed(2)}`,
            ];
          });
        } else {
          tableColumns = [
            "Description Topic",
            "Transaction Date",
            "Payment System",
            "Total Amount Balance",
          ];
          tableRows = [
            [
              `Consolidated balance for ${activeReport.toUpperCase()}`,
              new Date().toLocaleDateString(),
              "N/A",
              "0.00",
            ],
          ];
        }

        doc.autoTable({
          head: [tableColumns],
          body: tableRows,
          startY: 28,
          theme: "grid",
          styles: { fontSize: 8.5 },
          headStyles: { fillColor: [33, 41, 54] },
        });

        doc.save(`${activeReport}_Report_${Date.now()}.pdf`);
      } catch (err) {
        console.error(err);
        alert(
          "Export error occurred. Please try exporting in spreadsheet CSV format instead.",
        );
      }
    }
  };

  const exportToTally = () => {
    // Basic Tally CSV structure for Sales
    const headers = [
      "Voucher Date",
      "Voucher Type",
      "Voucher No",
      "Party Ledger Name",
      "Sales Ledger",
      "Taxable Value",
      "CGST Type",
      "CGST Amount",
      "SGST Type",
      "SGST Amount",
      "IGST Type",
      "IGST Amount",
      "Total Amount",
    ];

    const rows = filteredInvoices.map((inv) => {
      let taxable =
        inv.taxable_amount !== undefined
          ? inv.taxable_amount
          : inv.subtotal || 0;
      let cgst = inv.cgst_amount !== undefined ? inv.cgst_amount : 0;
      let sgst = inv.sgst_amount !== undefined ? inv.sgst_amount : 0;
      let igst = inv.igst_amount !== undefined ? inv.igst_amount : 0;
      let totTax =
        inv.total_tax_amount !== undefined
          ? inv.total_tax_amount
          : inv.totalTax || 0;
      let grand =
        inv.grand_total !== undefined ? inv.grand_total : inv.totalAmount || 0;

      if (
        inv.isGst !== false &&
        totTax > 0 &&
        cgst === 0 &&
        sgst === 0 &&
        igst === 0
      ) {
        const companyState = config?.state || "";
        const customerState = inv.customer_state || "";
        const isSameState =
          !companyState ||
          !customerState ||
          companyState.trim().toLowerCase() ===
            customerState.trim().toLowerCase();
        if (isSameState) {
          cgst = totTax / 2;
          sgst = totTax / 2;
        } else {
          igst = totTax;
        }
      }
      return [
        new Date(inv.createdAt).toLocaleDateString("en-IN"),
        "Sales",
        inv.invoiceNumber,
        inv.customerName || "Cash",
        "Sales Ledger",
        taxable.toFixed(2),
        "CGST Output",
        cgst.toFixed(2),
        "SGST Output",
        sgst.toFixed(2),
        "IGST Output",
        igst.toFixed(2),
        grand.toFixed(2),
      ];
    });

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Tally_Sales_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isWithinRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesDate = isWithinRange(inv.createdAt);
    const billedBy = inv.billedBy || "Administrator";
    const matchesStaff = staffFilter === "all" || billedBy === staffFilter;
    const matchesBillType =
      billTypeFilter === "all" ||
      (billTypeFilter === "gst" && inv.isGst !== false) ||
      (billTypeFilter === "non-gst" && inv.isGst === false);
    const matchesPaymentMode =
      paymentModeFilter === "all" || inv.paymentMode === paymentModeFilter;
    return matchesDate && matchesStaff && matchesBillType && matchesPaymentMode;
  });

  const filteredPurchases = purchases.filter((p) => {
    const matchesDate = isWithinRange(p.createdAt);
    const matchesBillType =
      billTypeFilter === "all" ||
      (billTypeFilter === "gst" && p.isGst !== false) ||
      (billTypeFilter === "non-gst" && p.isGst === false);
    const matchesPaymentMode =
      paymentModeFilter === "all" || p.paymentMode === paymentModeFilter;
    return matchesDate && matchesBillType && matchesPaymentMode;
  });

  const filteredGstInvoices = filteredInvoices.filter(
    (inv) => inv.isGst !== false,
  );
  const filteredVouchers = vouchers.filter((v) => isWithinRange(v.date));

  const renderReportContent = () => {
    switch (activeReport) {
      case "sales":
        const salesSummary = filteredInvoices.reduce(
          (acc, inv) => {
            let taxable =
              inv.taxable_amount !== undefined
                ? inv.taxable_amount
                : inv.subtotal || 0;
            let cgst = inv.cgst_amount !== undefined ? inv.cgst_amount : 0;
            let sgst = inv.sgst_amount !== undefined ? inv.sgst_amount : 0;
            let igst = inv.igst_amount !== undefined ? inv.igst_amount : 0;
            let totTax =
              inv.total_tax_amount !== undefined
                ? inv.total_tax_amount
                : inv.totalTax || 0;
            let grand =
              inv.grand_total !== undefined
                ? inv.grand_total
                : inv.totalAmount || 0;

            if (
              inv.isGst !== false &&
              totTax > 0 &&
              cgst === 0 &&
              sgst === 0 &&
              igst === 0
            ) {
              const companyState = config?.state || "";
              const customerState = inv.customer_state || "";
              const isSameState =
                !companyState ||
                !customerState ||
                companyState.trim().toLowerCase() ===
                  customerState.trim().toLowerCase();
              if (isSameState) {
                cgst = totTax / 2;
                sgst = totTax / 2;
              } else {
                igst = totTax;
              }
            }

            acc.total += grand;
            acc.taxable += taxable;
            acc.cgst += cgst;
            acc.sgst += sgst;
            acc.igst += igst;
            acc.tax += totTax;
            acc.nonGst += inv.isGst === false ? grand : 0;
            if (inv.paymentMode === "credit") acc.credit += grand;
            else acc.cash += grand;
            return acc;
          },
          {
            total: 0,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            tax: 0,
            nonGst: 0,
            cash: 0,
            credit: 0,
          },
        );

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 p-6 bg-slate-50 border-b border-slate-100">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 sm:col-span-1 lg:col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Total Sales
                </p>
                <p className="text-xl font-black text-slate-900 font-mono">
                  ₹
                  {salesSummary.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <p className="text-[9px] text-emerald-600 font-bold">
                    Paid: ₹{salesSummary.cash.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-red-500 font-bold">
                    Credit: ₹{salesSummary.credit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                  Taxable Value
                </p>
                <p className="text-lg font-black text-blue-600 font-mono">
                  ₹
                  {salesSummary.taxable.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                  CGST / SGST
                </p>
                <p className="text-lg font-black text-emerald-600 font-mono">
                  ₹
                  {(salesSummary.cgst + salesSummary.sgst).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 2 },
                  )}
                </p>
                <p className="text-[8px] text-slate-400 font-bold">
                  C: ₹{salesSummary.cgst.toLocaleString()} | S: ₹
                  {salesSummary.sgst.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">
                  IGST Collected
                </p>
                <p className="text-lg font-black text-amber-600 font-mono">
                  ₹
                  {salesSummary.igst.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                  Total Tax (GST)
                </p>
                <p className="text-lg font-black text-indigo-600 font-mono">
                  ₹
                  {salesSummary.tax.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-4 py-4">Invoice Details</th>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4 text-right">Taxable Amt</th>
                  <th className="px-4 py-4 text-right text-emerald-600">
                    CGST
                  </th>
                  <th className="px-4 py-4 text-right text-emerald-600">
                    SGST
                  </th>
                  <th className="px-4 py-4 text-right text-amber-600">IGST</th>
                  <th className="px-4 py-4 text-right text-blue-600 font-extrabold">
                    Total Tax
                  </th>
                  <th className="px-4 py-4 text-right font-extrabold">
                    Grand Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredInvoices.map((inv) => {
                  let taxable =
                    inv.taxable_amount !== undefined
                      ? inv.taxable_amount
                      : inv.subtotal || 0;
                  let cgst =
                    inv.cgst_amount !== undefined ? inv.cgst_amount : 0;
                  let sgst =
                    inv.sgst_amount !== undefined ? inv.sgst_amount : 0;
                  let igst =
                    inv.igst_amount !== undefined ? inv.igst_amount : 0;
                  let totTax =
                    inv.total_tax_amount !== undefined
                      ? inv.total_tax_amount
                      : inv.totalTax || 0;
                  let grand =
                    inv.grand_total !== undefined
                      ? inv.grand_total
                      : inv.totalAmount || 0;

                  if (
                    inv.isGst !== false &&
                    totTax > 0 &&
                    cgst === 0 &&
                    sgst === 0 &&
                    igst === 0
                  ) {
                    const companyState = config?.state || "";
                    const customerState = inv.customer_state || "";
                    const isSameState =
                      !companyState ||
                      !customerState ||
                      companyState.trim().toLowerCase() ===
                        customerState.trim().toLowerCase();
                    if (isSameState) {
                      cgst = totTax / 2;
                      sgst = totTax / 2;
                    } else {
                      igst = totTax;
                    }
                  }

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"
                          >
                            <FileText size={12} />
                          </button>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">
                              {inv.invoiceNumber}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[9px] text-slate-400 font-mono italic">
                                {new Date(inv.createdAt).toLocaleDateString()}
                              </p>
                              {inv.isGst !== false ? (
                                <span className="text-[7px] bg-blue-100 text-blue-600 px-0.5 rounded font-black italic">
                                  GST
                                </span>
                              ) : (
                                <span className="text-[7px] bg-slate-100 text-slate-500 px-0.5 rounded font-black italic">
                                  NON-GST
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-bold text-slate-800">
                          {inv.customerName}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {inv.customer_state || "Local"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-600">
                        ₹
                        {taxable.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-500">
                        ₹
                        {cgst.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-500">
                        ₹
                        {sgst.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-amber-600">
                        ₹
                        {igst.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs font-bold text-blue-600">
                        ₹
                        {totTax.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs font-black text-slate-900">
                        ₹
                        {grand.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-300 italic text-xs"
                    >
                      No sales found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case "purchase":
        const purchaseSummary = filteredPurchases.reduce(
          (acc, p) => {
            acc.total += p.totalAmount;
            acc.taxable += p.subtotal;
            acc.tax += p.isGst !== false ? p.totalTax : 0;
            acc.nonGst += p.isGst === false ? p.totalAmount : 0;
            if (p.paymentMode === "credit") acc.credit += p.totalAmount;
            else acc.cash += p.totalAmount;
            return acc;
          },
          { total: 0, taxable: 0, tax: 0, nonGst: 0, cash: 0, credit: 0 },
        );

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-100">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Total {t.purchases}
                </p>
                <p className="text-xl font-black text-slate-900">
                  ₹{purchaseSummary.total.toLocaleString()}
                </p>
                <div className="flex gap-2 mt-1">
                  <p className="text-[9px] text-emerald-600 font-bold">
                    Paid: ₹{purchaseSummary.cash.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-red-500 font-bold">
                    Credit: ₹{purchaseSummary.credit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">
                  Taxable Value
                </p>
                <p className="text-xl font-black text-orange-600">
                  ₹{purchaseSummary.taxable.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                  Input GST
                </p>
                <p className="text-xl font-black text-indigo-600">
                  ₹{purchaseSummary.tax.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Non-GST Purchases
                </p>
                <p className="text-xl font-black text-slate-700">
                  ₹{purchaseSummary.nonGst.toLocaleString()}
                </p>
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">Bill Details</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4 text-center">Payment Status</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">
                        {p.purchaseNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono italic">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">
                        {p.supplierName}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          p.status === "paid"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600",
                        )}
                      >
                        {p.paymentMode} / {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-slate-900">
                        ₹{p.totalAmount.toLocaleString()}
                      </p>
                    </td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-300 italic"
                    >
                      No purchases found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case "stock":
        return (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((prod) => (
                <tr
                  key={prod.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm">
                      {prod.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      SKU: {prod.sku}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {prod.category}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "font-bold text-sm",
                        (prod.stock || 0) < 10
                          ? "text-red-500"
                          : "text-slate-900",
                      )}
                    >
                      {prod.stock || 0} {prod.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-slate-900">
                      ₹
                      {(
                        (prod.stock || 0) * (prod.purchasePrice || 0)
                      ).toLocaleString()}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "gst":
        const totalTaxableSales = filteredGstInvoices.reduce(
          (acc, i) => acc + i.subtotal,
          0,
        );
        const totalOutputGst = filteredGstInvoices.reduce(
          (acc, i) => acc + i.totalTax,
          0,
        );
        const totalInputGst = filteredPurchases.reduce(
          (acc, p) => acc + p.totalTax,
          0,
        );
        // HSN Summary logic
        const hsnSummary = {};
        filteredGstInvoices.forEach((inv) => {
          inv.items.forEach((item) => {
            // Find product for HSN
            const prod = products.find((p) => p.id === item.id);
            const hsn = prod?.hsn || "9999";
            if (!hsnSummary[hsn]) hsnSummary[hsn] = { taxable: 0, tax: 0 };
            // Tax calculation per item
            const itemTaxable = item.price * item.quantity;
            const itemTax = item.tax;
            hsnSummary[hsn].taxable += itemTaxable;
            hsnSummary[hsn].tax += itemTax;
          });
        });

        return (
          <div className="p-8 space-y-8">
            {/* GST Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              {["summary", "gstr1", "gstr2", "hsn"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setGstTab(tab)}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-bold transition-all uppercase",
                    gstTab === tab
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {tab === "summary" ? "Overview" : tab.toUpperCase()}
                </button>
              ))}
            </div>

            {gstTab === "summary" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                      Output GST (Sales)
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                      ₹{totalOutputGst.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">
                      Input GST (Purchase)
                    </p>
                    <p className="text-2xl font-black text-orange-700">
                      ₹{totalInputGst.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
                      Net GST Payable
                    </p>
                    <p className="text-2xl font-black text-emerald-700">
                      ₹
                      {Math.max(
                        0,
                        totalOutputGst - totalInputGst,
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl">
                  <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-wider mb-4">
                    GST Summary details
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        Total Taxable Sales
                      </span>
                      <span className="font-bold">
                        ₹{totalTaxableSales.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Average GST Rate</span>
                      <span className="font-bold">
                        {(
                          (totalOutputGst / (totalTaxableSales || 1)) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {gstTab === "gstr1" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 font-bold border-b border-slate-100">
                    <th className="px-4 py-3">Invoice No / Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Taxable Value</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right text-amber-500 font-bold">
                      IGST
                    </th>
                    <th className="px-4 py-3 text-right text-blue-600 font-bold">
                      Total GST
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Grand Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredGstInvoices.map((inv) => {
                    let taxable =
                      inv.taxable_amount !== undefined
                        ? inv.taxable_amount
                        : inv.subtotal || 0;
                    let cgst =
                      inv.cgst_amount !== undefined ? inv.cgst_amount : 0;
                    let sgst =
                      inv.sgst_amount !== undefined ? inv.sgst_amount : 0;
                    let igst =
                      inv.igst_amount !== undefined ? inv.igst_amount : 0;
                    let totTax =
                      inv.total_tax_amount !== undefined
                        ? inv.total_tax_amount
                        : inv.totalTax || 0;
                    let grand =
                      inv.grand_total !== undefined
                        ? inv.grand_total
                        : inv.totalAmount || 0;

                    if (
                      inv.isGst !== false &&
                      totTax > 0 &&
                      cgst === 0 &&
                      sgst === 0 &&
                      igst === 0
                    ) {
                      const companyState = config?.state || "";
                      const customerState = inv.customer_state || "";
                      const isSameState =
                        !companyState ||
                        !customerState ||
                        companyState.trim().toLowerCase() ===
                          customerState.trim().toLowerCase();
                      if (isSameState) {
                        cgst = totTax / 2;
                        sgst = totTax / 2;
                      } else {
                        igst = totTax;
                      }
                    }

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-[10px] text-slate-400 italic">
                            {inv.customerName}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          ₹
                          {taxable.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          ₹
                          {cgst.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          ₹
                          {sgst.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600">
                          ₹
                          {igst.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                          ₹
                          {totTax.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                          ₹
                          {grand.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredGstInvoices.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-300 italic text-xs"
                      >
                        No GST sales data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {gstTab === "gstr2" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 font-bold border-b border-slate-100">
                    <th className="px-4 py-3">{t.bill_no} / Supplier</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Taxable Value
                    </th>
                    <th className="px-4 py-3 text-right text-emerald-600">
                      CGST
                    </th>
                    <th className="px-4 py-3 text-right text-emerald-600">
                      SGST
                    </th>
                    <th className="px-4 py-3 text-right text-amber-600">
                      IGST
                    </th>
                    <th className="px-4 py-3 text-right text-blue-600 font-bold">
                      Input GST
                    </th>
                    <th className="px-4 py-3 text-right font-bold">
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredPurchases.map((p) => {
                    let taxable =
                      p.taxable_amount !== undefined
                        ? p.taxable_amount
                        : p.subtotal || 0;
                    let cgst = p.cgst_amount !== undefined ? p.cgst_amount : 0;
                    let sgst = p.sgst_amount !== undefined ? p.sgst_amount : 0;
                    let igst = p.igst_amount !== undefined ? p.igst_amount : 0;
                    let totTax =
                      p.total_tax_amount !== undefined
                        ? p.total_tax_amount
                        : p.totalTax || 0;
                    let grand =
                      p.grand_total !== undefined
                        ? p.grand_total
                        : p.totalAmount || 0;

                    if (
                      p.isGst !== false &&
                      totTax > 0 &&
                      cgst === 0 &&
                      sgst === 0 &&
                      igst === 0
                    ) {
                      // Assume local local purchase is half-and-half CGST/SGST if no state given
                      cgst = totTax / 2;
                      sgst = totTax / 2;
                    }

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">
                            {p.purchaseNumber}
                          </p>
                          <p className="text-[10px] text-slate-400 italic">
                            {p.supplierName}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          ₹
                          {taxable.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          ₹
                          {cgst.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          ₹
                          {sgst.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600">
                          ₹
                          {igst.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-orange-600">
                          ₹
                          {totTax.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                          ₹
                          {grand.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-300 italic text-xs"
                      >
                        No purchase data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {gstTab === "hsn" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <th className="px-4 py-3">HSN Code</th>
                    <th className="px-4 py-3">Taxable Value</th>
                    <th className="px-4 py-3 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(hsnSummary).map(([hsn, data]) => (
                    <tr key={hsn} className="text-sm group hover:bg-slate-50">
                      <td className="px-4 py-4 font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        {hsn}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-600">
                        ₹{data.taxable.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-emerald-600">
                        ₹{data.tax.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      case "profit":
        const salesRev = filteredInvoices.reduce(
          (acc, i) => acc + i.subtotal,
          0,
        );
        const purchaseCost = filteredPurchases.reduce(
          (acc, p) => acc + p.subtotal,
          0,
        );
        const expenseTotal = filteredVouchers
          .filter((v) => v.type === "payment" && v.entityType === "expense")
          .reduce((acc, v) => acc + v.amount, 0);
        const grossProfit = salesRev - purchaseCost;
        const netProfit = grossProfit - expenseTotal;
        return (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl text-white shadow-xl shadow-emerald-100">
                <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">
                  Net Profit / Loss
                </p>
                <p className="text-4xl font-black italic tracking-tighter">
                  ₹{netProfit.toLocaleString()}
                </p>
                <div className="mt-6 pt-6 border-t border-white/20 flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span>
                    Margin: {((netProfit / (salesRev || 1)) * 100).toFixed(1)}%
                  </span>
                  <span>Status: {netProfit >= 0 ? "Profitable" : "Loss"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Gross Sales
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    ₹{salesRev.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Expenses
                  </p>
                  <p className="text-xl font-black text-red-600">
                    ₹{expenseTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Pur. Cost
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    ₹{purchaseCost.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Gross Profit
                  </p>
                  <p className="text-xl font-black text-emerald-600">
                    ₹{grossProfit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case "expense":
        const expenses = filteredVouchers.filter(
          (v) =>
            v.type === "payment" && (v.entityType === "expense" || !v.entityId),
        );
        return (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-6 py-4">Expense Details</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm">
                      {v.description}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono italic">
                      {new Date(v.date).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {v.paymentMode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-red-600">
                      ₹{v.amount.toLocaleString()}
                    </p>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-12 text-center text-slate-300 italic"
                  >
                    No expenses recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
      case "employee":
        return (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm">
                      {emp.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{emp.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {emp.role}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        emp.status === "present"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600",
                      )}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-slate-900">
                      ₹{emp.salary.toLocaleString()}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "customer_ledger":
        if (selectedEntityId) {
          const customer = customers.find((c) => c.id === selectedEntityId);
          const customerInvoices = invoices.filter(
            (inv) => inv.customerId === selectedEntityId,
          );
          const customerPayments = vouchers.filter(
            (v) => v.entityId === selectedEntityId && v.type === "receipt",
          );
          return (
            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedEntityId(null)}
                  className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
                >
                  <ArrowDownCircle className="rotate-90" size={16} /> Back to
                  List
                </button>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {customer?.name}
                    </h3>
                    <p className="text-sm text-slate-500 font-black italic">
                      Outstanding: ₹{customer?.balance?.toLocaleString()}
                    </p>
                  </div>
                  {(customer?.balance || 0) > 0 && (
                    <button
                      onClick={() => {
                        setSettleAmount(customer.balance);
                        setShowSettleModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      Settle Balance
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1 italic">
                    Total Billed
                  </p>
                  <p className="text-xl font-black text-red-600">
                    ₹
                    {customerInvoices
                      .reduce((acc, i) => acc + i.totalAmount, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">
                    Total Paid (Receipts)
                  </p>
                  <p className="text-xl font-black text-emerald-600">
                    ₹
                    {customerPayments
                      .reduce((acc, v) => acc + v.amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Debit (Bill)</th>
                    <th className="px-4 py-3 text-right">Credit (Paid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ...customerInvoices.map((i) => ({
                      date: i.createdAt,
                      ref: i.invoiceNumber,
                      type: "Sale",
                      debit: i.totalAmount,
                      credit: 0,
                    })),
                    ...customerPayments.map((v) => ({
                      date: v.date,
                      ref: v.description,
                      type: "Receipt",
                      debit: 0,
                      credit: v.amount,
                    })),
                  ]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .map((item, idx) => (
                      <tr
                        key={idx}
                        className="text-xs hover:bg-slate-50 italic"
                      >
                        <td className="px-4 py-3 font-medium text-slate-500">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 uppercase">
                          {item.ref}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black",
                              item.type === "Sale"
                                ? "bg-red-50 text-red-600"
                                : "bg-emerald-50 text-emerald-600",
                            )}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          {item.debit > 0
                            ? `₹${item.debit.toLocaleString()}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {item.credit > 0
                            ? `₹${item.credit.toLocaleString()}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Transactions</th>
                <th className="px-6 py-4 text-right">Outstanding Balance</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => {
                const customerInvoices = invoices.filter(
                  (inv) => inv.customerId === c.id,
                );
                const totalTrans = customerInvoices.reduce(
                  (acc, i) => acc + i.totalAmount,
                  0,
                );
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {c.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {c.phone}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-slate-700">
                        ₹{totalTrans.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 italic">
                        {customerInvoices.length} Bills
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p
                        className={cn(
                          "font-black text-sm italic",
                          c.balance > 0 ? "text-red-600" : "text-emerald-600",
                        )}
                      >
                        ₹{c.balance.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedEntityId(c.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ArrowDownCircle className="-rotate-90" size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      case "supplier_ledger":
        if (selectedEntityId) {
          const supplier = suppliers.find((s) => s.id === selectedEntityId);
          const supplierPurchases = purchases.filter(
            (p) => p.supplierId === selectedEntityId,
          );
          const supplierPayments = vouchers.filter(
            (v) => v.entityId === selectedEntityId && v.type === "payment",
          );
          return (
            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedEntityId(null)}
                  className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
                >
                  <ArrowDownCircle className="rotate-90" size={16} /> Back to
                  List
                </button>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {supplier?.name}
                    </h3>
                    <p className="text-sm text-slate-500 font-black italic">
                      Our Payable: ₹{supplier?.balance?.toLocaleString()}
                    </p>
                  </div>
                  {(supplier?.balance || 0) > 0 && (
                    <button
                      onClick={() => {
                        setSettleAmount(supplier.balance);
                        setShowSettleModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                    >
                      Settle Balance
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1 italic">
                    Total Purchase
                  </p>
                  <p className="text-xl font-black text-red-600">
                    ₹
                    {supplierPurchases
                      .reduce((acc, p) => acc + p.totalAmount, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">
                    Total Paid (Payments)
                  </p>
                  <p className="text-xl font-black text-emerald-600">
                    ₹
                    {supplierPayments
                      .reduce((acc, v) => acc + v.amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Debit (Payment)</th>
                    <th className="px-4 py-3 text-right">Credit (Purchase)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ...supplierPurchases.map((p) => ({
                      date: p.createdAt,
                      ref: p.purchaseNumber,
                      debit: 0,
                      credit: p.totalAmount,
                    })),
                    ...supplierPayments.map((v) => ({
                      date: v.date,
                      ref: v.description,
                      debit: v.amount,
                      credit: 0,
                    })),
                  ]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .map((item, idx) => (
                      <tr
                        key={idx}
                        className="text-xs hover:bg-slate-50 italic"
                      >
                        <td className="px-4 py-3 font-medium text-slate-500">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 uppercase">
                          {item.ref}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {item.debit > 0
                            ? `₹${item.debit.toLocaleString()}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          {item.credit > 0
                            ? `₹${item.credit.toLocaleString()}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Total Purchase</th>
                <th className="px-6 py-4 text-right">Our Balance</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => {
                const supplierPurchases = purchases.filter(
                  (p) => p.supplierId === s.id,
                );
                const totalPurchase = supplierPurchases.reduce(
                  (acc, p) => acc + p.totalAmount,
                  0,
                );
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {s.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {s.phone}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                      ₹{totalPurchase.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p
                        className={cn(
                          "font-black text-sm italic",
                          s.balance > 0 ? "text-red-600" : "text-emerald-600",
                        )}
                      >
                        ₹{s.balance.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedEntityId(s.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ArrowDownCircle className="-rotate-90" size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      default:
        return (
          <div className="p-12 text-center text-slate-400 italic">
            Feature implementation in progress for this report type.
          </div>
        );
    }
  };

  const gstSummary = filteredInvoices.reduce(
    (acc, inv) => {
      const tax = inv.isGst !== false ? inv.totalTax || 0 : 0;
      const taxableAmount = inv.subtotal || 0;
      acc.totalTax += tax;
      acc.totalTaxable += taxableAmount;
      if (inv.isGst === false) acc.nonGstVolume += inv.totalAmount;
      return acc;
    },
    { totalTax: 0, totalTaxable: 0, nonGstVolume: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.reports}</h2>
          <p className="text-slate-500">{t.settings}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 border-r border-slate-100"
            >
              <Printer size={14} className="text-red-500" />
              PDF
            </button>
            <button
              onClick={() => handleExport("excel")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 border-r border-slate-100"
            >
              <FileSpreadsheet size={14} className="text-emerald-500" />
              Excel
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 border-r border-slate-100"
            >
              <Download size={14} className="text-blue-500" />
              CSV
            </button>
            <button
              onClick={() => handleExport("tally")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <Layers size={14} className="text-indigo-500" />
              Tally
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Report Content */}
        <div className="flex-1 space-y-6">
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">
                {reportTypes.find((r) => r.id === activeReport)?.label}
              </h3>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">
                Comprehensive Data Analysis & Insights
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              {(() => {
                const Icon =
                  reportTypes.find((r) => r.id === activeReport)?.icon ||
                  FileBarChart;
                return <Icon size={24} />;
              })()}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Filter size={14} />
                </div>
                <span className="text-sm font-bold text-slate-700">
                  Filters
                </span>
              </div>

              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Payments</option>
                <option value="cash">Cash Only</option>
                <option value="upi">UPI Only</option>
                <option value="card">Card Only</option>
                <option value="credit">Credit (Pending)</option>
              </select>

              {(activeReport === "sales" || activeReport === "purchase") && (
                <select
                  value={billTypeFilter}
                  onChange={(e) => setBillTypeFilter(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Bill Types</option>
                  <option value="gst">GST Bills</option>
                  <option value="non-gst">Non-GST Bills</option>
                </select>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="date"
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <span className="text-slate-400 font-bold text-xs uppercase">
                to
              </span>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="date"
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              {activeReport === "sales" && (
                <div className="flex items-center gap-3 border-l border-slate-100 pl-3">
                  <div className="relative flex items-center gap-2">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">
                      Type:
                    </span>
                    <select
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 appearance-none min-w-[100px]"
                      value={billTypeFilter}
                      onChange={(e) => setBillTypeFilter(e.target.value)}
                    >
                      <option value="all">All Bills</option>
                      <option value="gst">Only GST</option>
                      <option value="non-gst">Non-GST</option>
                    </select>
                  </div>

                  <div className="relative flex items-center gap-2 border-l border-slate-100 pl-3">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">
                      Staff:
                    </span>
                    <select
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 appearance-none min-w-[120px]"
                      value={staffFilter}
                      onChange={(e) => setStaffFilter(e.target.value)}
                    >
                      <option value="all">Every Staff</option>
                      <option value="Administrator">Administrator</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                {reportTypes.find((r) => r.id === activeReport)?.label} Data
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full font-black uppercase">
                  Live
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">{renderReportContent()}</div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedInvoice.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedInvoice.createdAt?.toDate?.()?.toLocaleString() ||
                      "Recent"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Customer Details
                    </p>
                    <p className="font-bold text-slate-900">
                      {selectedInvoice.customerName}
                    </p>
                    <p className="text-sm text-slate-500">
                      ID: {selectedInvoice.customerId || "Walk-in"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Payment Status
                    </p>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                        selectedInvoice.status === "paid"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-600",
                      )}
                    >
                      {selectedInvoice.status}
                    </span>
                    <p className="text-xs text-slate-400 font-bold mt-2 uppercase">
                      {selectedInvoice.paymentMode}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                        Billed By
                      </p>
                      <p className="text-xs font-bold text-blue-600 uppercase italic">
                        {selectedInvoice.billedBy || "Admin"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Item Description</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-500">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400 font-medium">
                            ₹{item.price.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            ₹{item.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-6">
                  <div className="flex justify-between text-sm text-slate-500 font-medium">
                    <span>Subtotal</span>
                    <span>₹{selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 font-medium">
                    <span>Tax (GST)</span>
                    <span
                      className={cn(
                        selectedInvoice.isGst === false &&
                          "line-through opacity-50",
                      )}
                    >
                      ₹{selectedInvoice.totalTax.toLocaleString()}
                    </span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-rose-600 font-bold italic">
                      <span>
                        Discount ({selectedInvoice.discountValue}
                        {selectedInvoice.discountType === "percent" ? "%" : "₹"}
                        )
                      </span>
                      <span>-₹{selectedInvoice.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-black text-slate-900 pt-4 border-t-2 border-slate-900">
                    <span>TOTAL AMOUNT</span>
                    <span className="text-blue-600 font-black tracking-tight text-2xl">
                      ₹{selectedInvoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedInvoice.eInvoiceDetails && (
                  <div className="px-8 pb-8 space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4 items-start">
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">
                          E-Invoice Info (GST IRP)
                        </p>
                        <p className="text-[9px] font-mono text-slate-600 break-all leading-tight">
                          <span className="font-black text-slate-400 italic">
                            IRN:
                          </span>{" "}
                          {selectedInvoice.eInvoiceDetails.irn}
                        </p>
                        <div className="flex justify-between text-[9px] font-bold text-slate-600 italic">
                          <span>
                            ACK NO: {selectedInvoice.eInvoiceDetails.ackNo}
                          </span>
                          <span>
                            DATE: {selectedInvoice.eInvoiceDetails.ackDate}
                          </span>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-white border border-emerald-100 p-1 flex-shrink-0">
                        <img
                          src={`https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(selectedInvoice.eInvoiceDetails.signedQrCode)}&scale=2`}
                          alt="E-INV QR"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                  <Printer size={18} /> Print Invoice
                </button>
                <button className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                  <FileText size={18} /> Download PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Settle Balance Modal */}
      <AnimatePresence>
        {showSettleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                    Quick Settlement
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activeReport === "customer_ledger"
                      ? "Receive Payment"
                      : "Make Payment"}
                  </p>
                </div>
                <button
                  onClick={() => setShowSettleModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                      Total Outstanding
                    </span>
                    <span className="text-2xl font-black text-slate-900 italic">
                      ₹{settleAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-200">
                    <IndianRupee size={24} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                      Settlement Amount
                    </label>
                    <input
                      type="number"
                      value={settleAmount || ""}
                      onChange={(e) =>
                        setSettleAmount(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold text-lg"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          id: "cash",
                          icon: <Banknote size={16} />,
                          label: "Cash",
                        },
                        { id: "upi", icon: <QrCode size={16} />, label: "UPI" },
                        {
                          id: "card",
                          icon: <CreditCard size={16} />,
                          label: "Card",
                        },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setSettlePaymentMode(mode.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all",
                            settlePaymentMode === mode.id
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                              : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50",
                          )}
                        >
                          {mode.icon}
                          <span className="text-[9px] font-black uppercase mt-1 tracking-wider">
                            {mode.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    onClick={() => setShowSettleModal(false)}
                    className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-colors uppercase tracking-widest text-xs italic"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickSettle}
                    disabled={isSubmitting || settleAmount <= 0}
                    className="flex-1 px-4 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs italic disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "Confirm Settle"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
