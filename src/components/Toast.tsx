import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function Toast({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-xl backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : toast.type === "error"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              {toast.type === "info" && <Info className="w-5 h-5 flex-shrink-0" />}
              <p className="text-sm font-medium font-sans">{toast.message}</p>
            </div>
            <button
              onClick={() => onClose(toast.id)}
              className="ml-3 hover:opacity-80 transition p-1 rounded-full hover:bg-white/5 cursor-pointer text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
