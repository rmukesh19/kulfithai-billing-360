import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SettingsService } from '../services/dataService';
import { translations } from './translations';

const LocalizationContext = createContext(null);

export const currencySymbols = {
  INR: '₹',
  USD: '$',
  SGD: 'S$',
  THB: '฿',
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
  MYR: 'RM'
};

export function LocalizationProvider({ children }) {
  const { userProfile } = useAuth();
  const [config, setConfig] = useState({
    country: "India",
    currency: "INR",
    language: "English",
    timezone: "Asia/Kolkata",
    tax_type: "GST",
    tax_percentage: 18,
    accounting_system: "TallyPrime",
    enableGst: true,
    currencyFormat: "₹X,XXX.XX",
    dateFormat: "DD-MM-YYYY",
    decimalSettings: 2
  });

  useEffect(() => {
    if (userProfile?.branchId) {
      const unsub = SettingsService.getConfig(userProfile.branchId, (data) => {
        if (data) {
          setConfig(prev => ({
            ...prev,
            ...data
          }));
        }
      });
      return unsub;
    }
  }, [userProfile?.branchId]);

  const currencySymbol = currencySymbols[config.currency] || currencySymbols.INR;
  const currentLanguage = config.language || 'English';
  const t = translations[currentLanguage] || translations.English;

  const formatCurrency = (val) => {
    const amount = Number(val || 0);
    const formattedNum = amount.toLocaleString(undefined, {
      minimumFractionDigits: config.decimalSettings ?? 2,
      maximumFractionDigits: config.decimalSettings ?? 2
    });
    
    // Apply currencyFormat template
    const fmt = config.currencyFormat || '₹X,XXX.XX';
    if (fmt.includes('X,XXX.XX')) {
      return fmt.replace('X,XXX.XX', formattedNum).replace('₹', currencySymbol);
    }
    return `${currencySymbol}${formattedNum}`;
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const fmt = config.dateFormat || 'DD-MM-YYYY';
    
    return fmt
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year);
  };

  // Tax computation based on settings
  const computeTax = (subtotal, rateOverride = null) => {
    const rate = rateOverride !== null ? rateOverride : (config.tax_percentage ?? 18);
    const taxAmount = (subtotal * rate) / 100;
    const total = subtotal + taxAmount;
    
    let details = {};
    const label = config.tax_type || 'GST';
    if (label === 'GST' && config.country === 'India') {
      const halfRate = rate / 2;
      const halfTax = taxAmount / 2;
      details = {
        cgstRate: halfRate,
        cgstAmount: halfTax,
        sgstRate: halfRate,
        sgstAmount: halfTax,
        igstRate: rate,
        igstAmount: taxAmount,
        type: 'GST_IN'
      };
    } else {
      details = {
        taxRate: rate,
        taxAmount: taxAmount,
        type: label
      };
    }

    return {
      taxAmount,
      total,
      details,
      label
    };
  };

  const contextValue = {
    config,
    currencySymbol,
    currency: config.currency || 'INR',
    language: currentLanguage,
    timezone: config.timezone || 'Asia/Kolkata',
    taxType: config.tax_type || 'GST',
    taxPercentage: config.tax_percentage ?? 18,
    accountingSystem: config.accounting_system || 'TallyPrime',
    formatCurrency,
    formatDate,
    computeTax,
    t
  };

  return (
    <LocalizationContext.Provider value={contextValue}>
      <div dir={currentLanguage === 'Arabic' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}
