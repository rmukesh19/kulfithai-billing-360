import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Crown,
  Building2,
  Users,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Package,
  AlertTriangle,
  BarChart3,
  Activity,
  Settings,
  ChevronRight,
  Star,
  Shield,
  Zap,
  Globe,
  Clock,
  CheckCircle,
  Receipt,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Eye,
  UserCheck,
  PieChart,
  BadgeCheck,
} from 'lucide-react';
import {
  InvoiceService,
  ProductService,
  VoucherService,
  PurchaseService,
  CustomerService,
  SupplierService,
  EmployeeService,
  BranchService,
} from '../services/dataService';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useLocalization } from '../lib/LocalizationContext';
import { cn } from '../lib/utils';

// Animated Counter
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = typeof value === 'number' ? value : parseFloat(value) || 0;
    if (start === end) return;
    const duration = 900;
    const step = (end - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
      current += step;
      if ((step > 0 && current >= end) || (step < 0 && current <= end)) {
        current = end;
        clearInterval(timer);
      }
      setDisplay(current);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString('en-IN');
  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

// KPI Card
function KpiCard({ title, value, subtext, icon: Icon, gradient, trend, prefix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-2xl p-5 overflow-hidden shadow-lg border border-white/10 cursor-default',
        gradient
      )}
    >
      {/* BG orbs */}
      <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-black/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full gap-3">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur border border-white/10">
            <Icon size={18} className="text-white" />
          </div>
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full',
                trend >= 0
                  ? 'bg-emerald-400/20 text-emerald-100'
                  : 'bg-red-400/20 text-red-100'
              )}
            >
              {trend >= 0 ? (
                <TrendingUp size={10} />
              ) : (
                <TrendingDown size={10} />
              )}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div>
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-black text-white tracking-tight">
            <AnimatedNumber value={value} prefix={prefix} />
          </h3>
          {subtext && (
            <p className="text-white/60 text-xs font-medium mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Mini Branch Card
function BranchCard({ branch, invoices, employees, products }) {
  const branchInvoices = invoices.filter((i) => i.branchId === branch.id || true);
  const revenue = branchInvoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
  const empCount = employees.length;
  const prodCount = products.length;
  const lowStock = products.filter((p) => (p.stock || 0) <= (p.lowStockAlert || 5)).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-sm leading-tight">
              {branch.name || 'Branch'}
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              {branch.address || 'No address'}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
          ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Revenue', value: `₹${(revenue / 1000).toFixed(1)}K`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Staff', value: empCount, color: 'text-purple-600', bg: 'bg-purple-50' },
          {
            label: 'Low Stock',
            value: lowStock,
            color: lowStock > 0 ? 'text-red-600' : 'text-emerald-600',
            bg: lowStock > 0 ? 'bg-red-50' : 'bg-emerald-50',
          },
        ].map((stat) => (
          <div key={stat.label} className={cn('rounded-xl p-2 text-center', stat.bg)}>
            <p className={cn('font-black text-sm', stat.color)}>{stat.value}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Quick Action Button
function QuickAction({ icon: Icon, label, to, color }) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'flex flex-col items-center gap-2 p-4 rounded-2xl border cursor-pointer transition-all',
          color
        )}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">
          {label}
        </span>
      </motion.div>
    </Link>
  );
}

// Recent Activity Row
function ActivityRow({ icon: Icon, label, time, amount, color, status }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 group hover:bg-slate-50 rounded-xl px-2 transition-all">
      <div className={cn('p-2 rounded-xl flex-shrink-0', color)}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate">{label}</p>
        <p className="text-[10px] text-slate-400 font-medium">{time}</p>
      </div>
      {amount && (
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-black text-slate-900">{amount}</p>
          {status && (
            <span
              className={cn(
                'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                status === 'paid'
                  ? 'bg-emerald-50 text-emerald-600'
                  : status === 'pending'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-slate-100 text-slate-500'
              )}
            >
              {status}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { userProfile } = useAuth();
  const { formatCurrency } = useLocalization();

  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const branchId = userProfile?.branchId || 'main-branch';

  useEffect(() => {
    const unsubs = [
      InvoiceService.getAllInvoices(branchId, (d) => { setInvoices(d || []); setLoading(false); }),
      PurchaseService.getAllPurchases(branchId, (d) => setPurchases(d || [])),
      CustomerService.getCustomers(branchId, (d) => setCustomers(d || [])),
      SupplierService.getSuppliers(branchId, (d) => setSuppliers(d || [])),
      ProductService.getProducts(branchId, (d) => setProducts(d || [])),
      VoucherService.getVouchers(branchId, (d) => setVouchers(d || [])),
      EmployeeService.getEmployees(branchId, (d) => setEmployees(d || [])),
      BranchService.getBranches((d) => setBranches(d || [])),
    ];

    const timer = setTimeout(() => setLoading(false), 300);

    return () => {
      clearTimeout(timer);
      unsubs.forEach((fn) => fn && fn());
    };
  }, [branchId]);

  // ── Computed KPIs ───────────────────────────────────────────
  const totalRevenue = useMemo(
    () => invoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0),
    [invoices]
  );
  const totalPurchases = useMemo(
    () => purchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0),
    [purchases]
  );
  const totalExpenses = useMemo(
    () => vouchers.filter((v) => v.type === 'payment').reduce((s, v) => s + (Number(v.amount) || 0), 0),
    [vouchers]
  );
  const netProfit = totalRevenue - totalPurchases - totalExpenses;
  const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
  const pendingInvoices = invoices.filter((i) => i.status === 'pending').length;
  const lowStockProducts = products.filter((p) => (p.stock || 0) <= (p.lowStockAlert || 5));
  const totalDues = customers.reduce((s, c) => s + (Number(c.balance) || 0), 0);

  // ── Today's stats ────────────────────────────────────────────
  const todayStr = new Date().toDateString();
  const todayInvoices = invoices.filter((i) => new Date(i.createdAt).toDateString() === todayStr);
  const todayRevenue = todayInvoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);

  // ── Recent Transactions ───────────────────────────────────────
  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6),
    [invoices]
  );

  // ── Top Customers ─────────────────────────────────────────────
  const topCustomers = useMemo(() => {
    const map = {};
    invoices.forEach((inv) => {
      if (!inv.customerId || !inv.customerName) return;
      if (!map[inv.customerId]) map[inv.customerId] = { name: inv.customerName, total: 0, count: 0 };
      map[inv.customerId].total += Number(inv.totalAmount) || 0;
      map[inv.customerId].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [invoices]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-purple-600 uppercase tracking-widest animate-pulse">
            Loading Super Admin Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 shadow-2xl border border-purple-900/30">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/30"
            >
              <Crown size={26} className="text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/30">
                  Super Admin Portal
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Welcome back, {userProfile?.name || 'Administrator'} 👋
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                Full system overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setLastRefreshed(new Date())}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
            <Link
              to="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-black hover:bg-slate-100 transition-all shadow-lg"
            >
              <Settings size={12} />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* ── TODAY'S HIGHLIGHT ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/30">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Today's Sales</p>
            <p className="text-xl font-black text-amber-900">
              ₹<AnimatedNumber value={todayRevenue} />
            </p>
            <p className="text-[10px] text-amber-600 font-medium">{todayInvoices.length} invoices</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30">
            <CheckCircle size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Paid</p>
            <p className="text-xl font-black text-emerald-900">
              <AnimatedNumber value={paidInvoices} />
            </p>
            <p className="text-[10px] text-emerald-600 font-medium">invoices</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-400 rounded-xl shadow-lg shadow-amber-400/30">
            <Clock size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pending</p>
            <p className="text-xl font-black text-amber-900">
              <AnimatedNumber value={pendingInvoices} />
            </p>
            <p className="text-[10px] text-amber-600 font-medium">invoices</p>
          </div>
        </div>
        <div className={cn(
          'rounded-2xl p-4 flex items-center gap-3 border',
          lowStockProducts.length > 0
            ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100'
            : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-100'
        )}>
          <div className={cn('p-2.5 rounded-xl shadow-lg', lowStockProducts.length > 0 ? 'bg-red-500 shadow-red-500/30' : 'bg-slate-400 shadow-slate-400/20')}>
            <AlertTriangle size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Low Stock</p>
            <p className="text-xl font-black text-red-900">
              <AnimatedNumber value={lowStockProducts.length} />
            </p>
            <p className="text-[10px] text-red-500 font-medium">items</p>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Total Revenue" value={totalRevenue} prefix="₹" gradient="bg-gradient-to-br from-blue-600 to-indigo-700" icon={IndianRupee} />
        <KpiCard title="Net Profit" value={netProfit} prefix="₹" gradient={netProfit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} icon={TrendingUp} />
        <KpiCard title="Total Invoices" value={invoices.length} gradient="bg-gradient-to-br from-purple-600 to-violet-700" icon={Receipt} />
        <KpiCard title="Customers" value={customers.length} gradient="bg-gradient-to-br from-sky-500 to-cyan-600" icon={Users} />
        <KpiCard title="Products" value={products.length} gradient="bg-gradient-to-br from-orange-500 to-amber-600" icon={Package} />
        <KpiCard title="Employees" value={employees.length} gradient="bg-gradient-to-br from-pink-500 to-rose-600" icon={UserCheck} />
      </div>

      {/* ── QUICK ACTIONS ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900">Quick Actions</h2>
            <p className="text-xs text-slate-400 font-medium">Jump to any module instantly</p>
          </div>
          <Zap size={16} className="text-purple-500" />
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {[
            { icon: Plus, label: 'New Bill', to: '/billing', color: 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100' },
            { icon: Package, label: 'Inventory', to: '/inventory', color: 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' },
            { icon: Users, label: 'Employees', to: '/employees', color: 'bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-100' },
            { icon: ShoppingBag, label: 'Purchases', to: '/purchases', color: 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100' },
            { icon: BarChart3, label: 'Reports', to: '/reports', color: 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100' },
            { icon: PieChart, label: 'GST', to: '/gst', color: 'bg-teal-50 border-teal-100 text-teal-600 hover:bg-teal-100' },
            { icon: Wallet, label: 'Accounts', to: '/accounting', color: 'bg-pink-50 border-pink-100 text-pink-600 hover:bg-pink-100' },
            { icon: Settings, label: 'Settings', to: '/settings', color: 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100' },
          ].map((action) => (
            <QuickAction key={action.label} {...action} />
          ))}
        </div>
      </div>

      {/* ── MAIN 3-COLUMN GRID ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Recent Invoices ──────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900">Recent Invoices</h2>
              <p className="text-xs text-slate-400 font-medium">Latest billing activity</p>
            </div>
            <Link
              to="/billing"
              className="text-[10px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase tracking-wider transition-colors"
            >
              View All <ChevronRight size={12} />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="text-center py-10 text-slate-300">
              <Receipt size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold text-slate-400">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentInvoices.map((inv) => (
                <ActivityRow
                  key={inv.id}
                  icon={Receipt}
                  label={`${inv.invoiceNumber || inv.id} · ${inv.customerName || 'Walk-in'}`}
                  time={formatTime(inv.createdAt)}
                  amount={`₹${Number(inv.totalAmount || 0).toLocaleString('en-IN')}`}
                  status={inv.status}
                  color={
                    inv.status === 'paid'
                      ? 'bg-emerald-50 text-emerald-600'
                      : inv.status === 'pending'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-slate-100 text-slate-500'
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Top Customers ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900">Top Customers</h2>
              <p className="text-xs text-slate-400 font-medium">By revenue</p>
            </div>
            <Star size={14} className="text-amber-400" />
          </div>

          {topCustomers.length === 0 ? (
            <div className="text-center py-10 text-slate-300">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold text-slate-400">No customers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0',
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-400' : 'bg-slate-200'
                  )}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{c.name}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 rounded-full"
                        style={{ width: `${Math.min(100, (c.total / (topCustomers[0]?.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-slate-900">
                      ₹{(c.total / 1000).toFixed(1)}K
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">{c.count} orders</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Financial summary */}
          <div className="mt-5 pt-4 border-t border-slate-50 space-y-2.5">
            {[
              { label: 'Total Revenue', value: totalRevenue, color: 'text-blue-600' },
              { label: 'Total Purchases', value: totalPurchases, color: 'text-orange-600' },
              { label: 'Total Expenses', value: totalExpenses, color: 'text-red-500' },
              { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bold: true },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center">
                <span className={cn('text-xs font-medium text-slate-500', row.bold && 'font-black text-slate-900')}>
                  {row.label}
                </span>
                <span className={cn('text-xs font-black', row.color)}>
                  ₹{Math.abs(row.value).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BRANCHES OVERVIEW ─────────────────────────────────────── */}
      {branches.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900">Branch Overview</h2>
              <p className="text-xs text-slate-400 font-medium">
                {branches.length} branch{branches.length > 1 ? 'es' : ''} active
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
              <Globe size={10} />
              Multi-Branch
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                invoices={invoices}
                employees={employees}
                products={products}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── LOW STOCK ALERT ─────────────────────────────────────── */}
      {lowStockProducts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500 rounded-xl">
                <AlertTriangle size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black text-red-900">Low Stock Alerts</h2>
                <p className="text-xs text-red-500 font-medium">
                  {lowStockProducts.length} products need restocking
                </p>
              </div>
            </div>
            <Link
              to="/inventory"
              className="text-[10px] font-black text-red-600 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
            >
              Manage <ChevronRight size={10} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockProducts.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-red-100"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={12} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{p.sku || p.id}</p>
                  </div>
                </div>
                <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg flex-shrink-0">
                  {p.stock ?? 0} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SYSTEM STATUS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'System', value: 'Online', icon: Activity, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Total Dues', value: `₹${(totalDues / 1000).toFixed(1)}K`, icon: CreditCard, color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Suppliers', value: suppliers.length, icon: ShoppingBag, color: 'text-purple-600 bg-purple-50 border-purple-100' },
          { label: 'Role', value: 'Super Admin', icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-100' },
        ].map((stat) => (
          <div key={stat.label} className={cn('rounded-2xl border p-4 flex items-center gap-3', stat.color)}>
            <stat.icon size={18} className="flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 truncate">{stat.label}</p>
              <p className="text-sm font-black truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
