import { ENV } from '../../config/env.js';
import { DiscoveryEngine } from '../discovery/DiscoveryEngine.js';
import { ReminderScheduler } from '../reminders/ReminderScheduler.js';

export class JobScheduler {
  private static discoveryEngine = new DiscoveryEngine();
  private static timers: NodeJS.Timeout[] = [];
  private static isDiscoveryRunning = false;
  private static isReminderRunning = false;

  static startAllJobs(): void {
    console.log('[JobScheduler] Initializing automated background schedules...');

    // 1. Hackathons discovery interval
    const hackathonIntervalMs = ENV.DISCOVERY_INTERVAL_HACKATHONS_MINUTES * 60 * 1000;
    const hackathonTimer = setInterval(async () => {
      await this.safeRunDiscovery('hackathon');
    }, hackathonIntervalMs);
    this.timers.push(hackathonTimer);

    // 2. Rated contests discovery interval
    const contestIntervalMs = ENV.DISCOVERY_INTERVAL_CONTESTS_MINUTES * 60 * 1000;
    const contestTimer = setInterval(async () => {
      await this.safeRunDiscovery('contest');
    }, contestIntervalMs);
    this.timers.push(contestTimer);

    // 3. Reminder monitor (hourly)
    const reminderIntervalMs = ENV.REMINDERS_INTERVAL_MINUTES * 60 * 1000;
    const reminderTimer = setInterval(async () => {
      await this.safeRunReminders();
    }, reminderIntervalMs);
    this.timers.push(reminderTimer);

    console.log(
      `[JobScheduler] Scheduled: Hackathons (${ENV.DISCOVERY_INTERVAL_HACKATHONS_MINUTES}m), Contests (${ENV.DISCOVERY_INTERVAL_CONTESTS_MINUTES}m), Reminders (${ENV.REMINDERS_INTERVAL_MINUTES}m)`
    );
  }

  static stopAllJobs(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
    console.log('[JobScheduler] All automated schedules stopped.');
  }

  static async safeRunDiscovery(categoryFilter?: 'hackathon' | 'contest'): Promise<void> {
    if (this.isDiscoveryRunning) {
      console.log('[JobScheduler] Discovery job already running. Skipping overlap.');
      return;
    }
    this.isDiscoveryRunning = true;
    try {
      console.log(`[JobScheduler] Starting scheduled discovery (${categoryFilter || 'all'})...`);
      const summary = await this.discoveryEngine.runDiscovery();
      console.log(
        `[JobScheduler] Scheduled discovery completed: found=${summary.totalFound}, created=${summary.totalCreated}, updated=${summary.totalUpdated}, duration=${summary.durationMs}ms`
      );
    } catch (err) {
      console.error('[JobScheduler] Error during scheduled discovery:', err);
    } finally {
      this.isDiscoveryRunning = false;
    }
  }

  static async safeRunReminders(): Promise<void> {
    if (this.isReminderRunning) return;
    this.isReminderRunning = true;
    try {
      const res = await ReminderScheduler.processDueReminders();
      if (res.processedCount > 0) {
        console.log(`[JobScheduler] Processed ${res.processedCount} due reminders.`);
      }
    } catch (err) {
      console.error('[JobScheduler] Error processing due reminders:', err);
    } finally {
      this.isReminderRunning = false;
    }
  }
}
