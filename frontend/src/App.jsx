import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InsertSPK from './pages/InsertSPK';
import Realisasi from './pages/Realisasi';
import HasilRealisasi from './pages/HasilRealisasi';
import DashboardRealisasi from './pages/DashboardRealisasi';
import PlanningVsRealisasi from './pages/PlanningVsRealisasi';
import SisaPotong from './pages/SisaPotong';
import Efisiensi from './pages/Efisiensi';
import PredictiveOeeRealisasi from './pages/PredictiveOeeRealisasi';
import ManajemenStok from './pages/ManajemenStok';
import DatabaseCycle from './pages/DatabaseCycle';
import DatabaseMesinOrang from './pages/DatabaseMesinOrang';
import Setting from './pages/Setting';
import Login from './pages/Login';
import { SettingsProvider } from './context/SettingsContext';

import { useState, useEffect } from 'react';
import axios from 'axios';

// Komponen untuk melindungi rute dan memverifikasi token ke server
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!(token && user));

  useEffect(() => {
    if (!token || !user) {
      setIsAuthenticated(false);
      setIsValidating(false);
      return;
    }

    // Verifikasi token kriptografis ke server untuk mencegah pemalsuan di console browser
    let isMounted = true;
    axios.get('http://localhost:5000/api/auth/me')
      .then((res) => {
        if (isMounted) {
          if (res.data && res.data.user) {
            // Sinkronisasi data user tepercaya dari database
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
          setIsValidating(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Verifikasi token server gagal:', err.response?.data?.message || err.message);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setIsValidating(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-navy-dark flex flex-col items-center justify-center text-white gap-3">
        <div className="w-10 h-10 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-gray-300">Memverifikasi Sesi Keamanan...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <SettingsProvider>
      <Router>
      <Routes>
        {/* Rute Bebas (Hanya Login) */}
        <Route path="/login" element={<Login />} />

        {/* Rute Terlindungi (Semua di dalam ProtectedRoute dan Layout) */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<Navigate to="/planning-vs-realisasi" replace />} />
              <Route path="/dashboard-planning" element={<Dashboard isAll={true} />} />
              <Route path="/dashboard-terakhir" element={<Dashboard />} />
              <Route path="/insert-spk" element={<InsertSPK />} />
              <Route path="/dashboard-realisasi" element={<DashboardRealisasi />} />
              <Route path="/planning-vs-realisasi" element={<PlanningVsRealisasi />} />
              <Route path="/realisasi/input" element={<Realisasi />} />
              <Route path="/realisasi/hasil" element={<HasilRealisasi />} />
              <Route path="/realisasi/stok-sisa-potong" element={<SisaPotong />} />
              <Route path="/realisasi/predictive-oee" element={<PredictiveOeeRealisasi />} />
              <Route path="/efisiensi" element={<Efisiensi />} />
              <Route path="/stok" element={<ManajemenStok />} />
              <Route path="/database" element={<Navigate to="/database/vertikal" replace />} />
              <Route path="/database/mesin-manpower" element={<DatabaseMesinOrang />} />
              <Route path="/database/:mesin" element={<DatabaseCycle />} />
              <Route path="/setting" element={<Setting />} />
            </Routes>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
    </SettingsProvider>
  );
}

export default App;