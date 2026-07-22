import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  ShoppingCart,
  User,
  Package,
  X,
  History as HistoryIcon,
  RotateCcw,
  CheckCircle2,
  Barcode,
  Sliders,
  Volume2,
  VolumeX,
  Smartphone,
  Lock,
  Download,
  Printer,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ProductService,
  InvoiceService,
  CustomerService,
  CategoryService,
  SettingsService,
} from "@/src/services/dataService";
import { MessagingService } from "@/src/services/messagingService";
import { useAuth } from "@/src/lib/AuthContext";
import { useOffline } from "@/src/lib/OfflineContext";
import { useLocalization } from "@/src/lib/LocalizationContext";
import { translations } from "@/src/lib/translations";
import { calculateInvoiceTotals } from "../utils/gstCalculator";
import { exportInvoicePDF } from "../utils/pdfGenerator";

export default function POS() {
  const { userProfile } = useAuth();
  const { isOffline, addOfflineInvoice } = useOffline();
  const { config, formatCurrency, formatDate, t, currencySymbol } = useLocalization();
  const taxLabel = config?.tax_type || 'GST';
  const cgstLabel = config?.tax_type === 'GST' ? 'CGST' : 'Local Tax';
  const sgstLabel = config?.tax_type === 'GST' ? 'SGST' : 'State Tax';
  const igstLabel = config?.tax_type === 'GST' ? 'IGST' : 'Integrated Tax';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [billingType, setBillingType] = useState("retail");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [paymentMode, setPaymentMode] = useState("upi");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGstBill, setIsGstBill] = useState(true);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkQty, setBulkQty] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const productSearchRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  // UPI payment simulation states
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiSimulateStep, setUpiSimulateStep] = useState("scan");
  const [upiSimulatePin, setUpiSimulatePin] = useState("");
  const isUpiAuthorized = useRef(false);

  const [isScannerEnabled, setIsScannerEnabled] = useState(() => {
    return localStorage.getItem("pos_scanner_enabled") !== "false";
  });
  const [scannerSensitivity, setScannerSensitivity] = useState(() => {
    const saved = localStorage.getItem("pos_scanner_sensitivity");
    return saved ? parseInt(saved, 10) : 75;
  });
  const [isScannerSoundEnabled, setIsScannerSoundEnabled] = useState(() => {
    return localStorage.getItem("pos_scanner_sound_enabled") !== "false";
  });
  const [showScannerConfig, setShowScannerConfig] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState("");

  useEffect(() => {
    localStorage.setItem("pos_scanner_enabled", String(isScannerEnabled));
  }, [isScannerEnabled]);

  useEffect(() => {
    localStorage.setItem("pos_scanner_sensitivity", String(scannerSensitivity));
  }, [scannerSensitivity]);

  useEffect(() => {
    localStorage.setItem(
      "pos_scanner_sound_enabled",
      String(isScannerSoundEnabled),
    );
  }, [isScannerSoundEnabled]);

  const [scanNotification, setScanNotification] = useState(null);

  const playScanSound = (type) => {
    if (!isScannerSoundEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (type === "success") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, ctx.currentTime); // Standard high frequency POS beep
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Soft buzz tone
        osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (err) {
      console.warn(
        "Audio feedback failed or was blocked by browser autoplay policy:",
        err,
      );
    }
  };

  const triggerScanNotification = (message, type = "success") => {
    const id = Math.random().toString();
    setScanNotification({ id, message, type });
    playScanSound(type);
  };

  useEffect(() => {
    if (scanNotification) {
      const timer = setTimeout(() => {
        setScanNotification((prev) =>
          prev?.id === scanNotification.id ? null : prev,
        );
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scanNotification]);

  const generateNextInvoiceNumber = () => {
    const prefix = config?.invoicePrefix || "INV";
    const existingIds = invoices
      .map((inv) => inv.invoiceNumber || "")
      .filter((id) => id.startsWith(prefix))
      .map((id) => parseInt(id.replace(prefix, "")))
      .filter((num) => !isNaN(num));
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(3, "0")}`;
  };
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);
  const discountInputRef = useRef(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't trigger if typing in inputs unless it's a specific function key or barcode scan characters
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      // Handle Escape (works even in inputs)
      if (e.key === "Escape") {
        if (showCustomerSearch) setShowCustomerSearch(false);
        else if (isBulkMode) setIsBulkMode(false);
        else if (searchQuery) setSearchQuery("");
        return;
      }

      const currentTime = new Date().getTime();
      const delta = currentTime - lastKeyTime.current;
      const isBarcodeChar = e.key.length === 1 || e.key === "Enter";

      if (isScannerEnabled && isBarcodeChar) {
        if (isInput && delta > scannerSensitivity) {
          barcodeBuffer.current = "";
        } else if (!isInput && delta > 1000) {
          barcodeBuffer.current = "";
        }

        if (e.key === "Enter") {
          if (barcodeBuffer.current.length > 2) {
            const scannedCode = barcodeBuffer.current;
            setLastScannedCode(scannedCode);
            const product = products.find(
              (p) => p.barcode === scannedCode || p.sku === scannedCode,
            );
            if (product) {
              e.preventDefault();
              e.stopPropagation();

              if (isBulkMode) {
                handleUpdateBulkQty(product.id, 1);
              } else {
                addToCart(product);
              }

              triggerScanNotification(
                `${t.success || "Added"}: ${product.name}`,
                "success",
              );

              // Clean up pollution in target input
              if (isInput && e.target instanceof HTMLElement) {
                const target = e.target;
                const val = target.value || "";
                let newValue = val;
                if (val.endsWith(scannedCode)) {
                  newValue = val.slice(0, val.length - scannedCode.length);
                } else if (val === scannedCode) {
                  newValue = "";
                } else {
                  for (let len = scannedCode.length; len > 0; len--) {
                    const partial = scannedCode.slice(0, len);
                    if (val.endsWith(partial)) {
                      newValue = val.slice(0, val.length - partial.length);
                      break;
                    }
                  }
                }

                target.value = newValue;
                if (target === productSearchRef.current) {
                  setSearchQuery(newValue);
                } else if (target.id === "customer-search-input") {
                  setCustomerSearchQuery(newValue);
                } else {
                  const event = new Event("input", { bubbles: true });
                  target.dispatchEvent(event);
                }
              }

              barcodeBuffer.current = "";
              lastKeyTime.current = currentTime;
              return;
            } else {
              triggerScanNotification(`Not Found: ${scannedCode}`, "error");
            }
            barcodeBuffer.current = "";
          }
        } else if (e.key.length === 1) {
          barcodeBuffer.current += e.key;
          // Prevent rapid auto-typing from polluting active inputs
          if (isInput && delta <= scannerSensitivity) {
            e.preventDefault();
          }
        }
      }

      lastKeyTime.current = currentTime;

      // F-Keys and Alt combinations
      if (e.key === "F1") {
        e.preventDefault();
        productSearchRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        setIsBulkMode((prev) => !prev);
      } else if (e.key === "F4") {
        e.preventDefault();
        setShowCustomerSearch(true);
      } else if (e.key === "F7") {
        e.preventDefault();
        setBillingType((prev) => (prev === "retail" ? "wholesale" : "retail"));
      } else if (e.key === "F8") {
        e.preventDefault();
        const modes = ["cash", "upi", "card", "credit"];
        const nextIdx = (modes.indexOf(paymentMode) + 1) % modes.length;
        setPaymentMode(modes[nextIdx]);
      } else if (e.key === "F10") {
        e.preventDefault();
        discountInputRef.current?.focus();
      } else if (e.key === "F12") {
        e.preventDefault();
        if (cart.length > 0 && !isProcessing) handleCheckout();
      }

      if (
        isInput &&
        !["F1", "F2", "F4", "F7", "F8", "F10", "F12"].includes(e.key)
      ) {
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    products,
    showCustomerSearch,
    isBulkMode,
    searchQuery,
    paymentMode,
    cart,
    isProcessing,
    isScannerEnabled,
    scannerSensitivity,
  ]);

  useEffect(() => {
    if (userProfile?.branchId) {
      const unsubProducts = ProductService.getProducts(
        userProfile.branchId,
        (data) => setProducts(data),
      );
      const unsubCategories = CategoryService.getCategories(
        userProfile.branchId,
        (data) => setCategories(data),
      );
      const unsubCustomers = CustomerService.getCustomers(
        userProfile.branchId,
        (data) => setCustomers(data),
      );
      const unsubInvoices = InvoiceService.getAllInvoices(
        userProfile.branchId,
        (data) => setInvoices(data),
      );
      return () => {
        unsubProducts();
        unsubCategories();
        unsubCustomers();
        unsubInvoices();
      };
    }
  }, [userProfile?.branchId]);

  useEffect(() => {
    if (config) {
      setIsGstBill(config.enableGst ?? true);
    }
  }, [config]);

  // UPI checkout simulation state transitions
  useEffect(() => {
    if (!showUpiModal) return;
    if (upiSimulateStep === "authorizing") {
      const t1 = setTimeout(() => {
        setUpiSimulateStep("success");
        playScanSound("success");
      }, 2000);
      return () => clearTimeout(t1);
    }
    if (upiSimulateStep === "success") {
      const t2 = setTimeout(async () => {
        isUpiAuthorized.current = true;
        await handleCheckout();
        isUpiAuthorized.current = false;
        setShowUpiModal(false);
      }, 2200);
      return () => clearTimeout(t2);
    }
  }, [upiSimulateStep, showUpiModal]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.includes(customerSearchQuery),
  );

  const getPrice = (item) =>
    billingType === "wholesale" && item.wholesalePrice
      ? item.wholesalePrice
      : item.sellingPrice;

  const subtotal = cart.reduce(
    (acc, item) => acc + getPrice(item) * item.qty,
    0,
  );
  const discountAmount =
    discountType === "fixed" ? discountValue : (subtotal * discountValue) / 100;

  const companyState = config?.state || "";
  const customerState = selectedCustomer?.state || "";
  const isSameState =
    !companyState ||
    !customerState ||
    companyState.trim().toLowerCase() === customerState.trim().toLowerCase();

  const gstCalculations = useMemo(() => {
    const items = cart.map((item) => ({
      price: getPrice(item),
      qty: item.qty,
      quantity: item.qty,
      gstPercent: isGstBill ? item.gstPercent || 0 : 0,
    }));
    return calculateInvoiceTotals({
      items,
      companyState,
      customerState,
      discountAmount,
      taxType: config?.tax_type || 'GST',
      country: config?.country || 'India'
    });
  }, [
    cart,
    isGstBill,
    companyState,
    customerState,
    discountAmount,
    billingType,
  ]);

  const totalTax = isGstBill ? gstCalculations.total_tax_amount : 0;
  const total = isGstBill
    ? gstCalculations.grand_total
    : Math.max(0, subtotal - discountAmount);

  const handleUpdateBulkQty = (productId, delta) => {
    setBulkQty((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const addBulkToCart = () => {
    const itemsToAdd = [];
    Object.entries(bulkQty).forEach(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      if (product) {
        itemsToAdd.push({ ...product, qty });
      }
    });

    setCart((prev) => {
      let newCart = [...prev];
      itemsToAdd.forEach((newItem) => {
        const existing = newCart.find((item) => item.id === newItem.id);
        if (existing) {
          newCart = newCart.map((item) =>
            item.id === newItem.id
              ? { ...item, qty: Math.min(item.qty + newItem.qty, item.stock) }
              : item,
          );
        } else {
          newCart.push(newItem);
        }
      });
      return newCart;
    });

    setBulkQty({});
    setIsBulkMode(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !userProfile?.branchId) return;
    if (paymentMode === "credit" && !selectedCustomer) {
      alert("Please select a customer for credit sales.");
      return;
    }

    // Intercept UPI payments for customer-facing GPay simulation
    if (paymentMode === "upi" && !isUpiAuthorized.current) {
      setUpiSimulateStep("scan");
      setUpiSimulatePin("");
      setShowUpiModal(true);
      return;
    }
    setIsProcessing(true);
    try {
      const invoiceNumber = generateNextInvoiceNumber();
      let eInvoiceDetails = undefined;
      if (config?.enableEInvoice && isGstBill) {
        // Mock E-Invoice Generation (Simulating IRP response)
        const timestamp = new Date().toISOString();
        const randomHash =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
        eInvoiceDetails = {
          irn: randomHash.toUpperCase(),
          ackNo: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
          ackDate: timestamp.replace("T", " ").split(".")[0],
          signedQrCode: `8${randomHash}${Date.now()}`, // Mock signed string for QR
        };
      }

      const invoiceData = {
        invoiceNumber,
        customerName: selectedCustomer?.name || "Walk-in Customer",
        customerId: selectedCustomer?.id || null,
        items: gstCalculations.items.map((item, idx) => {
          const originalCartItem = cart[idx];
          return {
            id: originalCartItem.id,
            name: originalCartItem.name,
            quantity: originalCartItem.qty,
            price: item.price,
            tax: isGstBill ? item.total_tax_amount : 0,
            total: isGstBill
              ? item.grand_total
              : item.price * originalCartItem.qty,
            gstPercent: originalCartItem.gstPercent || 0,
            taxable_amount: item.taxable_amount,
            cgst_percentage: isGstBill ? item.cgst_percentage : 0,
            cgst_amount: isGstBill ? item.cgst_amount : 0,
            sgst_percentage: isGstBill ? item.sgst_percentage : 0,
            sgst_amount: isGstBill ? item.sgst_amount : 0,
            igst_percentage: isGstBill ? item.igst_percentage : 0,
            igst_amount: isGstBill ? item.igst_amount : 0,
            total_tax_amount: isGstBill ? item.total_tax_amount : 0,
            grand_total: isGstBill
              ? item.grand_total
              : item.price * originalCartItem.qty,
          };
        }),
        subtotal,
        totalTax,
        discount: discountAmount,
        discountValue,
        discountType,
        totalAmount: total,
        paymentMode,
        status: paymentMode === "credit" ? "pending" : "paid",
        billedBy: userProfile?.name || "Unknown",
        branchId: userProfile.branchId,
        isGst: isGstBill,
        eInvoiceDetails,
        taxable_amount: gstCalculations.taxable_amount,
        cgst_percentage:
          isGstBill && isSameState ? (config?.defaultGstPercent || 18) / 2 : 0,
        cgst_amount: isGstBill ? gstCalculations.cgst_amount : 0,
        sgst_percentage:
          isGstBill && isSameState ? (config?.defaultGstPercent || 18) / 2 : 0,
        sgst_amount: isGstBill ? gstCalculations.sgst_amount : 0,
        igst_percentage:
          isGstBill && !isSameState ? config?.defaultGstPercent || 18 : 0,
        igst_amount: isGstBill ? gstCalculations.igst_amount : 0,
        total_tax_amount: totalTax,
        grand_total: total,
        customer_state: selectedCustomer?.state || "",
        company_state: config?.state || "",
      };

      const created = await InvoiceService.createInvoice(
        userProfile.branchId,
        invoiceData,
      );
      if (isOffline) {
        addOfflineInvoice({ ...invoiceData, id: created.id });
      }
      setLastInvoice({ ...invoiceData, id: created.id });
      setShowReceiptModal(true);

      // Clean up common states but lastInvoice is preserved for the modal
      setCart([]);
      setSelectedCustomer(null);
      setDiscountValue(0);
      setDiscountType("fixed");
      setPaymentMode("upi");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewBill = () => {
    setShowReceiptModal(false);
    setLastInvoice(null);
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue(0);
    setDiscountType("fixed");
    setPaymentMode("upi");
    setTimeout(() => productSearchRef.current?.focus(), 100);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePOSPrint80mm = () => {
    if (!lastInvoice) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print receipts.");
      return;
    }

    const itemsRows = lastInvoice.items
      .map((item) => {
        const hsnBlock =
          lastInvoice.isGst && item.gstPercent
            ? `
      <div style="font-size: 8px; color: #444; padding-left: 2px; margin-bottom: 4px; font-family: monospace;">
        HSN: ${item.hsn || "8517"} | GST: ${item.gstPercent}% (${(item.cgst_amount || 0) > 0 ? "CGST+SGST" : "IGST"})
      </div>`
            : "";
        return `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2.5px;">
        <span style="flex: 2; text-align: left;">${item.name} (${item.quantity}x)</span>
        <span style="flex: 1; text-align: right;">Rs.${item.total.toFixed(2)}</span>
      </div>
      ${hsnBlock}
      `;
      })
      .join("");

    const gstInLine = config?.gstIn
      ? `<div class="center" style="font-size: 8.5px;">GSTIN: ${config?.gstIn}</div>`
      : "";
    const gstTaxLine = lastInvoice.isGst
      ? `
    <div style="display: flex; justify-content: space-between; padding: 1px 0;">
      <span>TOTAL GST TAX (+):</span>
      <span>Rs.${lastInvoice.totalTax.toFixed(2)}</span>
    </div>
    `
      : "";
    const discountLine =
      lastInvoice.discount > 0
        ? `
    <div style="display: flex; justify-content: space-between; padding: 1px 0; color: #cc0000;">
      <span>DISCOUNT REBATE (-):</span>
      <span>-Rs.${lastInvoice.discount.toFixed(2)}</span>
    </div>
    `
        : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>POS SLIP - ${lastInvoice.invoiceNumber}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              width: 72mm;
              margin: 0;
              padding: 6px;
              font-family: 'Courier New', Courier, monospace;
              font-size: 10.5px;
              line-height: 1.25;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .dashed-line { border-top: 1px dashed #000; margin: 5px 0; }
            .double-line { border-top: 3px double #000; margin: 7px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 13.5px; text-transform: uppercase;">${config?.companyName || config?.businessName || "Billing360 Shop"}</div>
          <div class="center" style="font-size: 8.5px; margin-top: 1.5px;">${config?.address || "Outlet Address"}</div>
          <div class="center" style="font-size: 8.5px;">PH: ${config?.phone || "9876543210"}</div>
          ${gstInLine}
          
          <div class="dashed-line"></div>
          
          <div class="center bold" style="font-size: 10px; margin: 3px 0; letter-spacing: 1px;">3-INCH THERMAL TAX RECEIPT</div>
          
          <div style="font-size: 8.5px; font-family: sans-serif;">
            <div>INV NO  : <b>${lastInvoice.invoiceNumber}</b></div>
            <div>DATE    : ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div>CUSTOMER: ${lastInvoice.customerName}</div>
            <div>PMTMODE : ${(lastInvoice.paymentMode || "CASH").toUpperCase()}</div>
            <div>STAFF   : ${lastInvoice.billedBy || "ADMIN"}</div>
          </div>
          
          <div class="dashed-line"></div>
          
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 9.5px; margin-bottom: 2px;">
            <span style="flex: 2; text-align: left;">DESC / ITEM</span>
            <span style="flex: 1; text-align: right;">TOTAL AMT</span>
          </div>
          
          <div class="dashed-line"></div>
          
          <div style="font-size: 8.5px;">
            ${itemsRows}
          </div>
          
          <div class="dashed-line"></div>
          
          <div style="font-size: 9px; font-family: sans-serif;">
            <div style="display: flex; justify-content: space-between; padding: 1px 0;">
              <span>SUBTOTAL TAXABLE:</span>
              <span>Rs.${lastInvoice.subtotal.toFixed(2)}</span>
            </div>
            ${gstTaxLine}
            ${discountLine}
          </div>
          
          <div class="double-line"></div>
          
          <div class="bold" style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>NET GRAND TOTAL:</span>
            <span>Rs.${lastInvoice.totalAmount.toFixed(2)}</span>
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="center" style="font-size: 8px; margin: 8px 0 2px 0;">
            *** THANK YOU! PLEASE VISIT AGAIN ***
          </div>
          
          <div class="center" style="margin-top: 8px; font-family: monospace;">
            <div style="font-size: 12px; letter-spacing: 1px; font-weight: bold;">|||| |||| |||| |||| |||| ||</div>
            <div style="font-size: 7.5px;">*${lastInvoice.invoiceNumber}*</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function(){ window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadA4PDF = () => {
    if (!lastInvoice) return;
    exportInvoicePDF(lastInvoice, config);
  };

  const triggerHighlight = (id) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightedItemId(id);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedItemId(null);
    }, 1000);
  };

  const addToCart = (product) => {
    if (product.id) {
      triggerHighlight(product.id);
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, qty: Math.min(item.qty + 1, item.stock) }
            : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    triggerHighlight(id);
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              qty: Math.max(1, Math.min(item.qty + delta, item.stock)),
            }
          : item,
      ),
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const selectAllVisible = () => {
    setBulkQty((prev) => {
      const next = { ...prev };
      filteredProducts.forEach((p) => {
        if (p.id) next[p.id] = (next[p.id] || 0) + 1;
      });
      return next;
    });
  };

  const clearBulk = () => {
    setBulkQty({});
  };

  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-auto lg:h-[calc(100vh-160px)] pb-16 lg:pb-0">
      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-white p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab("products")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
            activeTab === "products"
              ? "bg-blue-600 text-white"
              : "text-slate-500",
          )}
        >
          {t.inventory}
        </button>
        <button
          onClick={() => setActiveTab("cart")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2",
            activeTab === "cart" ? "bg-blue-600 text-white" : "text-slate-500",
          )}
        >
          {t.cart} ({cart.length})
          {cart.length > 0 && (
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Product Selection Area */}
      <div
        className={cn(
          "flex-1 flex flex-col gap-6 overflow-hidden",
          activeTab === "cart" && "hidden lg:flex",
        )}
      >
        {/* Category Filter */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar gap-1 flex-shrink-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
              selectedCategory === "all"
                ? "bg-slate-900 text-white shadow-lg"
                : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {t.all_products}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                selectedCategory === cat.name
                  ? "bg-slate-900 text-white shadow-lg"
                  : "text-slate-500 hover:bg-slate-50",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500"
              size={20}
            />
            <input
              ref={productSearchRef}
              type="text"
              placeholder={t.search + " (F1)"}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-base focus:outline-none focus:border-blue-500 shadow-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery) {
                  const product = products.find(
                    (p) => p.barcode === searchQuery || p.sku === searchQuery,
                  );
                  if (product) {
                    if (isBulkMode) {
                      handleUpdateBulkQty(product.id, 1);
                    } else {
                      addToCart(product);
                    }
                    setSearchQuery("");
                  }
                }
              }}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                if (isBulkMode) setBulkQty({});
              }}
              className={cn(
                "p-3 border rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider",
                isBulkMode
                  ? "bg-blue-600 border-blue-600 text-white shadow-blue-200"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              <Plus
                size={20}
                className={cn(
                  isBulkMode && "rotate-45 transition-transform font-bold",
                )}
              />
              <span className="whitespace-nowrap">
                {isBulkMode ? "Exit Bulk" : "Multi-Select (F2)"}
              </span>
            </button>

            <button
              onClick={() => setShowScannerConfig(!showScannerConfig)}
              className={cn(
                "p-3 border rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider relative",
                showScannerConfig
                  ? "bg-slate-900 border-slate-900 text-slate-100 shadow-lg"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
              title="Barcode Scanner Config & Simulator"
            >
              <Barcode size={20} />
              <span className="whitespace-nowrap">Barcode Options</span>
              {isScannerEnabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-white" />
              )}
            </button>
          </div>

          {isBulkMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllVisible}
                title="Select 1 of each visible item"
                className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-tight"
              >
                <CheckCircle2 size={18} />
                <span className="hidden sm:inline">Select Visible</span>
              </button>
              <button
                onClick={clearBulk}
                title="Clear selection"
                className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl hover:bg-red-100 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-tight"
              >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          )}
        </div>

        {/* Barcode Config / Simulation Panel */}
        <AnimatePresence>
          {showScannerConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl relative overflow-hidden flex-shrink-0"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full filter blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />

              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: Mode & Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Sliders size={18} className="text-blue-400" />
                    <h4 className="font-bold text-xs uppercase tracking-widest text-slate-300">
                      Scanner Setup
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-4 cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 p-3 rounded-xl transition-all">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-200 block">
                          Keyboard Interceptor
                        </span>
                        <span className="text-[10px] text-slate-400 block font-bold leading-none">
                          Auto scans to cart
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isScannerEnabled}
                        onChange={(e) => setIsScannerEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-800 border-slate-700 font-bold"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4 cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 p-3 rounded-xl transition-all">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-200 block">
                          Audio Beep Alerts
                        </span>
                        <span className="text-[10px] text-slate-400 block font-bold leading-none">
                          Real-time scan buzzer
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setIsScannerSoundEnabled(!isScannerSoundEnabled)
                        }
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          isScannerSoundEnabled
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400",
                        )}
                      >
                        {isScannerSoundEnabled ? (
                          <Volume2 size={18} />
                        ) : (
                          <VolumeX size={18} />
                        )}
                      </button>
                    </label>

                    <div className="bg-slate-800/40 p-3 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          Timeout Sensitivity
                        </span>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md font-mono font-bold leading-none">
                          {scannerSensitivity}ms
                        </span>
                      </div>
                      <select
                        value={scannerSensitivity}
                        onChange={(e) =>
                          setScannerSensitivity(parseInt(e.target.value))
                        }
                        className="w-full bg-slate-800 text-xs font-bold text-slate-200 p-2 rounded-lg border border-slate-700 focus:outline-none"
                      >
                        <option value={50}>⚡ Fast (50ms)</option>
                        <option value={75}>✓ Standard (75ms)</option>
                        <option value={120}>☕ Moderate (120ms)</option>
                        <option value={200}>⏳ Slower Gun (200ms)</option>
                      </select>
                      <p className="text-[9px] text-slate-500 leading-normal font-medium">
                        Keystroke speed divider. Lower thresholds guard input
                        cleaner, higher supports slower emulations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Status & Last Scan */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isScannerEnabled
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-slate-600",
                      )}
                    />
                    <h4 className="font-bold text-xs uppercase tracking-widest text-slate-300">
                      Active State
                    </h4>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between h-[180px]">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-500">
                        Listener Target
                      </p>
                      <p className="text-xs font-bold text-slate-200">
                        {isScannerEnabled
                          ? "Listening for Gun wedge inputs..."
                          : "Offline - Options Disabled"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-500">
                        Last Code Decoded
                      </p>
                      <div className="h-10 bg-slate-900 border border-slate-800 rounded-lg flex items-center px-3 font-mono text-xs text-blue-400 font-bold select-all overflow-x-auto no-scrollbar">
                        {lastScannedCode || "Ready for code sequence..."}
                      </div>
                    </div>

                    <div className="flex gap-2 text-[10px] text-slate-400 leading-none font-bold">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded">
                        F1 Search
                      </span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded">
                        F2 Multi
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Interactive Scanner Simulator */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Barcode size={18} className="text-emerald-400" />
                    <h4 className="font-bold text-xs uppercase tracking-widest text-slate-300">
                      Scanner Simulator
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 leading-normal font-medium">
                      Select a product code sequence below to trigger a
                      simulated instant scanner gun stream:
                    </p>

                    <div>
                      <select
                        aria-label="Scanner Simulator Product List"
                        className="w-full bg-slate-800 text-xs font-bold text-slate-200 p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
                        onChange={(e) => {
                          const code = e.target.value;
                          if (code) {
                            const p = products.find(
                              (prod) =>
                                prod.barcode === code || prod.sku === code,
                            );
                            if (p) {
                              if (isBulkMode) {
                                handleUpdateBulkQty(p.id, 1);
                              } else {
                                addToCart(p);
                              }
                              setLastScannedCode(code);
                              triggerScanNotification(
                                `Added ${p.name}`,
                                "success",
                              );
                            } else {
                              triggerScanNotification(
                                `Not Found: ${code}`,
                                "error",
                              );
                            }
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">-- Choose item to simulate --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.barcode || p.sku}>
                            {p.name} ({p.barcode || p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const failCode =
                          "BAD" + Math.floor(100000 + Math.random() * 900000);
                        setLastScannedCode(failCode);
                        triggerScanNotification(
                          `Not Found: ${failCode}`,
                          "error",
                        );
                      }}
                      className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-black rounded-xl transition-all uppercase tracking-wider"
                    >
                      Simulate Scanner Fail Buzzer
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:pr-2 custom-scrollbar pb-24 lg:pb-0">
          {filteredProducts.map((product) => {
            const hasBulk = bulkQty[product.id] || 0;
            return (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (isBulkMode) {
                    handleUpdateBulkQty(product.id, 1);
                    return;
                  }
                  addToCart(product);
                }}
                className={cn(
                  "bg-white p-4 rounded-2xl border transition-all group relative overflow-hidden",
                  hasBulk > 0
                    ? "border-blue-500 ring-2 ring-blue-50 shadow-lg"
                    : "border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md cursor-pointer",
                )}
              >
                <div className="aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-200 transition-colors">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Package size={40} />
                  )}
                </div>

                {hasBulk > 0 && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">
                    {hasBulk}
                  </div>
                )}

                <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                  {product.name}
                </h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.expiryDate && (
                    <span
                      className={cn(
                        "text-[8px] font-black px-1 rounded",
                        new Date(product.expiryDate) < new Date()
                          ? "bg-red-100 text-red-600"
                          : "bg-emerald-100 text-emerald-600",
                      )}
                    >
                      EXP: {product.expiryDate}
                    </span>
                  )}
                  {product.batchNumber && (
                    <span className="text-[8px] font-black px-1 bg-slate-100 text-slate-500 rounded uppercase">
                      B: {product.batchNumber}
                    </span>
                  )}
                  {product.size && (
                    <span className="text-[8px] font-black px-1 bg-blue-50 text-blue-600 rounded uppercase">
                      S: {product.size}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-col">
                    <span className="text-blue-600 font-bold">
                      {formatCurrency(getPrice(product))}
                    </span>
                    {billingType === "retail" &&
                      product.mrp &&
                      product.mrp > product.sellingPrice && (
                        <span className="text-[9px] text-slate-400 line-through">
                          MRP: {formatCurrency(product.mrp)}
                        </span>
                      )}
                    {billingType === "wholesale" &&
                      product.sellingPrice > (product.wholesalePrice || 0) && (
                        <span className="text-[9px] text-emerald-600 font-bold">
                          {t.success}: {formatCurrency(product.sellingPrice - (product.wholesalePrice || 0))}
                        </span>
                      )}
                  </div>

                  {isBulkMode ? (
                    <div
                      className="flex items-center gap-2 bg-slate-100 rounded-lg p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleUpdateBulkQty(product.id, -1)}
                        className="p-1 hover:bg-white rounded transition-colors text-slate-600"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {hasBulk}
                      </span>
                      <button
                        onClick={() => handleUpdateBulkQty(product.id, 1)}
                        className="p-1 hover:bg-white rounded transition-colors text-slate-600"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold",
                          product.stock > 0
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600",
                        )}
                      >
                        {product.stock} {product.unit}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        title="Quick Add"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400">
              {t.no_data}
            </div>
          )}
        </div>

        {isBulkMode && Object.keys(bulkQty).length > 0 && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                {t.checkout}
              </span>
              <span className="text-sm font-bold">
                {Object.values(bulkQty).reduce((a, b) => a + b, 0)} {t.unit}
              </span>
            </div>
            <div className="w-px h-8 bg-blue-500"></div>
            <button
              onClick={addBulkToCart}
              className="bg-white text-blue-600 px-6 py-2 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-blue-50 transition-colors"
            >
              {t.add_to_cart}
            </button>
            <button
              onClick={() => {
                setBulkQty({});
                setIsBulkMode(false);
              }}
              className="p-2 hover:bg-blue-700 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">
                {t.customers} (F4)
              </p>
              <p className="font-semibold text-sm">
                {selectedCustomer?.name || "Walk-in Customer"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCustomerSearch(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            {selectedCustomer ? t.edit.toUpperCase() : t.search.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Cart & Billing Area */}
      <div
        className={cn(
          "w-full lg:w-[450px] bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden",
          activeTab === "products" && "hidden lg:flex",
        )}
      >
        <div className="p-6 border-b border-slate-100 space-y-4">
          <h3 className="font-bold text-xl text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-blue-600" size={24} />
              {t.cart}
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setIsGstBill((prev) => !prev)}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                  isGstBill
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-400",
                )}
              >
                {isGstBill ? "GST" : "NON-GST"}
              </button>
              <div className="w-px h-4 bg-slate-200 my-auto mx-1"></div>
              <button
                onClick={() => setBillingType("retail")}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                  billingType === "retail"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                Retail
              </button>
              <button
                onClick={() => setBillingType("wholesale")}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                  billingType === "wholesale"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                Wholesale
              </button>
            </div>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <AnimatePresence>
            {cart.map((item) => {
              const isItemHighlighted = highlightedItemId === item.id;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 30, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 350,
                      damping: 25,
                    },
                  }}
                  exit={{
                    opacity: 0,
                    x: -30,
                    scale: 0.95,
                    transition: { duration: 0.2 },
                  }}
                  className={cn(
                    "flex items-center gap-4 group p-2 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                    isItemHighlighted
                      ? "bg-blue-50/80 border-blue-400 ring-4 ring-blue-500/10 shadow-lg shadow-blue-500/5 scale-[1.02]"
                      : "bg-slate-50/50 border-slate-100 hover:bg-slate-50/80 hover:border-slate-200 shadow-sm",
                  )}
                >
                  {isItemHighlighted && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  )}
                  <div className="w-16 h-16 bg-white rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={24} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {item.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-sm text-blue-600 font-extrabold">
                        {formatCurrency(getPrice(item))}
                      </span>
                      {item.size && (
                        <span className="text-[9px] px-1 bg-white border border-slate-200 rounded text-slate-500 font-black">
                          SZ: {item.size}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="p-1 hover:bg-white rounded-md transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="w-8 overflow-hidden">
                        <motion.span
                          key={item.qty}
                          initial={{ scale: 0.7, opacity: 0.5, y: -4 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 15,
                          }}
                          className={cn(
                            "text-center text-sm font-bold block",
                            isItemHighlighted
                              ? "text-blue-600 font-extrabold"
                              : "text-slate-800",
                          )}
                        >
                          {item.qty}
                        </motion.span>
                      </div>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="p-1 hover:bg-white rounded-md transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(getPrice(item) * item.qty)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                <ShoppingCart size={64} strokeWidth={1} />
                <p className="font-medium text-sm">Cart is empty</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Subtotal (Taxable)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {isGstBill && (
              <>
                {config?.country === 'India' && (config?.tax_type === 'GST' || !config?.tax_type) ? (
                  isSameState ? (
                    <>
                      <div className="flex justify-between text-slate-500 text-xs pl-2 border-l-2 border-blue-600">
                        <span>
                          CGST ({(config?.tax_percentage || 18) / 2}%)
                        </span>
                        <span>
                          {formatCurrency(gstCalculations.cgst_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-xs pl-2 border-l-2 border-blue-600 mt-1">
                        <span>
                          SGST ({(config?.tax_percentage || 18) / 2}%)
                        </span>
                        <span>
                          {formatCurrency(gstCalculations.sgst_amount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-500 text-xs pl-2 border-l-2 border-blue-600">
                      <span>IGST ({config?.tax_percentage || 18}%)</span>
                      <span>
                        {formatCurrency(gstCalculations.igst_amount)}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex justify-between text-slate-500 text-xs pl-2 border-l-2 border-blue-600">
                    <span>
                      {config?.tax_type || 'Tax'} ({config?.tax_percentage ?? 18}%)
                    </span>
                    <span>
                      {formatCurrency(totalTax)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-dashed border-slate-200 pt-1 mt-1">
                  <span>Total Tax</span>
                  <span>
                    {formatCurrency(totalTax)}
                  </span>
                </div>
              </>
            )}
            {!isGstBill && (
              <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                <span>Tax</span>
                <span>Exempt/Not Applied</span>
              </div>
            )}

            {/* Discount Section */}
            <div className="flex items-center justify-between gap-4 py-2 border-t border-dashed border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Discount
                </span>
                <div className="flex border rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setDiscountType("percent")}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold",
                      discountType === "percent"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400",
                    )}
                  >
                    %{" "}
                  </button>
                  <button
                    onClick={() => setDiscountType("fixed")}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold",
                      discountType === "fixed"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400",
                    )}
                  >
                    {config?.currency || 'INR'}{" "}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={discountInputRef}
                  type="number"
                  value={discountValue || ""}
                  onChange={(e) =>
                    setDiscountValue(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-bold text-sm outline-none focus:border-blue-500"
                />

                {discountAmount > 0 && (
                  <span className="text-red-500 font-bold text-sm">
                    -{formatCurrency(discountAmount)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between text-slate-900 font-bold text-xl pt-2 border-t border-slate-200">
              <span>Total Amount</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {["cash", "upi", "card", "credit"].map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl border transition-all",
                  paymentMode === mode
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-200 text-slate-500 shadow-sm",
                )}
              >
                {mode === "cash" && <Banknote size={16} />}
                {mode === "upi" && <QrCode size={16} />}
                {mode === "card" && <CreditCard size={16} />}
                {mode === "credit" && <HistoryIcon size={16} />}
                <span className="text-[10px] font-bold mt-1 uppercase">
                  {mode}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isProcessing ? "Processing..." : `PAID & PRINT (F12)`}
          </button>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <AnimatePresence>
        {showCustomerSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  Select Customer
                </h3>
                <button
                  onClick={() => setShowCustomerSearch(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="relative mb-4">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  <div
                    onClick={() => {
                      setSelectedCustomer(null);
                      setShowCustomerSearch(false);
                      setCustomerSearchQuery("");
                    }}
                    className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={20} />
                    </div>
                    <span className="font-bold text-slate-900">
                      Walk-in Customer
                    </span>
                  </div>
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustomerSearch(false);
                        setCustomerSearchQuery("");
                      }}
                      className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">
                          Balance
                        </p>
                        <p
                          className={cn(
                            "text-sm font-bold",
                            c.balance > 0 ? "text-red-500" : "text-emerald-500",
                          )}
                        >
                          ₹{(c.balance || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Finishing Modal */}
      <AnimatePresence>
        {showReceiptModal && lastInvoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-w-none print:h-auto print:static"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <HistoryIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">
                      Checkout Finished
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-bold text-slate-400">
                        INVOICE #{lastInvoice.invoiceNumber}
                      </p>
                      {isOffline && (
                        <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight bg-red-50 text-red-600 border border-red-100 rounded leading-none">
                          Offline Saved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleNewBill}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Printable Content */}
              <div
                id="receipt-content"
                className="flex-1 overflow-y-auto p-8 space-y-6 print:overflow-visible print:p-4"
              >
                {/* Header */}
                <div className="text-center space-y-2 pb-6 border-b border-dashed border-slate-200">
                  <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
                    {config?.businessName || "Business Name"}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {config?.address}
                  </p>
                  {isGstBill && (
                    <p className="text-[10px] font-bold text-slate-500">
                      PH: {config?.phone} | GST: {config?.gstIn}
                    </p>
                  )}
                  {!isGstBill && (
                    <p className="text-[10px] font-bold text-slate-500">
                      PH: {config?.phone}
                    </p>
                  )}
                  <div className="pt-2">
                    <span className="px-4 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] italic">
                      {isGstBill ? "TAX INVOICE" : "ESTIMATE / NON-GST BILL"}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  <div>
                    <p className="text-slate-400 italic mb-1">{t.customers}:</p>
                    <p className="text-slate-900">{lastInvoice.customerName}</p>
                    {selectedCustomer?.phone && (
                      <p className="text-slate-500 lowercase font-medium">
                        {selectedCustomer.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 italic mb-1">Date:</p>
                    <p className="text-slate-900">
                      {new Date().toLocaleDateString()}{" "}
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-[10px] border-y border-slate-100">
                  <thead>
                    <tr className="text-slate-400 font-black italic uppercase tracking-widest text-[9px]">
                      <th className="py-3 text-left">{t.masters}</th>
                      <th className="py-3 text-center">{t.quantity}</th>
                      <th className="py-3 text-right">{t.price}</th>
                      <th className="py-3 text-right">{t.total}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lastInvoice.items.map((item, idx) => (
                      <tr key={idx} className="font-bold text-slate-800">
                        <td className="py-3 text-left">
                          {item.name}
                          {lastInvoice.isGst && item.gstPercent && (
                            <p className="text-[8px] font-medium text-slate-400">
                              {item.cgst_amount > 0
                                ? `${cgstLabel} ${item.cgst_percentage}% (${currencySymbol}${item.cgst_amount}) | ${sgstLabel} ${item.sgst_percentage}% (${currencySymbol}${item.sgst_amount})`
                                : `${igstLabel} ${item.igst_percentage}% (${currencySymbol}${item.igst_amount})`}
                            </p>
                          )}
                        </td>
                        <td className="py-3 text-center text-slate-500">
                          {item.quantity}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {currencySymbol}{item.price.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          {currencySymbol}{item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="space-y-1 pt-4">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>{t.subtotal}</span>
                    <span>{currencySymbol}{lastInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  {lastInvoice.isGst && (
                    <div className="space-y-1">
                      {lastInvoice.cgst_amount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-blue-100 italic">
                          <span>
                            {cgstLabel} ({lastInvoice.cgst_percentage || 0}%)
                          </span>
                          <span>
                            {currencySymbol}
                            {(lastInvoice.cgst_amount || 0).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>
                      )}
                      {lastInvoice.sgst_amount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-blue-100 italic">
                          <span>
                            {sgstLabel} ({lastInvoice.sgst_percentage || 0}%)
                          </span>
                          <span>
                            {currencySymbol}
                            {(lastInvoice.sgst_amount || 0).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>
                      )}
                      {lastInvoice.igst_amount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-blue-100 italic">
                          <span>
                            {igstLabel} ({lastInvoice.igst_percentage || 0}%)
                          </span>
                          <span>
                            {currencySymbol}
                            {(lastInvoice.igst_amount || 0).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-[10px] font-black text-slate-800 uppercase tracking-widest pt-1">
                        <span>{taxLabel} Total</span>
                        <span>
                          {currencySymbol}
                          {lastInvoice.totalTax.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                  {lastInvoice.discount > 0 && (
                     <div className="flex justify-between text-[10px] font-bold text-red-500 uppercase tracking-widest">
                       <span>{t.discount} (-)</span>
                       <span>{currencySymbol}{lastInvoice.discount.toLocaleString()}</span>
                     </div>
                  )}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                    <span className="text-xs font-black text-slate-900 uppercase italic tracking-[0.2em]">
                      {t.grand_total}
                    </span>
                    <span className="text-2xl font-black text-blue-600 italic tracking-tighter">
                      {currencySymbol}{lastInvoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* E-Invoice details if present */}
                {lastInvoice.eInvoiceDetails && (
                  <div className="pt-6 border-t border-dashed border-slate-200 flex gap-4 items-start">
                    <div className="flex-1 space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        E-Invoice Info
                      </p>
                      <div className="text-[7px] font-bold text-slate-600 break-all">
                        <span className="text-slate-400">IRN:</span>{" "}
                        {lastInvoice.eInvoiceDetails.irn}
                      </div>
                      <div className="flex justify-between text-[7px] font-bold text-slate-600">
                        <span>
                          <span className="text-slate-400">Ack No:</span>{" "}
                          {lastInvoice.eInvoiceDetails.ackNo}
                        </span>
                        <span>
                          <span className="text-slate-400">Date:</span>{" "}
                          {lastInvoice.eInvoiceDetails.ackDate}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-white border border-slate-100 p-1">
                      <img
                        src={`https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(lastInvoice.eInvoiceDetails.signedQrCode)}&scale=2`}
                        alt="E-Invoice QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center pt-8 space-y-4 border-t border-dashed border-slate-200">
                  <div className="flex justify-center gap-4">
                    <div className="text-center px-4 py-2 border border-slate-100 rounded-xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase italic">
                        Payment
                      </p>
                      <p className="text-[10px] font-black text-slate-900 uppercase italic">
                        {lastInvoice.paymentMode}
                      </p>
                    </div>
                    <div className="text-center px-4 py-2 border border-slate-100 rounded-xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase italic">
                        Status
                      </p>
                      <p className="text-[10px] font-black text-emerald-600 uppercase italic">
                        {lastInvoice.status}
                      </p>
                    </div>
                    <div className="text-center px-4 py-2 border border-slate-100 rounded-xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase italic">
                        Staff
                      </p>
                      <p className="text-[10px] font-black text-blue-600 uppercase italic">
                        {lastInvoice.billedBy || "Admin"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    *** THANK YOU! VISIT AGAIN ***
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 print:hidden">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDownloadA4PDF}
                    className="px-4 py-3 bg-white border border-slate-200 hover:border-blue-300 text-blue-600 font-extrabold rounded-2xl hover:bg-blue-50/50 transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Download size={14} className="stroke-[2.5]" />
                    Download A4
                  </button>

                  <button
                    onClick={handlePOSPrint80mm}
                    className="px-4 py-3 bg-white border border-slate-200 hover:border-slate-400 text-slate-800 font-extrabold rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Printer size={14} className="stroke-[2.5]" />
                    POS 80mm Print
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const phone = selectedCustomer?.phone;
                      if (phone) {
                        MessagingService.sendInvoiceWhatsApp(
                          lastInvoice.customerName,
                          phone,
                          lastInvoice.invoiceNumber,
                          lastInvoice.totalAmount,
                        );
                      } else {
                        const number = prompt(
                          "Enter WhatsApp Phone Number (with country code):",
                        );
                        if (number)
                          MessagingService.sendInvoiceWhatsApp(
                            lastInvoice.customerName,
                            number,
                            lastInvoice.invoiceNumber,
                            lastInvoice.totalAmount,
                          );
                      }
                    }}
                    className="px-4 py-3 bg-emerald-500 text-white font-extrabold rounded-2xl hover:bg-emerald-600 transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-100/50"
                  >
                    <QrCode size={14} />
                    WhatsApp
                  </button>
                  <button
                    onClick={handleNewBill}
                    className="px-4 py-3 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-150/40"
                  >
                    <CheckCircle2 size={14} />
                    Next Session
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPI Checkout Simulator Modal */}
      <AnimatePresence>
        {showUpiModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col md:flex-row h-[600px] md:h-[655px] relative"
            >
              <button
                onClick={() => setShowUpiModal(false)}
                className="absolute top-4 left-4 z-[120] p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all"
                title="Cancel Checkout"
              >
                <X size={20} />
              </button>

              {/* Left Side: Receipt & Checkout Status (Cashier Facing) */}
              <div className="flex-1 bg-slate-50 p-8 border-r border-slate-100 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-6 mt-6">
                  <div className="space-y-1">
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                      UPI Terminal Gate
                    </span>
                    <h3 className="text-xl font-black text-slate-800">
                      Payment Authorization
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Please show the Customer Side QR screen to complete
                      checkout.
                    </p>
                  </div>

                  {/* Standardized Invoice Mini Quote Box */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Store Account
                      </p>
                      <h4 className="font-extrabold text-slate-800 text-sm leading-tight">
                        {config?.companyName || "Walk-in Customer"}
                      </h4>
                      <p className="text-xs font-medium text-slate-400 font-mono">
                        VPA: {config?.upiId || "shop@upi"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-black text-slate-600 uppercase">
                        <span>Checkout Total</span>
                        <span className="font-mono text-slate-900 font-black text-sm">
                          ₹{total.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                        <span>Items Count</span>
                        <span>
                          {cart.reduce((sum, item) => sum + item.qty, 0)} Items
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Alerts & Active States */}
                  <div className="space-y-2">
                    {upiSimulateStep === "scan" && (
                      <div className="p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl flex items-center gap-3 text-xs font-bold animate-pulse">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                        Awaiting customer QR scan or simulation...
                      </div>
                    )}
                    {upiSimulateStep === "gpay_app" && (
                      <div className="p-4 bg-orange-50 border border-orange-100 text-orange-700 rounded-2xl flex items-center gap-3 text-xs font-bold">
                        <span className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse" />
                        Reviewing transaction on customer device...
                      </div>
                    )}
                    {upiSimulateStep === "pin_entry" && (
                      <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl flex items-center gap-3 text-xs font-bold">
                        <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-pulse" />
                        Entering secure UPI PIN code...
                      </div>
                    )}
                    {upiSimulateStep === "authorizing" && (
                      <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl flex items-center gap-3 text-xs font-bold">
                        <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        UPI Network authorizing transfer. Keep active...
                      </div>
                    )}
                    {upiSimulateStep === "success" && (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center gap-3 text-xs font-bold font-black uppercase">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                        Payment approved! Finalizing invoice data...
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      isUpiAuthorized.current = true;
                      await handleCheckout();
                      isUpiAuthorized.current = false;
                      setShowUpiModal(false);
                    }}
                    className="w-full py-3.5 bg-slate-900 text-slate-100 text-[10px] font-black rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-95 duration-100"
                  >
                    Bypass / Confirm Manual UPI Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpiModal(false)}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all"
                  >
                    Go Back & Edit Cart
                  </button>
                </div>
              </div>

              {/* Right Side: Smartphone Terminal Mockup (Customer Side Payment Simulation) */}
              <div className="w-full md:w-[385px] bg-slate-900 p-6 flex flex-col items-center justify-center border-l border-slate-800 relative shadow-inner">
                {/* Visual smartphone chassis wrapper */}
                <div className="w-[310px] h-[540px] bg-[#1a1a1e] rounded-[44px] border-4 border-slate-700 p-3.5 shadow-2xl relative flex flex-col overflow-hidden">
                  {/* Smartphone top earpiece / camera notch overlay */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-black rounded-b-xl z-50 flex items-center justify-center">
                    <div className="w-12 h-1 bg-neutral-800 rounded-full" />
                    <div className="w-2 h-2 bg-neutral-900 rounded-full ml-1.5" />
                  </div>

                  {/* Screen Content */}
                  <div className="flex-1 bg-white rounded-[32px] overflow-hidden flex flex-col relative pt-5 text-slate-850">
                    {upiSimulateStep === "scan" && (
                      <div className="flex-1 flex flex-col justify-between p-5 text-center">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-black tracking-widest text-[#1a73e8] uppercase leading-none">
                            BHIM UPI ONLINE
                          </p>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">
                            Pay to Merchant
                          </h4>
                          <h5 className="text-[10px] font-bold text-slate-400 capitalize max-w-[200px] mx-auto truncate block">
                            {config?.companyName || "Retail Checkout"}
                          </h5>
                        </div>

                        {/* QR Code Canvas Mockup */}
                        <div className="relative my-1 py-1 flex justify-center">
                          <div className="p-2.5 bg-white rounded-[20px] shadow-sm border border-slate-100 inline-block relative">
                            {/* Bounding bracket lights */}
                            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-500 rounded-tl-lg" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-500 rounded-tr-lg" />
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-500 rounded-bl-lg" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-500 rounded-br-lg" />

                            {config?.upiQrUrl ? (
                              <img
                                src={config.upiQrUrl}
                                alt="Shop QR Image"
                                className="w-[145px] h-[145px] object-contain rounded-xl"
                              />
                            ) : (
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${config?.upiId || "shop@upi"}&pn=${encodeURIComponent(config?.companyName || "Shop")}&am=${total}&cu=INR`)}`}
                                alt="Dynamic Scan QR"
                                className="w-[145px] h-[145px] object-contain rounded-lg"
                              />
                            )}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            POS Bill Amount
                          </p>
                          <h3 className="text-2xl font-black text-slate-950 leading-none font-mono">
                            ₹{total.toLocaleString()}
                          </h3>
                        </div>

                        {/* Major UPI wallets mock drawer anchor */}
                        <div className="space-y-1.5 pt-2">
                          <button
                            type="button"
                            onClick={() => setUpiSimulateStep("gpay_app")}
                            className="w-full py-2.5 bg-[#1a73e8] hover:bg-blue-600 hover:shadow-lg transition-all active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
                          >
                            <Smartphone size={14} /> Open GPay Simulator
                          </button>
                          <p className="text-[8px] text-slate-400 leading-tight font-bold">
                            Scan with GPay or click above to simulate phone
                            checkout
                          </p>
                        </div>
                      </div>
                    )}

                    {upiSimulateStep === "gpay_app" && (
                      <div className="flex-1 flex flex-col justify-between bg-slate-950 text-white p-5">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-[#34a853] rounded-full flex items-center justify-center text-[10px] font-black">
                              G
                            </div>
                            <span className="text-xs font-black tracking-tight text-white leading-none">
                              Google Pay
                            </span>
                          </div>
                          <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-bold whitespace-nowrap">
                            UPI ID verified
                          </span>
                        </div>

                        <div className="text-center py-3 space-y-2">
                          <div className="w-12 h-12 bg-blue-600 rounded-full mx-auto flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20">
                            {(config?.companyName || "S")[0].toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                              Paying Merchant
                            </p>
                            <h4 className="text-sm font-black text-white truncate max-w-[180px] mx-auto leading-normal">
                              {config?.companyName || "Retail Shop"}
                            </h4>
                            <p className="text-[9px] text-slate-500 font-mono tracking-tight text-center leading-none">
                              {config?.upiId || "shop@upi"}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-900 p-4 rounded-2xl text-center space-y-0.5 border border-white/5 shadow-inner">
                          <span className="text-[9px] text-slate-400 font-bold uppercase leading-none">
                            To Be Paid
                          </span>
                          <h3 className="text-2xl font-black text-white font-mono">
                            ₹{total.toFixed(2)}
                          </h3>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2 bg-white/5 py-1.5 px-3 rounded-xl border border-white/5 text-[9px] text-slate-300 font-semibold uppercase leading-none">
                            <Lock
                              size={12}
                              className="text-emerald-400 animate-pulse flex-shrink-0"
                            />
                            <span>Secured by UPI Bank Network</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setUpiSimulatePin("");
                              setUpiSimulateStep("pin_entry");
                            }}
                            className="w-full py-3 bg-[#1a73e8] hover:bg-blue-600 active:scale-95 transition-all text-xs font-black uppercase tracking-wider rounded-xl text-white shadow-lg shadow-blue-500/10"
                          >
                            Proceed to Pay
                          </button>
                        </div>
                      </div>
                    )}

                    {upiSimulateStep === "pin_entry" && (
                      <div className="flex-1 flex flex-col justify-between bg-slate-950 text-white p-5">
                        <div className="text-center space-y-2.5 pt-2">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            ENTER 4-DIGIT SECURE PIN
                          </h4>
                          <div className="h-6 flex justify-center items-center gap-4">
                            {[0, 1, 2, 3].map((idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "w-3 h-3 rounded-full border-2 transition-all",
                                  upiSimulatePin.length > idx
                                    ? "bg-[#1a73e8] border-[#1a73e8] scale-125 shadow-md shadow-blue-500"
                                    : "border-slate-700 bg-transparent",
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-[8px] text-slate-500 font-bold leading-normal max-w-[190px] mx-auto">
                            Simulated secure ATM payment interface. Click any
                            digits on keypad to proceed.
                          </p>
                        </div>

                        {/* Numeric keypad layout */}
                        <div className="grid grid-cols-3 gap-2 p-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                if (upiSimulatePin.length < 4) {
                                  const pin = upiSimulatePin + val;
                                  setUpiSimulatePin(pin);
                                  if (pin.length === 4) {
                                    setTimeout(
                                      () => setUpiSimulateStep("authorizing"),
                                      300,
                                    );
                                  }
                                }
                              }}
                              className="py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/20 text-xs font-black rounded-xl transition-all"
                            >
                              {val}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setUpiSimulatePin("")}
                            className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase rounded-xl transition-all"
                          >
                            CLR
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (upiSimulatePin.length < 4) {
                                const pin = upiSimulatePin + "0";
                                setUpiSimulatePin(pin);
                                if (pin.length === 4) {
                                  setTimeout(
                                    () => setUpiSimulateStep("authorizing"),
                                    300,
                                  );
                                }
                              }
                            }}
                            className="py-2.5 bg-white/5 hover:bg-white/10 text-xs font-black rounded-xl"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (upiSimulatePin.length >= 4) {
                                setUpiSimulateStep("authorizing");
                              }
                            }}
                            className={cn(
                              "py-2.5 text-[10px] font-black uppercase rounded-xl transition-all",
                              upiSimulatePin.length >= 4
                                ? "bg-emerald-500 text-white shadow-lg"
                                : "bg-white/5 text-slate-550",
                            )}
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}

                    {upiSimulateStep === "authorizing" && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-5 bg-slate-900 text-white space-y-6">
                        <div className="relative">
                          {/* Pulsing halo */}
                          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
                          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-black uppercase tracking-widest text-[#1a73e8]">
                            Authorizing
                          </h4>
                          <p className="text-[10px] text-slate-300 font-bold leading-normal max-w-[200px] mx-auto">
                            Processing secure UPI token stream... Please do not
                            close or exit window.
                          </p>
                        </div>
                      </div>
                    )}

                    {upiSimulateStep === "success" && (
                      <div className="flex-1 flex flex-col items-center justify-between text-center p-6 bg-slate-950 text-white">
                        <div className="pt-6">
                          <p className="text-[9px] tracking-widest uppercase font-black text-emerald-400">
                            TRANSACTION APPROVED
                          </p>
                        </div>

                        {/* Interactive SUCCESS animation box */}
                        <div className="space-y-4">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              damping: 10,
                              stiffness: 100,
                            }}
                            className="w-16 h-16 bg-emerald-500 rounded-full mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/30"
                          >
                            <svg
                              className="w-8 h-8 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="4"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </motion.div>
                          <div className="space-y-0.5">
                            <h3 className="text-xl font-black text-white font-mono">
                              ₹{total.toFixed(2)}
                            </h3>
                            <p className="text-[10px] text-slate-300 font-extrabold leading-none">
                              Paid Successfully!
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 pb-4">
                          <p className="text-[9px] text-slate-500 font-mono">
                            Ref: UPI99818A8B2C
                          </p>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                            Callback code success forwarded
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Floating Scan Alerts */}
      <AnimatePresence>
        {scanNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed top-4 right-4 z-[150] px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-3 border tracking-tight uppercase shadow-slate-900/10",
              scanNotification.type === "success"
                ? "bg-slate-900 border-emerald-500 text-emerald-400"
                : "bg-slate-900 border-rose-500 text-rose-400",
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                scanNotification.type === "success"
                  ? "bg-emerald-400 animate-ping"
                  : "bg-rose-400 animate-pulse",
              )}
            />
            {scanNotification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
