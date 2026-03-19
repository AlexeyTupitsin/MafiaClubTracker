import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const VARIANTS = {
  success: { icon: CheckCircle, iconClass: "text-emerald-400", borderClass: "border-emerald-500/30", duration: 3000 },
  error: { icon: XCircle, iconClass: "text-red-400", borderClass: "border-red-500/30", duration: 5000 },
  warning: { icon: AlertTriangle, iconClass: "text-amber-400", borderClass: "border-amber-500/30", duration: 4000 },
};

export function Toast({ message, type = "success", onClose }) {
  const variant = VARIANTS[type] || VARIANTS.success;
  const Icon = variant.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, variant.duration);
    return () => clearTimeout(timer);
  }, [onClose, variant.duration]);

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 animate-toast-enter">
      <div className={`flex items-center gap-2 bg-[#1f1f1f] border ${variant.borderClass} text-white px-4 py-2.5 rounded-lg shadow-lg text-sm`}>
        <Icon size={16} className={`${variant.iconClass} shrink-0`} />
        {message}
      </div>
    </div>
  );
}
