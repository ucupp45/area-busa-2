import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
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
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/');
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
    <div className="min-h-screen bg-[#EEF4FB] relative flex flex-col justify-center items-center px-4 py-8 font-sans overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* Soft Ambient Pastel Glows (Lembut & Elegan, Non-Neon) */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200/55 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-sky-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-indigo-100/35 rounded-full blur-3xl pointer-events-none"></div>

      {/* Subtle Dot Grid Pattern (Memberi tekstur rapi, tidak monoton) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.28]"
        style={{
          backgroundImage: 'radial-gradient(#2563eb 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px'
        }}
      ></div>

      {/* Login Card (Floating Clean Surface dengan Soft Shadow) */}
      <div className="w-full max-w-[400px] bg-white/95 backdrop-blur-md rounded-2xl border border-white/90 shadow-[0_12px_36px_rgba(30,58,138,0.08)] p-7 sm:p-9 relative z-10 transition-all">
        
        {/* Header: Logo Royal Corp & Brand Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center p-2 mb-3">
            <img 
              src="/royal-corp-logo.jpg" 
              alt="Royal Corp Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            OptiFoam
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Area Busa 2 • PT Royal Abadi Sejahtera
          </p>
          <div className="w-8 h-1 bg-blue-600/20 rounded-full mt-3"></div>
        </div>

        {/* Notifikasi Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          {/* Input Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-300/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-slate-800 placeholder-slate-400 outline-none transition duration-150"
              />
            </div>
          </div>

          {/* Input Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-300/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-slate-800 placeholder-slate-400 outline-none transition duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Tombol Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Masuk</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

      </div>

      {/* Footer Bersahaja */}
      <div className="mt-6 text-center relative z-10">
        <p className="text-xs text-slate-500/80 font-medium">
          © 2026 PT Royal Abadi Sejahtera • Area Busa 2
        </p>
      </div>

    </div>
  );
};

export default Login;
