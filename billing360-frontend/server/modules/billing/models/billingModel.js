// Mock database schema and query simulations for Invoice Billing records
const staticInvoices = [
  {
    id: 'inv_abc123',
    invoiceNumber: 'INV-2024-001',
    customerName: 'Aman Sharma',
    customerPhone: '9876543210',
    date: new Date().toISOString(),
    paymentMode: 'cash',
    isGst: true,
    subtotal: 1000.00,
    totalTax: 180.00,
    discount: 50.00,
    totalAmount: 1130.00,
    billedBy: 'ADMIN',
    branchId: 'branch_01',
    items: [
      {
        id: '1',
        name: 'Product A',
        sku: 'PA-001',
        quantity: 1,
        price: 1000,
        gstPercent: 18,
        cgst_amount: 90,
        sgst_amount: 90,
        total: 1180
      }
    ]
  }
];

export class BillingModel {
  static async findByBranch(branchId) {
    return staticInvoices.filter(inv => inv.branchId === branchId && !inv.is_deleted);
  }

  static async findById(branchId, id) {
    return staticInvoices.find(inv => inv.branchId === branchId && inv.id === id && !inv.is_deleted);
  }

  static async insert(invoice) {
    const newRecord = {
      ...invoice,
      id: invoice.id || `inv_${Math.random().toString(36).substr(2, 9)}`,
      date: invoice.date || new Date().toISOString()
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
    const inv = staticInvoices.find(invoice => invoice.id === id && invoice.branchId === branchId);
    if (inv) {
      inv.is_deleted = 1;
      inv.deleted_at = new Date().toISOString();
      return inv;
    }
    return null;
  }
}
