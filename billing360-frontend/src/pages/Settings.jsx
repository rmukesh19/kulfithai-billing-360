import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Building,
  Shield,
  Bell,
  Printer,
  Smartphone,
  Database,
  Clock,
  Save,
  Check,
  QrCode,
  UploadCloud,
  Trash2,
  Globe,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion } from "framer-motion";
import { SettingsService } from "@/src/services/dataService";
import { useAuth } from "@/src/lib/AuthContext";
import { translations } from "@/src/lib/translations";

export default function Settings() {
  const { userProfile } = useAuth();
  const [activeSection, setActiveSection] = useState("company");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [config, setConfig] = useState({
    companyName: "Billing 360",
    gstIn: "",
    address: "",
    currency: "INR",
    invoicePrefix: "INV-",
    enableGst: true,
    gstType: "Regular",
    businessType: "",
    ownerName: "",
    panNumber: "",
    cinNumber: "",
    msmeNumber: "",
    fssaiNumber: "",
    drugLicense: "",
    phone: "",
    alternatePhone: "",
    email: "",
    whatsappNumber: "",
    website: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    financialYear: "",
    decimalSettings: 2,
    timezone: "Asia/Kolkata",
    language: "English",
    tax_type: "GST",
    tax_percentage: 18,
    accounting_system: "TallyPrime",
    tax_reg_number: "",
    invoiceLanguage: "English",
    currencyFormat: "₹X,XXX.XX",
    dateFormat: "DD-MM-YYYY",
    countryTemplate: "Standard",
    stateCode: "",
    defaultGstPercent: 18,
    inclusiveTax: false,
    enableHsn: true,
    hsnDigitCount: 4,
    enableEInvoice: false,
    eInvoiceUsername: "",
    eInvoicePassword: "",
    eInvoiceClientId: "",
    eInvoiceClientSecret: "",
    eInvoiceSandbox: true,
    invoiceStartingNumber: 1,
    invoiceFooter: "",
    termsConditions: "",
    autoInvoiceNumber: true,
    showBarcodeInInvoice: false,
    showQrInInvoice: true,
    printSize: "Thermal",
    showProductImageInInvoice: false,
    upiId: "",
    upiQrUrl: "",
    bankDetails: "",
    printerName: "",
    printerType: "Thermal",
    paperSize: "80mm",
    autoPrint: true,
    enableWhatsApp: false,
    whatsappApiToken: "",
    autoShareInvoice: false,
    autoBackup: false,
    backupFrequency: "Daily",
    backupLocation: "Google Drive",
    enableTallyExport: false,
    tallyVersion: "TallyPrime",
    tallyIp: "127.0.0.1",
    tallyPort: "9000",
    requireMfa: false,
    restrictLoginByHours: false,
    ipWhitelisting: false,
    minPasswordLength: 8,
    passwordExpiryDays: 90,
    logoUrl: "",
    signatureUrl: "",
    faviconUrl: "",
  });

  const handleCountryChange = (countryVal) => {
    let updates = { country: countryVal };
    if (countryVal === "India") {
      updates.currency = "INR";
      updates.tax_type = "GST";
      updates.accounting_system = "TallyPrime";
      updates.timezone = "Asia/Kolkata";
      updates.currencyFormat = "₹X,XXX.XX";
      updates.dateFormat = "DD-MM-YYYY";
      updates.language = "English";
    } else if (countryVal === "Thailand") {
      updates.currency = "THB";
      updates.tax_type = "VAT";
      updates.accounting_system = "TallyPrime";
      updates.timezone = "Asia/Bangkok";
      updates.currencyFormat = "฿X,XXX.XX";
      updates.dateFormat = "DD-MM-YYYY";
      updates.language = "Thai";
    } else if (countryVal === "Singapore") {
      updates.currency = "SGD";
      updates.tax_type = "GST";
      updates.accounting_system = "Xero";
      updates.timezone = "Asia/Singapore";
      updates.currencyFormat = "S$X,XXX.XX";
      updates.dateFormat = "DD-MM-YYYY";
      updates.language = "English";
    } else if (countryVal === "Malaysia") {
      updates.currency = "MYR";
      updates.tax_type = "SST";
      updates.accounting_system = "None";
      updates.timezone = "Asia/Kuala_Lumpur";
      updates.currencyFormat = "RM X,XXX.XX";
      updates.dateFormat = "DD-MM-YYYY";
      updates.language = "Malay";
    } else if (countryVal === "UAE") {
      updates.currency = "AED";
      updates.tax_type = "VAT";
      updates.accounting_system = "Zoho Books";
      updates.timezone = "Asia/Dubai";
      updates.currencyFormat = "AED X,XXX.XX";
      updates.dateFormat = "DD-MM-YYYY";
      updates.language = "Arabic";
    } else if (countryVal === "USA") {
      updates.currency = "USD";
      updates.tax_type = "Sales Tax";
      updates.accounting_system = "QuickBooks";
      updates.timezone = "America/New_York";
      updates.currencyFormat = "$X,XXX.XX";
      updates.dateFormat = "MM-DD-YYYY";
      updates.language = "English";
    } else if (countryVal === "UK") {
      updates.currency = "GBP";
      updates.tax_type = "VAT";
      updates.accounting_system = "None";
      updates.timezone = "Europe/London";
      updates.currencyFormat = "£X,XXX.XX";
      updates.dateFormat = "DD-MM-YYYY";
      updates.language = "English";
    } else if (countryVal === "Europe") {
      updates.currency = "EUR";
      updates.tax_type = "VAT";
      updates.accounting_system = "None";
      updates.timezone = "Europe/Paris";
      updates.currencyFormat = "€X,XXX.XX";
      updates.dateFormat = "DD-MM-YYYY";
      updates.language = "English";
    }
    setConfig((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  useEffect(() => {
    if (userProfile?.branchId) {
      const unsub = SettingsService.getConfig(userProfile.branchId, (data) => {
        if (data) {
          // Merge with defaults to ensure all fields are defined
          setConfig((prev) => ({
            ...prev,
            ...data,
          }));
        }
      });
      return () => unsub();
    }
  }, [userProfile?.branchId]);

  const t = translations[config?.language || "English"] || translations.English;

  const handleSave = async () => {
    if (!userProfile?.branchId) return;
    setIsSaving(true);
    try {
      await SettingsService.saveConfig(userProfile.branchId, config);
      try {
        await fetch("/api/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
          },
          body: JSON.stringify(config)
        });
      } catch (err) {
        console.error("Failed to sync config with backend API:", err);
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    {
      id: "company",
      label: "Company Settings",
      icon: Building,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      id: "gst",
      label: "Tax Settings",
      icon: Database,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      id: "invoice",
      label: "Invoice Settings",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      id: "printer",
      label: "Printer Settings",
      icon: Printer,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      id: "whatsapp",
      label: "WhatsApp Settings",
      icon: Smartphone,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      id: "language",
      label: "Language Settings",
      icon: Smartphone,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      id: "backup",
      label: "Backup Settings",
      icon: Database,
      color: "text-slate-600",
      bg: "bg-slate-50",
    },
    {
      id: "tally",
      label: "Tally Connection",
      icon: Database,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      id: "security",
      label: "Security & Auth",
      icon: Shield,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      id: "subscription",
      label: "Subscription",
      icon: Check,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <SettingsIcon className="text-slate-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              System Configuration
            </h2>
            <p className="text-slate-500">
              Fine-tune your Billing 360 experience.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : showSuccess ? (
            <Check size={18} />
          ) : (
            <Save size={18} />
          )}
          {showSuccess ? "Config Updated" : "Save Configuration"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2 h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-bold border",
                activeSection === item.id
                  ? "bg-white text-slate-900 shadow-sm border-slate-200"
                  : "text-slate-500 border-transparent hover:bg-white hover:text-slate-700",
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg",
                  activeSection === item.id ? item.bg : "bg-slate-100",
                )}
              >
                <item.icon
                  size={18}
                  className={
                    activeSection === item.id ? item.color : "text-slate-400"
                  }
                />
              </div>
              {item.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar"
          >
            {activeSection === "company" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-6">
                    <Building size={20} className="text-blue-600" />
                    Basic Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Company Name"
                      value={config.companyName}
                      onChange={(v) => setConfig({ ...config, companyName: v })}
                    />
                    <SelectField
                      label="Business Type"
                      value={config.businessType}
                      options={[
                        "General Retail",
                        "Grocery/FMCG",
                        "Pharmacy/Pharma",
                        "Electronics/Mobile",
                        "Apparel/Footwear",
                        "Hardware/Electrical",
                        "Automobile",
                        "Restaurant/Cafe",
                        "Service/Consultancy",
                      ]}
                      onChange={(v) =>
                        setConfig({ ...config, businessType: v })
                      }
                    />

                    <InputField
                      label="Owner Name"
                      value={config.ownerName}
                      onChange={(v) => setConfig({ ...config, ownerName: v })}
                    />
                    <InputField
                      label="GST Number"
                      value={config.gstIn}
                      onChange={(v) => setConfig({ ...config, gstIn: v })}
                    />
                    <InputField
                      label="PAN Number"
                      value={config.panNumber}
                      onChange={(v) => setConfig({ ...config, panNumber: v })}
                    />
                    <InputField
                      label="CIN Number"
                      value={config.cinNumber}
                      onChange={(v) => setConfig({ ...config, cinNumber: v })}
                    />
                    <InputField
                      label="MSME Number"
                      value={config.msmeNumber}
                      onChange={(v) => setConfig({ ...config, msmeNumber: v })}
                    />
                    <InputField
                      label="FSSAI Number"
                      value={config.fssaiNumber}
                      onChange={(v) => setConfig({ ...config, fssaiNumber: v })}
                    />
                    <InputField
                      label="Drug License"
                      value={config.drugLicense}
                      onChange={(v) => setConfig({ ...config, drugLicense: v })}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6">
                    Contact & Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Mobile Number"
                      value={config.phone}
                      onChange={(v) => setConfig({ ...config, phone: v })}
                    />
                    <InputField
                      label="Alternate Mobile"
                      value={config.alternatePhone}
                      onChange={(v) =>
                        setConfig({ ...config, alternatePhone: v })
                      }
                    />
                    <InputField
                      label="Email Address"
                      value={config.email}
                      onChange={(v) => setConfig({ ...config, email: v })}
                    />
                    <InputField
                      label="WhatsApp Number"
                      value={config.whatsappNumber}
                      onChange={(v) =>
                        setConfig({ ...config, whatsappNumber: v })
                      }
                    />
                    <InputField
                      label="Website"
                      value={config.website}
                      onChange={(v) => setConfig({ ...config, website: v })}
                    />
                    <InputField
                      label="Address Line 1"
                      value={config.address}
                      onChange={(v) => setConfig({ ...config, address: v })}
                      className="md:col-span-2"
                    />
                    <InputField
                      label="City"
                      value={config.city}
                      onChange={(v) => setConfig({ ...config, city: v })}
                    />
                    <InputField
                      label="State"
                      value={config.state}
                      onChange={(v) => setConfig({ ...config, state: v })}
                    />
                    <SelectField
                      label="Country"
                      value={config.country}
                      options={["India", "Thailand", "Singapore", "UAE", "Malaysia", "USA", "UK", "Europe"]}
                      onChange={(v) => handleCountryChange(v)}
                    />
                    <InputField
                      label="Pincode"
                      value={config.pincode}
                      onChange={(v) => setConfig({ ...config, pincode: v })}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6">
                    Financial & Branding
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Financial Year"
                      value={config.financialYear}
                      onChange={(v) =>
                        setConfig({ ...config, financialYear: v })
                      }
                      placeholder="e.g. 2024-25"
                    />
                    <SelectField
                      label="Currency"
                      value={config.currency}
                      options={["INR", "THB", "SGD", "AED", "USD", "MYR", "GBP", "EUR"]}
                      onChange={(v) => setConfig({ ...config, currency: v })}
                    />
                    <SelectField
                      label="Language"
                      value={config.language}
                      options={["English", "Tamil", "Hindi", "Thai", "Malay", "Arabic"]}
                      onChange={(v) => setConfig({ ...config, language: v })}
                    />
                    <InputField
                      label="Time Zone"
                      value={config.timezone}
                      onChange={(v) => setConfig({ ...config, timezone: v })}
                      placeholder="Auto based on country"
                    />
                    <InputField
                      label="Decimal Settings"
                      value={config.decimalSettings?.toString()}
                      onChange={(v) =>
                        setConfig({ ...config, decimalSettings: parseInt(v) })
                      }
                      type="number"
                    />
                    <InputField
                      label="Logo URL"
                      value={config.logoUrl}
                      onChange={(v) => setConfig({ ...config, logoUrl: v })}
                      placeholder="https://..."
                    />
                    <InputField
                      label="Favicon URL"
                      value={config.faviconUrl}
                      onChange={(v) => setConfig({ ...config, faviconUrl: v })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "gst" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Database size={20} className="text-emerald-600" />
                    Tax Settings & Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 col-span-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-2">
                      <Toggle
                        checked={config.enableGst}
                        onChange={(v) => setConfig({ ...config, enableGst: v })}
                        label="Enable Tax Calculation & Features"
                      />
                    </div>

                    {config.enableGst && (
                      <>
                        <SelectField
                          label="Tax Type"
                          value={config.tax_type || 'GST'}
                          options={["GST", "VAT", "SST", "Sales Tax", "Custom Tax"]}
                          onChange={(v) => setConfig({ ...config, tax_type: v })}
                        />

                        <InputField
                          label="Tax Registration Number"
                          value={config.tax_reg_number || config.gstIn}
                          placeholder="e.g. VAT-123456 or GSTIN"
                          onChange={(v) =>
                            setConfig({ ...config, tax_reg_number: v, gstIn: v })
                          }
                        />

                        <InputField
                          label="Default Tax Percentage (%)"
                          value={(config.tax_percentage ?? config.defaultGstPercent ?? 18).toString()}
                          onChange={(v) =>
                            setConfig({
                              ...config,
                              tax_percentage: parseFloat(v) || 0,
                              defaultGstPercent: parseFloat(v) || 0,
                            })
                          }
                          type="number"
                        />

                        <SelectField
                          label="Registration Class / Scheme"
                          value={config.gstType || 'Regular'}
                          options={["Regular", "Composition", "Exempt", "Non-Registered"]}
                          onChange={(v) => setConfig({ ...config, gstType: v })}
                        />

                        <InputField
                          label="State / Region Code"
                          value={config.stateCode}
                          onChange={(v) =>
                            setConfig({ ...config, stateCode: v })
                          }
                          placeholder="e.g. 33 or BKK"
                        />

                        <div className="space-y-4 col-span-2 pt-4 border-t border-slate-100">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                            Compliance & Format
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Toggle
                              checked={config.inclusiveTax}
                              onChange={(v) =>
                                setConfig({ ...config, inclusiveTax: v })
                              }
                              label="Tax Inclusive Pricing"
                            />
                            <Toggle
                              checked={config.enableEInvoice}
                              onChange={(v) =>
                                setConfig({ ...config, enableEInvoice: v })
                              }
                              label="Enable E-Invoicing"
                            />
                            {config.enableEInvoice && (
                              <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 mt-2">
                                <h4 className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                  E-Invoice (GSP/NIC) Credentials
                                </h4>
                                <InputField
                                  label="User Name"
                                  value={config.eInvoiceUsername}
                                  onChange={(v) =>
                                    setConfig({
                                      ...config,
                                      eInvoiceUsername: v,
                                    })
                                  }
                                />
                                <InputField
                                  label="Password"
                                  value={config.eInvoicePassword}
                                  onChange={(v) =>
                                    setConfig({
                                      ...config,
                                      eInvoicePassword: v,
                                    })
                                  }
                                  type="password"
                                />
                                <InputField
                                  label="Client ID"
                                  value={config.eInvoiceClientId}
                                  onChange={(v) =>
                                    setConfig({
                                      ...config,
                                      eInvoiceClientId: v,
                                    })
                                  }
                                />
                                <InputField
                                  label="Client Secret"
                                  value={config.eInvoiceClientSecret}
                                  onChange={(v) =>
                                    setConfig({
                                      ...config,
                                      eInvoiceClientSecret: v,
                                    })
                                  }
                                  type="password"
                                />
                                <Toggle
                                  checked={config.eInvoiceSandbox}
                                  onChange={(v) =>
                                    setConfig({ ...config, eInvoiceSandbox: v })
                                  }
                                  label="Use Sandbox/Test Environment"
                                />
                              </div>
                            )}
                            <Toggle
                              checked={config.enableHsn}
                              onChange={(v) =>
                                setConfig({ ...config, enableHsn: v })
                              }
                              label="Enable HSN/SAC"
                            />
                            <InputField
                              label="HSN Digit Count"
                              value={config.hsnDigitCount?.toString()}
                              onChange={(v) =>
                                setConfig({
                                  ...config,
                                  hsnDigitCount: parseInt(v),
                                })
                              }
                              type="number"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "invoice" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-orange-600" />
                    Invoice Sequence & Layout
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Invoice Prefix"
                      value={config.invoicePrefix}
                      onChange={(v) =>
                        setConfig({ ...config, invoicePrefix: v })
                      }
                    />
                    <InputField
                      label="Starting Number"
                      value={config.invoiceStartingNumber?.toString()}
                      onChange={(v) =>
                        setConfig({
                          ...config,
                          invoiceStartingNumber: parseInt(v),
                        })
                      }
                      type="number"
                    />
                    <Toggle
                      checked={config.autoInvoiceNumber}
                      onChange={(v) =>
                        setConfig({ ...config, autoInvoiceNumber: v })
                      }
                      label="Auto-generate Invoice Numbers"
                    />
                    <SelectField
                      label="Print Size Default"
                      value={config.printSize}
                      options={["A4", "Thermal", "POS"]}
                      onChange={(v) => setConfig({ ...config, printSize: v })}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <QrCode size={20} className="text-blue-600" />
                    UPI Payments & Shop QR Config
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <InputField
                        label="UPI ID (VPA) for Payments"
                        value={config.upiId}
                        onChange={(v) => setConfig({ ...config, upiId: v })}
                        placeholder="e.g. merchant@upi or shop@gpay"
                      />

                      <Toggle
                        checked={config.showQrInInvoice}
                        onChange={(v) =>
                          setConfig({ ...config, showQrInInvoice: v })
                        }
                        label="Show Payment QR on printed/PDF Invoices"
                      />

                      <InputField
                        label="Bank Account Details (Printed on Invoice)"
                        value={config.bankDetails}
                        onChange={(v) =>
                          setConfig({ ...config, bankDetails: v })
                        }
                        isTextArea
                        placeholder="Bank: HDFC Bank&#10;A/C No: 5010023456789&#10;IFSC: HDFC0000123"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-3xl border border-slate-200/60 space-y-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">
                          Shop UPI QR Code Image
                        </span>

                        {config.upiQrUrl ? (
                          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-blue-100">
                            <div className="w-20 h-20 rounded-xl bg-slate-50 border flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img
                                src={config.upiQrUrl}
                                alt="Shop QR"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">
                                Shop QR Loaded
                              </p>
                              <p className="text-[10px] text-slate-400 block mt-0.5 font-bold leading-normal">
                                Active across POS Screen & Customers during UPI
                                billing checkout
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfig({ ...config, upiQrUrl: "" })
                                }
                                className="text-[10px] font-black text-red-500 hover:text-red-700 flex items-center gap-1 mt-2 uppercase transition-all duration-150 active:scale-95"
                              >
                                <Trash2 size={12} /> Delete Uploaded QR
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-slate-50 cursor-pointer bg-white h-32 rounded-2xl transition-all group relative">
                            <UploadCloud
                              size={32}
                              className="text-slate-400 group-hover:text-blue-500 transition-colors"
                            />
                            <span className="text-xs font-black text-slate-700 mt-2">
                              Upload Shop QR
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold mt-1">
                              Accepts PNG, JPG or SVG formats
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setConfig({
                                      ...config,
                                      upiQrUrl: reader.result,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                        <p className="text-[10px] text-slate-400 leading-normal font-medium pl-1">
                          You can upload your static Google Pay, PhonePe, or
                          BHIM UPI checkout banner.
                        </p>
                        <div className="bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10 text-[10px] text-blue-700 leading-normal font-bold">
                          💡 Quick Tip: If no QR image is uploaded, Billing 360
                          will compile a real-time, dynamic payment-linked QR
                          code mapping your UPI ID and Exact Bill Amount
                          dynamically when checking out!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6">
                    Invoice Layout Toggles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Toggle
                        checked={config.showBarcodeInInvoice}
                        onChange={(v) =>
                          setConfig({ ...config, showBarcodeInInvoice: v })
                        }
                        label="Show Product Barcode"
                      />
                      <Toggle
                        checked={config.showProductImageInInvoice}
                        onChange={(v) =>
                          setConfig({ ...config, showProductImageInInvoice: v })
                        }
                        label="Show Product Images"
                      />
                    </div>
                    <div className="space-y-4">
                      <SelectField
                        label="Print Size Default"
                        value={config.printSize}
                        options={["A4", "Thermal", "POS"]}
                        onChange={(v) => setConfig({ ...config, printSize: v })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6">
                    Terms & Footer
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Invoice Footer"
                      value={config.invoiceFooter}
                      onChange={(v) =>
                        setConfig({ ...config, invoiceFooter: v })
                      }
                      className="md:col-span-2"
                    />
                    <InputField
                      label="Terms & Conditions"
                      value={config.termsConditions}
                      onChange={(v) =>
                        setConfig({ ...config, termsConditions: v })
                      }
                      isTextArea
                      className="md:col-span-2"
                    />
                    <InputField
                      label="Digital Signature URL"
                      value={config.signatureUrl}
                      onChange={(v) =>
                        setConfig({ ...config, signatureUrl: v })
                      }
                      placeholder="https://..."
                      className="md:col-span-2"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Globe size={20} className="text-orange-600" />
                    International Layout & Formatting
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SelectField
                      label="Invoice Language"
                      value={config.invoiceLanguage || 'English'}
                      options={['English', 'Tamil', 'Hindi', 'Thai', 'Malay']}
                      onChange={(v) => setConfig({ ...config, invoiceLanguage: v })}
                    />
                    <SelectField
                      label="Currency Format"
                      value={config.currencyFormat || '₹X,XXX.XX'}
                      options={['₹X,XXX.XX', '$X,XXX.XX', 'THB X,XXX.XX', 'SGD X,XXX.XX', 'AED X,XXX.XX', 'X,XXX.XX']}
                      onChange={(v) => setConfig({ ...config, currencyFormat: v })}
                    />
                    <SelectField
                      label="Date Format"
                      value={config.dateFormat || 'DD-MM-YYYY'}
                      options={['DD-MM-YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY', 'DD/MM/YYYY']}
                      onChange={(v) => setConfig({ ...config, dateFormat: v })}
                    />
                    <SelectField
                      label="Country Invoice Template"
                      value={config.countryTemplate || 'Standard'}
                      options={['Standard', 'Elegant', 'Compact', 'Tax Invoice Template']}
                      onChange={(v) => setConfig({ ...config, countryTemplate: v })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "printer" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Printer size={20} className="text-amber-600" />
                    Printer Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Printer Name"
                      value={config.printerName}
                      onChange={(v) => setConfig({ ...config, printerName: v })}
                      placeholder="e.g. EPSON TM-T82"
                    />
                    <SelectField
                      label="Printer Type"
                      value={config.printerType}
                      options={["Thermal", "Laser", "Inkjet"]}
                      onChange={(v) => setConfig({ ...config, printerType: v })}
                    />

                    <SelectField
                      label="Paper Size"
                      value={config.paperSize}
                      options={["58mm", "80mm", "A4"]}
                      onChange={(v) => setConfig({ ...config, paperSize: v })}
                    />

                    <div className="flex items-center gap-3 pt-4">
                      <Toggle
                        checked={config.autoPrint}
                        onChange={(v) => setConfig({ ...config, autoPrint: v })}
                        label="Enable Auto-Print on Bill"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "whatsapp" && (
              <div className="space-y-8">
                <div className="p-8 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <Smartphone size={28} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900">
                        WhatsApp Cloud API
                      </h4>
                      <p className="text-sm text-slate-500 font-medium">
                        Connect your official WhatsApp Business account.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                      <Toggle
                        checked={config.enableWhatsApp}
                        onChange={(v) =>
                          setConfig({ ...config, enableWhatsApp: v })
                        }
                        label="Enable WhatsApp Notifications"
                      />
                    </div>

                    {config.enableWhatsApp && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4"
                      >
                        <InputField
                          label="WhatsApp API Token"
                          value={config.whatsappApiToken}
                          onChange={(v) =>
                            setConfig({ ...config, whatsappApiToken: v })
                          }
                          type="password"
                          placeholder="EAABw..."
                        />
                        <InputField
                          label="Business Phone ID"
                          placeholder="105..."
                          value={config.whatsappNumber}
                          onChange={(v) =>
                            setConfig({ ...config, whatsappNumber: v })
                          }
                        />
                        <div className="col-span-2">
                          <Toggle
                            checked={config.autoShareInvoice}
                            onChange={(v) =>
                              setConfig({ ...config, autoShareInvoice: v })
                            }
                            label="Auto-send PDF invoice when bill is generated"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "language" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Smartphone size={20} className="text-violet-600" />
                    {t.language_settings}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500 font-medium mb-4">
                        {t.language_settings} preferences for the dashboard and
                        printed invoices.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          "English",
                          "Tamil",
                          "Telugu",
                          "Kannada",
                          "Hindi",
                          "Malayalam",
                        ].map((lang) => (
                          <button
                            key={lang}
                            onClick={() =>
                              setConfig({ ...config, language: lang })
                            }
                            className={cn(
                              "px-6 py-4 rounded-2xl border-2 transition-all text-sm font-black text-center",
                              config.language === lang
                                ? "border-violet-600 bg-violet-50 text-violet-700 shadow-sm"
                                : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200 hover:text-slate-600",
                            )}
                          >
                            {lang === "Tamil"
                              ? "தமிழ் (Tamil)"
                              : lang === "Telugu"
                                ? "తెలుగు (Telugu)"
                                : lang === "Kannada"
                                  ? "ಕನ್ನಡ (Kannada)"
                                  : lang === "Hindi"
                                    ? "हिन्दी (Hindi)"
                                    : lang === "Malayalam"
                                      ? "മലയാളം (Malayalam)"
                                      : lang}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "backup" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Database size={20} className="text-slate-600" />
                    Cloud Backup & Recovery
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <Toggle
                        checked={config.autoBackup}
                        onChange={(v) =>
                          setConfig({ ...config, autoBackup: v })
                        }
                        label="Enable Automatic Cloud Backup"
                      />
                    </div>

                    {config.autoBackup && (
                      <>
                        <SelectField
                          label="Backup Destination"
                          value={config.backupLocation}
                          options={[
                            "Google Drive",
                            "Dropbox",
                            "AWS S3",
                            "Local",
                          ]}
                          onChange={(v) =>
                            setConfig({ ...config, backupLocation: v })
                          }
                        />

                        <SelectField
                          label="Backup Frequency"
                          value={config.backupFrequency}
                          options={["Daily", "Weekly", "Monthly"]}
                          onChange={(v) =>
                            setConfig({ ...config, backupFrequency: v })
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "tally" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Database size={20} className="text-indigo-600" />
                    Accounting System Integration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <SelectField
                        label="Accounting Integration"
                        value={config.accounting_system || 'TallyPrime'}
                        options={["TallyPrime", "QuickBooks", "Xero", "Zoho Books", "None"]}
                        onChange={(v) =>
                          setConfig({ ...config, accounting_system: v, enableTallyExport: v === "TallyPrime" })
                        }
                      />
                    </div>

                    {config.accounting_system === "TallyPrime" && (
                      <>
                        <div className="col-span-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                          <span className="text-sm font-bold text-indigo-900">
                            Export your data directly to Tally Prime.
                          </span>
                          <Toggle
                            checked={config.enableTallyExport}
                            onChange={(v) =>
                              setConfig({ ...config, enableTallyExport: v })
                            }
                            label="Enable Export"
                          />
                        </div>

                        {config.enableTallyExport && (
                          <>
                            <SelectField
                              label="Tally Version"
                              value={config.tallyVersion}
                              options={["TallyPrime", "Tally ERP 9"]}
                              onChange={(v) =>
                                setConfig({ ...config, tallyVersion: v })
                              }
                            />

                            <InputField
                              label="Server IP Address"
                              value={config.tallyIp}
                              onChange={(v) => setConfig({ ...config, tallyIp: v })}
                              placeholder="127.0.0.1"
                            />
                            <InputField
                              label="Server Port"
                              value={config.tallyPort}
                              onChange={(v) =>
                                setConfig({ ...config, tallyPort: v })
                              }
                              placeholder="9000"
                            />
                            <div className="col-span-2 space-y-4 pt-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                Data Mapping
                              </h4>
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4">
                                <Toggle
                                  checked={true}
                                  label="Sync Inventory"
                                  onChange={() => {}}
                                />
                                <Toggle
                                  checked={true}
                                  label="Sync Vouchers"
                                  onChange={() => {}}
                                />
                                <Toggle
                                  checked={false}
                                  label="Sync Ledger Balances"
                                  onChange={() => {}}
                                />
                                <Toggle
                                  checked={true}
                                  label="Auto-Sync on Day End"
                                  onChange={() => {}}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {["QuickBooks", "Xero", "Zoho Books"].includes(config.accounting_system) && (
                      <div className="col-span-2 p-6 bg-slate-50 rounded-2xl border border-slate-200/60 text-center">
                        <Database size={32} className="text-blue-500 mx-auto mb-2" />
                        <h4 className="text-sm font-black text-slate-800">
                          {config.accounting_system} Cloud Connection
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Clicking "Save Settings" will authorize and link Billing 360 to your cloud-hosted {config.accounting_system} account ledger.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "security" && (
              <div className="space-y-8">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Shield size={20} className="text-red-600" />
                  Security & Access Control
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 col-span-2">
                    <h4 className="font-bold text-slate-900 mb-4">
                      Login Security
                    </h4>
                    <div className="space-y-4">
                      <Toggle
                        checked={config.requireMfa}
                        onChange={(v) =>
                          setConfig({ ...config, requireMfa: v })
                        }
                        label="Require Multi-Factor Authentication (MFA)"
                      />
                      <Toggle
                        checked={config.restrictLoginByHours}
                        onChange={(v) =>
                          setConfig({ ...config, restrictLoginByHours: v })
                        }
                        label="Restrict Login by Working Hours"
                      />
                      <Toggle
                        checked={config.ipWhitelisting}
                        onChange={(v) =>
                          setConfig({ ...config, ipWhitelisting: v })
                        }
                        label="IP Whitelisting (Manager only)"
                      />
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 col-span-2">
                    <h4 className="font-bold text-slate-900 mb-4">
                      Password Policy
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Min Password Length"
                        value={config.minPasswordLength?.toString()}
                        onChange={(v) =>
                          setConfig({
                            ...config,
                            minPasswordLength: parseInt(v),
                          })
                        }
                        type="number"
                      />
                      <InputField
                        label="Password Reset (Days)"
                        value={config.passwordExpiryDays?.toString()}
                        onChange={(v) =>
                          setConfig({
                            ...config,
                            passwordExpiryDays: parseInt(v),
                          })
                        }
                        type="number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "subscription" && (
              <div className="space-y-8">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Check size={20} className="text-cyan-600" />
                  Your Subscription
                </h3>
                <div className="p-8 bg-cyan-50 rounded-3xl border border-cyan-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <span className="px-3 py-1 bg-cyan-600 text-white text-[10px] font-black uppercase rounded-full tracking-widest">
                        Active Plan
                      </span>
                      <h4 className="text-3xl font-black text-slate-900 mt-2">
                        Enterprise POS
                      </h4>
                      <p className="text-slate-500">
                        Billed annually. Next renewal on June 2025.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-400">
                        Monthly Usage
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        ₹4,999 / mo
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-cyan-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase">
                        Branches
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        5 / 10
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-cyan-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase">
                        Users
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        25 / Unlimited
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-cyan-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase">
                        Orders
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        Unlimited
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {![
              "company",
              "gst",
              "invoice",
              "whatsapp",
              "language",
              "tally",
              "printer",
              "backup",
              "security",
              "subscription",
            ].includes(activeSection) && (
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                  <Database size={40} />
                </div>
                <h3 className="text-slate-600 font-black italic">
                  Advanced{" "}
                  {menuItems.find((m) => m.id === activeSection)?.label} fields
                  coming in next build.
                </h3>
                <p className="text-slate-400 text-sm max-w-xs mt-2">
                  You can configure core business parameters in Company, GST,
                  and Invoice sections for now.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  className = "",
  isTextArea = false,
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
        {label}
      </label>
      {isTextArea ? (
        <textarea
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm min-h-[100px]"
          value={value || ""}
          onChange={(e) => onChange && onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm"
          value={value || ""}
          onChange={(e) => onChange && onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="space-y-2 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
        {label}
      </label>
      <select
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm appearance-none cursor-pointer"
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
      >
        <option value="" disabled>
          Select {label}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  const isChecked = !!checked;
  return (
    <label className="flex items-center gap-3 cursor-pointer group p-2">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={isChecked}
          onChange={(e) => onChange && onChange(e.target.checked)}
        />
        <div
          className={cn(
            "w-10 h-6 rounded-full transition-all",
            isChecked ? "bg-blue-600" : "bg-slate-200",
          )}
        ></div>
        <div
          className={cn(
            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all",
            isChecked ? "translate-x-4" : "translate-x-0",
          )}
        ></div>
      </div>
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </label>
  );
}
