/**
 * UrlValidator Service
 * Validates registration URLs and official event URLs.
 * Rejects generic homepages, search engines, invalid protocols, and malformed destinations.
 */

export interface UrlValidationResult {
  isValid: boolean;
  isGenericHomepage: boolean;
  isSearchUrl: boolean;
  reason?: string;
  normalizedUrl?: string;
}

// Known generic platform homepages that should NEVER be accepted as valid registration URLs
const GENERIC_PLATFORM_ROOTS = [
  'unstop.com',
  'devpost.com',
  'leetcode.com',
  'codeforces.com',
  'codechef.com',
  'codegalatta.com',
  'hackerearth.com',
  'hackerrank.com',
  'google.com',
  'buildyourfuture.withgoogle.com',
  'developer.nvidia.com',
  'mycareernet.com',
  'tcs.com',
  'infosys.com',
  'walmart.com',
  'microsoft.com',
];

const SEARCH_ENGINE_HOSTS = [
  'google.com',
  'google.co.in',
  'bing.com',
  'yahoo.com',
  'duckduckgo.com',
  'baidu.com',
  'search.brave.com',
];

export class UrlValidator {
  /**
   * Validates if a URL is a legitimate, specific registration URL.
   */
  static validateRegistrationUrl(rawUrl: string | undefined | null, platform?: string): UrlValidationResult {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      return {
        isValid: false,
        isGenericHomepage: false,
        isSearchUrl: false,
        reason: 'Registration URL is empty or missing',
      };
    }

    const trimmed = rawUrl.trim();

    // Check protocol
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return {
        isValid: false,
        isGenericHomepage: false,
        isSearchUrl: false,
        reason: 'Registration URL must begin with http:// or https://',
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return {
        isValid: false,
        isGenericHomepage: false,
        isSearchUrl: false,
        reason: 'Registration URL is malformed and cannot be parsed',
      };
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase();

    // Check 1: Search engine queries
    if (SEARCH_ENGINE_HOSTS.some((sh) => hostname === sh || hostname.endsWith(`.${sh}`))) {
      if (pathname.includes('/search') || parsed.searchParams.has('q') || parsed.searchParams.has('query')) {
        return {
          isValid: false,
          isGenericHomepage: false,
          isSearchUrl: true,
          reason: 'Search engine query URLs cannot be used as official registration links',
        };
      }
    }

    // Check 2: Generic platform homepages (root domain with no specific event slug or path)
    const isRootOrEmptyPath = pathname === '' || pathname === '/' || pathname === '/home';
    if (GENERIC_PLATFORM_ROOTS.includes(hostname) && isRootOrEmptyPath) {
      return {
        isValid: false,
        isGenericHomepage: true,
        isSearchUrl: false,
        reason: `Generic homepage (${hostname}) cannot be used as an official event registration destination`,
      };
    }

    // Check 3: Check platform specific minimum paths
    if (hostname.includes('unstop.com') && isRootOrEmptyPath) {
      return {
        isValid: false,
        isGenericHomepage: true,
        isSearchUrl: false,
        reason: 'Generic Unstop homepage cannot be used without specific hackathon slug',
      };
    }

    if (hostname.includes('devpost.com') && isRootOrEmptyPath && hostname === 'devpost.com') {
      return {
        isValid: false,
        isGenericHomepage: true,
        isSearchUrl: false,
        reason: 'Generic Devpost homepage cannot be used without a subdomain or event path',
      };
    }

    if (hostname.includes('codeforces.com') && (isRootOrEmptyPath || pathname === '/contests')) {
      return {
        isValid: false,
        isGenericHomepage: true,
        isSearchUrl: false,
        reason: 'Generic Codeforces contests list cannot be used without a specific contest ID',
      };
    }

    return {
      isValid: true,
      isGenericHomepage: false,
      isSearchUrl: false,
      normalizedUrl: parsed.toString(),
    };
  }

  /**
   * Validates official event page URL.
   */
  static validateOfficialEventUrl(rawUrl: string | undefined | null): UrlValidationResult {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      return {
        isValid: false,
        isGenericHomepage: false,
        isSearchUrl: false,
        reason: 'Official event URL is missing',
      };
    }

    try {
      const parsed = new URL(rawUrl.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          isValid: false,
          isGenericHomepage: false,
          isSearchUrl: false,
          reason: 'Official event URL must be http or https',
        };
      }
      return {
        isValid: true,
        isGenericHomepage: false,
        isSearchUrl: false,
        normalizedUrl: parsed.toString(),
      };
    } catch {
      return {
        isValid: false,
        isGenericHomepage: false,
        isSearchUrl: false,
        reason: 'Official event URL is malformed',
      };
    }
  }
}
