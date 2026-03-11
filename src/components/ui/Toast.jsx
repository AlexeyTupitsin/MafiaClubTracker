import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

export function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm">
        <CheckCircle size={16} className="text-green-400 shrink-0" />
        {message}
      </div>
    </div>
  );
}
