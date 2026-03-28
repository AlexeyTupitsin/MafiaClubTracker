import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const VARIANTS = {
  success: { icon: CheckCircle, iconClass: "text-emerald-400", accentClass: "from-emerald-500 to-cyan-500", duration: 3000 },
  error: { icon: XCircle, iconClass: "text-red-400", accentClass: "from-red-500 to-red-400", duration: 5000 },
  warning: { icon: AlertTriangle, iconClass: "text-amber-400", accentClass: "from-amber-500 to-amber-400", duration: 4000 },
};

export function Toast({ message, type = "success", onClose }) {
  const variant = VARIANTS[type] || VARIANTS.success;
  const Icon = variant.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, variant.duration);
    return () => clearTimeout(timer);
  }, [onClose, variant.duration]);

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-toast-enter">
      <div className="flex items-center gap-3 bg-[#120f0a]/90 backdrop-blur-xl border border-indigo-500/15 text-slate-100 pl-1 pr-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/5 text-sm">
        <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${variant.accentClass}`} />
        <Icon size={16} className={`${variant.iconClass} shrink-0`} />
        {message}
      </div>
    </div>
  );
}
