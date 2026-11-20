/**
 * Elite Track API Client
 * Connects frontend views to Obj3 backend endpoints with graceful fallback to seed data.
 */

import { Opportunity, PipelineStage, ActivityNotification, UserRole } from '../types';

const API_BASE = '/api';

export interface SourceHealthData {
  id: string;
  name: string;
  platform: string;
  source_type: string;
  base_url: string;
  fetching_method: string;
  integration_status: 'Active' | 'Temporarily unavailable' | 'Access Restricted' | 'Configuration required' | 'Unsupported';
  last_fetch_attempt: string | null;
  last_successful_fetch: string | null;
  records_fetched: number;
  verified_records: number;
  expired_records: number;
  duplicate_records: number;
  invalid_links: number;
  manual_verification_required: number;
  last_error_message: string | null;
  is_operational: boolean;
}

export interface DiscoveryObservabilityStats {
  totalDiscovered: number;
  verified: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  upcomingCompanyHackathons: number;
  upcomingRatedContests: number;
  expired: number;
  whatsappQueued: number;
  whatsappDelivered: number;
  whatsappFailed: number;
  lastDiscoveryExecution: string | null;
  lastRunStatus: string;
  sources: SourceHealthData[];
}

export interface VerificationEvidencePayload {
  sourceUrl: string;
  sourceName: string;
  checkedAt: string;
  checksPerformed: string[];
  failedChecks: string[];
  evidenceSummary: string;
  isCompanyIdentified: boolean;
  isRegistrationOpen: boolean;
  isExpired: boolean;
}

export const api = {
  /**
   * Fetches opportunities from backend.
   * Mentor sees all stages; students only see Approved.
   */
  async getOpportunities(role: UserRole | string, studentId: string = 'stu-01'): Promise<Opportunity[]> {
    try {
      const isAdmin = role === 'admin' || role === 'faculty' || role === 'super_admin';
      const endpoint = isAdmin ? `${API_BASE}/opportunities` : `${API_BASE}/student/opportunities`;
      const res = await fetch(endpoint, {
        headers: {
          'x-role': isAdmin ? 'admin' : 'student',
          'x-student-id': studentId,
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.opportunities || [];
    } catch (err) {
      console.warn('[apiClient] Backend fetch failed, falling back to local state:', err);
      return [];
    }
  },

  /**
   * Updates an opportunity's pipeline stage (Verify, Approve, Reject).
   */
  async updateOpportunityStage(
    oppId: string,
    nextStage: PipelineStage,
    reason?: string
  ): Promise<{ success: boolean; opportunity?: Opportunity; distribution?: any }> {
    try {
      let actionEndpoint = 'verify';
      if (nextStage === 'Approved') actionEndpoint = 'approve';
      else if (nextStage === 'Rejected') actionEndpoint = 'reject';
      else if (nextStage === 'Verified') actionEndpoint = 'verify';

      const res = await fetch(`${API_BASE}/opportunities/${oppId}/${actionEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'admin',
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, opportunity: data.opportunity, distribution: data.distributionResult };
    } catch (err: any) {
      console.warn('[apiClient] updateOpportunityStage failed:', err);
      return { success: false };
    }
  },

  /**
   * Creates a verified opportunity manually.
   */
  async createOpportunity(opp: Partial<Opportunity>): Promise<{ success: boolean; opportunity?: Opportunity }> {
    try {
      const res = await fetch(`${API_BASE}/opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'admin',
        },
        body: JSON.stringify(opp),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, opportunity: data.opportunity };
    } catch (err) {
      console.warn('[apiClient] createOpportunity failed:', err);
      return { success: false };
    }
  },

  /**
   * Triggers background discovery run across all sources or a specific source.
   */
  async triggerDiscovery(sourceId?: string): Promise<{ success: boolean; summary?: any }> {
    try {
      const res = await fetch(`${API_BASE}/discovery/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'admin',
        },
        body: JSON.stringify({ sourceId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, summary: data.summary };
    } catch (err: any) {
      console.warn('[apiClient] triggerDiscovery failed:', err);
      return { success: false };
    }
  },

  /**
   * Fetches observability stats for Mentor dashboard.
   */
  async getDiscoveryStatus(): Promise<DiscoveryObservabilityStats | null> {
    try {
      const res = await fetch(`${API_BASE}/discovery/status`, {
        headers: { 'x-role': 'admin' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Fetches verification evidence and audit history for an opportunity.
   */
  async getOpportunityEvidence(oppId: string): Promise<{
    verifications: Array<{
      id: string;
      verification_status: string;
      evidence: VerificationEvidencePayload;
      checked_at: string;
    }>;
    approvals: Array<{
      id: string;
      action: string;
      previous_status: string;
      new_status: string;
      reason: string;
      approved_at: string;
    }>;
  }> {
    try {
      const res = await fetch(`${API_BASE}/opportunities/${oppId}`, {
        headers: { 'x-role': 'admin' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        verifications: data.verifications || [],
        approvals: data.approvals || [],
      };
    } catch {
      return { verifications: [], approvals: [] };
    }
  },

  /**
   * Previews WhatsApp announcement text before approving.
   */
  async previewWhatsApp(opportunityId: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/notifications/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'admin',
        },
        body: JSON.stringify({ opportunityId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.previewText || null;
    } catch {
      return null;
    }
  },

  /**
   * Student: Toggle save/bookmark.
   */
  async toggleSave(oppId: string, studentId: string = 'stu-01'): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/student/opportunities/${oppId}/save`, {
        method: 'POST',
        headers: { 'x-student-id': studentId },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.saved;
    } catch {
      return false;
    }
  },

  /**
   * Student: Toggle Remind Me.
   */
  async toggleRemind(oppId: string, studentId: string = 'stu-01'): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/student/opportunities/${oppId}/remind`, {
        method: 'POST',
        headers: { 'x-student-id': studentId },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.remindMe;
    } catch {
      return false;
    }
  },

  /**
   * Student: Update participation status ('Interested', 'Registered', 'Participating', 'Completed', 'Not Participating').
   */
  async updateParticipationStatus(
    oppId: string,
    status: string,
    notes?: string,
    studentId: string = 'stu-01'
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/student/opportunities/${oppId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-student-id': studentId,
        },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Student: Fetch dedicated competitive programming contests.
   */
  async getContests(view?: 'upcoming' | 'ongoing' | 'history' | 'all', platform?: string, studentId: string = 'stu-01'): Promise<Opportunity[]> {
    try {
      const params = new URLSearchParams();
      if (view) params.set('view', view);
      if (platform && platform !== 'All') params.set('platform', platform);
      const res = await fetch(`${API_BASE}/student/contests?${params.toString()}`, {
        headers: { 'x-student-id': studentId, 'x-role': 'student' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.contests || [];
    } catch {
      return [];
    }
  },

  /**
   * Student: Fetch in-app notifications.
   */
  async getStudentNotifications(studentId: string = 'stu-01'): Promise<ActivityNotification[]> {
    try {
      const res = await fetch(`${API_BASE}/student/notifications`, {
        headers: { 'x-student-id': studentId },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.notifications || [];
    } catch {
      return [];
    }
  },
};
