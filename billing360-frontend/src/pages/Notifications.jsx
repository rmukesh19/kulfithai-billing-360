import { useState } from 'react';
import { Bell, AlertTriangle, IndianRupee, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Low Stock Alert', message: 'Item "Organic Coffee" is below 10 units.', type: 'alert', time: '5m ago', read: false },
    { id: 2, title: 'Payment Due', message: 'Supplier "Star Traders" payment of ₹15,000 is due tomorrow.', type: 'payment', time: '1h ago', read: false },
    { id: 3, title: 'GST Reminder', message: 'Finalize your GSTR-1 for the month of April.', type: 'gst', time: '3h ago', read: true },
    { id: 4, title: 'Session Timeout', message: 'Your session was restored from auto-backup.', type: 'system', time: '1d ago', read: true },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="text-red-500" size={18} />;
      case 'payment': return <IndianRupee className="text-orange-500" size={18} />;
      case 'gst': return <CheckCircle2 className="text-emerald-500" size={18} />;
      default: return <Bell className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="text-slate-500">Stay updated with system alerts and business reminders.</p>
        </div>
        <button 
          onClick={markAllRead}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          Mark all as read
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "p-4 rounded-2xl border transition-all flex gap-4 group",
                n.read ? "bg-white border-slate-100" : "bg-blue-50/50 border-blue-100 shadow-sm shadow-blue-50"
              )}
            >
              <div className="p-2 rounded-xl bg-white shadow-sm self-start">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{n.time}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{n.message}</p>
              </div>
              <button 
                onClick={() => removeNotification(n.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {notifications.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="opacity-20" />
            </div>
            <p className="font-medium italic">No notifications to show.</p>
          </div>
        )}
      </div>
    </div>
  );
}
