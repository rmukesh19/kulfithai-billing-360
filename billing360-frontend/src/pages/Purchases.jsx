import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Filter, IndianRupee, Truck, Calendar, ShoppingBag, X, ChevronDown, Trash2, Eye, Edit2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PurchaseService, SupplierService, ProductService, SettingsService } from '@/src/services/dataService';
import { useAuth } from '@/src/lib/AuthContext';
import { useDeleteToast } from '../lib/DeleteToastContext';
import { translations } from '@/src/lib/translations';
import { useLocalization } from '@/src/lib/LocalizationContext';

export default function Purchases() {
  const { userProfile } = useAuth();
  const { showConfirm } = useDeleteToast();
  const { config: globalConfig, currencySymbol } = useLocalization();
  const taxLabel = globalConfig?.tax_type || 'GST';
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const searchInputRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [isGstPurchase, setIsGstPurchase] = useState(true);

  const [newPurchase, setNewPurchase] = useState({
    id: '',
    supplierId: '',
    supplierName: '',
    items: [],
    paymentMode: 'cash',
    status: 'paid',
    orderStatus: 'Available',
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);

  const generateNextPurchaseId = () => {
    const prefix = 'PUR';
    const existingIds = purchases
      .map(p => p.purchaseNumber || '')
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, '')))
      .filter(num => !isNaN(num));
    
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAddPurchase(false);
        setShowViewModal(false);
      }
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowAddPurchase(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (userProfile?.branchId) {
      SettingsService.getConfig(userProfile.branchId, setConfig);
      const unsubPurchases = PurchaseService.getPurchases(userProfile.branchId, setPurchases);
      const unsubSuppliers = SupplierService.getSuppliers(userProfile.branchId, setSuppliers);
      const unsubProducts = ProductService.getProducts(userProfile.branchId, setProducts);
      return () => {
        unsubPurchases();
        unsubSuppliers();
        unsubProducts();
      };
    }
  }, [userProfile?.branchId]);

  useEffect(() => {
    if (config) {
      setIsGstPurchase(config.enableGst ?? true);
    }
  }, [config]);

  const addItem = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const existingItemIndex = newPurchase.items.findIndex(item => item.id === product.id);
    if (existingItemIndex > -1) {
      const updatedItems = [...newPurchase.items];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].price;
      setNewPurchase({ ...newPurchase, items: updatedItems });
    } else {
      const newItem = {
        id: product.id,
        name: product.name,
        quantity: quantity,
        price: product.purchasePrice,
        tax: isGstPurchase ? (product.purchasePrice * product.gstPercent / 100) * quantity : 0,
        total: isGstPurchase ? (product.purchasePrice * (1 + product.gstPercent / 100)) * quantity : (product.purchasePrice * quantity)
      };
      setNewPurchase({ ...newPurchase, items: [...newPurchase.items, newItem] });
    }
    setSelectedProduct('');
    setQuantity(1);
  };

  const removeItem = (index) => {
    const updatedItems = newPurchase.items.filter((_, i) => i !== index);
    setNewPurchase({ ...newPurchase, items: updatedItems });
  };

  const totals = newPurchase.items.reduce((acc, item) => ({
    subtotal: acc.subtotal + (item.price * item.quantity),
    tax: acc.tax + item.tax,
    total: acc.total + item.total
  }), { subtotal: 0, tax: 0, total: 0 });

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId || !newPurchase.supplierId || newPurchase.items.length === 0) return;

    setIsSubmitting(true);
    try {
      const purchaseId = newPurchase.id || generateNextPurchaseId();
      const supplier = suppliers.find(s => s.id === newPurchase.supplierId);
      const finalStatus = newPurchase.paymentMode === 'credit' ? 'pending' : 'paid';
      
      await PurchaseService.createPurchase(userProfile.branchId, {
        ...newPurchase,
        id: purchaseId,
        supplierName: supplier?.name || '',
        subtotal: totals.subtotal,
        totalTax: totals.tax,
        totalAmount: totals.total,
        branchId: userProfile.branchId,
        date: new Date(),
        purchaseNumber: purchaseId,
        isGst: isGstPurchase,
        status: finalStatus
      });
      setShowAddPurchase(false);
      setNewPurchase({
        id: '',
        supplierId: '',
        supplierName: '',
        items: [],
        paymentMode: 'cash',
        status: 'paid',
        orderStatus: 'Available'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePurchase = (id) => {
    if (!userProfile?.branchId || !id) return;
    showConfirm('Purchase Record', 'Are you sure you want to delete this purchase record? The transaction will be soft-deleted and archived.', async () => {
      await PurchaseService.deletePurchase(userProfile.branchId, id);
    });
  };

  const handleUpdateOrderStatus = async (id, newStatus) => {
    if (!userProfile?.branchId) return;
    try {
      await PurchaseService.updateOrderStatus(userProfile.branchId, id, newStatus);
    } catch (error) {
      console.error("Update status failed", error);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const t = translations[config?.language || 'English'] || translations.English;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.purchases}</h2>
          <p className="text-slate-500">{t.order_details || 'Manage inward supply and bills'}</p>
        </div>
        <button 
          onClick={() => setShowAddPurchase(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={18} />
          {t.add_voucher || 'New Entry'} (Alt+N)
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder={`${t.search} ${t.supplier} or ${t.bill_no} (F1)...`} 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-100">
            <Filter size={16} />
            {t.filters || 'Filter'}
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-100">
            <Calendar size={16} />
            This Month
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-6 py-4">{t.bill_no}</th>
                <th className="px-6 py-4">{t.supplier}</th>
                <th className="px-6 py-4">{t.date}</th>
                <th className="px-6 py-4">{t.amount}</th>
                <th className="px-6 py-4">{t.payment_mode}</th>
                <th className="px-6 py-4">{t.status}</th>
                <th className="px-6 py-4">{t.order_status || 'Order Status'}</th>
                <th className="px-6 py-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-blue-600 font-semibold">{purchase.purchaseNumber}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Truck size={14} />
                      </div>
                      <span className="font-semibold text-slate-700 text-sm">{purchase.supplierName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {purchase.date?.toDate?.() ? purchase.date.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-sm">{currencySymbol}{purchase.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 uppercase text-[10px] font-bold text-slate-500 tracking-wider font-mono">
                    {purchase.paymentMode}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                       "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                       purchase.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {purchase.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={purchase.orderStatus || 'Available'}
                      onChange={(e) => handleUpdateOrderStatus(purchase.id, e.target.value)}
                      className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-lg border-none outline-none focus:ring-2 focus:ring-blue-100",
                        purchase.orderStatus === 'Delivered' ? "bg-emerald-50 text-emerald-600" :
                        purchase.orderStatus === 'On the Way' ? "bg-blue-50 text-blue-600" :
                        purchase.orderStatus === 'Packed' ? "bg-purple-50 text-purple-600" :
                        purchase.orderStatus === 'Out of Stock' ? "bg-red-50 text-red-600" :
                        "bg-slate-50 text-slate-600"
                      )}
                    >
                      <option value="Available">Available</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="Packed">Packed</option>
                      <option value="On the Way">On the Way</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      <button 
                        onClick={() => {
                          setViewingPurchase(purchase);
                          setShowViewModal(true);
                        }}
                        className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeletePurchase(purchase.id)}
                        className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        <ShoppingBag size={24} />
                      </div>
                      <p className="text-slate-400 text-sm">No {t.purchases.toLowerCase()} recorded yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Entry Modal */}
      <AnimatePresence>
        {showAddPurchase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t.new_product} {t.supplier} {t.bill_no}</h3>
                </div>
                <button onClick={() => setShowAddPurchase(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreatePurchase} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between items-center">
                       <span>{t.bill_no}</span>
                       <button 
                        type="button" 
                        onClick={() => setNewPurchase({...newPurchase, id: generateNextPurchaseId()})}
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        {t.auto}
                      </button>
                    </label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. PUR-001"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={newPurchase.id}
                      onChange={e => setNewPurchase({...newPurchase, id: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.select_supplier}</label>
                    <select 
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={newPurchase.supplierId}
                      onChange={e => setNewPurchase({...newPurchase, supplierId: e.target.value})}
                    >
                      <option value="">-- {t.select_supplier} --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">GST Options</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                      <button 
                        type="button"
                        onClick={() => setIsGstPurchase(true)}
                        className={cn(
                          "flex-1 px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                          isGstPurchase ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-400"
                        )}
                      >
                        GST
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsGstPurchase(false)}
                        className={cn(
                          "flex-1 px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                          !isGstPurchase ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-400"
                        )}
                      >
                        NON-GST
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                   <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Payment Mode</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newPurchase.paymentMode}
                      onChange={e => setNewPurchase({...newPurchase, paymentMode: e.target.value})}
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="credit">Credit / Due</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newPurchase.status}
                      onChange={e => setNewPurchase({...newPurchase, status: e.target.value})}
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Order Tracking</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newPurchase.orderStatus}
                      onChange={e => setNewPurchase({...newPurchase, orderStatus: e.target.value})}
                    >
                      <option value="Available">Available</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="Packed">Packed</option>
                      <option value="On the Way">On the Way</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t.add_items}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                       <select 
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-10 overflow-y-auto font-bold"
                        value={selectedProduct}
                        onChange={e => setSelectedProduct(e.target.value)}
                      >
                        <option value="">{t.search_products}</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        min="1" 
                        placeholder={t.quantity} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        value={quantity}
                        onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                      />
                      <button 
                        type="button"
                        onClick={addItem}
                        disabled={!selectedProduct}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
                      >
                        {t.save}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {newPurchase.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{currencySymbol}{item.price} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{currencySymbol}{item.total.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">Inc. Tax</p>
                        </div>
                        <button onClick={() => removeItem(idx)} type="button" className="text-red-400 hover:text-red-500 p-2">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {newPurchase.items.length === 0 && (
                    <div className="py-8 text-center text-slate-400 italic text-sm">
                      No items added yet.
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 p-6 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-center gap-8 text-sm">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider">Subtotal:</span>
                    <span className="text-slate-900 font-bold min-w-[100px] text-right">{currencySymbol}{totals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider">Estimated {taxLabel}:</span>
                    <span className="text-slate-900 font-bold min-w-[100px] text-right">{currencySymbol}{totals.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-8 mt-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-600 font-bold uppercase tracking-wider">Total Bill:</span>
                    <span className="text-2xl font-black text-blue-600 min-w-[100px] text-right">{currencySymbol}{totals.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-8 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddPurchase(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || newPurchase.items.length === 0 || !newPurchase.supplierId}
                    className="flex-[2] px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? t.loading : t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Purchase Modal */}
      <AnimatePresence>
        {showViewModal && viewingPurchase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t.purchases} {t.order_details}</h3>
                  <p className="text-xs font-mono text-blue-600 font-bold">{t.id}: {viewingPurchase.purchaseNumber}</p>
                </div>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Supplier</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Truck size={18} />
                        </div>
                        <p className="font-bold text-slate-900">{viewingPurchase.supplierName}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">PO Date</p>
                      <p className="font-bold text-slate-700">{viewingPurchase.date?.toDate?.() ? viewingPurchase.date.toDate().toLocaleDateString() : new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Order Status</p>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest italic",
                        viewingPurchase.orderStatus === 'Delivered' ? "bg-emerald-50 text-emerald-600" :
                        viewingPurchase.orderStatus === 'On the Way' ? "bg-blue-50 text-blue-600" :
                        viewingPurchase.orderStatus === 'Packed' ? "bg-purple-50 text-purple-600" :
                        viewingPurchase.orderStatus === 'Out of Stock' ? "bg-red-50 text-red-600" :
                        "bg-slate-50 text-slate-600"
                      )}>
                        {viewingPurchase.orderStatus || 'Available'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Payment Mode</p>
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-black uppercase tracking-widest italic text-slate-600">{viewingPurchase.paymentMode}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Pay Status</p>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest italic",
                        viewingPurchase.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {viewingPurchase.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingPurchase.items?.map((item, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-center font-mono">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">{currencySymbol}{item.price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{currencySymbol}{item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-end gap-2 pt-4 border-t border-slate-100">
                  <div className="flex gap-12 text-sm">
                    <span className="text-slate-400 font-bold italic uppercase tracking-widest text-[10px]">Subtotal:</span>
                    <span className="font-bold text-slate-700 w-24 text-right">{currencySymbol}{viewingPurchase.subtotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-12 text-sm">
                    <span className="text-slate-400 font-bold italic uppercase tracking-widest text-[10px]">{taxLabel} Estimate:</span>
                    <span className={cn("font-bold text-slate-700 w-24 text-right", viewingPurchase.isGst === false && "line-through opacity-50")}>
                      {currencySymbol}{viewingPurchase.totalTax?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-12 pt-2 border-t border-slate-100">
                    <span className="text-blue-600 font-black italic uppercase tracking-widest text-xs">Total Amount:</span>
                    <span className="text-xl font-black text-blue-600 w-24 text-right">{currencySymbol}{viewingPurchase.totalAmount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all italic shadow-lg shadow-blue-100"
                >
                  Back to List
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
