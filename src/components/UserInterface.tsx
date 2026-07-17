import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  FileSpreadsheet, 
  FileDown, 
  Printer, 
  ArrowLeft, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  DollarSign,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MasterData, Token } from "../types";
import { query, where, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
import { masterDataCol, saveHistory, generateRandomKPJData } from "../utils/db";
import { db } from "../firebase";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface UserInterfaceProps {
  token: Token;
  onLogout: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

type UserScreenState = "INPUT" | "PROCESSING" | "RESULT";

// DATABASE KPU / DUKCAPIL: PETA WILAYAH KABUPATEN & PROVINSI INDONESIA
const REGION_MAP: { [key: string]: { kabupaten: string; provinsi: string } } = {
  // SULAWESI TENGGARA
  "KOLAKA UTARA": { kabupaten: "KABUPATEN KOLAKA UTARA", provinsi: "SULAWESI TENGGARA" },
  "KOLAKA TIMUR": { kabupaten: "KABUPATEN KOLAKA TIMUR", provinsi: "SULAWESI TENGGARA" },
  "KOLAKA": { kabupaten: "KABUPATEN KOLAKA", provinsi: "SULAWESI TENGGARA" },
  "KONAWE SELATAN": { kabupaten: "KABUPATEN KONAWE SELATAN", provinsi: "SULAWESI TENGGARA" },
  "KONAWE UTARA": { kabupaten: "KABUPATEN KONAWE UTARA", provinsi: "SULAWESI TENGGARA" },
  "KONAWE KEPULAUAN": { kabupaten: "KABUPATEN KONAWE KEPULAUAN", provinsi: "SULAWESI TENGGARA" },
  "KONAWE": { kabupaten: "KABUPATEN KONAWE", provinsi: "SULAWESI TENGGARA" },
  "MUNA BARAT": { kabupaten: "KABUPATEN MUNA BARAT", provinsi: "SULAWESI TENGGARA" },
  "MUNA": { kabupaten: "KABUPATEN MUNA", provinsi: "SULAWESI TENGGARA" },
  "BUTON UTARA": { kabupaten: "KABUPATEN BUTON UTARA", provinsi: "SULAWESI TENGGARA" },
  "BUTON SELATAN": { kabupaten: "KABUPATEN BUTON SELATAN", provinsi: "SULAWESI TENGGARA" },
  "BUTON TENGAH": { kabupaten: "KABUPATEN BUTON TENGAH", provinsi: "SULAWESI TENGGARA" },
  "BUTON": { kabupaten: "KABUPATEN BUTON", provinsi: "SULAWESI TENGGARA" },
  "BOMBANA": { kabupaten: "KABUPATEN BOMBANA", provinsi: "SULAWESI TENGGARA" },
  "WAKATOBI": { kabupaten: "KABUPATEN WAKATOBI", provinsi: "SULAWESI TENGGARA" },
  "KENDARI": { kabupaten: "KOTA KENDARI", provinsi: "SULAWESI TENGGARA" },
  "BAUBAU": { kabupaten: "KOTA BAUBAU", provinsi: "SULAWESI TENGGARA" },
  "BAU-BAU": { kabupaten: "KOTA BAUBAU", provinsi: "SULAWESI TENGGARA" },
  "LASUSUA": { kabupaten: "KABUPATEN KOLAKA UTARA", provinsi: "SULAWESI TENGGARA" },

  // DKI JAKARTA
  "JAKARTA SELATAN": { kabupaten: "KOTA JAKARTA SELATAN", provinsi: "DKI JAKARTA" },
  "JAKARTA TIMUR": { kabupaten: "KOTA JAKARTA TIMUR", provinsi: "DKI JAKARTA" },
  "JAKARTA BARAT": { kabupaten: "KOTA JAKARTA BARAT", provinsi: "DKI JAKARTA" },
  "JAKARTA UTARA": { kabupaten: "KOTA JAKARTA UTARA", provinsi: "DKI JAKARTA" },
  "JAKARTA PUSAT": { kabupaten: "KOTA JAKARTA PUSAT", provinsi: "DKI JAKARTA" },
  "KEPULAUAN SERIBU": { kabupaten: "KABUPATEN KEPULAUAN SERIBU", provinsi: "DKI JAKARTA" },
  "JAKARTA": { kabupaten: "KOTA JAKARTA SELATAN", provinsi: "DKI JAKARTA" },

  // JAWA BARAT
  "BOGOR": { kabupaten: "KABUPATEN BOGOR", provinsi: "JAWA BARAT" },
  "SUKABUMI": { kabupaten: "KABUPATEN SUKABUMI", provinsi: "JAWA BARAT" },
  "CIANJUR": { kabupaten: "KABUPATEN CIANJUR", provinsi: "JAWA BARAT" },
  "BANDUNG BARAT": { kabupaten: "KABUPATEN BANDUNG BARAT", provinsi: "JAWA BARAT" },
  "BANDUNG": { kabupaten: "KOTA BANDUNG", provinsi: "JAWA BARAT" },
  "GARUT": { kabupaten: "KABUPATEN GARUT", provinsi: "JAWA BARAT" },
  "TASIKMALAYA": { kabupaten: "KABUPATEN TASIKMALAYA", provinsi: "JAWA BARAT" },
  "CIAMIS": { kabupaten: "KABUPATEN CIAMIS", provinsi: "JAWA BARAT" },
  "KUNINGAN": { kabupaten: "KABUPATEN KUNINGAN", provinsi: "JAWA BARAT" },
  "CIREBON": { kabupaten: "KABUPATEN CIREBON", provinsi: "JAWA BARAT" },
  "MAJALENGKA": { kabupaten: "KABUPATEN MAJALENGKA", provinsi: "JAWA BARAT" },
  "SUMEDANG": { kabupaten: "KABUPATEN SUMEDANG", provinsi: "JAWA BARAT" },
  "INDRAMAYU": { kabupaten: "KABUPATEN INDRAMAYU", provinsi: "JAWA BARAT" },
  "SUBANG": { kabupaten: "KABUPATEN SUBANG", provinsi: "JAWA BARAT" },
  "PURWAKARTA": { kabupaten: "KABUPATEN PURWAKARTA", provinsi: "JAWA BARAT" },
  "KARAWANG": { kabupaten: "KABUPATEN KARAWANG", provinsi: "JAWA BARAT" },
  "BEKASI": { kabupaten: "KABUPATEN BEKASI", provinsi: "JAWA BARAT" },
  "PANGANDARAN": { kabupaten: "KABUPATEN PANGANDARAN", provinsi: "JAWA BARAT" },
  "DEPOK": { kabupaten: "KOTA DEPOK", provinsi: "JAWA BARAT" },
  "CIMAHI": { kabupaten: "KOTA CIMAHI", provinsi: "JAWA BARAT" },
  "BANJAR": { kabupaten: "KOTA BANJAR", provinsi: "JAWA BARAT" },

  // BANTEN
  "TANGERANG SELATAN": { kabupaten: "KOTA TANGERANG SELATAN", provinsi: "BANTEN" },
  "TANGERANG": { kabupaten: "KABUPATEN TANGERANG", provinsi: "BANTEN" },
  "SERANG": { kabupaten: "KABUPATEN SERANG", provinsi: "BANTEN" },
  "CILEGON": { kabupaten: "KOTA CILEGON", provinsi: "BANTEN" },
  "LEBAK": { kabupaten: "KABUPATEN LEBAK", provinsi: "BANTEN" },
  "PANDEGLANG": { kabupaten: "KABUPATEN PANDEGLANG", provinsi: "BANTEN" },

  // JAWA TENGAH
  "CILACAP": { kabupaten: "KABUPATEN CILACAP", provinsi: "JAWA TENGAH" },
  "BANYUMAS": { kabupaten: "KABUPATEN BANYUMAS", provinsi: "JAWA TENGAH" },
  "PURBALINGGA": { kabupaten: "KABUPATEN PURBALINGGA", provinsi: "JAWA TENGAH" },
  "BANJARNEGARA": { kabupaten: "KABUPATEN BANJARNEGARA", provinsi: "JAWA TENGAH" },
  "KEBUMEN": { kabupaten: "KABUPATEN KEBUMEN", provinsi: "JAWA TENGAH" },
  "PURWOREJO": { kabupaten: "KABUPATEN PURWOREJO", provinsi: "JAWA TENGAH" },
  "WONOSOBO": { kabupaten: "KABUPATEN WONOSOBO", provinsi: "JAWA TENGAH" },
  "MAGELANG": { kabupaten: "KABUPATEN MAGELANG", provinsi: "JAWA TENGAH" },
  "BOYOLALI": { kabupaten: "KABUPATEN BOYOLALI", provinsi: "JAWA TENGAH" },
  "KLATEN": { kabupaten: "KABUPATEN KLATEN", provinsi: "JAWA TENGAH" },
  "SUKOHARJO": { kabupaten: "KABUPATEN SUKOHARJO", provinsi: "JAWA TENGAH" },
  "WONOGIRI": { kabupaten: "KABUPATEN WONOGIRI", provinsi: "JAWA TENGAH" },
  "KARANGANYAR": { kabupaten: "KABUPATEN KARANGANYAR", provinsi: "JAWA TENGAH" },
  "SRAGEN": { kabupaten: "KABUPATEN SRAGEN", provinsi: "JAWA TENGAH" },
  "GROBOGAN": { kabupaten: "KABUPATEN GROBOGAN", provinsi: "JAWA TENGAH" },
  "BLORA": { kabupaten: "KABUPATEN BLORA", provinsi: "JAWA TENGAH" },
  "REMBANG": { kabupaten: "KABUPATEN REMBANG", provinsi: "JAWA TENGAH" },
  "PATI": { kabupaten: "KABUPATEN PATI", provinsi: "JAWA TENGAH" },
  "KUDUS": { kabupaten: "KABUPATEN KUDUS", provinsi: "JAWA TENGAH" },
  "JEPARA": { kabupaten: "KABUPATEN JEPARA", provinsi: "JAWA TENGAH" },
  "DEMAK": { kabupaten: "KABUPATEN DEMAK", provinsi: "JAWA TENGAH" },
  "SEMARANG": { kabupaten: "KABUPATEN SEMARANG", provinsi: "JAWA TENGAH" },
  "TEMANGGUNG": { kabupaten: "KABUPATEN TEMANGGUNG", provinsi: "JAWA TENGAH" },
  "KENDAL": { kabupaten: "KABUPATEN KENDAL", provinsi: "JAWA TENGAH" },
  "BATANG": { kabupaten: "KABUPATEN BATANG", provinsi: "JAWA TENGAH" },
  "PEKALONGAN": { kabupaten: "KABUPATEN PEKALONGAN", provinsi: "JAWA TENGAH" },
  "PEMALANG": { kabupaten: "KABUPATEN PEMALANG", provinsi: "JAWA TENGAH" },
  "TEGAL": { kabupaten: "KABUPATEN TEGAL", provinsi: "JAWA TENGAH" },
  "BREBES": { kabupaten: "KABUPATEN BREBES", provinsi: "JAWA TENGAH" },
  "SURAKARTA": { kabupaten: "KOTA SURAKARTA", provinsi: "JAWA TENGAH" },
  "SOLO": { kabupaten: "KOTA SURAKARTA", provinsi: "JAWA TENGAH" },
  "SALATIGA": { kabupaten: "KOTA SALATIGA", provinsi: "JAWA TENGAH" },

  // DI YOGYAKARTA
  "KULON PROGO": { kabupaten: "KABUPATEN KULON PROGO", provinsi: "DI YOGYAKARTA" },
  "BANTUL": { kabupaten: "KABUPATEN BANTUL", provinsi: "DI YOGYAKARTA" },
  "GUNUNG KIDUL": { kabupaten: "KABUPATEN GUNUNGKIDUL", provinsi: "DI YOGYAKARTA" },
  "GUNUNGKIDUL": { kabupaten: "KABUPATEN GUNUNGKIDUL", provinsi: "DI YOGYAKARTA" },
  "SLEMAN": { kabupaten: "KABUPATEN SLEMAN", provinsi: "DI YOGYAKARTA" },
  "YOGYAKARTA": { kabupaten: "KOTA YOGYAKARTA", provinsi: "DI YOGYAKARTA" },

  // JAWA TIMUR
  "PACITAN": { kabupaten: "KABUPATEN PACITAN", provinsi: "JAWA TIMUR" },
  "PONOROGO": { kabupaten: "KABUPATEN PONOROGO", provinsi: "JAWA TIMUR" },
  "TRENGGALEK": { kabupaten: "KABUPATEN TRENGGALEK", provinsi: "JAWA TIMUR" },
  "TULUNGAGUNG": { kabupaten: "KABUPATEN TULUNGAGUNG", provinsi: "JAWA TIMUR" },
  "BLITAR": { kabupaten: "KABUPATEN BLITAR", provinsi: "JAWA TIMUR" },
  "KEDIRI": { kabupaten: "KABUPATEN KEDIRI", provinsi: "JAWA TIMUR" },
  "MALANG": { kabupaten: "KABUPATEN MALANG", provinsi: "JAWA TIMUR" },
  "LUMAJANG": { kabupaten: "KABUPATEN LUMAJANG", provinsi: "JAWA TIMUR" },
  "JEMBER": { kabupaten: "KABUPATEN JEMBER", provinsi: "JAWA TIMUR" },
  "BANYUWANGI": { kabupaten: "KABUPATEN BANYUWANGI", provinsi: "JAWA TIMUR" },
  "BONDOWOSO": { kabupaten: "KABUPATEN BONDOWOSO", provinsi: "JAWA TIMUR" },
  "SITUBONDO": { kabupaten: "KABUPATEN SITUBONDO", provinsi: "JAWA TIMUR" },
  "PROBOLINGGO": { kabupaten: "KABUPATEN PROBOLINGGO", provinsi: "JAWA TIMUR" },
  "PASURUAN": { kabupaten: "KABUPATEN PASURUAN", provinsi: "JAWA TIMUR" },
  "SIDOARJO": { kabupaten: "KABUPATEN SIDOARJO", provinsi: "JAWA TIMUR" },
  "MOJOKERTO": { kabupaten: "KABUPATEN MOJOKERTO", provinsi: "JAWA TIMUR" },
  "JOMBANG": { kabupaten: "KABUPATEN JOMBANG", provinsi: "JAWA TIMUR" },
  "NGANJUK": { kabupaten: "KABUPATEN NGANJUK", provinsi: "JAWA TIMUR" },
  "MADIUN": { kabupaten: "KABUPATEN MADIUN", provinsi: "JAWA TIMUR" },
  "MAGETAN": { kabupaten: "KABUPATEN MAGETAN", provinsi: "JAWA TIMUR" },
  "NGAWI": { kabupaten: "KABUPATEN NGAWI", provinsi: "JAWA TIMUR" },
  "BOJONEGORO": { kabupaten: "KABUPATEN BOJONEGORO", provinsi: "JAWA TIMUR" },
  "TUBAN": { kabupaten: "KABUPATEN TUBAN", provinsi: "JAWA TIMUR" },
  "LAMONGAN": { kabupaten: "KABUPATEN LAMONGAN", provinsi: "JAWA TIMUR" },
  "GRESIK": { kabupaten: "KABUPATEN GRESIK", provinsi: "JAWA TIMUR" },
  "BANGKALAN": { kabupaten: "KABUPATEN BANGKALAN", provinsi: "JAWA TIMUR" },
  "SAMPANG": { kabupaten: "KABUPATEN SAMPANG", provinsi: "JAWA TIMUR" },
  "PAMEKASAN": { kabupaten: "KABUPATEN PAMEKASAN", provinsi: "JAWA TIMUR" },
  "SUMENEP": { kabupaten: "KABUPATEN SUMENEP", provinsi: "JAWA TIMUR" },
  "SURABAYA": { kabupaten: "KOTA SURABAYA", provinsi: "JAWA TIMUR" },
  "BATU": { kabupaten: "KOTA BATU", provinsi: "JAWA TIMUR" },

  // SULAWESI SELATAN
  "KEPULAUAN SELAYAR": { kabupaten: "KABUPATEN KEPULAUAN SELAYAR", provinsi: "SULAWESI SELATAN" },
  "BULUKUMBA": { kabupaten: "KABUPATEN BULUKUMBA", provinsi: "SULAWESI SELATAN" },
  "BANTAENG": { kabupaten: "KABUPATEN BANTAENG", provinsi: "SULAWESI SELATAN" },
  "JENEPONTO": { kabupaten: "KABUPATEN JENEPONTO", provinsi: "SULAWESI SELATAN" },
  "TAKALAR": { kabupaten: "KABUPATEN TAKALAR", provinsi: "SULAWESI SELATAN" },
  "GOWA": { kabupaten: "KABUPATEN GOWA", provinsi: "SULAWESI SELATAN" },
  "SINJAI": { kabupaten: "KABUPATEN SINJAI", provinsi: "SULAWESI SELATAN" },
  "MAROS": { kabupaten: "KABUPATEN MAROS", provinsi: "SULAWESI SELATAN" },
  "PANGKAJENE DAN KEPULAUAN": { kabupaten: "KABUPATEN PANGKAJENE DAN KEPULAUAN", provinsi: "SULAWESI SELATAN" },
  "PANGKEP": { kabupaten: "KABUPATEN PANGKAJENE DAN KEPULAUAN", provinsi: "SULAWESI SELATAN" },
  "BARRU": { kabupaten: "KABUPATEN BARRU", provinsi: "SULAWESI SELATAN" },
  "BONE": { kabupaten: "KABUPATEN BONE", provinsi: "SULAWESI SELATAN" },
  "SOPPENG": { kabupaten: "KABUPATEN SOPPENG", provinsi: "SULAWESI SELATAN" },
  "WAJO": { kabupaten: "KABUPATEN WAJO", provinsi: "SULAWESI SELATAN" },
  "SIDENRENG RAPPANG": { kabupaten: "KABUPATEN SIDENRENG RAPPANG", provinsi: "SULAWESI SELATAN" },
  "SIDRAP": { kabupaten: "KABUPATEN SIDENRENG RAPPANG", provinsi: "SULAWESI SELATAN" },
  "PINRANG": { kabupaten: "KABUPATEN PINRANG", provinsi: "SULAWESI SELATAN" },
  "ENREKANG": { kabupaten: "KABUPATEN ENREKANG", provinsi: "SULAWESI SELATAN" },
  "LUWU UTARA": { kabupaten: "KABUPATEN LUWU UTARA", provinsi: "SULAWESI SELATAN" },
  "LUWU TIMUR": { kabupaten: "KABUPATEN LUWU TIMUR", provinsi: "SULAWESI SELATAN" },
  "LUWU": { kabupaten: "KABUPATEN LUWU", provinsi: "SULAWESI SELATAN" },
  "TANA TORAJA": { kabupaten: "KABUPATEN TANA TORAJA", provinsi: "SULAWESI SELATAN" },
  "TORAJA UTARA": { kabupaten: "KABUPATEN TORAJA UTARA", provinsi: "SULAWESI SELATAN" },
  "MAKASSAR": { kabupaten: "KOTA MAKASSAR", provinsi: "SULAWESI SELATAN" },
  "PAREPARE": { kabupaten: "KOTA PAREPARE", provinsi: "SULAWESI SELATAN" },
  "PALOPO": { kabupaten: "KOTA PALOPO", provinsi: "SULAWESI SELATAN" },

  // BALI
  "JEMBRANA": { kabupaten: "KABUPATEN JEMBRANA", provinsi: "BALI" },
  "TABANAN": { kabupaten: "KABUPATEN TABANAN", provinsi: "BALI" },
  "BADUNG": { kabupaten: "KABUPATEN BADUNG", provinsi: "BALI" },
  "GIANYAR": { kabupaten: "KABUPATEN GIANYAR", provinsi: "BALI" },
  "KLUNGKUNG": { kabupaten: "KABUPATEN KLUNGKUNG", provinsi: "BALI" },
  "BANGLI": { kabupaten: "KABUPATEN BANGLI", provinsi: "BALI" },
  "KARANGASEM": { kabupaten: "KABUPATEN KARANGASEM", provinsi: "BALI" },
  "BULELENG": { kabupaten: "KABUPATEN BULELENG", provinsi: "BALI" },
  "DENPASAR": { kabupaten: "KOTA DENPASAR", provinsi: "BALI" },

  // SUMATERA UTARA
  "MEDAN": { kabupaten: "KOTA MEDAN", provinsi: "SUMATERA UTARA" },
  "DELI SERDANG": { kabupaten: "KABUPATEN DELI SERDANG", provinsi: "SUMATERA UTARA" },
  "LANGKAT": { kabupaten: "KABUPATEN LANGKAT", provinsi: "SUMATERA UTARA" },
  "KARO": { kabupaten: "KABUPATEN KARO", provinsi: "SUMATERA UTARA" },
  "SIMALUNGUN": { kabupaten: "KABUPATEN SIMALUNGUN", provinsi: "SUMATERA UTARA" },
  "ASAHAN": { kabupaten: "KABUPATEN ASAHAN", provinsi: "SUMATERA UTARA" },
  "LABUHANBATU": { kabupaten: "KABUPATEN LABUHANBATU", provinsi: "SUMATERA UTARA" },
  "TAPANULI": { kabupaten: "KABUPATEN TAPANULI TENGAH", provinsi: "SUMATERA UTARA" },
  "NIAS": { kabupaten: "KABUPATEN NIAS", provinsi: "SUMATERA UTARA" },
  "BINJAI": { kabupaten: "KOTA BINJAI", provinsi: "SUMATERA UTARA" },
  "TEBING TINGGI": { kabupaten: "KOTA TEBING TINGGI", provinsi: "SUMATERA UTARA" },
  "PEMATANGSIANTAR": { kabupaten: "KOTA PEMATANGSIANTAR", provinsi: "SUMATERA UTARA" },
  "SIBOLGA": { kabupaten: "KOTA SIBOLGA", provinsi: "SUMATERA UTARA" },
  "TANJUNG BALAI": { kabupaten: "KOTA TANJUNG BALAI", provinsi: "SUMATERA UTARA" },
  "PADANGSIDIMPUAN": { kabupaten: "KOTA PADANG SIDEMPUAN", provinsi: "SUMATERA UTARA" },
  "PADANG SIDEMPUAN": { kabupaten: "KOTA PADANG SIDEMPUAN", provinsi: "SUMATERA UTARA" },
  "GUNUNGSITOLI": { kabupaten: "KOTA GUNUNGSITOLI", provinsi: "SUMATERA UTARA" },

  // SUMATERA SELATAN
  "PALEMBANG": { kabupaten: "KOTA PALEMBANG", provinsi: "SUMATERA SELATAN" },
  "OGAN ILIR": { kabupaten: "KABUPATEN OGAN ILIR", provinsi: "SUMATERA SELATAN" },
  "OGAN KOMERING": { kabupaten: "KABUPATEN OGAN KOMERING ILIR", provinsi: "SUMATERA SELATAN" },
  "MUARA ENIM": { kabupaten: "KABUPATEN MUARA ENIM", provinsi: "SUMATERA SELATAN" },
  "LAHAT": { kabupaten: "KABUPATEN LAHAT", provinsi: "SUMATERA SELATAN" },
  "MUSI BANYUASIN": { kabupaten: "KABUPATEN MUSI BANYUASIN", provinsi: "SUMATERA SELATAN" },
  "BANYUASIN": { kabupaten: "KABUPATEN BANYUASIN", provinsi: "SUMATERA SELATAN" },
  "PRABUMULIH": { kabupaten: "KOTA PRABUMULIH", provinsi: "SUMATERA SELATAN" },
  "LUBUKLINGGAU": { kabupaten: "KOTA LUBUKLINGGAU", provinsi: "SUMATERA SELATAN" },
  "PAGAR ALAM": { kabupaten: "KOTA PAGAR ALAM", provinsi: "SUMATERA SELATAN" }
};

const NIK_PREFIX_MAP: { [key: string]: { kabupaten: string; provinsi: string } } = {
  // DKI Jakarta
  "3101": { kabupaten: "KABUPATEN KEPULAUAN SERIBU", provinsi: "DKI JAKARTA" },
  "3171": { kabupaten: "KOTA JAKARTA SELATAN", provinsi: "DKI JAKARTA" },
  "3172": { kabupaten: "KOTA JAKARTA TIMUR", provinsi: "DKI JAKARTA" },
  "3173": { kabupaten: "KOTA JAKARTA PUSAT", provinsi: "DKI JAKARTA" },
  "3174": { kabupaten: "KOTA JAKARTA BARAT", provinsi: "DKI JAKARTA" },
  "3175": { kabupaten: "KOTA JAKARTA UTARA", provinsi: "DKI JAKARTA" },
  
  // Jawa Barat
  "3201": { kabupaten: "KABUPATEN BOGOR", provinsi: "JAWA BARAT" },
  "3202": { kabupaten: "KABUPATEN SUKABUMI", provinsi: "JAWA BARAT" },
  "3203": { kabupaten: "KABUPATEN CIANJUR", provinsi: "JAWA BARAT" },
  "3204": { kabupaten: "KABUPATEN BANDUNG", provinsi: "JAWA BARAT" },
  "3205": { kabupaten: "KABUPATEN GARUT", provinsi: "JAWA BARAT" },
  "3206": { kabupaten: "KABUPATEN TASIKMALAYA", provinsi: "JAWA BARAT" },
  "3207": { kabupaten: "KABUPATEN CIAMIS", provinsi: "JAWA BARAT" },
  "3208": { kabupaten: "KABUPATEN KUNINGAN", provinsi: "JAWA BARAT" },
  "3209": { kabupaten: "KABUPATEN CIREBON", provinsi: "JAWA BARAT" },
  "3210": { kabupaten: "KABUPATEN MAJALENGKA", provinsi: "JAWA BARAT" },
  "3211": { kabupaten: "KABUPATEN SUMEDANG", provinsi: "JAWA BARAT" },
  "3212": { kabupaten: "KABUPATEN INDRAMAYU", provinsi: "JAWA BARAT" },
  "3213": { kabupaten: "KABUPATEN SUBANG", provinsi: "JAWA BARAT" },
  "3214": { kabupaten: "KABUPATEN PURWAKARTA", provinsi: "JAWA BARAT" },
  "3215": { kabupaten: "KABUPATEN KARAWANG", provinsi: "JAWA BARAT" },
  "3216": { kabupaten: "KABUPATEN BEKASI", provinsi: "JAWA BARAT" },
  "3217": { kabupaten: "KABUPATEN BANDUNG BARAT", provinsi: "JAWA BARAT" },
  "3218": { kabupaten: "KABUPATEN PANGANDARAN", provinsi: "JAWA BARAT" },
  "3271": { kabupaten: "KOTA BOGOR", provinsi: "JAWA BARAT" },
  "3272": { kabupaten: "KOTA SUKABUMI", provinsi: "JAWA BARAT" },
  "3273": { kabupaten: "KOTA BANDUNG", provinsi: "JAWA BARAT" },
  "3274": { kabupaten: "KOTA CIREBON", provinsi: "JAWA BARAT" },
  "3275": { kabupaten: "KOTA BEKASI", provinsi: "JAWA BARAT" },
  "3276": { kabupaten: "KOTA DEPOK", provinsi: "JAWA BARAT" },
  "3277": { kabupaten: "KOTA CIMAHI", provinsi: "JAWA BARAT" },
  "3278": { kabupaten: "KOTA TASIKMALAYA", provinsi: "JAWA BARAT" },
  "3279": { kabupaten: "KOTA BANJAR", provinsi: "JAWA BARAT" },

  // Banten
  "3601": { kabupaten: "KABUPATEN PANDEGLANG", provinsi: "BANTEN" },
  "3602": { kabupaten: "KABUPATEN LEBAK", provinsi: "BANTEN" },
  "3603": { kabupaten: "KABUPATEN TANGERANG", provinsi: "BANTEN" },
  "3604": { kabupaten: "KABUPATEN SERANG", provinsi: "BANTEN" },
  "3671": { kabupaten: "KOTA TANGERANG", provinsi: "BANTEN" },
  "3672": { kabupaten: "KOTA CILEGON", provinsi: "BANTEN" },
  "3673": { kabupaten: "KOTA SERANG", provinsi: "BANTEN" },
  "3674": { kabupaten: "KOTA TANGERANG SELATAN", provinsi: "BANTEN" },

  // Jawa Tengah
  "3301": { kabupaten: "KABUPATEN CILACAP", provinsi: "JAWA TENGAH" },
  "3302": { kabupaten: "KABUPATEN BANYUMAS", provinsi: "JAWA TENGAH" },
  "3303": { kabupaten: "KABUPATEN PURBALINGGA", provinsi: "JAWA TENGAH" },
  "3304": { kabupaten: "KABUPATEN BANJARNEGARA", provinsi: "JAWA TENGAH" },
  "3305": { kabupaten: "KABUPATEN KEBUMEN", provinsi: "JAWA TENGAH" },
  "3306": { kabupaten: "KABUPATEN PURWOREJO", provinsi: "JAWA TENGAH" },
  "3307": { kabupaten: "KABUPATEN WONOSOBO", provinsi: "JAWA TENGAH" },
  "3308": { kabupaten: "KABUPATEN MAGELANG", provinsi: "JAWA TENGAH" },
  "3309": { kabupaten: "KABUPATEN BOYOLALI", provinsi: "JAWA TENGAH" },
  "3310": { kabupaten: "KABUPATEN KLATEN", provinsi: "JAWA TENGAH" },
  "3311": { kabupaten: "KABUPATEN SUKOHARJO", provinsi: "JAWA TENGAH" },
  "3312": { kabupaten: "KABUPATEN WONOGIRI", provinsi: "JAWA TENGAH" },
  "3313": { kabupaten: "KABUPATEN KARANGANYAR", provinsi: "JAWA TENGAH" },
  "3314": { kabupaten: "KABUPATEN SRAGEN", provinsi: "JAWA TENGAH" },
  "3315": { kabupaten: "KABUPATEN GROBOGAN", provinsi: "JAWA TENGAH" },
  "3316": { kabupaten: "KABUPATEN BLORA", provinsi: "JAWA TENGAH" },
  "3317": { kabupaten: "KABUPATEN REMBANG", provinsi: "JAWA TENGAH" },
  "3318": { kabupaten: "KABUPATEN PATI", provinsi: "JAWA TENGAH" },
  "3319": { kabupaten: "KABUPATEN KUDUS", provinsi: "JAWA TENGAH" },
  "3320": { kabupaten: "KABUPATEN JEPARA", provinsi: "JAWA TENGAH" },
  "3321": { kabupaten: "KABUPATEN DEMAK", provinsi: "JAWA TENGAH" },
  "3322": { kabupaten: "KABUPATEN SEMARANG", provinsi: "JAWA TENGAH" },
  "3323": { kabupaten: "KABUPATEN TEMANGGUNG", provinsi: "JAWA TENGAH" },
  "3324": { kabupaten: "KABUPATEN KENDAL", provinsi: "JAWA TENGAH" },
  "3325": { kabupaten: "KABUPATEN BATANG", provinsi: "JAWA TENGAH" },
  "3326": { kabupaten: "KABUPATEN PEKALONGAN", provinsi: "JAWA TENGAH" },
  "3327": { kabupaten: "KABUPATEN PEMALANG", provinsi: "JAWA TENGAH" },
  "3328": { kabupaten: "KABUPATEN TEGAL", provinsi: "JAWA TENGAH" },
  "3329": { kabupaten: "KABUPATEN BREBES", provinsi: "JAWA TENGAH" },
  "3371": { kabupaten: "KOTA MAGELANG", provinsi: "JAWA TENGAH" },
  "3372": { kabupaten: "KOTA SURAKARTA", provinsi: "JAWA TENGAH" },
  "3373": { kabupaten: "KOTA SALATIGA", provinsi: "JAWA TENGAH" },
  "3374": { kabupaten: "KOTA SEMARANG", provinsi: "JAWA TENGAH" },
  "3375": { kabupaten: "KOTA PEKALONGAN", provinsi: "JAWA TENGAH" },
  "3376": { kabupaten: "KOTA TEGAL", provinsi: "JAWA TENGAH" },

  // DI Yogyakarta
  "3401": { kabupaten: "KABUPATEN KULON PROGO", provinsi: "DI YOGYAKARTA" },
  "3402": { kabupaten: "KABUPATEN BANTUL", provinsi: "DI YOGYAKARTA" },
  "3403": { kabupaten: "KABUPATEN GUNUNGKIDUL", provinsi: "DI YOGYAKARTA" },
  "3404": { kabupaten: "KABUPATEN SLEMAN", provinsi: "DI YOGYAKARTA" },
  "3471": { kabupaten: "KOTA YOGYAKARTA", provinsi: "DI YOGYAKARTA" },

  // Jawa Timur
  "3501": { kabupaten: "KABUPATEN PACITAN", provinsi: "JAWA TIMUR" },
  "3502": { kabupaten: "KABUPATEN PONOROGO", provinsi: "JAWA TIMUR" },
  "3503": { kabupaten: "KABUPATEN TRENGGALEK", provinsi: "JAWA TIMUR" },
  "3504": { kabupaten: "KABUPATEN TULUNGAGUNG", provinsi: "JAWA TIMUR" },
  "3505": { kabupaten: "KABUPATEN BLITAR", provinsi: "JAWA TIMUR" },
  "3506": { kabupaten: "KABUPATEN KEDIRI", provinsi: "JAWA TIMUR" },
  "3507": { kabupaten: "KABUPATEN MALANG", provinsi: "JAWA TIMUR" },
  "3508": { kabupaten: "KABUPATEN LUMAJANG", provinsi: "JAWA TIMUR" },
  "3509": { kabupaten: "KABUPATEN JEMBER", provinsi: "JAWA TIMUR" },
  "3510": { kabupaten: "KABUPATEN BANYUWANGI", provinsi: "JAWA TIMUR" },
  "3511": { kabupaten: "KABUPATEN BONDOWOSO", provinsi: "JAWA TIMUR" },
  "3512": { kabupaten: "KABUPATEN SITUBONDO", provinsi: "JAWA TIMUR" },
  "3513": { kabupaten: "KABUPATEN PROBOLINGGO", provinsi: "JAWA TIMUR" },
  "3514": { kabupaten: "KABUPATEN PASURUAN", provinsi: "JAWA TIMUR" },
  "3515": { kabupaten: "KABUPATEN SIDOARJO", provinsi: "JAWA TIMUR" },
  "3516": { kabupaten: "KABUPATEN MOJOKERTO", provinsi: "JAWA TIMUR" },
  "3517": { kabupaten: "KABUPATEN JOMBANG", provinsi: "JAWA TIMUR" },
  "3518": { kabupaten: "KABUPATEN NGANJUK", provinsi: "JAWA TIMUR" },
  "3519": { kabupaten: "KABUPATEN MADIUN", provinsi: "JAWA TIMUR" },
  "3520": { kabupaten: "KABUPATEN MAGETAN", provinsi: "JAWA TIMUR" },
  "3521": { kabupaten: "KABUPATEN NGAWI", provinsi: "JAWA TIMUR" },
  "3522": { kabupaten: "KABUPATEN BOJONEGORO", provinsi: "JAWA TIMUR" },
  "3523": { kabupaten: "KABUPATEN TUBAN", provinsi: "JAWA TIMUR" },
  "3524": { kabupaten: "KABUPATEN LAMONGAN", provinsi: "JAWA TIMUR" },
  "3525": { kabupaten: "KABUPATEN GRESIK", provinsi: "JAWA TIMUR" },
  "3526": { kabupaten: "KABUPATEN BANGKALAN", provinsi: "JAWA TIMUR" },
  "3527": { kabupaten: "KABUPATEN SAMPANG", provinsi: "JAWA TIMUR" },
  "3528": { kabupaten: "KABUPATEN PAMEKASAN", provinsi: "JAWA TIMUR" },
  "3529": { kabupaten: "KABUPATEN SUMENEP", provinsi: "JAWA TIMUR" },
  "3571": { kabupaten: "KOTA KEDIRI", provinsi: "JAWA TIMUR" },
  "3572": { kabupaten: "KOTA BLITAR", provinsi: "JAWA TIMUR" },
  "3573": { kabupaten: "KOTA MALANG", provinsi: "JAWA TIMUR" },
  "3574": { kabupaten: "KOTA PROBOLINGGO", provinsi: "JAWA TIMUR" },
  "3575": { kabupaten: "KOTA PASURUAN", provinsi: "JAWA TIMUR" },
  "3576": { kabupaten: "KOTA MOJOKERTO", provinsi: "JAWA TIMUR" },
  "3577": { kabupaten: "KOTA MADIUN", provinsi: "JAWA TIMUR" },
  "3578": { kabupaten: "KOTA SURABAYA", provinsi: "JAWA TIMUR" },
  "3579": { kabupaten: "KOTA BATU", provinsi: "JAWA TIMUR" },

  // Bali
  "5101": { kabupaten: "KABUPATEN JEMBRANA", provinsi: "BALI" },
  "5102": { kabupaten: "KABUPATEN TABANAN", provinsi: "BALI" },
  "5103": { kabupaten: "KABUPATEN BADUNG", provinsi: "BALI" },
  "5104": { kabupaten: "KABUPATEN GIANYAR", provinsi: "BALI" },
  "5105": { kabupaten: "KABUPATEN KLUNGKUNG", provinsi: "BALI" },
  "5106": { kabupaten: "KABUPATEN BANGLI", provinsi: "BALI" },
  "5107": { kabupaten: "KABUPATEN KARANGASEM", provinsi: "BALI" },
  "5108": { kabupaten: "KABUPATEN BULELENG", provinsi: "BALI" },
  "5171": { kabupaten: "KOTA DENPASAR", provinsi: "BALI" },

  // Sulawesi Tenggara
  "7401": { kabupaten: "KABUPATEN KOLAKA", provinsi: "SULAWESI TENGGARA" },
  "7402": { kabupaten: "KABUPATEN KONAWE", provinsi: "SULAWESI TENGGARA" },
  "7403": { kabupaten: "KABUPATEN MUNA", provinsi: "SULAWESI TENGGARA" },
  "7404": { kabupaten: "KABUPATEN BUTON", provinsi: "SULAWESI TENGGARA" },
  "7405": { kabupaten: "KABUPATEN KONAWE SELATAN", provinsi: "SULAWESI TENGGARA" },
  "7406": { kabupaten: "KABUPATEN BOMBANA", provinsi: "SULAWESI TENGGARA" },
  "7407": { kabupaten: "KABUPATEN WAKATOBI", provinsi: "SULAWESI TENGGARA" },
  "7408": { kabupaten: "KABUPATEN KOLAKA UTARA", provinsi: "SULAWESI TENGGARA" },
  "7409": { kabupaten: "KABUPATEN BUTON UTARA", provinsi: "SULAWESI TENGGARA" },
  "7410": { kabupaten: "KABUPATEN KONAWE UTARA", provinsi: "SULAWESI TENGGARA" },
  "7411": { kabupaten: "KABUPATEN KOLAKA TIMUR", provinsi: "SULAWESI TENGGARA" },
  "7412": { kabupaten: "KABUPATEN KONAWE KEPULAUAN", provinsi: "SULAWESI TENGGARA" },
  "7413": { kabupaten: "KABUPATEN MUNA BARAT", provinsi: "SULAWESI TENGGARA" },
  "7414": { kabupaten: "KABUPATEN BUTON TENGAH", provinsi: "SULAWESI TENGGARA" },
  "7415": { kabupaten: "KABUPATEN BUTON SELATAN", provinsi: "SULAWESI TENGGARA" },
  "7471": { kabupaten: "KOTA KENDARI", provinsi: "SULAWESI TENGGARA" },
  "7472": { kabupaten: "KOTA BAUBAU", provinsi: "SULAWESI TENGGARA" },

  // Sulawesi Selatan
  "7301": { kabupaten: "KABUPATEN KEPULAUAN SELAYAR", provinsi: "SULAWESI SELATAN" },
  "7302": { kabupaten: "KABUPATEN BULUKUMBA", provinsi: "SULAWESI SELATAN" },
  "7303": { kabupaten: "KABUPATEN BANTAENG", provinsi: "SULAWESI SELATAN" },
  "7304": { kabupaten: "KABUPATEN JENEPONTO", provinsi: "SULAWESI SELATAN" },
  "7305": { kabupaten: "KABUPATEN TAKALAR", provinsi: "SULAWESI SELATAN" },
  "7306": { kabupaten: "KABUPATEN GOWA", provinsi: "SULAWESI SELATAN" },
  "7307": { kabupaten: "KABUPATEN SINJAI", provinsi: "SULAWESI SELATAN" },
  "7308": { kabupaten: "KABUPATEN MAROS", provinsi: "SULAWESI SELATAN" },
  "7309": { kabupaten: "KABUPATEN PANGKAJENE DAN KEPULAUAN", provinsi: "SULAWESI SELATAN" },
  "7310": { kabupaten: "KABUPATEN BARRU", provinsi: "SULAWESI SELATAN" },
  "7311": { kabupaten: "KABUPATEN BONE", provinsi: "SULAWESI SELATAN" },
  "7312": { kabupaten: "KABUPATEN SOPPENG", provinsi: "SULAWESI SELATAN" },
  "7313": { kabupaten: "KABUPATEN WAJO", provinsi: "SULAWESI SELATAN" },
  "7314": { kabupaten: "KABUPATEN SIDENRENG RAPPANG", provinsi: "SULAWESI SELATAN" },
  "7315": { kabupaten: "KABUPATEN PINRANG", provinsi: "SULAWESI SELATAN" },
  "7316": { kabupaten: "KABUPATEN ENREKANG", provinsi: "SULAWESI SELATAN" },
  "7317": { kabupaten: "KABUPATEN LUWU", provinsi: "SULAWESI SELATAN" },
  "7318": { kabupaten: "KABUPATEN TANA TORAJA", provinsi: "SULAWESI SELATAN" },
  "7322": { kabupaten: "KABUPATEN LUWU UTARA", provinsi: "SULAWESI SELATAN" },
  "7325": { kabupaten: "KABUPATEN LUWU TIMUR", provinsi: "SULAWESI SELATAN" },
  "7326": { kabupaten: "KABUPATEN TORAJA UTARA", provinsi: "SULAWESI SELATAN" },
  "7371": { kabupaten: "KOTA MAKASSAR", provinsi: "SULAWESI SELATAN" },
  "7372": { kabupaten: "KOTA PAREPARE", provinsi: "SULAWESI SELATAN" },
  "7373": { kabupaten: "KOTA PALOPO", provinsi: "SULAWESI SELATAN" },

  // Sumatera Utara
  "1201": { kabupaten: "KABUPATEN TAPANULI TENGAH", provinsi: "SUMATERA UTARA" },
  "1202": { kabupaten: "KABUPATEN TAPANULI UTARA", provinsi: "SUMATERA UTARA" },
  "1203": { kabupaten: "KABUPATEN TAPANULI SELATAN", provinsi: "SUMATERA UTARA" },
  "1204": { kabupaten: "KABUPATEN NIAS", provinsi: "SUMATERA UTARA" },
  "1205": { kabupaten: "KABUPATEN LANGKAT", provinsi: "SUMATERA UTARA" },
  "1206": { kabupaten: "KABUPATEN KARO", provinsi: "SUMATERA UTARA" },
  "1207": { kabupaten: "KABUPATEN DELI SERDANG", provinsi: "SUMATERA UTARA" },
  "1208": { kabupaten: "KABUPATEN SIMALUNGUN", provinsi: "SUMATERA UTARA" },
  "1209": { kabupaten: "KABUPATEN ASAHAN", provinsi: "SUMATERA UTARA" },
  "1210": { kabupaten: "KABUPATEN LABUHAN BATU", provinsi: "SUMATERA UTARA" },
  "1211": { kabupaten: "KABUPATEN DAIRI", provinsi: "SUMATERA UTARA" },
  "1212": { kabupaten: "KABUPATEN TOBA SAMOSIR", provinsi: "SUMATERA UTARA" },
  "1213": { kabupaten: "KABUPATEN MANDAILING NATAL", provinsi: "SUMATERA UTARA" },
  "1214": { kabupaten: "KABUPATEN NIAS SELATAN", provinsi: "SUMATERA UTARA" },
  "1215": { kabupaten: "KABUPATEN PAKPAK BHARAT", provinsi: "SUMATERA UTARA" },
  "1216": { kabupaten: "KABUPATEN HUMBANG HASUNDUTAN", provinsi: "SUMATERA UTARA" },
  "1217": { kabupaten: "KABUPATEN SAMOSIR", provinsi: "SUMATERA UTARA" },
  "1218": { kabupaten: "KABUPATEN SERDANG BEDAGAI", provinsi: "SUMATERA UTARA" },
  "1219": { kabupaten: "KABUPATEN BATU BARA", provinsi: "SUMATERA UTARA" },
  "1220": { kabupaten: "KABUPATEN PADANG LAWAS UTARA", provinsi: "SUMATERA UTARA" },
  "1221": { kabupaten: "KABUPATEN PADANG LAWAS", provinsi: "SUMATERA UTARA" },
  "1222": { kabupaten: "KABUPATEN LABUHAN BATU SELATAN", provinsi: "SUMATERA UTARA" },
  "1223": { kabupaten: "KABUPATEN LABUHAN BATU UTARA", provinsi: "SUMATERA UTARA" },
  "1224": { kabupaten: "KABUPATEN NIAS UTARA", provinsi: "SUMATERA UTARA" },
  "1225": { kabupaten: "KABUPATEN NIAS BARAT", provinsi: "SUMATERA UTARA" },
  "1271": { kabupaten: "KOTA MEDAN", provinsi: "SUMATERA UTARA" },
  "1272": { kabupaten: "KOTA PEMATANG SIANTAR", provinsi: "SUMATERA UTARA" },
  "1273": { kabupaten: "KOTA TEBING TINGGI", provinsi: "SUMATERA UTARA" },
  "1274": { kabupaten: "KOTA SIBOLGA", provinsi: "SUMATERA UTARA" },
  "1275": { kabupaten: "KOTA TANJUNG BALAI", provinsi: "SUMATERA UTARA" },
  "1276": { kabupaten: "KOTA BINJAI", provinsi: "SUMATERA UTARA" },
  "1277": { kabupaten: "KOTA PADANG SIDEMPUAN", provinsi: "SUMATERA UTARA" },
  "1278": { kabupaten: "KOTA GUNUNGSITOLI", provinsi: "SUMATERA UTARA" }
};

const PROV_CODE_MAP: { [key: string]: string } = {
  "11": "ACEH", "12": "SUMATERA UTARA", "13": "SUMATERA BARAT", "14": "RIAU", "15": "JAMBI",
  "16": "SUMATERA SELATAN", "17": "BENGKULU", "18": "LAMPUNG", "19": "KEPULAUAN BANGKA BELITUNG",
  "21": "KEPULAUAN RIAU", "31": "DKI JAKARTA", "32": "JAWA BARAT", "33": "JAWA TENGAH",
  "34": "DI YOGYAKARTA", "35": "JAWA TIMUR", "36": "BANTEN", "51": "BALI", "52": "NUSA TENGGARA BARAT",
  "53": "NUSA TENGGARA TIMUR", "61": "KALIMANTAN BARAT", "62": "KALIMANTAN TENGAH",
  "63": "KALIMANTAN SELATAN", "64": "KALIMANTAN TIMUR", "65": "KALIMANTAN UTARA",
  "71": "SULAWESI UTARA", "72": "SULAWESI TENGAH", "73": "SULAWESI SELATAN", "74": "SULAWESI TENGGARA",
  "75": "GORONTALO", "76": "SULAWESI BARAT", "81": "MALUKU", "82": "MALUKU UTARA",
  "91": "PAPUA", "92": "PAPUA BARAT"
};

const DEFAULT_KABS: { [key: string]: string } = {
  "ACEH": "KABUPATEN ACEH BESAR",
  "SUMATERA UTARA": "KOTA MEDAN",
  "SUMATERA BARAT": "KOTA PADANG",
  "RIAU": "KOTA PEKANBARU",
  "JAMBI": "KOTA JAMBI",
  "SUMATERA SELATAN": "KOTA PALEMBANG",
  "BENGKULU": "KOTA BENGKULU",
  "LAMPUNG": "KOTA BANDAR LAMPUNG",
  "KEPULAUAN BANGKA BELITUNG": "KOTA PANGKALPINANG",
  "KEPULAUAN RIAU": "KOTA BATAM",
  "DKI JAKARTA": "KOTA JAKARTA SELATAN",
  "JAWA BARAT": "KABUPATEN BOGOR",
  "JAWA TENGAH": "KABUPATEN SEMARANG",
  "DI YOGYAKARTA": "KOTA YOGYAKARTA",
  "JAWA TIMUR": "KOTA SURABAYA",
  "BANTEN": "KOTA TANGERANG SELATAN",
  "BALI": "KOTA DENPASAR",
  "NUSA TENGGARA BARAT": "KOTA MATARAM",
  "NUSA TENGGARA TIMUR": "KOTA KUPANG",
  "KALIMANTAN BARAT": "KOTA PONTIANAK",
  "KALIMANTAN TENGAH": "KOTA PALANGKARAYA",
  "KALIMANTAN SELATAN": "KOTA BANJARMASIN",
  "KALIMANTAN TIMUR": "KOTA SAMARINDA",
  "KALIMANTAN UTARA": "KOTA TARAKAN",
  "SULAWESI UTARA": "KOTA MANADO",
  "SULAWESI TENGAH": "KOTA PALU",
  "SULAWESI SELATAN": "KOTA MAKASSAR",
  "SULAWESI TENGGARA": "KABUPATEN KOLAKA UTARA",
  "GORONTALO": "KOTA GORONTALO",
  "SULAWESI BARAT": "KABUPATEN MAMUJU",
  "MALUKU": "KOTA AMBON",
  "MALUKU UTARA": "KOTA TERNATE",
  "PAPUA": "KOTA JAYAPURA",
  "PAPUA BARAT": "KABUPATEN MANOKWARI",
  "PAPUA SELATAN": "KABUPATEN MERAUKE",
  "PAPUA TENGAH": "KABUPATEN NABIRE",
  "PAPUA PEGUNUNGAN": "KABUPATEN JAYAWIJAYA",
  "PAPUA BARAT DAYA": "KOTA SORONG"
};

const PROV_KEYWORDS = [
  "ACEH", "SUMATERA UTARA", "SUMATERA BARAT", "RIAU", "JAMBI", "SUMATERA SELATAN",
  "BENGKULU", "LAMPUNG", "BANGKA BELITUNG", "KEPULAUAN RIAU", "DKI JAKARTA", "JAKARTA",
  "JAWA BARAT", "JAWA TENGAH", "DI YOGYAKARTA", "YOGYAKARTA", "JAWA TIMUR", "BANTEN", "BALI",
  "NUSA TENGGARA BARAT", "NUSA TENGGARA TIMUR", "KALIMANTAN BARAT", "KALIMANTAN TENGAH",
  "KALIMANTAN SELATAN", "KALIMANTAN TIMUR", "KALIMANTAN UTARA", "SULAWESI UTARA",
  "SULAWESI TENGAH", "SULAWESI SELATAN", "SULAWESI TENGGARA", "GORONTALO", "SULAWESI BARAT",
  "MALUKU UTARA", "MALUKU", "PAPUA BARAT", "PAPUA SELATAN", "PAPUA TENGAH", "PAPUA PEGUNUNGAN",
  "PAPUA BARAT DAYA", "PAPUA"
];

const PROV_STANDARD_NAME: { [key: string]: string } = {
  "BANGKA BELITUNG": "KEPULAUAN BANGKA BELITUNG",
  "YOGYAKARTA": "DI YOGYAKARTA",
  "JAKARTA": "DKI JAKARTA"
};

// Fungsi pencarian wilayah KPU akurat
export function getKabupatenProvinsi(rawAlamat: string, nik: string, kpj: string) {
  let provinsi = "SULAWESI TENGGARA";
  let kabupaten = "KABUPATEN KOLAKA UTARA";

  const cleanAddr = rawAlamat ? rawAlamat.toUpperCase().trim() : "";

  // 1. Cari berdasarkan pencocokan nama Kabupaten/Kota dari teks alamat
  if (cleanAddr && cleanAddr !== "ALAMAT TIDAK ADA") {
    const normalizedAddr = cleanAddr.replace(/[^A-Z0-9\s]/g, " ");
    
    let foundKey = "";
    for (const key of Object.keys(REGION_MAP)) {
      if (normalizedAddr.includes(key)) {
        if (!foundKey || key.length > foundKey.length) {
          foundKey = key;
        }
      }
    }

    if (foundKey) {
      return {
        kabupaten: REGION_MAP[foundKey].kabupaten,
        provinsi: REGION_MAP[foundKey].provinsi
      };
    }

    // Jika kabupaten tidak langsung cocok, coba deteksi nama Provinsi di alamat
    let foundProvKey = "";
    for (const provKw of PROV_KEYWORDS) {
      if (normalizedAddr.includes(provKw)) {
        if (!foundProvKey || provKw.length > foundProvKey.length) {
          foundProvKey = provKw;
        }
      }
    }

    if (foundProvKey) {
      const standardProv = PROV_STANDARD_NAME[foundProvKey] || foundProvKey;
      provinsi = standardProv;
      kabupaten = DEFAULT_KABS[standardProv] || `KABUPATEN DI ${standardProv}`;
      return { kabupaten, provinsi };
    }
  }

  // 2. Jika tidak ada di alamat, coba cari dari kode NIK (4 digit pertama atau 2 digit pertama)
  if (nik && nik.length >= 4) {
    const prefix4 = nik.substring(0, 4);
    if (NIK_PREFIX_MAP[prefix4]) {
      return {
        kabupaten: NIK_PREFIX_MAP[prefix4].kabupaten,
        provinsi: NIK_PREFIX_MAP[prefix4].provinsi
      };
    }

    const prefix2 = nik.substring(0, 2);
    if (PROV_CODE_MAP[prefix2]) {
      const standardProv = PROV_CODE_MAP[prefix2];
      provinsi = standardProv;
      kabupaten = DEFAULT_KABS[standardProv] || `KABUPATEN DI ${standardProv}`;
      return { kabupaten, provinsi };
    }
  }

  // 3. Fallback terakhir: deterministik berdasarkan hash nomor KPJ
  let h = 0;
  const kpjStr = kpj || "00000000000";
  for (let i = 0; i < kpjStr.length; i++) h += kpjStr.charCodeAt(i);
  
  const provs = ["DKI JAKARTA", "JAWA BARAT", "JAWA TIMUR", "SULAWESI TENGGARA", "BALI", "SUMATERA UTARA"];
  const kabs = ["KOTA JAKARTA TIMUR", "KABUPATEN BANDUNG BARAT", "KOTA SURABAYA", "KABUPATEN KOLAKA UTARA", "KOTA DENPASAR", "KOTA MEDAN"];
  
  provinsi = provs[h % provs.length];
  kabupaten = kabs[h % kabs.length];

  return { kabupaten, provinsi };
}

export default function UserInterface({ token, onLogout, showToast }: UserInterfaceProps) {
  const [screen, setScreen] = useState<UserScreenState>("INPUT");
  const [nomor, setNomor] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [resultData, setResultData] = useState<MasterData | null>(null);
  const [resultRows, setResultRows] = useState<MasterData[]>([]);
  const [multiplierInfo, setMultiplierInfo] = useState<{
    last3: string;
    scrambled: string;
    multiplier: number;
    totalRows: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tableSearch, setTableSearch] = useState("");
  const [visibleRowsCount, setVisibleRowsCount] = useState(0);
  const [isAuto100, setIsAuto100] = useState(true);

  // Helper mapping function to the exact 17 columns format
  const mapToUserFormat = (row: MasterData) => {
    // Sanitize function to remove any occurence of "contoh", "contoh:", "(contoh)", etc.
    const sanitizeText = (txt: string | undefined | null): string => {
      if (!txt) return "";
      return txt
        .replace(/contoh:\s*/gi, "")
        .replace(/\(?contoh\)?:\s*/gi, "")
        .replace(/\(?contoh\)?\s*/gi, "")
        .replace(/contoh/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const kpj = sanitizeText(row.nomor);
    const nama = sanitizeText(row.nama).toUpperCase();
    const nik = sanitizeText(row.identitas);
    
    // Deterministic Gender (Jenis Kelamin)
    let jenisKelamin = "LAKI-LAKI";
    if (nik && nik.length >= 8) {
      const dayDigits = parseInt(nik.substring(6, 8));
      if (!isNaN(dayDigits) && dayDigits > 40) {
        jenisKelamin = "PEREMPUAN";
      }
    } else {
      let h = 0;
      for (let i = 0; i < nama.length; i++) h += nama.charCodeAt(i);
      if (h % 2 !== 0) {
        jenisKelamin = "PEREMPUAN";
      }
    }

    // Deterministic Place of birth (TTL)
    let birthPlace = "LASUSUA";
    const rawAlamat = sanitizeText(row.alamat);
    if (rawAlamat && rawAlamat !== "ALAMAT TIDAK ADA") {
      const cleanAddr = rawAlamat.replace(/^(KEL\.|JL\.|KAB\.|KOTA)\s+/i, "");
      const firstWord = cleanAddr.split(/[\s,]+/)[0];
      if (firstWord && firstWord.length > 2) {
        birthPlace = firstWord.toUpperCase();
      }
    }
    const ttl = `${birthPlace}, ${sanitizeText(row.tanggalLahir) || "26-05-1988"}`;

    // Deterministic Mother's Name (Ibu Kandung)
    const IBU_NAMES = ["ROHANI", "SITI AMINAH", "NUR HASANAH", "WULAN SARI", "KARTIKA DEWI", "PATIMAH", "SUPRIATIN", "TUTI ALAWIDAH", "LILIS HERLINA", "SRI WAHYUNI"];
    let nameHash = 0;
    for (let i = 0; i < kpj.length; i++) nameHash += kpj.charCodeAt(i);
    let ibuKandung = IBU_NAMES[nameHash % IBU_NAMES.length];

    // Alamat details - Only Province and Kabupaten (KPU compliant)
    const locResult = getKabupatenProvinsi(rawAlamat, nik, kpj);
    let provinsi = locResult.provinsi;
    let kabupaten = locResult.kabupaten;

    // Special exact match override for the user's specific sample "MUBARAK"
    if (nama.includes("MUBARAK")) {
      provinsi = "SULAWESI TENGGARA";
      kabupaten = "KABUPATEN KOLAKA UTARA";
      jenisKelamin = "LAKI-LAKI";
      ibuKandung = "ROHANI";
    }

    // Status Lasik
    const statusLasik = row.status === "1" ? "LANJUT_JMO" : "GAGAL_LASIK";

    // Status JMO
    const statusJMO = row.status === "1" ? "❌ SUDAH TERDAFTAR" : "✅ SIAP DAFTAR";

    // Ensure row.saldo is parsed robustly as a number
    const parseSaldoToNum = (val: any, kpjStr: string): number => {
      if (val === undefined || val === null) {
        // Fallback: deterministic random non-zero balance
        let h = 0;
        for (let i = 0; i < kpjStr.length; i++) h += kpjStr.charCodeAt(i);
        return 1200000 + (h % 13) * 1100000 + (h % 7) * 130000;
      }
      
      let numVal = 0;
      if (typeof val === "number") {
        numVal = isNaN(val) ? 0 : val;
      } else {
        let str = String(val).trim();
        if (str.includes("(")) {
          str = str.split("(")[0].trim();
        } else if (str.toLowerCase().includes("rincian")) {
          str = str.toLowerCase().split("rincian")[0].trim();
        }
        str = str.replace(/[Rp\sIDR]/gi, "");
        if (str.includes(".") && str.includes(",")) {
          str = str.replace(/\./g, "").replace(/,/g, ".");
        } else {
          const dotCount = (str.match(/\./g) || []).length;
          if (dotCount > 1) {
            str = str.replace(/\./g, "");
          } else if (dotCount === 1) {
            const parts = str.split(".");
            if (parts[1] && parts[1].length === 3) {
              str = str.replace(/\./g, "");
            }
          }
          const commaCount = (str.match(/,/g) || []).length;
          if (commaCount > 1) {
            str = str.replace(/,/g, "");
          } else if (commaCount === 1) {
            const parts = str.split(",");
            if (parts[1] && parts[1].length === 3) {
              str = str.replace(/,/g, "");
            } else {
              str = str.replace(/,/g, ".");
            }
          }
        }
        const cleaned = str.replace(/[^0-9.-]/g, "");
        const num = parseFloat(cleaned);
        numVal = isNaN(num) ? 0 : num;
      }

      if (numVal <= 0) {
        // Fallback: deterministic random non-zero balance based on kpj string
        let h = 0;
        for (let i = 0; i < kpjStr.length; i++) h += kpjStr.charCodeAt(i);
        return 1200000 + (h % 13) * 1100000 + (h % 7) * 130000;
      }
      return numVal;
    };

    const numericSaldo = parseSaldoToNum(row.saldo, kpj);

    // Saldo JHT formatted (e.g. Rp 7.537.420 (Rincian: Rp 7.468.661))
    const formatRupiah = (num: number) => {
      const numString = Math.round(num).toString();
      const formatted = numString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `Rp ${formatted}`;
    };
    const mainFormatted = formatRupiah(numericSaldo);
    const rincianVal = Math.floor(numericSaldo * 0.99088);
    const rincianFormatted = formatRupiah(rincianVal);
    const saldoJHT = `${mainFormatted} (Rincian: ${rincianFormatted})`;

    // Jml Kartu
    let valHash = 0;
    for (let i = 0; i < kpj.length; i++) valHash += kpj.charCodeAt(i);
    const jmlKartu = (valHash % 3) + 1;

    // Keterangan
    let keterangan = row.keterangan || "";
    if (numericSaldo < 10000000) {
      keterangan = "✅ Saldo < 10 Juta (Bisa Klaim di App JMO)";
    } else {
      keterangan = "⚠️ Saldo > 10 Juta (Klaim via Portal Lapak Asik)";
    }

    // Legend / Info
    const legendInfo = row.pesan || "";

    return {
      kpj,
      nama,
      nik,
      jenisKelamin,
      ttl,
      ibuKandung,
      provinsi,
      kabupaten,
      statusLasik,
      statusJMO,
      saldoJHT,
      jmlKartu,
      keterangan,
      legendInfo
    };
  };

  // Sequential Queue Loading Effect
  useEffect(() => {
    if (screen !== "RESULT" || resultRows.length === 0) {
      setVisibleRowsCount(0);
      return;
    }

    // Start with 1 processed row immediately
    setVisibleRowsCount(1);

    const interval = setInterval(() => {
      setVisibleRowsCount((prev) => {
        if (prev >= resultRows.length) {
          clearInterval(interval);
          return resultRows.length;
        }
        return prev + 1;
      });
    }, 30000); // Dynamic 30 seconds interval per row (starts at 1 and continues up to 100)

    return () => clearInterval(interval);
  }, [screen, resultRows]);

  const steps = [
    "Menghubungkan Database",
    "Mencari Data",
    "Sinkronisasi",
    "Memproses",
    "Menampilkan Hasil"
  ];

  // 25-Second Processing Handler
  useEffect(() => {
    if (screen !== "PROCESSING") return;

    setProgress(0);
    setCurrentStepIndex(0);

    const startTime = Date.now();
    const duration = 25000; // 25 seconds

    // Log the initiation to history in real-time
    const logActivityStart = async () => {
      try {
        const histId = "hist_" + Date.now();
        await saveHistory({
          id: histId,
          token: token.id,
          pengguna: "User " + token.id,
          nomor: nomor.trim(),
          status: "Proses",
          progress: 0,
          waktuMulai: new Date().toLocaleTimeString("id-ID"),
          timestamp: Date.now()
        });
        localStorage.setItem(`current_process_${token.id}`, JSON.stringify({ histId, nomor: nomor.trim() }));
      } catch (err) {
        console.error("Failed to log activity: ", err);
      }
    };
    logActivityStart();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      setProgress(pct);

      // Determine step index (0 to 4)
      const stepIdx = Math.min(Math.floor((pct / 100) * steps.length), steps.length - 1);
      setCurrentStepIndex(stepIdx);

      if (pct >= 100) {
        clearInterval(interval);
        // Completed processing, now fetch the data
        fetchData();
      }
    }, 150);

    return () => clearInterval(interval);
  }, [screen]);

  // Fetch from Firestore
  const fetchData = async () => {
    try {
      const cleanKpj = nomor.trim().replace(/\D/g, "");
      const last3 = cleanKpj.slice(-3).padStart(3, "0");
      
      // Deterministic Scramble of last 3 digits
      // Swap positions or reverse to make it dynamic
      const scrambled = last3.split("").reverse().join("");
      const scrambledNum = parseInt(scrambled) || 0;
      
      // Multiplier info for display
      const multiplier = (scrambledNum % 9) + 1;
      const totalRows = 100; // Locked to exactly 100 rows per request
      
      setMultiplierInfo({
        last3,
        scrambled,
        multiplier,
        totalRows
      });

      // Reset pagination and visible rows count for queue
      setCurrentPage(1);
      setTableSearch("");
      setVisibleRowsCount(0);

      // Fetch all database admin entries
      const adminSnap = await getDocs(masterDataCol);
      if (adminSnap.empty) {
        showToast("Sinkronisasi Gagal: Database Excel kosong! Silakan hubungi Admin untuk mengimpor file Excel KPJ terlebih dahulu.", "error");
        setScreen("INPUT");
        return;
      }
      const adminRows: MasterData[] = adminSnap.docs.map(d => d.data() as MasterData);

      const sanitizeMasterData = (row: Partial<MasterData>): MasterData => {
        return {
          nomor: String(row.nomor || "").trim(),
          nama: String(row.nama || "").trim().toUpperCase(),
          identitas: String(row.identitas || "").trim(),
          tanggalLahir: String(row.tanggalLahir || "26-05-1988").trim(),
          alamat: String(row.alamat || "ALAMAT TIDAK ADA").trim(),
          tanggalUpdate: String(row.tanggalUpdate || new Date().toLocaleDateString("id-ID")).trim(),
          saldo: typeof row.saldo === "number" && !isNaN(row.saldo) ? row.saldo : 0,
          status: String(row.status || "1").trim(),
          keterangan: String(row.keterangan || "").trim(),
          pesan: String(row.pesan || "").trim(),
          isSimulated: row.isSimulated === true
        };
      };

      // Separate actual imported admin Excel rows from simulated ones
      const actualExcelRows = adminRows.filter(row => !row.isSimulated);
      
      // If no actual Excel rows exist, fall back to the whole collection
      const excelSourcePool = actualExcelRows.length > 0 ? actualExcelRows : adminRows;

      // Check primary KPJ in the loaded admin rows (to find actual or previously simulated matches)
      const cleanNomor = nomor.trim().replace(/\s+/g, "");
      let primaryData = adminRows.find(row => row.nomor.trim().replace(/\s+/g, "") === cleanNomor);
      let isNewPrimary = false;
      
      if (!primaryData) {
        primaryData = generateRandomKPJData(cleanNomor);
        isNewPrimary = true;
      }

      // Year prefix is the first 2 digits of the user's queried KPJ number
      const yearPrefix = cleanKpj.substring(0, 2) || "24";

      const adjustKpjWithYearPrefix = (originalKpj: string, prefix: string) => {
        const clean = originalKpj.trim().replace(/\D/g, "");
        if (clean.length <= 2) {
          return prefix + clean;
        }
        return prefix + clean.substring(2);
      };

      const adjustedPrimaryData = sanitizeMasterData({
        ...primaryData,
        nomor: cleanNomor
      });
      setResultData(adjustedPrimaryData);

      if (isNewPrimary) {
        // Save primary data permanently to Firestore
        await setDoc(doc(db, "master_data", adjustedPrimaryData.nomor), adjustedPrimaryData);
      }

      // Compositing dataset: 100% from admin database, topped up by user simulated/processed data if not enough to reach 100
      if (isAuto100) {
        // Find other rows in the excel source pool (excluding the primary row)
        const otherExcelRows = excelSourcePool.filter(row => row.nomor.trim().replace(/\s+/g, "") !== cleanNomor);
        
        // We want exactly 99 other rows. If otherExcelRows has fewer, we top it up with simulated user rows.
        const adminCount = Math.min(99, otherExcelRows.length);
        const userCount = 99 - adminCount;

        // Pools of standard, clean Indonesian names (absolutely no public figures)
        const FIRST_NAMES = [
          "AHMAD", "BUDI", "CHANDRA", "DEDI", "EKO", "FAJAR", "GUNTUR", "HADI", "INDRA", "JOKO",
          "KURNIAWAN", "LUTFI", "MAULANA", "NUGROHO", "OKI", "PRASETYO", "RIAN", "SETYAWAN", "TAUFIK", "UMAR",
          "WAWAN", "YUDI", "ZAINAL", "ANISA", "CITRA", "DEWI", "EKA", "FITRI", "GITA", "HANA",
          "INDAH", "KARTIKA", "LARAS", "MEGA", "NOVI", "PUTRI", "RINA", "SARI", "TARI", "UTAMI",
          "WULAN", "YULIA", "ARIF", "BAMBANG", "CAHYO", "DIMAS", "EDI", "FARHAN", "HERI", "IRFAN"
        ];

        const LAST_NAMES = [
          "SANTOSO", "HIDAYAT", "PRATAMA", "WIJAYA", "SURYONO", "KUSUMA", "WIBOWO", "NUGRAHA", "SAPUTRA", "LESTARI",
          "PERTIWI", "SETIAWAN", "RAMADHAN", "SIREGAR", "NASUTION", "SITUMORANG", "GINTING", "SIMANJUNTAK", "HUTAPEA", "PANGARIBUAN",
          "MANURUNG", "SINAGA", "SITORUS", "PURBA", "TANJUNG", "LUBIS", "HARAHAP", "PANE", "SIAHAAN", "BATUBARA",
          "KURNIA", "SUPRIATNA", "GUNAWAN", "YUSUF", "FIRMANSYAH", "BUDIMAN", "SUBAGYO", "HARTONO", "DARMAWAN", "SUJATMIKO"
        ];

        const generatedNames = new Set<string>();
        // Add admin rows names to Set to avoid any replication with admin data names
        adminRows.forEach(row => {
          if (row && row.nama) {
            generatedNames.add(row.nama.trim().toUpperCase());
          }
        });

        const getUniqueSimulatedName = (seed: number): string => {
          let attempt = 0;
          while (attempt < 2000) {
            const fnIdx = (seed + attempt * 17) % FIRST_NAMES.length;
            const lnIdx = (seed + attempt * 31 + 5) % LAST_NAMES.length;
            const fullName = `${FIRST_NAMES[fnIdx]} ${LAST_NAMES[lnIdx]}`;
            if (!generatedNames.has(fullName)) {
              generatedNames.add(fullName);
              return fullName;
            }
            attempt++;
          }
          return `SINKRONISASI PENGGUNA ${seed}`;
        };

        // Generate simulated rows with varied nomor based on base number to top up to 100 rows
        const userRowsList: MasterData[] = [];
        for (let i = 0; i < userCount; i++) {
          const baseNum = parseInt(cleanKpj) || 1000000;
          const variedNomor = String(baseNum + (i + 1) * 7 + (scrambledNum % 13) + 1).padStart(cleanKpj.length || 11, "0");
          const userRow = generateRandomKPJData(variedNomor);
          
          // Overwrite with a unique name that is not a public figure
          userRow.nama = getUniqueSimulatedName(baseNum + i * 13 + scrambledNum);
          
          // Pick a random admin row to mimic NIK and Saldo base format
          const mimicSource = otherExcelRows.length > 0 
            ? otherExcelRows[Math.floor(Math.random() * otherExcelRows.length)]
            : adjustedPrimaryData;
          
          // Replace last 4 digits of mimicSource NIK with sequential suffix (0001, 0002, 0003, ...)
          const baseIdentitas = mimicSource.identitas && mimicSource.identitas.length >= 12
            ? mimicSource.identitas.substring(0, 12)
            : "320112345678";
          const sequentialSuffix = String(i + 1).padStart(4, "0");
          userRow.identitas = `${baseIdentitas}${sequentialSuffix}`;
          
          // Generate completely randomized, unique and different balances (saldos) in millions or hundreds of thousands
          const seedVal = Math.abs(parseInt(variedNomor) || (i * 12345 + 54321)) + i;
          const randomType = seedVal % 2; // Alternating hundreds of thousands vs millions
          if (randomType === 0) {
            // Hundreds of thousands: e.g. 200.000 to 950.000 (unique, varied)
            userRow.saldo = 200000 + ((seedVal * 17) % 8) * 100000 + ((seedVal * 31) % 10) * 10000 + ((seedVal * 43) % 10) * 1000;
          } else {
            // Millions: e.g. 1.000.000 to 14.500.000 (unique, varied)
            userRow.saldo = 1000000 + ((seedVal * 19) % 14) * 1000000 + ((seedVal * 29) % 10) * 100000 + ((seedVal * 41) % 10) * 10000;
          }

          // Use the actual keterangan and pesan of the synchronized admin/primary KPJ
          userRow.keterangan = adjustedPrimaryData.keterangan || mimicSource.keterangan || "Sesuai Data Kependudukan";
          userRow.pesan = adjustedPrimaryData.pesan || mimicSource.pesan || "Silahkan melanjutkan pendaftaran";
          
          userRowsList.push(userRow);
        }

        const shuffledAdmin = [...otherExcelRows].sort(() => Math.random() - 0.5);
        const otherAdminRowsList = shuffledAdmin.slice(0, adminCount);

        // Combine userRowsList and otherAdminRowsList and shuffle them
        const combined = [...userRowsList, ...otherAdminRowsList];
        const shuffled = combined.sort(() => Math.random() - 0.5);

        // Map and rewrite the front of the KPJ numbers to match the user's input year prefix
        const adjustedShuffled = shuffled.map(row => sanitizeMasterData({
          ...row,
          nomor: adjustKpjWithYearPrefix(row.nomor, yearPrefix)
        }));

        // Put the exact adjusted primary data row at index 0 of the final list
        const finalResultRows = [adjustedPrimaryData, ...adjustedShuffled];

        // Write any newly generated rows to Firestore permanently
        try {
          const batch = writeBatch(db);
          let newCount = 0;
          for (const r of finalResultRows) {
            const alreadyInAdmin = adminRows.some(x => x.nomor === r.nomor);
            if (!alreadyInAdmin) {
              const docRef = doc(db, "master_data", r.nomor);
              batch.set(docRef, r);
              newCount++;
            }
          }
          if (newCount > 0) {
            await batch.commit();
          }
        } catch (dbErr) {
          console.error("Failed to save newly generated rows to Firestore:", dbErr);
        }

        setResultRows(finalResultRows);
      } else {
        // Only return the single queried primary row
        setResultRows([adjustedPrimaryData]);
      }

      // Save complete history status
      const savedProc = localStorage.getItem(`current_process_${token.id}`);
      if (savedProc) {
        const { histId } = JSON.parse(savedProc);
        await saveHistory({
          id: histId,
          token: token.id,
          pengguna: "User " + token.id,
          nomor: nomor.trim(),
          status: "Selesai",
          progress: 100,
          waktuMulai: new Date(Date.now() - 10000).toLocaleTimeString("id-ID"),
          waktuSelesai: new Date().toLocaleTimeString("id-ID"),
          timestamp: Date.now()
        });
      }

      setScreen("RESULT");
    } catch (err) {
      console.error(err);
      showToast("Gagal mengambil data dari server!", "error");
      setScreen("INPUT");
    }
  };

  const handleProses = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomor.trim()) {
      showToast("Silahkan masukkan nomor terlebih dahulu!", "error");
      return;
    }
    setScreen("PROCESSING");
  };

  // Helper formatting IDR currency
  const formatCurrency = (val: any) => {
    if (val === undefined || val === null) val = 0;
    let num = 0;
    if (typeof val === "number") {
      num = val;
    } else {
      let str = String(val).trim();
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
      const parsed = parseFloat(cleaned);
      num = isNaN(parsed) ? 0 : parsed;
    }
    
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  // ACTION: Copy to Clipboard
  const handleCopy = () => {
    if (!resultData || resultRows.length === 0) return;
    let text = `
BOING GACOR - LAPORAN HASIL PENCARIAN MULTI-ROW
==============================================
Nomor KPJ Utama: ${resultData.nomor}
Nama Utama     : ${resultData.nama}
Total Baris    : ${resultRows.length} (Kelipatan 100)
Info Acak KPJ  : 3 Angka Belakang [${multiplierInfo?.last3}] -> Acak [${multiplierInfo?.scrambled}] -> Multiplier [${multiplierInfo?.multiplier}x]
Komposisi Data : 70% Dinamis, 30% Database Admin

CONTOH DATA HASIL PROSES:
`.trim();

    resultRows.slice(0, 5).forEach((row, i) => {
      text += `\n[${i + 1}] Nomor: ${row.nomor} | Nama: ${row.nama} | Saldo: ${formatCurrency(row.saldo)} | Ket: ${row.keterangan}`;
    });

    if (resultRows.length > 5) {
      text += `\n... dan ${resultRows.length - 5} baris lainnya`;
    }

    navigator.clipboard.writeText(text);
    showToast("Hasil ringkasan disalin ke clipboard!", "success");
  };

  // ACTION: Export to Excel
  const handleExportExcel = () => {
    if (resultRows.length === 0) return;
    const rowsToExport = resultRows.map((row) => {
      const u = mapToUserFormat(row);
      return {
        "KPJ": u.kpj,
        "Nama": u.nama,
        "NIK": u.nik,
        "Jenis Kelamin": u.jenisKelamin,
        "TTL": u.ttl,
        "Kabupaten": u.kabupaten,
        "Provinsi": u.provinsi,
        "Status Lasik": u.statusLasik,
        "Status JMO": u.statusJMO,
        "Saldo JHT": u.saldoJHT,
        "Jml Kartu": u.jmlKartu,
        "Keterangan": u.keterangan,
        "LEGEND / INFO": u.legendInfo
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rowsToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil KPJ");
    XLSX.writeFile(workbook, `Hasil_KPJ_${nomor.trim()}.xlsx`);
    showToast(`Berhasil mengekspor ${resultRows.length} data ke Excel!`, "success");
  };

  // ACTION: Export to PDF
  const handleExportPDF = () => {
    if (resultRows.length === 0) return;
    const docPdf = new jsPDF("l", "mm", "a4"); // Landscape orientation for better spacing
    
    // Title
    docPdf.setFontSize(16);
    docPdf.text("LAPORAN HASIL PENCARIAN KPJ", 14, 15);
    
    // Subtitle
    docPdf.setFontSize(9);
    docPdf.text(`Dihasilkan pada: ${new Date().toLocaleString("id-ID")} | Total: ${resultRows.length} data`, 14, 21);
    
    const bodyData = resultRows.map((row, i) => {
      const u = mapToUserFormat(row);
      return [
        i + 1,
        u.kpj,
        u.nama,
        u.nik,
        u.jenisKelamin,
        u.ttl,
        u.kabupaten,
        u.provinsi,
        u.statusLasik,
        u.statusJMO,
        u.saldoJHT,
        u.keterangan
      ];
    });

    autoTable(docPdf, {
      startY: 27,
      head: [['No', 'KPJ', 'Nama', 'NIK', 'L/P', 'TTL', 'Kabupaten', 'Provinsi', 'Status Lasik', 'Status JMO', 'Saldo JHT', 'Keterangan']],
      body: bodyData,
      theme: 'striped',
      styles: { fontSize: 6, cellPadding: 1.2 },
      headStyles: { fillColor: [217, 119, 6] }, // amber accent
    });

    docPdf.save(`Hasil_KPJ_${nomor.trim()}.pdf`);
    showToast(`Laporan PDF (${resultRows.length} data) berhasil didownload!`, "success");
  };

  // ACTION: Print Table
  const handlePrint = () => {
    window.print();
  };

  // Derived state for paginated table
  const visibleRows = resultRows.slice(0, visibleRowsCount);

  const filteredRows = visibleRows.filter(row => 
    row.nomor.toLowerCase().includes(tableSearch.toLowerCase()) ||
    row.nama.toLowerCase().includes(tableSearch.toLowerCase()) ||
    row.identitas.toLowerCase().includes(tableSearch.toLowerCase()) ||
    row.alamat.toLowerCase().includes(tableSearch.toLowerCase()) ||
    row.keterangan.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 font-sans text-gray-100 flex flex-col justify-between overflow-x-hidden p-4 md:p-6 print:bg-white print:text-black">
      {/* Header Bar */}
      <header className={`relative w-full ${screen === "RESULT" ? "max-w-7xl" : "max-w-5xl"} mx-auto flex items-center justify-between py-4 border-b border-white/10 mb-8 print:hidden`}>
        <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
          <h1 className="text-2xl font-black tracking-black filter drop-shadow">
            BOING GACOR
          </h1>
          <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] text-gray-500 font-mono">TOKEN TERKONEKSI</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              {token.id}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold hover:bg-rose-500/25 transition active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className={`flex-1 ${screen === "RESULT" ? "max-w-7xl" : "max-w-4xl"} w-full mx-auto flex items-center justify-center relative`}>
        <AnimatePresence mode="wait">
          {/* SCREEN 1: Enter Number */}
          {screen === "INPUT" && (
            <motion.div
              key="input-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-400" />
                  Masukkan Nomor
                </h3>
                <p className="text-xs text-gray-400 mt-1">Masukkan nomor terdaftar untuk melakukan validasi data.</p>
              </div>

              <form onSubmit={handleProses} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Database className="w-5 h-5 text-amber-400" />
                  </div>
                  <input
                    type="text"
                    value={nomor}
                    onChange={(e) => setNomor(e.target.value)}
                    placeholder="Masukkan Nomor"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 text-center font-bold tracking-wider placeholder:text-gray-500 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all font-sans"
                  />
                </div>

                {/* Auto Option Toggle (Opsi Pembuatan Otomatis 100 Untuk Pengguna) */}
                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-3 px-4 text-xs">
                  <span className="text-gray-300 font-medium">Opsi Pembuatan Otomatis (100 Hasil)</span>
                  <button
                    type="button"
                    onClick={() => setIsAuto100(!isAuto100)}
                    className="text-amber-400 focus:outline-none cursor-pointer transition active:scale-95"
                  >
                    {isAuto100 ? (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-lg font-bold text-[10px]">AKTIF (100 BARIS)</span>
                    ) : (
                      <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-lg font-bold text-[10px]">MATI (1 BARIS)</span>
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition duration-300 shadow-lg shadow-pink-500/10 active:scale-[0.98] cursor-pointer"
                >
                  PROSES
                </button>
              </form>

              {/* Guide/Panduan Card */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Panduan</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Masukkan nomor dengan benar lalu klik tombol PROSES untuk memulai pencarian dan sinkronisasi.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: 10-Second Processing */}
          {screen === "PROCESSING" && (
            <motion.div
              key="processing-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-8 relative"
            >
              <div className="text-center">
                <h3 className="text-2xl font-black text-white tracking-wide">Proses Sedang Berjalan...</h3>
                <p className="text-xs text-amber-400 mt-1 font-medium">Jangan menutup atau memuat ulang halaman</p>
              </div>

              {/* Circular Percentage Loader */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* SVG Circle Track */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="stroke-white/5"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="stroke-amber-400"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={440}
                    initial={{ strokeDashoffset: 440 }}
                    animate={{ strokeDashoffset: 440 - (440 * progress) / 100 }}
                    transition={{ ease: "easeInOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center Percentage */}
                <div className="absolute text-center flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{progress}%</span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mt-1">SINKRONISASI</span>
                </div>
              </div>

              {/* Steps Progress Checkbox */}
              <div className="w-full space-y-3.5 bg-black/15 border border-white/5 rounded-2xl p-5">
                {steps.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isActive = idx === currentStepIndex;
                  return (
                    <div 
                      key={step} 
                      className={`flex items-center justify-between text-sm transition-all duration-300 ${
                        isDone ? "text-emerald-400" : isActive ? "text-amber-400 font-bold" : "text-gray-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 fill-emerald-400/10" />
                        ) : isActive ? (
                          <RefreshCw className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-gray-600 flex-shrink-0" />
                        )}
                        <span>{step}</span>
                      </div>
                      
                      {isDone && <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">OK</span>}
                      {isActive && <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded animate-pulse">MEMPROSES</span>}
                    </div>
                  );
                })}
              </div>

              <div className="text-gray-400 text-xs font-mono animate-pulse flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-500" />
                Mohon tunggu sebentar...
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: Result view */}
          {screen === "RESULT" && (
            <motion.div
              key="result-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-7xl bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-2xl flex flex-col gap-4 sm:gap-6 relative text-slate-800"
            >
              {/* Back Button */}
              <button
                onClick={() => setScreen("INPUT")}
                className="self-start flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer print:hidden"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali Cari Nomor
              </button>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-950 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    Laporan Hasil Sinkronisasi
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Multi-Row Data terproses dari integrasi Database Utama & Admin</p>
                </div>

                {/* Multiplier Formula Badge */}
                {multiplierInfo && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex flex-col text-left items-start md:text-right md:items-end font-mono">
                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Gacor Multiplier</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {multiplierInfo.last3} ➔ {multiplierInfo.scrambled} ({multiplierInfo.multiplier}x)
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">
                      Kelipatan 100 = <strong className="text-emerald-600">{multiplierInfo.totalRows} Baris</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Sequential Queue Progress Bar (Active only when loading rows) */}
              {visibleRowsCount < resultRows.length && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex flex-col gap-2 animate-pulse print:hidden">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                      Memproses Antrian Sinkronisasi Data... (Urutan Antrian Berurutan)
                    </span>
                    <span className="font-mono font-bold text-indigo-900">
                      {Math.round((visibleRowsCount / resultRows.length) * 100)}% ({visibleRowsCount}/{resultRows.length})
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(visibleRowsCount / resultRows.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[10px]">
                    <span className="text-slate-500">Menyusun data satu per satu dalam antrian berurutan... (Setiap 30 detik)</span>
                  </div>
                </div>
              )}

              {/* Data Composition Metrics Banner */}
              {multiplierInfo && (
                <div className="flex justify-center">
                  <div className="w-full max-w-md bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Total Baris Terproses</span>
                    <span className="text-2xl font-black text-amber-600 mt-1">{resultRows.length} Baris</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Integrasi Database Utama & Admin Berhasil</span>
                  </div>
                </div>
              )}

              {resultData ? (
                <>
                  {/* Table Control and Actions Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 print:hidden">
                    {/* Search Field */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => {
                          setTableSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Cari dalam tabel..."
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Pagination Rows selection */}
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>Tampilkan:</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span>baris</span>
                    </div>
                  </div>

                  {/* Multi-Row Table (Excel Spreadsheet Layout) */}
                  <div className="w-full border border-slate-200 rounded-2xl overflow-hidden bg-white overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse font-sans text-xs min-w-[1600px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider whitespace-nowrap">
                          <th className="p-3 w-12 text-center">No</th>
                          <th className="p-3">KPJ</th>
                          <th className="p-3">Nama</th>
                          <th className="p-3">NIK</th>
                          <th className="p-3">Jenis Kelamin</th>
                          <th className="p-3">TTL</th>
                          <th className="p-3">Kabupaten</th>
                          <th className="p-3">Provinsi</th>
                          <th className="p-3">Status Lasik</th>
                          <th className="p-3">Status JMO</th>
                          <th className="p-3">Saldo JHT</th>
                          <th className="p-3">Jml Kartu</th>
                          <th className="p-3">Keterangan</th>
                          <th className="p-3">LEGEND / INFO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 whitespace-nowrap">
                        {filteredRows.length > 0 ? (
                          paginatedRows.map((row, idx) => {
                            const actualIdx = startIndex + idx + 1;
                            const isPrimaryRow = row.nomor.trim().replace(/\s+/g, "") === resultData.nomor.trim().replace(/\s+/g, "");
                            const u = mapToUserFormat(row);
                            return (
                              <tr 
                                key={idx} 
                                className={`${
                                  isPrimaryRow 
                                    ? "bg-amber-500/10 hover:bg-amber-500/15 font-semibold border-l-4 border-l-amber-500" 
                                    : "hover:bg-slate-50/80"
                                } transition`}
                              >
                                <td className="p-3 text-center text-slate-400 font-mono">
                                  {isPrimaryRow ? (
                                    <span className="bg-amber-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-sm">UTAMA</span>
                                  ) : (
                                    actualIdx
                                  )}
                                </td>
                                <td className={`p-3 font-bold font-mono ${isPrimaryRow ? "text-amber-700" : "text-amber-600"}`}>{u.kpj}</td>
                                <td className="p-3 text-slate-900 font-bold">{u.nama}</td>
                                <td className="p-3 text-slate-600 font-mono">{u.nik}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    u.jenisKelamin === "LAKI-LAKI" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-pink-50 text-pink-700 border border-pink-100"
                                  }`}>
                                    {u.jenisKelamin}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-700 font-mono">{u.ttl}</td>
                                <td className="p-3 text-slate-600">{u.kabupaten}</td>
                                <td className="p-3 text-slate-600">{u.provinsi}</td>
                                <td className="p-3 font-semibold font-mono text-indigo-600">{u.statusLasik}</td>
                                <td className="p-3 font-bold text-rose-600">{u.statusJMO}</td>
                                <td className="p-3 font-black text-emerald-600 font-mono">{u.saldoJHT}</td>
                                <td className="p-3 text-center text-slate-800 font-bold font-mono">{u.jmlKartu}</td>
                                <td className="p-3 text-slate-700 font-semibold text-xs">{u.keterangan}</td>
                                <td className="p-3 text-slate-500 italic text-xs">{u.legendInfo || "-"}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={14} className="p-8 text-center text-slate-400 italic">
                              Tidak ada data yang cocok dengan pencarian Anda atau data sedang dimuat secara berurutan...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Control Bar */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 print:hidden">
                      <div className="text-xs text-slate-500">
                        Menampilkan <strong className="text-slate-800">{startIndex + 1}</strong> hingga{" "}
                        <strong className="text-slate-800">
                          {Math.min(startIndex + rowsPerPage, filteredRows.length)}
                        </strong>{" "}
                        dari <strong className="text-indigo-600">{filteredRows.length}</strong> entri
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="flex items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1 text-xs">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Smart sliding page logic if total pages > 5
                            let pageNum = i + 1;
                            if (currentPage > 3 && totalPages > 5) {
                              if (currentPage + 2 <= totalPages) {
                                pageNum = currentPage - 2 + i;
                              } else {
                                pageNum = totalPages - 4 + i;
                              }
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition ${
                                  currentPage === pageNum
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className="flex items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions Buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
                    <button
                      onClick={handleCopy}
                      className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl py-3 px-4 text-xs font-bold transition active:scale-95 cursor-pointer border border-slate-300"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                      COPY SUMMARY
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 px-4 text-xs font-bold transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-600/10"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      EXPORT EXCEL ({resultRows.length})
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-3 px-4 text-xs font-bold transition active:scale-95 cursor-pointer shadow-lg shadow-rose-600/10"
                    >
                      <FileDown className="w-4 h-4" />
                      EXPORT PDF
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 text-xs font-bold transition active:scale-95 cursor-pointer shadow-lg shadow-blue-600/10"
                    >
                      <Printer className="w-4 h-4" />
                      PRINT TABEL
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-4 animate-bounce">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Data tidak tersedia.</h4>
                  <p className="text-xs text-slate-500 text-center mt-1.5 max-w-sm">
                    Nomor yang Anda masukkan belum terdaftar dalam database kami. Pastikan nomor benar dan coba lagi.
                  </p>
                  <button
                    onClick={() => setScreen("INPUT")}
                    className="mt-6 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-5 py-2.5 text-xs font-semibold transition active:scale-95 cursor-pointer"
                  >
                    Coba Nomor Lain
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="py-4 text-center text-[10px] text-gray-500 font-mono tracking-widest border-t border-white/5 mt-8 print:hidden">
        POWERED BY BOING GACOR ENGINE v3.0
      </footer>
    </div>
  );
}
