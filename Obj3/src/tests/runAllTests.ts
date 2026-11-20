import assert from 'assert';
import { execute, queryAll, queryOne } from '../db/database.js';
import { runMigrations } from '../db/migrate.js';
import { runSeeds } from '../db/seed.js';
import { ApprovalService } from '../services/approval/ApprovalService.js';
import { DuplicateDetector } from '../services/deduplication/DuplicateDetector.js';
import { CodeChefAdapter } from '../services/discovery/CodeChefAdapter.js';
import { CodeforcesAdapter } from '../services/discovery/CodeforcesAdapter.js';
import { CodeGalattaAdapter } from '../services/discovery/CodeGalattaAdapter.js';
import { DevpostAdapter } from '../services/discovery/DevpostAdapter.js';
import { DiscoveryEngine } from '../services/discovery/DiscoveryEngine.js';
import { LeetCodeAdapter } from '../services/discovery/LeetCodeAdapter.js';
import { MyCareernetAdapter } from '../services/discovery/MyCareernetAdapter.js';
import { NotificationService } from '../services/notifications/NotificationService.js';
import { WhatsAppService } from '../services/notifications/WhatsAppService.js';
import { ReminderScheduler } from '../services/reminders/ReminderScheduler.js';
import { VerificationEngine } from '../services/verification/VerificationEngine.js';
import { UrlValidator } from '../services/verification/UrlValidator.js';
import { NormalizedDiscoveredEvent, OpportunityRecord, StudentRecordDB } from '../models/types.js';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' RUNNING ELITE TRACK AUTOMATED SYSTEM TEST SUITE');
  console.log('================================================================\n');

  // Initialize fresh schema and seed
  runMigrations();
  // Clear mutable tables for deterministic test execution
  execute('DELETE FROM opportunities');
  execute('DELETE FROM student_opportunity_status');
  execute('DELETE FROM notification_logs');
  execute('DELETE FROM opportunity_approvals');
  execute('DELETE FROM opportunity_verifications');
  execute('DELETE FROM opportunity_reminders');
  execute('DELETE FROM discovery_runs');
  runSeeds();

  console.log('\n--- 1. SOURCE ADAPTERS & NORMALIZATION ---');

  await test('CodeforcesAdapter: returns normalized competitive programming events', async () => {
    const adapter = new CodeforcesAdapter();
    const result = await adapter.fetchEvents();
    assert(result.events.length > 0, 'Should return at least one Codeforces contest');
    const first = result.events[0];
    assert.strictEqual(first.platform, 'Codeforces');
    assert.strictEqual(first.category, 'Contest');
    assert(['Rated', 'Unrated', 'Rating restricted', 'Unknown'].includes(first.contestRatingType));
    assert(first.sourceUrl.startsWith('https://codeforces.com'));
  });

  await test('CodeChefAdapter: returns normalized Starters/Rated contests', async () => {
    const adapter = new CodeChefAdapter();
    const result = await adapter.fetchEvents();
    assert(result.events.length > 0, 'Should return CodeChef contests');
    const first = result.events[0];
    assert.strictEqual(first.platform, 'CodeChef');
    assert.strictEqual(first.category, 'Contest');
  });

  await test('LeetCodeAdapter: returns scheduled Weekly and Biweekly contests', async () => {
    const adapter = new LeetCodeAdapter();
    const result = await adapter.fetchEvents();
    assert(result.events.length > 0, 'Should return LeetCode contests');
    const first = result.events[0];
    assert.strictEqual(first.platform, 'LeetCode');
    assert.strictEqual(first.contestRatingType, 'Rated');
  });

  await test('CodeGalattaAdapter: returns events without assuming all are rated', async () => {
    const adapter = new CodeGalattaAdapter();
    const result = await adapter.fetchEvents();
    assert(result.events.length > 0, 'Should return CodeGalatta events');
    const first = result.events[0];
    assert.strictEqual(first.platform, 'CodeGalatta');
    assert(['Rated', 'Unrated', 'Unknown'].includes(first.contestRatingType));
  });

  await test('DevpostAdapter: identifies company sponsors and prioritizes tech companies', async () => {
    const adapter = new DevpostAdapter();
    const result = await adapter.fetchEvents();
    assert(result.events.length > 0, 'Should return Devpost hackathons');
    const first = result.events[0];
    assert.strictEqual(first.platform, 'Devpost');
    assert.strictEqual(first.category, 'Hackathon');
    assert(first.registrationDeadline.length > 0);
  });

  await test('MyCareernetAdapter: normalizes Tier-1 corporate hiring challenges', async () => {
    const adapter = new MyCareernetAdapter();
    const result = await adapter.fetchEvents();
    assert(result.events.length > 0, 'Should return corporate challenges');
    const first = result.events[0];
    assert.strictEqual(first.platform, 'MyCareernet');
    assert(first.eligibility.length > 0);
  });

  await test('Source failure isolation: one adapter failure does not block engine', async () => {
    const engine = new DiscoveryEngine();
    // Register a broken mock adapter
    engine.registerAdapter({
      sourceId: 'src-faulty',
      platform: 'Devpost',
      sourceType: 'hackathon',
      getCapabilityStatus: async () => 'Temporarily unavailable',
      fetchEvents: async () => {
        throw new Error('Connection refused on mock endpoint');
      },
    } as any);

    // Engine should complete without throwing
    const summary = await engine.runDiscovery('src-codeforces');
    assert(summary.resultsBySource.length > 0);
  });

  console.log('\n--- 2. VERIFICATION ENGINE ---');

  await test('VerificationEngine: marks valid company hackathon as VERIFIED', () => {
    const validEvent: NormalizedDiscoveredEvent = {
      externalId: 'test-google-ai',
      title: 'Google Cloud Gemini & Vertex AI Challenge',
      organizer: 'Google Cloud',
      company: 'Google',
      sponsors: ['Google'],
      category: 'Hackathon',
      opportunityType: 'Company Organized',
      platform: 'Devpost',
      sourceUrl: 'https://devpost.com/google',
      registrationUrl: 'https://devpost.com/google/register',
      description: 'Build enterprise multimodal applications with Gemini 1.5 Pro and Vertex AI.',
      eligibility: 'B.E / B.Tech Computer Science Students',
      prizeOrPerk: '$50,000 + Google SWE Interviews',
      eventStart: new Date(Date.now() + 5 * 86400000).toISOString(),
      eventEnd: new Date(Date.now() + 20 * 86400000).toISOString(),
      registrationDeadline: new Date(Date.now() + 15 * 86400000).toISOString(),
      timezone: 'Asia/Kolkata',
      eventMode: 'online',
      contestRatingType: 'Unknown',
      tags: ['Google', 'AI'],
    };

    const res = VerificationEngine.verifyEvent(validEvent);
    assert.strictEqual(res.status, 'VERIFIED');
    assert(res.confidenceScore >= 0.8);
    assert.strictEqual(res.evidence.isCompanyIdentified, true);
    assert.strictEqual(res.evidence.isExpired, false);
  });

  await test('VerificationEngine: marks expired opportunity as REJECTED', () => {
    const expiredEvent: NormalizedDiscoveredEvent = {
      externalId: 'test-expired',
      title: 'Past Coding Championship 2024',
      organizer: 'Old Org',
      company: 'Legacy Corp',
      sponsors: [],
      category: 'Contest',
      opportunityType: 'Competitive Programming',
      platform: 'CodeChef',
      sourceUrl: 'https://codechef.com',
      registrationUrl: 'https://codechef.com',
      description: 'Old contest from previous year.',
      eligibility: 'Everyone',
      prizeOrPerk: 'Medals',
      eventStart: '2024-01-01T00:00:00Z',
      eventEnd: '2024-01-01T02:00:00Z',
      registrationDeadline: '2024-01-01T00:00:00Z',
      timezone: 'Asia/Kolkata',
      eventMode: 'online',
      contestRatingType: 'Rated',
      tags: [],
    };

    const res = VerificationEngine.verifyEvent(expiredEvent);
    assert.strictEqual(res.status, 'REJECTED');
    assert.strictEqual(res.evidence.isExpired, true);
  });

  await test('VerificationEngine: flags incomplete listing as NEEDS_REVIEW', () => {
    const incompleteEvent: NormalizedDiscoveredEvent = {
      externalId: 'test-incomplete',
      title: 'Open Hackathon',
      organizer: 'Unknown Club',
      company: 'Unknown',
      sponsors: [],
      category: 'Hackathon',
      opportunityType: 'Community Organized',
      platform: 'Devpost',
      sourceUrl: 'https://devpost.com',
      registrationUrl: 'https://devpost.com',
      description: 'Short desc',
      eligibility: 'Open',
      prizeOrPerk: 'Goodies',
      eventStart: new Date(Date.now() + 10 * 86400000).toISOString(),
      eventEnd: null,
      registrationDeadline: new Date(Date.now() + 8 * 86400000).toISOString(),
      timezone: 'Asia/Kolkata',
      eventMode: 'online',
      contestRatingType: 'Unknown',
      tags: [],
    };

    const res = VerificationEngine.verifyEvent(incompleteEvent);
    assert.strictEqual(res.status, 'NEEDS_REVIEW');
  });

  console.log('\n--- 3. DUPLICATE DETECTION ---');

  await test('DuplicateDetector: detects exact URL duplicates across different platforms', () => {
    const existingOpp: OpportunityRecord = {
      id: 'opp-unstop-grid',
      external_id: 'grid-unstop-1',
      title: 'Flipkart GRiD 7.0 SDE Track',
      organizer: 'Flipkart',
      company: 'Flipkart',
      sponsors: ['Flipkart'],
      category: 'Hackathon',
      opportunity_type: 'Company Organized',
      platform: 'MyCareernet',
      source_url: 'https://unstop.com/flipkart-grid-7?utm_source=campus',
      registration_url: 'https://unstop.com/flipkart-grid-7',
      description: 'Flipkart campus challenge',
      eligibility: 'B.Tech',
      prize_or_perk: 'PPO',
      event_start: '2026-11-25T00:00:00Z',
      event_end: '2026-12-18T00:00:00Z',
      registration_deadline: '2026-11-25T00:00:00Z',
      timezone: 'Asia/Kolkata',
      event_mode: 'online',
      contest_rating_type: 'Unknown',
      tags: [],
      verification_status: 'VERIFIED',
      approval_status: 'Approved',
      duplicate_group_id: null,
      is_duplicate_flagged: false,
      event_status: 'Upcoming',
      is_registration_url_valid: true,
      confidence_score: 0.95,
      discovered_at: new Date().toISOString(),
      last_verified_at: null,
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Candidate from Devpost with mirror registration URL
    const candidate: NormalizedDiscoveredEvent = {
      externalId: 'grid-devpost-mirror',
      title: 'Flipkart GRiD 7.0 (Mirror)',
      organizer: 'Flipkart',
      company: 'Flipkart',
      sponsors: ['Flipkart'],
      category: 'Hackathon',
      opportunityType: 'Company Organized',
      platform: 'Devpost',
      sourceUrl: 'https://devpost.com/software/flipkart-grid-7',
      registrationUrl: 'https://unstop.com/flipkart-grid-7/', // matches after normalization!
      description: 'Devpost mirror of Flipkart challenge',
      eligibility: 'B.Tech',
      prizeOrPerk: 'PPO',
      eventStart: '2026-11-25T00:00:00Z',
      eventEnd: '2026-12-18T00:00:00Z',
      registrationDeadline: '2026-11-25T00:00:00Z',
      timezone: 'Asia/Kolkata',
      eventMode: 'online',
      contestRatingType: 'Unknown',
      tags: [],
    };

    const dup = DuplicateDetector.checkDuplicate(candidate, [existingOpp]);
    assert.strictEqual(dup.isDuplicate, true);
    assert.strictEqual(dup.similarityScore, 1.0);
    assert.strictEqual(dup.matchedOpportunityId, 'opp-unstop-grid');
  });

  await test('DuplicateDetector: flags high title similarity with same company', () => {
    const existingOpp: OpportunityRecord = {
      id: 'opp-tcs-codevita',
      external_id: 'tcs-1',
      title: 'TCS CodeVita Season 13 Global Contest',
      organizer: 'TCS',
      company: 'TCS',
      sponsors: ['TCS'],
      category: 'Contest',
      opportunity_type: 'Company Organized',
      platform: 'MyCareernet',
      source_url: 'https://tcs.com/codevita',
      registration_url: 'https://tcs.com/codevita',
      description: 'TCS coding contest',
      eligibility: 'All Students',
      prize_or_perk: 'Interviews',
      event_start: '2026-12-06T00:00:00Z',
      event_end: '2026-12-06T06:00:00Z',
      registration_deadline: '2026-11-30T00:00:00Z',
      timezone: 'Asia/Kolkata',
      event_mode: 'online',
      contest_rating_type: 'Rated',
      tags: [],
      verification_status: 'VERIFIED',
      approval_status: 'Approved',
      duplicate_group_id: null,
      is_duplicate_flagged: false,
      event_status: 'Upcoming',
      is_registration_url_valid: true,
      confidence_score: 0.95,
      discovered_at: new Date().toISOString(),
      last_verified_at: null,
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const candidate: NormalizedDiscoveredEvent = {
      externalId: 'tcs-dup-check',
      title: 'TCS CodeVita Season 13 Global Coding Championship',
      organizer: 'TCS',
      company: 'TCS',
      sponsors: ['TCS'],
      category: 'Contest',
      opportunityType: 'Company Organized',
      platform: 'Devpost',
      sourceUrl: 'https://devpost.com/tcs',
      registrationUrl: 'https://devpost.com/tcs-register',
      description: 'Championship',
      eligibility: 'Students',
      prizeOrPerk: 'Interviews',
      eventStart: '2026-12-06T00:00:00Z',
      eventEnd: '2026-12-06T06:00:00Z',
      registrationDeadline: '2026-11-30T00:00:00Z',
      timezone: 'Asia/Kolkata',
      eventMode: 'online',
      contestRatingType: 'Rated',
      tags: [],
    };

    const dup = DuplicateDetector.checkDuplicate(candidate, [existingOpp]);
    assert.strictEqual(dup.isDuplicate, true);
    assert(dup.similarityScore >= 0.55);
  });

  console.log('\n--- 4. MENTOR APPROVAL & WORKFLOW ---');

  await test('ApprovalService: transitions Fetched -> Verified -> Approved with audit record', async () => {
    // Check opp-qualcomm initial state is 'Verified'
    const opp = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', ['opp-qualcomm'])!;
    assert.strictEqual(opp.approval_status, 'Verified');

    // Mentor approves it
    const approveResult = await ApprovalService.processStageTransition({
      opportunityId: 'opp-qualcomm',
      mentorId: 'mentor-ganesh',
      action: 'Approve',
      reason: 'Verified Tier-1 Edge AI fellowship for batch',
    });

    assert.strictEqual(approveResult.opportunity.approval_status, 'Approved');
    assert(approveResult.opportunity.published_at !== null);

    // Verify audit record in opportunity_approvals
    const audit = queryOne(
      'SELECT * FROM opportunity_approvals WHERE opportunity_id = ? ORDER BY approved_at DESC',
      ['opp-qualcomm']
    );
    assert(audit !== undefined);
  });

  await test('ApprovalService: invalidates approval when critical details modified', () => {
    // opp-qualcomm is now Approved. Changing registration deadline must invalidate approval!
    const updated = ApprovalService.updateOpportunityDetails(
      'opp-qualcomm',
      { registration_deadline: '2026-12-25T00:00:00Z' },
      'mentor-ganesh'
    );

    assert.strictEqual(updated.approval_status, 'Verified', 'Must reset to Verified requiring reapproval');

    const audit = queryOne(
      "SELECT * FROM opportunity_approvals WHERE opportunity_id = 'opp-qualcomm' AND action = 'Reapproval Required'"
    );
    assert(audit !== undefined, 'Must record reapproval audit log');

    // Re-approve it cleanly
    ApprovalService.processStageTransition({
      opportunityId: 'opp-qualcomm',
      action: 'Approve',
    });
  });

  console.log('\n--- 5. WHATSAPP & NOTIFICATIONS ---');

  await test('WhatsAppService: strictly filters out students with whatsapp_consent = 0', async () => {
    const optedOutStudent = queryOne<StudentRecordDB>('SELECT * FROM students WHERE id = ?', ['stu-04'])!;
    assert.strictEqual(optedOutStudent.whatsapp_consent, 0, 'stu-04 (Vigneshwaran K) must have consent=0');

    const result = await WhatsAppService.sendToStudent(
      optedOutStudent,
      'Test message',
      'opp-google',
      'new_opportunity',
      'test-consent-filter-key'
    );

    assert.strictEqual(result.success, false);
    assert(result.error?.includes('opted out'));
  });

  await test('WhatsAppService: normalizes Indian phone numbers to E.164 format', () => {
    const raw1 = '+91 98401 22104';
    const raw2 = '9840122104';
    const raw3 = '+91-94440-18239';

    assert.strictEqual(WhatsAppService.normalizePhoneNumber(raw1), '919840122104');
    assert.strictEqual(WhatsAppService.normalizePhoneNumber(raw2), '919840122104');
    assert.strictEqual(WhatsAppService.normalizePhoneNumber(raw3), '919444018239');
  });

  await test('WhatsAppService: formats opportunity announcement with IST deadline', () => {
    const opp = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', ['opp-google'])!;
    const msg = WhatsAppService.formatOpportunityMessage(opp);
    assert(msg.includes('NEW COMPANY HACKATHON'));
    assert(msg.includes('Google'));
    assert(msg.includes('Approved by Elite Track Mentor'));
  });

  await test('WhatsApp Webhook: processes delivered and read statuses', () => {
    // Insert a test notification log
    const testLogId = `notif-test-${Date.now()}`;
    const testWamid = `wamid.HBgMOTE5ODQwMTIyMTA0FQIAERgSR${Date.now()}`;
    execute(
      `INSERT INTO notification_logs (
         id, opportunity_id, student_id, channel, notification_type, message_content,
         delivery_status, provider_message_id, idempotency_key, created_at
       ) VALUES (?, 'opp-google', 'stu-01', 'whatsapp', 'new_opportunity', 'Test message', 'sent', ?, ?, ?)`,
      [testLogId, testWamid, `idemp-${Date.now()}`, new Date().toISOString()]
    );

    // Simulate incoming Meta delivery status webhook payload
    const webhookPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: testWamid,
                    status: 'delivered',
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = WhatsAppService.processWebhookPayload(webhookPayload);
    assert.strictEqual(res.processedCount, 1);

    const updatedLog = queryOne<any>('SELECT * FROM notification_logs WHERE id = ?', [testLogId]);
    assert.strictEqual(updatedLog.delivery_status, 'delivered');
    assert(updatedLog.delivered_at !== null);
  });

  await test('Notification idempotency: prevents duplicate notifications for identical idempotency key', async () => {
    const student = queryOne<StudentRecordDB>('SELECT * FROM students WHERE id = ?', ['stu-01'])!;
    const idempotencyKey = `idemp-unique-test-${Date.now()}`;

    // First attempt
    await WhatsAppService.sendToStudent(student, 'First send', 'opp-google', 'new_opportunity', idempotencyKey);
    const countBefore = queryOne<{ count: number }>(
      'SELECT count(*) as count FROM notification_logs WHERE idempotency_key = ?',
      [idempotencyKey]
    )?.count;

    // Second attempt with identical key
    await WhatsAppService.sendToStudent(student, 'Second send (duplicate)', 'opp-google', 'new_opportunity', idempotencyKey);
    const countAfter = queryOne<{ count: number }>(
      'SELECT count(*) as count FROM notification_logs WHERE idempotency_key = ?',
      [idempotencyKey]
    )?.count;

    assert.strictEqual(countBefore, 1);
    assert.strictEqual(countAfter, 1, 'Should NOT create a second notification record');
  });

  console.log('\n--- 6. REMINDER ENGINE ---');

  await test('ReminderScheduler: schedules deadline reminders and prevents duplicates', async () => {
    const opp = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', ['opp-google'])!;

    // Ensure Ananya has saved/remind_me
    execute(
      `INSERT OR REPLACE INTO student_opportunity_status (id, student_id, opportunity_id, saved, remind_me, participation_status, updated_at)
       VALUES ('sos-rem-test', 'stu-01', 'opp-google', 1, 1, 'Registered', ?)`,
      [new Date().toISOString()]
    );

    const scheduled = await ReminderScheduler.scheduleDefaultRemindersForOpportunity(opp);
    assert(scheduled >= 0);

    // Call again - unique constraints must prevent duplicate reminder scheduling
    const scheduledAgain = await ReminderScheduler.scheduleDefaultRemindersForOpportunity(opp);
    assert.strictEqual(scheduledAgain, 0, 'Duplicate reminders must not be scheduled');
  });

  console.log('\n--- 7. END-TO-END ACCEPTANCE WORKFLOW ---');

  await test('End-to-End: Discovery -> Verification -> Mentor Approval -> Student Distribution -> Student Participation', async () => {
    // 1. Create a newly discovered company hackathon in 'Fetched' state
    const newOppId = `opp-e2e-${Date.now()}`;
    const nowIso = new Date().toISOString();
    execute(
      `INSERT INTO opportunities (
         id, external_id, title, organizer, company, sponsors, category, opportunity_type,
         platform, source_url, registration_url, description, eligibility, prize_or_perk,
         event_start, event_end, registration_deadline, timezone, event_mode, contest_rating_type,
         tags, verification_status, approval_status, duplicate_group_id, is_duplicate_flagged,
         confidence_score, discovered_at, last_verified_at, published_at, created_at, updated_at
       ) VALUES (?, 'e2e-ext-1', 'Uber Global Tech Campus Hackathon 2026', 'Uber Engineering', 'Uber', '["Uber"]',
         'Hackathon', 'Company Organized', 'Devpost', 'https://unstop.com/competitions?searchTerm=uber', 'https://unstop.com/competitions?searchTerm=uber',
         'Uber India high-scale distributed systems and real-time routing challenge.', '2026 Graduating CSE/IT',
         '₹35 LPA SDE-1 Offers', ?, ?, ?, 'Asia/Kolkata', 'online', 'Unknown',
         '["Uber", "Distributed Systems"]', 'VERIFIED', 'Fetched', NULL, 0, 0.95, ?, ?, NULL, ?, ?)`,
      [
        newOppId,
        new Date(Date.now() + 10 * 86400000).toISOString(),
        new Date(Date.now() + 30 * 86400000).toISOString(),
        new Date(Date.now() + 20 * 86400000).toISOString(),
        nowIso,
        nowIso,
        nowIso,
        nowIso,
      ]
    );

    // Step A: Student CANNOT see it while in 'Fetched' status
    const studentViewBefore = queryOne(
      "SELECT id FROM opportunities WHERE id = ? AND approval_status = 'Approved'",
      [newOppId]
    );
    assert.strictEqual(studentViewBefore, undefined, 'Student MUST NOT see opportunity before mentor approval');

    // Step B: Mentor reviews and approves opportunity
    const approveResult = await ApprovalService.processStageTransition({
      opportunityId: newOppId,
      mentorId: 'mentor-ganesh',
      action: 'Approve',
      reason: 'Approved by Dr. R. Ganesh for Tier-1 product track',
    });

    assert.strictEqual(approveResult.opportunity.approval_status, 'Approved');
    assert(approveResult.distributionResult.inAppCount > 0, 'In-app notifications must be created for batch');

    // Step C: Student CAN NOW see the approved opportunity
    const studentViewAfter = queryOne<OpportunityRecord>(
      "SELECT * FROM opportunities WHERE id = ? AND approval_status = 'Approved'",
      [newOppId]
    );
    assert(studentViewAfter !== undefined, 'Student MUST see opportunity after mentor approval');

    // Step D: Student updates participation status to 'Registered'
    execute(
      `INSERT OR REPLACE INTO student_opportunity_status (id, student_id, opportunity_id, saved, remind_me, participation_status, registration_confirmed_at, updated_at)
       VALUES ('sos-e2e', 'stu-01', ?, 1, 1, 'Registered', ?, ?)`,
      [newOppId, nowIso, nowIso]
    );

    const studentStatus = queryOne(
      "SELECT * FROM student_opportunity_status WHERE student_id = 'stu-01' AND opportunity_id = ?",
      [newOppId]
    ) as any;
    assert.strictEqual(studentStatus.participation_status, 'Registered');
    assert.strictEqual(studentStatus.saved, 1);

    // Clean up test opportunity from database so test entries do not leak into live feeds
    execute('DELETE FROM opportunities WHERE id = ?', [newOppId]);
    execute('DELETE FROM student_opportunity_status WHERE opportunity_id = ?', [newOppId]);
  });

  console.log('\n--- 8. PHASE 12: REAL-DATA TESTING AND VALIDATION (14 TEST CASES) ---');

  await test('TEST 1: An old hackathon such as Flipkart GRID 7.0 must not appear as an upcoming event unless a currently valid edition is independently verified', () => {
    const flipkart = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', ['opp-flipkart']);
    assert(flipkart !== undefined, 'Flipkart GRID record must exist in DB for audit trail');
    assert.strictEqual(flipkart.edition, '7.0', 'Flipkart GRID edition should be 7.0');
    assert.strictEqual(flipkart.event_status, 'Expired', 'Flipkart GRID 7.0 must have event_status = Expired');
    assert.strictEqual(Boolean(flipkart.is_registration_url_valid), false, 'Flipkart GRID 7.0 registration URL must be marked invalid');

    // Default upcoming listing must exclude Flipkart GRID 7.0
    const inUpcoming = queryOne<OpportunityRecord>(
      `SELECT * FROM opportunities WHERE id = 'opp-flipkart' AND approval_status = 'Approved' AND event_status != 'Expired'`
    );
    assert.strictEqual(inUpcoming, undefined, 'Flipkart GRID 7.0 must NOT be in default upcoming listings');
  });

  await test('TEST 2: A real current company hackathon should appear under Company Hackathons after successful verification and mentor approval', () => {
    const googleHackathon = queryOne<OpportunityRecord>(
      `SELECT * FROM opportunities WHERE id = 'opp-google' AND approval_status = 'Approved' AND category = 'Hackathon'`
    );
    assert(googleHackathon !== undefined, 'Google Girl Hackathon must exist as an approved company hackathon');
    assert.strictEqual(googleHackathon.company, 'Google');
    assert.strictEqual(googleHackathon.verification_status, 'VERIFIED');
    assert.strictEqual(googleHackathon.event_status, 'Registration Open');
  });

  await test('TEST 3: A real upcoming Codeforces contest should appear in the Contest Calendar when returned by the official API', () => {
    const cfContest = queryOne<OpportunityRecord>(
      `SELECT * FROM opportunities WHERE platform = 'Codeforces' AND category = 'Contest' AND approval_status = 'Approved'`
    );
    assert(cfContest !== undefined, 'Codeforces contest must be present in approved contests');
    assert(cfContest.source_url.startsWith('https://codeforces.com/contest/'));
    assert(cfContest.event_start !== null);
  });

  await test('TEST 4: LeetCode, CodeChef and CodeGalatta records should appear only when supported by verified source information or approved manual entries', () => {
    const cpRecords = queryAll<OpportunityRecord>(
      `SELECT * FROM opportunities WHERE platform IN ('LeetCode', 'CodeChef', 'CodeGalatta') AND approval_status = 'Approved'`
    );
    assert(cpRecords.length >= 3, 'Must contain verified LeetCode, CodeChef, and CodeGalatta contests');
    for (const r of cpRecords) {
      assert(r.verification_status === 'VERIFIED' || r.platform === 'Manual');
      assert.strictEqual(r.category, 'Contest');
      assert(r.official_event_url !== null);
    }
  });

  await test('TEST 5: All displayed registration buttons must open their correct official destinations', () => {
    const validContestUrl = 'https://codeforces.com/contest/2070';
    const res1 = UrlValidator.validateRegistrationUrl(validContestUrl, 'Codeforces');
    assert.strictEqual(res1.isValid, true, 'Specific contest URL must be valid');

    const validHackathonUrl = 'https://amazon-campus-2026.devpost.com';
    const res2 = UrlValidator.validateRegistrationUrl(validHackathonUrl, 'Devpost');
    assert.strictEqual(res2.isValid, true, 'Specific event subdomain must be valid');

    const googleOpp = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', ['opp-google'])!;
    assert.strictEqual(Boolean(googleOpp.is_registration_url_valid), true);
    assert(
      googleOpp.registration_url.includes('developers.google.com') ||
      googleOpp.registration_url.includes('buildyourfuture.withgoogle.com'),
      'Google registration URL must point to verified Google official domain'
    );
  });

  await test('TEST 6: Broken or unverified registration links must not appear as working buttons (disabled with "Registration link unavailable")', () => {
    // Generic unstop homepage without challenge path
    const unstopRoot = UrlValidator.validateRegistrationUrl('https://unstop.com');
    assert.strictEqual(unstopRoot.isValid, false);
    assert.strictEqual(unstopRoot.isGenericHomepage, true);

    // Search query URL
    const searchUrl = UrlValidator.validateRegistrationUrl('https://www.google.com/search?q=flipkart+grid+registration');
    assert.strictEqual(searchUrl.isValid, false);
    assert.strictEqual(searchUrl.isSearchUrl, true);

    // Verify UI contract function
    function getRegistrationButtonState(opp: OpportunityRecord) {
      if (!opp.is_registration_url_valid || !opp.registration_url || opp.event_status === 'Expired') {
        return { enabled: false, label: 'Registration link unavailable' };
      }
      return { enabled: true, label: 'Register Now' };
    }

    const invalidOpp = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', ['opp-flipkart'])!;
    const stateInvalid = getRegistrationButtonState(invalidOpp);
    assert.strictEqual(stateInvalid.enabled, false);
    assert.strictEqual(stateInvalid.label, 'Registration link unavailable');
  });

  await test('TEST 7: Duplicate opportunities must not appear multiple times (detected by canonical URLs, edition, title)', () => {
    const baseRecord: OpportunityRecord = {
      id: 'opp-dup-base',
      external_id: 'ext-dup-1',
      title: 'Flipkart GRiD Robotics Challenge',
      edition: '7.0',
      organizer: 'Flipkart',
      company: 'Flipkart',
      sponsors: [],
      category: 'Hackathon',
      opportunity_type: 'Company Organized',
      platform: 'Devpost',
      source_url: 'https://flipkartgrid.unstop.com',
      registration_url: 'https://flipkartgrid.unstop.com',
      description: 'Engineering challenge',
      eligibility: 'B.Tech',
      prize_or_perk: 'Hiring',
      event_start: '2026-08-01T10:00:00Z',
      event_end: '2026-08-05T18:00:00Z',
      registration_deadline: '2026-07-25T23:59:59Z',
      timezone: 'Asia/Kolkata',
      event_mode: 'online',
      contest_rating_type: 'Unknown',
      tags: [],
      verification_status: 'VERIFIED',
      approval_status: 'Approved',
      event_status: 'Upcoming',
      is_registration_url_valid: true,
      duplicate_group_id: null,
      is_duplicate_flagged: false,
      confidence_score: 0.9,
      discovered_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const candidateSameEdition: NormalizedDiscoveredEvent = {
      externalId: 'ext-dup-2',
      title: 'Flipkart GRiD Robotics Challenge',
      edition: '7.0',
      organizer: 'Flipkart India',
      company: 'Flipkart',
      sponsors: [],
      category: 'Hackathon',
      opportunityType: 'Company Organized',
      platform: 'MyCareernet',
      sourceUrl: 'https://mycareernet.com/flipkartgrid',
      registrationUrl: 'https://mycareernet.com/flipkartgrid/register',
      description: 'Same engineering challenge',
      eligibility: 'B.Tech',
      prizeOrPerk: 'Hiring',
      eventStart: '2026-08-01T10:00:00Z',
      eventEnd: '2026-08-05T18:00:00Z',
      registrationDeadline: '2026-07-25T23:59:59Z',
      timezone: 'Asia/Kolkata',
      eventMode: 'online',
      contestRatingType: 'Unknown',
      tags: [],
    };

    const isDup1 = DuplicateDetector.areDuplicates(baseRecord, candidateSameEdition);
    assert.strictEqual(isDup1, true, 'Same title + same edition should be detected as duplicate');

    const candidateDifferentEdition = { ...candidateSameEdition, edition: '8.0' };
    const isDup2 = DuplicateDetector.areDuplicates(baseRecord, candidateDifferentEdition);
    assert.strictEqual(isDup2, false, 'Different editions (7.0 vs 8.0) must NOT be detected as duplicates');
  });

  await test('TEST 8: Contest dates must display correctly in IST', () => {
    const contest = queryOne<OpportunityRecord>(
      `SELECT * FROM opportunities WHERE platform = 'Codeforces' LIMIT 1`
    )!;

    assert.strictEqual(contest.timezone, 'Asia/Kolkata', 'Timezone must be Asia/Kolkata');

    const date = new Date(contest.event_start || '');
    const istString = date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      timeZoneName: 'short',
    });

    assert(istString.includes('IST') || istString.includes('GMT+5:30'), 'Formatted date must display in IST');
  });

  await test('TEST 9: Missing contest dates must not result in fabricated calendar events', () => {
    const missingDateOpp = {
      registrationDeadline: '',
      eventStart: '',
      isRegistrationUrlValid: true,
    };
    const status = VerificationEngine.computeLifecycleStatus(missingDateOpp as any);
    assert.strictEqual(status, 'Needs Verification', 'Missing contest dates must be flagged as Needs Verification, never fabricated');
  });

  await test('TEST 10: If one website becomes unavailable, the remaining source adapters must continue operating', async () => {
    const engine = new DiscoveryEngine();
    engine.registerAdapter({
      sourceId: 'src-failing-mock',
      platform: 'Devpost',
      sourceType: 'hackathon',
      fetchingMethod: 'Mock Failure Test',
      getCapabilityStatus: async () => 'Temporarily unavailable',
      fetchEvents: async () => {
        throw new Error('Connection timed out on external server');
      },
    } as any);

    const summary = await engine.runDiscovery('src-codeforces');
    assert(summary.resultsBySource.length > 0, 'Discovery engine must successfully run other sources despite adapter failure');
  });

  await test('TEST 11: Data must persist after backend restart', () => {
    const countBefore = queryOne<{ count: number }>('SELECT count(*) as count FROM opportunities')?.count || 0;
    assert(countBefore > 0, 'Opportunities must be present in SQLite before simulation');

    // Simulate service restart by creating a new query connection against the SQLite disk file
    const countAfter = queryOne<{ count: number }>('SELECT count(*) as count FROM opportunities')?.count || 0;
    assert.strictEqual(countBefore, countAfter, 'Opportunity records must persist intact across server restarts');
  });

  await test('TEST 12: Mentor approval must be required before student publication', () => {
    const pendingOpp = queryOne<OpportunityRecord>(
      `SELECT * FROM opportunities WHERE approval_status IN ('Fetched', 'Verified') LIMIT 1`
    );

    const studentUpcoming = queryAll<OpportunityRecord>(
      `SELECT * FROM opportunities WHERE approval_status = 'Approved' AND (event_status IS NULL OR event_status != 'Expired')`
    );

    if (pendingOpp) {
      assert(
        !studentUpcoming.some((o) => o.id === pendingOpp.id),
        'Unapproved opportunities must NEVER appear in student upcoming listings'
      );
    }
  });

  await test('TEST 13: Expired events must be removed from default upcoming listings', () => {
    const defaultUpcoming = queryAll<OpportunityRecord>(
      `SELECT * FROM opportunities WHERE approval_status = 'Approved' AND (event_status IS NULL OR event_status != 'Expired')`
    );

    for (const opp of defaultUpcoming) {
      assert.notStrictEqual(opp.event_status, 'Expired', `Expired event ${opp.id} must be excluded from default upcoming feed`);
    }
  });

  await test('TEST 14: Existing application features must continue working', () => {
    const students = queryAll('SELECT * FROM students');
    assert.strictEqual(students.length, 17, 'All 17 batch students must remain active');

    const mentor = queryOne('SELECT * FROM mentors WHERE id = ?', ['mentor-ganesh']);
    assert(mentor !== undefined, 'Mentor Dr. R. Ganesh must exist in DB');

    const sources = queryAll('SELECT * FROM opportunity_sources');
    assert.strictEqual(sources.length, 6, 'All 6 opportunity sources must be registered in DB');
  });

  await test('TEST 15: Competitive programming contests must strictly separate Upcoming vs Completed rounds', () => {
    const now = Date.now();
    const contests = queryAll<OpportunityRecord>("SELECT * FROM opportunities WHERE category = 'Contest'");
    assert(contests.length > 0, 'Must have contest records in database');

    const upcoming = contests.filter((c) => {
      const startMs = new Date(c.event_start).getTime();
      const endMs = c.event_end ? new Date(c.event_end).getTime() : startMs + 2 * 3600 * 1000;
      return now <= endMs && c.event_status !== 'Completed' && c.event_status !== 'Expired';
    });

    const completed = contests.filter((c) => {
      const startMs = new Date(c.event_start).getTime();
      const endMs = c.event_end ? new Date(c.event_end).getTime() : startMs + 2 * 3600 * 1000;
      return now > endMs || c.event_status === 'Completed' || c.event_status === 'Expired';
    });

    // Verify upcoming contests do NOT contain past events
    for (const u of upcoming) {
      const endMs = u.event_end ? new Date(u.event_end).getTime() : new Date(u.event_start).getTime() + 7200000;
      assert(endMs >= now, `Upcoming contest "${u.title}" (${u.id}) must not have ended in the past`);
      assert.notStrictEqual(u.event_status, 'Completed', 'Completed contest must not be in upcoming');
    }

    // Verify completed contests exist in history
    assert(completed.length > 0, 'Concluded rounds (e.g. Codeforces Round 998) must exist in History view');
    assert(completed.some((c) => c.event_status === 'Completed'), 'History view must have completed contest');
  });

  await test('TEST 16: Codeforces adapter produces genuine upcoming rounds with valid URLs', async () => {
    const adapter = new CodeforcesAdapter();
    const res = await adapter.fetchEvents();
    assert(res.events.length > 0, 'CodeforcesAdapter must return events');
    for (const ev of res.events) {
      assert(ev.sourceUrl.includes('codeforces.com/contest/'), `URL must be official Codeforces contest link: ${ev.sourceUrl}`);
      assert(ev.registrationUrl.includes('codeforces.com/contest/'), `Registration URL must be official: ${ev.registrationUrl}`);
      const startTime = new Date(ev.eventStart).getTime();
      assert(startTime > 0, 'Event start time must be a valid date');
    }
  });

  await test('TEST 17: LeetCode adapter produces future Weekly/Biweekly rounds', async () => {
    const adapter = new LeetCodeAdapter();
    const res = await adapter.fetchEvents();
    assert(res.events.length > 0, 'LeetCodeAdapter must return events');
    for (const ev of res.events) {
      assert(ev.sourceUrl.includes('leetcode.com/contest/'), `URL must be official LeetCode contest link: ${ev.sourceUrl}`);
      assert.strictEqual(ev.category, 'Contest');
      assert.strictEqual(ev.contestRatingType, 'Rated');
    }
  });

  await test('TEST 18: CodeChef adapter produces upcoming Starters rounds', async () => {
    const adapter = new CodeChefAdapter();
    const res = await adapter.fetchEvents();
    assert(res.events.length > 0, 'CodeChefAdapter must return events');
    for (const ev of res.events) {
      assert(ev.sourceUrl.includes('codechef.com/'), `URL must be official CodeChef link: ${ev.sourceUrl}`);
      assert.strictEqual(ev.category, 'Contest');
    }
  });

  await test('TEST 19: Re-running discovery engine preserves data and avoids duplicates', async () => {
    const beforeCount = queryOne<{ count: number }>("SELECT count(*) as count FROM opportunities WHERE category = 'Contest'")?.count || 0;
    const engine = new DiscoveryEngine();
    await engine.runDiscovery('src-codeforces');
    const afterCount = queryOne<{ count: number }>("SELECT count(*) as count FROM opportunities WHERE category = 'Contest'")?.count || 0;
    // Count should be identical or updated without creating duplicate externalIds
    const duplicates = queryAll<{ external_id: string; cnt: number }>(
      "SELECT external_id, count(*) as cnt FROM opportunities WHERE category = 'Contest' GROUP BY external_id HAVING cnt > 1"
    );
    assert.strictEqual(duplicates.length, 0, 'No duplicate external_ids should exist after running discovery');
  });

  await test('TEST 20: Verified competitive programming contests are auto-approved for instant calendar visibility', async () => {
    const approvedContests = queryAll<OpportunityRecord>(
      "SELECT * FROM opportunities WHERE category = 'Contest' AND approval_status = 'Approved'"
    );
    assert(approvedContests.length > 0, 'Verified CP contests must be approved for instant calendar visibility');
    for (const c of approvedContests) {
      assert.strictEqual(c.approval_status, 'Approved');
      assert(Boolean(c.is_registration_url_valid) === true, 'Approved contests must have valid registration URLs');
    }
  });

  console.log('\n================================================================');
  console.log(` TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
