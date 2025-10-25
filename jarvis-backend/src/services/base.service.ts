import { db, FieldValue, Timestamp } from '../config';
import { BaseEntity } from '../types';
import { DocumentData, QuerySnapshot, DocumentSnapshot } from 'firebase-admin/firestore';

/**
 * Base Service Class
 * Provides common CRUD operations for all entities
 */
export abstract class BaseService<T extends BaseEntity> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Get collection reference
   */
  protected getCollection() {
    return db.collection(this.collectionName);
  }

  /**
   * Convert Firestore document to entity
   */
  protected documentToEntity(doc: DocumentSnapshot): T | null {
    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as DocumentData;
    return {
      id: doc.id,
      ...data,
    } as T;
  }

  /**
   * Convert query snapshot to array of entities
   */
  protected snapshotToEntities(snapshot: QuerySnapshot): T[] {
    return snapshot.docs.map(doc => this.documentToEntity(doc)).filter(Boolean) as T[];
  }

  /**
   * Create a new document
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> {
    const now = Timestamp.now();
    const docData = {
      ...data,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const docRef = await this.getCollection().add(docData);
    return docRef.id;
  }

  /**
   * Get a document by ID
   */
  async getById(id: string): Promise<T | null> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error(`Invalid document ID for collection ${this.collectionName}:`, id);
      throw new Error(`Invalid document ID for collection ${this.collectionName}: ID must be a non-empty string`);
    }
    const doc = await this.getCollection().doc(id).get();
    return this.documentToEntity(doc);
  }

  /**
   * Update a document
   */
  async update(id: string, data: Partial<T>, userId: string): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    };

    await this.getCollection().doc(id).update(updateData);
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    await this.getCollection().doc(id).delete();
  }

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
    const doc = await this.getCollection().doc(id).get();
    return doc.exists;
  }

  /**
   * Get all documents in collection
   */
  async getAll(): Promise<T[]> {
    const snapshot = await this.getCollection().get();
    return this.snapshotToEntities(snapshot);
  }

  /**
   * Get documents by field value
   */
  async getByField(field: string, value: any): Promise<T[]> {
    const snapshot = await this.getCollection().where(field, '==', value).get();
    return this.snapshotToEntities(snapshot);
  }

  /**
   * Get documents where array contains value (for child-knows-parent queries)
   */
  async getByArrayContains(field: string, value: any): Promise<T[]> {
    const snapshot = await this.getCollection()
      .where(field, 'array-contains', value)
      .get();
    return this.snapshotToEntities(snapshot);
  }

  /**
   * Add item to array field (atomic operation)
   */
  async addToArray(id: string, field: string, value: any, userId: string): Promise<void> {
    await this.getCollection().doc(id).update({
      [field]: FieldValue.arrayUnion(value),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  }

  /**
   * Remove item from array field (atomic operation)
   */
  async removeFromArray(id: string, field: string, value: any, userId: string): Promise<void> {
    await this.getCollection().doc(id).update({
      [field]: FieldValue.arrayRemove(value),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  }

  /**
   * Batch get documents by IDs
   */
  async getBatchByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];

    const docs = await Promise.all(
      ids.map(id => this.getCollection().doc(id).get())
    );

    return docs
      .map(doc => this.documentToEntity(doc))
      .filter(Boolean) as T[];
  }
}