/**
 * Elite Track Supabase Client Configuration
 * Safely handles live Supabase connectivity with offline/demo resilience.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Approved Faculty Allowlist for instant validation & fallback (10 Approved Faculty)
 */
export const PRE_REGISTERED_FACULTY_EMAILS = [
  'ganesh@uniqshift.com',
  'principal@nec.edu.in',
  'deanrd@nec.edu.in',
  'hodcse@nec.edu.in',
  'hodai@nec.edu.in',
  'hodit@nec.edu.in',
  'bsp@nec.edu.in',
  'anithait@nec.edu.in',
  'rampriya-aids@nec.edu.in',
  'naskat@nec.edu.in',
];

/**
 * Validates whether an email is allowlisted as faculty
 */
export function checkFacultyAllowlist(email: string): boolean {
  return PRE_REGISTERED_FACULTY_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Sign in using Supabase Google OAuth
 */
export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Check if an email is registered in approved_users (from Supabase or local allowlist)
 */
export async function verifyUserEmail(email: string): Promise<{ approved: boolean; role?: 'student' | 'faculty'; name?: string; message?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check pre-registered faculty
  if (checkFacultyAllowlist(cleanEmail)) {
    let facultyName = 'Faculty Member';
    if (cleanEmail === 'ganesh@uniqshift.com') facultyName = 'Prof. Ganesh Sir';
    else if (cleanEmail === 'principal@nec.edu.in') facultyName = 'Dr. K. Kalidasa Murugavel';
    else if (cleanEmail === 'deanrd@nec.edu.in') facultyName = 'Dr. Shenbagavalli';
    else if (cleanEmail === 'hodcse@nec.edu.in') facultyName = 'Dr. V. Gomathi';
    else if (cleanEmail === 'hodai@nec.edu.in') facultyName = 'Dr. L. Jerart Julus';
    else if (cleanEmail === 'hodit@nec.edu.in') facultyName = 'Dr. D. Manimegalai';
    else if (cleanEmail === 'bsp@nec.edu.in') facultyName = 'Dr. B. Shanmuga Priya';
    else if (cleanEmail === 'anithait@nec.edu.in') facultyName = 'Prof. Anitha';
    else if (cleanEmail === 'rampriya-aids@nec.edu.in') facultyName = 'Prof. Rampriya';
    else if (cleanEmail === 'naskat@nec.edu.in') facultyName = 'Dr. J. Naskath';

    return {
      approved: true,
      role: 'faculty',
      name: facultyName,
    };
  }

  // 2. If Supabase is connected, query the approved_users table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('approved_users')
        .select('role, is_active, full_name')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error) {
        console.warn('Supabase query error:', error.message);
      } else if (data && data.is_active) {
        return {
          approved: true,
          role: data.role === 'student' ? 'student' : 'faculty',
          name: data.full_name || undefined,
        };
      }
    } catch (e) {
      console.warn('Could not query approved_users:', e);
    }
  }

  // 3. Fallback check for demo student emails
  if (cleanEmail.includes('student') || cleanEmail.includes('ananya') || cleanEmail.includes('22cs') || cleanEmail.includes('college.edu')) {
    return {
      approved: true,
      role: 'student',
      name: 'Ananya Sharma',
    };
  }

  return {
    approved: false,
    message: 'Access Denied: Your email is not registered in the approved college roster. Please contact Ganesh Sir (Lead Placement Mentor) or the College Placement Cell to request access.',
  };
}
