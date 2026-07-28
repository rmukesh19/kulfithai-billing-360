import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Tag, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  IndianRupee,
  ChevronRight,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { 
  CategoryService, 
  CustomerService, 
  SupplierService, 
  BranchService,
  SettingsService,
  LedgerService
} from '../services/dataService';
import { useAuth } from '../lib/AuthContext';
import { useDeleteToast } from '../lib/DeleteToastContext';
import { translations } from '../lib/translations';

export default function Masters() {
  const { userProfile } = useAuth();
  const { showConfirm, showToast } = useDeleteToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'category');
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (tabParam && ['category', 'customer', 'supplier', 'ledger', 'branch'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Data State
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [ledgers, setLedgers] = useState([]);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef(null);

  const generateNextMasterId = (tab) => {
    let prefix = '';
    let dataPool = [];
    
    switch (tab) {
      case 'customer': prefix = 'CST'; dataPool = customers; break;
      case 'supplier': prefix = 'SUP'; dataPool = suppliers; break;
      case 'branch': prefix = 'BR'; dataPool = branches; break;
      case 'ledger': prefix = 'LDG'; dataPool = ledgers; break;
      default: return '';
    }

    const existingIds = dataPool
      .map(item => item.id || '')
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, '')))
      .filter(num => !isNaN(num));
    
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowViewModal(false);
        setShowDeleteModal(false);
      }
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowAddModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form State
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [newContact, setNewContact] = useState({ id: '', name: '', phone: '', email: '', gstIn: '', address: '', city: '', state: '', balance: '', creditLimit: '', category: '' });
  const [newBranch, setNewBranch] = useState({ id: '', name: '', address: '', phone: '', gstIn: '' });
  const [newLedger, setNewLedger] = useState({ id: '', name: '', group: 'Expense', openingBalance: '', currentBalance: 0 });

  useEffect(() => {
    if (userProfile?.branchId) {
      SettingsService.getConfig(userProfile.branchId, setConfig);
      const unsubCat = CategoryService.getCategories(userProfile.branchId, setCategories);
      const unsubCust = CustomerService.getCustomers(userProfile.branchId, setCustomers);
      const unsubSupp = SupplierService.getSuppliers(userProfile.branchId, setSuppliers);
      const unsubLedger = LedgerService.getLedgers(userProfile.branchId, setLedgers);
      const unsubBranch = BranchService.getBranches(setBranches);
      
      setLoading(false);
      return () => {
        unsubCat();
        unsubCust();
        unsubSupp();
        unsubLedger();
        unsubBranch();
      };
    }
  }, [userProfile?.branchId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId) return;

    setIsSubmitting(true);
    try {
      if (activeTab === 'category') {
        await CategoryService.addCategory(userProfile.branchId, { ...newCategory, branchId: userProfile.branchId });
        setNewCategory({ name: '' });
      } else if (activeTab === 'customer') {
        const finalId = newContact.id || generateNextMasterId('customer');
        const payload = {
          ...newContact,
          id: finalId,
          balance: parseFloat(newContact.balance) || 0,
          creditLimit: parseFloat(newContact.creditLimit) || 50000,
          branchId: userProfile.branchId
        };
        await CustomerService.addCustomer(userProfile.branchId, payload);
        setNewContact({ id: '', name: '', phone: '', email: '', gstIn: '', address: '', city: '', state: '', balance: '', creditLimit: '', category: '' });
      } else if (activeTab === 'supplier') {
        const finalId = newContact.id || generateNextMasterId('supplier');
        const payload = {
          ...newContact,
          id: finalId,
          balance: parseFloat(newContact.balance) || 0,
          branchId: userProfile.branchId
        };
        await SupplierService.addSupplier(userProfile.branchId, payload);
        setNewContact({ id: '', name: '', phone: '', email: '', gstIn: '', address: '', city: '', state: '', balance: '', creditLimit: '', category: '' });
      } else if (activeTab === 'branch') {
        const finalId = newBranch.id || generateNextMasterId('branch');
        await BranchService.addBranch({ ...newBranch, id: finalId });
        setNewBranch({ id: '', name: '', address: '', phone: '', gstIn: '' });
      } else if (activeTab === 'ledger') {
        const finalId = newLedger.id || generateNextMasterId('ledger');
        const payload = {
          ...newLedger,
          id: finalId,
          openingBalance: parseFloat(newLedger.openingBalance) || 0,
          branchId: userProfile.branchId
        };
        await LedgerService.addLedger(userProfile.branchId, payload);
        setNewLedger({ id: '', name: '', group: 'Expense', openingBalance: '', currentBalance: 0 });
      }
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (id, name) => {
    if (!userProfile?.branchId) return;
    showConfirm('Category', `Are you sure you want to delete category "${name}"?`, async () => {
      await CategoryService.deleteCategory(userProfile.branchId, id);
    });
  };

  const handleDeleteCustomer = (id) => {
    if (!userProfile?.branchId) return;
    showConfirm('Customer', 'Are you sure you want to soft delete this customer? This will preserve database records but hide them from POS Billing.', async () => {
      await CustomerService.deleteCustomer(userProfile.branchId, id);
    });
  };

  const handleDeleteSupplier = (id) => {
    if (!userProfile?.branchId) return;
    showConfirm('Supplier', 'Are you sure you want to soft delete this supplier? This will protect existing purchase history and invoices.', async () => {
      await SupplierService.deleteSupplier(userProfile.branchId, id);
    });
  };

  const handleSwitchBranch = async (branchId) => {
    if (!userProfile?.userId) return;
    try {
      await BranchService.switchUserBranch(userProfile.userId, branchId);
      window.location.reload();
    } catch (error) {
      console.error("Switch failed", error);
    }
  };

  const handleDeleteBranch = (id) => {
    if (!userProfile?.branchId || id === userProfile.branchId) {
      showToast("Cannot delete active branch.", "error");
      return;
    }
    showConfirm('Branch', 'Are you sure you want to soft delete this branch? All data will be archived safely.', async () => {
      await BranchService.deleteBranch(id);
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId || !editingItem?.id) return;

    setIsSubmitting(true);
    try {
      if (activeTab === 'category') {
        await CategoryService.updateCategory(userProfile.branchId, editingItem.id, editingItem);
      } else if (activeTab === 'customer') {
        await CustomerService.updateCustomer(userProfile.branchId, editingItem.id, editingItem);
      } else if (activeTab === 'supplier') {
        await SupplierService.updateSupplier(userProfile.branchId, editingItem.id, editingItem);
      } else if (activeTab === 'branch') {
        await BranchService.updateBranch(editingItem.id, editingItem);
      } else if (activeTab === 'ledger') {
        await LedgerService.updateLedger(userProfile.branchId, editingItem.id, editingItem);
      }
      setShowEditModal(false);
      setEditingItem(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredData = () => {
    const q = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'category': return categories.filter(c => c.name.toLowerCase().includes(q));
      case 'customer': return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
      case 'supplier': return suppliers.filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(q));
      case 'ledger': return ledgers.filter(l => l.name.toLowerCase().includes(q) || l.group.toLowerCase().includes(q));
      case 'branch': return branches.filter(b => b.name.toLowerCase().includes(q));
      default: return [];
    }
  };

  const t = translations[config?.language || 'English'] || translations.English;

  const renderTabContent = () => {
    const data = getFilteredData();

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              {activeTab === 'category' && (
                <>
                  <th className="px-6 py-4 italic text-xs tracking-normal font-black">#</th>
                  <th className="px-6 py-4">{t.category}</th>
                  <th className="px-6 py-4 text-right">{t.actions}</th>
                </>
              )}
              {(activeTab === 'customer' || activeTab === 'supplier') && (
                <>
                  <th className="px-6 py-4 italic text-xs tracking-normal font-black">{t.id}</th>
                  <th className="px-6 py-4">{activeTab === 'customer' ? t.customer_name : t.supplier_name}</th>
                  <th className="px-6 py-4">{t.gst_number}</th>
                  <th className="px-6 py-4 text-right">{t.balance}</th>
                  <th className="px-6 py-4 text-center">{t.actions}</th>
                </>
              )}
              {activeTab === 'branch' && (
                <>
                  <th className="px-6 py-4 italic text-xs tracking-normal font-black">ID</th>
                  <th className="px-6 py-4">{t.branch}</th>
                  <th className="px-6 py-4">{t.reports}</th>
                  <th className="px-6 py-4">{t.phone}</th>
                  <th className="px-6 py-4 text-right">{t.actions}</th>
                </>
              )}
              {activeTab === 'ledger' && (
                <>
                  <th className="px-6 py-4 italic text-xs tracking-normal font-black">ID</th>
                  <th className="px-6 py-4">Account Name</th>
                  <th className="px-6 py-4">Group</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4 text-center">{t.actions}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                {activeTab === 'category' && (
                  <>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Tag size={16} />
                        </div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button 
                          onClick={() => {
                            setViewingItem(item);
                            setShowViewModal(true);
                          }}
                          className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setShowEditModal(true);
                          }}
                          className="p-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(item.id, item.name)}
                          className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
                {(activeTab === 'customer' || activeTab === 'supplier') && (
                  <>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400 font-bold">{item.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          {item.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                          <div className="flex items-center gap-2">
                             <p className="text-xs text-slate-400 font-medium">{item.phone}</p>
                             {item.category && (
                               <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500 font-black uppercase tracking-wider">
                                 {item.category}
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{item.gstIn || 'No GST'}</td>
                    <td className="px-6 py-4 font-bold text-sm">₹{Math.abs(item.balance || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button 
                          onClick={() => {
                            setViewingItem(item);
                            setShowViewModal(true);
                          }}
                          className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setShowEditModal(true);
                          }}
                          className="p-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => activeTab === 'customer' ? handleDeleteCustomer(item.id) : handleDeleteSupplier(item.id)}
                          className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
                {activeTab === 'branch' && (
                  <>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400 font-bold">{item.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.address}</td>
                    <td className="px-6 py-4 text-sm font-medium">{item.phone}</td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button 
                          onClick={() => {
                            setViewingItem(item);
                            setShowViewModal(true);
                          }}
                          className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setShowEditModal(true);
                          }}
                          className="p-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleSwitchBranch(item.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-black rounded-xl hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest cursor-pointer"
                        >
                          Switch
                          <ChevronRight size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBranch(item.id)}
                          className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
                {activeTab === 'ledger' && (
                  <>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400 font-bold">{item.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className={cn(
                           "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                           item.group === 'Asset' ? "bg-blue-50 text-blue-600" :
                           item.group === 'Liability' ? "bg-red-50 text-red-600" :
                           item.group === 'Income' ? "bg-emerald-50 text-emerald-600" :
                           item.group === 'Expense' ? "bg-orange-50 text-orange-600" : "bg-purple-50 text-purple-600"
                         )}>
                            {item.name?.charAt(0)}
                         </div>
                         <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider",
                        item.group === 'Asset' ? "bg-blue-100 text-blue-700" :
                        item.group === 'Liability' ? "bg-red-100 text-red-700" :
                        item.group === 'Income' ? "bg-emerald-100 text-emerald-700" :
                        item.group === 'Expense' ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"
                      )}>{item.group}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-right text-sm">₹{item.currentBalance?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button 
                          onClick={() => {
                            setViewingItem(item);
                            setShowViewModal(true);
                          }}
                          className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setShowEditModal(true);
                          }}
                          className="p-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            showConfirm('Ledger', 'Are you sure you want to delete this ledger? The transaction ledger will be soft deleted safely.', async () => {
                              await LedgerService.deleteLedger(userProfile?.branchId, item.id);
                            });
                          }}
                          className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  No {activeTab}s found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3 flex gap-1 overflow-x-auto no-scrollbar shadow-sm">
        <button onClick={() => handleTabChange('category')} className={cn("px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap", activeTab === 'category' ? "bg-slate-900 border-none text-white font-bold" : "text-slate-500 hover:bg-slate-50 font-bold")}>
          {t.categories || 'Categories'}
        </button>
        <button onClick={() => handleTabChange('customer')} className={cn("px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap", activeTab === 'customer' ? "bg-slate-900 border-none text-white font-bold" : "text-slate-500 hover:bg-slate-50 font-bold")}>
          {t.customers || 'Customers'}
        </button>
        <button onClick={() => handleTabChange('supplier')} className={cn("px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap", activeTab === 'supplier' ? "bg-slate-900 border-none text-white font-bold" : "text-slate-500 hover:bg-slate-50 font-bold")}>
          {t.suppliers || 'Suppliers'}
        </button>
        <button onClick={() => handleTabChange('ledger')} className={cn("px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap", activeTab === 'ledger' ? "bg-slate-900 border-none text-white font-bold" : "text-slate-500 hover:bg-slate-50 font-bold")}>
          Ledgers
        </button>
        {userProfile?.role === 'Admin' && (
          <button onClick={() => handleTabChange('branch')} className={cn("px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap", activeTab === 'branch' ? "bg-slate-900 border-none text-white font-bold" : "text-slate-500 hover:bg-slate-50 font-bold")}>
            Branches
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t.masters}</h2>
          <p className="text-slate-500 font-medium">{t.settings}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 cursor-pointer"
        >
          <Plus size={18} />
          {activeTab === 'ledger' ? 'New Ledger' : `New ${t[activeTab] || activeTab}`} (Alt+N)
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between bg-white">
          <div className="flex-1">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 italic">
               Viewing: <span className="text-blue-600">{t[activeTab] || (activeTab === 'ledger' ? 'Ledgers' : activeTab)}</span>
             </h3>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={`Search ${activeTab}s (F1)...`} 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {renderTabContent()}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-xl font-black text-slate-900">{activeTab === 'ledger' ? 'New Ledger' : `New ${t[activeTab] || activeTab}`}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 cursor-pointer">
                  x
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-8 space-y-6 bg-white">
                {activeTab === 'category' && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{t.category}</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" 
                      placeholder="e.g. Beverages, Electronics..."
                      value={newCategory.name} 
                      onChange={e => setNewCategory({ name: e.target.value })} 
                    />
                  </div>
                )}

                {(activeTab === 'customer' || activeTab === 'supplier') && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between items-center">
                          <span>{activeTab === 'customer' ? t.customer : t.supplier} ID</span>
                          <button 
                            type="button" 
                            onClick={() => setNewContact({...newContact, id: generateNextMasterId(activeTab)})}
                            className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                          >
                            Auto
                          </button>
                        </label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newContact.id} onChange={e => setNewContact({...newContact, id: e.target.value})} placeholder="e.g. CST001" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Name</label>
                        <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Full Name / Firm Name" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{t.phone}</label>
                        <input required type="tel" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="Mobile Number" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
                        <input type="email" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="email@example.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Address / Street</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newContact.address} onChange={e => setNewContact({...newContact, address: e.target.value})} placeholder="Street, Area, Door No" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">City</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newContact.city} onChange={e => setNewContact({...newContact, city: e.target.value})} placeholder="e.g. Chennai, Mumbai, Bangkok" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">GSTIN</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newContact.gstIn} onChange={e => setNewContact({...newContact, gstIn: e.target.value})} placeholder="e.g. 27AAAAA1111A1Z1" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">State / UT</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newContact.state} onChange={e => setNewContact({...newContact, state: e.target.value})} placeholder="e.g. Tamil Nadu" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Opening Balance</label>
                        <input 
                          type="number" 
                          step="any"
                          onFocus={e => e.target.select()}
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" 
                          value={newContact.balance === 0 || newContact.balance === '0' ? '' : newContact.balance} 
                          onChange={e => setNewContact({...newContact, balance: e.target.value})} 
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Credit Limit / Price Rate</label>
                        <input 
                          type="number" 
                          step="any"
                          onFocus={e => e.target.select()}
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" 
                          value={newContact.creditLimit === 0 || newContact.creditLimit === '0' ? '' : newContact.creditLimit} 
                          onChange={e => setNewContact({...newContact, creditLimit: e.target.value})} 
                          placeholder="50000.00"
                        />
                      </div>
                    </div>
                    {activeTab === 'supplier' && (
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Supplier Category</label>
                        <select 
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                          value={newContact.category}
                          onChange={e => setNewContact({...newContact, category: e.target.value})}
                        >
                          <option value="">Select Category</option>
                          <option value="Wholesaler">Wholesaler</option>
                          <option value="Distributor">Distributor</option>
                          <option value="Manufacturer">Manufacturer</option>
                          <option value="Retailer">Retailer</option>
                          <option value="Service Provider">Service Provider</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'branch' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between items-center">
                          <span>Branch ID</span>
                          <button 
                            type="button" 
                            onClick={() => setNewBranch({...newBranch, id: generateNextMasterId('branch')})}
                            className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                          >
                            Auto
                          </button>
                        </label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" placeholder="e.g. BR001" value={newBranch.id} onChange={e => setNewBranch({...newBranch, id: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Branch Name</label>
                        <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" placeholder="e.g. Main Branch" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Address</label>
                      <textarea required className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold h-24" placeholder="Full street address" value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Phone</label>
                        <input required type="tel" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newBranch.phone} onChange={e => setNewBranch({...newBranch, phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">GSTIN</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newBranch.gstIn} onChange={e => setNewBranch({...newBranch, gstIn: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ledger' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Ledger ID</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newLedger.id} onChange={e => setNewLedger({...newLedger, id: e.target.value})} placeholder="e.g. LDG001" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Ledger Name</label>
                        <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newLedger.name} onChange={e => setNewLedger({...newLedger, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Ledger Group</label>
                        <select 
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                          value={newLedger.group}
                          onChange={e => setNewLedger({...newLedger, group: e.target.value})}
                        >
                          <option value="Asset">Asset (Cash, Bank, Fixed Assets)</option>
                          <option value="Liability">Liability (Loans, Payables)</option>
                          <option value="Income">Income (Sales, Other Income)</option>
                          <option value="Expense">Expense (Salary, Rent, Bills)</option>
                          <option value="Equity">Equity (Capital)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Opening Balance</label>
                        <input type="number" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={newLedger.openingBalance} onChange={e => setNewLedger({...newLedger, openingBalance: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-colors uppercase tracking-widest text-xs cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs disabled:opacity-50 cursor-pointer">
                    {isSubmitting ? t.loading : t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-xl font-black text-slate-900">{t.edit} {activeTab === 'ledger' ? 'Ledger' : (t[activeTab] || activeTab)}</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 cursor-pointer">
                  x
                </button>
              </div>
              <form onSubmit={handleEdit} className="p-8 space-y-6 bg-white">
                {activeTab === 'category' && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Category Name</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" 
                      placeholder="e.g. Beverages, Electronics..."
                      value={editingItem.name} 
                      onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} 
                    />
                  </div>
                )}

                {(activeTab === 'customer' || activeTab === 'supplier') && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                          {activeTab === 'customer' ? t.customer : t.supplier} ID
                        </label>
                        <input disabled type="text" className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold text-slate-500 cursor-not-allowed" value={editingItem.id} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Name</label>
                        <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Phone</label>
                        <input required type="tel" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.phone} onChange={e => setEditingItem({...editingItem, phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
                        <input type="email" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.email || ''} onChange={e => setEditingItem({...editingItem, email: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Address / Street</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.address || ''} onChange={e => setEditingItem({...editingItem, address: e.target.value})} placeholder="Street, Area, Door No" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">City</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.city || ''} onChange={e => setEditingItem({...editingItem, city: e.target.value})} placeholder="e.g. Chennai, Mumbai, Bangkok" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">GSTIN (Optional)</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.gstIn || ''} onChange={e => setEditingItem({...editingItem, gstIn: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">State / UT</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.state || ''} onChange={e => setEditingItem({...editingItem, state: e.target.value})} placeholder="e.g. Tamil Nadu" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Current Balance</label>
                        <input 
                          type="number" 
                          step="any"
                          onFocus={e => e.target.select()}
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" 
                          value={editingItem.balance === 0 || editingItem.balance === '0' ? '' : (editingItem.balance ?? '')} 
                          onChange={e => setEditingItem({...editingItem, balance: e.target.value})} 
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Credit Limit / Price Rate</label>
                        <input 
                          type="number" 
                          step="any"
                          onFocus={e => e.target.select()}
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" 
                          value={editingItem.creditLimit === 0 || editingItem.creditLimit === '0' ? '' : (editingItem.creditLimit ?? '')} 
                          onChange={e => setEditingItem({...editingItem, creditLimit: e.target.value})} 
                          placeholder="50000.00"
                        />
                      </div>
                    </div>
                    {activeTab === 'supplier' && (
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Supplier Category</label>
                        <select 
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                          value={editingItem.category || ''}
                          onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                        >
                          <option value="">Select Category</option>
                          <option value="Wholesaler">Wholesaler</option>
                          <option value="Distributor">Distributor</option>
                          <option value="Manufacturer">Manufacturer</option>
                          <option value="Retailer">Retailer</option>
                          <option value="Service Provider">Service Provider</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'branch' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Branch ID</label>
                        <input disabled type="text" className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold text-slate-500 cursor-not-allowed" value={editingItem.id} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Branch Name</label>
                        <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Address</label>
                      <textarea required className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold h-24" value={editingItem.address} onChange={e => setEditingItem({...editingItem, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Phone</label>
                        <input required type="tel" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.phone} onChange={e => setEditingItem({...editingItem, phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">GSTIN</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.gstIn || ''} onChange={e => setEditingItem({...editingItem, gstIn: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ledger' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Ledger ID</label>
                        <input disabled type="text" className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold text-slate-500 cursor-not-allowed" value={editingItem.id} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Ledger Name</label>
                        <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Ledger Group</label>
                        <select 
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                          value={editingItem.group}
                          onChange={e => setEditingItem({...editingItem, group: e.target.value})}
                        >
                          <option value="Asset">Asset</option>
                          <option value="Liability">Liability</option>
                          <option value="Income">Income</option>
                          <option value="Expense">Expense</option>
                          <option value="Equity">Equity</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Opening Balance</label>
                        <input type="number" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold" value={editingItem.openingBalance} onChange={e => setEditingItem({...editingItem, openingBalance: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-colors uppercase tracking-widest text-xs cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs disabled:opacity-50 cursor-pointer">
                    {isSubmitting ? 'Updating...' : 'Update & Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {showViewModal && viewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between text-slate-900 bg-white">
                <h3 className="text-xl font-black">{(t[activeTab] || activeTab).toUpperCase()} Details</h3>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  x
                </button>
              </div>
              <div className="p-8 space-y-6 bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-2xl">
                    {viewingItem.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900">{viewingItem.name}</h4>
                    <p className="text-slate-500 font-mono text-xs">{viewingItem.id}</p>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem]">
                  {viewingItem.phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{viewingItem.phone}</span>
                    </div>
                  )}
                  {viewingItem.email && (
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{viewingItem.email}</span>
                    </div>
                  )}
                  {viewingItem.address && (
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-slate-400 mt-1" />
                      <span className="text-sm font-bold text-slate-700">{viewingItem.address}</span>
                    </div>
                  )}
                  {viewingItem.gstIn && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">GSTIN</span>
                      <span className="text-sm font-mono font-bold text-slate-700">{viewingItem.gstIn}</span>
                    </div>
                  )}
                  {(viewingItem.balance !== undefined) && (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <IndianRupee size={16} className="text-blue-600" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Outstanding Balance</p>
                        <p className="text-lg font-black text-blue-600 italic">₹{viewingItem.balance?.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => {
                    setShowViewModal(false);
                    setEditingItem(viewingItem);
                    setShowEditModal(true);
                  }}
                  className="flex-1 px-4 py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-colors uppercase tracking-widest text-xs italic shadow-sm cursor-pointer"
                >
                  Edit Item
                </button>
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 px-4 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs italic shadow-lg shadow-blue-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
