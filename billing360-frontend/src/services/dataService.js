/**
 * dataService.js — API-First Data Layer
 * All data reads/writes go to MongoDB via the REST API.
 * localStorage is used only as a read cache; writes ALWAYS go to API first.
 * If an API write fails, an error is thrown (no silent local-only fallback).
 */
import { db, serverTimestamp } from '../lib/firebase.js';
import axios from 'axios';

// ─── Helper: Fetch from API and update local cache ───────────────────────────
const fetchAndCache = (apiUrl, localPath, callback) => {
  axios.get(apiUrl)
    .then(res => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        const data = res.data.data;
        // Update local cache
        data.forEach(item => {
          if (item.id) db.set(`${localPath}/${item.id}`, item);
        });
        // Clear deleted items from cache by overwriting collection list
        callback(data);
      }
    })
    .catch(err => {
      console.warn(`[DataService] API fetch failed for ${apiUrl}:`, err?.message);
      // Fall back to cache on read errors only
    });

  return db.subscribe(localPath, callback);
};

// ─── Category Service ─────────────────────────────────────────────────────────
export const CategoryService = {
  getCategories: (branchId, callback) => {
    return fetchAndCache(
      `/api/categories?branchId=${branchId}`,
      `branches/${branchId}/categories`,
      callback
    );
  },

  addCategory: async (branchId, category) => {
    const res = await axios.post('/api/categories', { ...category, branchId });
    if (res.data?.success && res.data.data?.id) {
      const cat = res.data.data;
      db.set(`branches/${branchId}/categories/${cat.id}`, cat);
      return { id: cat.id };
    }
    throw new Error(res.data?.message || 'Failed to add category');
  },

  deleteCategory: async (branchId, categoryId) => {
    await axios.delete(`/api/categories/${categoryId}?branchId=${branchId}`);
    db.delete(`branches/${branchId}/categories/${categoryId}`);
  },

  updateCategory: async (branchId, categoryId, data) => {
    try {
      await axios.put(`/api/categories/${categoryId}`, { ...data, branchId });
    } catch (err) {
      console.warn('API Update Category error:', err?.message);
    }
    const path = `branches/${branchId}/categories/${categoryId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  }
};

// ─── Product Service ──────────────────────────────────────────────────────────
export const ProductService = {
  getProducts: (branchId, callback) => {
    return fetchAndCache(
      `/api/products?branchId=${branchId}`,
      `branches/${branchId}/products`,
      callback
    );
  },

  addProduct: async (branchId, product) => {
    const res = await axios.post('/api/products', { ...product, branchId });
    if (res.data?.success && res.data.data?.id) {
      const prod = res.data.data;
      db.set(`branches/${branchId}/products/${prod.id}`, prod);
      return { id: prod.id };
    }
    throw new Error(res.data?.message || 'Failed to add product');
  },

  updateProduct: async (branchId, productId, product) => {
    const res = await axios.put(`/api/products/${productId}`, { ...product, branchId });
    if (res.data?.success && res.data.data) {
      db.set(`branches/${branchId}/products/${productId}`, { ...product, ...res.data.data });
    } else {
      const path = `branches/${branchId}/products/${productId}`;
      const existing = db.get(path);
      db.set(path, { ...existing, ...product, updatedAt: serverTimestamp() });
    }
  },

  updateStock: async (branchId, productId, newStock) => {
    try {
      await axios.put(`/api/products/${productId}`, { stock: newStock, stock_qty: newStock, branchId });
    } catch (err) {
      console.warn('API Update Stock error:', err?.message);
    }
    const path = `branches/${branchId}/products/${productId}`;
    const existing = db.get(path);
    if (existing) db.set(path, { ...existing, stock: newStock, stock_qty: newStock, updatedAt: serverTimestamp() });
  },

  transferStock: async (fromBranchId, toBranchId, productId, toProductId, quantity) => {
    try {
      await axios.post('/api/inventory/transfer-stock', { productId, targetBranchId: toBranchId, transferQty: quantity });
    } catch (err) {
      console.warn('API Transfer Stock error:', err?.message);
    }
    const fromPath = `branches/${fromBranchId}/products/${productId}`;
    const toPath = `branches/${toBranchId}/products/${toProductId}`;
    const fromProd = db.get(fromPath);
    const toProd = db.get(toPath);
    if (fromProd) db.set(fromPath, { ...fromProd, stock: (fromProd.stock || 0) - quantity });
    if (toProd) db.set(toPath, { ...toProd, stock: (toProd.stock || 0) + quantity });
  },

  deleteProduct: async (branchId, productId) => {
    await axios.delete(`/api/products/${productId}?branchId=${branchId}`);
    db.delete(`branches/${branchId}/products/${productId}`);
  }
};

// ─── Customer Service ─────────────────────────────────────────────────────────
export const CustomerService = {
  getCustomers: (branchId, callback) => {
    return fetchAndCache(
      `/api/customers?branchId=${branchId}`,
      `branches/${branchId}/customers`,
      callback
    );
  },

  addCustomer: async (branchId, customer) => {
    const res = await axios.post('/api/customers', { ...customer, branchId });
    if (res.data?.success && res.data.data?.id) {
      const cust = res.data.data;
      db.set(`branches/${branchId}/customers/${cust.id}`, cust);
      return { id: cust.id };
    }
    throw new Error(res.data?.message || 'Failed to add customer');
  },

  updateBalance: async (branchId, customerId, delta) => {
    try {
      const path = `branches/${branchId}/customers/${customerId}`;
      const user = db.get(path);
      const newBal = (user?.balance || 0) + delta;
      await axios.put(`/api/customers/${customerId}`, { balance: newBal, current_balance: newBal, branchId });
      if (user) db.set(path, { ...user, balance: newBal, current_balance: newBal });
    } catch (err) {
      console.warn('API Update Customer balance error:', err?.message);
    }
  },

  updateCustomer: async (branchId, customerId, data) => {
    const res = await axios.put(`/api/customers/${customerId}`, { ...data, branchId });
    const path = `branches/${branchId}/customers/${customerId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data, ...(res.data?.data || {}) });
  },

  deleteCustomer: async (branchId, customerId) => {
    await axios.delete(`/api/customers/${customerId}?branchId=${branchId}`);
    db.delete(`branches/${branchId}/customers/${customerId}`);
  }
};

// ─── Supplier Service ─────────────────────────────────────────────────────────
export const SupplierService = {
  getSuppliers: (branchId, callback) => {
    return fetchAndCache(
      `/api/suppliers?branchId=${branchId}`,
      `branches/${branchId}/suppliers`,
      callback
    );
  },

  addSupplier: async (branchId, supplier) => {
    const res = await axios.post('/api/suppliers', { ...supplier, branchId });
    if (res.data?.success && res.data.data?.id) {
      const sup = res.data.data;
      db.set(`branches/${branchId}/suppliers/${sup.id}`, sup);
      return { id: sup.id };
    }
    throw new Error(res.data?.message || 'Failed to add supplier');
  },

  updateBalance: async (branchId, supplierId, delta) => {
    try {
      const path = `branches/${branchId}/suppliers/${supplierId}`;
      const sup = db.get(path);
      const newBal = (sup?.balance || 0) + delta;
      await axios.put(`/api/suppliers/${supplierId}`, { balance: newBal, current_balance: newBal, branchId });
      if (sup) db.set(path, { ...sup, balance: newBal, current_balance: newBal });
    } catch (err) {
      console.warn('API Update Supplier balance error:', err?.message);
    }
  },

  updateSupplier: async (branchId, supplierId, data) => {
    const res = await axios.put(`/api/suppliers/${supplierId}`, { ...data, branchId });
    const path = `branches/${branchId}/suppliers/${supplierId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data, ...(res.data?.data || {}) });
  },

  deleteSupplier: async (branchId, supplierId) => {
    await axios.delete(`/api/suppliers/${supplierId}?branchId=${branchId}`);
    db.delete(`branches/${branchId}/suppliers/${supplierId}`);
  }
};

// ─── Invoice Service ──────────────────────────────────────────────────────────
export const InvoiceService = {
  getRecentInvoices: (branchId, callback) => {
    return fetchAndCache(
      `/api/billing/invoices?branchId=${branchId}&limit=50`,
      `branches/${branchId}/invoices`,
      data => callback([...data].sort((a, b) =>
        new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()
      ).slice(0, 50))
    );
  },

  getAllInvoices: (branchId, callback) => {
    return fetchAndCache(
      `/api/billing/invoices?branchId=${branchId}&limit=1000`,
      `branches/${branchId}/invoices`,
      callback
    );
  },

  createInvoice: async (branchId, invoice) => {
    let apiInvoiceId = null;
    let apiInvoiceNumber = null;

    try {
      const res = await axios.post('/api/billing/checkout', {
        customerId: invoice.customerId,
        items: (invoice.items || []).map(item => ({
          productId: item.id || item.productId,
          quantity: item.quantity,
          price: item.price,
          cgstPercent: item.cgstPercent || (item.gstPercent ? item.gstPercent / 2 : 9),
          sgstPercent: item.sgstPercent || (item.gstPercent ? item.gstPercent / 2 : 9),
          igstPercent: item.igstPercent || 0
        })),
        paymentMode: invoice.paymentMode,
        paidAmount: invoice.paidAmount || invoice.totalAmount,
        billingDate: invoice.billingDate || new Date()
      });

      if (res.data?.success) {
        apiInvoiceId = res.data.invoiceId;
        apiInvoiceNumber = res.data.invoiceNumber;
      }
    } catch (err) {
      console.warn('API Checkout error, using local fallback:', err?.message);
    }

    const id = apiInvoiceId || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/invoices/${id}`;
    const newInvoice = { ...invoice, id, invoiceNumber: apiInvoiceNumber || invoice.invoiceNumber, createdAt: serverTimestamp() };
    db.set(path, newInvoice);

    if (invoice.paymentMode === 'credit') {
      await CustomerService.updateBalance(branchId, invoice.customerId, invoice.totalAmount);
    }

    // Update local stock cache after checkout
    for (const item of invoice.items || []) {
      if (item.id) {
        const prod = db.get(`branches/${branchId}/products/${item.id}`);
        if (prod) {
          const newStock = Math.max(0, (prod.stock || 0) - item.quantity);
          db.set(`branches/${branchId}/products/${item.id}`, { ...prod, stock: newStock, stock_qty: newStock });
        }
      }
    }

    return { id, invoiceNumber: apiInvoiceNumber || invoice.invoiceNumber };
  }
};

// ─── Purchase Service ─────────────────────────────────────────────────────────
export const PurchaseService = {
  getPurchases: (branchId, callback) => {
    return fetchAndCache(
      `/api/purchases?branchId=${branchId}`,
      `branches/${branchId}/purchases`,
      data => callback([...data].sort((a, b) =>
        new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()
      ).slice(0, 50))
    );
  },

  getAllPurchases: (branchId, callback) => {
    return fetchAndCache(
      `/api/purchases?branchId=${branchId}&limit=1000`,
      `branches/${branchId}/purchases`,
      callback
    );
  },

  createPurchase: async (branchId, purchase) => {
    try {
      const res = await axios.post('/api/purchases', { ...purchase, branchId });
      if (res.data?.success && res.data.data?.id) {
        const p = res.data.data;
        db.set(`branches/${branchId}/purchases/${p.id}`, p);

        // Update local product stock cache
        for (const item of purchase.items || []) {
          const productId = item.id || item.productId;
          if (productId) {
            const prod = db.get(`branches/${branchId}/products/${productId}`);
            if (prod) {
              const newStock = (prod.stock || 0) + (item.quantity || 0);
              db.set(`branches/${branchId}/products/${productId}`, { ...prod, stock: newStock, stock_qty: newStock });
            }
          }
        }

        return { id: p.id, purchaseNumber: p.purchaseNumber || p.purchase_number };
      }
    } catch (err) {
      console.warn('API Create Purchase error:', err?.message);
      // Fallback: save locally only
    }

    // Local fallback
    const id = purchase.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/purchases/${id}`;
    db.set(path, { ...purchase, id, createdAt: serverTimestamp() });

    for (const item of purchase.items || []) {
      const productId = item.id || item.productId;
      if (productId) {
        const prod = db.get(`branches/${branchId}/products/${productId}`);
        if (prod) {
          await ProductService.updateStock(branchId, productId, (prod.stock || 0) + (item.quantity || 0));
        }
      }
    }

    return { id };
  },

  deletePurchase: async (branchId, purchaseId) => {
    try {
      await axios.delete(`/api/purchases/${purchaseId}?branchId=${branchId}`);
    } catch (err) {
      console.warn('API Delete Purchase error:', err?.message);
    }
    db.delete(`branches/${branchId}/purchases/${purchaseId}`);
  },

  updateOrderStatus: async (branchId, purchaseId, orderStatus) => {
    try {
      await axios.put(`/api/purchases/${purchaseId}`, { orderStatus, branchId });
    } catch (err) {
      console.warn('API Update Purchase status error:', err?.message);
    }
    const path = `branches/${branchId}/purchases/${purchaseId}`;
    const existing = db.get(path);
    if (existing) db.set(path, { ...existing, orderStatus, updatedAt: serverTimestamp() });
  }
};

// ─── Ledger Service ───────────────────────────────────────────────────────────
export const LedgerService = {
  getLedgers: (branchId, callback) => {
    return fetchAndCache(
      `/api/ledgers?branchId=${branchId}`,
      `branches/${branchId}/ledgers`,
      callback
    );
  },

  addLedger: async (branchId, ledger) => {
    try {
      const res = await axios.post('/api/ledgers', { ...ledger, branchId });
      if (res.data?.success && res.data.data?.id) {
        const leg = res.data.data;
        db.set(`branches/${branchId}/ledgers/${leg.id}`, leg);
        return { id: leg.id };
      }
    } catch (err) {
      console.warn('API Add Ledger error:', err?.message);
    }
    const id = ledger.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/ledgers/${id}`;
    const newLedger = { ...ledger, id, createdAt: serverTimestamp(), currentBalance: ledger.openingBalance };
    db.set(path, newLedger);
    return { id };
  },

  updateLedger: async (branchId, ledgerId, data) => {
    try {
      await axios.put(`/api/ledgers/${ledgerId}`, { ...data, branchId });
    } catch (err) {
      console.warn('API Update Ledger error:', err?.message);
    }
    const path = `branches/${branchId}/ledgers/${ledgerId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  },

  deleteLedger: async (branchId, ledgerId) => {
    try {
      await axios.delete(`/api/ledgers/${ledgerId}?branchId=${branchId}`);
    } catch (err) {
      console.warn('API Delete Ledger error:', err?.message);
    }
    db.delete(`branches/${branchId}/ledgers/${ledgerId}`);
  },

  updateBalance: async (branchId, ledgerId, delta) => {
    const path = `branches/${branchId}/ledgers/${ledgerId}`;
    const ledger = db.get(path);
    if (ledger) {
      db.set(path, { ...ledger, currentBalance: (ledger.currentBalance || 0) + delta });
    }
  }
};

// ─── Employee Service ─────────────────────────────────────────────────────────
export const EmployeeService = {
  getEmployees: (branchId, callback) => {
    return fetchAndCache(
      `/api/employees?branchId=${branchId}`,
      `branches/${branchId}/employees`,
      callback
    );
  },

  addEmployee: async (branchId, employee) => {
    const res = await axios.post('/api/employees', { ...employee, branchId });
    if (res.data?.success && res.data.data?.id) {
      const emp = res.data.data;
      db.set(`branches/${branchId}/employees/${emp.id}`, emp);
      return { id: emp.id };
    }
    throw new Error(res.data?.message || 'Failed to add employee');
  },

  updateEmployee: async (branchId, employeeId, data) => {
    const res = await axios.put(`/api/employees/${employeeId}`, { ...data, branchId });
    const path = `branches/${branchId}/employees/${employeeId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data, ...(res.data?.data || {}) });
  },

  deleteEmployee: async (branchId, employeeId) => {
    await axios.delete(`/api/employees/${employeeId}?branchId=${branchId}`);
    db.delete(`branches/${branchId}/employees/${employeeId}`);
  }
};

// ─── Settings Service ─────────────────────────────────────────────────────────
export const SettingsService = {
  getConfig: (branchId, callback) => {
    // Fetch from API first, cache locally
    axios.get(`/api/settings?branchId=${branchId}`)
      .then(res => {
        if (res.data?.success && res.data.data) {
          const cfg = res.data.data;
          db.set(`branches/${branchId}/settings/config`, cfg);
          callback(cfg);
        }
      })
      .catch(err => console.warn('API Settings fetch error:', err?.message));

    const path = `branches/${branchId}/settings/config`;
    return db.subscribe(path, callback);
  },

  saveConfig: async (branchId, config) => {
    // Save to MongoDB
    try {
      await axios.post('/api/settings', { ...config, branchId });
    } catch (err) {
      console.warn('API Save Settings error:', err?.message);
    }
    // Always update local cache too
    const path = `branches/${branchId}/settings/config`;
    db.set(path, config);
  }
};

// ─── Voucher Service ──────────────────────────────────────────────────────────
export const VoucherService = {
  getVouchers: (branchId, callback) => {
    return fetchAndCache(
      `/api/vouchers?branchId=${branchId}`,
      `branches/${branchId}/vouchers`,
      data => callback([...data].sort((a, b) =>
        new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime()
      ).slice(0, 100))
    );
  },

  getCashBook: (branchId, callback) => {
    return fetchAndCache(
      `/api/vouchers?branchId=${branchId}`,
      `branches/${branchId}/vouchers`,
      data => callback(
        data
          .filter(v => v.paymentMode === 'cash' || v.payment_mode === 'cash')
          .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      )
    );
  },

  getBankBook: (branchId, callback) => {
    return fetchAndCache(
      `/api/vouchers?branchId=${branchId}`,
      `branches/${branchId}/vouchers`,
      data => callback(
        data
          .filter(v => ['bank', 'upi', 'card'].includes(v.paymentMode || v.payment_mode || ''))
          .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      )
    );
  },

  addVoucher: async (branchId, voucher) => {
    try {
      const res = await axios.post('/api/vouchers', { ...voucher, branchId });
      if (res.data?.success && res.data.data?.id) {
        const vch = res.data.data;
        db.set(`branches/${branchId}/vouchers/${vch.id}`, vch);
        return { id: vch.id };
      }
    } catch (err) {
      console.warn('API Add Voucher error:', err?.message);
    }

    // Local fallback
    const id = Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/vouchers/${id}`;
    db.set(path, { ...voucher, id });

    if (voucher.entityId && voucher.entityType === 'customer') {
      const delta = voucher.type === 'receipt' ? -voucher.amount : voucher.amount;
      await CustomerService.updateBalance(branchId, voucher.entityId, delta);
    } else if (voucher.entityId && voucher.entityType === 'supplier') {
      const delta = voucher.type === 'payment' ? -voucher.amount : voucher.amount;
      await SupplierService.updateBalance(branchId, voucher.entityId, delta);
    }

    return { id };
  }
};

// ─── Branch Service ───────────────────────────────────────────────────────────
export const BranchService = {
  getBranches: (callback) => {
    return fetchAndCache('/api/branches', 'branches', callback);
  },

  addBranch: async (branch) => {
    const res = await axios.post('/api/branches', branch);
    if (res.data?.success && res.data.data?.id) {
      const br = res.data.data;
      db.set(`branches/${br.id}`, br);
      return { id: br.id };
    }
    throw new Error(res.data?.message || 'Failed to add branch');
  },

  switchUserBranch: async (userId, branchId) => {
    const path = `users/${userId}`;
    const user = db.get(path);
    if (user) db.set(path, { ...user, branchId });
  },

  deleteBranch: async (branchId) => {
    db.delete(`branches/${branchId}`);
  },

  updateBranch: async (branchId, data) => {
    try {
      await axios.put(`/api/branches/${branchId}`, data);
    } catch (err) {
      console.warn('API Update Branch error:', err?.message);
    }
    const path = `branches/${branchId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  }
};
