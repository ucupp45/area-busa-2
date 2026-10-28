import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, Factory, Sparkles } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username: username.trim(),
        password
      });

      if (response.data && response.data.token) {
        // Simpan token JWT dan info profil user ke localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/'); // Arahkan ke Dashboard
      } else {
        setError('Respons server tidak valid. Silakan coba lagi.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal terhubung ke server. Pastikan backend aktif.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071329] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[520px] h-[520px] bg-cyan-500/20 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[15%] w-72 h-72 bg-indigo-500/15 rounded-full blur-[90px] pointer-events-none"></div>

      {/* Blueprint Industrial Grid Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      ></div>

      {/* Main Container */}
      <div className="w-full max-w-[440px] z-10 flex flex-col items-center">
        
        {/* Top Floating Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          {/* Logo Royal Corp Container */}
          <div className="relative mb-3 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-white p-2.5 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-center">
              <img 
                src="/royal-corp-logo.jpg" 
                alt="Royal Corp Logo" 
                className="w-14 h-14 object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Program Title: OPTIFOAM */}
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-cyan-300">
              OPTIFOAM
            </h1>
          </div>

          {/* Subtitle Badge: Area Busa 2 */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-xs font-semibold text-cyan-300 shadow-inner">
            <Factory size={13} className="text-cyan-400" />
            <span>Area Busa 2 • PT Royal Abadi Sejahtera</span>
          </div>

          <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
            Sistem Perencanaan Produksi & Monitoring Realisasi (Vertikal, Horizontal, Carousel)
          </p>
        </div>

        {/* Floating Glassmorphism Login Card */}
        <div className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-950/60 border border-white/40 p-7 sm:p-9 relative overflow-hidden">
          
          {/* Decorative Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600"></div>

          <div className="mb-6">
            <h2 className="text-xl font-black text-[#0B1F44] tracking-tight">Selamat Datang</h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              Masukkan kredensial akun Anda untuk mengakses dashboard.
            </p>
          </div>

          {/* Error Notification Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50/90 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200">
              <AlertCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
              <span className="leading-snug font-medium">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            
            {/* Input: Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Username
              </label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 transition-all duration-200"
                  placeholder="Masukkan username Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <User size={18} className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
            </div>

            {/* Input: Password with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50/80 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 transition-all duration-200"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock size={18} className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 w-full bg-gradient-to-r from-[#0B1F44] via-blue-900 to-[#0B1F44] hover:from-blue-900 hover:via-blue-800 hover:to-navy-dark text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-950/25 hover:shadow-xl hover:shadow-blue-950/35 transition-all duration-200 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-cyan-300" />
                  <span className="tracking-wide text-sm">Memverifikasi Sesi...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide text-sm font-bold">Masuk ke OptiFoam</span>
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice Pill */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-1.5 text-gray-400 text-[11px] font-medium text-center">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>Terproteksi JSON Web Token & Role-Based Access Control</span>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 font-medium">
            © 2026 <span className="text-gray-400 font-semibold">PT Royal Abadi Sejahtera</span> • OptiFoam v2.0
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;