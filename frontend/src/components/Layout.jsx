import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, FilePlus, Activity, Package, Database, Settings, LogOut, TrendingUp, ClipboardCheck } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { prefs, t } = useSettings();

  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Guest', role: 'Unknown' };

  // Jam dan tanggal realtime
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const locale = prefs.bahasa === 'en' ? 'en-US' : 'id-ID';
  const formattedDate = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const hour = now.getHours();
  const shiftInfo = hour >= 7 && hour < 15 ? t.shift1
    : hour >= 15 && hour < 23 ? t.shift2
    : t.shift3;

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  // State untuk melacak submenu yang terbuka
  const [openMenu, setOpenMenu] = useState('');

  // Menu navigasi dengan label dari terjemahan
  const menuItems = [
    { 
      path: '/',
      name: t.dashboard,  
      icon: LayoutDashboard
    },
    {
      id: 'planning',
      name: t.insertSpk,   
      icon: FilePlus,
      subItems: [
        ...((user.role === 'PPC' || user.role === 'Superadmin') ? [{ path: '/insert-spk', name: 'Insert Planning', icon: FilePlus }] : []),
        { path: '/efisiensi', name: t.efisiensi, icon: Activity }
      ]
    },
    { 
      id: 'realisasi',
      name: t.realisasi || 'Realisasi', 
      icon: ClipboardCheck,
      subItems: [
        { path: '/realisasi/input', name: 'Input Realisasi', icon: ClipboardCheck },
        { path: '/realisasi/hasil', name: 'Hasil Realisasi', icon: ClipboardCheck }
      ]
    },
    // { path: '/stok',       name: t.stok,       icon: Package },
    { 
      id: 'database',
      name: t.database,   
      icon: Database,
      subItems: [
        { path: '/database/vertikal', name: 'Mesin Vertikal', icon: Database },
        { path: '/database/horizontal', name: 'Mesin Horizontal', icon: Database },
        { path: '/database/carousel', name: 'Mesin Carousel', icon: Database },
        { path: '/database/matriks', name: 'Matriks Ketinggian', icon: Database },
        { path: '/database/mesin-manpower', name: 'Mesin & Orang', icon: Database },
        { path: '/database/packing', name: 'Matriks Packing', icon: Database }
      ]
    },
  ];

  const getPageTitle = () => {
    if (location.pathname === '/setting') return t.setting;
    for (const m of menuItems) {
      if (m.path === location.pathname) return m.name;
      if (m.subItems) {
        const sub = m.subItems.find(s => s.path === location.pathname);
        if (sub) return `${m.name} - ${sub.name}`;
      }
    }
    return t.dashboard;
  };

  // ── Warna dark mode untuk bg utama ──────────────────────────────────
  const bgMain    = prefs.darkMode ? 'bg-[#0f172a]' : 'bg-gray-50';
  const bgHeader  = prefs.darkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-200';
  const bgSidebar = prefs.darkMode ? 'bg-[#020617]' : 'bg-navy-dark';
  const bgContent = prefs.darkMode ? 'bg-[#0f172a]' : '';
  const textTitle = prefs.darkMode ? 'text-slate-100' : 'text-navy-dark';
  const textRole  = prefs.darkMode ? 'text-slate-200' : 'text-navy-dark';

  return (
    <div className={`flex h-screen font-sans transition-colors duration-300 ${bgMain}`}>

      {/* SIDEBAR */}
      <aside className={`w-64 ${bgSidebar} text-white flex flex-col justify-between shadow-xl z-20 transition-colors duration-300 print:hidden`}>
        <div>
          <div className="h-16 flex items-center justify-center border-b border-white/10">
            <h1 className="text-xl font-bold tracking-wider text-accent-blue">AREA BUSA 2</h1>
          </div>
          <nav className="mt-6 px-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              
              if (item.subItems) {
                const isSubActive = item.subItems.some(sub => location.pathname === sub.path);
                const isOpen = openMenu === item.id || isSubActive;
                return (
                  <div key={item.id} className="mb-2">
                    <button
                      onClick={() => setOpenMenu(isOpen && !isSubActive ? '' : item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                        isSubActive
                          ? 'bg-accent-blue/10 text-accent-blue font-bold'
                          : 'hover:bg-white/10 text-gray-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={20} strokeWidth={isSubActive ? 2.5 : 2} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-xs">{isOpen ? '▼' : '▶'}</span>
                    </button>
                    
                    {isOpen && (
                      <div className="mt-1 ml-4 pl-4 border-l border-white/20 flex flex-col gap-1">
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isActive = location.pathname === sub.path;
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                                isActive
                                  ? 'bg-accent-blue text-navy-dark font-bold shadow-md'
                                  : 'hover:bg-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              <SubIcon size={16} strokeWidth={isActive ? 2.5 : 2} />
                              <span className="text-sm">{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-blue text-navy-dark font-bold shadow-md'
                      : 'hover:bg-white/10 text-gray-300 hover:text-white'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom */}
        <div className="px-4 py-6 border-t border-white/10">
          <Link
            to="/setting"
            className={`flex items-center gap-3 px-4 py-2 w-full rounded-lg transition-colors mb-1 ${
              location.pathname === '/setting'
                ? 'bg-accent-blue text-navy-dark font-bold shadow-md'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Settings size={20} />
            <span className="text-sm">{t.setting}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm">{t.logOut}</span>
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* HEADER */}
        <header className={`h-16 ${bgHeader} border-b flex items-center justify-between px-8 shadow-sm z-10 transition-colors duration-300 print:hidden`}>
          <h2 className={`text-xl font-bold ${textTitle}`}>
            {getPageTitle()}
          </h2>
          <div className="flex items-center gap-6">
            {/* Info Shift & Waktu */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${prefs.darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                  {formattedDate}
                </span>
                <span className="text-xs font-bold text-white bg-navy-dark px-2 py-0.5 rounded-md tabular-nums">
                  {formattedTime}
                </span>
              </div>
              <span className="text-sm font-bold text-accent-blue">{shiftInfo}</span>
            </div>

            <div className={`h-8 w-px ${prefs.darkMode ? 'bg-slate-600' : 'bg-gray-200'}`}></div>

            {/* Info User */}
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="flex flex-col items-end">
                <span className={`text-sm font-bold ${textRole}`}>{user.role}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-navy-dark flex items-center justify-center text-white font-bold text-lg border-2 border-accent-blue shadow-sm uppercase">
                {user.role.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* ISI HALAMAN */}
        <div className={`flex-1 overflow-auto p-8 ${bgContent} transition-colors duration-300`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;