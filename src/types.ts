export interface Token {
  id: string; // The token string itself
  status: 'Aktif' | 'Nonaktif';
  tanggalDibuat: string;
  kadaluarsa: string;
  penggunaAktif: number;
  timestamp?: number; // Optional timestamp for precise sorting
}

export interface MasterData {
  nomor: string;
  nama: string;
  identitas: string;
  tanggalLahir: string;
  alamat: string;
  tanggalUpdate: string;
  saldo: number;
  status: string;
  keterangan: string;
  pesan: string;
  ibuKandung?: string;
  jenisKelamin?: string;
  isSimulated?: boolean;
  isFallbackNotRegistered?: boolean;
}

export interface HistoryActivity {
  id: string;
  token: string;
  pengguna: string;
  nomor: string;
  status: 'Proses' | 'Selesai' | 'Gagal';
  progress: number;
  waktuMulai: string;
  waktuSelesai?: string;
  timestamp: number;
}

export interface UploadHistory {
  id: string;
  tanggal: string;
  namaFile: string;
  totalData: number;
  ditambahkan: number;
  diperbarui: number;
}

export interface AppSettings {
  id: string;
  backupDate?: string;
  restoreDate?: string;
  maintenanceMode: boolean;
  appTitle: string;
}
