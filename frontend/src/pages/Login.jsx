import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ornamen */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent-blue/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-navy-dark/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-10">
        <div className="bg-navy-dark p-8 text-center border-b-4 border-accent-blue">
          <h1 className="text-2xl font-bold text-white tracking-widest">AREA BUSA 2</h1>
          <p className="text-accent-blue text-sm mt-2">Sistem Perencanaan Produksi</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-navy-dark mb-6 text-center">Silakan Login</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <User size={18} className="absolute left-3 top-2.5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock size={18} className="absolute left-3 top-2.5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 bg-navy-dark hover:bg-blue-900 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  Login <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Akses terbatas hanya untuk tim internal pabrik.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;