
import { MongoClient, Db, Collection } from 'mongodb';
import { getEnv } from '@/utils/env.js';

// MongoDB Document Interfaces
export interface User {
  _id?: string;
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  passkeyRegistrations: number;
  otpFallbackUsage: number;
  successfulAuthentications: number;
  failedAuthentications: number;
}

export interface Credential {
  _id?: string;
  id: string; // credential ID (base64url)
  userId: string;
  publicKey: Buffer;
  counter: number;
  deviceType?: 'platform' | 'cross-platform';
  backedUp?: boolean;
  transports?: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  nickname?: string;
  attestationObject?: Buffer;
  clientDataJSON?: string;
  useCount: number;
}

export interface Challenge {
  _id?: string;
  id: string;
  userId?: string;
  challenge: string;
  type: 'registration' | 'authentication';
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

export interface SecurityEvent {
  _id?: string;
  id: string;
  userId?: string;
  eventType: string;
  eventData?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function initializeDatabase(): Promise<Db> {
  if (db) return db;
  
  const env = getEnv();
  
  try {
    client = new MongoClient(env.MONGODB_URL);
    await client.connect();
    
    db = client.db(env.DATABASE_NAME);
    
    // Create indexes for better performance
    await createIndexes();
    
    console.log('✅ Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
}

async function createIndexes() {
  if (!db) return;
  
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    // Email may be optional, enforce uniqueness when present
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    
    // Credentials collection indexes
    await db.collection('credentials').createIndex({ id: 1 }, { unique: true });
    await db.collection('credentials').createIndex({ userId: 1 });
    
    // Challenges collection indexes
    await db.collection('challenges').createIndex({ id: 1 }, { unique: true });
    await db.collection('challenges').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    // Security events collection indexes
    await db.collection('securityEvents').createIndex({ timestamp: -1 });
    await db.collection('securityEvents').createIndex({ userId: 1 });
    await db.collection('securityEvents').createIndex({ eventType: 1 });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ Failed to create indexes:', error);
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// Collection helpers for MVC pattern
export function getUsersCollection(): Collection<User> {
  return getDatabase().collection<User>('users');
}

export function getCredentialsCollection(): Collection<Credential> {
  return getDatabase().collection<Credential>('credentials');
}

export function getChallengesCollection(): Collection<Challenge> {
  return getDatabase().collection<Challenge>('challenges');
}

export function getSecurityEventsCollection(): Collection<SecurityEvent> {
  return getDatabase().collection<SecurityEvent>('securityEvents');
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ MongoDB connection closed');
  }
}