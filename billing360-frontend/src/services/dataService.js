import { db, serverTimestamp } from '../lib/firebase.js';
import axios from 'axios';

export const CategoryService = {
  getCategories: (branchId, callback) => {
    axios.get(`/api/categories?branchId=${branchId}`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
          res.data.data.forEach(cat => db.set(`branches/${branchId}/categories/${cat.id}`, cat));
        }
      })
      .catch(err => console.warn('API Category fetch fallback:', err?.message));

    const path = `branches/${branchId}/categories`;
    return db.subscribe(path, callback);
  },

  addCategory: async (branchId, category) => {
    try {
      const res = await axios.post('/api/categories', { ...category, branchId });
      if (res.data?.success && res.data.data?.id) {
        const cat = res.data.data;
        db.set(`branches/${branchId}/categories/${cat.id}`, cat);
        return { id: cat.id };
      }
    } catch (err) {
      console.warn('API Add Category error:', err?.message);
    }
    const id = category.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/categories/${id}`;
    const newCategory = { ...category, id };
    db.set(path, newCategory);
    return { id };
  },

  deleteCategory: async (branchId, categoryId) => {
    try {
      await axios.delete(`/api/categories/${categoryId}?branchId=${branchId}`);
    } catch (err) {
      console.warn('API Delete Category error:', err?.message);
    }
    const path = `branches/${branchId}/categories/${categoryId}`;
    const existing = db.get(path);
    if (existing) {
      db.set(path, { ...existing, is_deleted: 1, isDeleted: true, deleted_at: new Date().toISOString() });
    }
  },

  updateCategory: async (branchId, categoryId, data) => {
    const path = `branches/${branchId}/categories/${categoryId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  }
};

export const ProductService = {
  getProducts: (branchId, callback) => {
    axios.get(`/api/products?branchId=${branchId}`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
          res.data.data.forEach(prod => db.set(`branches/${branchId}/products/${prod.id}`, prod));
        }
      })
      .catch(err => console.warn('API Product fetch fallback:', err?.message));

    const path = `branches/${branchId}/products`;
    return db.subscribe(path, callback);
  },

  addProduct: async (branchId, product) => {
    try {
      const res = await axios.post('/api/products', { ...product, branchId });
      if (res.data?.success && res.data.data?.id) {
        const prod = res.data.data;
        db.set(`branches/${branchId}/products/${prod.id}`, prod);
        return { id: prod.id };
      }
    } catch (err) {
      console.warn('API Add Product error:', err?.message);
    }
    const id = product.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/products/${id}`;
    const newProduct = { ...product, id, updatedAt: serverTimestamp() };
    db.set(path, newProduct);
    return { id };
  },

  updateProduct: async (branchId, productId, product) => {
    try {
      await axios.put(`/api/products/${productId}`, { ...product, branchId });
    } catch (err) {
      console.warn('API Update Product error:', err?.message);
    }
    const path = `branches/${branchId}/products/${productId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...product, updatedAt: serverTimestamp() });
  },

  updateStock: async (branchId, productId, newStock) => {
    try {
      await axios.put(`/api/products/${productId}`, { stock: newStock, branchId });
    } catch (err) {
      console.warn('API Update Stock error:', err?.message);
    }
    const path = `branches/${branchId}/products/${productId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, stock: newStock, updatedAt: serverTimestamp() });
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
    if (fromProd && toProd) {
      db.set(fromPath, { ...fromProd, stock: (fromProd.stock || 0) - quantity });
      db.set(toPath, { ...toProd, stock: (toProd.stock || 0) + quantity });
    }
  },

  deleteProduct: async (branchId, productId) => {
    try {
      await axios.delete(`/api/products/${productId}?branchId=${branchId}`);
    } catch (err) {
      console.warn('API Product delete error:', err?.message);
    }
    const path = `branches/${branchId}/products/${productId}`;
    const existing = db.get(path);
    if (existing) {
      db.set(path, { ...existing, is_deleted: 1, isDeleted: true, deleted_at: new Date().toISOString() });
    }
  }
};

export const CustomerService = {
  getCustomers: (branchId, callback) => {
    axios.get(`/api/customers?branchId=${branchId}`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
          res.data.data.forEach(c => db.set(`branches/${branchId}/customers/${c.id}`, c));
        }
      })
      .catch(err => console.warn('API Customer fetch fallback:', err?.message));

    const path = `branches/${branchId}/customers`;
    return db.subscribe(path, callback);
  },

  addCustomer: async (branchId, customer) => {
    try {
      const res = await axios.post('/api/customers', { ...customer, branchId });
      if (res.data?.success && res.data.data?.id) {
        const cust = res.data.data;
        db.set(`branches/${branchId}/customers/${cust.id}`, cust);
        return { id: cust.id };
      }
    } catch (err) {
      console.warn('API Add Customer error:', err?.message);
    }
    const id = customer.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/customers/${id}`;
    db.set(path, { ...customer, id });
    return { id };
  },

  updateBalance: async (branchId, customerId, delta) => {
    const path = `branches/${branchId}/customers/${customerId}`;
    const user = db.get(path);
    if (user) {
      const newBal = (user.balance || 0) + delta;
      try {
        await axios.put(`/api/customers/${customerId}`, { balance: newBal, branchId });
      } catch (err) {
        console.warn('API Update Customer balance error:', err?.message);
      }
      db.set(path, { ...user, balance: newBal });
    }
  },

  updateCustomer: async (branchId, customerId, data) => {
    try {
      await axios.put(`/api/customers/${customerId}`, { ...data, branchId });
    } catch (err) {
      console.warn('API Update Customer error:', err?.message);
    }
    const path = `branches/${branchId}/customers/${customerId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  },

  deleteCustomer: async (branchId, customerId) => {
    try {
      await axios.delete(`/api/customers/${customerId}?branchId=${branchId}`);
    } catch (err) {
      console.warn('API Customer delete error:', err?.message);
    }
    const path = `branches/${branchId}/customers/${customerId}`;
    const existing = db.get(path);
    if (existing) {
      db.set(path, { ...existing, is_deleted: 1, isDeleted: true, deleted_at: new Date().toISOString() });
    }
  }
};

export const SupplierService = {
  getSuppliers: (branchId, callback) => {
    axios.get(`/api/suppliers?branchId=${branchId}`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
          res.data.data.forEach(s => db.set(`branches/${branchId}/suppliers/${s.id}`, s));
        }
      })
      .catch(err => console.warn('API Supplier fetch fallback:', err?.message));

    const path = `branches/${branchId}/suppliers`;
    return db.subscribe(path, callback);
  },

  addSupplier: async (branchId, supplier) => {
    try {
      const res = await axios.post('/api/suppliers', { ...supplier, branchId });
      if (res.data?.success && res.data.data?.id) {
        const sup = res.data.data;
        db.set(`branches/${branchId}/suppliers/${sup.id}`, sup);
        return { id: sup.id };
      }
    } catch (err) {
      console.warn('API Add Supplier error:', err?.message);
    }
    const id = supplier.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/suppliers/${id}`;
    db.set(path, { ...supplier, id });
    return { id };
  },

  updateBalance: async (branchId, supplierId, delta) => {
    const path = `branches/${branchId}/suppliers/${supplierId}`;
    const sup = db.get(path);
    if (sup) {
      const newBal = (sup.balance || 0) + delta;
      try {
        await axios.put(`/api/suppliers/${supplierId}`, { balance: newBal, branchId });
      } catch (err) {
        console.warn('API Update Supplier balance error:', err?.message);
      }
      db.set(path, { ...sup, balance: newBal });
    }
  },

  updateSupplier: async (branchId, supplierId, data) => {
    try {
      await axios.put(`/api/suppliers/${supplierId}`, { ...data, branchId });
    } catch (err) {
      console.warn('API Update Supplier error:', err?.message);
    }
    const path = `branches/${branchId}/suppliers/${supplierId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  },

  deleteSupplier: async (branchId, supplierId) => {
    try {
      await axios.delete(`/api/suppliers/${supplierId}?branchId=${branchId}`);
    } catch (err) {
      console.warn('API Supplier delete error:', err?.message);
    }
    const path = `branches/${branchId}/suppliers/${supplierId}`;
    const existing = db.get(path);
    if (existing) {
      db.set(path, { ...existing, is_deleted: 1, isDeleted: true, deleted_at: new Date().toISOString() });
    }
  }
};

export const InvoiceService = {
  getRecentInvoices: (branchId, callback) => {
    axios.get(`/api/billing/invoices?branchId=${branchId}&limit=50`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
        }
      })
      .catch(err => console.warn('API Invoices fetch fallback:', err?.message));

    const path = `branches/${branchId}/invoices`;
    return db.subscribe(path, (data) => {
      const safeData = data || [];
      callback([...safeData].sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()).slice(0, 50));
    });
  },

  getAllInvoices: (branchId, callback) => {
    axios.get(`/api/billing/invoices?branchId=${branchId}&limit=500`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
        }
      })
      .catch(err => console.warn('API All Invoices fetch fallback:', err?.message));

    const path = `branches/${branchId}/invoices`;
    return db.subscribe(path, (data) => {
      callback(data || []);
    });
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

    for (const item of invoice.items || []) {
      if (item.id) {
        const prod = db.get(`branches/${branchId}/products/${item.id}`);
        if (prod) {
          await ProductService.updateStock(branchId, item.id, (prod.stock || 0) - item.quantity);
        }
      }
    }

    if (invoice.paymentMode !== 'credit') {
      await VoucherService.addVoucher(branchId, {
        type: 'receipt',
        date: serverTimestamp(),
        amount: invoice.totalAmount,
        description: `Sale: ${apiInvoiceNumber || invoice.invoiceNumber}${invoice.customerId ? ` (${invoice.customerName})` : ''}`,
        entityId: invoice.customerId || undefined,
        entityType: invoice.customerId ? 'customer' : 'income',
        paymentMode: invoice.paymentMode,
        branchId
      });
    }

    return { id, invoiceNumber: apiInvoiceNumber || invoice.invoiceNumber };
  }
};

export const PurchaseService = {
  getPurchases: (branchId, callback) => {
    const path = `branches/${branchId}/purchases`;
    return db.subscribe(path, (data) => {
      const safeData = data || [];
      callback([...safeData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50));
    });
  },

  getAllPurchases: (branchId, callback) => {
    const path = `branches/${branchId}/purchases`;
    return db.subscribe(path, (data) => {
      callback(data || []);
    });
  },

  createPurchase: async (branchId, purchase) => {
    const id = purchase.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/purchases/${id}`;
    const newPurchase = { ...purchase, id, createdAt: serverTimestamp() };
    db.set(path, newPurchase);

    if (purchase.paymentMode === 'credit') {
      await SupplierService.updateBalance(branchId, purchase.supplierId, purchase.totalAmount);
    }

    for (const item of purchase.items || []) {
      const prod = db.get(`branches/${branchId}/products/${item.id}`);
      if (prod) {
        await ProductService.updateStock(branchId, item.id, (prod.stock || 0) + item.quantity);
      }
    }

    if (purchase.paymentMode !== 'credit') {
      await VoucherService.addVoucher(branchId, {
        type: 'payment',
        date: serverTimestamp(),
        amount: purchase.totalAmount,
        description: `Purchase: ${purchase.purchaseNumber} (${purchase.supplierName})`,
        entityId: purchase.supplierId,
        entityType: 'supplier',
        paymentMode: purchase.paymentMode,
        branchId
      });
    }

    return { id };
  },

  deletePurchase: async (branchId, purchaseId) => {
    const path = `branches/${branchId}/purchases/${purchaseId}`;
    const existing = db.get(path);
    if (existing) {
      db.set(path, { ...existing, is_deleted: 1, isDeleted: true, deleted_at: new Date().toISOString() });
    }
  },

  updateOrderStatus: async (branchId, purchaseId, orderStatus) => {
    const path = `branches/${branchId}/purchases/${purchaseId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, orderStatus, updatedAt: serverTimestamp() });
  }
};

export const LedgerService = {
  getLedgers: (branchId, callback) => {
    axios.get(`/api/ledgers?branchId=${branchId}`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
          res.data.data.forEach(l => db.set(`branches/${branchId}/ledgers/${l.id}`, l));
        }
      })
      .catch(err => console.warn('API Ledgers fetch fallback:', err?.message));

    const path = `branches/${branchId}/ledgers`;
    return db.subscribe(path, callback);
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
    const path = `branches/${branchId}/ledgers/${ledgerId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  },

  deleteLedger: async (branchId, ledgerId) => {
    const path = `branches/${branchId}/ledgers/${ledgerId}`;
    const existing = db.get(path);
    if (existing) {
      db.set(path, { ...existing, is_deleted: 1, isDeleted: true, deleted_at: new Date().toISOString() });
    }
  },

  updateBalance: async (branchId, ledgerId, delta) => {
    const path = `branches/${branchId}/ledgers/${ledgerId}`;
    const ledger = db.get(path);
    if (ledger) {
      db.set(path, { ...ledger, currentBalance: (ledger.currentBalance || 0) + delta });
    }
  }
};

export const EmployeeService = {
  getEmployees: (branchId, callback) => {
    axios.get(`/api/employees?branchId=${branchId}`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
          res.data.data.forEach(e => db.set(`branches/${branchId}/employees/${e.id}`, e));
        }
      })
      .catch(err => console.warn('API Employees fetch fallback:', err?.message));

    const path = `branches/${branchId}/employees`;
    return db.subscribe(path, callback);
  },

  addEmployee: async (branchId, employee) => {
    try {
      const res = await axios.post('/api/employees', { ...employee, branchId });
      if (res.data?.success && res.data.data?.id) {
        const emp = res.data.data;
        db.set(`branches/${branchId}/employees/${emp.id}`, emp);
        return { id: emp.id };
      }
    } catch (err) {
      console.warn('API Add Employee error:', err?.message);
    }
    const id = employee.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/employees/${id}`;
    db.set(path, { ...employee, id, createdAt: serverTimestamp() });
    return { id };
  },

  updateEmployee: async (branchId, employeeId, data) => {
    try {
      await axios.put(`/api/employees/${employeeId}`, { ...data, branchId });
    } catch (err) {
      console.warn('API Update Employee error:', err?.message);
    }
    const path = `branches/${branchId}/employees/${employeeId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  },

  deleteEmployee: async (branchId, employeeId) => {
    try {
      await axios.delete(`/api/employees/${employeeId}?branchId=${branchId}`);
    } catch (err) {
      console.warn('API Delete Employee error:', err?.message);
    }
    const path = `branches/${branchId}/employees/${employeeId}`;
    const existing = db.get(path);
    if (existing) {
      db.set(path, { ...existing, is_deleted: 1, isDeleted: true, deleted_at: new Date().toISOString() });
    }
  }
};

export const SettingsService = {
  getConfig: (branchId, callback) => {
    const path = `branches/${branchId}/settings/config`;
    return db.subscribe(path, callback);
  },
  saveConfig: async (branchId, config) => {
    const path = `branches/${branchId}/settings/config`;
    db.set(path, config);
  }
};

export const VoucherService = {
  getVouchers: (branchId, callback) => {
    axios.get(`/api/vouchers?branchId=${branchId}`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
          res.data.data.forEach(v => db.set(`branches/${branchId}/vouchers/${v.id}`, v));
        }
      })
      .catch(err => console.warn('API Vouchers fetch fallback:', err?.message));

    const path = `branches/${branchId}/vouchers`;
    return db.subscribe(path, (data) => {
      const safeData = data || [];
      callback([...safeData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100));
    });
  },

  getCashBook: (branchId, callback) => {
    const path = `branches/${branchId}/vouchers`;
    return db.subscribe(path, (data) => {
      const safeData = data || [];
      callback(safeData.filter(v => v.paymentMode === 'cash').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
  },

  getBankBook: (branchId, callback) => {
    const path = `branches/${branchId}/vouchers`;
    return db.subscribe(path, (data) => {
      const safeData = data || [];
      callback(safeData.filter(v => ['bank', 'upi', 'card'].includes(v.paymentMode || '')).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
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

    if (voucher.ledgerId) {
      const delta = voucher.type === 'receipt' ? voucher.amount : -voucher.amount;
      await LedgerService.updateBalance(branchId, voucher.ledgerId, delta);
    }

    return { id };
  }
};

export const BranchService = {
  getBranches: (callback) => {
    axios.get('/api/branches')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          callback(res.data.data);
          res.data.data.forEach(b => db.set(`branches/${b.id}`, b));
        }
      })
      .catch(err => console.warn('API Branches fetch fallback:', err?.message));

    const path = 'branches';
    return db.subscribe(path, callback);
  },

  addBranch: async (branch) => {
    try {
      const res = await axios.post('/api/branches', branch);
      if (res.data?.success && res.data.data?.id) {
        const br = res.data.data;
        db.set(`branches/${br.id}`, br);
        return { id: br.id };
      }
    } catch (err) {
      console.warn('API Add Branch error:', err?.message);
    }
    const id = branch.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${id}`;
    db.set(path, { ...branch, id, createdAt: serverTimestamp() });
    return { id };
  },

  switchUserBranch: async (userId, branchId) => {
    const path = `users/${userId}`;
    const user = db.get(path);
    if (user) {
      db.set(path, { ...user, branchId });
    }
  },

  deleteBranch: async (branchId) => {
    const path = `branches/${branchId}`;
    db.delete(path);
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
