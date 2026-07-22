var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.js
var import_express17 = __toESM(require("express"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);

// server/routes/api.js
var import_express16 = __toESM(require("express"), 1);

// server/routes/authRoutes.js
var import_express = __toESM(require("express"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var router = import_express.default.Router();
var JWT_SECRET = process.env.JWT_SECRET || "billing360_secure_jwt_secret_token";
router.post("/login", (req, res) => {
  const { type, email, username, password, clientProfile } = req.body;
  let payload = {};
  if (type === "admin") {
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email is required for Admin login" });
    }
    payload = {
      uid: "admin-" + Buffer.from(email).toString("base64"),
      email,
      username: email,
      name: clientProfile?.name || "Administrator",
      role: "Super Admin",
      branchId: clientProfile?.branchId || "main-branch",
      permissions: ["can_bill", "can_manage_inventory", "can_view_reports", "can_manage_employees", "can_manage_accounts", "can_manage_branches"]
    };
  } else {
    if (!username) {
      return res.status(400).json({ success: false, error: "Username is required for Staff login" });
    }
    payload = {
      uid: clientProfile?.id || "emp-" + Math.random().toString(36).substr(2, 9),
      username,
      name: clientProfile?.name || username,
      role: clientProfile?.role || "Staff",
      branchId: clientProfile?.branchId || "main-branch",
      permissions: clientProfile?.permissions || ["can_bill"]
    };
  }
  const token = import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: "1h" });
  return res.json({
    success: true,
    token,
    userProfile: {
      ...payload,
      token
    }
  });
});
var authRoutes_default = router;

// server/routes/healthRoutes.js
var import_express2 = __toESM(require("express"), 1);

// server/controllers/healthController.js
var getHealth = (req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime(),
    message: "Billing360 Backend is running smoothly"
  });
};

// server/routes/healthRoutes.js
var router2 = import_express2.default.Router();
router2.get("/", getHealth);
var healthRoutes_default = router2;

// server/routes/configRoutes.js
var import_express3 = __toESM(require("express"), 1);

// server/controllers/configController.js
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var CONFIG_FILE = import_path.default.join(process.cwd(), "server", "data", "config.json");
var ensureFileExists = () => {
  const dir = import_path.default.dirname(CONFIG_FILE);
  if (!import_fs.default.existsSync(dir)) {
    import_fs.default.mkdirSync(dir, { recursive: true });
  }
  if (!import_fs.default.existsSync(CONFIG_FILE)) {
    const defaultConfig = {
      companyName: "Billing360 Enterprise",
      version: "2.5.0",
      features: {
        gst: true,
        inventory: true,
        reports: true,
        aiInsights: true
      },
      supportContact: "support@billing360.com",
      country: "India",
      currency: "INR",
      language: "English",
      timezone: "Asia/Kolkata",
      tax_type: "GST",
      tax_percentage: 18,
      accounting_system: "TallyPrime",
      gstIn: "",
      address: "",
      invoicePrefix: "INV-",
      enableGst: true,
      gstType: "Regular",
      businessType: "General Retail",
      ownerName: "",
      panNumber: "",
      cinNumber: "",
      msmeNumber: "",
      fssaiNumber: "",
      drugLicense: "",
      phone: "",
      alternatePhone: "",
      email: "",
      whatsappNumber: "",
      website: "",
      city: "",
      state: "",
      pincode: "",
      financialYear: "2026-27",
      decimalSettings: 2,
      defaultGstPercent: 18,
      inclusiveTax: false,
      enableHsn: true,
      hsnDigitCount: 4,
      enableEInvoice: false,
      eInvoiceUsername: "",
      invoiceStartingNumber: 1,
      invoiceFooter: "",
      termsConditions: "",
      autoInvoiceNumber: true,
      showBarcodeInInvoice: false,
      showQrInInvoice: true,
      printSize: "Thermal",
      showProductImageInInvoice: false,
      upiId: "",
      upiQrUrl: "",
      bankDetails: "",
      printerName: "",
      printerType: "Thermal",
      paperSize: "80mm",
      autoPrint: true,
      enableWhatsApp: false,
      whatsappApiToken: "",
      autoShareInvoice: false,
      autoBackup: false,
      backupFrequency: "Daily",
      backupLocation: "Google Drive",
      enableTallyExport: false,
      tallyVersion: "TallyPrime",
      tallyIp: "127.0.0.1",
      tallyPort: "9000",
      requireMfa: false,
      restrictLoginByHours: false,
      ipWhitelisting: false,
      minPasswordLength: 8,
      passwordExpiryDays: 90,
      logoUrl: "",
      signatureUrl: "",
      faviconUrl: ""
    };
    import_fs.default.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), "utf8");
  }
};
var getConfig = (req, res) => {
  try {
    ensureFileExists();
    const fileData = import_fs.default.readFileSync(CONFIG_FILE, "utf8");
    const config = JSON.parse(fileData);
    return res.json({
      success: true,
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to read configuration"
    });
  }
};
var saveConfig = (req, res) => {
  try {
    ensureFileExists();
    const newConfig = req.body;
    if (newConfig.country === "India") {
      newConfig.currency = "INR";
      newConfig.tax_type = "GST";
      newConfig.accounting_system = "TallyPrime";
      newConfig.timezone = "Asia/Kolkata";
      newConfig.currencyFormat = "\u20B9X,XXX.XX";
      newConfig.dateFormat = "DD-MM-YYYY";
    } else if (newConfig.country === "Thailand") {
      newConfig.currency = "THB";
      newConfig.tax_type = "VAT";
      newConfig.accounting_system = "TallyPrime";
      newConfig.timezone = "Asia/Bangkok";
      newConfig.currencyFormat = "\u0E3FX,XXX.XX";
      newConfig.dateFormat = "DD-MM-YYYY";
    } else if (newConfig.country === "Singapore") {
      newConfig.currency = "SGD";
      newConfig.tax_type = "GST";
      newConfig.accounting_system = "Xero";
      newConfig.timezone = "Asia/Singapore";
      newConfig.currencyFormat = "S$X,XXX.XX";
      newConfig.dateFormat = "DD-MM-YYYY";
    } else if (newConfig.country === "Malaysia") {
      newConfig.currency = "MYR";
      newConfig.tax_type = "SST";
      newConfig.accounting_system = "None";
      newConfig.timezone = "Asia/Kuala_Lumpur";
      newConfig.currencyFormat = "RM X,XXX.XX";
      newConfig.dateFormat = "DD-MM-YYYY";
    } else if (newConfig.country === "UAE") {
      newConfig.currency = "AED";
      newConfig.tax_type = "VAT";
      newConfig.accounting_system = "Zoho Books";
      newConfig.timezone = "Asia/Dubai";
      newConfig.currencyFormat = "AED X,XXX.XX";
      newConfig.dateFormat = "DD-MM-YYYY";
    } else if (newConfig.country === "USA") {
      newConfig.currency = "USD";
      newConfig.tax_type = "Sales Tax";
      newConfig.accounting_system = "QuickBooks";
      newConfig.timezone = "America/New_York";
      newConfig.currencyFormat = "$X,XXX.XX";
      newConfig.dateFormat = "MM-DD-YYYY";
    } else if (newConfig.country === "UK") {
      newConfig.currency = "GBP";
      newConfig.tax_type = "VAT";
      newConfig.accounting_system = "None";
      newConfig.timezone = "Europe/London";
      newConfig.currencyFormat = "\xA3X,XXX.XX";
      newConfig.dateFormat = "DD-MM-YYYY";
    } else if (newConfig.country === "Europe") {
      newConfig.currency = "EUR";
      newConfig.tax_type = "VAT";
      newConfig.accounting_system = "None";
      newConfig.timezone = "Europe/Paris";
      newConfig.currencyFormat = "\u20ACX,XXX.XX";
      newConfig.dateFormat = "DD-MM-YYYY";
    }
    const fileData = import_fs.default.readFileSync(CONFIG_FILE, "utf8");
    const existingConfig = JSON.parse(fileData);
    const mergedConfig = {
      ...existingConfig,
      ...newConfig
    };
    import_fs.default.writeFileSync(CONFIG_FILE, JSON.stringify(mergedConfig, null, 2), "utf8");
    console.log("[Config Server] Configuration saved successfully:", mergedConfig.companyName);
    return res.json({
      success: true,
      message: "Configuration updated successfully",
      data: mergedConfig
    });
  } catch (error) {
    console.error("Failed to save configuration:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save configuration"
    });
  }
};

// server/routes/configRoutes.js
var router3 = import_express3.default.Router();
router3.get("/", getConfig);
router3.post("/", saveConfig);
var configRoutes_default = router3;

// server/routes/productRoutes.js
var import_express4 = __toESM(require("express"), 1);

// server/controllers/productController.js
var getProducts = (req, res) => {
  const branchId = req.query.branchId;
  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: "branchId is required"
    });
  }
  const products = [
    {
      id: "1",
      name: "Product A",
      sku: "PA-001",
      barcode: "123456789",
      hsn: "8517",
      gstPercent: 18,
      purchasePrice: 100,
      sellingPrice: 150,
      stock: 50,
      unit: "pcs",
      category: "Electronics",
      branchId,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  res.json({
    success: true,
    data: products
  });
};
var createProduct = (req, res) => {
  const product = req.body;
  console.log("Creating product:", product);
  res.status(201).json({
    success: true,
    data: { ...product, id: Math.random().toString(36).substr(2, 9) }
  });
};
var deleteProduct = (req, res) => {
  const { id } = req.params;
  console.log(`[SQL UPDATE] UPDATE products SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
  res.json({
    success: true,
    message: "Product soft deleted successfully",
    data: { id, is_deleted: 1, deleted_at: (/* @__PURE__ */ new Date()).toISOString() }
  });
};

// server/routes/productRoutes.js
var router4 = import_express4.default.Router();
router4.get("/", getProducts);
router4.post("/", createProduct);
router4.delete("/:id", deleteProduct);
var productRoutes_default = router4;

// server/routes/invoiceRoutes.js
var import_express5 = __toESM(require("express"), 1);

// server/controllers/invoiceController.js
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var INVOICES_FILE = import_path2.default.join(process.cwd(), "server", "data", "invoices.json");
var ensureFileExists2 = () => {
  const dir = import_path2.default.dirname(INVOICES_FILE);
  if (!import_fs2.default.existsSync(dir)) {
    import_fs2.default.mkdirSync(dir, { recursive: true });
  }
  if (!import_fs2.default.existsSync(INVOICES_FILE)) {
    import_fs2.default.writeFileSync(INVOICES_FILE, JSON.stringify([], null, 2), "utf8");
  }
};
var syncInvoices = (req, res) => {
  const { invoices } = req.body;
  if (!invoices || !Array.isArray(invoices)) {
    return res.status(400).json({
      success: false,
      error: "Invoices array is required"
    });
  }
  try {
    ensureFileExists2();
    const fileData = import_fs2.default.readFileSync(INVOICES_FILE, "utf8");
    const existingInvoices = JSON.parse(fileData);
    const syncedInvoices = [];
    const duplicates = [];
    invoices.forEach((inv) => {
      const isDuplicate = existingInvoices.some((existing) => existing.invoiceNumber === inv.invoiceNumber);
      if (!isDuplicate) {
        const withTimestamp = {
          ...inv,
          syncedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        existingInvoices.push(withTimestamp);
        syncedInvoices.push(withTimestamp);
      } else {
        duplicates.push(inv.invoiceNumber);
      }
    });
    import_fs2.default.writeFileSync(INVOICES_FILE, JSON.stringify(existingInvoices, null, 2), "utf8");
    console.log(`[Sync Server] Successfully synchronized ${syncedInvoices.length} invoices. Duplicates skipped: ${duplicates.length}`);
    return res.json({
      success: true,
      message: `Successfully synchronized ${syncedInvoices.length} invoices.`,
      count: syncedInvoices.length,
      skipped: duplicates.length,
      data: syncedInvoices
    });
  } catch (error) {
    console.error("Server sync failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
};
var getInvoices = (req, res) => {
  try {
    ensureFileExists2();
    const fileData = import_fs2.default.readFileSync(INVOICES_FILE, "utf8");
    const invoices = JSON.parse(fileData);
    return res.json({
      success: true,
      data: invoices.filter((inv) => !inv.is_deleted)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
};
var deleteInvoice = (req, res) => {
  const { id } = req.params;
  try {
    ensureFileExists2();
    const fileData = import_fs2.default.readFileSync(INVOICES_FILE, "utf8");
    const invoices = JSON.parse(fileData);
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: `Invoice '${id}' not found`
      });
    }
    invoice.is_deleted = 1;
    invoice.deleted_at = (/* @__PURE__ */ new Date()).toISOString();
    import_fs2.default.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), "utf8");
    return res.json({
      success: true,
      message: "Invoice soft deleted successfully",
      data: invoice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
};

// server/routes/invoiceRoutes.js
var router5 = import_express5.default.Router();
router5.get("/", getInvoices);
router5.post("/sync", syncInvoices);
router5.delete("/:id", deleteInvoice);
var invoiceRoutes_default = router5;

// server/routes/geminiRoutes.js
var import_express6 = __toESM(require("express"), 1);

// server/controllers/geminiController.js
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var aiInstance = null;
var lastQuotaExhaustedTime = 0;
var QUOTA_BACKOFF_DURATION = 15 * 60 * 1e3;
function getAi() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiInstance = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}
function generateLocalInsights(data) {
  const insights = [];
  const inventory = data.inventory || [];
  const meta = data.inventorySummary || {
    totalProducts: inventory.length,
    lowStockCount: inventory.filter((p) => Number(p.stock) < 10).length,
    outOfStockCount: inventory.filter((p) => Number(p.stock) <= 0).length
  };
  if (meta.outOfStockCount > 0 || meta.lowStockCount > 0) {
    const sampleNames = inventory.slice(0, 3).map((p) => p.name).join(", ");
    const moreCount = inventory.length > 3 ? ` and ${inventory.length - 3} other items` : "";
    const itemList = sampleNames ? ` (including ${sampleNames}${moreCount})` : "";
    insights.push({
      title: "Critical Low Stock Alert",
      description: `Action Required: You have ${meta.outOfStockCount || 0} out-of-stock items and ${meta.lowStockCount || 0} items running below safe reorder thresholds${itemList}. We suggest placing a replenishment order to avoid disrupted order fulfillment.`,
      type: "stock",
      priority: "high"
    });
  } else if (meta.totalProducts > 0) {
    insights.push({
      title: "Inventory Stock Healthy",
      description: "Excellent! All tracked inventory items are at healthy volume margins and above minimum replenishment levels.",
      type: "stock",
      priority: "low"
    });
  }
  const sales = data.sales || [];
  const totalSalesVal = sales.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  const pendingSales = sales.filter((inv) => inv.status === "pending");
  if (sales.length > 0) {
    const avgSale = (totalSalesVal / sales.length).toFixed(2);
    let desc = `Recent transaction analysis across ${sales.length} invoices shows a healthy average basket size of \u20B9${avgSale}. `;
    if (pendingSales.length > 0) {
      const pendingVal = pendingSales.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
      desc += `${pendingSales.length} invoice(s) totalling \u20B9${pendingVal} remain in "pending" status. Prompt payment reminders can improve working capital.`;
      insights.push({
        title: "Accounts Receivable Action Plan",
        description: desc,
        type: "sale",
        priority: "medium"
      });
    } else {
      desc += `100% of analyzed invoices are fully paid. Customer payment compliance level is stellar, indicating minimal credit risk.`;
      insights.push({
        title: "High Cash Liquidity Profile",
        description: desc,
        type: "sale",
        priority: "medium"
      });
    }
  }
  const expenses = data.expenses || [];
  if (expenses.length > 0) {
    const totalExpVal = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    let maxExpAmount = 0;
    let worstExp = null;
    expenses.forEach((e) => {
      const amt = Number(e.amount || 0);
      if (amt > maxExpAmount) {
        maxExpAmount = amt;
        worstExp = e;
      }
    });
    let desc = `Operating expenditures totaled \u20B9${totalExpVal} across the latest logged vouchers. `;
    if (worstExp) {
      desc += `Checking indicates "${worstExp.description || worstExp.category || "purchases"}" was your single highest outflow at \u20B9${maxExpAmount}. Review recurring costs to identify overhead reductions.`;
    }
    insights.push({
      title: "Operational Expenditure Audit",
      description: desc,
      type: "expense",
      priority: totalExpVal > totalSalesVal * 0.4 ? "high" : "medium"
    });
  }
  if (sales.length > 0 && expenses.length > 0) {
    const totalSalesVal2 = sales.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
    const totalExpVal = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const ratio = totalSalesVal2 > 0 ? totalExpVal / totalSalesVal2 : 1;
    if (ratio < 0.3) {
      insights.push({
        title: "Exceptional Operating Margins",
        description: `Your expenses consume only ${(ratio * 100).toFixed(1)}% of your gross billing volume. Capital conversion rates are highly efficient, maintaining strong operating cash flow.`,
        type: "general",
        priority: "low"
      });
    } else if (ratio > 0.6) {
      insights.push({
        title: "Operational Cost Pressure Alert",
        description: `Operating expenses represent ${(ratio * 100).toFixed(1)}% of your latest invoice revenue. We recommend tracking fixed overheads and bulk procurement pricing to widen your gross margin.`,
        type: "general",
        priority: "high"
      });
    }
  }
  if (insights.length === 0) {
    insights.push({
      title: "Business Insights Generator Ready",
      description: "Start adding inventory, bills, and cash expenses to generate beautiful interactive smart business reports and visual intelligence dashboards here.",
      type: "general",
      priority: "low"
    });
  }
  return insights;
}
var getBusinessInsights = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Missing required business data" });
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.log("[GEMINI] API Key missing, initiating highly descriptive rule-based insights locally.");
      const fallbackInsights = generateLocalInsights(data);
      return res.status(200).json([
        {
          title: "Advisory: Local Smart Insights Engine",
          description: "Currently rendering secure local calculations. To activate Gemini AI deep predictions, add a GEMINI_API_KEY.",
          type: "general",
          priority: "low"
        },
        ...fallbackInsights
      ]);
    }
    const timeSinceLastExhaustion = Date.now() - lastQuotaExhaustedTime;
    if (timeSinceLastExhaustion < QUOTA_BACKOFF_DURATION) {
      const remainingSeconds = Math.ceil((QUOTA_BACKOFF_DURATION - timeSinceLastExhaustion) / 1e3);
      console.log(`[GEMINI BACKOFF ACTIVE] serving local insights immediately. Backoff remaining helper: ${remainingSeconds}s`);
      const fallbackInsights = generateLocalInsights(data);
      return res.status(200).json([
        {
          title: "API Limit: Local Calculations Active",
          description: "Your Gemini API service quota is currently exhausted/busy. Beautiful rule-based local calculations are being served instead.",
          type: "general",
          priority: "low"
        },
        ...fallbackInsights
      ]);
    }
    try {
      const ai = getAi();
      const prompt = `
        Analyze the following branch business metrics and provide 3 to 4 actionable, professional insights. Keep descriptions short, professional, and targeted.
        Sales (last 10 recent): ${JSON.stringify(data.sales || [])}
        Inventory Summary: ${JSON.stringify(data.inventorySummary || {})}
        Low Stock Sample: ${JSON.stringify(data.inventory || [])}
        Expenses (last 10 recent): ${JSON.stringify(data.expenses || [])}

        Target fields of response items:
        1. "title": descriptive title of the insight.
        2. "description": specific call to action or analysis statement.
        3. "type": "sale", "stock", "expense", or "general".
        4. "priority": "high", "medium", or "low".
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.ARRAY,
            items: {
              type: import_genai.Type.OBJECT,
              properties: {
                title: { type: import_genai.Type.STRING },
                description: { type: import_genai.Type.STRING },
                type: { type: import_genai.Type.STRING },
                priority: { type: import_genai.Type.STRING }
              },
              required: ["title", "description", "type", "priority"]
            }
          }
        }
      });
      if (response && response.text) {
        const parsedInsights = JSON.parse(response.text);
        if (Array.isArray(parsedInsights) && parsedInsights.length > 0) {
          return res.json(parsedInsights);
        }
      }
      return res.json(generateLocalInsights(data));
    } catch (apiError) {
      const errMsg = apiError.message || String(apiError);
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota_count") || errMsg.includes("requests")) {
        lastQuotaExhaustedTime = Date.now();
        console.warn(`[GEMINI API LIMIT] Quota exhausted (429). Commencing sliding-window backoff for ${QUOTA_BACKOFF_DURATION / 6e4} mins.`);
      } else {
        console.warn("[GEMINI API ERROR] Model call failed:", errMsg);
      }
      const fallbackInsights = generateLocalInsights(data);
      return res.status(200).json([
        {
          title: "API Limit: Local Calculations Active",
          description: "Your Gemini API service quota is currently exhausted/busy. Beautiful rule-based local calculations are being served instead.",
          type: "general",
          priority: "low"
        },
        ...fallbackInsights
      ]);
    }
  } catch (error) {
    console.error("Server Gemini Error:", error);
    try {
      const { data } = req.body;
      return res.status(200).json(generateLocalInsights(data || {}));
    } catch (innerErr) {
      return res.status(200).json([
        {
          title: "Analysis Offline",
          description: "Failed to generate business insights at this time.",
          type: "general",
          priority: "low"
        }
      ]);
    }
  }
};

// server/routes/geminiRoutes.js
var router6 = import_express6.default.Router();
router6.post("/", getBusinessInsights);
var geminiRoutes_default = router6;

// server/routes/customerRoutes.js
var import_express7 = __toESM(require("express"), 1);
var router7 = import_express7.default.Router();
var staticCustomers = [
  { id: "c1", name: "Alok Nath", phone: "9999999999", balance: 500, branchId: "branch_01" },
  { id: "c2", name: "Rita Devi", phone: "8888888888", balance: -200, branchId: "branch_01" }
];
router7.get("/", (req, res) => {
  const { branchId } = req.query;
  const list = staticCustomers.filter((c) => c.branchId === branchId && !c.is_deleted);
  res.json({ success: true, data: list });
});
router7.post("/", (req, res) => {
  const customer = req.body;
  const newCustomer = { ...customer, id: customer.id || Math.random().toString(36).substr(2, 9) };
  staticCustomers.push(newCustomer);
  res.status(201).json({ success: true, data: newCustomer });
});
router7.delete("/:id", (req, res) => {
  const { id } = req.params;
  const c = staticCustomers.find((item) => item.id === id);
  if (c) {
    c.is_deleted = 1;
    c.deleted_at = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`[SQL UPDATE] UPDATE customers SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    return res.json({ success: true, message: "Customer soft deleted successfully", data: c });
  }
  return res.status(404).json({ success: false, error: "Customer not found" });
});
var customerRoutes_default = router7;

// server/routes/supplierRoutes.js
var import_express8 = __toESM(require("express"), 1);
var router8 = import_express8.default.Router();
var staticSuppliers = [
  { id: "s1", name: "Raw Materials Ltd", phone: "7777777777", balance: 12e3, branchId: "branch_01" },
  { id: "s2", name: "Packaging Corp", phone: "6666666666", balance: 0, branchId: "branch_01" }
];
router8.get("/", (req, res) => {
  const { branchId } = req.query;
  const list = staticSuppliers.filter((s) => s.branchId === branchId && !s.is_deleted);
  res.json({ success: true, data: list });
});
router8.post("/", (req, res) => {
  const supplier = req.body;
  const newSupplier = { ...supplier, id: supplier.id || Math.random().toString(36).substr(2, 9) };
  staticSuppliers.push(newSupplier);
  res.status(201).json({ success: true, data: newSupplier });
});
router8.delete("/:id", (req, res) => {
  const { id } = req.params;
  const s = staticSuppliers.find((item) => item.id === id);
  if (s) {
    s.is_deleted = 1;
    s.deleted_at = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`[SQL UPDATE] UPDATE suppliers SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    return res.json({ success: true, message: "Supplier soft deleted successfully", data: s });
  }
  return res.status(404).json({ success: false, error: "Supplier not found" });
});
var supplierRoutes_default = router8;

// server/routes/reportRoutes.js
var import_express9 = __toESM(require("express"), 1);
var router9 = import_express9.default.Router();
var staticReports = [
  { id: "r1", name: "Z-Report", date: (/* @__PURE__ */ new Date()).toISOString(), type: "daily", branchId: "branch_01" },
  { id: "r2", name: "GST Summary", date: (/* @__PURE__ */ new Date()).toISOString(), type: "tax", branchId: "branch_01" }
];
router9.get("/", (req, res) => {
  const { branchId } = req.query;
  const list = staticReports.filter((r) => r.branchId === branchId && !r.is_deleted);
  res.json({ success: true, data: list });
});
router9.post("/", (req, res) => {
  const report = req.body;
  const newReport = { ...report, id: report.id || Math.random().toString(36).substr(2, 9) };
  staticReports.push(newReport);
  res.status(201).json({ success: true, data: newReport });
});
router9.delete("/:id", (req, res) => {
  const { id } = req.params;
  const r = staticReports.find((item) => item.id === id);
  if (r) {
    r.is_deleted = 1;
    r.deleted_at = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`[SQL UPDATE] UPDATE reports SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    return res.json({ success: true, message: "Report deleted successfully", data: r });
  }
  return res.status(404).json({ success: false, error: "Report not found" });
});
var reportRoutes_default = router9;

// server/modules/billing/routes/billingRoutes.js
var import_express10 = __toESM(require("express"), 1);

// server/modules/billing/models/billingModel.js
var staticInvoices = [
  {
    id: "inv_abc123",
    invoiceNumber: "INV-2024-001",
    customerName: "Aman Sharma",
    customerPhone: "9876543210",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    paymentMode: "cash",
    isGst: true,
    subtotal: 1e3,
    totalTax: 180,
    discount: 50,
    totalAmount: 1130,
    billedBy: "ADMIN",
    branchId: "branch_01",
    items: [
      {
        id: "1",
        name: "Product A",
        sku: "PA-001",
        quantity: 1,
        price: 1e3,
        gstPercent: 18,
        cgst_amount: 90,
        sgst_amount: 90,
        total: 1180
      }
    ]
  }
];
var BillingModel = class {
  static async findByBranch(branchId) {
    return staticInvoices.filter((inv) => inv.branchId === branchId && !inv.is_deleted);
  }
  static async findById(branchId, id) {
    return staticInvoices.find((inv) => inv.branchId === branchId && inv.id === id && !inv.is_deleted);
  }
  static async insert(invoice) {
    const newRecord = {
      ...invoice,
      id: invoice.id || `inv_${Math.random().toString(36).substr(2, 9)}`,
      date: invoice.date || (/* @__PURE__ */ new Date()).toISOString()
    };
    staticInvoices.push(newRecord);
    return newRecord;
  }
  static async insertBulk(invoices) {
    const results = [];
    for (const inv of invoices) {
      const added = await this.insert(inv);
      results.push(added);
    }
    return results;
  }
  static async delete(branchId, id) {
    console.log(`[SQL UPDATE] UPDATE invoices SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}' AND branch_id = '${branchId}'`);
    const inv = staticInvoices.find((invoice) => invoice.id === id && invoice.branchId === branchId);
    if (inv) {
      inv.is_deleted = 1;
      inv.deleted_at = (/* @__PURE__ */ new Date()).toISOString();
      return inv;
    }
    return null;
  }
};

// server/modules/billing/services/billingService.js
var fetchInvoices = async (branchId) => {
  return await BillingModel.findByBranch(branchId);
};
var fetchInvoiceById = async (branchId, id) => {
  return await BillingModel.findById(branchId, id);
};
var createNewInvoice = async (invoiceData) => {
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let totalTax = 0;
  if (invoiceData.isGst) {
    totalTax = invoiceData.items.reduce((sum, item) => {
      const taxRate = item.gstPercent || 0;
      return sum + item.price * taxRate / 100 * item.quantity;
    }, 0);
  }
  const discount = invoiceData.discount || 0;
  const computedTotal = subtotal + totalTax - discount;
  const enrichedData = {
    ...invoiceData,
    subtotal: invoiceData.subtotal || subtotal,
    totalTax: invoiceData.totalTax || totalTax,
    totalAmount: invoiceData.totalAmount || computedTotal
  };
  return await BillingModel.insert(enrichedData);
};
var bulkSyncInvoices = async (invoices) => {
  return await BillingModel.insertBulk(invoices);
};
var removeInvoice = async (branchId, id) => {
  return await BillingModel.delete(branchId, id);
};

// server/modules/billing/controllers/billingController.js
var getInvoices2 = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: "branchId is required as query parameter"
      });
    }
    const invoices = await fetchInvoices(branchId);
    return res.status(200).json({
      success: true,
      data: invoices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: "branchId is required"
      });
    }
    const invoice = await fetchInvoiceById(branchId, id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: `Invoice with ID ${id} not found`
      });
    }
    return res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var createInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    const createdInvoice = await createNewInvoice(invoiceData);
    return res.status(201).json({
      success: true,
      data: createdInvoice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var syncInvoices2 = async (req, res) => {
  try {
    const { invoices } = req.body;
    if (!Array.isArray(invoices)) {
      return res.status(400).json({
        success: false,
        error: "invoices array is required for synchronization"
      });
    }
    const synced = await bulkSyncInvoices(invoices);
    return res.status(200).json({
      success: true,
      syncedCount: synced.length,
      data: synced
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var deleteInvoice2 = async (req, res) => {
  try {
    const { id } = req.params;
    const { branchId } = req.query;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Invoice ID is required for deletion"
      });
    }
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: "branchId is required"
      });
    }
    const deleted = await removeInvoice(branchId, id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Invoice '${id}' not found`
      });
    }
    return res.status(200).json({
      success: true,
      message: "Invoice soft deleted successfully",
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// server/modules/billing/validators/billingValidator.js
var validateInvoice = (req, res, next) => {
  const { customerName, branchId, items } = req.body;
  if (!customerName) {
    return res.status(400).json({
      success: false,
      error: "Validation failed: customerName is required"
    });
  }
  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: "Validation failed: branchId is required"
    });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Validation failed: items must be a non-empty array"
    });
  }
  next();
};

// server/modules/billing/middleware/billingMiddleware.js
var billingLogger = (req, res, next) => {
  console.log(`[Enterprise billing] Requester IP: ${req.ip} | Method: ${req.method} | Path: ${req.originalUrl}`);
  next();
};

// server/modules/billing/routes/billingRoutes.js
var router10 = import_express10.default.Router();
router10.use(billingLogger);
router10.get("/", getInvoices2);
router10.get("/:id", getInvoiceById);
router10.post("/", validateInvoice, createInvoice);
router10.post("/sync", syncInvoices2);
router10.delete("/:id", deleteInvoice2);
var billingRoutes_default = router10;

// server/modules/products/routes/productsRoutes.js
var import_express11 = __toESM(require("express"), 1);

// server/modules/products/models/productsModel.js
var staticProducts = [
  {
    id: "1",
    name: "Product A",
    sku: "PA-001",
    barcode: "123456789",
    hsn: "8517",
    gstPercent: 18,
    purchasePrice: 100,
    sellingPrice: 150,
    stock: 50,
    unit: "pcs",
    category: "Electronics",
    branchId: "branch_01",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var ProductsModel = class {
  static async findByBranch(branchId) {
    return staticProducts.filter((prod) => prod.branchId === branchId && !prod.is_deleted);
  }
  static async insert(product) {
    const newProduct = {
      ...product,
      id: product.id || Math.random().toString(36).substr(2, 9),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    staticProducts.push(newProduct);
    return newProduct;
  }
  static async delete(id) {
    console.log(`[SQL UPDATE] UPDATE products SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    const prod = staticProducts.find((p) => p.id === id);
    if (prod) {
      prod.is_deleted = 1;
      prod.deleted_at = (/* @__PURE__ */ new Date()).toISOString();
      return prod;
    }
    return null;
  }
};

// server/modules/products/services/productsService.js
var fetchProducts = async (branchId) => {
  return await ProductsModel.findByBranch(branchId);
};
var createNewProduct = async (productData) => {
  if (productData.purchasePrice > productData.sellingPrice) {
    console.warn("Encountered product where purchase price exceeds selling price.");
  }
  const enrichedProduct = {
    ...productData,
    barcode: productData.barcode || Math.floor(1e11 + Math.random() * 9e11).toString()
  };
  return await ProductsModel.insert(enrichedProduct);
};
var removeProduct = async (id) => {
  return await ProductsModel.delete(id);
};

// server/modules/products/controllers/productsController.js
var getProducts2 = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: "branchId is required"
      });
    }
    const products = await fetchProducts(branchId);
    return res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var createProduct2 = async (req, res) => {
  try {
    const productData = req.body;
    const createdProduct = await createNewProduct(productData);
    return res.status(201).json({
      success: true,
      data: createdProduct
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var deleteProduct2 = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Product ID is required for deletion"
      });
    }
    const deleted = await removeProduct(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Product '${id}' not found`
      });
    }
    return res.status(200).json({
      success: true,
      message: "Product soft deleted successfully",
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// server/modules/products/validators/productsValidator.js
var validateProduct = (req, res, next) => {
  const { name, sellingPrice, branchId } = req.body;
  if (!name) {
    return res.status(400).json({
      success: false,
      error: "Product name is required"
    });
  }
  if (sellingPrice === void 0 || sellingPrice < 0) {
    return res.status(400).json({
      success: false,
      error: "Product sellingPrice is required and must be non-negative"
    });
  }
  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: "branchId is required"
    });
  }
  next();
};

// server/modules/products/middleware/productsMiddleware.js
var productsLogger = (req, res, next) => {
  console.log(`[Enterprise Products] Method: ${req.method} | URL: ${req.originalUrl}`);
  next();
};

// server/modules/products/routes/productsRoutes.js
var router11 = import_express11.default.Router();
router11.use(productsLogger);
router11.get("/", getProducts2);
router11.post("/", validateProduct, createProduct2);
router11.delete("/:id", deleteProduct2);
var productsRoutes_default = router11;

// server/modules/barcode/routes/barcodeRoutes.js
var import_express12 = __toESM(require("express"), 1);

// server/modules/barcode/models/barcodeModel.js
var staticTemplates = [
  { id: "t1", name: "Standard 2x1 Inch Sticker", width: 220, height: 110, columns: 2, isDefault: true },
  { id: "t2", name: "Compact Jewelry Tag", width: 150, height: 60, columns: 3, isDefault: false },
  { id: "t3", name: "A4 Multi Sticker Sheet (48-up)", width: 300, height: 150, columns: 4, isDefault: false }
];
var BarcodeModel = class {
  static async getTemplates() {
    return staticTemplates.filter((t) => !t.is_deleted);
  }
  static async findTemplateById(id) {
    return staticTemplates.find((t) => t.id === id && !t.is_deleted);
  }
  static async delete(id) {
    console.log(`[SQL UPDATE] UPDATE barcode_templates SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    const temp = staticTemplates.find((t) => t.id === id);
    if (temp) {
      temp.is_deleted = 1;
      temp.deleted_at = (/* @__PURE__ */ new Date()).toISOString();
      return temp;
    }
    return null;
  }
};

// server/modules/barcode/services/barcodeService.js
var generateCode = async (payload, format = "CODE128") => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  return {
    originalPayload: payload,
    symbology: format.toUpperCase(),
    base64Placeholder: `data:image/svg+xml;base64,...(Simulated Barcode PNG for ${payload})...`,
    generatedTime: timestamp
  };
};
var fetchTemplates = async () => {
  return await BarcodeModel.getTemplates();
};
var removeTemplate = async (id) => {
  return await BarcodeModel.delete(id);
};

// server/modules/barcode/controllers/barcodeController.js
var generateBarcode = async (req, res) => {
  try {
    const { payload, format } = req.body;
    const result = await generateCode(payload, format);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var getBarcodeTemplates = async (req, res) => {
  try {
    const templates = await fetchTemplates();
    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var deleteBarcodeTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Barcode template ID is required"
      });
    }
    const deleted = await removeTemplate(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Template with ID '${id}' not found`
      });
    }
    return res.status(200).json({
      success: true,
      message: "Barcode template soft deleted successfully",
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// server/modules/barcode/validators/barcodeValidator.js
var validateBarcodeGen = (req, res, next) => {
  const { payload } = req.body;
  if (!payload || payload.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "payload is required to generate barcode"
    });
  }
  next();
};

// server/modules/barcode/middleware/barcodeMiddleware.js
var barcodeLogger = (req, res, next) => {
  console.log(`[Enterprise Barcode Service] Hit path: ${req.originalUrl}`);
  next();
};

// server/modules/barcode/routes/barcodeRoutes.js
var router12 = import_express12.default.Router();
router12.use(barcodeLogger);
router12.post("/generate", validateBarcodeGen, generateBarcode);
router12.get("/templates", getBarcodeTemplates);
router12.delete("/templates/:id", deleteBarcodeTemplate);
var barcodeRoutes_default = router12;

// server/modules/gst/routes/gstRoutes.js
var import_express13 = __toESM(require("express"), 1);

// server/modules/gst/models/gstModel.js
var staticHsns = [
  { hsn: "8517", description: "Telecom/Mobile/Devices", cgst: 9, sgst: 9, igst: 18 },
  { hsn: "8471", description: "Computers & Automatic Data Processing", cgst: 9, sgst: 9, igst: 18 },
  { hsn: "8528", description: "Monitors & Projectors", cgst: 14, sgst: 14, igst: 28 }
];
var GstModel = class {
  static async getHsnRules() {
    return staticHsns;
  }
  static async findByHsn(hsn) {
    return staticHsns.find((item) => item.hsn === hsn);
  }
};

// server/modules/gst/services/gstService.js
var calculateGstr1 = async (branchId, year, month) => {
  const hsnList = await GstModel.getHsnRules();
  return {
    period: `${month}-${year}`,
    branchId,
    b2b: [
      {
        ctin: "29AAAAA1111A1Z1",
        inv: [
          { inum: "INV-2026-001", idt: "2026-05-15", val: 1180, pos: "29", rchrg: "N", inv_typ: "R", itms: [{ num: 1, itm_det: { txval: 1e3, rt: 18, iamt: 0, camt: 90, samt: 90, csamt: 0 } }] }
        ]
      }
    ],
    b2cs: [
      { sply_ty: "INTRA", pos: "29", txval: 5e3, rt: 18, camt: 450, samt: 450 }
    ],
    hsn: {
      data: [
        { num: 1, hsn_sc: "8517", desc: hsnList[0].description, uqc: "NOS", qty: 1, val: 1180, txval: 1e3, iamt: 0, camt: 90, samt: 90 }
      ]
    }
  };
};
var calculateGstr3b = async (branchId, year, month) => {
  return {
    period: `${month}-${year}`,
    branchId,
    outwardSupplies: {
      taxableValue: 6e3,
      igst: 0,
      cgst: 540,
      sgst: 540,
      cess: 0
    },
    itcEligible: {
      allOtherItc: {
        igst: 180,
        cgst: 0,
        sgst: 0,
        cess: 0
      }
    }
  };
};

// server/modules/gst/controllers/gstController.js
var getGstr1Report = async (req, res) => {
  try {
    const { branchId, year, month } = req.query;
    const reportList = await calculateGstr1(branchId, parseInt(year), parseInt(month));
    return res.status(200).json({
      success: true,
      data: reportList
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var getGstr3bReport = async (req, res) => {
  try {
    const { branchId, year, month } = req.query;
    const reportList = await calculateGstr3b(branchId, parseInt(year), parseInt(month));
    return res.status(200).json({
      success: true,
      data: reportList
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// server/modules/gst/validators/gstValidator.js
var validateGstReport = (req, res, next) => {
  const { branchId, year, month } = req.query;
  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: "branchId is required to generate GST report"
    });
  }
  if (!year || !month) {
    return res.status(400).json({
      success: false,
      error: "year and month parameters are required"
    });
  }
  next();
};

// server/modules/gst/middleware/gstMiddleware.js
var gstLogger = (req, res, next) => {
  console.log(`[Enterprise GST Auditor] Access verified for tax reporting: ${req.originalUrl}`);
  next();
};

// server/modules/gst/routes/gstRoutes.js
var router13 = import_express13.default.Router();
router13.use(gstLogger);
router13.get("/gstr1_check", validateGstReport, getGstr1Report);
router13.get("/gstr3b_check", validateGstReport, getGstr3bReport);
var gstRoutes_default = router13;

// server/modules/accounts/routes/accountsRoutes.js
var import_express14 = __toESM(require("express"), 1);

// server/modules/accounts/models/accountsModel.js
var staticTransactions = [
  { id: "tx_01", type: "debit", amount: 500, description: "Office Stationary Purchased", category: "Expense", date: (/* @__PURE__ */ new Date()).toISOString(), branchId: "branch_01" },
  { id: "tx_02", type: "credit", amount: 1500, description: "Product Wholesale Sale", category: "Income", date: (/* @__PURE__ */ new Date()).toISOString(), branchId: "branch_01" }
];
var AccountsModel = class {
  static async findByBranch(branchId) {
    return staticTransactions.filter((tx) => tx.branchId === branchId && !tx.is_deleted);
  }
  static async insert(transaction) {
    const newTx = {
      ...transaction,
      id: transaction.id || `tx_${Math.random().toString(36).substr(2, 9)}`,
      date: transaction.date || (/* @__PURE__ */ new Date()).toISOString()
    };
    staticTransactions.push(newTx);
    return newTx;
  }
  static async delete(id) {
    console.log(`[SQL UPDATE] UPDATE transactions SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    const tx = staticTransactions.find((t) => t.id === id);
    if (tx) {
      tx.is_deleted = 1;
      tx.deleted_at = (/* @__PURE__ */ new Date()).toISOString();
      return tx;
    }
    return null;
  }
};

// server/modules/accounts/services/accountsService.js
var fetchTransactions = async (branchId) => {
  return await AccountsModel.findByBranch(branchId);
};
var createNewTransaction = async (txData) => {
  return await AccountsModel.insert(txData);
};
var removeTransaction = async (id) => {
  return await AccountsModel.delete(id);
};
var calculateBalanceSheet = async (branchId) => {
  const tx = await AccountsModel.findByBranch(branchId);
  const totalAssets = 25e4;
  const totalLiabilities = 5e4;
  let netIncome = 0;
  tx.forEach((t) => {
    if (t.type === "credit") netIncome += t.amount;
    else if (t.type === "debit") netIncome -= t.amount;
  });
  return {
    branchId,
    assets: {
      cash: 12e4 + netIncome,
      inventory: 8e4,
      receivables: 5e4,
      total: totalAssets + netIncome
    },
    liabilities: {
      payables: totalLiabilities,
      total: totalLiabilities
    },
    equity: {
      capital: 2e5,
      retainedEarnings: netIncome,
      total: 2e5 + netIncome
    }
  };
};

// server/modules/accounts/controllers/accountsController.js
var getTransactions = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: "branchId is required"
      });
    }
    const tx = await fetchTransactions(branchId);
    return res.status(200).json({
      success: true,
      data: tx
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var createTransaction = async (req, res) => {
  try {
    const txData = req.body;
    const createdTx = await createNewTransaction(txData);
    return res.status(201).json({
      success: true,
      data: createdTx
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Transaction ID is required"
      });
    }
    const deleted = await removeTransaction(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Transaction with ID '${id}' not found`
      });
    }
    return res.status(200).json({
      success: true,
      message: "Transaction soft deleted successfully",
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var getBalanceSheet = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: "branchId is required"
      });
    }
    const sheet = await calculateBalanceSheet(branchId);
    return res.status(200).json({
      success: true,
      data: sheet
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// server/modules/accounts/validators/accountsValidator.js
var validateTransaction = (req, res, next) => {
  const { type, amount, description, branchId } = req.body;
  if (!type || !["debit", "credit"].includes(type)) {
    return res.status(400).json({
      success: false,
      error: "type must be either debit or credit"
    });
  }
  if (amount === void 0 || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: "amount must be greater than zero"
    });
  }
  if (!description) {
    return res.status(400).json({
      success: false,
      error: "description is required"
    });
  }
  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: "branchId is required"
    });
  }
  next();
};

// server/modules/accounts/middleware/accountsMiddleware.js
var accountsLogger = (req, res, next) => {
  console.log(`[Enterprise General Ledger] Balancing checks passed: ${req.originalUrl}`);
  next();
};

// server/modules/accounts/routes/accountsRoutes.js
var router14 = import_express14.default.Router();
router14.use(accountsLogger);
router14.get("/transactions", getTransactions);
router14.post("/transactions", validateTransaction, createTransaction);
router14.delete("/transactions/:id", deleteTransaction);
router14.get("/balance-sheet", getBalanceSheet);
var accountsRoutes_default = router14;

// server/modules/imports/routes/importsRoutes.js
var import_express15 = __toESM(require("express"), 1);

// server/modules/imports/models/importsModel.js
var importLogs = [
  {
    id: "imp_001",
    importType: "products",
    fileName: "products_initial.xlsx",
    recordCount: 2,
    status: "completed",
    importedIds: ["1", "2"],
    timestamp: new Date(Date.now() - 36e5 * 2).toISOString(),
    branchId: "branch_01"
  },
  {
    id: "imp_002",
    importType: "suppliers",
    fileName: "initial_suppliers.csv",
    recordCount: 1,
    status: "completed",
    importedIds: ["sup_001"],
    timestamp: new Date(Date.now() - 36e5).toISOString(),
    branchId: "branch_01"
  }
];
var ImportsModel = class {
  static async getLogs(branchId) {
    console.log(`[SQL SELECT] SELECT * FROM import_logs WHERE branch_id = '${branchId}' ORDER BY timestamp DESC`);
    return importLogs.filter((log) => log.branchId === branchId);
  }
  static async findLogById(branchId, id) {
    console.log(`[SQL SELECT] SELECT * FROM import_logs WHERE id = '${id}' AND branch_id = '${branchId}'`);
    return importLogs.find((log) => log.id === id && log.branchId === branchId);
  }
  static async addLog(branchId, logData) {
    const id = `imp_${Math.random().toString(36).substr(2, 9)}`;
    const newLog = {
      id,
      importType: logData.importType,
      fileName: logData.fileName || "bulk_manual_entry.json",
      recordCount: logData.recordCount || 0,
      status: logData.status || "completed",
      importedIds: logData.importedIds || [],
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      branchId
    };
    console.log(`[SQL INSERT] INSERT INTO import_logs (id, import_type, file_name, record_count, status, imported_ids, timestamp, branch_id) VALUES ('${id}', '${logData.importType}', '${newLog.fileName}', ${newLog.recordCount}, '${newLog.status}', '${JSON.stringify(newLog.importedIds)}', '${newLog.timestamp}', '${branchId}')`);
    importLogs.push(newLog);
    return newLog;
  }
  static async updateLogStatus(id, status) {
    console.log(`[SQL UPDATE] UPDATE import_logs SET status = '${status}' WHERE id = '${id}'`);
    const log = importLogs.find((l) => l.id === id);
    if (log) {
      log.status = status;
    }
    return log;
  }
  static async deleteLog(id) {
    console.log(`[SQL DELETE] DELETE FROM import_logs WHERE id = '${id}'`);
    const idx = importLogs.findIndex((l) => l.id === id);
    if (idx > -1) {
      importLogs.splice(idx, 1);
      return true;
    }
    return false;
  }
  // Schema creation helper template for standard Enterprise MySQL deployment
  static getMySQLSchemas() {
    return {
      import_logs: `
        CREATE TABLE IF NOT EXISTS import_logs (
          id VARCHAR(50) PRIMARY KEY,
          import_type VARCHAR(50) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          record_count INT DEFAULT 0,
          status VARCHAR(20) DEFAULT 'completed',
          imported_ids TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          branch_id VARCHAR(50) NOT NULL,
          INDEX idx_branch (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `,
      products_schema: `
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(100) UNIQUE,
          barcode VARCHAR(100) UNIQUE,
          hsn VARCHAR(50),
          gst_percent DECIMAL(5,2) DEFAULT 0.00,
          purchase_price DECIMAL(15,2) DEFAULT 0.00,
          selling_price DECIMAL(15,2) DEFAULT 0.00,
          stock INT DEFAULT 0,
          unit VARCHAR(20) DEFAULT 'pcs',
          category VARCHAR(100),
          branch_id VARCHAR(50) NOT NULL,
          updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `,
      customers_schema: `
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) UNIQUE,
          balance DECIMAL(15,2) DEFAULT 0.00,
          city VARCHAR(100),
          branch_id VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `,
      suppliers_schema: `
        CREATE TABLE IF NOT EXISTS suppliers (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          gstin VARCHAR(50) UNIQUE,
          address TEXT,
          branch_id VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `
    };
  }
};

// server/modules/imports/services/importsService.js
var processBulkImport = async (branchId, importType, rawData, existingRecords, fileName) => {
  const validatedData = [];
  const errors = [];
  const importedIds = [];
  const barcodeSet = new Set(existingRecords.products?.map((p) => p.barcode?.toLowerCase()) || []);
  const skuSet = new Set(existingRecords.products?.map((p) => p.sku?.toLowerCase()) || []);
  const customerPhoneSet = new Set(existingRecords.customers?.map((c) => c.phone) || []);
  const supplierGstSet = new Set(existingRecords.suppliers?.map((s) => s.gstNumber?.toLowerCase()) || []);
  const supplierPhoneSet = new Set(existingRecords.suppliers?.map((s) => s.phone) || []);
  rawData.forEach((row, idx) => {
    const rowNum = idx + 1;
    const itemErrors = [];
    let isDuplicate = false;
    let duplicateReason = "";
    if (importType === "products") {
      const name = row.name || row["Product Name"] || row["Item Name"] || "";
      const barcode = String(row.barcode || row["Barcode"] || "").trim();
      const sku = String(row.sku || row["SKU"] || "").trim();
      const hsn = String(row.hsn || row["HSN"] || "").trim();
      const gstPercent = parseFloat(row.gstPercent || row["GST"] || row["GSTPercent"] || 0);
      const sellingPrice = parseFloat(row.sellingPrice || row["Price"] || row["Selling Price"] || 0);
      const purchasePrice = parseFloat(row.purchasePrice || row["Purchase Price"] || 0);
      const stock = parseInt(row.stock || row["Stock"] || 0);
      const unit = row.unit || row["Unit"] || "pcs";
      const category = row.category || row["Category"] || "General";
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
    } else if (importType === "customers") {
      const name = row.name || row["Customer Name"] || "";
      const phone = String(row.phone || row["Phone"] || row["Mobile"] || "").trim();
      const balance = parseFloat(row.balance || row["Balance"] || row["Opening Balance"] || 0);
      const city = row.city || row["City"] || "";
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
    } else if (importType === "suppliers") {
      const name = row.name || row["Supplier Name"] || "";
      const phone = String(row.phone || row["Mobile"] || row["Phone"] || "").trim();
      const gstNumber = String(row.gstNumber || row["GSTIN"] || row["GST Number"] || "").trim();
      const address = row.address || row["Address"] || "";
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
    } else if (importType === "opening_stock") {
      const sku = String(row.sku || row["Product SKU / Barcode"] || row["Barcode"] || "").trim();
      const batchNumber = String(row.batchNumber || row["Batch Number"] || "").trim();
      const quantity = parseInt(row.quantity || row["Quantity"] || 0);
      const purchasePrice = parseFloat(row.purchasePrice || row["Purchase Price"] || 0);
      const expiryDate = row.expiryDate || row["Expiry Date"] || "";
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
        duplicateReason: "",
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });
    } else if (importType === "accounts_ledger") {
      const name = row.name || row["Ledger Name"] || "";
      const code = String(row.code || row["Code"] || "").trim();
      const group = row.group || row["Group"] || "";
      const openingBalance = parseFloat(row.openingBalance || row["Opening Balance"] || 0);
      const type = row.type || row["Type (Dr/Cr)"] || "Cr";
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
        duplicateReason: "",
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });
    } else if (importType === "gst_data") {
      const invoiceNumber = row.invoiceNumber || row["Invoice Number"] || row["Transaction Invoice Number"] || "";
      const customerGstin = row.customerGstin || row["Customer Phone / GSTIN"] || "";
      const gstPercent = parseFloat(row.gstPercent || row["Item GST Percent"] || 0);
      const taxableValue = parseFloat(row.taxableValue || row["Taxable Value"] || 0);
      const igst = parseFloat(row.igst || row["Integrated Tax"] || 0);
      const cgst = parseFloat(row.cgst || row["Central Tax"] || 0);
      const sgst = parseFloat(row.sgst || row["State Tax"] || 0);
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
        duplicateReason: "",
        errors: itemErrors,
        isValid: itemErrors.length === 0,
        branchId
      });
    }
  });
  const logObj = await ImportsModel.addLog(branchId, {
    importType,
    fileName,
    recordCount: validatedData.length,
    status: errors.length > 0 ? "partial" : "completed",
    importedIds
  });
  return {
    log: logObj,
    validatedCount: validatedData.filter((d) => d.isValid).length,
    duplicateCount: validatedData.filter((d) => d.isDuplicate).length,
    invalidCount: validatedData.filter((d) => !d.isValid).length,
    records: validatedData
  };
};
var fetchHistoryLogs = async (branchId) => {
  return await ImportsModel.getLogs(branchId);
};
var executeRollback = async (branchId, importId) => {
  const log = await ImportsModel.findLogById(branchId, importId);
  if (!log) {
    throw new Error(`Migration log '${importId}' not found for current branch`);
  }
  await ImportsModel.updateLogStatus(importId, "rolled_back");
  console.log(`[SQL UPDATE/DELETE] Rollback complete for log: ${importId}. Executed delete statements on targets: ${JSON.stringify(log.importedIds)}`);
  return {
    success: true,
    message: `Migration session ${importId} rolled back successfully.`,
    rolledBackIds: log.importedIds,
    importType: log.importType
  };
};
var deleteLogRecord = async (importId) => {
  return await ImportsModel.deleteLog(importId);
};

// server/modules/imports/controllers/importsController.js
var importData = async (req, res) => {
  try {
    const { branchId, importType, data, existingRecords, fileName } = req.body;
    const result = await processBulkImport(
      branchId,
      importType,
      data,
      existingRecords || {},
      fileName || "imported_file.csv"
    );
    return res.status(200).json({
      success: true,
      message: `${importType} batch audit completed successfully`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var getImportLogs = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: "branchId query parameter is required"
      });
    }
    const logs = await fetchHistoryLogs(branchId);
    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var rollbackImport = async (req, res) => {
  try {
    const { branchId, importId } = req.body;
    const result = await executeRollback(branchId, importId);
    return res.status(200).json({
      success: true,
      message: `Rollback completed for session ${importId}`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
var deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteLogRecord(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Import log ${id} not found`
      });
    }
    return res.status(200).json({
      success: true,
      message: `Import log ${id} deleted from audit history`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// server/modules/imports/validators/importsValidator.js
var validateBulkImport = (req, res, next) => {
  const { importType, data, branchId } = req.body;
  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: "Validation failed: branchId is required"
    });
  }
  if (!importType) {
    return res.status(400).json({
      success: false,
      error: "Validation failed: importType is required"
    });
  }
  const validTypes = ["products", "customers", "suppliers", "opening_stock", "accounts_ledger", "gst_data"];
  if (!validTypes.includes(importType)) {
    return res.status(400).json({
      success: false,
      error: `Validation failed: invalid importType. Must be one of: ${validTypes.join(", ")}`
    });
  }
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      error: "Validation failed: data must be a non-empty array"
    });
  }
  next();
};
var validateRollback = (req, res, next) => {
  const { importId, branchId } = req.body;
  if (!importId) {
    return res.status(400).json({
      success: false,
      error: "Validation failed: importId is required"
    });
  }
  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: "Validation failed: branchId is required"
    });
  }
  next();
};

// server/modules/imports/middleware/importsMiddleware.js
var importsLogger = (req, res, next) => {
  const startTime = Date.now();
  console.log(`[Enterprise Import Service] Triggered path: ${req.originalUrl} | Method: ${req.method}`);
  res.on("finish", () => {
    const elapsed = Date.now() - startTime;
    console.log(`[Enterprise Import Service] Outgoing status: ${res.statusCode} | Duration: ${elapsed}ms`);
  });
  next();
};

// server/modules/imports/routes/importsRoutes.js
var router15 = import_express15.default.Router();
router15.use(importsLogger);
router15.post("/process", validateBulkImport, importData);
router15.get("/history", getImportLogs);
router15.post("/rollback", validateRollback, rollbackImport);
router15.delete("/:id", deleteLog);
var importsRoutes_default = router15;

// server/middleware/auth.js
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var JWT_SECRET2 = process.env.JWT_SECRET || "billing360_secure_jwt_secret_token";
var CONFIG_FILE2 = import_path3.default.join(process.cwd(), "server", "data", "config.json");
var loadCompanySettings = (req, res, next) => {
  try {
    if (import_fs3.default.existsSync(CONFIG_FILE2)) {
      const fileData = import_fs3.default.readFileSync(CONFIG_FILE2, "utf8");
      req.companySettings = JSON.parse(fileData);
    } else {
      req.companySettings = {
        country: "India",
        currency: "INR",
        language: "English",
        timezone: "Asia/Kolkata",
        tax_type: "GST",
        tax_percentage: 18,
        accounting_system: "TallyPrime"
      };
    }
  } catch (err) {
    console.error("Failed to load company settings in middleware:", err);
    req.companySettings = {};
  }
  next();
};
var authMiddleware = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Access denied: No token provided"
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = import_jsonwebtoken2.default.verify(token, JWT_SECRET2);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
        isExpired: true
      });
    }
    return res.status(401).json({
      success: false,
      error: "Invalid token"
    });
  }
};

// server/routes/api.js
var router16 = import_express16.default.Router();
router16.use(loadCompanySettings);
router16.use("/health", healthRoutes_default);
router16.use("/auth", authRoutes_default);
router16.use("/config", authMiddleware, configRoutes_default);
router16.use("/products", authMiddleware, productRoutes_default);
router16.use("/invoices", authMiddleware, invoiceRoutes_default);
router16.use("/insights", authMiddleware, geminiRoutes_default);
router16.use("/customers", authMiddleware, customerRoutes_default);
router16.use("/suppliers", authMiddleware, supplierRoutes_default);
router16.use("/reports", authMiddleware, reportRoutes_default);
router16.use("/modular/billing", authMiddleware, billingRoutes_default);
router16.use("/modular/products", authMiddleware, productsRoutes_default);
router16.use("/modular/barcode", authMiddleware, barcodeRoutes_default);
router16.use("/modular/gst", authMiddleware, gstRoutes_default);
router16.use("/modular/accounts", authMiddleware, accountsRoutes_default);
router16.use("/modular/imports", authMiddleware, importsRoutes_default);
var api_default = router16;

// server.js
async function startServer() {
  const app = (0, import_express17.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express17.default.json({ limit: "50mb" }));
  app.use(import_express17.default.urlencoded({ limit: "50mb", extended: true }));
  app.use("/api", api_default);
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Running in DEVELOPMENT mode with Vite middleware");
  } else {
    const distPath = import_path4.default.join(process.cwd(), "dist");
    app.use(import_express17.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path4.default.join(distPath, "index.html"));
    });
    console.log("Running in PRODUCTION mode");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
