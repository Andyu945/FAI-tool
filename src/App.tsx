import { useState, useEffect } from 'react';
import type { Product, InspectionRecord, Photo, PhotoType } from './types';
import { db, getOrCreateProduct, createRecord, addPhoto, getPhotosByRecordId } from './services/db';
import BarcodeScanner from './components/BarcodeScanner';
import InspectorInput from './components/InspectorInput';
import PhotoCapture from './components/PhotoCapture';
import PhotoGrid from './components/PhotoGrid';
import ReportGenerator from './components/ReportGenerator';

type AppState = 'idle' | 'scanning' | 'settings' | 'capturing' | 'review';

function App() {
  const [state, setState] = useState<AppState>('idle');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentRecord, setCurrentRecord] = useState<InspectionRecord | null>(null);
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]);
  const [recentRecords, setRecentRecords] = useState<Array<{ record: InspectionRecord; product: Product; photoCount: number }>>([]);
  const [showReport, setShowReport] = useState(false);
  const [inspector, setInspector] = useState(() => localStorage.getItem('inspector') || '');
  const [cmName, setCmName] = useState(() => localStorage.getItem('cmName') || '');

  useEffect(() => {
    loadRecentRecords();
  }, []);

  const loadRecentRecords = async () => {
    const records = await db.records.orderBy('inspectedAt').reverse().limit(10).toArray();
    const withProducts = await Promise.all(
      records.map(async (r) => {
        const product = await db.products.get(r.productId);
        const photos = await getPhotosByRecordId(r.id!);
        return { record: r, product: product!, photoCount: photos.length };
      })
    );
    setRecentRecords(withProducts.filter(r => r.product));
  };

  const handleScan = async (serialNumber: string) => {
    const product = await getOrCreateProduct(serialNumber);
    setCurrentProduct(product);

    // Get saved inspector or use default
    const savedInspector = inspector || localStorage.getItem('inspector') || 'Unknown';
    const record = await createRecord(product.id!, savedInspector);
    setCurrentRecord(record);
    setCurrentPhotos([]);
    setState('capturing');
  };

  const handleSettingsSave = async (newInspector: string, newCmName: string) => {
    setInspector(newInspector);
    setCmName(newCmName);
    localStorage.setItem('inspector', newInspector);
    localStorage.setItem('cmName', newCmName);

    if (currentProduct) {
      const record = await createRecord(currentProduct.id!, newInspector);
      setCurrentRecord(record);
      setCurrentPhotos([]);
      setState('capturing');
    } else {
      // Just saving settings, return to idle
      setState('idle');
    }
  };

  const handleCapture = async (blob: Blob, itemIndex: number, type: PhotoType) => {
    if (!currentRecord) return;
    const photo = await addPhoto(currentRecord.id!, itemIndex, type, blob);
    setCurrentPhotos(prev => [...prev, photo]);
  };

  const handleFinishCapturing = () => {
    setState('review');
  };

  const handleNewInspection = () => {
    setCurrentProduct(null);
    setCurrentRecord(null);
    setCurrentPhotos([]);
    setState('idle');
    loadRecentRecords();
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('确定要删除这条检查记录吗？')) return;
    const photos = await db.photos.where('recordId').equals(recordId).toArray();
    for (const photo of photos) {
      await db.photos.delete(photo.id!);
    }
    await db.records.delete(recordId);
    loadRecentRecords();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {state === 'idle' && (
        <div className="max-w-lg mx-auto p-4">
                    <h1 className="text-2xl font-bold text-center mb-4 text-white">Razer SI FAI Recording Tool v0.1</h1>

          <button
            onClick={() => setState('scanning')}
            className="w-full py-4 bg-green-600 text-white rounded-2xl text-lg font-medium mb-6"
          >
            开始记录FAI
          </button>

          <button
            onClick={() => setShowReport(true)}
            className="w-full py-4 bg-green-600 text-white rounded-2xl text-lg font-medium mb-8"
          >
            生成报告
          </button>

          {inspector && cmName && (
            <div className="text-center text-gray-400 text-sm mb-4">
              <p>检查人: {inspector} | CM: {cmName}</p>
            </div>
          )}

          <button
            onClick={() => setState('settings')}
            className="w-full py-3 bg-gray-700 text-white rounded-xl text-base font-medium mb-8"
          >
            设置
          </button>

          {recentRecords.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-white">最近检查</h2>
              <div className="space-y-3">
                {recentRecords.map(({ record, product, photoCount }) => (
                  <div key={record.id} className="bg-[#1a1a1a] p-4 rounded-xl flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium text-white">{product.serialNumber}</p>
                      <p className="text-sm text-gray-400">{record.inspector}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{new Date(record.inspectedAt).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-400">{photoCount / 2} 个Item</p>
                    </div>
                    <button
                      onClick={() => handleDeleteRecord(record.id!)}
                      className="ml-3 w-10 h-10 bg-green-600 text-red-500 rounded-lg flex items-center justify-center text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {state === 'scanning' && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setState('idle')}
        />
      )}

      {state === 'settings' && (
        <InspectorInput
          inspector={inspector}
          cmName={cmName}
          onSave={handleSettingsSave}
          onCancel={() => setState('idle')}
        />
      )}

      {state === 'capturing' && currentRecord && (
        <PhotoCapture
          onCapture={handleCapture}
          onFinish={handleFinishCapturing}
          photoCount={currentPhotos.length}
        />
      )}

      {state === 'review' && currentRecord && currentProduct && (
        <div className="min-h-screen bg-black text-white">
          <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-700 p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">{currentProduct.serialNumber}</h2>
              <p className="text-sm text-gray-400">检查人: {currentRecord.inspector}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setState('capturing')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
              >
                继续拍摄
              </button>
              <button
                onClick={handleNewInspection}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
              >
                新检查
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-400 mb-4">共 {currentPhotos.length / 2} 个Item</p>
            <PhotoGrid photos={currentPhotos} />
          </div>
        </div>
      )}

      {showReport && (
        <ReportGenerator onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

export default App;
