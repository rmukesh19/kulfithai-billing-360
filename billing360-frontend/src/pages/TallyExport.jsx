import { useState } from 'react';
import { FileCode, Download, RefreshCw, AlertCircle, CheckCircle2, History, Database, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLocalization } from '@/src/lib/LocalizationContext';

export default function TallyExport() {
  const { config, t } = useLocalization();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('xml');

  const systemName = config?.accounting_system || 'TallyPrime';

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const getSystemVersions = () => {
    switch (systemName) {
      case 'QuickBooks':
        return ['QuickBooks Online', 'QuickBooks Desktop'];
      case 'Xero':
        return ['Xero API v2.0', 'Xero Partner Integration'];
      case 'Zoho Books':
        return ['Zoho Books Professional', 'Zoho Books Premium'];
      case 'TallyPrime':
      default:
        return ['TallyPrime', 'Tally ERP 9'];
    }
  };

  const exportTypes = [
    { title: 'Sales Export', icon: Database, count: 124 },
    { title: 'Purchase Export', icon: Database, count: 45 },
    { title: 'Ledger Export', icon: Database, count: 32 },
    { title: 'Inventory Export', icon: Database, count: 150 },
    { title: 'Voucher Export', icon: Database, count: 88 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {systemName === 'TallyPrime' ? t.tally_integration : `${systemName} Sync Center`}
          </h2>
          <p className="text-slate-500">{t.settings}</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 rounded-2xl text-sm font-bold text-white hover:bg-slate-800 shadow-xl shadow-slate-100 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? t.loading : `Sync with ${systemName}`}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">{t.export_options}</h3>
              <div className="flex bg-slate-50 p-1 rounded-lg">
                <button 
                  onClick={() => setSelectedFormat('xml')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", selectedFormat === 'xml' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
                >
                  XML
                </button>
                <button 
                  onClick={() => setSelectedFormat('excel')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", selectedFormat === 'excel' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                >
                  Excel
                </button>
                <button 
                  onClick={() => setSelectedFormat('csv')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", selectedFormat === 'csv' ? "bg-white text-slate-600 shadow-sm" : "text-slate-400")}
                >
                  CSV
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportTypes.map((type, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all group cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      <FileCode size={20} />
                    </div>
                    <button className="text-slate-300 group-hover:text-blue-600">
                      <Download size={18} />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{type.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{type.count} Pending Records</p>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <CheckCircle2 size={18} />
                <p className="text-xs font-bold leading-relaxed">Duplicate Prevention System Active: System will automatically check for existing transaction and voucher records before export.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">{t.history}</h3>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <History size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Sales_Export_20260430_{selectedFormat}.{selectedFormat}</p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-wider">30 APR 2026 | 2.4 MB</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">Success</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full" />
            <h4 className="text-lg font-bold mb-4">Sync Configuration</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{systemName} Version</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500">
                  {getSystemVersions().map((v, i) => (
                    <option key={i}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="auto-sync" className="rounded" />
                <label htmlFor="auto-sync" className="text-xs text-slate-300">Enable Auto Sync</label>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm">
              Update Configuration
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" />
              Failed Sync Logs
            </h4>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-xs font-bold text-red-700">Record REC-2026-001</p>
                <p className="text-[10px] text-red-500 mt-1 italic">Duplicate Transaction ID detected in {systemName} target ledger.</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-xs font-bold text-red-700">Stock Item Mapping</p>
                <p className="text-[10px] text-red-500 mt-1 italic">UOM mapping not defined in {systemName} reference table.</p>
              </div>
            </div>
            <button className="w-full mt-4 text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1">
              View Detailed Audit Trail
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
