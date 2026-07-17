import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "../firebase";
import { Token, MasterData, HistoryActivity, UploadHistory, AppSettings } from "../types";

// Collection References
export const tokensCol = collection(db, "token");
export const masterDataCol = collection(db, "master_data");
export const historyCol = collection(db, "history");
export const settingsCol = collection(db, "settings");
export const uploadHistoryCol = collection(db, "upload_history");

// Default initial tokens
const DEFAULT_TOKENS: Token[] = [
  { id: "TKN001", status: "Aktif", tanggalDibuat: "2025-07-10", kadaluarsa: "2026-09-10", penggunaAktif: 5 },
  { id: "TKN002", status: "Aktif", tanggalDibuat: "2025-07-11", kadaluarsa: "2026-08-11", penggunaAktif: 3 },
  { id: "TKN003", status: "Nonaktif", tanggalDibuat: "2025-07-05", kadaluarsa: "2025-08-05", penggunaAktif: 0 },
  { id: "TKN004", status: "Aktif", tanggalDibuat: "2025-07-12", kadaluarsa: "2026-12-08", penggunaAktif: 2 }
];

// Default initial master data
const DEFAULT_MASTER_DATA: MasterData[] = [
  {
    nomor: "24095647376",
    nama: "SHELLY ANGRAENI",
    identitas: "3603126401050003",
    tanggalLahir: "24-01-2005",
    alamat: "ALAMAT TIDAK ADA",
    tanggalUpdate: "01-11-2024",
    saldo: 1129220,
    status: "1",
    keterangan: "Silahkan Gunakan Aplikasi Resmi",
    pesan: "Silahkan melanjutkan pendaftaran"
  },
  {
    nomor: "24111234567",
    nama: "BUDI SANTOSO",
    identitas: "3201123456789001",
    tanggalLahir: "15-08-1995",
    alamat: "JAKARTA SELATAN",
    tanggalUpdate: "12-07-2025",
    saldo: 5432100,
    status: "1",
    keterangan: "Akun Aktif",
    pesan: "Hubungi Customer Service jika ada kendala"
  },
  {
    nomor: "2309887766",
    nama: "AHMAD HIDAYAT",
    identitas: "3171098765432102",
    tanggalLahir: "02-12-1990",
    alamat: "BANDUNG BARAT",
    tanggalUpdate: "10-07-2025",
    saldo: 2500000,
    status: "1",
    keterangan: "Verifikasi Berhasil",
    pesan: "Lanjutkan transaksi"
  }
];

// Default initial activity history
const DEFAULT_HISTORY: HistoryActivity[] = [
  {
    id: "hist_1",
    token: "TKN001",
    pengguna: "User A",
    nomor: "24095647376",
    status: "Selesai",
    progress: 100,
    waktuMulai: "10:24:21",
    waktuSelesai: "10:24:31",
    timestamp: Date.now() - 3600000 * 2
  },
  {
    id: "hist_2",
    token: "TKN002",
    pengguna: "User B",
    nomor: "24111234567",
    status: "Selesai",
    progress: 100,
    waktuMulai: "10:23:11",
    waktuSelesai: "10:23:21",
    timestamp: Date.now() - 3600000
  },
  {
    id: "hist_3",
    token: "TKN003",
    pengguna: "User C",
    nomor: "2309887766",
    status: "Selesai",
    progress: 100,
    waktuMulai: "10:22:10",
    waktuSelesai: "10:22:20",
    timestamp: Date.now() - 1800000
  }
];

const DEFAULT_UPLOAD_HISTORY: UploadHistory[] = [
  {
    id: "up_1",
    tanggal: "2025-07-14 10:15",
    namaFile: "data_14072025.xlsx",
    totalData: 1245,
    ditambahkan: 234,
    diperbarui: 1011
  },
  {
    id: "up_2",
    tanggal: "2025-07-13 09:12",
    namaFile: "data_13072025.xlsx",
    totalData: 980,
    ditambahkan: 150,
    diperbarui: 830
  }
];

// Seed the database if empty
export async function seedDatabase(force: boolean = false) {
  try {
    // Check if seeded
    const settingsSnap = await getDocs(settingsCol);
    if (settingsSnap.empty || force) {
      console.log("Seeding Database...");
      
      // 1. Seed Tokens
      for (const t of DEFAULT_TOKENS) {
        await setDoc(doc(db, "token", t.id), t);
      }

      // 2. Seed Master Data
      for (const d of DEFAULT_MASTER_DATA) {
        await setDoc(doc(db, "master_data", d.nomor), d);
      }

      // 3. Seed History
      for (const h of DEFAULT_HISTORY) {
        await setDoc(doc(db, "history", h.id), h);
      }

      // 4. Seed Upload History
      for (const u of DEFAULT_UPLOAD_HISTORY) {
        await setDoc(doc(db, "upload_history", u.id), u);
      }

      // 5. Seed App Settings
      const settings: AppSettings = {
        id: "app_settings",
        maintenanceMode: false,
        appTitle: "BOING GACOR",
        backupDate: new Date().toISOString()
      };
      await setDoc(doc(db, "settings", settings.id), settings);

      console.log("Seeding completed successfully.");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error seeding database: ", error);
    return false;
  }
}

// Token Service
export async function getTokens(): Promise<Token[]> {
  try {
    const snap = await getDocs(tokensCol);
    return snap.docs.map(d => d.data() as Token);
  } catch {
    return DEFAULT_TOKENS; // Fallback
  }
}

export async function saveToken(token: Token): Promise<void> {
  await setDoc(doc(db, "token", token.id), token);
}

export async function deleteToken(id: string): Promise<void> {
  await deleteDoc(doc(db, "token", id));
}

// Master Data Service
export async function getMasterData(): Promise<MasterData[]> {
  try {
    const snap = await getDocs(masterDataCol);
    return snap.docs.map(d => d.data() as MasterData);
  } catch {
    return DEFAULT_MASTER_DATA; // Fallback
  }
}

export async function saveMasterDataRow(row: MasterData): Promise<void> {
  await setDoc(doc(db, "master_data", row.nomor), row);
}

export async function deleteMasterDataRow(nomor: string): Promise<void> {
  await deleteDoc(doc(db, "master_data", nomor));
}

// Deterministic Random KPJ Data Generator
const INDONESIAN_NAMES = [
  "SHELLY ANGRAENI", "BUDI SANTOSO", "AHMAD HIDAYAT", "SITI AMINAH", "EKO PRASETYO",
  "DEWI LESTARI", "REZA ADITYA", "MEI CHANDRA", "RIAN HIDAYAT", "GITA PERTIWI",
  "INDRA KUSUMA", "DWI ANDINI", "HERI SETIAWAN", "NUR HASANAH", "AGUS PRIYANTO",
  "RIKA AMALIA", "DANI RAMDHANI", "DINA MARIANA", "TOMY WIJAYA", "WULAN SARI",
  "HENDRA WIJAYA", "SARI DEWI", "SETIAWAN ADI", "RINA MARLIANA", "ANAS MA'RUF",
  "YULIA FITRIANI", "ANDI PRABOWO", "MEGA UTAMI", "SLAMET RIYADI", "HARIADI WIJAYA",
  "YUSUF MAULANA", "SULAIMAN SYAH", "NURUL HIDAYAH", "KIKI RIZKY", "DEDI KURNIAWAN"
];

const INDONESIAN_CITIES = [
  "ALAMAT TIDAK ADA", "JAKARTA SELATAN", "BANDUNG BARAT", "TANGERANG SELATAN",
  "SURABAYA PUSAT", "SEMARANG UTARA", "MEDAN AMPLAS", "BEKASI TIMUR", "DEPOK JAYA",
  "BOGOR TENGAH", "YOGYAKARTA", "MAKASSAR", "DENPASAR BALI", "PALEMBANG", "MALANG"
];

const KETERANGAN_OPTIONS = [
  "Silahkan Gunakan Aplikasi Resmi",
  "Akun Aktif",
  "Verifikasi Berhasil",
  "Sesuai Data Kependudukan",
  "Selesai Sinkronisasi"
];

const PESAN_OPTIONS = [
  "Silahkan melanjutkan pendaftaran",
  "Lanjutkan transaksi",
  "Hubungi Customer Service jika ada kendala",
  "Data sudah up-to-date",
  "Proses pencairan atau klaim dapat dilakukan"
];

export function generateRandomKPJData(nomor: string): MasterData {
  let hash = 0;
  for (let i = 0; i < nomor.length; i++) {
    hash = nomor.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  const nameIndex = absHash % INDONESIAN_NAMES.length;
  const cityIndex = (absHash >> 3) % INDONESIAN_CITIES.length;
  const ketIndex = (absHash >> 5) % KETERANGAN_OPTIONS.length;
  const pesanIndex = (absHash >> 7) % PESAN_OPTIONS.length;

  const province = [31, 32, 33, 35, 36, 51][absHash % 6];
  const regency = String(1 + (absHash % 20)).padStart(2, '0');
  const district = String(1 + ((absHash >> 4) % 15)).padStart(2, '0');
  const birthDay = String(1 + ((absHash >> 5) % 28)).padStart(2, '0');
  const birthMonth = String(1 + ((absHash >> 6) % 12)).padStart(2, '0');
  const birthYear = String(70 + ((absHash >> 7) % 35));
  const sequence = String(1 + ((absHash >> 8) % 999)).padStart(4, '0');
  const identitas = `${province}${regency}${district}${birthDay}${birthMonth}${birthYear}${sequence}`;

  const birthDateStr = `${birthDay}-${birthMonth}-19${birthYear}`;

  const baseSaldo = 500000;
  const randomMultiplier = absHash % 250;
  const saldo = baseSaldo + (randomMultiplier * 50000);

  const monthsAgo = absHash % 12;
  const daysAgo = (absHash >> 2) % 28;
  const dateObj = new Date();
  dateObj.setMonth(dateObj.getMonth() - monthsAgo);
  dateObj.setDate(dateObj.getDate() - daysAgo);
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  const tanggalUpdate = `${dd}-${mm}-${yyyy}`;

  return {
    nomor,
    nama: INDONESIAN_NAMES[nameIndex],
    identitas,
    tanggalLahir: birthDateStr,
    alamat: INDONESIAN_CITIES[cityIndex],
    tanggalUpdate,
    saldo,
    status: "1",
    keterangan: KETERANGAN_OPTIONS[ketIndex],
    pesan: PESAN_OPTIONS[pesanIndex],
    isSimulated: true
  };
}

// History Service
export async function getHistory(): Promise<HistoryActivity[]> {
  try {
    const snap = await getDocs(historyCol);
    return snap.docs.map(d => d.data() as HistoryActivity).sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return DEFAULT_HISTORY; // Fallback
  }
}

export async function saveHistory(hist: HistoryActivity): Promise<void> {
  await setDoc(doc(db, "history", hist.id), hist);
}

// Upload History Service
export async function getUploadHistory(): Promise<UploadHistory[]> {
  try {
    const snap = await getDocs(uploadHistoryCol);
    return snap.docs.map(d => d.data() as UploadHistory);
  } catch {
    return DEFAULT_UPLOAD_HISTORY;
  }
}

export async function saveUploadHistory(up: UploadHistory): Promise<void> {
  await setDoc(doc(db, "upload_history", up.id), up);
}

// Backup & Restore Database to/from JSON
export async function exportDatabaseJson(): Promise<string> {
  const tokens = await getTokens();
  const masterData = await getMasterData();
  const history = await getHistory();
  const uploadHistory = await getUploadHistory();

  const fullData = {
    tokens,
    masterData,
    history,
    uploadHistory,
    exportedAt: new Date().toISOString()
  };

  return JSON.stringify(fullData, null, 2);
}

export async function importDatabaseJson(jsonStr: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.tokens || !data.masterData) return false;

    // Purge and restore
    for (const t of data.tokens) {
      await setDoc(doc(db, "token", t.id), t);
    }
    for (const d of data.masterData) {
      await setDoc(doc(db, "master_data", d.nomor), d);
    }
    if (data.history) {
      for (const h of data.history) {
        await setDoc(doc(db, "history", h.id), h);
      }
    }
    if (data.uploadHistory) {
      for (const u of data.uploadHistory) {
        await setDoc(doc(db, "upload_history", u.id), u);
      }
    }
    return true;
  } catch (error) {
    console.error("Error importing DB JSON:", error);
    return false;
  }
}
