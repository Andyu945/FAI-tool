import Dexie, { type EntityTable } from 'dexie';
import type { Product, InspectionRecord, Photo, PhotoType } from '../types';

class ProductPhotoDB extends Dexie {
  products!: EntityTable<Product, 'id'>;
  records!: EntityTable<InspectionRecord, 'id'>;
  photos!: EntityTable<Photo, 'id'>;

  constructor() {
    super('ProductPhotoManager');
    this.version(1).stores({
      products: '++id, serialNumber, createdAt',
      records: '++id, productId, inspectedAt, inspector',
      photos: '++id, recordId, shotAt, itemIndex'
    });
  }
}

export const db = new ProductPhotoDB();

export async function getOrCreateProduct(serialNumber: string): Promise<Product> {
  let product = await db.products.where('serialNumber').equals(serialNumber).first();
  if (!product) {
    const newProduct: Product = {
      serialNumber,
      name: serialNumber,
      createdAt: new Date()
    };
    const id = await db.products.add(newProduct);
    return { ...newProduct, id };
  }
  return product;
}

export async function createRecord(productId: number, inspector: string): Promise<InspectionRecord> {
  const record: InspectionRecord = {
    productId,
    inspector,
    inspectedAt: new Date()
  };
  const id = await db.records.add(record);
  return { ...record, id };
}

export async function addPhoto(recordId: number, itemIndex: number, type: PhotoType, blob: Blob): Promise<Photo> {
  const photo: Photo = {
    recordId,
    itemIndex,
    type,
    blob,
    shotAt: new Date()
  };
  const id = await db.photos.add(photo);
  return { ...photo, id };
}

export async function getRecordsByDateRange(start: Date, end: Date): Promise<InspectionRecord[]> {
  return db.records
    .where('inspectedAt')
    .between(start, end, true, true)
    .toArray();
}

export async function getPhotosByRecordId(recordId: number): Promise<Photo[]> {
  const photos = await db.photos.where('recordId').equals(recordId).toArray();
  return photos.sort((a, b) => {
    if (a.itemIndex !== b.itemIndex) return a.itemIndex - b.itemIndex;
    return a.type === 'GS' ? -1 : 1;
  });
}

export async function getRecordWithProduct(recordId: number) {
  const record = await db.records.get(recordId);
  if (!record) return null;
  const product = await db.products.get(record.productId);
  if (!product) return null;
  const photos = await getPhotosByRecordId(recordId);
  return { record, product, photos };
}

export async function getAllRecords() {
  const records = await db.records.orderBy('inspectedAt').reverse().limit(50).toArray();
  const result = [];
  for (const record of records) {
    const product = await db.products.get(record.productId);
    if (product) {
      const photos = await getPhotosByRecordId(record.id!);
      result.push({ record, product, photoCount: photos.length });
    }
  }
  return result;
}
