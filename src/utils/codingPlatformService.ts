/**
 * Real Coding Platform Synchronization Engine
 * Connects directly to LeetCode, Codeforces, GitHub, and CodeChef APIs.
 * Complies with ARCHITECTURE.md v3.3 Section 4.
 */

export interface PlatformSyncResult {
  success: boolean;
  handle: string;
  solvedCount: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  rating?: number;
  rank?: string;
  extra?: Record<string, any>;
  error?: string;
}

/**
 * Cleanly extracts handle from URLs or raw username
 */
export function extractHandle(platform: string, input: string): string {
  const trimmed = input.trim();
  if (!trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const parts = url.pathname.split('/').filter(Boolean);

    if (platform === 'LeetCode') {
      // https://leetcode.com/u/username or https://leetcode.com/username
      if (parts[0] === 'u' && parts[1]) return parts[1];
      return parts[0] || trimmed;
    }

    if (platform === 'Codeforces') {
      // https://codeforces.com/profile/username
      if (parts[0] === 'profile' && parts[1]) return parts[1];
      return parts[0] || trimmed;
    }

    if (platform === 'CodeChef') {
      // https://www.codechef.com/users/username
      if (parts[0] === 'users' && parts[1]) return parts[1];
      return parts[0] || trimmed;
    }

    if (platform === 'GitHub') {
      // https://github.com/username
      return parts[0] || trimmed;
    }

    return parts[parts.length - 1] || trimmed;
  } catch {
    return trimmed.replace(/^https?:\/\/(www\.)?[^/]+\//, '').replace(/\/.*$/, '');
  }
}

/**
 * Real Codeforces Fetcher
 * Uses official Codeforces Public API
 */
export async function fetchCodeforcesData(handle: string): Promise<PlatformSyncResult> {
  try {
    // 1. Fetch user rating and ranking info
    const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
    const infoData = await infoRes.json();

    if (infoData.status !== 'OK' || !infoData.result?.[0]) {
      return {
        success: false,
        handle,
        solvedCount: 0,
        error: infoData.comment || 'Codeforces user not found',
      };
    }

    const userInfo = infoData.result[0];

    // 2. Fetch user submissions to calculate unique solved problems
    const statusRes = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=500`);
    const statusData = await statusRes.json();

    const uniqueSolved = new Set<string>();
    if (statusData.status === 'OK' && Array.isArray(statusData.result)) {
      statusData.result.forEach((sub: any) => {
        if (sub.verdict === 'OK' && sub.problem) {
          const probKey = `${sub.problem.contestId || ''}-${sub.problem.index || sub.problem.name}`;
          uniqueSolved.add(probKey);
        }
      });
    }

    return {
      success: true,
      handle,
      solvedCount: uniqueSolved.size,
      rating: userInfo.rating || 0,
      rank: userInfo.rank || 'unranked',
      extra: {
        maxRating: userInfo.maxRating,
        maxRank: userInfo.maxRank,
        avatar: userInfo.titlePhoto || userInfo.avatar,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      handle,
      solvedCount: 0,
      error: err.message || 'Failed to connect to Codeforces API',
    };
  }
}

/**
 * Real LeetCode Fetcher
 * Connects to live public LeetCode GraphQL / REST profile API
 */
export async function fetchLeetCodeData(handle: string): Promise<PlatformSyncResult> {
  try {
    // Primary: Alfa LeetCode API (free, reliable public GraphQL mirror)
    const res = await fetch(`https://alfa-leetcode-api.onrender.com/userProfile/${encodeURIComponent(handle)}`);
    
    if (!res.ok) {
      throw new Error(`LeetCode API status: ${res.status}`);
    }

    const data = await res.json();

    if (typeof data.totalSolved !== 'number') {
      return {
        success: false,
        handle,
        solvedCount: 0,
        error: 'LeetCode user statistics unavailable',
      };
    }

    return {
      success: true,
      handle,
      solvedCount: data.totalSolved,
      easySolved: data.easySolved || 0,
      mediumSolved: data.mediumSolved || 0,
      hardSolved: data.hardSolved || 0,
      rank: data.ranking ? `#${data.ranking}` : undefined,
      extra: {
        ranking: data.ranking,
        reputation: data.reputation,
        acceptanceRate: data.acceptanceRate,
      },
    };
  } catch (err: any) {
    // Architecture v3.3 Section 4: If LeetCode blocks automated API, report failure cleanly
    return {
      success: false,
      handle,
      solvedCount: 0,
      error: `LeetCode API fetch error: ${err.message || 'Service unreachable'}. You can maintain self-reported verified status.`,
    };
  }
}

/**
 * Real GitHub Fetcher
 * Uses official GitHub Public REST API
 */
export async function fetchGitHubData(handle: string): Promise<PlatformSyncResult> {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`);
    
    if (!res.ok) {
      return {
        success: false,
        handle,
        solvedCount: 0,
        error: res.status === 404 ? 'GitHub user not found' : 'GitHub rate limit or network error',
      };
    }

    const data = await res.json();

    return {
      success: true,
      handle,
      solvedCount: data.public_repos || 0, // Public repositories
      extra: {
        publicRepos: data.public_repos,
        followers: data.followers,
        avatar: data.avatar_url,
        bio: data.bio,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      handle,
      solvedCount: 0,
      error: err.message || 'Failed to fetch GitHub profile',
    };
  }
}

/**
 * Real CodeChef Fetcher
 */
export async function fetchCodeChefData(handle: string): Promise<PlatformSyncResult> {
  try {
    const res = await fetch(`https://codechef-api.vercel.app/handle/${encodeURIComponent(handle)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        return {
          success: true,
          handle,
          solvedCount: data.fullySolved?.count || data.solvedCount || 0,
          rating: data.currentRating || 0,
          rank: data.stars || '1★',
          extra: {
            highestRating: data.highestRating,
            globalRank: data.globalRank,
          },
        };
      }
    }
  } catch {
    // Graceful fallback for CodeChef
  }

  return {
    success: false,
    handle,
    solvedCount: 0,
    error: 'CodeChef live API unreachable. Self-reported count preserved.',
  };
}

/**
 * Unified Dispatcher: Sync Any Platform
 */
export async function syncPlatform(platform: string, inputUrlOrHandle: string): Promise<PlatformSyncResult> {
  const handle = extractHandle(platform, inputUrlOrHandle);

  if (!handle) {
    return {
      success: false,
      handle: '',
      solvedCount: 0,
      error: 'Invalid handle provided',
    };
  }

  switch (platform) {
    case 'Codeforces':
      return await fetchCodeforcesData(handle);
    case 'LeetCode':
      return await fetchLeetCodeData(handle);
    case 'GitHub':
      return await fetchGitHubData(handle);
    case 'CodeChef':
      return await fetchCodeChefData(handle);
    default:
      return {
        success: true,
        handle,
        solvedCount: 0,
        extra: { note: 'Other platform self-reported' },
      };
  }
}
