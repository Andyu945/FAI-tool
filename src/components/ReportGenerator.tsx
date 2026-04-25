import { useState, useEffect } from 'react';
import type { Product, InspectionRecord, Photo } from '../types';
import { db, getRecordWithProduct } from '../services/db';
import { generatePDF } from '../services/pdfGenerator';

interface ReportGeneratorProps {
  onClose: () => void;
}

interface RecordWithData {
  record: InspectionRecord;
  product: Product;
  photos: Photo[];
}

export default function ReportGenerator({ onClose }: ReportGeneratorProps) {
  const [records, setRecords] = useState<RecordWithData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const allRecords = await db.records.orderBy('inspectedAt').reverse().limit(50).toArray();

      const recordsWithData: RecordWithData[] = [];
      for (const record of allRecords) {
        const data = await getRecordWithProduct(record.id!);
        if (data && data.photos.length > 0) {
          recordsWithData.push(data as RecordWithData);
        }
      }
      setRecords(recordsWithData);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecord = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const generateSelectedReports = async () => {
    const cmName = localStorage.getItem('cmName') || '';
    for (const id of selectedIds) {
      const data = records.find(r => r.record.id === id);
      if (data) {
        await generatePDF(data.product, data.record, data.photos, cmName);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    onClose();
  };

  const totalPhotos = records
    .filter(r => selectedIds.has(r.record.id!))
    .reduce((sum, r) => sum + r.photos.length, 0);

  return (
    <div className="fixed inset-0 bg-black text-white z-50 flex flex-col">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold">生成报告</h2>
        <button onClick={onClose} className="text-gray-400 text-2xl hover:text-white">×</button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-center text-gray-400 py-12">加载中...</p>
        ) : records.length === 0 ? (
          <p className="text-center text-gray-400 py-12">暂无检查记录</p>
        ) : (
          <div className="space-y-3">
            {records.map(({ record, product, photos }) => (
              <div
                key={record.id}
                onClick={() => toggleRecord(record.id!)}
                className={`p-4 rounded-xl cursor-pointer transition-colors ${
                  selectedIds.has(record.id!) ? 'bg-green-600' : 'bg-[#1a1a1a]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.serialNumber}</p>
                    <p className="text-sm text-gray-400">
                      {record.inspector} | {new Date(record.inspectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{photos.length}张照片</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedIds.has(record.id!) ? 'border-white bg-white' : 'border-gray-500'
                    }`}>
                      {selectedIds.has(record.id!) && (
                        <span className="text-black text-sm">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400">
            已选择 {selectedIds.size} 项，共 {totalPhotos} 张照片
          </span>
        </div>
        <button
          onClick={generateSelectedReports}
          disabled={selectedIds.size === 0}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-medium disabled:bg-gray-700 disabled:text-gray-500"
        >
          生成报告
        </button>
      </div>
    </div>
  );
}
