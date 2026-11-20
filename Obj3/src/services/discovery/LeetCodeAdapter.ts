import {
  IntegrationStatus,
  NormalizedDiscoveredEvent,
  PlatformType,
} from '../../models/types.js';
import { SourceAdapter, SourceFetchResult } from './SourceAdapter.js';

interface LeetCodeContestItem {
  title: string;
  titleSlug: string;
  startTime: number;
  duration: number;
  originStartTime: number;
  isVirtual: boolean;
}

export class LeetCodeAdapter extends SourceAdapter {
  readonly sourceId = 'src-leetcode';
  readonly platform: PlatformType = 'LeetCode';
  readonly sourceType = 'contest' as const;
  readonly fetchingMethod = 'Official Public Contest Feed Extraction & Mentor Manual Fallback';

  async getCapabilityStatus(): Promise<IntegrationStatus> {
    return 'Active';
  }

  async fetchEvents(): Promise<SourceFetchResult> {
    const startTime = Date.now();
    try {
      const query = `
        query upcomingContests {
          topTwoContests {
            title
            titleSlug
            startTime
            duration
            cardImg
          }
        }
      `;

      const response = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EliteTrack-DiscoveryEngine/1.0 (College Placement Hub; contact: mentor@college.edu)',
        },
        body: JSON.stringify({ query }),
        signal: this.createTimeoutSignal(8000),
      });

      if (!response.ok) {
        throw new Error(`LeetCode GraphQL returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as any;
      const contests: LeetCodeContestItem[] = data.data?.topTwoContests || [];

      const events: NormalizedDiscoveredEvent[] = contests.map((c) => {
        const startIso = new Date(c.startTime * 1000).toISOString();
        const endIso = new Date((c.startTime + c.duration) * 1000).toISOString();
        const durationMins = Math.round(c.duration / 60);
        const contestUrl = `https://leetcode.com/contest/${c.titleSlug}`;
        const matchEdition = c.title.match(/\d+/);
        const edition = matchEdition ? matchEdition[0] : 'Current';

        return {
          externalId: `lc-${c.titleSlug}`,
          title: `LeetCode ${c.title}`,
          edition,
          organizer: 'LeetCode',
          company: 'LeetCode',
          sponsors: ['LeetCode'],
          category: 'Contest',
          opportunityType: 'Competitive Programming',
          platform: 'LeetCode',
          sourceUrl: contestUrl,
          registrationUrl: contestUrl,
          officialEventUrl: contestUrl,
          sourceListingUrl: 'https://leetcode.com/contest',
          registrationOpenDate: new Date().toISOString(),
          description: `Official 90-minute algorithmic competition: 4 questions (Easy, 2 Medium, Hard). Standard rating penalty for wrong submissions.`,
          eligibility: 'Open to all students globally. Free registration on LeetCode.',
          prizeOrPerk: 'LeetCode Rating Update, Guardian/Knight Badge Track, LeetCode Coins',
          eventStart: startIso,
          eventEnd: endIso,
          registrationDeadline: startIso,
          timezone: 'Asia/Kolkata',
          eventMode: 'online',
          contestRatingType: 'Rated',
          tags: ['LeetCode', 'Weekly Contest', 'Rated', 'DSA', 'Interview Prep'],
          rawData: { slug: c.titleSlug, durationMins },
        };
      });

      if (events.length === 0) {
        throw new Error('No upcoming LeetCode contests in response');
      }

      return {
        sourceId: this.sourceId,
        platform: this.platform,
        status: 'success',
        events,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      console.warn(`[LeetCodeAdapter] Live fetch fallback: ${err.message}. Providing scheduled Weekly & Biweekly Contests.`);

      // Compute next Sunday 08:00 AM IST for Weekly Contest
      const now = new Date();
      const nextSunday = new Date(now);
      const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
      nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
      nextSunday.setUTCHours(2, 30, 0, 0); // 08:00 AM IST = 02:30 UTC

      // Compute next Saturday 08:00 PM IST for Biweekly Contest
      const nextSaturday = new Date(now);
      const daysUntilSaturday = (6 - now.getUTCDay() + 7) % 7 || 7;
      nextSaturday.setUTCDate(now.getUTCDate() + daysUntilSaturday);
      nextSaturday.setUTCHours(14, 30, 0, 0); // 08:00 PM IST = 14:30 UTC

      const fallbackEvents: NormalizedDiscoveredEvent[] = [
        {
          externalId: 'lc-biweekly-contest-196',
          title: 'LeetCode Biweekly Contest 196',
          edition: '196',
          organizer: 'LeetCode',
          company: 'LeetCode',
          sponsors: ['LeetCode'],
          category: 'Contest',
          opportunityType: 'Competitive Programming',
          platform: 'LeetCode',
          sourceUrl: 'https://leetcode.com/contest/biweekly-contest-196',
          registrationUrl: 'https://leetcode.com/contest/biweekly-contest-196',
          officialEventUrl: 'https://leetcode.com/contest/biweekly-contest-196',
          sourceListingUrl: 'https://leetcode.com/contest',
          registrationOpenDate: new Date(now.getTime() - 86400000).toISOString(),
          description: 'Official biweekly 90-minute competitive programming contest: 4 algorithmic challenges (Easy, Medium, Medium, Hard). Standard rating penalty for wrong submissions.',
          eligibility: 'Open to all students globally. Free registration on LeetCode.',
          prizeOrPerk: 'Contest Rating Boost & LeetCoins for merchandise',
          eventStart: nextSaturday.toISOString(),
          eventEnd: new Date(nextSaturday.getTime() + 90 * 60000).toISOString(),
          registrationDeadline: nextSaturday.toISOString(),
          timezone: 'Asia/Kolkata',
          eventMode: 'online',
          contestRatingType: 'Rated',
          tags: ['LeetCode', 'Biweekly Contest', 'Rated', 'Knight Track'],
          rawData: { slug: 'biweekly-contest-196', durationMins: 90 },
        },
        {
          externalId: 'lc-weekly-contest-529',
          title: 'LeetCode Weekly Contest 529',
          edition: '529',
          organizer: 'LeetCode',
          company: 'LeetCode',
          sponsors: ['LeetCode'],
          category: 'Contest',
          opportunityType: 'Competitive Programming',
          platform: 'LeetCode',
          sourceUrl: 'https://leetcode.com/contest/weekly-contest-529',
          registrationUrl: 'https://leetcode.com/contest/weekly-contest-529',
          officialEventUrl: 'https://leetcode.com/contest/weekly-contest-529',
          sourceListingUrl: 'https://leetcode.com/contest',
          registrationOpenDate: new Date(now.getTime() - 86400000).toISOString(),
          description: 'Official 90-minute algorithmic competition: 4 questions (Easy, 2 Medium, Hard). Standard rating penalty for wrong submissions.',
          eligibility: 'Open to all batch students. High contest ratings directly boost Google, Amazon, and Uber recruiter outreach.',
          prizeOrPerk: 'Knight/Guardian Badge progress + LeetCode Global Rating',
          eventStart: nextSunday.toISOString(),
          eventEnd: new Date(nextSunday.getTime() + 90 * 60000).toISOString(),
          registrationDeadline: nextSunday.toISOString(),
          timezone: 'Asia/Kolkata',
          eventMode: 'online',
          contestRatingType: 'Rated',
          tags: ['LeetCode', 'Weekly Contest', 'Rated', 'DSA', 'Interview Prep'],
          rawData: { slug: 'weekly-contest-529', durationMins: 90 },
        },
      ];

      return {
        sourceId: this.sourceId,
        platform: this.platform,
        status: 'partial',
        events: fallbackEvents,
        error: err.message,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
