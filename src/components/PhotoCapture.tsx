import { useState, useRef, useCallback, useEffect } from 'react';
import type { PhotoType } from '../types';

interface PhotoCaptureProps {
  onCapture: (blob: Blob, itemIndex: number, type: PhotoType) => void;
  onFinish: () => void;
  photoCount: number;
  maxItems?: number;
}

export default function PhotoCapture({
  onCapture,
  onFinish,
  photoCount,
  maxItems = 12
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  const currentItem = Math.floor(photoCount / 2) + 1;
  const currentType: PhotoType = photoCount % 2 === 0 ? 'GS' : 'Sample';

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const initCamera = useCallback(() => {
    stopStream();
    setIsReady(false);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('浏览器不支持相机访问');
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    }).then(mediaStream => {
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().then(() => {
          setIsReady(true);
        }).catch(() => {
          setError('视频播放失败');
        });
      }
    }).catch((err) => {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('请允许访问相机');
      } else if (err.name === 'NotFoundError') {
        setError('未找到相机');
      } else if (err.name === 'NotReadableError') {
        setError('相机被其他应用占用');
      } else {
        setError('无法访问相机');
      }
    });
  }, [stopStream]);

  useEffect(() => {
    initCamera();
    return () => {
      stopStream();
    };
  }, [retryKey, initCamera, stopStream]);

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
    stopStream();
    setTimeout(() => setRetryKey(k => k + 1), 100);
  };

  const confirmPhoto = () => {
    if (pendingBlob) {
      onCapture(pendingBlob, currentItem, currentType);
      setPendingBlob(null);
      setPreview(null);
      stopStream();
      setTimeout(() => setRetryKey(k => k + 1), 100);
    }
  };

  const finishWithPhoto = () => {
    confirmPhoto();
    setTimeout(onFinish, 200);
  };

  const handleRetry = () => {
    setRetryKey(k => k + 1);
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
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium mb-3"
          >
            重试
          </button>
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
