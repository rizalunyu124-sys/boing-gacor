import React, { useState } from "react";
import { KeyRound, ShieldAlert, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LoginScreenProps {
  onLoginToken: (token: string) => Promise<boolean>;
  onLoginAdmin: (password: string) => boolean;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function LoginScreen({ onLoginToken, onLoginAdmin, showToast }: LoginScreenProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Logo click handler for hidden admin
  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    
    if (newCount >= 5) {
      setShowAdminModal(true);
      setLogoClicks(0);
      showToast("Mode Admin Terdeteksi! Masukkan password.", "info");
    } else {
      // Reset clicks after 2 seconds of inactivity
      const timer = setTimeout(() => setLogoClicks(0), 2000);
      return () => clearTimeout(timer);
    }
  };

  // User Token Submit
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      showToast("Token tidak boleh kosong!", "error");
      return;
    }

    setIsLoading(true);
    try {
      const success = await onLoginToken(tokenInput.trim().toUpperCase());
      if (success) {
        showToast("Berhasil Masuk!", "success");
      } else {
        showToast("Token tidak valid atau kadaluarsa!", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Admin Password Submit
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      showToast("Password tidak boleh kosong!", "error");
      return;
    }

    const success = onLoginAdmin(adminPassword);
    if (success) {
      showToast("Selamat datang Admin!", "success");
      setShowAdminModal(false);
      setAdminPassword("");
    } else {
      showToast("Password Admin Salah!", "error");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 font-sans p-4">
      {/* Dynamic colorful blur blobs */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-fuchsia-600/25 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-amber-500/20 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col items-center"
      >
        {/* Clickable Logo */}
        <div 
          onClick={handleLogoClick}
          className="group cursor-pointer select-none flex flex-col items-center mb-8 relative"
          title="Klik logo 5x untuk akses admin"
        >
          {/* Outer glow ring */}
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-full opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500"></div>

          <div className="relative flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-black font-sans select-none filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.3)]">
              BOING
            </h1>
            <Zap className="w-9 h-9 md:w-11 md:h-11 text-amber-400 fill-amber-400 filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.4)] transform -rotate-12 group-hover:scale-110 transition duration-300" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-widest mt-[-2px] filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.1)]">
            GACOR
          </h2>
          
          <p className="text-[10px] text-gray-500 tracking-wider font-mono mt-3 uppercase opacity-60 group-hover:opacity-100 transition duration-300">
            Klik logo 5x untuk akses admin
          </p>
        </div>

        {/* Login Form */}
        <div className="w-full">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-gray-200">Masukkan Token Anda</h3>
            <p className="text-xs text-gray-400 mt-1">Gunakan token aktif Anda untuk mengakses layanan</p>
          </div>

          <form onSubmit={handleTokenSubmit} className="space-y-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Masukkan Token"
                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 text-center font-bold tracking-wider placeholder:text-gray-500 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all font-sans"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold py-4 px-6 transition duration-300 shadow-lg shadow-pink-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>MASUK</>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-gray-500 font-mono">
          © 2026 BOING GACOR. ALL RIGHTS RESERVED.
        </div>
      </motion.div>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-3">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Login Admin</h3>
                <p className="text-xs text-gray-400 mt-1">Masukkan password admin untuk masuk ke dashboard</p>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Password Admin"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 text-center font-bold tracking-widest focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all font-sans"
                  autoFocus
                />

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminModal(false);
                      setAdminPassword("");
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium py-3 rounded-xl transition duration-200 active:scale-95 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition duration-200 shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer"
                  >
                    Masuk Admin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
