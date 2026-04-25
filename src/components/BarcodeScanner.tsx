import { useState } from 'react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">输入料号</h3>
          <form onSubmit={handleSubmit}>
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
      </div>
    </div>
  );
}
