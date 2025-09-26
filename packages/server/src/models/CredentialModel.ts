import { getCredentialsCollection, Credential } from '@/db/index.js';

export class CredentialModel {
  private credentials = getCredentialsCollection();

  async createCredential(credentialData: Omit<Credential, '_id'>): Promise<Credential> {
    const credential: Credential = {
      ...credentialData,
      createdAt: new Date(),
      useCount: 0
    };

    await this.credentials.insertOne(credential);
    return credential;
  }

  async findById(id: string): Promise<Credential | null> {
    return await this.credentials.findOne({ id });
  }

  async findByUserId(userId: string): Promise<Credential[]> {
    return await this.credentials.find({ userId }).toArray();
  }

  async updateCredential(id: string, updates: Partial<Credential>): Promise<boolean> {
    const result = await this.credentials.updateOne(
      { id },
      { $set: updates }
    );
    return result.modifiedCount > 0;
  }

  async updateCounter(id: string, newCounter: number): Promise<boolean> {
    const result = await this.credentials.updateOne(
      { id },
      { 
        $set: { 
          counter: newCounter,
          lastUsedAt: new Date()
        },
        $inc: { useCount: 1 }
      }
    );
    return result.modifiedCount > 0;
  }

  async getCredentialStats(): Promise<{
    totalCredentials: number;
    platformCredentials: number;
    crossPlatformCredentials: number;
    deviceTypeDistribution: Record<string, number>;
  }> {
    const [total, stats] = await Promise.all([
      this.credentials.countDocuments({}),
      this.credentials.aggregate([
        {
          $group: {
            _id: '$deviceType',
            count: { $sum: 1 }
          }
        }
      ]).toArray()
    ]);

    const deviceTypeDistribution: Record<string, number> = {};
    let platformCredentials = 0;
    let crossPlatformCredentials = 0;

    stats.forEach(stat => {
      const deviceType = stat['_id'] || 'unknown';
      const count = stat['count'];
      deviceTypeDistribution[deviceType] = count;
      
      if (deviceType === 'platform') {
        platformCredentials = count;
      } else if (deviceType === 'cross-platform') {
        crossPlatformCredentials = count;
      }
    });

    return {
      totalCredentials: total,
      platformCredentials,
      crossPlatformCredentials,
      deviceTypeDistribution
    };
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.credentials.deleteMany({ userId });
    return result.deletedCount || 0;
  }
}