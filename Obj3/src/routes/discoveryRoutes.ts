import { Router, Response } from 'express';
import { queryAll } from '../db/database.js';
import { AuthenticatedRequest, requireMentor } from '../middleware/authMiddleware.js';
import { DiscoveryRunRecord, OpportunitySourceRecord } from '../models/types.js';
import { DiscoveryEngine } from '../services/discovery/DiscoveryEngine.js';

export const discoveryRouter = Router();
const engine = new DiscoveryEngine();

/**
 * Trigger automated discovery across enabled sources.
 */
discoveryRouter.post('/run', requireMentor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sourceId } = req.body || {};
    const summary = await engine.runDiscovery(sourceId);
    res.json({
      message: 'Discovery executed successfully',
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Observability overview for Mentor Dashboard.
 */
discoveryRouter.get('/status', requireMentor, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = DiscoveryEngine.getObservabilityStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Historical discovery executions.
 */
discoveryRouter.get('/runs', requireMentor, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const runs = queryAll<DiscoveryRunRecord>(
      'SELECT * FROM discovery_runs ORDER BY started_at DESC LIMIT 30'
    );
    res.json({ runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Source capabilities and status.
 */
discoveryRouter.get('/sources', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const sources = queryAll<OpportunitySourceRecord>('SELECT * FROM opportunity_sources ORDER BY name ASC');
    res.json({ sources });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
