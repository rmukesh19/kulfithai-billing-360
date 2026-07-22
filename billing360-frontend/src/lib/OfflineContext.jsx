import React, { createContext, useContext, useState, useEffect } from 'react';

const OfflineContext = createContext(undefined);

export const OfflineProvider = ({ children }) => {
  // Respect user choice or default to navigator status, or manual override.
  const [isOffline, setIsOfflineState] = useState(() => {
    const saved = localStorage.getItem('offline_mode_active');
    return saved === 'true';
  });

  const [pendingInvoices, setPendingInvoices] = useState(() => {
    const saved = localStorage.getItem('offline_pending_invoices');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => {
    return localStorage.getItem('offline_last_sync_time');
  });

  // Track navigator status
  useEffect(() => {
    const goOnline = () => {
      // Don't auto-switch offline mode unless there's no custom manual session override
      console.log('Browser reported: Connected to network');
    };
    const goOffline = () => {
      console.log('Browser reported: Disconnected from network');
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const setIsOffline = (offline) => {
    setIsOfflineState(offline);
    localStorage.setItem('offline_mode_active', String(offline));
    
    // Automatically trigger sync if going online
    if (!offline) {
      setTimeout(() => {
        syncInvoices();
      }, 500);
    }
  };

  const addOfflineInvoice = (invoice) => {
    const updated = [...pendingInvoices, { ...invoice, id: invoice.id || Math.random().toString(36).substring(2, 9), createdAtOffline: new Date().toISOString() }];
    setPendingInvoices(updated);
    localStorage.setItem('offline_pending_invoices', JSON.stringify(updated));
  };

  const syncInvoices = async () => {
    const queue = [...pendingInvoices];
    if (queue.length === 0) {
      return { success: true, count: 0 };
    }

    setIsSyncing(true);
    try {
      // Make real API POST request to Express Server
      const response = await fetch('/api/invoices/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoices: queue }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Clear queue
        setPendingInvoices([]);
        localStorage.removeItem('offline_pending_invoices');
        
        const nowStr = new Date().toLocaleTimeString();
        setLastSyncedAt(nowStr);
        localStorage.setItem('offline_last_sync_time', nowStr);

        return { success: true, count: result.count };
      } else {
        throw new Error(result.error || 'Server rejected synchronization');
      }
    } catch (err) {
      console.error('Failed to sync offline invoices:', err);
      return { success: false, error: err.message || 'Connection to server failed' };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOffline,
        setIsOffline,
        pendingInvoices,
        addOfflineInvoice,
        syncInvoices,
        isSyncing,
        lastSyncedAt,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
