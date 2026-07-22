import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function StatCard({ title, value, subValue, icon: Icon, trend, color = 'blue', to }) {
  const colorStyles = {
    blue: 'bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-blue-500/10 hover:shadow-blue-500/25',
    green: 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-emerald-500/10 hover:shadow-emerald-500/25',
    purple: 'bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white shadow-purple-500/10 hover:shadow-purple-500/25',
    orange: 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-orange-500/10 hover:shadow-orange-500/25',
    red: 'bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white shadow-red-500/10 hover:shadow-red-500/25',
    teal: 'bg-gradient-to-br from-[#14B8A6] to-[#0F766E] text-white shadow-teal-500/10 hover:shadow-teal-500/25',
    indigo: 'bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white shadow-indigo-500/10 hover:shadow-indigo-500/25',
    amber: 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-amber-500/10 hover:shadow-amber-500/25',
    emerald: 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-emerald-500/10 hover:shadow-emerald-500/25'
  };

  const CardContent = (
    <div className="flex flex-col justify-between h-full min-h-[120px] relative overflow-hidden">
      {/* Subtle background graphic for modern look */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-xl pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4">
        {Icon && (
          <div className="p-2.5 rounded-2xl bg-white/15 text-white backdrop-blur-md shadow-sm border border-white/10 flex items-center justify-center">
            <Icon size={20} className="w-5 h-5 stroke-[2.5]" />
          </div>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10",
            trend.isUp ? "bg-emerald-400/20 text-emerald-100" : "bg-red-400/20 text-red-100"
          )}>
            {trend.isUp ? <TrendingUp size={12} className="w-3 h-3 text-emerald-300" /> : <TrendingDown size={12} className="w-3 h-3 text-red-300" />}
            <span>{trend.isUp ? '↑' : '↓'} {trend.value}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1 z-10">
        <p className="text-white/85 text-xs font-bold tracking-wider uppercase">{title}</p>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{value}</h3>
          {subValue && (
            <span className="text-[10px] font-semibold text-white/75 bg-black/15 px-1.5 py-0.5 rounded-md leading-none self-center">
              {subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const containerClasses = "p-5 rounded-2xl border border-transparent shadow-md transition-all duration-300 select-none cursor-pointer h-full";

  if (to) {
    return (
      <Link to={to} className="block h-full group">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(containerClasses, colorStyles[color] || colorStyles.blue)}
        >
          {CardContent}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(containerClasses, colorStyles[color] || colorStyles.blue)}
    >
      {CardContent}
    </motion.div>
  );
}
