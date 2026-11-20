import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory or Obj3 or root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'Obj3', '.env') });

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'Obj3', 'data', 'elitetrack.db'),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  TIMEZONE: process.env.TIMEZONE || 'Asia/Kolkata',

  // Discovery schedules
  DISCOVERY_INTERVAL_HACKATHONS_MINUTES: parseInt(process.env.DISCOVERY_INTERVAL_HACKATHONS_MINUTES || '360', 10),
  DISCOVERY_INTERVAL_CONTESTS_MINUTES: parseInt(process.env.DISCOVERY_INTERVAL_CONTESTS_MINUTES || '120', 10),
  VERIFICATION_INTERVAL_MINUTES: parseInt(process.env.VERIFICATION_INTERVAL_MINUTES || '720', 10),
  REMINDERS_INTERVAL_MINUTES: parseInt(process.env.REMINDERS_INTERVAL_MINUTES || '60', 10),

  // Meta WhatsApp Business Cloud API
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || 'elite_track_secure_webhook_verify_token_2026',
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET || '',

  // Mentor config
  MENTOR_DEFAULT_ID: process.env.MENTOR_DEFAULT_ID || 'mentor-ganesh',
  MENTOR_NAME: process.env.MENTOR_NAME || 'Ganesh Sir',
};
