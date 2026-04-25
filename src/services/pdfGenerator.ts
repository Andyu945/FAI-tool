import { jsPDF } from 'jspdf';
import type { Photo, Product, InspectionRecord } from '../types';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export async function generatePDF(
  product: Product,
  record: InspectionRecord,
  photos: Photo[],
  cmName?: string
): Promise<void> {
  if (photos.length === 0) {
    alert('No photos');
    return;
  }

  console.log('Generating PDF with', photos.length, 'photos');

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Sort photos by itemIndex, then by type
  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.itemIndex !== b.itemIndex) return a.itemIndex - b.itemIndex;
    return a.type === 'GS' ? -1 : 1;
  });

  console.log('Sorted photos:', sortedPhotos);

  // Build items array
  const items: { itemIndex: number; gs?: Photo; sample?: Photo }[] = [];
  for (const photo of sortedPhotos) {
    const existing = items.find(x => x.itemIndex === photo.itemIndex);
    if (existing) {
      if (photo.type === 'GS') existing.gs = photo;
      else existing.sample = photo;
    } else {
      const newItem: { itemIndex: number; gs?: Photo; sample?: Photo } = { itemIndex: photo.itemIndex };
      if (photo.type === 'GS') newItem.gs = photo;
      else newItem.sample = photo;
      items.push(newItem);
    }
  }

  console.log('Items:', items);

  // Each item takes half a page height (GS + Sample side by side)
  const itemsPerPage = 4;
  const totalPages = Math.ceil(items.length / itemsPerPage);

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) {
      doc.addPage();
    }

    // Header - Line 1: Date + CM Name
    doc.setFontSize(10);
    doc.setFont('arial', 'normal');
    doc.text(`Date: ${formatDate(record.inspectedAt)}`, margin, margin + 5);
    doc.text(`CM: ${cmName || '-'}`, margin + 70, margin + 5);

    // Header - Line 2: Part No. + Inspector
    doc.setFontSize(10);
    doc.setFont('arial', 'normal');
    doc.text(`Part No.: ${product.serialNumber}`, margin, margin + 12);
    doc.text(`Inspector: ${record.inspector}`, margin + 70, margin + 12);

    const contentTop = margin + 22;
    const contentHeight = pageHeight - contentTop - margin;
    const itemHeight = contentHeight / itemsPerPage;
    const photoWidth = (pageWidth - margin * 2 - 10) / 2;
    const photoHeight = itemHeight - 12;

    const startIdx = pageNum * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, items.length);

    for (let idx = startIdx; idx < endIdx; idx++) {
      const item = items[idx];
      const y = contentTop + (idx - startIdx) * itemHeight;

      // Item label on left
      doc.setFontSize(10);
      doc.setFont('arial', 'normal');
      doc.text(`Item ${item.itemIndex}`, margin, y + 6);

      // GS photo
      const gsX = margin + 12;
      if (item.gs && item.gs.blob) {
        try {
          const dataUrl = await blobToDataUrl(item.gs.blob);
          doc.addImage(dataUrl, 'JPEG', gsX, y + 8, photoWidth, photoHeight);
        } catch (e) {
          console.error('GS image error:', e);
        }
      }

      // Sample photo
      const sampleX = gsX + photoWidth + 10;
      if (item.sample && item.sample.blob) {
        try {
          const dataUrl = await blobToDataUrl(item.sample.blob);
          doc.addImage(dataUrl, 'JPEG', sampleX, y + 8, photoWidth, photoHeight);
        } catch (e) {
          console.error('Sample image error:', e);
        }
      }

      // Labels
      doc.setFontSize(8);
      doc.setFont('arial', 'normal');
      doc.text('GS', gsX + photoWidth / 2, y + itemHeight - 2, { align: 'center' });
      doc.text('Sample', sampleX + photoWidth / 2, y + itemHeight - 2, { align: 'center' });
    }

    // Footer
    doc.setFontSize(9);
    doc.setFont('arial', 'normal');
    doc.text(`Page ${pageNum + 1} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  }

  const fileName = `${formatDate(record.inspectedAt)}_${cmName || ''}_${product.serialNumber}.pdf`;
  doc.save(fileName);
}
