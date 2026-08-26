import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── Translasi ID / EN ────────────────────────────────────────────────────────
export const translations = {
  id: {
    // Sidebar menu
    dashboard:      'Dashboard',
    insertSpk:      'Insert SPK',
    realisasi:      'Realisasi',
    efisiensi:      'Predictive OEE',
    stok:           'Manajemen Stok',
    database:       'Database Cycle Time',
    setting:        'Pengaturan',
    logOut:         'Log Out',
    // Header
    shift1:         'Shift 1 (07:00 - 15:00)',
    shift2:         'Shift 2 (15:00 - 23:00)',
    shift3:         'Shift 3 (23:00 - 07:00)',
    // Setting page
    settingTitle:   'Pengaturan',
    settingDesc:    'Kelola preferensi tampilan dan sistem aplikasi',
    sectionTampilan:'Tampilan',
    sectionLang:    'Bahasa & Regional',
    sectionNotif:   'Notifikasi',
    sectionInfo:    'Informasi Aplikasi',
    darkMode:       'Mode Gelap',
    darkModeDesc:   'Aktifkan tema gelap untuk tampilan yang lebih nyaman di malam hari',
    fontSize:       'Ukuran Teks',
    fontSizeDesc:   'Sesuaikan ukuran teks agar lebih mudah dibaca',
    fontSmall:      'Kecil',
    fontNormal:     'Normal',
    fontLarge:      'Besar',
    temaWarna:      'Warna Tema',
    temaWarnaDesc:  'Pilih warna aksen utama aplikasi',
    bahasa:         'Bahasa Antarmuka',
    bahasaDesc:     'Pilih bahasa yang digunakan di seluruh aplikasi',
    formatTanggal:  'Format Tanggal',
    formatDesc:     'Format penulisan tanggal yang ditampilkan di seluruh sistem',
    notifikasi:     'Notifikasi Sistem',
    notifikasiDesc: 'Aktifkan peringatan dan notifikasi dari sistem',
    versiApp:       'Versi Aplikasi',
    versiDesc:      'Versi sistem yang sedang berjalan',
    akunAktif:      'Akun Aktif',
    akunDesc:       'User yang sedang login saat ini',
    areaProd:       'Area Produksi',
    perusahaan:     'Perusahaan',
  },
  en: {
    // Sidebar menu
    dashboard:      'Dashboard',
    insertSpk:      'Insert SPK',
    realisasi:      'Realization',
    efisiensi:      'Predictive OEE',
    stok:           'Stock Management',
    database:       'Cycle Time Database',
    setting:        'Settings',
    logOut:         'Log Out',
    // Header
    shift1:         'Shift 1 (07:00 - 15:00)',
    shift2:         'Shift 2 (15:00 - 23:00)',
    shift3:         'Shift 3 (23:00 - 07:00)',
    // Setting page
    settingTitle:   'Settings',
    settingDesc:    'Manage your display and system preferences',
    sectionTampilan:'Display',
    sectionLang:    'Language & Regional',
    sectionNotif:   'Notifications',
    sectionInfo:    'Application Info',
    darkMode:       'Dark Mode',
    darkModeDesc:   'Enable dark theme for a more comfortable night-time view',
    fontSize:       'Text Size',
    fontSizeDesc:   'Adjust text size for better readability',
    fontSmall:      'Small',
    fontNormal:     'Normal',
    fontLarge:      'Large',
    temaWarna:      'Theme Color',
    temaWarnaDesc:  'Choose the main accent color of the application',
    bahasa:         'Interface Language',
    bahasaDesc:     'Choose the language used throughout the application',
    formatTanggal:  'Date Format',
    formatDesc:     'Date format displayed throughout the system',
    notifikasi:     'System Notifications',
    notifikasiDesc: 'Enable alerts and notifications from the system',
    versiApp:       'App Version',
    versiDesc:      'Currently running system version',
    akunAktif:      'Active Account',
    akunDesc:       'User currently logged in',
    areaProd:       'Production Area',
    perusahaan:     'Company',
  },
};

// ─── Peta warna tema → CSS variable values ────────────────────────────────────
export const THEME_COLORS = {
  blue:   { accent: '#A8D8F0', accentDark: '#5badda', name: 'Biru / Blue' },
  green:  { accent: '#6ee7b7', accentDark: '#10b981', name: 'Hijau / Green' },
  purple: { accent: '#c4b5fd', accentDark: '#7c3aed', name: 'Ungu / Purple' },
  orange: { accent: '#fdba74', accentDark: '#ea580c', name: 'Oranye / Orange' },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const SettingsContext = createContext(null);

const DEFAULT_PREFS = {
  darkMode:     false,
  bahasa:       'id',
  fontSize:     'normal',
  notifikasi:   true,
  formatTanggal:'dd-mm-yyyy',
  tema:         'blue',
};

const loadPrefs = () => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('app_prefs') || '{}') }; }
  catch { return DEFAULT_PREFS; }
};

export const SettingsProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(loadPrefs);

  const setOne = (key, val) => setPrefs(prev => ({ ...prev, [key]: val }));

  // Terapkan semua preferensi ke DOM setiap kali berubah
  useEffect(() => {
    localStorage.setItem('app_prefs', JSON.stringify(prefs));

    // Dark mode
    document.documentElement.classList.toggle('dark', prefs.darkMode);

    // Font size
    const fontMap = { kecil: '13px', normal: '14px', besar: '16px' };
    document.documentElement.style.fontSize = fontMap[prefs.fontSize] || '14px';

    // Tema warna (CSS variables pada :root)
    const colors = THEME_COLORS[prefs.tema] || THEME_COLORS.blue;
    document.documentElement.style.setProperty('--color-accent-blue', colors.accent);
    document.documentElement.style.setProperty('--accent-dark', colors.accentDark);
  }, [prefs]);

  const t = translations[prefs.bahasa] || translations.id;

  return (
    <SettingsContext.Provider value={{ prefs, setOne, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
};
