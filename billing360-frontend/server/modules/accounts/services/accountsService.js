import { AccountsModel } from '../models/accountsModel.js';

export const fetchTransactions = async (branchId) => {
  return await AccountsModel.findByBranch(branchId);
};

export const createNewTransaction = async (txData) => {
  return await AccountsModel.insert(txData);
};

export const removeTransaction = async (id) => {
  return await AccountsModel.delete(id);
};

export const calculateBalanceSheet = async (branchId) => {
  const tx = await AccountsModel.findByBranch(branchId);
  const totalAssets = 250000; // Mock base assets
  const totalLiabilities = 50000;
  
  let netIncome = 0;
  tx.forEach(t => {
    if (t.type === 'credit') netIncome += t.amount;
    else if (t.type === 'debit') netIncome -= t.amount;
  });

  return {
    branchId,
    assets: {
      cash: 120000 + netIncome,
      inventory: 80000,
      receivables: 50000,
      total: totalAssets + netIncome
    },
    liabilities: {
      payables: totalLiabilities,
      total: totalLiabilities
    },
    equity: {
      capital: 200000,
      retainedEarnings: netIncome,
      total: 200000 + netIncome
    }
  };
};
