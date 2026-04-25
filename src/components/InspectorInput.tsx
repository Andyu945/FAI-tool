import { useState } from 'react';

interface InspectorInputProps {
  inspector: string;
  cmName: string;
  onSave: (inspector: string, cmName: string) => void;
  onCancel: () => void;
}

export default function InspectorInput({ inspector, cmName, onSave, onCancel }: InspectorInputProps) {
  const [name, setName] = useState(inspector);
  const [cm, setCm] = useState(cmName);

  const canSave = name.trim().length > 0 && cm.trim().length > 0;

  const handleSave = () => {
    if (canSave) {
      onSave(name.trim(), cm.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">设置</h3>
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">检查人姓名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入检查人姓名"
            className="w-full px-4 py-3 border-2 border-gray-600 rounded-xl text-lg bg-gray-800 text-white focus:border-green-500 focus:outline-none"
            autoFocus
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">CM名称</label>
          <input
            type="text"
            value={cm}
            onChange={(e) => setCm(e.target.value)}
            placeholder="请输入CM名称"
            className="w-full px-4 py-3 border-2 border-gray-600 rounded-xl text-lg bg-gray-800 text-white focus:border-green-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium disabled:bg-gray-600"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
