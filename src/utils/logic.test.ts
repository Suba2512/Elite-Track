import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgressPercentage,
  calculateTotalSolvedAcrossPlatforms,
  computeBatchOverview,
  extractHandle,
  filterOpportunities,
  updateCommandReply,
  validateProfileInput,
} from './logic';
import { MentorCommand, Opportunity } from '../types';

test('extractHandle parses URLs and handles cleanly', () => {
  assert.equal(extractHandle('https://leetcode.com/u/ananya_cs/'), 'ananya_cs');
  assert.equal(extractHandle('@karthik_dev'), 'karthik_dev');
});

test('validateProfileInput detects found, private, and not-found profiles', () => {
  const ok = validateProfileInput('LeetCode', 'https://leetcode.com/u/ananya_cs');
  assert.equal(ok.status, 'found');
  assert.equal(ok.handle, 'ananya_cs');
  assert.equal(ok.suggestedCount, 248);

  const priv = validateProfileInput('CodeChef', 'https://codechef.com/users/private_user');
  assert.equal(priv.status, 'private');

  const missing = validateProfileInput('Codeforces', 'https://codeforces.com/profile/404_handle');
  assert.equal(missing.status, 'not-found');
});

test('calculateProgressPercentage computes bounded 75% progress ring correctly', () => {
  assert.equal(calculateProgressPercentage(15, 20), 75);
  assert.equal(calculateProgressPercentage(25, 20), 100);
  assert.equal(calculateProgressPercentage(0, 20), 0);
});

test('calculateTotalSolvedAcrossPlatforms sums platform counts accurately', () => {
  const total = calculateTotalSolvedAcrossPlatforms([
    {
      id: '1',
      platform: 'LeetCode',
      handle: 'ananya',
      url: '',
      solvedCount: 240,
      secondaryLabel: 'Contest Rating',
      secondaryValue: '1740',
      verificationType: 'Auto-verified',
      lastSynced: '2m ago',
      syncStatus: 'synced',
    },
    {
      id: '2',
      platform: 'AtCoder',
      handle: 'ananya',
      url: '',
      solvedCount: 18,
      secondaryLabel: 'Rank',
      secondaryValue: 'Kyū',
      verificationType: 'Self-reported',
      lastSynced: 'Manual',
      syncStatus: 'synced',
    },
  ]);
  assert.equal(total, 258);
});

test('updateCommandReply updates student command status and comment', () => {
  const initial: MentorCommand[] = [
    {
      id: 'cmd-1',
      title: 'Complete 5 Graph BFS/DFS Problems',
      description: 'Focus on shortest path in unweighted graphs.',
      dueDate: 'Nov 22',
      assignedBy: 'Ganesh Sir',
      assignedByRole: 'Placement Mentor',
      targetType: 'all',
      attachments: [],
      createdAt: 'Nov 18',
      myStatus: 'In progress',
      myComment: 'Solved 3 so far',
      studentReplies: [
        {
          studentId: 'stu-1',
          studentName: 'Ananya Sundaram',
          rollNo: '22CS001',
          status: 'In progress',
          comment: 'Solved 3 so far',
          updatedAt: '1h ago',
        },
      ],
    },
  ];

  const updated = updateCommandReply(
    initial,
    'cmd-1',
    'stu-1',
    'Ananya Sundaram',
    '22CS001',
    'Done',
    'Completed all 5 problems and pushed notes to GitHub.'
  );

  assert.equal(updated[0].myStatus, 'Done');
  assert.equal(updated[0].studentReplies[0].status, 'Done');
  assert.equal(
    updated[0].studentReplies[0].comment,
    'Completed all 5 problems and pushed notes to GitHub.'
  );
});

test('filterOpportunities filters by approval stage, category, and company', () => {
  const items: Opportunity[] = [
    {
      id: 'opp-1',
      title: 'Google Girl Hackathon 2026',
      company: 'Google',
      category: 'Hackathon',
      deadline: 'Nov 28',
      daysLeft: 10,
      source: 'MyCareerNet',
      pipelineStage: 'Approved',
      eligibility: 'B.E/B.Tech 2026 & 2027 Batch',
      prizeOrPerk: 'Interview Fast-Track + Cash Prize',
      dates: 'Nov 28 - Dec 14',
      registrationUrl: 'https://buildyourfuture.withgoogle.com',
      description: 'Flagship engineering hackathon.',
      saved: true,
      remindMe: false,
      tags: ['AI', 'Algorithms'],
    },
    {
      id: 'opp-2',
      title: 'Nvidia CUDA Kernel Challenge',
      company: 'Nvidia',
      category: 'Contest',
      deadline: 'Dec 04',
      daysLeft: 16,
      source: 'Devpost',
      pipelineStage: 'Fetched',
      eligibility: 'All Engineering Years',
      prizeOrPerk: 'RTX GPU Grant + Internship Interview',
      dates: 'Dec 04 - Dec 10',
      registrationUrl: 'https://developer.nvidia.com',
      description: 'GPU systems contest.',
      saved: false,
      remindMe: false,
      tags: ['CUDA', 'C++'],
    },
  ];

  const studentVisible = filterOpportunities(items, { includeUnapproved: false });
  assert.equal(studentVisible.length, 1);
  assert.equal(studentVisible[0].company, 'Google');

  const pipelineAll = filterOpportunities(items, { includeUnapproved: true, category: 'Contest' });
  assert.equal(pipelineAll.length, 1);
  assert.equal(pipelineAll[0].company, 'Nvidia');
});

test('computeBatchOverview summarizes batch metrics without rankings', () => {
  const summary = computeBatchOverview([
    {
      id: '1',
      name: 'Student A',
      rollNo: '22CS01',
      department: 'CSE',
      email: 'a@college.edu',
      avatarUrl: '',
      careerObjective: '',
      whatsappNumber: '',
      whatsappConsent: true,
      inAppNotifications: true,
      streakDays: 5,
      weeklyTargetSolved: 10,
      weeklyCurrentSolved: 8,
      totalSolved: 200,
      contestsCount: 4,
      hackathonsCount: 2,
      commandsCompleted: 3,
      commandsTotal: 4,
      activeStatus: 'Active this week',
      lastActive: 'Today',
      platforms: [],
      weeklyActivity: [],
      cumulativeHistory: [],
    },
    {
      id: '2',
      name: 'Student B',
      rollNo: '22CS02',
      department: 'CSE',
      email: 'b@college.edu',
      avatarUrl: '',
      careerObjective: '',
      whatsappNumber: '',
      whatsappConsent: true,
      inAppNotifications: true,
      streakDays: 2,
      weeklyTargetSolved: 10,
      weeklyCurrentSolved: 7,
      totalSolved: 180,
      contestsCount: 3,
      hackathonsCount: 1,
      commandsCompleted: 3,
      commandsTotal: 4,
      activeStatus: 'Active this week',
      lastActive: 'Today',
      platforms: [],
      weeklyActivity: [],
      cumulativeHistory: [],
    },
  ]);

  assert.equal(summary.totalStudents, 2);
  assert.equal(summary.activeThisWeek, 2);
  assert.equal(summary.totalProblemsThisWeek, 15);
  assert.equal(summary.completionRate, 75);
});
