import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Trash2, X } from 'lucide-react';

const DeleteToastContext = createContext();

export const useDeleteToast = () => {
  const context = useContext(DeleteToastContext);
  if (!context) {
    // Return a safe fallback to prevent crashes if used outside provider
    return {
      showToast: (msg) => { console.log(msg); },
      showConfirm: (title, msg, onConfirm) => {
        if (window.confirm(`${title}: ${msg}`)) {
          onConfirm();
        }
      }
    };
  }
  return context;
};

export function DeleteToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [confirmData, setConfirmData] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const showConfirm = (title, message, onConfirmAction) => {
    setConfirmData({
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirmAction();
          showToast(`${title} deleted successfully!`, 'success');
        } catch (error) {
          console.error(error);
          showToast(error.message || `Failed to delete ${title}`, 'error');
        } finally {
          setConfirmData(null);
        }
      },
      onCancel: () => setConfirmData(null)
    });
  };

  return (
    <DeleteToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmData && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-55">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={confirmData.onCancel}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full relative z-55 border border-slate-100"
            >
              <button 
                onClick={confirmData.onCancel}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-red-50 text-red-600 rounded-full flex-shrink-0">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-lg font-bold text-slate-900">Are you sure?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {confirmData.message || `Do you want to soft delete this ${confirmData.title.toLowerCase()}? This operation is persistent but soft-deleted safely.`}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  onClick={confirmData.onCancel}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmData.onConfirm}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm shadow-red-100"
                >
                  Delete {confirmData.title}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`flex items-center gap-3 p-4 pr-6 rounded-2xl shadow-lg border text-xs pointer-events-auto max-w-sm ${
                toast.type === 'error'
                  ? 'bg-red-50 text-red-850 border-red-200'
                  : 'bg-emerald-50 text-emerald-850 border-emerald-205'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
              )}
              <span className="font-semibold">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DeleteToastContext.Provider>
  );
}
