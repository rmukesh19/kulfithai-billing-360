import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Plus, Download, Edit2, Trash2, Package, Tag, X, Eye, Barcode, Printer, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductService, BranchService, CategoryService, SettingsService } from '../services/dataService';
import { useAuth } from '../lib/AuthContext';
import { useDeleteToast } from '../lib/DeleteToastContext';
import { translations } from '../lib/translations';
import { useLocalization } from '../lib/LocalizationContext';


export default function Inventory() {
  const { userProfile } = useAuth();
  const { showConfirm } = useDeleteToast();
  const { config: globalConfig, currencySymbol } = useLocalization();
  const taxLabel = globalConfig?.tax_type || 'GST';
  const [activeTab, setActiveTab] = useState('all');
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef(null);

  const [newProduct, setNewProduct] = useState({
    id: '',
    name: '',
    sku: '',
    barcode: '',
    hsn: '',
    gstPercent: 18,
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    wholesalePrice: 0,
    stock: 0,
    openingStock: 0,
    unit: 'pcs',
    category: '',
    brand: '',
    image: '',
    batchNumber: '',
    expiryDate: '',
    size: '',
    color: '',
    serialNumbers: []
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowViewModal(false);
        setShowTransferModal(false);
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

  useEffect(() => {
    if (userProfile?.branchId) {
      const unsubscribe = ProductService.getProducts(userProfile.branchId, (data) => {
        setProducts(data);
      });
      const unsubscribeBranches = BranchService.getBranches((data) => {
        setBranches(data);
      });
      const unsubscribeCategories = CategoryService.getCategories(userProfile.branchId, (data) => {
        setCategories(data);
      });
      const unsubscribeConfig = SettingsService.getConfig(userProfile.branchId, (data) => {
        setConfig(data);
      });
      return () => {
        unsubscribe();
        unsubscribeBranches();
        unsubscribeCategories();
        unsubscribeConfig();
      };
    }
  }, [userProfile?.branchId]);

  const [transferData, setTransferData] = useState({
    productId: '',
    toBranchId: '',
    quantity: 0
  });

  const t = translations[config?.language || 'English'] || translations.English;

  const handleImageUpload = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) {
        alert("Image size too large. Please select an image smaller than 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        if (isEdit && editingProduct) {
          setEditingProduct({ ...editingProduct, image: base64String });
        } else {
          setNewProduct({ ...newProduct, image: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateBarcode = (isEdit = false) => {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    const timestamp = Date.now().toString().slice(-4);
    const code = `8${randomNum}${timestamp}`;
    if (isEdit && editingProduct) {
      setEditingProduct({ ...editingProduct, barcode: code });
    } else {
      setNewProduct({ ...newProduct, barcode: code });
    }
  };

  const generateNextId = (prefix = 'PRD') => {
    const existingIds = products
      .map(p => p.id || '')
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, '')))
      .filter(num => !isNaN(num));
    
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const generateNextSku = () => {
    const prefix = 'SKU';
    const existingSkus = products
      .map(p => p.sku || '')
      .filter(sku => sku.startsWith(prefix))
      .map(sku => parseInt(sku.replace(prefix, '')))
      .filter(num => !isNaN(num));
    
    const nextNum = existingSkus.length > 0 ? Math.max(...existingSkus) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const handlePrintBarcode = (product) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${product.barcode || product.sku}&scale=3&rotate=N&includetext`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode - ${product.name}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; }
            .label { border: 1px dashed #ccc; padding: 25px; border-radius: 8px; text-align: center; width: 320px; background: white; }
            .name { font-weight: 900; font-size: 20px; margin-bottom: 5px; text-transform: uppercase; color: #1e293b; }
            .sku { color: #64748b; font-size: 11px; margin-bottom: 5px; font-family: monospace; }
            .price { font-size: 28px; font-weight: 900; margin: 15px 0; color: #000; }
            .barcode-img { width: 100%; max-height: 80px; object-fit: contain; margin-bottom: 5px; }
            .barcode-num { font-family: monospace; font-size: 12px; letter-spacing: 3px; color: #475569; }
            @media print {
              body { height: auto; padding: 0; }
              .label { border: none; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="name">${product.name}</div>
            <div class="sku">SKU: ${product.sku}</div>
            <div class="price">${currencySymbol}${product.sellingPrice}</div>
            <img class="barcode-img" src="${barcodeUrl}" alt="Barcode" />
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId || !transferData.productId || !transferData.toBranchId) return;
    setIsSubmitting(true);
    try {
      alert('Stock transfer initiated. Stock will be adjusted in current branch.');
      setShowTransferModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId) return;
    
    setIsSubmitting(true);
    try {
      const finalProduct = { ...newProduct };
      
      if (finalProduct.expiryDate) {
        const expDate = new Date(finalProduct.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          if (!window.confirm('The expiry date is in the past. Are you sure you want to add this product?')) {
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (!finalProduct.sku) finalProduct.sku = generateNextSku();
      if (!finalProduct.barcode) {
        const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();
        finalProduct.barcode = `8${randomNum}${Date.now().toString().slice(-4)}`;
      }

      await ProductService.addProduct(userProfile.branchId, {
        ...finalProduct,
        branchId: userProfile.branchId
      });

      setShowAddModal(false);
      setNewProduct({
        id: '', name: '', sku: '', barcode: '', hsn: '', gstPercent: 18,
        purchasePrice: 0, sellingPrice: 0, mrp: 0, wholesalePrice: 0, stock: 0, unit: 'pcs',
        category: '', brand: '', image: '', batchNumber: '', expiryDate: '', size: '', color: '', serialNumbers: [], openingStock: 0
      });

      // Refresh product list from API
      const { data } = await axios.get(`/api/products?branchId=${userProfile.branchId}`);
      if (data?.success) setProducts(data.data);
    } catch (err) {
      alert(`Failed to add product: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId || !editingProduct?.id) return;
    
    setIsSubmitting(true);
    try {
      if (editingProduct.expiryDate) {
        const expDate = new Date(editingProduct.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          if (!window.confirm('The expiry date is in the past. Are you sure you want to update this product?')) {
            setIsSubmitting(false);
            return;
          }
        }
      }
      await ProductService.updateProduct(userProfile.branchId, editingProduct.id, editingProduct);
      setShowEditModal(false);
      setEditingProduct(null);

      // Refresh product list from API
      const { data } = await axios.get(`/api/products?branchId=${userProfile.branchId}`);
      if (data?.success) setProducts(data.data);
    } catch (err) {
      alert(`Failed to update product: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = (id) => {
    if (!userProfile?.branchId || !id) return;
    showConfirm('Product', 'Are you sure you want to delete this product?', async () => {
      try {
        await ProductService.deleteProduct(userProfile.branchId, id);
        // Refresh list
        const { data } = await axios.get(`/api/products?branchId=${userProfile.branchId}`);
        if (data?.success) setProducts(data.data);
      } catch (err) {
        alert(`Failed to delete product: ${err?.response?.data?.message || err?.message}`);
      }
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeTab === 'low') return p.stock > 0 && p.stock < 10;
    if (activeTab === 'out') return p.stock === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t.inventory}</h2>
          <p className="text-xs sm:text-slate-500 font-medium">{t.settings}</p>
        </div>
        <div className="grid grid-cols-2 xs:flex items-center gap-2 sm:gap-3">
          <button className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            <Download size={16} />
            <span className="hidden xs:inline">{t.refresh}</span>
          </button>
          <button 
            onClick={() => setShowTransferModal(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <Tag size={16} />
            <span className="hidden xs:inline">{t.accounting}</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="col-span-2 xs:col-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-100 cursor-pointer"
          >
            <Plus size={18} />
            {t.new_product}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white">
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('all')} className={cn("flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer", activeTab === 'all' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {t.all} ({products.length})
            </button>
            <button onClick={() => setActiveTab('low')} className={cn("flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer", activeTab === 'low' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {t.low_stock} ({products.filter(p => p.stock > 0 && p.stock < 10).length})
            </button>
            <button onClick={() => setActiveTab('out')} className={cn("flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer", activeTab === 'out' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {t.out_of_stock || 'Out'} ({products.filter(p => p.stock === 0).length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={16} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={t.search} 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all font-medium" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-6 py-4 italic text-xs tracking-normal font-black">ID</th>
                <th className="px-6 py-4">Product Info</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock Status</th>
                <th className="px-6 py-4">SKU/HSN</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-slate-400 font-bold">{product.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <p className="text-[10px] text-slate-400 font-mono italic">{product.sku}</p>
                          {product.size && <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-600 font-black">S: {product.size}</span>}
                          {product.color && <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-600 font-black">C: {product.color}</span>}
                          {product.expiryDate && (
                            <span className={cn(
                              "text-[9px] px-1 rounded font-black",
                              new Date(product.expiryDate) < new Date() ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                            )}>
                              EXP: {product.expiryDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      <Tag size={12} />
                      {product.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm">{currencySymbol}{product.sellingPrice?.toLocaleString()}</p>
                    {product.mrp && product.mrp > product.sellingPrice && (
                      <p className="text-[10px] text-slate-400 line-through">MRP: {currencySymbol}{product.mrp.toLocaleString()}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className={cn(
                          product.stock === 0 ? "text-red-500" : product.stock < 10 ? "text-orange-500" : "text-emerald-500"
                        )}>
                          {product.stock} {product.unit} Available
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      <button 
                        onClick={() => handlePrintBarcode(product)}
                        className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="Print Barcode"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setViewingProduct(product);
                          setShowViewModal(true);
                        }}
                        className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setShowEditModal(true);
                        }}
                        className="p-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No products found. Start by adding a new product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                <h3 className="text-xl font-bold text-slate-900">{t.new_product}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  x
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                      <span>{t.sku} ID</span>
                      <button 
                        type="button" 
                        onClick={() => setNewProduct({...newProduct, id: generateNextId('PRD')})}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Auto
                      </button>
                    </label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" placeholder="e.g. PRD001" value={newProduct.id} onChange={e => setNewProduct({...newProduct, id: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.product_name}</label>
                    <input required type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                      <span>{t.sku}</span>
                      <button 
                        type="button" 
                        onClick={() => setNewProduct({...newProduct, sku: generateNextSku()})}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Auto
                      </button>
                    </label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" placeholder="e.g. SKU001" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                      <span>{t.barcode}</span>
                      <button 
                        type="button" 
                        onClick={() => generateBarcode(false)}
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Barcode size={10} /> Auto
                      </button>
                    </label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="text" className="w-full pl-10 pr-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} placeholder={t.search} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.hsn_sac}</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={newProduct.hsn} onChange={e => setNewProduct({...newProduct, hsn: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.brand}</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.tax} %</label>
                    <select className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.gstPercent} onChange={e => setNewProduct({...newProduct, gstPercent: parseFloat(e.target.value)})}>
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.category}</label>
                    <select 
                      className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" 
                      value={newProduct.category} 
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    >
                      <option value="">{t.category}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.unit}</label>
                    <select className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})}>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="mtr">Meters (mtr)</option>
                      <option value="box">Boxes</option>
                      <option value="set">Sets</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Purchase Price</label>
                    <input required type="number" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Selling Price</label>
                    <input required type="number" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.sellingPrice} onChange={e => setNewProduct({...newProduct, sellingPrice: parseFloat(e.target.value) || 0})} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase text-blue-600">MRP (Max Price)</label>
                    <input type="number" className="w-full px-4 py-2 border border-blue-100 rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase text-indigo-600">Wholesale Price</label>
                    <input type="number" className="w-full px-4 py-2 border border-indigo-100 rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.wholesalePrice} onChange={e => setNewProduct({...newProduct, wholesalePrice: parseFloat(e.target.value) || 0})} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Opening Stock</label>
                    <input required type="number" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.openingStock} onChange={e => setNewProduct({...newProduct, openingStock: parseInt(e.target.value) || 0, stock: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Product Image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {newProduct.image ? (
                          <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          id="product-image-upload" 
                          onChange={(e) => handleImageUpload(e)}
                        />
                        <label 
                          htmlFor="product-image-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-pointer transition-colors"
                        >
                          <Plus size={14} />
                          Upload Image
                        </label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none text-xs font-bold" 
                          value={newProduct.image} 
                          onChange={e => setNewProduct({...newProduct, image: e.target.value})} 
                          placeholder="Or paste image URL"
                        />
                      </div>
                    </div>
                  </div>

                  {config?.businessType === 'Apparel/Footwear' && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Size</label>
                        <select className="w-full px-4 py-2 border rounded-xl" value={newProduct.size} onChange={e => setNewProduct({...newProduct, size: e.target.value})}>
                          <option value="">Select Size</option>
                          <option value="S">Small (S)</option>
                          <option value="M">Medium (M)</option>
                          <option value="L">Large (L)</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                          <option value="10">10</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Color</label>
                        <input type="text" className="w-full px-4 py-2 border rounded-xl" value={newProduct.color} onChange={e => setNewProduct({...newProduct, color: e.target.value})} placeholder="e.g. Red, Blue" />
                      </div>
                    </div>
                  )}

                  {(['Grocery/FMCG', 'Pharmacy/Pharma', 'Restaurant/Cafe'].includes(config?.businessType || '')) && (
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          Batch Number
                          <span className="text-[8px] bg-slate-100 px-1 py-0.5 rounded">Tracking</span>
                        </label>
                        <input type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.batchNumber} onChange={e => setNewProduct({...newProduct, batchNumber: e.target.value})} placeholder="e.g. BATCH-001" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          Expiry Date
                          <span className="text-[8px] bg-red-50 text-red-500 px-1 py-0.5 rounded font-black">Alert</span>
                        </label>
                        <input type="date" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={newProduct.expiryDate} onChange={e => setNewProduct({...newProduct, expiryDate: e.target.value})} />
                      </div>
                    </div>
                  )}

                  {config?.businessType === 'Electronics/Mobile' && (
                    <div className="col-span-2 flex items-center gap-2 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                      <input 
                        type="checkbox" 
                        id="serial-track" 
                        className="rounded text-blue-600" 
                        checked={newProduct.serialNumbers && newProduct.serialNumbers.length > 0} 
                        onChange={e => setNewProduct({...newProduct, serialNumbers: e.target.checked ? ['REPLACE_ME'] : []})} 
                      />
                      <label htmlFor="serial-track" className="text-xs font-bold text-blue-600 uppercase">Enable IMEI/Serial Number Tracking</label>
                    </div>
                  )}
                </div>
                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer">{t.cancel}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50">
                    {isSubmitting ? t.loading : t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Product Modal */}
      <AnimatePresence>
        {showViewModal && viewingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-xl font-bold text-slate-900">Product Details</h3>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  x
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                <div className="flex items-center gap-6">
                   <div className="w-24 h-24 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-200">
                     {viewingProduct.image ? (
                       <img src={viewingProduct.image} alt={viewingProduct.name} className="w-full h-full object-cover rounded-2xl" />
                     ) : (
                       <Package size={40} />
                     )}
                   </div>
                   <div>
                     <h4 className="text-2xl font-black text-slate-900">{viewingProduct.name}</h4>
                     <p className="text-slate-500 font-mono text-sm">{viewingProduct.sku}</p>
                     <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest italic">{viewingProduct.category}</span>
                   </div>
                </div>

                {(viewingProduct.batchNumber || viewingProduct.expiryDate) && (
                  <div className="grid grid-cols-2 gap-4">
                     {viewingProduct.batchNumber && (
                       <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Batch Number</p>
                         <p className="text-sm font-black text-slate-700 italic">{viewingProduct.batchNumber}</p>
                       </div>
                     )}
                     {viewingProduct.expiryDate && (
                       <div className={cn(
                         "p-4 rounded-2xl border",
                         new Date(viewingProduct.expiryDate) < new Date() ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
                       )}>
                         <p className={cn(
                           "text-[9px] font-black uppercase tracking-[0.2em] mb-1 italic",
                           new Date(viewingProduct.expiryDate) < new Date() ? "text-red-400" : "text-emerald-400"
                         )}>Expiry Date</p>
                         <p className={cn(
                           "text-sm font-black italic",
                           new Date(viewingProduct.expiryDate) < new Date() ? "text-red-600" : "text-emerald-600"
                         )}>{viewingProduct.expiryDate}</p>
                       </div>
                     )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Selling Price</p>
                    <p className="text-lg font-black text-slate-900 italic">{currencySymbol}{viewingProduct.sellingPrice?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Current Stock</p>
                    <p className={cn(
                       "text-lg font-black italic",
                       viewingProduct.stock === 0 ? "text-red-500" : viewingProduct.stock < 10 ? "text-orange-500" : "text-emerald-500"
                    )}>
                      {viewingProduct.stock} {viewingProduct.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Purchase Price</p>
                    <p className="text-sm font-bold text-slate-600 italic">{currencySymbol}{viewingProduct.purchasePrice?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Margin</p>
                    <p className="text-sm font-bold text-emerald-600 italic">
                      {currencySymbol}{(viewingProduct.sellingPrice - viewingProduct.purchasePrice).toLocaleString()} (
                      {viewingProduct.purchasePrice ? (((viewingProduct.sellingPrice - viewingProduct.purchasePrice)/viewingProduct.purchasePrice) * 100).toFixed(1) : 0}%
                      )
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                   <div className="p-4 border border-slate-100 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">HSN/Commodity</p>
                      <p className="text-xs font-bold text-slate-900 italic">{viewingProduct.hsn || 'Nil'}</p>
                   </div>
                   <div className="p-4 border border-slate-100 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">{taxLabel}</p>
                      <p className="text-xs font-bold text-slate-900 italic">{viewingProduct.gstPercent}%</p>
                   </div>
                   <div className="p-4 border border-slate-100 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">MRP</p>
                      <p className="text-xs font-bold text-slate-900 italic">{currencySymbol}{viewingProduct.mrp?.toLocaleString() || 'Nil'}</p>
                   </div>
                </div>

                {(viewingProduct.size || viewingProduct.color) && (
                   <div className="flex gap-4">
                      {viewingProduct.size && (
                        <div className="flex-1 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-[0.2em] mb-1 italic">Size</p>
                          <p className="text-sm font-black text-orange-600 italic">{viewingProduct.size}</p>
                        </div>
                      )}
                      {viewingProduct.color && (
                        <div className="flex-1 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 italic">Color</p>
                          <p className="text-sm font-black text-blue-600 italic">{viewingProduct.color}</p>
                        </div>
                      )}
                   </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 overflow-x-auto no-scrollbar">
                  <button 
                   onClick={() => handlePrintBarcode(viewingProduct)}
                   className="flex-shrink-0 bg-white border border-slate-200 text-slate-700 font-bold px-4 py-3 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Printer size={14} />
                    Print Barcode
                  </button>
                  <button 
                   onClick={() => {
                     setShowViewModal(false);
                     setEditingProduct(viewingProduct);
                     setShowEditModal(true);
                   }}
                   className="flex-1 bg-white border border-slate-200 text-slate-700 font-black py-3 rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-100 transition-all italic shadow-sm cursor-pointer"
                  >
                    Edit Product
                  </button>
                  <button 
                   onClick={() => setShowViewModal(false)}
                   className="flex-1 bg-blue-600 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-700 transition-all italic shadow-lg shadow-blue-100 cursor-pointer"
                  >
                    Close
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {showEditModal && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                <h3 className="text-xl font-bold text-slate-900">Edit Product</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  x
                </button>
              </div>
              <form onSubmit={handleEditProduct} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Stock ID</label>
                    <input disabled type="text" className="w-full px-4 py-2 bg-slate-100 border rounded-xl font-bold text-slate-500 cursor-not-allowed" value={editingProduct.id} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Product Name</label>
                    <input required type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                    <input required type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={editingProduct.sku} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Barcode</label>
                    <div className="flex gap-2">
                       <div className="relative flex-1">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" className="w-full pl-10 pr-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} />
                       </div>
                       <button 
                        type="button" 
                        onClick={() => generateBarcode(true)}
                        className="px-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                        title="Generate New Barcode"
                       >
                         <RotateCcw size={16} className="text-slate-600" />
                       </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">HSN Code</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={editingProduct.hsn || ''} onChange={e => setEditingProduct({...editingProduct, hsn: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Brand</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none" value={editingProduct.brand || ''} onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">GST %</label>
                    <select className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.gstPercent} onChange={e => setEditingProduct({...editingProduct, gstPercent: parseFloat(e.target.value)})}>
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                    <select 
                      className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" 
                      value={editingProduct.category} 
                      onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Unit</label>
                    <select className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.unit} onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})}>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="mtr">Meters (mtr)</option>
                      <option value="box">Boxes</option>
                      <option value="set">Sets</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Purchase Price</label>
                    <input required type="number" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Selling Price</label>
                    <input required type="number" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.sellingPrice} onChange={e => setEditingProduct({...editingProduct, sellingPrice: parseFloat(e.target.value) || 0})} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase text-blue-600">MRP (Max Price)</label>
                    <input type="number" className="w-full px-4 py-2 border border-blue-100 rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.mrp || 0} onChange={e => setEditingProduct({...editingProduct, mrp: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase text-indigo-600">Wholesale Price</label>
                    <input type="number" className="w-full px-4 py-2 border border-indigo-100 rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.wholesalePrice || 0} onChange={e => setEditingProduct({...editingProduct, wholesalePrice: parseFloat(e.target.value) || 0})} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Current Stock</label>
                    <input required type="number" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Product Image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {editingProduct.image ? (
                          <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          id="edit-product-image-upload" 
                          onChange={(e) => handleImageUpload(e, true)}
                        />
                        <label 
                          htmlFor="edit-product-image-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-pointer transition-colors"
                        >
                          <Plus size={14} />
                          Upload Image
                        </label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none text-xs font-bold" 
                          value={editingProduct.image || ''} 
                          onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} 
                          placeholder="Or paste image URL"
                        />
                      </div>
                    </div>
                  </div>

                  {config?.businessType === 'Apparel/Footwear' && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Size</label>
                        <select className="w-full px-4 py-2 border rounded-xl" value={editingProduct.size || ''} onChange={e => setEditingProduct({...editingProduct, size: e.target.value})}>
                          <option value="">Select Size</option>
                          <option value="S">Small (S)</option>
                          <option value="M">Medium (M)</option>
                          <option value="L">Large (L)</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                          <option value="10">10</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Color</label>
                        <input type="text" className="w-full px-4 py-2 border rounded-xl" value={editingProduct.color || ''} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} placeholder="e.g. Red, Blue" />
                      </div>
                    </div>
                  )}

                  {(['Grocery/FMCG', 'Pharmacy/Pharma', 'Restaurant/Cafe'].includes(config?.businessType || '')) && (
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          Batch Number
                        </label>
                        <input type="text" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.batchNumber || ''} onChange={e => setEditingProduct({...editingProduct, batchNumber: e.target.value})} placeholder="e.g. BATCH-001" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          Expiry Date
                        </label>
                        <input type="date" className="w-full px-4 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold" value={editingProduct.expiryDate || ''} onChange={e => setEditingProduct({...editingProduct, expiryDate: e.target.value})} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors text-xs uppercase tracking-widest cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs uppercase tracking-widest cursor-pointer">
                    {isSubmitting ? 'Updating...' : 'Update Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stock Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-xl font-bold text-slate-900">Stock Transfer</h3>
                <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  x
                </button>
              </div>
              <form onSubmit={handleTransfer} className="p-6 space-y-4 bg-white">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Product to Transfer</label>
                  <select 
                    required 
                    className="w-full px-4 py-2 border rounded-xl font-bold"
                    value={transferData.productId}
                    onChange={e => setTransferData({...transferData, productId: e.target.value})}
                  >
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Destination Branch</label>
                  <select 
                    required 
                    className="w-full px-4 py-2 border rounded-xl font-bold"
                    value={transferData.toBranchId}
                    onChange={e => setTransferData({...transferData, toBranchId: e.target.value})}
                  >
                    <option value="">Select Branch</option>
                    {branches.filter(b => b.id !== userProfile?.branchId).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full px-4 py-2 border rounded-xl"
                    value={transferData.quantity}
                    onChange={e => setTransferData({...transferData, quantity: parseInt(e.target.value) || 0})}
                    max={products.find(p => p.id === transferData.productId)?.stock || 0}
                    min={1}
                  />
                </div>
                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 cursor-pointer disabled:opacity-50">
                    {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
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
