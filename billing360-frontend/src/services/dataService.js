import { db, serverTimestamp } from '../lib/firebase.js';
import axios from 'axios';

export const CategoryService = {
  getCategories: (branchId, callback) => {
    const path = `branches/${branchId}/categories`;
    return db.subscribe(path, callback);
  },
  addCategory: async (branchId, category) => {
    const id = category.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/categories/${id}`;
    const newCategory = { ...category, id };
    db.set(path, newCategory);
    return { id };
  },
  deleteCategory: async (branchId, categoryId) => {
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
    const path = `branches/${branchId}/products`;
    return db.subscribe(path, callback);
  },

  addProduct: async (branchId, product) => {
    const id = product.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/products/${id}`;
    const newProduct = { ...product, id, updatedAt: serverTimestamp() };
    db.set(path, newProduct);
    return { id };
  },

  updateProduct: async (branchId, productId, product) => {
    const path = `branches/${branchId}/products/${productId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...product, updatedAt: serverTimestamp() });
  },

  updateStock: async (branchId, productId, newStock) => {
    const path = `branches/${branchId}/products/${productId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, stock: newStock, updatedAt: serverTimestamp() });
  },
  
  transferStock: async (fromBranchId, toBranchId, productId, toProductId, quantity) => {
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
      console.error('API Product delete failed, using local fallback:', err);
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
    const path = `branches/${branchId}/customers`;
    return db.subscribe(path, callback);
  },
  addCustomer: async (branchId, customer) => {
    const id = customer.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/customers/${id}`;
    db.set(path, { ...customer, id });
    return { id };
  },
  updateBalance: async (branchId, customerId, delta) => {
    const path = `branches/${branchId}/customers/${customerId}`;
    const user = db.get(path);
    if (user) {
      db.set(path, { ...user, balance: (user.balance || 0) + delta });
    }
  },
  updateCustomer: async (branchId, customerId, data) => {
    const path = `branches/${branchId}/customers/${customerId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  },
  deleteCustomer: async (branchId, customerId) => {
    try {
      await axios.delete(`/api/customers/${customerId}?branchId=${branchId}`);
    } catch (err) {
      console.error('API Customer delete failed:', err);
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
    const path = `branches/${branchId}/suppliers`;
    return db.subscribe(path, callback);
  },
  addSupplier: async (branchId, supplier) => {
    const id = supplier.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/suppliers/${id}`;
    db.set(path, { ...supplier, id });
    return { id };
  },
  updateBalance: async (branchId, supplierId, delta) => {
    const path = `branches/${branchId}/suppliers/${supplierId}`;
    const sup = db.get(path);
    if (sup) {
      db.set(path, { ...sup, balance: (sup.balance || 0) + delta });
    }
  },
  updateSupplier: async (branchId, supplierId, data) => {
    const path = `branches/${branchId}/suppliers/${supplierId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  },
  deleteSupplier: async (branchId, supplierId) => {
    try {
      await axios.delete(`/api/suppliers/${supplierId}?branchId=${branchId}`);
    } catch (err) {
      console.error('API Supplier delete failed:', err);
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
    const path = `branches/${branchId}/invoices`;
    return db.subscribe(path, (data) => {
      const safeData = data || [];
      callback([...safeData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50));
    });
  },

  getAllInvoices: (branchId, callback) => {
    const path = `branches/${branchId}/invoices`;
    return db.subscribe(path, (data) => {
      callback(data || []);
    });
  },

  createInvoice: async (branchId, invoice) => {
    const id = Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/invoices/${id}`;
    const newInvoice = { ...invoice, id, createdAt: serverTimestamp() };
    db.set(path, newInvoice);

    if (invoice.paymentMode === 'credit') {
      await CustomerService.updateBalance(branchId, invoice.customerId, invoice.totalAmount);
    }

    for (const item of invoice.items) {
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
        description: `Sale: ${invoice.invoiceNumber}${invoice.customerId ? ` (${invoice.customerName})` : ''}`,
        entityId: invoice.customerId || undefined,
        entityType: invoice.customerId ? 'customer' : 'income',
        paymentMode: invoice.paymentMode,
        branchId
      });
    }

    return { id };
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

    for (const item of purchase.items) {
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
    try {
      await axios.delete(`/api/invoices/${purchaseId}?branchId=${branchId}`);
    } catch (err) {
      console.error('API Purchase delete failed:', err);
    }
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
    const path = `branches/${branchId}/ledgers`;
    return db.subscribe(path, callback);
  },
  addLedger: async (branchId, ledger) => {
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
    try {
      await axios.delete(`/api/modular/accounts/transactions/${ledgerId}?branchId=${branchId}`);
    } catch (err) {
      console.error('API Ledger delete failed:', err);
    }
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
    const path = `branches/${branchId}/employees`;
    return db.subscribe(path, callback);
  },
  addEmployee: async (branchId, employee) => {
    const id = employee.id || Math.random().toString(36).substr(2, 9);
    const path = `branches/${branchId}/employees/${id}`;
    db.set(path, { ...employee, id, createdAt: serverTimestamp() });
    return { id };
  },
  updateEmployee: async (branchId, employeeId, data) => {
    const path = `branches/${branchId}/employees/${employeeId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  },
  deleteEmployee: async (branchId, employeeId) => {
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

    // Update Ledger balance
    if (voucher.ledgerId) {
      const delta = voucher.type === 'receipt' ? voucher.amount : -voucher.amount;
      await LedgerService.updateBalance(branchId, voucher.ledgerId, delta);
    }

    return { id };
  }
};

export const BranchService = {
  getBranches: (callback) => {
    const path = 'branches';
    return db.subscribe(path, callback);
  },
  addBranch: async (branch) => {
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
    const path = `branches/${branchId}`;
    const existing = db.get(path);
    db.set(path, { ...existing, ...data });
  }
};
