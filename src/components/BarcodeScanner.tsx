import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'manual'>('select');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startCameraScanner = useCallback(async () => {
    setMode('camera');
    try {
      const scanner = new Html5Qrcode('video-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 5,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 1.5
        },
        (decodedText) => {
          scanner.stop().then(() => {
            onScan(decodedText);
          });
        },
        () => {}
      );
      setScannerReady(true);
      setError(null);
    } catch (err: unknown) {
      console.error('Scanner error:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setError('请在浏览器设置中允许使用相机');
      } else if (errorMessage.includes('NotFoundError')) {
        setError('未找到相机设备');
      } else {
        setError('相机启动失败');
      }
    }
  }, [onScan]);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full overflow-hidden">

        {mode === 'select' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6 text-white text-center">选择输入方式</h3>
            <div className="space-y-4">
              <button
                onClick={startCameraScanner}
                className="w-full py-5 bg-green-600 text-white rounded-xl font-medium text-lg"
              >
                扫码输入
              </button>
              <button
                onClick={() => setMode('manual')}
                className="w-full py-5 bg-gray-700 text-white rounded-xl font-medium text-lg"
              >
                手动输入
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 mt-4 text-gray-400 hover:text-white"
            >
              返回
            </button>
          </div>
        )}

        {mode === 'camera' && (
          <>
            <div className="aspect-square bg-black relative">
              <div id="video-container" className="w-full h-full" />
              {!scannerReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-gray-400 text-sm mb-2">相机启动中...</p>
                  <p className="text-gray-500 text-xs">请对准条码</p>
                </div>
              )}
            </div>
            {error && (
              <div className="p-3 text-red-500 text-center text-sm bg-red-900/30">{error}</div>
            )}
            <div className="p-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium"
              >
                返回
              </button>
              <button
                onClick={() => setMode('manual')}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium"
              >
                手动输入
              </button>
            </div>
          </>
        )}

        {mode === 'manual' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-white">输入料号</h3>
            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="请输入料号"
                className="w-full px-4 py-3 border-2 border-gray-600 rounded-xl mb-4 text-lg bg-gray-800 text-white focus:border-green-500 focus:outline-none"
                autoFocus
                maxLength={20}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium"
                >
                  返回
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium"
                >
                  确认
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
