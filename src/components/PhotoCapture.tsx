import { useState, useRef, useCallback, useEffect } from 'react';
import type { PhotoType } from '../types';

interface PhotoCaptureProps {
  onCapture: (blob: Blob, itemIndex: number, type: PhotoType) => void;
  onFinish: () => void;
  photoCount: number; // Total number of photos taken
  maxItems?: number;
}

export default function PhotoCapture({
  onCapture,
  onFinish,
  photoCount,
  maxItems = 12
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Current item (1-based)
  const currentItem = Math.floor(photoCount / 2) + 1;
  // Current type: GS if even photoCount (0,2,4...), Sample if odd (1,3,5...)
  const currentType: PhotoType = photoCount % 2 === 0 ? 'GS' : 'Sample';

  const initCamera = useCallback(() => {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    }).then(mediaStream => {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().then(() => {
          setIsReady(true);
        });
      }
    }).catch(() => {
      setError('无法访问相机');
    });
  }, []);

  useEffect(() => {
    initCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (!videoRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setPendingBlob(blob);
        setPreview(canvas.toDataURL('image/jpeg', 1.0));
      }
    }, 'image/jpeg', 1.0);
  };

  const retake = () => {
    setPendingBlob(null);
    setPreview(null);
    // Restart camera for new capture
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsReady(false);
    setTimeout(initCamera, 100);
  };

  const confirmPhoto = () => {
    if (pendingBlob) {
      onCapture(pendingBlob, currentItem, currentType);
      setPendingBlob(null);
      setPreview(null);
      // Restart camera for next photo
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsReady(false);
      setTimeout(initCamera, 100);
    }
  };

  const finishWithPhoto = () => {
    confirmPhoto();
    setTimeout(onFinish, 200);
  };

  if (currentItem > maxItems) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-6">
        <p className="text-lg text-gray-600 mb-4">已达到最大Item数量 ({maxItems}个)</p>
        <button onClick={onFinish} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">
          完成检查
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <p className="text-red-500 text-center mb-4">{error}</p>
          <button onClick={onFinish} className="px-6 py-3 bg-gray-600 text-white rounded-xl font-medium">
            返回
          </button>
        </div>
      ) : preview ? (
        <>
          <div className="flex-1 bg-gray-900 flex items-center justify-center p-4">
            <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="p-4 bg-gray-800">
            <p className="text-white text-center mb-4">
              Item {currentItem} - {currentType} | 已完成 {currentItem - 1} 个Item
            </p>
            <div className="flex gap-3">
              <button onClick={retake} className="flex-1 py-4 rounded-xl bg-gray-600 text-white font-medium">
                重拍
              </button>
              <button onClick={confirmPhoto} className="flex-1 py-4 rounded-xl bg-blue-600 text-white font-medium">
                确认
              </button>
            </div>
            {currentType === 'Sample' && currentItem < maxItems && (
              <button
                onClick={finishWithPhoto}
                className="w-full mt-3 py-3 rounded-xl bg-green-600 text-white font-medium"
              >
                完成检查 ({currentItem} 个Item)
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 bg-gray-900 relative">
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white">相机启动中...</p>
              </div>
            )}
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
              Item {currentItem} - {currentType}
            </div>
          </div>
          <div className="p-4 bg-gray-800">
            <p className="text-gray-400 text-sm mb-2 text-center">
              {currentType === 'GS' ? '拍摄 GS (Golden Sample)' : '拍摄 Sample'}
            </p>
            <button
              onClick={takePhoto}
              disabled={!isReady}
              className="w-full py-4 rounded-full bg-white text-black font-bold text-lg disabled:bg-gray-400"
            >
              {isReady ? '拍摄' : '相机启动中...'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
