import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { User, ShieldCheck, Mail, Lock, CheckCircle2, ChevronRight, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920", // Grocery
  "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=1920", // Tech
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1920", // Fashion
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920", // Warehouse
];

export default function Login() {
  const { login, employeeLogin } = useAuth();
  const [loginType, setLoginType] = useState('admin');
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bgIndex, setBgIndex] = useState(0);

  // Rotate backgrounds
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      await login(cleanEmail, password);
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    setIsSubmitting(true);
    setError('');
    try {
      await employeeLogin(cleanUsername, password);
    } catch (err) {
      setError(err.message || "Invalid staff credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 lg:p-12 overflow-hidden">
      {/* Dynamic Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={bgIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10" />
          <img 
            src={BACKGROUND_IMAGES[bgIndex]} 
            alt="background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      <div className="container max-w-6xl z-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side: Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block text-white space-y-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl font-black shadow-2xl shadow-blue-500/20">
              B
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter">BILLING 360</h1>
              <p className="text-blue-200 font-bold tracking-widest uppercase text-xs">Smart Business • Better Management</p>
            </div>
          </div>

          <h2 className="text-6xl font-black leading-tight">
            The next generation of <span className="text-blue-400">Enterprise ERP.</span>
          </h2>

          <div className="grid grid-cols-2 gap-6 pt-8">
            {[
              { icon: CheckCircle2, text: "GST Billing & Filing" },
              { icon: CheckCircle2, text: "Inventory Management" },
              { icon: CheckCircle2, text: "Financial Accounting" },
              { icon: CheckCircle2, text: "Multi-branch Support" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-lg font-medium text-slate-200">
                <item.icon className="text-blue-400" size={24} />
                {item.text}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 pb-4 text-center">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Welcome Back</h3>
            <p className="text-slate-500 text-sm font-medium">Choose your login dimension to continue</p>
          </div>

          {/* Login Type Switcher */}
          <div className="px-8 flex p-1 bg-slate-100 rounded-2xl mx-8 mb-8">
            <button 
              onClick={() => { setLoginType('admin'); setError(''); }}
              type="button"
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                loginType === 'admin' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ShieldCheck size={18} />
              Owner/Admin
            </button>
            <button 
              onClick={() => { setLoginType('employee'); setError(''); }}
              type="button"
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                loginType === 'employee' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <User size={18} />
              Staff Login
            </button>
          </div>

          <div className="px-8 pb-12 flex-1">
            <AnimatePresence mode="wait">
              {loginType === 'admin' ? (
                <motion.form 
                  key="admin"
                  onSubmit={handleAdminLogin}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        required
                        type="email"
                        placeholder="admin@business.com"
                        className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-[20px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-[20px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                      {error}
                    </p>
                  )}

                  <button 
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-[24px] font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-blue-600/20 group disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Verifying Admin...' : isRegistering ? 'Create Admin Account' : 'Authenticate Admin'}
                    <ChevronRight size={18} />
                  </button>

                  <div className="text-center">
                    <button 
                      type="button"
                      onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                      className="text-blue-600 text-xs font-bold hover:underline cursor-pointer"
                    >
                      {isRegistering ? 'Already have an account? Login' : 'First time? Create an admin account'}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form 
                  key="employee"
                  onSubmit={handleEmployeeLogin}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Branch Username</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        required
                        type="text"
                        placeholder="e.g. john_manager"
                        className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-[20px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Access Key (Password)</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-[20px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                      {error}
                    </p>
                  )}

                  <button 
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 hover:bg-black text-white h-16 rounded-[24px] font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-900/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Verifying Staff Access...' : 'Authenticate Staff'}
                    <ChevronRight size={18} />
                  </button>

                  <div className="pt-2 flex items-center gap-2 justify-center text-slate-400">
                    <Store size={14} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Employee Portal v2.0</span>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Secured by Antigravity Cloud Security
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
