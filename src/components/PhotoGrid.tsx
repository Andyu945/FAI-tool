import { useEffect, useState } from 'react';
import type { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  onDelete?: (photo: Photo) => void;
}

export default function PhotoGrid({ photos, onDelete }: PhotoGridProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const loadThumbnails = async () => {
      const newThumbnails = new Map<number, string>();
      for (const photo of photos) {
        if (photo.id && !thumbnails.has(photo.id)) {
          const url = URL.createObjectURL(photo.blob);
          newThumbnails.set(photo.id, url);
        }
      }
      if (newThumbnails.size > 0) {
        setThumbnails(prev => new Map([...prev, ...newThumbnails]));
      }
    };
    loadThumbnails();
  }, [photos]);

  // Group photos by itemIndex
  const items = photos.reduce((acc, photo) => {
    if (!acc[photo.itemIndex]) {
      acc[photo.itemIndex] = [];
    }
    acc[photo.itemIndex].push(photo);
    return acc;
  }, {} as Record<number, Photo[]>);

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        暂无照片
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(items).map(([itemIndex, itemPhotos]) => (
        <div key={itemIndex} className="bg-[#1a1a1a] rounded-xl p-3">
          <p className="text-sm font-medium text-gray-300 mb-2">Item {itemIndex}</p>
          <div className="grid grid-cols-2 gap-2">
            {itemPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden group">
                {photo.id && thumbnails.has(photo.id) && (
                  <img
                    src={thumbnails.get(photo.id)}
                    alt={photo.type}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{photo.type}</span>
                </div>
                {onDelete && (
                  <button
                    onClick={() => onDelete(photo)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
