export type PhotoType = 'GS' | 'Sample';

export interface Product {
  id?: number;
  serialNumber: string;
  name: string;
  createdAt: Date;
}

export interface InspectionRecord {
  id?: number;
  productId: number;
  inspector: string;
  inspectedAt: Date;
}

export interface Photo {
  id?: number;
  recordId: number;
  itemIndex: number;
  type: PhotoType;
  blob: Blob;
  shotAt: Date;
}
