import React, { useRef, useState, useCallback, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { X, Camera, RefreshCcw, ScanLine, Loader2 } from 'lucide-react';

const DocumentScannerModal = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fungsi untuk menghentikan aliran kamera yang sedang berjalan
  const stopMediaTracks = (currentStream) => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        track.stop();
      });
    }
  };

  const getDevices = useCallback(async () => {
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(({ kind }) => kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !activeDeviceId) {
        const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back'));
        setActiveDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }, [activeDeviceId]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    getDevices();
    
    // Matikan kamera saat modal ditutup
    return () => {
      document.body.style.overflow = 'unset';
      if (videoRef.current && videoRef.current.srcObject) {
        stopMediaTracks(videoRef.current.srcObject);
      }
    };
  }, [getDevices]);

  useEffect(() => {
    const startCamera = async () => {
      if (!activeDeviceId) return;
      
      // Stop stream lama jika ada
      if (videoRef.current && videoRef.current.srcObject) {
        stopMediaTracks(videoRef.current.srcObject);
      }

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: { exact: activeDeviceId }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error("Gagal memulai kamera:", err);
        // Fallback tanpa exact constraint (sering jadi penyelamat untuk DroidCam)
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: activeDeviceId }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
        } catch (fallbackErr) {
           console.error("Kamera tetap gagal dipanggil:", fallbackErr);
        }
      }
    };

    if (!isProcessing) {
      startCamera();
    }
  }, [activeDeviceId, isProcessing]);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Ambil gambar dari video stream ke dalam canvas
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Hasilkan base64 dari canvas
    const imageSrc = canvas.toDataURL('image/jpeg', 0.9);

    setIsProcessing(true);
    setProgress(0);
    
    // Stop stream sejenak saat memproses
    if (video.srcObject) stopMediaTracks(video.srcObject);

    try {
      const result = await Tesseract.recognize(
        imageSrc,
        'eng', 
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );
      
      const text = result.data.text;
      onScan(text);
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Gagal membaca dokumen. Pastikan gambar jelas dan terang.");
      setIsProcessing(false);
    } 
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <ScanLine className="text-accent-blue" size={20} /> Scan Form Fisik (OCR)
          </h3>
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="p-2 bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-600 rounded-full dark:bg-slate-700 dark:hover:bg-red-900/30 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          {devices.length > 1 && !isProcessing && (
            <div className="flex items-center gap-2">
              <RefreshCcw size={16} className="text-gray-500 flex-shrink-0" />
              <select 
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-accent-blue text-gray-800 dark:text-white"
                value={activeDeviceId || ''}
                onChange={(e) => setActiveDeviceId(e.target.value)}
              >
                {devices.map((device, key) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${key + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center shadow-inner">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center text-white p-6 text-center w-full h-full">
                <Loader2 size={48} className="animate-spin text-accent-blue mb-4" />
                <h4 className="text-lg font-bold mb-2">Memproses Dokumen...</h4>
                <p className="text-gray-400 text-sm mb-4">Menganalisis teks menggunakan AI (Tesseract OCR).</p>
                <div className="w-full max-w-xs bg-gray-800 rounded-full h-2.5 mx-auto">
                  <div className="bg-accent-blue h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs text-gray-400 mt-2">{progress}%</span>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}
            
            {/* Guide overlay */}
            {!isProcessing && (
              <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-4 rounded-lg flex flex-col justify-between p-4">
                <div className="text-white/60 text-xs text-center bg-black/50 p-2 rounded backdrop-blur self-center">Posisikan kertas form di dalam kotak ini</div>
              </div>
            )}
          </div>
          
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 px-2 leading-relaxed">
            Pastikan ruangan terang, teks form tercetak jelas, dan posisi kamera tidak blur/goyang agar sistem dapat membacanya dengan akurat.
          </div>

          {!isProcessing && (
            <button 
              onClick={captureAndScan}
              className="w-full py-4 bg-accent-blue hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
            >
              <Camera /> Ambil Foto & Baca Teks
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentScannerModal;
