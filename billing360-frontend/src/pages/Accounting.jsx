import { useState, useEffect } from 'react';
import { IndianRupee, ArrowDownCircle, ArrowUpCircle, Plus, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { VoucherService, SettingsService, LedgerService, CustomerService, SupplierService, EmployeeService, InvoiceService, PurchaseService } from '../services/dataService';
import { useAuth } from '../lib/AuthContext';
import { translations } from '../lib/translations';

export default function Accounting() {
  const { userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'daybook');
  const [vouchers, setVouchers] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (tabParam && ['daybook', 'cashbook', 'bankbook', 'vouchers', 'statements'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState(null);

  // New filters
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const [newVoucher, setNewVoucher] = useState({
    type: 'payment',
    amount: 0,
    description: '',
    entityType: 'expense',
    ledgerId: '',
    entityId: '',
    paymentMode: 'cash'
  });

  useEffect(() => {
    if (userProfile?.branchId) {
      SettingsService.getConfig(userProfile.branchId, setConfig);
      const unsubscribe = VoucherService.getVouchers(userProfile.branchId, (data) => setVouchers(data));
      const unsubLedgers = LedgerService.getLedgers(userProfile.branchId, setLedgers);
      const unsubCustomers = CustomerService.getCustomers(userProfile.branchId, setCustomers);
      const unsubSuppliers = SupplierService.getSuppliers(userProfile.branchId, setSuppliers);
      const unsubEmployees = EmployeeService.getEmployees(userProfile.branchId, setEmployees);
      const unsubInv = InvoiceService.getAllInvoices(userProfile.branchId, setInvoices);
      const unsubPur = PurchaseService.getAllPurchases(userProfile.branchId, setPurchases);
      return () => {
        unsubscribe();
        unsubLedgers();
        unsubCustomers();
        unsubSuppliers();
        unsubEmployees();
        unsubInv();
        unsubPur();
      };
    }
  }, [userProfile?.branchId]);

  const filteredVouchers = vouchers.filter(v => {
    let vDate = '';
    if (v.date) {
      if (typeof v.date === 'string') {
        vDate = v.date.split('T')[0];
      } else if (v.date.toDate) {
        vDate = v.date.toDate().toISOString().split('T')[0];
      } else {
        vDate = new Date(v.date).toISOString().split('T')[0];
      }
    }
    const dateMatch = vDate === dateFilter;
    
    if (activeTab === 'cashbook') return dateMatch && v.paymentMode === 'cash';
    if (activeTab === 'bankbook') return dateMatch && ['bank', 'upi', 'card'].includes(v.paymentMode || '');
    if (activeTab === 'daybook') return dateMatch;
    return true; // vouchers tab shows all
  });

  const handleAddVoucher = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId) return;

    setIsSubmitting(true);
    try {
      await VoucherService.addVoucher(userProfile.branchId, {
        ...newVoucher,
        branchId: userProfile.branchId,
        date: new Date()
      });
      setShowAddVoucher(false);
      setNewVoucher({ type: 'payment', amount: 0, description: '', entityType: 'expense', ledgerId: '', entityId: '', paymentMode: 'cash' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = vouchers.reduce((acc, v) => {
    if (v.type === 'receipt') acc.receipts += v.amount;
    if (v.type === 'payment') acc.payments += v.amount;
    return acc;
  }, { receipts: 0, payments: 0 });

  const totalAR = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const totalAP = suppliers.reduce((acc, s) => acc + (s.balance || 0), 0);

  const salesRev = invoices.reduce((acc, i) => acc + (i.subtotal || 0), 0);
  const purchaseCost = purchases.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const expenseTotal = vouchers.filter(v => v.type === 'payment' && v.entityType === 'expense').reduce((acc, v) => acc + v.amount, 0);

  const t = translations[config?.language || 'English'] || translations.English;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.accounting}</h2>
          <p className="text-slate-500">{t.settings}</p>
        </div>
        <button 
          onClick={() => setShowAddVoucher(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest cursor-pointer"
        >
          <Plus size={18} />
          Add Voucher (Alt+N)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider">{t.total_sales}</span>
            <ArrowDownCircle className="text-emerald-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-emerald-900">₹{totals.receipts.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-600 text-xs font-bold uppercase tracking-wider">{t.total_expense}</span>
            <ArrowUpCircle className="text-red-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-red-900">₹{totals.payments.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">{t.balance}</span>
            <IndianRupee className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-blue-900">₹{(totals.receipts - totals.payments).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-white">
          <div className="flex-1">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 italic">
               Viewing: <span className="text-blue-600">{t[activeTab] || (activeTab === 'statements' ? t.reports : activeTab)}</span>
             </h3>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="date" 
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all" 
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab !== 'statements' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                      {v.date?.toDate?.()?.toLocaleDateString() || new Date(v.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 text-sm">{v.description}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{v.entityType}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        v.type === 'receipt' ? "bg-emerald-50 text-emerald-600" : 
                        v.type === 'payment' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {v.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{v.paymentMode || 'cash'}</span>
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-bold",
                      v.type === 'receipt' ? "text-emerald-600" : "text-red-600"
                    )}>
                      ₹{v.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {vouchers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No transactions found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-lg font-bold text-slate-900 border-b pb-2">Profit & Loss Statement (Draft)</h4>
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between text-sm italic">
                    <span className="text-slate-600 font-bold">Total Sales Income</span>
                    <span className="text-emerald-600 font-black">₹{salesRev.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm italic border-b border-slate-100 pb-2">
                    <span className="text-slate-600 font-medium">Other Indirect Incomes</span>
                    <span className="text-emerald-600 font-bold font-mono">₹{vouchers.filter(v => v.type === 'receipt' && v.entityType === 'income').reduce((acc, v) => acc + v.amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm italic">
                    <span className="text-slate-600 font-bold">Cost of Sales ({t.purchases})</span>
                    <span className="text-red-500 font-black">₹{purchaseCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm italic border-b border-slate-100 pb-2">
                    <span className="text-slate-600 font-medium">Operating Expenses</span>
                    <span className="text-red-600 font-bold font-mono">₹{expenseTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-black pt-2 bg-slate-50 px-3 py-3 rounded-2xl border border-slate-100 mt-4">
                    <span className="text-slate-900 uppercase italic tracking-tighter">Net Operating Margin</span>
                    <span className={cn("text-xl font-black italic", (salesRev - purchaseCost - expenseTotal) >= 0 ? "text-emerald-600" : "text-red-600")}>
                      ₹{(salesRev - purchaseCost - expenseTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-lg font-bold text-slate-900 border-b pb-2">Balance Sheet (Draft)</h4>
                <div className="space-y-3 font-mono">
                  <div className="bg-slate-50 px-3 py-2 rounded-lg mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Assets</p>
                  </div>
                  <div className="flex justify-between text-sm px-3">
                    <span className="text-slate-600">Cash & Bank</span>
                    <span className="text-slate-900 font-bold">₹{(totals.receipts - totals.payments).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm px-3 border-b pb-2">
                    <span className="text-slate-600">Account Receivables</span>
                    <span className="text-slate-900 font-bold text-red-600">₹{totalAR.toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-slate-50 px-3 py-2 rounded-lg mb-2 mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Liabilities</p>
                  </div>
                  <div className="flex justify-between text-sm px-3 border-b pb-2">
                    <span className="text-slate-600">Account Payables</span>
                    <span className="text-slate-900 font-bold text-red-600">₹{totalAP.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-base font-black pt-2 px-3">
                    <span className="text-slate-900 uppercase">Total Equity</span>
                    <span className="text-blue-600">₹{(totals.receipts - totals.payments + totalAR - totalAP).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Voucher Modal */}
      <AnimatePresence>
        {showAddVoucher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-xl font-black text-slate-900">New Voucher</h3>
                <button onClick={() => setShowAddVoucher(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 cursor-pointer">
                  x
                </button>
              </div>
              <form onSubmit={handleAddVoucher} className="p-8 space-y-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Voucher Type</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                      value={newVoucher.type}
                      onChange={e => {
                        const val = e.target.value;
                        let eType = newVoucher.entityType;
                        if (val === 'receipt' && eType === 'expense') eType = 'income';
                        if (val === 'payment' && eType === 'income') eType = 'expense';
                        setNewVoucher({...newVoucher, type: val, entityType: eType});
                      }}
                    >
                      <option value="payment">Payment (Money Out)</option>
                      <option value="receipt">Receipt (Money In)</option>
                      <option value="journal">Journal Adjustment</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Reference Group</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                      value={newVoucher.entityType}
                      onChange={e => setNewVoucher({...newVoucher, entityType: e.target.value, entityId: ''})}
                    >
                      {newVoucher.type === 'payment' ? (
                        <>
                          <option value="expense">Direct Expense</option>
                          <option value="supplier">Supplier Due Payment</option>
                          <option value="employee">Employee Salary</option>
                        </>
                      ) : (
                        <>
                          <option value="income">Indirect Income</option>
                          <option value="customer">Customer Payment (Due)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {['customer', 'supplier', 'employee'].includes(newVoucher.entityType) && (
                   <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                      {newVoucher.entityType === 'customer' ? 'Select Customer' : 
                       newVoucher.entityType === 'supplier' ? 'Select Supplier' : 'Select Employee'}
                    </label>
                    <select 
                      required
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                      value={newVoucher.entityId}
                      onChange={e => setNewVoucher({...newVoucher, entityId: e.target.value})}
                    >
                      <option value="">Choose...</option>
                      {newVoucher.entityType === 'customer' && customers.map(c => <option key={c.id} value={c.id}>{c.name} (Bal: ₹{c.balance})</option>)}
                      {newVoucher.entityType === 'supplier' && suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (Bal: ₹{s.balance})</option>)}
                      {newVoucher.entityType === 'employee' && employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Select Ledger Account</label>
                  <select 
                    required
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                    value={newVoucher.ledgerId}
                    onChange={e => setNewVoucher({...newVoucher, ledgerId: e.target.value})}
                  >
                    <option value="">Select Ledger</option>
                    {ledgers.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.group})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Amount</label>
                    <input required type="number" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newVoucher.amount} onChange={e => setNewVoucher({...newVoucher, amount: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Payment Mode</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                      value={newVoucher.paymentMode}
                      onChange={e => setNewVoucher({...newVoucher, paymentMode: e.target.value})}
                    >
                      <option value="cash">Cash Account</option>
                      <option value="bank">Bank Account</option>
                      <option value="upi">UPI / Scanner</option>
                      <option value="card">Card Payment</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Description / Narration</label>
                  <textarea required className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold h-24 shadow-sm" value={newVoucher.description} onChange={e => setNewVoucher({...newVoucher, description: e.target.value})} placeholder="e.g. Paid Electricity bill for April..."></textarea>
                </div>
                <div className="pt-6 flex gap-4 bg-white">
                  <button type="button" onClick={() => setShowAddVoucher(false)} className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-colors uppercase tracking-widest text-xs italic cursor-pointer">{t.cancel}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs italic cursor-pointer disabled:opacity-50">
                    {isSubmitting ? t.loading : t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
