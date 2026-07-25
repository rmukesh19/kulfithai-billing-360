import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Box, 
  ShoppingBag, 
  Users, 
  Truck, 
  Calculator, 
  FileText, 
  Database, 
  BarChart3, 
  Users2, 
  Building2, 
  Bell, 
  Settings, 
  LogOut, 
  X, 
  ChevronDown,
  Layers,
  MapPin,
  ClipboardList,
  Wallet,
  Receipt,
  FileBarChart,
  UserCheck,
  FileSearch,
  TrendingUp,
  IndianRupee
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn, isSuperAdminRole } from '../../lib/utils';
import { useAuth } from '../../lib/AuthContext';
import { SettingsService } from '../../services/dataService';
import { translations } from '../../lib/translations';
import { motion, AnimatePresence } from 'framer-motion';

function NavItem({ icon, label, path, active, isExpanded, onToggle, hasSubItems }) {
  const content = (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer",
      active && !hasSubItems
        ? "bg-blue-600 text-white shadow-lg shadow-blue-200/50" 
        : active && hasSubItems
          ? "bg-blue-50 text-blue-600"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}>
      <span className={cn("transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")}>
        {icon}
      </span>
      <span className="font-medium text-sm flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
      {hasSubItems && (
        <ChevronDown 
          size={16} 
          className={cn("transition-transform duration-300 shadow-sm", isExpanded ? "rotate-180" : "rotate-0")} 
        />
      )}
    </div>
  );

  if (hasSubItems) {
    return <div onClick={onToggle}>{content}</div>;
  }

  return (
    <Link to={path || '#'} className="block">
      {content}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();
  const [config, setConfig] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (userProfile?.branchId) {
      const unsub = SettingsService.getConfig(userProfile.branchId, (data) => {
        setConfig(data);
      });
      return () => unsub();
    }
  }, [userProfile?.branchId]);

  const t = translations[config?.language || 'English'] || translations.English;

  // Auto-expand menu based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    menuItems.forEach(item => {
      if (item.subItems?.some(sub => sub.path === currentPath)) {
        setExpandedItems(prev => ({ ...prev, [item.label]: true }));
      }
    });
    // Close sidebar on route change for mobile
    onClose();
  }, [location.pathname]);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: t.dashboard, path: '/', permission: 'always' },
    { icon: <ShoppingCart size={20} />, label: t.create_invoice, path: '/billing', permission: 'can_bill' },
    { icon: <Truck size={20} />, label: t.purchases, path: '/purchases', permission: 'always' },
    { 
      icon: <Database size={20} />, 
      label: t.masters, 
      permission: 'can_manage_branches',
      subItems: [
        { label: t.inventory, path: '/inventory', icon: <Box size={16} /> },
        { label: 'Barcode Print', path: '/barcode', icon: <FileText size={16} /> },
        { label: t.category, path: '/masters?tab=category', icon: <Layers size={16} /> },
        { label: t.customers, path: '/masters?tab=customer', icon: <Users size={16} /> },
        { label: t.suppliers, path: '/masters?tab=supplier', icon: <UserCheck size={16} /> },
        { label: t.ledgers, path: '/masters?tab=ledger', icon: <ClipboardList size={16} /> },
        { label: 'Data Import', path: '/import', icon: <Database size={16} /> },
        { label: t.branch, path: '/masters?tab=branch', icon: <MapPin size={16} /> },
      ]
    },
    { 
      icon: <Calculator size={20} />, 
      label: t.accounting, 
      permission: 'can_manage_accounts',
      subItems: [
        { label: t.daybook, path: '/accounting?tab=daybook', icon: <Receipt size={16} /> },
        { label: t.cashbook, path: '/accounting?tab=cashbook', icon: <Wallet size={16} /> },
        { label: t.bankbook, path: '/accounting?tab=bankbook', icon: <Building2 size={16} /> },
        { label: t.vouchers, path: '/accounting?tab=vouchers', icon: <FileText size={16} /> },
        { label: t.reports, path: '/accounting?tab=statements', icon: <FileBarChart size={16} /> },
      ]
    },
    { icon: <FileSearch size={20} />, label: t.gst_reports, path: '/gst', permission: 'can_view_reports' },
    { 
      icon: <BarChart3 size={20} />, 
      label: t.reports, 
      permission: 'can_view_reports',
      subItems: [
        { label: t.sales_report || 'Sales', path: '/reports?tab=sales', icon: <FileBarChart size={16} /> },
        { label: t.purchase_report || 'Purchases', path: '/reports?tab=purchase', icon: <ShoppingBag size={16} /> },
        { label: t.stock_report || 'Stock', path: '/reports?tab=stock', icon: <Box size={16} /> },
        { label: t.profit_loss || 'P&L', path: '/reports?tab=profit', icon: <TrendingUp size={16} /> },
        { label: t.expense_report || 'Expense', path: '/reports?tab=expense', icon: <IndianRupee size={16} /> },
        { label: t.employee_report || 'Employee', path: '/reports?tab=employee', icon: <Users size={16} /> },
        { label: t.branch_report || 'Branch', path: '/reports?tab=branch', icon: <Building2 size={16} /> },
        { label: t.customer_ledger || 'Cust. Ledger', path: '/reports?tab=customer_ledger', icon: <FileText size={16} /> },
        { label: t.supplier_ledger || 'Supp. Ledger', path: '/reports?tab=supplier_ledger', icon: <FileText size={16} /> },
      ]
    },
    { icon: <Users2 size={20} />, label: t.employees, path: '/employees', permission: 'can_manage_employees' },
    { icon: <Bell size={20} />, label: t.notifications, path: '/notifications', permission: 'always' },
    { 
      icon: <Settings size={20} />, 
      label: t.settings, 
      permission: 'can_manage_branches',
      subItems: [
        { label: t.settings, path: '/settings', icon: <Settings size={16} /> },
        { label: t.tally_integration, path: '/tally', icon: <Truck size={16} /> },
      ]
    },
  ];

  const filteredItems = menuItems.filter(item => {
    if (isSuperAdminRole(userProfile?.role)) return true;
    if (item.permission === 'always') return true;
    return userProfile?.permissions?.includes(item.permission);
  });

  const toggleExpand = (label) => {
    setExpandedItems(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  return (
    <aside className={cn(
      "w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300",
      "lg:translate-x-0",
      isOpen ? "translate-x-0 shadow-2xl shadow-slate-900/20" : "-translate-x-full"
    )}>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 px-6">
        <div className="sticky top-0 bg-white pt-6 pb-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                B
              </div>
              <div>
                <h1 className="font-bold text-lg leading-none text-slate-900 tracking-tight">Billing360</h1>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Enterprise ERP</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const hasSubItems = !!item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems[item.label];
            const isActive = location.pathname === item.path || 
                           (hasSubItems && item.subItems?.some(sub => location.pathname === sub.path));

            return (
              <div key={item.label} className="space-y-1">
                <NavItem
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  active={isActive}
                  hasSubItems={hasSubItems}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(item.label)}
                />
                
                {hasSubItems && (
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                      >
                        <div className="pl-6 border-l-2 border-slate-100 ml-6 mt-1 space-y-1">
                          {item.subItems?.map((sub) => (
                            <Link
                              key={sub.label + sub.path}
                              to={sub.path}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 text-xs font-bold rounded-lg transition-colors group italic",
                                location.pathname === sub.path
                                  ? "text-blue-600 bg-blue-50/50"
                                  : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                              )}
                            >
                              <span className="opacity-40 group-hover:opacity-100">{sub.icon}</span>
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <UserCheck size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate">{userProfile?.role || 'Super Admin'}</p>
            <p className="text-xs font-bold text-slate-900 truncate">{userProfile?.name || 'System Administrator'}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-xs uppercase tracking-widest italic">{t.logout}</span>
        </button>
      </div>
    </aside>
  );
}
