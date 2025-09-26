import { getSecurityEventsCollection, SecurityEvent } from '@/db/index.js';
import { nanoid } from 'nanoid';

export class SecurityEventModel {
  private securityEvents = getSecurityEventsCollection();

  async logEvent(
    eventType: string,
    eventData?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: nanoid(),
      userId: userId || '',
      eventType,
      eventData: eventData || '',
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
      timestamp: new Date(),
      severity
    };

    await this.securityEvents.insertOne(event);
    return event;
  }

  async getEvents(
    page: number = 1,
    limit: number = 20,
    eventType?: string,
    severity?: string,
    userId?: string
  ): Promise<{ events: SecurityEvent[], total: number }> {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (eventType) filter.eventType = eventType;
    if (severity) filter.severity = severity;
    if (userId) filter.userId = userId;

    const [events, total] = await Promise.all([
      this.securityEvents
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ timestamp: -1 })
        .toArray(),
      this.securityEvents.countDocuments(filter)
    ]);

    return { events, total };
  }

  async getEventStats(): Promise<{
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
    recentEvents: number;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, recentEvents, severityStats, typeStats] = await Promise.all([
      this.securityEvents.countDocuments({}),
      this.securityEvents.countDocuments({ timestamp: { $gte: oneDayAgo } }),
      this.securityEvents.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      this.securityEvents.aggregate([
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 }
          }
        }
      ]).toArray()
    ]);

    const eventsBySeverity: Record<string, number> = {};
    const eventsByType: Record<string, number> = {};

    severityStats.forEach(stat => {
      eventsBySeverity[stat['_id'] || 'unknown'] = stat['count'];
    });

    typeStats.forEach(stat => {
      eventsByType[stat['_id'] || 'unknown'] = stat['count'];
    });

    return {
      totalEvents: total,
      eventsBySeverity,
      eventsByType,
      recentEvents
    };
  }

  async deleteOldEvents(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const result = await this.securityEvents.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    return result.deletedCount || 0;
  }
}