import { getUsersCollection, User } from '@/db/index.js';
import { nanoid } from 'nanoid';

export class UserModel {
  private users = getUsersCollection();

  async createUser(username: string, displayName?: string, email?: string): Promise<User> {
    const user: User = {
      id: nanoid(),
      username,
      displayName: displayName || username,
      createdAt: new Date(),
      isActive: true,
      passkeyRegistrations: 0,
      otpFallbackUsage: 0,
      successfulAuthentications: 0,
      failedAuthentications: 0
    };
    // With exactOptionalPropertyTypes enabled, don't assign undefined optional props
    if (email) {
      user.email = email;
    }

    await this.users.insertOne(user);
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.users.findOne({ username });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.users.findOne({ email });
  }

  async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    // Treat as email if it contains '@'
    if (identifier.includes('@')) {
      return await this.findByEmail(identifier);
    }
    return await this.findByUsername(identifier);
  }

  async findById(id: string): Promise<User | null> {
    return await this.users.findOne({ id });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<boolean> {
    const result = await this.users.updateOne(
      { id },
      { $set: updates }
    );
    return result.modifiedCount > 0;
  }

  async incrementPasskeyRegistrations(id: string): Promise<boolean> {
    const result = await this.users.updateOne(
      { id },
      { $inc: { passkeyRegistrations: 1 } }
    );
    return result.modifiedCount > 0;
  }

  async incrementSuccessfulAuthentications(id: string): Promise<boolean> {
    const result = await this.users.updateOne(
      { id },
      { 
        $inc: { successfulAuthentications: 1 },
        $set: { lastLoginAt: new Date() }
      }
    );
    return result.modifiedCount > 0;
  }

  async incrementFailedAuthentications(id: string): Promise<boolean> {
    const result = await this.users.updateOne(
      { id },
      { $inc: { failedAuthentications: 1 } }
    );
    return result.modifiedCount > 0;
  }

  async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[], total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.users.find({}).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray(),
      this.users.countDocuments({})
    ]);
    return { users, total };
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalPasskeyRegistrations: number;
    totalOtpFallback: number;
  }> {
    const [totalUsers, activeUsers, passkeyStats] = await Promise.all([
      this.users.countDocuments({}),
      this.users.countDocuments({ isActive: true }),
      this.users.aggregate([
        {
          $group: {
            _id: null,
            totalPasskeyRegistrations: { $sum: '$passkeyRegistrations' },
            totalOtpFallback: { $sum: '$otpFallbackUsage' }
          }
        }
      ]).toArray()
    ]);

    const stats = passkeyStats[0] || { totalPasskeyRegistrations: 0, totalOtpFallback: 0 };

    return {
      totalUsers,
      activeUsers,
      totalPasskeyRegistrations: stats['totalPasskeyRegistrations'],
      totalOtpFallback: stats['totalOtpFallback']
    };
  }
}