import { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen";
import UserInterface from "./components/UserInterface";
import AdminDashboard from "./components/AdminDashboard";
import Toast, { ToastMessage } from "./components/Toast";
import { Token } from "./types";
import { seedDatabase, tokensCol } from "./utils/db";
import { getDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

type AppView = "LOGIN" | "USER_DASHBOARD" | "ADMIN_DASHBOARD";

export default function App() {
  const [view, setView] = useState<AppView>("LOGIN");
  const [userToken, setUserToken] = useState<Token | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize and Seed Database on startup
  useEffect(() => {
    const initApp = async () => {
      try {
        // Run seed database (only runs if Firestore is empty)
        await seedDatabase();

        // Load session if exists
        const savedToken = localStorage.getItem("boing_user_token");
        const savedAdmin = localStorage.getItem("boing_admin_logged");

        if (savedAdmin === "true") {
          setIsAdmin(true);
          setView("ADMIN_DASHBOARD");
        } else if (savedToken) {
          try {
            const tokenData = JSON.parse(savedToken) as Token;
            // Verify token exists and is active in Firestore on startup
            const docRef = doc(db, "token", tokenData.id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const t = snap.data() as Token;
              if (t.status === "Aktif") {
                setUserToken(t);
                setView("USER_DASHBOARD");
              } else {
                localStorage.removeItem("boing_user_token");
                showToast("Sesi berakhir: Token telah dinonaktifkan oleh Admin!", "error");
              }
            } else {
              localStorage.removeItem("boing_user_token");
              showToast("Sesi berakhir: Token tidak ditemukan!", "error");
            }
          } catch {
            localStorage.removeItem("boing_user_token");
          }
        }
      } catch (err) {
        console.error("Database seed or initialization failed:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();

    // Load active theme
    const savedTheme = localStorage.getItem("boing_theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("dark");
    }
  }, []);

  // Real-time listener for current token validity
  useEffect(() => {
    if (!userToken) return;

    const docRef = doc(db, "token", userToken.id);
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        localStorage.removeItem("boing_user_token");
        setUserToken(null);
        setView("LOGIN");
        showToast("Token Anda telah dihapus oleh Admin!", "error");
      } else {
        const t = snap.data() as Token;
        if (t.status !== "Aktif") {
          localStorage.removeItem("boing_user_token");
          setUserToken(null);
          setView("LOGIN");
          showToast("Token Anda telah dinonaktifkan oleh Admin!", "error");
        } else {
          // Keep current token updated in state
          setUserToken(t);
        }
      }
    }, (error) => {
      console.error("Token listener error:", error);
    });

    return () => unsub();
  }, [userToken?.id]);

  // Theme Applier
  const applyTheme = (t: "light" | "dark") => {
    const root = window.document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("boing_theme", nextTheme);
    applyTheme(nextTheme);
    showToast(`Mode ${nextTheme === "dark" ? "Gelap" : "Terang"} Diaktifkan`, "info");
  };

  // Toast Trigger Helper
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const newToast: ToastMessage = {
      id: Date.now().toString(),
      message,
      type
    };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      handleCloseToast(newToast.id);
    }, 4000);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // User Login Token Handler
  const handleLoginToken = async (tokenId: string): Promise<boolean> => {
    try {
      const docRef = doc(db, "token", tokenId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const t = snap.data() as Token;
        
        // Validate Token status
        if (t.status !== "Aktif") {
          showToast("Token ini tidak aktif!", "error");
          return false;
        }

        // Validate expiry date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
        
        let isExpired = false;
        if (t.kadaluarsa) {
          const parts = t.kadaluarsa.split("-");
          if (parts.length === 3) {
            // YYYY-MM-DD
            const expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (expDate < today) {
              isExpired = true;
            }
          } else {
            const expDate = new Date(t.kadaluarsa);
            if (!isNaN(expDate.getTime()) && expDate < today) {
              isExpired = true;
            }
          }
        }

        if (isExpired) {
          showToast("Token ini telah kadaluarsa!", "error");
          return false;
        }

        // Successfully logged in! Set token
        setUserToken(t);
        setView("USER_DASHBOARD");
        localStorage.setItem("boing_user_token", JSON.stringify(t));
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Admin Login Password Handler
  const handleLoginAdmin = (password: string): boolean => {
    if (password === "12445") {
      setIsAdmin(true);
      setView("ADMIN_DASHBOARD");
      localStorage.setItem("boing_admin_logged", "true");
      return true;
    }
    return false;
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("boing_user_token");
    localStorage.removeItem("boing_admin_logged");
    setUserToken(null);
    setIsAdmin(false);
    setView("LOGIN");
    showToast("Berhasil logout dari sistem.", "success");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs tracking-wider font-mono uppercase text-gray-400">MEMPERSIAPKAN BOING GACOR ENGINE...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${theme === "dark" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Toast Alerts Panel */}
      <Toast toasts={toasts} onClose={handleCloseToast} />

      {/* Screen Routing */}
      {view === "LOGIN" && (
        <LoginScreen 
          onLoginToken={handleLoginToken} 
          onLoginAdmin={handleLoginAdmin} 
          showToast={showToast} 
        />
      )}

      {view === "USER_DASHBOARD" && userToken && (
        <UserInterface 
          token={userToken} 
          onLogout={handleLogout} 
          showToast={showToast} 
        />
      )}

      {view === "ADMIN_DASHBOARD" && (
        <AdminDashboard 
          onLogout={handleLogout} 
          showToast={showToast} 
          theme={theme}
          toggleTheme={handleToggleTheme}
        />
      )}
    </div>
  );
}
