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

// Komponen untuk melindungi rute dari user yang belum login
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  // Jika tidak ada data user di localStorage, tendang ke halaman login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Jika ada, izinkan masuk ke halaman yang dituju
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