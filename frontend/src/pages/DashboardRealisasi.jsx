import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { LayoutDashboard, Loader, TrendingUp, Calendar, Activity } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

const DashboardRealisasi = () => {
    const { prefs } = useSettings();
    const isDark = prefs.darkMode;

    const [loading, setLoading] = useState(true);
    const [realisasiData, setRealisasiData] = useState([]);
    const [woData, setWoData] = useState([]);
    const [matrixData, setMatrixData] = useState([]);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [realRes, woRes, matrixRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/realisasi'),
                    axios.get('http://localhost:5000/api/spk/wo/active'),
                    axios.get('http://localhost:5000/api/matrix')
                ]);
                setRealisasiData(realRes.data || []);
                setWoData(woRes.data || []);
                setMatrixData(matrixRes.data || []);
            } catch (err) {
                console.error('Error fetching dashboard realisasi data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fulfilledWOs = useMemo(() => {
        const wos = woData.map((item, idx) => {
            const plan = Number(item.qty_cutting) || 0;
            const real = Number(item.qty_terpenuhi) || 0;
            const pct = plan > 0 ? ((real / plan) * 100).toFixed(1) : 0;
            let stat = 'Active';
            if (real >= plan) stat = 'Fulfilled';
            else if (real > 0) stat = 'Partial';
            return { ...item, plan, real, pct, stat, id: item.no_wo || idx };
        });
        return wos.filter(w => w.stat === 'Fulfilled');
    }, [woData]);

    const chartData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        return days.map(d => {
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const labelTanggal = `${d.getDate()} ${monthNames[d.getMonth()]}`;

            const dayRecords = realisasiData.filter(r => {
                if (!r.tanggal) return false;
                const rd = new Date(r.tanggal);
                const rStr = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`;
                return rStr === dStr;
            });

            // Unique machines
            const vMachines = new Set();
            const hMachines = new Set();
            const cMachines = new Set();

            let total_sb = 0;
            let waktu_v = 0;
            let waktu_h = 0;
            let waktu_c = 0;

            let total_wo = 0;

            dayRecords.forEach(r => {
                const getMatrixItem = (namaItem, tipeMesin) => {
                    if (!namaItem) return null;
                    const cleanName = namaItem.replace(/\s+/g, '').toLowerCase();
                    let matched = matrixData.find(m => m.nama_item.replace(/\s+/g, '').toLowerCase() === cleanName && m.tipe_mesin === tipeMesin);
                    if (!matched) {
                        matched = matrixData.find(m => cleanName.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()) && m.tipe_mesin === tipeMesin);
                    }
                    return matched;
                };

                if (r.no_spk) {
                    total_wo += String(r.no_spk).split(',').length;
                }
                if (r.v_hasil_qty) {
                    const qty = Number(r.v_hasil_qty);
                    total_sb += qty;
                    const m = getMatrixItem(r.kualitas || '', 'Vertikal');
                    if (m) {
                        waktu_v += qty * Number(m.cycle_time_menit);
                    } else {
                        waktu_v += (qty * 7); 
                    }
                    if (r.v_no_mesin) vMachines.add(r.v_no_mesin);
                }
                if (r.carousel_items) {
                    r.carousel_items.forEach(c => {
                        const qtyAsal = Number(r.asal_qty || 1);
                        const m = getMatrixItem(r.kualitas || '', c.tipe_mesin);

                        const calcItemCT = (t, qty) => {
                            let ptu = 0, pma = 0, pmu = 0;
                            if (!m) return 0;
                            if (c.tipe_mesin === 'Carousel') {
                                const roundupFactor = Math.ceil((qtyAsal / 6) * 100) / 100;
                                ptu = (Number(m.ct_ptu) || 0) * t * (qty / qtyAsal) * roundupFactor;
                                pma = (Number(m.ct_pma) || 0) * (qty / qtyAsal) * roundupFactor;
                            } else {
                                ptu = (Number(m.ct_ptu) || 0) * t * qty;
                                pma = (Number(m.ct_pma) || 0) * qty;
                                pmu = (Number(m.ct_pmu) || 0) * qty;
                            }
                            return ptu + pma + pmu;
                        };

                        const ctHasil = calcItemCT(Number(c.hasil2_t || 0), Number(c.hasil2_qty || 0));
                        const ctWk = calcItemCT(Number(c.waste_kulit_t || 0), Number(c.waste_kulit_qty || 0));
                        const ctWp = calcItemCT(Number(c.waste_potong_t || 0), Number(c.waste_potong_qty || 0));
                        const ctWpr = calcItemCT(Number(c.waste_produksi_t || 0), Number(c.waste_produksi_qty || 0));
                        const ctSp = calcItemCT(Number(c.sispot_t || 0), Number(c.sispot_qty || 0));
                        
                        const total_cutting_time = ctHasil + ctWk + ctWp + ctWpr + ctSp;

                        if (c.tipe_mesin === 'Carousel') {
                            if (m) {
                                const c1 = Number(m.ct_c1) || 0;
                                const c2 = Number(m.ct_c2) || 0;
                                const c3 = Number(m.ct_c3) || 0;
                                const distSetup = 1 / r.carousel_items.length;
                                const kebutuhanSB = qtyAsal / r.carousel_items.length;
                                waktu_c += (c1 * distSetup) + (c2 * kebutuhanSB) + (c3 * kebutuhanSB) + total_cutting_time;
                            } else {
                                waktu_c += (Number(c.hasil2_qty || 0) * 7);
                            }
                            if (c.no_mesin) cMachines.add(c.no_mesin);
                        } else {
                            if (m) {
                                const c1 = Number(m.ct_c1) || 0;
                                const c2 = Number(m.ct_c2) || 0;
                                const c3 = Number(m.ct_c3) || 0;
                                const kebutuhanSB = qtyAsal / r.carousel_items.length;
                                waktu_h += (c1 * kebutuhanSB) + (c2 * kebutuhanSB) + (c3 * kebutuhanSB) + total_cutting_time;
                            } else {
                                waktu_h += (Number(c.hasil2_qty || 0) * 7);
                            }
                            if (c.no_mesin) hMachines.add(c.no_mesin);
                        }
                    });
                }
            });

            const mesin_v = vMachines.size;
            const mesin_h = hMachines.size;
            const mesin_c = cMachines.size;

            return {
                labelTanggal,
                mesin_v,
                mesin_h,
                mesin_c,
                mp_v: mesin_v * 4,
                mp_h: mesin_h * 4,
                mp_c: mesin_c * 4,
                total_sb,
                waktu_v,
                waktu_h,
                waktu_c,
                total_wo
            };
        });
    }, [realisasiData, startDate, endDate, matrixData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-accent-blue py-20">
                <Loader size={36} className="animate-spin mb-4" />
                <p className="font-bold text-navy-dark">Memuat Data Dashboard Realisasi...</p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={`p-3 rounded shadow-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <p className="font-bold mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm" style={{ color: entry.color }}>
                            <span className="font-medium">{entry.name}:</span>
                            <span>{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`p-6 min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
            {/* CHARTS CONTAINER (Unified Layout) */}
            <div className={`rounded-xl shadow-sm border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-navy-dark'}`}>
                        <TrendingUp className="text-blue-500" /> Tren Realisasi Produksi (Rentang Waktu)
                    </h2>

                    {/* FILTER HEADER */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className={`flex items-center gap-2 p-1.5 rounded-lg border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center gap-1">
                                <Calendar className={isDark ? 'text-gray-400' : 'text-gray-500'} size={16} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const start = new Date(val);
                                        const end = new Date(endDate);
                                        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
                                        if (start > end) {
                                            setEndDate(val);
                                        } else if (diffDays > 6) {
                                            const newEnd = new Date(start);
                                            newEnd.setDate(newEnd.getDate() + 6);
                                            setEndDate(newEnd.toISOString().split('T')[0]);
                                        }
                                        setStartDate(val);
                                    }}
                                    className={`border-none bg-transparent px-1 py-0.5 text-sm outline-none font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}
                                />
                            </div>
                            <span className="text-gray-400 font-bold hidden sm:inline">-</span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const end = new Date(val);
                                        const start = new Date(startDate);
                                        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
                                        if (end < start) {
                                            setStartDate(val);
                                        } else if (diffDays > 6) {
                                            const newStart = new Date(end);
                                            newStart.setDate(newStart.getDate() - 6);
                                            setStartDate(newStart.toISOString().split('T')[0]);
                                        }
                                        setEndDate(val);
                                    }}
                                    className={`border-none bg-transparent px-1 py-0.5 text-sm outline-none font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* 1. Total WO (Bar Chart) */}
                    <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                        <h3 className="font-bold text-sm mb-4 text-center text-blue-500">Total Work Order (Realisasi)</h3>
                        <div className="w-full h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                                    <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: isDark ? '#334155' : '#f3f4f6' }} />
                                    <Bar dataKey="total_wo" name="Total WO" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="total_wo" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                                    </Bar>
                                    <Line type="monotone" dataKey="total_wo" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. Kebutuhan Short Block (SB) */}
                    <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                        <h3 className="font-bold text-sm mb-4 text-center text-red-500">Pemakaian Short Block (SB) (Realisasi)</h3>
                        <div className="w-full h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                                    <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: isDark ? '#334155' : '#f3f4f6' }} formatter={(value) => typeof value === 'number' ? Number(value).toFixed(2) : value} />
                                    <Bar dataKey="total_sb" name="Total SB" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="total_sb" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val.toFixed(1).replace(/\.0$/, '') : ''} />
                                    </Bar>
                                    <Line type="monotone" dataKey="total_sb" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Waktu Per Mesin */}
                    <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                        <h3 className="font-bold text-sm mb-4 text-center text-orange-500">Waktu Per Mesin (Menit) (Realisasi)</h3>
                        <div className="w-full h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="10%" barGap={1}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                                    <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: isDark ? '#334155' : '#f3f4f6' }} formatter={(value) => typeof value === 'number' ? Number(value).toFixed(2) : value} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="waktu_v" name="Vertikal" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="waktu_v" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? Math.round(val) : ''} />
                                    </Bar>
                                    <Bar dataKey="waktu_h" name="Horizontal" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="waktu_h" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? Math.round(val) : ''} />
                                    </Bar>
                                    <Bar dataKey="waktu_c" name="Carousel" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="waktu_c" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? Math.round(val) : ''} />
                                    </Bar>
                                    <Line type="monotone" dataKey="waktu_v" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="waktu_h" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="waktu_c" stroke="#6d28d9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 4. Total Manpower (Bar Chart) */}
                    <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                        <h3 className="font-bold text-sm mb-4 text-center text-purple-500">Total Manpower (Realisasi)</h3>
                        <div className="w-full h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="10%" barGap={1}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                                    <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: isDark ? '#334155' : '#f3f4f6' }} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="mp_v" name="MP Vertikal" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="mp_v" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                                    </Bar>
                                    <Bar dataKey="mp_h" name="MP Horizontal" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="mp_h" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                                    </Bar>
                                    <Bar dataKey="mp_c" name="MP Carousel" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="mp_c" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                                    </Bar>
                                    <Line type="monotone" dataKey="mp_v" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="mp_h" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="mp_c" stroke="#6d28d9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabe WO Fulfilled */}
            <div className={`mt-8 p-6 rounded-xl shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <h3 className="font-bold text-navy-dark mb-4">Work Order (WO) Selesai (Fulfilled)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className={`border-b ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                                <th className="py-3 px-4 font-semibold">Tgl WO</th>
                                <th className="py-3 px-4 font-semibold">No WO</th>
                                <th className="py-3 px-4 font-semibold">Customer</th>
                                <th className="py-3 px-4 font-semibold">Item</th>
                                <th className="py-3 px-4 font-semibold text-center">Status</th>
                                <th className="py-3 px-4 font-semibold text-center">Target (Plan)</th>
                                <th className="py-3 px-4 font-semibold text-center">Aktual (Real)</th>
                                <th className="py-3 px-4 font-semibold text-center">%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {fulfilledWOs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-8 text-center text-gray-400 italic">Belum ada Work Order yang diselesaikan.</td>
                                </tr>
                            ) : (
                                fulfilledWOs.map((wo, i) => (
                                    <tr key={wo.id} className={`transition-colors hover:${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                        <td className="py-3 px-4">
                                            {wo.tanggal_wo ? new Date(wo.tanggal_wo).toISOString().split('T')[0] : '-'}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-accent-blue">{wo.no_wo}</td>
                                        <td className="py-3 px-4 truncate max-w-[150px]">{wo.customer}</td>
                                        <td className="py-3 px-4 truncate max-w-[200px]">{wo.nama_item}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                                                {wo.stat}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-semibold">{wo.plan}</td>
                                        <td className="py-3 px-4 text-center font-bold text-green-600">{wo.real}</td>
                                        <td className="py-3 px-4 text-center font-bold">{wo.pct}%</td>
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

export default DashboardRealisasi;
