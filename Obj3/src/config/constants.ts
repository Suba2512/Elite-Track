export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// 70% company hackathons & hiring challenges / 30% competitive programming contests
export const DISCOVERY_PRIORITY_WEIGHTS = {
  COMPANY_HACKATHON_WEIGHT: 0.7,
  COMPETITIVE_CONTEST_WEIGHT: 0.3,
};

// Verified tech companies recognition list for matching & tagging genuine company events
export const RECOGNIZED_TECH_COMPANIES = [
  'Google',
  'Microsoft',
  'Amazon',
  'Flipkart',
  'Walmart',
  'TCS',
  'Infosys',
  'Zoho',
  'Accenture',
  'IBM',
  'Adobe',
  'Salesforce',
  'Cisco',
  'Intel',
  'Atlassian',
  'Oracle',
  'Meta',
  'Apple',
  'Uber',
  'PayPal',
  'Qualcomm',
  'Nvidia',
  'AMD',
  'Morgan Stanley',
  'Goldman Sachs',
  'JPMorgan',
  'Samsung',
  'Swiggy',
  'Zomato',
  'Razorpay',
  'Cred',
  'Intuit',
  'ServiceNow',
  'Cognizant',
  'Wipro',
  'HCLTech',
  'Capgemini',
];

export const SCHEDULE_CONFIG = {
  HACKATHONS_CRON_MINUTES: 360, // 6 hours
  CONTESTS_CRON_MINUTES: 120, // 2 hours
  VERIFICATION_CRON_MINUTES: 720, // 12 hours
  DEADLINE_MONITOR_MINUTES: 60, // check reminders hourly
};

export const REMINDER_OFFSETS_HOURS = {
  DEADLINE_FIRST: 24, // 24 hours before registration deadline
  DEADLINE_URGENT: 6, // 6 hours before registration deadline
  CONTEST_FIRST: 24, // 24 hours before contest start
  CONTEST_URGENT: 1, // 1 hour before contest start
};
