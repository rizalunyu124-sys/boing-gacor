import { Sun, Moon } from "lucide-react";
import { motion } from "motion/react";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-2.5 rounded-xl border bg-white/5 border-white/10 text-gray-700 dark:text-gray-200 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
      aria-label="Toggle Theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === "dark" ? 180 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5 text-amber-400" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-500" />
        )}
      </motion.div>
    </button>
  );
}
