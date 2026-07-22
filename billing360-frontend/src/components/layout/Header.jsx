import { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, Globe, Moon, Sun, Check, Menu, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { useOffline } from '../../lib/OfflineContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BranchService } from '../../services/dataService';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

export default function Header({ onMenuClick }) {
  const { user, userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOffline, setIsOffline, pendingInvoices, syncInvoices, isSyncing } = useOffline();
  const [branches, setBranches] = useState([]);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  useEffect(() => {
    const unsub = BranchService.getBranches(setBranches);
    return () => unsub();
  }, []);

  const switchBranch = async (branchId) => {
    if (!user?.uid) return;
    try {
      const userPath = `users/${user.uid}`;
      const profile = db.get(userPath);
      db.set(userPath, { ...profile, branchId });
      window.location.reload(); // Hard reload to reset all states with new branch context
    } catch (error) {
      console.error("Failed to switch branch", error);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg lg:hidden"
        >
          <Menu size={20} />
        </button>
        
        <div className="relative w-full group hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
          />
        </div>

        {/* Mobile Search Toggle */}
        <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg sm:hidden">
          <Search size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        {userProfile?.role === 'Super Admin' && (
          <div 
            onClick={() => setShowBranchSelector(!showBranchSelector)}
            className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] sm:text-xs font-semibold cursor-pointer hover:bg-blue-100 transition-colors relative"
          >
            <Globe size={14} />
            <span className="hidden sm:block">{branches.find(b => b.id === userProfile?.branchId)?.name || "Main Branch"}</span>
            <ChevronDown size={12} className={cn("transition-transform", showBranchSelector && "rotate-180")} />
            
            <AnimatePresence>
              {showBranchSelector && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50 text-slate-705"
                >
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                    Switch Branch
                  </div>
                  {branches.map(b => (
                    <button 
                      key={b.id}
                      onClick={(e) => { e.stopPropagation(); switchBranch(b.id); }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between",
                        userProfile?.branchId === b.id && "text-blue-600 font-bold bg-blue-50"
                      )}
                    >
                      {b.name}
                      {userProfile?.branchId === b.id && <Check size={12} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* Offline Mode Indicator & Sync Controls */}
          <div className="flex items-center gap-2">
            {isOffline ? (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-red-50 border border-red-100 text-red-650 rounded-full text-[10px] sm:text-xs font-bold shadow-sm">
                <WifiOff size={13} className="animate-pulse text-red-500" />
                <span className="hidden md:inline text-red-600">Offline</span>
                <button
                  type="button"
                  onClick={() => setIsOffline(false)}
                  className="px-1.5 py-0.5 bg-red-500 text-white hover:bg-red-600 rounded text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 cursor-pointer leading-none"
                  title="Click to go Online and Sync"
                >
                  Go Online
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full text-[10px] sm:text-xs font-bold">
                  <Wifi size={13} className="text-emerald-500" />
                  <span className="hidden md:inline text-emerald-600">Online</span>
                </div>
                
                {pendingInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await syncInvoices();
                      if (res.success) {
                        alert(`Successfully synchronized ${res.count} offline invoices!`);
                      } else {
                        alert(`Sync failed: ${res.error}`);
                      }
                    }}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    title={`${pendingInvoices.length} invoices pending sync. Click to sync.`}
                  >
                    <RefreshCw size={11} className={cn(isSyncing && "animate-spin")} />
                    <span>{pendingInvoices.length} Sync</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsOffline(!isOffline)}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer hidden sm:block"
              title={isOffline ? "Switch to Online Mode" : "Switch to Offline Mode"}
            >
              {isOffline ? <WifiOff size={16} className="text-red-500" /> : <Wifi size={16} className="text-slate-400" />}
            </button>
          </div>

          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>

        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

        <button className="flex items-center gap-3 p-1 pl-1 pr-3 hover:bg-slate-50 rounded-full transition-colors group">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-200">
            {userProfile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {userProfile?.name || user?.displayName || 'User'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
              {userProfile?.role || 'Guest'}
            </p>
          </div>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        </button>
      </div>
    </header>
  );
}
