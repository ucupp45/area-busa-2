import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCcw } from 'lucide-react';

const BarcodeScannerModal = ({ onScan, onClose, title = "Scan Barcode" }) => {
  const [hasCameras, setHasCameras] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [scannerError, setScannerError] = useState('');
  
  const scannerRef = useRef(null);
  const html5QrCode = useRef(null);

  useEffect(() => {
    // Prevent scrolling when modal is open
    document.body.style.overflow = 'hidden';

    // Initialize the scanner on mount
    html5QrCode.current = new Html5Qrcode("reader");

    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length) {
          setHasCameras(true);
          setCameras(devices);
          // By default, try to pick the back camera, or the first available one
          const backCamera = devices.find(device => device.label.toLowerCase().includes('back'));
          const cameraId = backCamera ? backCamera.id : devices[0].id;
          setActiveCameraId(cameraId);
          startScanning(cameraId);
        } else {
          setScannerError("Kamera tidak ditemukan di perangkat ini.");
        }
      })
      .catch(err => {
        setScannerError("Gagal mengakses kamera: " + err);
      });

    // Cleanup function when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
      stopScanning();
    };
  }, []);

  const startScanning = (cameraId) => {
    setScannerError('');
    if (html5QrCode.current && html5QrCode.current.isScanning) {
      html5QrCode.current.stop().then(() => {
        startScannerInstance(cameraId);
      }).catch(err => console.error("Error stopping scanner", err));
    } else {
      startScannerInstance(cameraId);
    }
  };

  const startScannerInstance = (cameraId) => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 150 }, // typical barcode shape
      aspectRatio: 1.0,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF
      ]
    };

    html5QrCode.current.start(
      cameraId,
      config,
      (decodedText, decodedResult) => {
        // Success callback
        stopScanning();
        onScan(decodedText);
      },
      (errorMessage) => {
        // Parse error (ignore normally as it scans constantly)
      }
    ).catch(err => {
      setScannerError("Gagal memulai scanner: " + err);
    });
  };

  const stopScanning = () => {
    if (html5QrCode.current && html5QrCode.current.isScanning) {
      html5QrCode.current.stop().catch(err => console.error(err));
    }
  };

  const switchCamera = (e) => {
    const newId = e.target.value;
    setActiveCameraId(newId);
    startScanning(newId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <Camera className="text-accent-blue" size={20} /> {title}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-600 rounded-full dark:bg-slate-700 dark:hover:bg-red-900/30 dark:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          {hasCameras && cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <RefreshCcw size={16} className="text-gray-500 flex-shrink-0" />
              <select 
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-accent-blue text-gray-800 dark:text-white"
                value={activeCameraId || ''}
                onChange={switchCamera}
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id.substring(0, 5)}...`}</option>
                ))}
              </select>
            </div>
          )}

          {scannerError ? (
            <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg text-center font-medium">
              {scannerError}
            </div>
          ) : (
            <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center shadow-inner">
              <div id="reader" className="w-full h-full" ref={scannerRef}></div>
            </div>
          )}
          
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 px-2 leading-relaxed">
            Arahkan kamera PC / DroidCam ke barcode atau QR Code. Pemindaian akan berjalan otomatis jika terdeteksi dengan jelas.
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
