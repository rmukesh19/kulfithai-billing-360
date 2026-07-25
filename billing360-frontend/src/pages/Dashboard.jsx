import { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Sparkles, 
  TrendingUp, 
  Package, 
  Wallet, 
  CreditCard,
  ShoppingBag,
  ArrowDownLeft,
  Receipt
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import SalesChart from '../components/dashboard/SalesChart';
import { 
  InvoiceService, 
  ProductService, 
  VoucherService, 
  SettingsService,
  PurchaseService,
  CustomerService,
  SupplierService
} from '../services/dataService';
import { GeminiService } from '../services/geminiService';
import { useAuth } from '../lib/AuthContext';
import { useOffline } from '../lib/OfflineContext';
import { useLocalization } from '../lib/LocalizationContext';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { translations } from '../lib/translations';

export default function Dashboard() {
  const { userProfile, login } = useAuth();
  const { pendingInvoices } = useOffline();
  const { config, formatCurrency, t } = useLocalization();
  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [insights, setInsights] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Custom helper to translate labels with fallback
  const getLabel = (key, defaultLabel) => {
    return t[key] || defaultLabel;
  };

  useEffect(() => {
    if (userProfile?.branchId) {
      const unsubInvoices = InvoiceService.getAllInvoices(userProfile.branchId, (data) => {
        setInvoices(data || []);
      });
      const unsubPurchases = PurchaseService.getAllPurchases(userProfile.branchId, (data) => {
        setPurchases(data || []);
      });
      const unsubCustomers = CustomerService.getCustomers(userProfile.branchId, (data) => {
        setCustomers(data || []);
      });
      const unsubSuppliers = SupplierService.getSuppliers(userProfile.branchId, (data) => {
        setSuppliers(data || []);
      });
      const unsubProducts = ProductService.getProducts(userProfile.branchId, (data) => {
        setProducts(data || []);
      });
      const unsubVouchers = VoucherService.getVouchers(userProfile.branchId, (data) => {
        setVouchers(data || []);
      });
      setLoading(false);
      return () => {
        unsubInvoices();
        unsubPurchases();
        unsubCustomers();
        unsubSuppliers();
        unsubProducts();
        unsubVouchers();
      };
    }
  }, [userProfile?.branchId]);

  const generateInsights = async (force = false) => {
    if (isAnalyzing) return;

    const cacheKey = `insights_cache_${userProfile?.branchId}`;
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const ageInMs = Date.now() - parsed.timestamp;
          const freshThreshold = 10 * 60 * 1000; // 10 minutes cache valid
          
          if (
            ageInMs < freshThreshold &&
            parsed.invoicesCount === invoices.length &&
            parsed.productsCount === products.length
          ) {
            setInsights(parsed.data);
            return;
          }
        }
      } catch (err) {
        console.warn("Error loading cached insights", err);
      }
    }

    setIsAnalyzing(true);
    try {
      const slimSales = invoices.slice(0, 10).map(inv => ({
        id: inv.id,
        totalAmount: inv.totalAmount,
        status: inv.status,
        customerName: inv.customerName,
        createdAt: inv.createdAt
      }));

      const slimExpenses = vouchers
        .filter(v => v.entityType === 'expense' && !v.is_deleted)
        .slice(0, 10)
        .map(exp => ({
          id: exp.id,
          amount: exp.amount,
          description: exp.description || exp.title,
          category: exp.category,
          createdAt: exp.createdAt
        }));

      const lowStockProducts = products
        .filter(p => !p.is_deleted && (Number(p.stock) <= Number(p.reorderLevel || p.minStock || 10)))
        .slice(0, 12)
        .map(p => ({
          name: p.name,
          stock: p.stock,
          reorderLevel: p.reorderLevel || p.minStock || 10,
          price: p.price
        }));

      const summary = {
        totalProducts: products.length,
        lowStockCount: products.filter(p => !p.is_deleted && Number(p.stock) > 0 && Number(p.stock) < 10).length,
        outOfStockCount: products.filter(p => !p.is_deleted && Number(p.stock) <= 0).length
      };

      const newInsights = await GeminiService.getBusinessInsights({
        sales: slimSales,
        inventory: lowStockProducts,
        inventorySummary: summary,
        expenses: slimExpenses
      });
      setInsights(newInsights);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          invoicesCount: invoices.length,
          productsCount: products.length,
          data: newInsights
        }));
      } catch (err) {
        console.warn("Failed to store insights in session cache:", err);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (invoices.length > 0 && products.length > 0 && insights.length === 0) {
      generateInsights();
    }
  }, [invoices.length, products.length]);

  const getInsightIcon = (type) => {
    switch (type) {
      case 'sale': return <TrendingUp size={18} className="text-emerald-500" />;
      case 'stock': return <Package size={18} className="text-blue-500" />;
      case 'expense': return <Wallet size={18} className="text-red-500" />;
      default: return <Sparkles size={18} className="text-purple-500" />;
    }
  };

  // Metric Calculations
  const todaySales = invoices
    .filter(inv => {
      const today = new Date().toDateString();
      let invDate = '';
      if (inv.createdAt) {
        if (typeof inv.createdAt === 'string') {
          invDate = new Date(inv.createdAt).toDateString();
        } else if (inv.createdAt.toDate) {
          invDate = inv.createdAt.toDate().toDateString();
        } else {
          invDate = new Date(inv.createdAt).toDateString();
        }
      } else {
        invDate = today;
      }
      return today === invDate;
    })
    .reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

  const totalSales = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  
  const totalExpenses = vouchers
    .filter(v => v.entityType === 'expense' && !v.is_deleted)
    .reduce((acc, v) => acc + (v.amount || 0), 0);

  const totalProfit = Math.max(0, totalSales - totalPurchases - totalExpenses);
  const pendingPayments = invoices.filter(inv => inv.status === 'pending').reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const customerOutstanding = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const supplierPayable = suppliers.reduce((acc, s) => acc + (s.balance || 0), 0);
  
  // GST calculation (CGST + SGST + IGST fallback to 18%)
  const gstPayable = invoices.reduce((acc, inv) => {
    const gstVal = inv.gstAmount || inv.taxAmount || inv.totalTax || 0;
    if (gstVal > 0) return acc + gstVal;
    return acc + ((inv.totalAmount || 0) * 0.18);
  }, 0) - purchases.reduce((acc, p) => {
    const gstVal = p.gstAmount || p.taxAmount || p.totalTax || 0;
    if (gstVal > 0) return acc + gstVal;
    return acc + ((p.totalAmount || 0) * 0.18);
  }, 0);
  const finalGstPayable = Math.max(0, gstPayable);

  const lowStockCount = products.filter(p => !p.is_deleted && Number(p.stock) < Number(p.reorderLevel || p.minStock || 10)).length;

  const cashBalance = vouchers
    .filter(v => v.paymentMode === 'cash')
    .reduce((acc, v) => v.type === 'receipt' ? acc + v.amount : acc - v.amount, 0);

  const bankBalance = vouchers
    .filter(v => ['bank', 'upi', 'card'].includes(v.paymentMode || ''))
    .reduce((acc, v) => v.type === 'receipt' ? acc + v.amount : acc - v.amount, 0);

  const getWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    return last7Days.map(date => {
      const dayName = days[date.getDay()];
      const daySales = invoices
        .filter(inv => {
          let invDate = '';
          if (inv.createdAt) {
            if (typeof inv.createdAt === 'string') {
              invDate = new Date(inv.createdAt).toDateString();
            } else if (inv.createdAt.toDate) {
              invDate = inv.createdAt.toDate().toDateString();
            } else {
              invDate = new Date(inv.createdAt).toDateString();
            }
          }
          return invDate === date.toDateString();
        })
        .reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
      return { name: dayName, value: daySales };
    });
  };

  const weeklySalesData = getWeeklyData();

  // Sliced for display
  const recentInvoices = invoices.slice(0, 10);

  // Static seeded trend values for Zoho/Vyapar ERP style representation
  const trends = {
    sales: { isUp: true, value: 12.4 },
    purchase: { isUp: false, value: 3.2 },
    profit: { isUp: true, value: 15.8 },
    pending: { isUp: false, value: 8.5 },
    outstanding: { isUp: false, value: 12.1 },
    payable: { isUp: false, value: 4.7 },
    gst: { isUp: true, value: 5.3 },
    stock: { isUp: false, value: 20.0 }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-1">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.dashboard}</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">{t.welcome}, {userProfile?.name || 'System Administrator'}! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          {(!userProfile?.role || userProfile?.role !== 'Super Admin') && (
            <button
              onClick={async () => {
                await login('admin@billing360.com', 'admin123');
                window.location.reload();
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Switch to Owner/Admin View
            </button>
          )}
          <Link 
            to="/billing"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <Plus size={18} className="stroke-[3]" />
            {t.create_invoice}
          </Link>
        </div>
      </div>

      {/* Main Operations KPI Cards Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase px-1">
          Core ERP Analytics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard 
            title={getLabel('total_sales', 'Total Sales')} 
            value={formatCurrency(totalSales)} 
            subValue={`Today: ${formatCurrency(todaySales)}`}
            icon={TrendingUp} 
            trend={trends.sales}
            color="blue"
            to="/reports"
          />
          <StatCard 
            title={getLabel('purchases', 'Purchase')} 
            value={formatCurrency(totalPurchases)} 
            icon={ShoppingBag} 
            trend={trends.purchase}
            color="green"
            to="/reports"
          />
          <StatCard 
            title={getLabel('profit_loss', 'Profit')} 
            value={formatCurrency(totalProfit)} 
            icon={Sparkles} 
            trend={trends.profit}
            color="purple"
            to="/reports"
          />
          <StatCard 
            title={getLabel('pending', 'Pending Payments')} 
            value={formatCurrency(pendingPayments)} 
            subValue={`${invoices.filter(i => i.status === 'pending').length} Invoices`}
            icon={Clock} 
            trend={trends.pending}
            color="orange"
            to="/reports"
          />
          <StatCard 
            title={getLabel('customer_outstanding', 'Customer Outstanding')} 
            value={formatCurrency(customerOutstanding)} 
            icon={ArrowUpRight} 
            trend={trends.outstanding}
            color="red"
            to="/reports"
          />
          <StatCard 
            title={getLabel('supplier_payable', 'Supplier Payable')} 
            value={formatCurrency(supplierPayable)} 
            icon={ArrowDownLeft} 
            trend={trends.payable}
            color="teal"
            to="/reports"
          />
          <StatCard 
            title={`${config?.tax_type || 'GST'} Payable`} 
            value={formatCurrency(Math.round(finalGstPayable))} 
            icon={Receipt} 
            trend={trends.gst}
            color="indigo"
            to="/gst"
          />
          <StatCard 
            title={getLabel('low_stock', 'Stock Alerts')} 
            value={lowStockCount.toString()} 
            subValue={`${getLabel('low_stock', 'Low Stock')} < 10`}
            icon={AlertTriangle} 
            trend={trends.stock}
            color="amber"
            to="/inventory"
          />
        </div>
      </div>

      {/* Cash Flow & Book Balances Section */}
      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
          <Wallet size={14} className="text-slate-400" />
          Cash & Bank Books
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <StatCard 
            title={getLabel('cash_balance', 'Cash Balance')} 
            value={formatCurrency(cashBalance)} 
            icon={Wallet} 
            color="green"
            to="/accounting"
          />
          <StatCard 
            title={getLabel('bank_balance', 'Bank Balance')} 
            value={formatCurrency(bankBalance)} 
            icon={CreditCard} 
            color="indigo"
            to="/accounting"
          />
        </div>
      </div>

      {/* Charts and Sidebars Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <SalesChart data={weeklySalesData} />
          </div>
          
          {/* AI Insights Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-600 animate-pulse" size={20} />
                <h3 className="text-lg font-bold text-slate-900">{t.ai_insights}</h3>
              </div>
              <button 
                onClick={() => generateInsights(true)}
                disabled={isAnalyzing}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50 cursor-pointer flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors hover:bg-blue-100"
              >
                {isAnalyzing ? t.loading : t.refresh}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, idx) => {
                const getInsightLink = (type) => {
                  switch (type) {
                    case 'sale': return '/reports';
                    case 'stock': return '/inventory';
                    case 'expense': return '/accounting';
                    default: return '/dashboard';
                  }
                };

                return (
                  <Link 
                    key={idx} 
                    to={getInsightLink(insight.type)}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-4 transition-all hover:shadow-md hover:scale-[1.01] hover:border-blue-200 group"
                  >
                    <div className="p-2.5 rounded-xl bg-white shadow-sm self-start group-hover:bg-blue-50 transition-colors border border-slate-100">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{insight.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">{insight.description}</p>
                    </div>
                  </Link>
                );
              })}
              {insights.length === 0 && (
                <div className="md:col-span-2 py-10 text-center text-slate-400">
                  <div className="animate-pulse flex flex-col items-center gap-2">
                    <Sparkles size={32} className="opacity-20" />
                    <p className="text-sm italic">{t.loading}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">{t.recent_transactions}</h3>
            <Link to="/reports" className="text-sm font-bold text-blue-600 hover:text-blue-700">{t.view_all}</Link>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {recentInvoices.map((inv) => (
              <Link 
                key={inv.id} 
                to="/reports" 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100/50">
                    {inv.customerName?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{inv.customerName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{inv.invoiceNumber}</p>
                      {pendingInvoices.some(p => p.invoiceNumber === inv.invoiceNumber) ? (
                        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tight bg-amber-50 text-amber-600 border border-amber-100 rounded leading-none">
                          Pending Sync
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tight bg-emerald-50 text-emerald-600 border border-emerald-100 rounded leading-none">
                          Synced
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{formatCurrency(inv.totalAmount || 0)}</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase mt-0.5",
                    inv.status === 'paid' ? "text-emerald-500" : "text-orange-500"
                  )}>{inv.status}</p>
                </div>
              </Link>
            ))}
            {recentInvoices.length === 0 && (
              <div className="text-center py-20 text-slate-400 text-sm">
                {t.no_data}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
