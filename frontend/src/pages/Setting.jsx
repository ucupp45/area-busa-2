import React from 'react';
import {
  Moon, Sun, Globe, Type, Bell, BellOff,
  Monitor, Info, Check
} from 'lucide-react';
import { useSettings, THEME_COLORS } from '../context/SettingsContext';

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, darkMode }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      checked ? 'bg-accent-blue' : darkMode ? 'bg-slate-600' : 'bg-gray-300'
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
      checked ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
);

// ─── Section Card ─────────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, darkMode }) => (
  <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${
    darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-200'
  }`}>
    <div className={`px-6 py-4 border-b flex items-center gap-2 ${
      darkMode ? 'bg-[#0f172a] border-[#334155]' : 'bg-gray-50/50 border-gray-100'
    }`}>
      <Icon size={17} className="text-accent-blue" />
      <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-navy-dark'}`}>{title}</h3>
    </div>
    <div className={`divide-y ${darkMode ? 'divide-[#334155]' : 'divide-gray-100'}`}>{children}</div>
  </div>
);

// ─── Setting Row ──────────────────────────────────────────────────────────────
const SettingRow = ({ label, description, children, darkMode }) => (
  <div className={`flex items-center justify-between px-6 py-4 transition-colors ${
    darkMode ? 'hover:bg-[#273549]' : 'hover:bg-gray-50/50'
  }`}>
    <div>
      <p className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-navy-dark'}`}>{label}</p>
      {description && <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>{description}</p>}
    </div>
    <div className="ml-4 shrink-0">{children}</div>
  </div>
);

// ─── Option Group ─────────────────────────────────────────────────────────────
const OptionGroup = ({ options, value, onChange, darkMode }) => (
  <div className="flex gap-2 flex-wrap">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 ${
          value === opt.value
            ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
            : darkMode
              ? 'bg-[#0f172a] text-slate-300 border-slate-600 hover:border-accent-blue/50'
              : 'bg-white text-gray-600 border-gray-200 hover:border-accent-blue/50'
        }`}
      >
        {value === opt.value && <Check size={11} className="inline mr-1 -mt-0.5" />}
        {opt.label}
      </button>
    ))}
  </div>
);

// ─── Halaman Setting ──────────────────────────────────────────────────────────
const Setting = () => {
  const { prefs, setOne, t } = useSettings();
  const dm = prefs.darkMode;

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const APP_VERSION = '1.0.0';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className={`text-2xl font-extrabold ${dm ? 'text-slate-100' : 'text-navy-dark'}`}>
          {t.settingTitle}
        </h1>
        <p className={`text-sm mt-1 ${dm ? 'text-slate-400' : 'text-gray-400'}`}>
          {t.settingDesc}
        </p>
      </div>

      {/* ── TAMPILAN ──────────────────────────────── */}
      <Section title={t.sectionTampilan} icon={Monitor} darkMode={dm}>
        <SettingRow label={t.darkMode} description={t.darkModeDesc} darkMode={dm}>
          <div className="flex items-center gap-2">
            {dm ? <Moon size={15} className="text-accent-blue" /> : <Sun size={15} className="text-yellow-500" />}
            <Toggle checked={dm} onChange={(v) => setOne('darkMode', v)} darkMode={dm} />
          </div>
        </SettingRow>

        <SettingRow label={t.fontSize} description={t.fontSizeDesc} darkMode={dm}>
          <OptionGroup
            value={prefs.fontSize}
            onChange={(v) => setOne('fontSize', v)}
            darkMode={dm}
            options={[
              { label: t.fontSmall,  value: 'kecil' },
              { label: t.fontNormal, value: 'normal' },
              { label: t.fontLarge,  value: 'besar' },
            ]}
          />
        </SettingRow>

        {/* ── Tema Warna ── */}
        <SettingRow label={t.temaWarna} description={t.temaWarnaDesc} darkMode={dm}>
          <div className="flex gap-3 items-center">
            {Object.entries(THEME_COLORS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setOne('tema', key)}
                title={val.name}
                style={{ backgroundColor: val.accentDark }}
                className={`w-8 h-8 rounded-full border-[3px] transition-all duration-150 ${
                  prefs.tema === key
                    ? 'border-white scale-110 shadow-lg ring-2 ring-offset-1 ring-white/50'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </SettingRow>
      </Section>

      {/* ── BAHASA & REGIONAL ──────────────────── */}
      <Section title={t.sectionLang} icon={Globe} darkMode={dm}>
        <SettingRow label={t.bahasa} description={t.bahasaDesc} darkMode={dm}>
          <OptionGroup
            value={prefs.bahasa}
            onChange={(v) => setOne('bahasa', v)}
            darkMode={dm}
            options={[
              { label: '🇮🇩  Indonesia', value: 'id' },
              { label: '🇬🇧  English',   value: 'en' },
            ]}
          />
        </SettingRow>

        <SettingRow label={t.formatTanggal} description={t.formatDesc} darkMode={dm}>
          <OptionGroup
            value={prefs.formatTanggal}
            onChange={(v) => setOne('formatTanggal', v)}
            darkMode={dm}
            options={[
              { label: 'DD/MM/YYYY', value: 'dd-mm-yyyy' },
              { label: 'MM/DD/YYYY', value: 'mm-dd-yyyy' },
              { label: 'YYYY-MM-DD', value: 'yyyy-mm-dd' },
            ]}
          />
        </SettingRow>
      </Section>

      {/* ── NOTIFIKASI ─────────────────────────── */}
      <Section title={t.sectionNotif} icon={Bell} darkMode={dm}>
        <SettingRow label={t.notifikasi} description={t.notifikasiDesc} darkMode={dm}>
          <div className="flex items-center gap-2">
            {prefs.notifikasi
              ? <Bell size={15} className="text-accent-blue" />
              : <BellOff size={15} className={dm ? 'text-slate-400' : 'text-gray-400'} />
            }
            <Toggle checked={prefs.notifikasi} onChange={(v) => setOne('notifikasi', v)} darkMode={dm} />
          </div>
        </SettingRow>
      </Section>

      {/* ── INFO APLIKASI ──────────────────────── */}
      <Section title={t.sectionInfo} icon={Info} darkMode={dm}>
        <SettingRow label={t.versiApp} description={t.versiDesc} darkMode={dm}>
          <span className="text-xs font-bold text-accent-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            v{APP_VERSION}
          </span>
        </SettingRow>
        <SettingRow label={t.akunAktif} description={t.akunDesc} darkMode={dm}>
          <div className="text-right">
            <p className={`text-xs font-bold ${dm ? 'text-slate-200' : 'text-navy-dark'}`}>{user.name || '-'}</p>
            <p className={`text-[11px] ${dm ? 'text-slate-400' : 'text-gray-400'}`}>{user.role || '-'}</p>
          </div>
        </SettingRow>
        <SettingRow label={t.areaProd} description="" darkMode={dm}>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${dm ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-600'}`}>
            Mesin Vertikal
          </span>
        </SettingRow>
        <SettingRow label={t.perusahaan} description="" darkMode={dm}>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${dm ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-600'}`}>
            Royal Corp.
          </span>
        </SettingRow>
      </Section>

    </div>
  );
};

export default Setting;
