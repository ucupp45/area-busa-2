import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Database, Edit2, Save, X, Activity } from 'lucide-react';
import axios from 'axios';

const DatabaseMesinOrang = () => {
    const { prefs } = useSettings();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ total_mesin: '', manpower_per_mesin: '' });
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/mesin-manpower');
            setData(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setEditForm({
            total_mesin: item.total_mesin,
            manpower_per_mesin: item.manpower_per_mesin
        });
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    const handleSave = async (id) => {
        try {
            await axios.put(`http://localhost:5000/api/mesin-manpower/${id}`, editForm);
            setSuccessMessage('Data berhasil diperbarui!');
            setEditingId(null);
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error updating data:', error);
            alert('Gagal memperbarui data.');
        }
    };

    // UI Colors based on theme
    const bgMain = prefs.darkMode ? 'bg-[#1e293b]' : 'bg-white';
    const textMain = prefs.darkMode ? 'text-slate-200' : 'text-gray-700';
    const textTitle = prefs.darkMode ? 'text-white' : 'text-navy-dark';
    const borderCol = prefs.darkMode ? 'border-slate-700' : 'border-gray-200';
    const bgHeader = prefs.darkMode ? 'bg-[#0f172a]' : 'bg-gray-50';

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6">
                <h1 className={`text-2xl font-bold ${textTitle} flex items-center gap-2`}>
                    <Database size={24} className="text-accent-blue" />
                    Database Mesin & Orang
                </h1>
                <p className={`${textMain} mt-1`}>
                    Kelola ketersediaan mesin dan kebutuhan operator (manpower) secara mutlak.
                </p>
            </div>

            {successMessage && (
                <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-xl border border-green-200 flex items-center gap-2 font-semibold">
                    <Activity size={18} />
                    {successMessage}
                </div>
            )}

            <div className={`${bgMain} rounded-2xl shadow-sm border ${borderCol} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className={`w-full text-left border-collapse text-sm ${textMain}`}>
                        <thead className={`${bgHeader} ${borderCol} border-b`}>
                            <tr>
                                <th className="p-4 font-semibold text-center w-16">No</th>
                                <th className="p-4 font-semibold">Tipe Mesin</th>
                                <th className="p-4 font-semibold text-center">Total Mesin Tersedia</th>
                                <th className="p-4 font-semibold text-center">Manpower per Mesin</th>
                                <th className="p-4 font-semibold text-center w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">Memuat data...</td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500 italic">Data belum tersedia.</td>
                                </tr>
                            ) : (
                                data.map((item, idx) => (
                                    <tr key={item.id} className={`border-b ${borderCol} last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}>
                                        <td className="p-4 text-center text-gray-500">{idx + 1}</td>
                                        <td className="p-4 font-bold text-accent-blue">{item.tipe_mesin}</td>
                                        
                                        <td className="p-4 text-center">
                                            {editingId === item.id ? (
                                                <input 
                                                    type="number"
                                                    value={editForm.total_mesin}
                                                    onChange={(e) => setEditForm({...editForm, total_mesin: e.target.value})}
                                                    className="w-20 text-center border rounded p-1 dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                                />
                                            ) : (
                                                <span className="font-bold">{item.total_mesin}</span>
                                            )}
                                        </td>

                                        <td className="p-4 text-center">
                                            {editingId === item.id ? (
                                                <input 
                                                    type="number"
                                                    value={editForm.manpower_per_mesin}
                                                    onChange={(e) => setEditForm({...editForm, manpower_per_mesin: e.target.value})}
                                                    className="w-20 text-center border rounded p-1 dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                                />
                                            ) : (
                                                <span className="font-bold">{item.manpower_per_mesin}</span>
                                            )}
                                        </td>

                                        <td className="p-4 text-center">
                                            {editingId === item.id ? (
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleSave(item.id)} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors" title="Simpan">
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={handleCancel} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors" title="Batal">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEdit(item)} className="p-1.5 bg-blue-50 text-accent-blue hover:bg-blue-100 rounded transition-colors" title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DatabaseMesinOrang;
