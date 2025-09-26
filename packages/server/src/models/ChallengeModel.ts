import { getChallengesCollection, Challenge } from '@/db/index.js';
import { nanoid } from 'nanoid';

export class ChallengeModel {
  private challenges = getChallengesCollection();

  async createChallenge(
    challenge: string,
    type: 'registration' | 'authentication',
    userId?: string,
    expirationMinutes: number = 5
  ): Promise<Challenge> {
    const challengeDoc: Challenge = {
      id: nanoid(),
      userId: userId || '',
      challenge,
      type,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
      used: false
    };

    await this.challenges.insertOne(challengeDoc);
    return challengeDoc;
  }

  async findValidChallenge(
    type: 'registration' | 'authentication',
    userId?: string
  ): Promise<Challenge | null> {
    const query: any = {
      type,
      used: false,
      expiresAt: { $gt: new Date() }
    };

    if (userId) {
      query.userId = userId;
    }

    return await this.challenges.findOne(query, { sort: { createdAt: -1 } });
  }

  async markChallengeAsUsed(id: string): Promise<boolean> {
    const result = await this.challenges.updateOne(
      { id },
      { $set: { used: true } }
    );
    return result.modifiedCount > 0;
  }

  async cleanupExpiredChallenges(): Promise<number> {
    const result = await this.challenges.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount || 0;
  }

  async getChallengeStats(): Promise<{
    totalChallenges: number;
    activeChallenges: number;
    expiredChallenges: number;
    usedChallenges: number;
  }> {
    const now = new Date();
    const [total, active, expired, used] = await Promise.all([
      this.challenges.countDocuments({}),
      this.challenges.countDocuments({ used: false, expiresAt: { $gt: now } }),
      this.challenges.countDocuments({ expiresAt: { $lt: now } }),
      this.challenges.countDocuments({ used: true })
    ]);

    return {
      totalChallenges: total,
      activeChallenges: active,
      expiredChallenges: expired,
      usedChallenges: used
    };
  }
}