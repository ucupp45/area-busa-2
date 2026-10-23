import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, FilePlus, Activity, Package, Database, Settings, LogOut, TrendingUp, ClipboardCheck, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // State untuk melacak submenu yang terbuka
  const [openMenus, setOpenMenus] = useState([]);
  
  // State untuk sidebar collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Menu navigasi dengan label dari terjemahan
  const menuItems = [
    { path: '/planning-vs-realisasi', name: 'Dashboard Planning vs Realisasi', icon: TrendingUp },
    {
      id: 'planning',
      name: t.insertSpk,   
      icon: FilePlus,
      subItems: [
        { path: '/dashboard-planning', name: t.dashboard, icon: LayoutDashboard },
        ...((user.role === 'PPC' || user.role === 'Superadmin') ? [{ path: '/insert-spk', name: 'Insert Planning', icon: FilePlus }] : []),
        { path: '/efisiensi', name: t.efisiensi, icon: Activity }
      ]
    },
    { 
      id: 'realisasi',
      name: t.realisasi || 'Realisasi', 
      icon: ClipboardCheck,
      subItems: [
        { path: '/dashboard-realisasi', name: 'Dashboard Realisasi', icon: LayoutDashboard },
        { path: '/realisasi/input', name: 'Input Realisasi', icon: ClipboardCheck },
        { path: '/realisasi/hasil', name: 'Hasil Realisasi', icon: ClipboardCheck },
        { path: '/realisasi/predictive-oee', name: t.efisiensi, icon: Activity }
      ]
    },
    { path: '/realisasi/stok-sisa-potong', name: 'Stok Sisa Potong', icon: Package },
    { 
      id: 'database',
      name: t.database,   
      icon: Database,
      subItems: [
        { path: '/database/vertikal', name: 'Mesin Vertikal', icon: Database },
        { path: '/database/horizontal', name: 'Mesin Horizontal', icon: Database },
        { path: '/database/carousel', name: 'Mesin Carousel', icon: Database },
        { path: '/database/matriks', name: 'Matriks Ketinggian', icon: Database },
        { path: '/database/density', name: 'Matriks Density', icon: Database },
        { path: '/database/mesin-manpower', name: 'Mesin & Orang', icon: Database },
        { path: '/database/packing', name: 'Matriks Packing', icon: Database }
      ]
    }
  ];

  useEffect(() => {
    // Otomatis buka menu yang sesuai dengan rute saat ini jika belum terbuka
    const activeItem = menuItems.find(item => item.subItems && item.subItems.some(sub => location.pathname === sub.path));
    if (activeItem && !openMenus.includes(activeItem.id)) {
      setOpenMenus(prev => [...prev, activeItem.id]);
    }
  }, [location.pathname, openMenus]);

  const getPageTitle = () => {
    if (location.pathname === '/setting') return t.setting;
    for (const m of menuItems) {
      if (m.path === location.pathname) return m.name;
      if (m.subItems) {
        const sub = m.subItems.find(s => s.path === location.pathname);
        if (sub) {
          if (sub.path === '/dashboard-planning') return sub.name;
          return `${m.name} - ${sub.name}`;
        }
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
      <aside className={`relative transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'} ${bgSidebar} text-white flex flex-col shadow-xl z-30 print:hidden`}>
        
        {/* Toggle Button Absolute */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          className={`absolute -right-4 top-1/2 -translate-y-1/2 z-40 bg-accent-blue text-navy-dark p-1 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all duration-300 ease-out flex items-center justify-center border-[3px] ${prefs.darkMode ? 'border-[#0f172a]' : 'border-gray-50'}`}
          title={isSidebarCollapsed ? "Perlebar Sidebar" : "Perkecil Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={18} strokeWidth={3} /> : <ChevronLeft size={18} strokeWidth={3} />}
        </button>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="h-16 flex-shrink-0 flex items-center justify-center border-b border-white/10 px-4">
            {!isSidebarCollapsed ? (
              <h1 className="text-xl font-bold tracking-wider text-accent-blue whitespace-nowrap overflow-hidden text-center">AREA BUSA 2</h1>
            ) : (
              <h1 className="text-lg font-bold tracking-wider text-accent-blue whitespace-nowrap overflow-hidden text-center">AB2</h1>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto mt-6 px-3 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
            {menuItems.map((item) => {
              const Icon = item.icon;
              
              if (item.subItems) {
                const isSubActive = item.subItems.some(sub => location.pathname === sub.path);
                const isOpen = openMenus.includes(item.id);
                return (
                  <div key={item.id} className="mb-2">
                    <button
                      onClick={() => {
                        if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                        setOpenMenus(prev => 
                          prev.includes(item.id) 
                            ? prev.filter(id => id !== item.id) 
                            : [...prev, item.id]
                        );
                      }}
                      className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-3 rounded-xl transition-all duration-300 ease-out group ${
                        isSubActive
                          ? 'bg-accent-blue/15 text-accent-blue font-bold shadow-sm'
                          : 'hover:bg-white/10 text-gray-300 hover:text-white'
                      }`}
                      title={isSidebarCollapsed ? item.name : ''}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <Icon size={20} strokeWidth={isSubActive ? 2.5 : 2} className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                        {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-200">{item.name}</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <ChevronDown 
                          size={15} 
                          className={`transition-transform duration-300 ease-in-out shrink-0 ${isOpen ? 'rotate-180 text-accent-blue' : 'text-gray-400 group-hover:text-gray-200'}`} 
                        />
                      )}
                    </button>
                    
                    {/* Animated Accordion Container using CSS Grid for natural smooth height expansion */}
                    <div 
                      className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                        isOpen && !isSidebarCollapsed ? 'grid-rows-[1fr] opacity-100 mt-1.5' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
                      }`}
                    >
                      <div className="min-h-0 ml-4 pl-3.5 border-l-2 border-white/20 flex flex-col gap-1 py-1">
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isActive = location.pathname === sub.path;
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ease-out group/sub ${
                                isActive
                                  ? 'bg-accent-blue text-navy-dark font-bold shadow-md translate-x-1'
                                  : 'hover:bg-white/10 text-gray-400 hover:text-white hover:translate-x-1'
                              }`}
                            >
                              <SubIcon size={16} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0 transition-transform duration-200 group-hover/sub:scale-110" />
                              <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'} gap-3 py-3 mb-2 rounded-xl transition-all duration-200 ease-out group ${
                    isActive
                      ? 'bg-accent-blue text-navy-dark font-bold shadow-md translate-x-1'
                      : 'hover:bg-white/10 text-gray-300 hover:text-white hover:translate-x-1'
                  }`}
                  title={isSidebarCollapsed ? item.name : ''}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom */}
        <div className="flex-shrink-0 px-3 py-6 border-t border-white/10 flex flex-col gap-1.5">
          <Link
            to="/setting"
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'} gap-3 py-2.5 w-full rounded-xl transition-all duration-200 ease-out group hover:translate-x-1 ${
              location.pathname === '/setting'
                ? 'bg-accent-blue text-navy-dark font-bold shadow-md'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarCollapsed ? t.setting : ''}
          >
            <Settings size={20} className="transition-transform duration-300 group-hover:rotate-45 shrink-0" />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">{t.setting}</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'} gap-3 py-2.5 w-full text-red-400 hover:bg-red-500/15 hover:text-red-300 rounded-xl transition-all duration-200 ease-out group hover:translate-x-1 active:scale-95`}
            title={isSidebarCollapsed ? t.logOut : ''}
          >
            <LogOut size={20} className="transition-transform duration-200 group-hover:-translate-x-1 shrink-0" />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">{t.logOut}</span>}
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

        {/* ISI HALAMAN DENGAN TRANSISI HALUS */}
        <div className={`flex-1 overflow-auto p-8 ${bgContent} transition-colors duration-300 scroll-smooth`}>
          <div key={location.pathname} className="animate-page-fade">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;