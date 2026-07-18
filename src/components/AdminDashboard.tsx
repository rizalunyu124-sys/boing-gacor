import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  RefreshCw, 
  KeyRound, 
  Activity, 
  Trash2, 
  Download, 
  Database, 
  Users, 
  Search, 
  Check, 
  X, 
  AlertTriangle,
  Moon,
  Sun,
  Shield,
  Clock,
  Copy,
  LogOut,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Token, MasterData, HistoryActivity } from "../types";
import { 
  getDocs, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch,
  limit,
  where,
  getCountFromServer
} from "firebase/firestore";
import { db } from "../firebase";
import { 
  tokensCol, 
  masterDataCol, 
  historyCol, 
  saveToken, 
  deleteToken,
  deleteMasterDataRow
} from "../utils/db";
import * as XLSX from "xlsx";

interface AdminDashboardProps {
  onLogout: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function AdminDashboard({ onLogout, showToast, theme, toggleTheme }: AdminDashboardProps) {
  // Database States
  const [tokens, setTokens] = useState<Token[]>([]);
  const [masterData, setMasterData] = useState<MasterData[]>([]);
  const [totalMasterCount, setTotalMasterCount] = useState<number>(0);
  const [history, setHistory] = useState<HistoryActivity[]>([]);

  // UI Control States
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch total count of master_data
  const fetchTotalCount = async () => {
    try {
      const snap = await getCountFromServer(masterDataCol);
      setTotalMasterCount(snap.data().count);
    } catch (err) {
      console.error("Gagal mengambil jumlah total data:", err);
    }
  };

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    // 1. Listen for Tokens
    const unsubTokens = onSnapshot(tokensCol, (snap) => {
      const list = snap.docs.map(d => d.data() as Token);
      const sorted = list.sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.tanggalDibuat.localeCompare(a.tanggalDibuat);
      });
      setTokens(sorted);
    });

    // 2. Listen for Master Data (KPJ Excel Admin) - limited to first 100 rows
    // Only subscribe to default limited set when searchQuery is empty
    let unsubMaster: () => void = () => {};
    if (searchQuery.trim() === "") {
      const qMaster = query(masterDataCol, limit(100));
      unsubMaster = onSnapshot(qMaster, (snap) => {
        const list = snap.docs.map(d => d.data() as MasterData);
        setMasterData(list);
      });
    }

    // 3. Listen for History (Aktivitas Pengguna)
    const unsubHist = onSnapshot(query(historyCol, orderBy("timestamp", "desc")), (snap) => {
      const list = snap.docs.map(d => d.data() as HistoryActivity);
      setHistory(list);
    });

    // Fetch initial total count
    fetchTotalCount();

    return () => {
      unsubTokens();
      unsubMaster();
      unsubHist();
    };
  }, [searchQuery]);

  // Debounced Search on Firestore (No. KPJ, Nama, NIK)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q === "") return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const results: MasterData[] = [];
        const seenIds = new Set<string>();

        const addResult = (d: MasterData) => {
          if (!seenIds.has(d.nomor)) {
            seenIds.add(d.nomor);
            results.push(d);
          }
        };

        // Search Query 1: by nomor (starts with searchQuery)
        const qNomor = query(
          masterDataCol,
          where("nomor", ">=", q),
          where("nomor", "<=", q + "\uf8ff"),
          limit(50)
        );
        const snapNomor = await getDocs(qNomor);
        snapNomor.forEach(doc => addResult(doc.data() as MasterData));

        // Search Query 2: by nama (starts with uppercase searchQuery)
        const qNama = query(
          masterDataCol,
          where("nama", ">=", q.toUpperCase()),
          where("nama", "<=", q.toUpperCase() + "\uf8ff"),
          limit(50)
        );
        const snapNama = await getDocs(qNama);
        snapNama.forEach(doc => addResult(doc.data() as MasterData));

        // Search Query 3: by identitas (starts with searchQuery)
        const qIdentitas = query(
          masterDataCol,
          where("identitas", ">=", q),
          where("identitas", "<=", q + "\uf8ff"),
          limit(50)
        );
        const snapIdentitas = await getDocs(qIdentitas);
        snapIdentitas.forEach(doc => addResult(doc.data() as MasterData));

        setMasterData(results);
      } catch (err) {
        console.error("Gagal mencari data di Firestore:", err);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Sync totalCount whenever masterData length changes (e.g., deletions or uploads)
  useEffect(() => {
    fetchTotalCount();
  }, [masterData.length]);

  // Format IDR Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // ACTION: Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Token "${text}" berhasil disalin!`, "success");
  };

  // ACTION: Generate Single Random Uppercase Alphabetic Token
  const handleGenerateSingleToken = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const today = new Date().toISOString().split("T")[0];
    const nextYearDate = new Date();
    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
    const expiry = nextYearDate.toISOString().split("T")[0];

    const newToken: Token = {
      id: result,
      status: "Aktif",
      tanggalDibuat: today,
      kadaluarsa: expiry,
      penggunaAktif: 0,
      timestamp: Date.now()
    };

    try {
      await saveToken(newToken);
      setGeneratedToken(result);
      showToast(`Token baru "${result}" berhasil dibuat!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan token ke database!", "error");
    }
  };

  // ACTION: Generate Custom Count of Random Uppercase Alphabetic Tokens in Batch
  const handleGenerateTokensBatch = async (count: number) => {
    if (!confirm(`Apakah Anda yakin ingin membuat ${count} Token Acak sekaligus?`)) return;
    try {
      showToast(`Sedang membuat ${count} token acak...`, "info");
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const today = new Date().toISOString().split("T")[0];
      const nextYearDate = new Date();
      nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
      const expiry = nextYearDate.toISOString().split("T")[0];

      const tokensList: { id: string; data: Token }[] = [];
      for (let i = 0; i < count; i++) {
        let tokenId = "";
        for (let c = 0; c < 8; c++) {
          tokenId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const newToken: Token = {
          id: tokenId,
          status: "Aktif",
          tanggalDibuat: today,
          kadaluarsa: expiry,
          penggunaAktif: 0,
          timestamp: Date.now() - i
        };
        tokensList.push({ id: tokenId, data: newToken });
      }

      try {
        const batch = writeBatch(db);
        tokensList.forEach(({ id, data }) => {
          const docRef = doc(db, "token", id);
          batch.set(docRef, data);
        });
        await batch.commit();
      } catch (batchErr) {
        console.warn("writeBatch gagal, beralih ke Promise.all setDoc", batchErr);
        // Fallback: simpan satu per satu secara paralel
        const promises = tokensList.map(({ id, data }) => {
          return setDoc(doc(db, "token", id), data);
        });
        await Promise.all(promises);
      }

      showToast(`Berhasil membuat ${count} token acak secara massal!`, "success");
    } catch (err: any) {
      console.error("Gagal membuat token massal:", err);
      showToast(`Gagal membuat ${count} token: ${err?.message || err}`, "error");
    }
  };

  // ACTION: Toggle Token Status (Active / Inactive)
  const handleToggleToken = async (token: Token) => {
    try {
      const updated: Token = {
        ...token,
        status: token.status === "Aktif" ? "Nonaktif" : "Aktif"
      };
      await saveToken(updated);
      showToast(`Token ${token.id} diubah menjadi ${updated.status}!`, "success");
    } catch {
      showToast("Gagal mengubah status token!", "error");
    }
  };

  // ACTION: Delete Single Token
  const handleDeleteToken = async (id: string) => {
    if (!confirm(`Hapus token "${id}"?`)) return;
    try {
      await deleteToken(id);
      if (generatedToken === id) {
        setGeneratedToken("");
      }
      showToast("Token berhasil dihapus!", "success");
    } catch {
      showToast("Gagal menghapus token!", "error");
    }
  };

  // ACTION: Delete All Tokens in Batch
  const handleDeleteAllTokens = async () => {
    if (!confirm("⚠️ PERINGATAN: Apakah Anda yakin ingin menghapus SELURUH token akses? Tindakan ini tidak dapat dibatalkan!")) return;
    try {
      showToast("Sedang menghapus seluruh token...", "info");
      const snap = await getDocs(tokensCol);
      if (snap.empty) {
        showToast("Database token sudah kosong!", "info");
        return;
      }

      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 400);
        chunk.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }

      setGeneratedToken("");
      showToast("Seluruh token berhasil dihapus!", "success");
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus token!", "error");
    }
  };

  // ACTION: Delete All Master Data (KPJ Excel Admin)
  const handleDeleteAllMasterData = async () => {
    if (!confirm("⚠️ PERINGATAN KERAS: Apakah Anda yakin ingin menghapus SELURUH data Excel KPJ Admin? Tindakan ini bersifat permanen!")) return;
    try {
      showToast("Sedang menghapus data...", "info");
      const snap = await getDocs(masterDataCol);
      if (snap.empty) {
        showToast("Database Excel sudah kosong!", "info");
        return;
      }

      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 400);
        chunk.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }

      showToast("Seluruh data Excel KPJ Admin berhasil dihapus dari server!", "success");
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus data Excel!", "error");
    }
  };

  // ACTION: Delete Single Master Data Row
  const handleDeleteMasterDataRow = async (nomor: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data KPJ nomor "${nomor}"?`)) return;
    try {
      await deleteMasterDataRow(nomor);
      showToast(`Data KPJ nomor "${nomor}" berhasil dihapus!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus data KPJ!", "error");
    }
  };

  // EXCEL PARSING & IMPORT
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  const parseExcelDate = (val: any): string => {
    if (val === undefined || val === null) return "";
    let str = String(val).trim();
    if (!str) return "";

    // 1. If it's a number (Excel serial date)
    const isNumOnly = /^\d+$/.test(str);
    if (typeof val === "number" || isNumOnly) {
      const num = Number(val);
      if (num > 10000 && num < 60000) { // realistic range for birthdays (1927 to 2064)
        try {
          const date = new Date(Math.round((num - 25568) * 24 * 3600 * 1000));
          const d = String(date.getDate()).padStart(2, "0");
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const y = date.getFullYear();
          return `${d}-${m}-${y}`;
        } catch (e) {
          // ignore and fallback
        }
      }
    }

    // 2. Direct Regex matching of YYYY-MM-DD anywhere in the string
    const matchYmd = str.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (matchYmd) {
      const y = matchYmd[1];
      const m = matchYmd[2].padStart(2, "0");
      const d = matchYmd[3].padStart(2, "0");
      return `${d}-${m}-${y}`;
    }

    // 3. Direct Regex matching of DD-MM-YYYY anywhere in the string
    // This handles: ", 10-03-1992", "KUIN, 26-05-1988", "26/05/1988", etc.
    const matchDmy = str.match(/(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2,4})/);
    if (matchDmy) {
      const d = matchDmy[1].padStart(2, "0");
      const m = matchDmy[2].padStart(2, "0");
      let y = matchDmy[3];
      if (y.length === 2) {
        y = parseInt(y) > 30 ? "19" + y : "20" + y;
      }
      return `${d}-${m}-${y}`;
    }

    // 4. Fallback if commas exist but no match found
    if (str.includes(",")) {
      const parts = str.split(",");
      const datePart = parts[parts.length - 1]?.trim();
      if (datePart) {
        return datePart;
      }
    }

    return str;
  };

  const processExcelFile = (file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!isExcel) {
      showToast("Format file harus .xlsx atau .xls (Excel)!", "error");
      return;
    }

    setIsUploading(true);
    showToast("Sedang membaca file Excel...", "info");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[wsname];
        
        // Convert to JSON
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (rawRows.length === 0) {
          showToast("File excel tidak memiliki baris data!", "error");
          setIsUploading(false);
          return;
        }

        showToast(`Ditemukan ${rawRows.length} baris. Menyimpan permanen ke server...`, "info");

        let addedCount = 0;
        let updatedCount = 0;

        // Perform batch writes in chunks of 400 for Firestore reliability
        for (let i = 0; i < rawRows.length; i += 400) {
          const chunk = rawRows.slice(i, i + 400);
          const batch = writeBatch(db);

          for (const row of chunk) {
            // Case-insensitive / alternative header mapping
            const nomorRaw = row.Nomor || row.nomor || row.NOMOR || row.Kpj || row.kpj || row.KPJ;
            const namaRaw = row.Nama || row.nama || row.NAMA;
            const identitasRaw = row.Identitas || row.identitas || row.IDENTITAS || row.Nik || row.nik || row.NIK;
            
            const tglLahirRaw = 
              row["Tanggal Lahir"] || 
              row.tanggal_lahir || 
              row.TANGGAL_LAHIR || 
              row.Lahir || 
              row.lahir ||
              row["Tempat, Tanggal Lahir"] ||
              row["TEMPAT, TANGGAL LAHIR"] ||
              row["tempat, tanggal lahir"] ||
              row["Tempat Tanggal Lahir"] ||
              row["TEMPAT TANGGAL LAHIR"] ||
              row["tempat tanggal lahir"] ||
              row.Ttl ||
              row.ttl ||
              row.TTL ||
              row["Tgl Lahir"] ||
              row["TGL LAHIR"] ||
              row["tgl lahir"];

            let alamatRaw = row.Alamat || row.alamat || row.ALAMAT;
            if (!alamatRaw) {
              const kabRaw = row.Kabupaten || row.kabupaten || row.KABUPATEN || row["Kabupaten/Kota"] || row["KABUPATEN/KOTA"] || row["Kabupaten / Kota"] || row.Kota || row.kota || row.KOTA;
              const provRaw = row.Provinsi || row.provinsi || row.PROVINSI;
              if (kabRaw || provRaw) {
                alamatRaw = [kabRaw, provRaw].filter(Boolean).join(", ");
              }
            }

            const tglUpdateRaw = row["Tanggal Update"] || row.tanggal_update || row.TANGGAL_UPDATE || row.Update || row.update;
            const saldoRaw = row.Saldo || row.saldo || row.SALDO;
            const statusRaw = row.Status || row.status || row.STATUS;
            const keteranganRaw = row.Keterangan || row.keterangan || row.KETERANGAN;
            const pesanRaw = row.Pesan || row.pesan || row.PESAN;

            // Optional custom columns
            const ibuKandungRaw = row["Ibu Kandung"] || row.ibu_kandung || row.ibukandung || row["Nama Ibu"] || row.ibu || row.IBU || row.IbuKandung;
            const jenisKelaminRaw = row["Jenis Kelamin"] || row.jenis_kelamin || row.jeniskelamin || row.Gender || row.gender || row["L/P"] || row.lp || row.LP || row.Sex || row.sex;

            if (!nomorRaw) continue; // Skip rows without KPJ / Nomor

            const nomorStr = String(nomorRaw).trim();
            const exists = masterData.some(d => d.nomor === nomorStr);

            // Robustly parse numeric saldos (removing dots, currency indicators, spaces, etc.)
            const parseSaldoValue = (val: any): number => {
              if (val === undefined || val === null) return 0;
              if (typeof val === "number") return val;
              let str = String(val).trim();
              
              // If it contains a parenthesis or "rincian", split and take the first part
              if (str.includes("(")) {
                str = str.split("(")[0].trim();
              } else if (str.toLowerCase().includes("rincian")) {
                str = str.toLowerCase().split("rincian")[0].trim();
              }
              
              // Remove currency prefix and characters
              str = str.replace(/[Rp\sIDR]/gi, "");
              
              // Handle Indonesian dot thousands-separator and comma decimal-separator format
              if (str.includes(".") && str.includes(",")) {
                str = str.replace(/\./g, "").replace(/,/g, ".");
              } else if (str.includes(",")) {
                const commaCount = (str.match(/,/g) || []).length;
                if (commaCount > 1) {
                  str = str.replace(/,/g, "");
                } else {
                  const parts = str.split(",");
                  if (parts[1] && parts[1].length === 3) {
                    str = str.replace(/,/g, "");
                  } else {
                    str = str.replace(/,/g, ".");
                  }
                }
              } else if (str.includes(".")) {
                const dotCount = (str.match(/\./g) || []).length;
                if (dotCount > 1) {
                  str = str.replace(/\./g, "");
                } else {
                  const parts = str.split(".");
                  if (parts[1] && parts[1].length === 3) {
                    str = str.replace(/\./g, "");
                  }
                }
              }
              
              const cleaned = str.replace(/[^0-9.-]/g, "");
              const num = parseFloat(cleaned);
              return isNaN(num) ? 0 : num;
            };

            const record: MasterData = {
              nomor: nomorStr,
              nama: String(namaRaw || "").toUpperCase(),
              identitas: String(identitasRaw || ""),
              tanggalLahir: parseExcelDate(tglLahirRaw),
              alamat: String(alamatRaw || ""),
              tanggalUpdate: String(tglUpdateRaw || new Date().toLocaleDateString("id-ID")),
              saldo: parseSaldoValue(saldoRaw),
              status: String(statusRaw || "1"),
              keterangan: String(keteranganRaw || ""),
              pesan: String(pesanRaw || ""),
              ibuKandung: ibuKandungRaw ? String(ibuKandungRaw).trim().toUpperCase() : undefined,
              jenisKelamin: jenisKelaminRaw ? String(jenisKelaminRaw).trim().toUpperCase() : undefined,
            };

            const docRef = doc(db, "master_data", record.nomor);
            batch.set(docRef, record);

            if (exists) {
              updatedCount++;
            } else {
              addedCount++;
            }
          }
          await batch.commit();
        }

        showToast(`Impor Excel Berhasil! ${addedCount} data baru disimpan, ${updatedCount} diperbarui.`, "success");
      } catch (err) {
        console.error(err);
        showToast("Gagal memproses file Excel!", "error");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  // ACTION: Download Template Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Nomor": "24095647376",
        "Nama": "SHELLY ANGRAENI",
        "Identitas": "3603126401050003",
        "Tanggal Lahir": "24-01-2005",
        "Alamat": "ALAMAT TIDAK ADA",
        "Tanggal Update": "01-11-2024",
        "Saldo": 1129220,
        "Status": "1",
        "Keterangan": "Silahkan Gunakan Aplikasi Resmi",
        "Pesan": "Silahkan melanjutkan pendaftaran"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Template_KPJ_Admin.xlsx");
    showToast("Template Excel berhasil diunduh!", "success");
  };

  // FILTERED LISTS
  const filteredMasterData = masterData.filter(d => 
    d.nomor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.identitas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTokens = tokens.filter(t =>
    t.id.toLowerCase().includes(tokenSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* HEADER BAR */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 p-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5 fill-amber-500/10" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-wider uppercase">BOING GACOR</h1>
              <p className="text-xs text-amber-400 font-bold tracking-widest mt-[-2px] uppercase">PANEL ADMINISTRATOR</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition"
              title="Ganti Tema"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
            
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/15 border border-rose-500/10 transition active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Keluar Panel
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">

        {/* OVERVIEW STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Database Excel Admin</p>
              <p className="text-2xl font-black text-white mt-0.5">{totalMasterCount || masterData.length}</p>
              <p className="text-[10px] text-indigo-400 font-mono mt-0.5">KPJ TERPANEL PERMANEN</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Token Aktif</p>
              <p className="text-2xl font-black text-white mt-0.5">{tokens.filter(t => t.status === "Aktif").length}</p>
              <p className="text-[10px] text-amber-400 font-mono mt-0.5">SIAP DISTRIBUSI</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Aktivitas Diproses</p>
              <p className="text-2xl font-black text-white mt-0.5">{history.length}</p>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">SINKRONISASI PENGGUNA</p>
            </div>
          </div>
        </div>

        {/* BENTO GRID WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: EXCEL DATABASE MANAGEMENT */}
          <section className="bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Impor & Kelola Excel KPJ
                </h2>
                <p className="text-xs text-gray-400 mt-1">Impor Excel admin untuk menyinkronkan data pengguna secara permanen.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Unduh Contoh Template Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </button>

                <button
                  onClick={handleDeleteAllMasterData}
                  disabled={masterData.length === 0}
                  className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Kosongkan Semua Data Excel"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Excel
                </button>
              </div>
            </div>

            {/* DRAG AND DROP UPLOADER */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                dragActive 
                  ? "border-indigo-500 bg-indigo-500/5" 
                  : "border-white/10 hover:border-indigo-500/40 hover:bg-white/5"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInput}
                accept=".xlsx, .xls"
                className="hidden"
                disabled={isUploading}
              />
              
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3.5 transition ${
                isUploading ? "bg-indigo-500/25 text-indigo-400 animate-spin" : "bg-indigo-500/10 text-indigo-400"
              }`}>
                {isUploading ? <RefreshCw className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>

              {isUploading ? (
                <div>
                  <p className="text-sm font-bold text-white">Sedang mengimpor data ke server...</p>
                  <p className="text-xs text-gray-400 mt-1">Harap tidak menutup halaman ini</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-gray-200">
                    Tarik file Excel ke sini, atau <span className="text-indigo-400 underline">klik untuk mencari</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Format file didukung: .xlsx atau .xls</p>
                </div>
              )}
            </div>

            {/* LIVE EXCEL DATA PREVIEW & SEARCH */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Data KPJ Tersimpan ({searchQuery.trim() ? filteredMasterData.length : totalMasterCount})
                </span>
                
                <div className="relative w-48 sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari KPJ, Nama, NIK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-xs rounded-xl pl-9 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-slate-950/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 border-b border-white/10 sticky top-0 text-gray-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">No. KPJ</th>
                      <th className="p-2.5">Nama</th>
                      <th className="p-2.5">NIK (Identitas)</th>
                      <th className="p-2.5 text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMasterData.slice(0, 100).map((row) => (
                      <tr key={row.nomor} className="hover:bg-white/5 transition">
                        <td className="p-2.5 font-mono text-indigo-400 font-bold">{row.nomor}</td>
                        <td className="p-2.5 font-semibold text-gray-100">{row.nama}</td>
                        <td className="p-2.5 text-gray-400 font-mono">{row.identitas || "-"}</td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleDeleteMasterDataRow(row.nomor)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/10 transition cursor-pointer"
                            title="Hapus Data Excel ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {filteredMasterData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                          Belum ada data Excel KPJ diimpor ke database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {(filteredMasterData.length > 100 || (!searchQuery.trim() && totalMasterCount > 100)) && (
                <p className="text-[10px] text-gray-500 text-right font-mono italic">
                  Menampilkan {Math.min(filteredMasterData.length, 100)} dari {searchQuery.trim() ? filteredMasterData.length : totalMasterCount} total baris data.
                </p>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: ACCESS TOKEN GENERATOR */}
          <section className="bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Pembuat Token Akses
                </h2>
                <p className="text-xs text-gray-400 mt-1">Buat token huruf acak sekali klik agar pengguna tidak bisa memalsukan.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteAllTokens}
                  disabled={tokens.length === 0}
                  className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Hapus Semua Token"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Semua
                </button>
              </div>
            </div>

            {/* INSTANT GENERATOR INTERFACES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* INSTANT SINGLE BUTTON CARD */}
              <div className="bg-slate-950 border border-white/10 p-5 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Token Akses Tunggal
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Buat 1 token acak aman yang siap didistribusikan langsung.</p>
                </div>
                
                <button
                  onClick={handleGenerateSingleToken}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/15"
                >
                  + Buat 1 Token Instan
                </button>
              </div>

              {/* INSTANT 100 BATCH CARD */}
              <div className="bg-slate-950 border border-white/10 p-5 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Token Akses 100 Instan
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Buat 100 token acak unik sekaligus secara instan untuk kebutuhan massal.</p>
                </div>

                <button
                  onClick={() => handleGenerateTokensBatch(100)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
                >
                  ⚡ Buat 100 Token Instan
                </button>
              </div>

            </div>

            {/* LATEST GENERATED TOKEN DISPLAY BOX */}
            <AnimatePresence>
              {generatedToken && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-amber-500/10 border-2 border-amber-500/30 p-4 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest font-mono">Token Baru Berhasil Dibuat</p>
                    <p className="text-2xl font-mono font-black text-white tracking-wider">{generatedToken}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedToken)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black p-3 rounded-xl transition active:scale-90 flex items-center gap-1.5 text-xs shadow-md cursor-pointer"
                    title="Salin Token"
                  >
                    <Copy className="w-4 h-4" />
                    SALIN TOKEN
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TOKENS TABLE LIST & SEARCH */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Daftar Token Tersedia ({filteredTokens.length})
                </span>

                <div className="relative w-48 sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari Kode Token..."
                    value={tokenSearchQuery}
                    onChange={(e) => setTokenSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-xs rounded-xl pl-9 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-slate-950/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 border-b border-white/10 sticky top-0 text-gray-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Token ID</th>
                      <th className="p-2.5">Tgl Dibuat</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {filteredTokens.map((t) => (
                      <tr key={t.id} className="hover:bg-white/5 transition">
                        <td className="p-2.5 text-sm font-black text-amber-400 tracking-wider">
                          <span className="flex items-center gap-2">
                            {t.id}
                            <button
                              onClick={() => copyToClipboard(t.id)}
                              className="text-gray-500 hover:text-white transition p-1 rounded hover:bg-white/10"
                              title="Salin Token"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-400">{t.tanggalDibuat}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleToggleToken(t)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${
                              t.status === "Aktif"
                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                            }`}
                          >
                            {t.status}
                          </button>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleDeleteToken(t.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/15 text-rose-400 hover:text-white hover:bg-rose-500 transition cursor-pointer"
                            title="Hapus Token"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredTokens.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                          Belum ada token aktif. Tekan tombol buat instan untuk menghasilkan token.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>

        {/* BOTTOM SECTION: SINKRONISASI AKTIVITAS PENGGUNA */}
        <section className="bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="border-b border-white/5 pb-4 mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Monitoring Aktivitas Sinkronisasi Pengguna (Paling Baru)
            </h2>
            <p className="text-xs text-gray-400 mt-1">Daftar log proses sinkronisasi dan pencarian KPJ yang dilakukan oleh pengguna secara real-time.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1">
            {history.map((log) => (
              <div 
                key={log.id} 
                className="bg-slate-950 border border-white/5 rounded-xl p-4 flex items-start gap-3 hover:border-emerald-500/25 transition"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  log.status === "Selesai" 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : log.status === "Proses"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-gray-200 truncate">Token: {log.token}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      log.status === "Selesai" 
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-gray-400">
                    Selesai memproses KPJ <span className="font-mono text-amber-400 font-bold">{log.nomor}</span>
                  </p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1 font-mono pt-1">
                    <Clock className="w-3 h-3" />
                    Mulai: {log.waktuMulai} | Selesai: {log.waktuSelesai || "-"}
                  </p>
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 text-xs italic">
                Belum ada aktivitas sinkronisasi yang tercatat di server.
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
