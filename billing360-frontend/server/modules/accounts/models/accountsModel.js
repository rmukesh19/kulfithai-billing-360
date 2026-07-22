const staticTransactions = [
  { id: 'tx_01', type: 'debit', amount: 500, description: 'Office Stationary Purchased', category: 'Expense', date: new Date().toISOString(), branchId: 'branch_01' },
  { id: 'tx_02', type: 'credit', amount: 1500, description: 'Product Wholesale Sale', category: 'Income', date: new Date().toISOString(), branchId: 'branch_01' }
];

export class AccountsModel {
  static async findByBranch(branchId) {
    return staticTransactions.filter(tx => tx.branchId === branchId && !tx.is_deleted);
  }

  static async insert(transaction) {
    const newTx = {
      ...transaction,
      id: transaction.id || `tx_${Math.random().toString(36).substr(2, 9)}`,
      date: transaction.date || new Date().toISOString()
    };
    staticTransactions.push(newTx);
    return newTx;
  }

  static async delete(id) {
    console.log(`[SQL UPDATE] UPDATE transactions SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    const tx = staticTransactions.find(t => t.id === id);
    if (tx) {
      tx.is_deleted = 1;
      tx.deleted_at = new Date().toISOString();
      return tx;
    }
    return null;
  }
}
