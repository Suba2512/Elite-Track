import { app } from './app.js';
import { ENV } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { runSeeds } from './db/seed.js';
import { JobScheduler } from './services/scheduler/JobScheduler.js';

async function bootstrap() {
  console.log('================================================================');
  console.log(' ELITE TRACK BACKEND (Obj3) — AUTOMATED OPPORTUNITY ENGINE');
  console.log('================================================================');

  try {
    // 1. Initialize DB and Seed baseline models
    runMigrations();
    runSeeds();

    // 2. Start background discovery and reminder scheduler
    JobScheduler.startAllJobs();

    // 3. Listen on configured port
    const server = app.listen(ENV.PORT, () => {
      console.log(`[Server] Elite Track backend running on http://localhost:${ENV.PORT}`);
      console.log(`[Server] WhatsApp Webhook URL: http://localhost:${ENV.PORT}/api/whatsapp/webhook`);
      console.log(`[Server] Ready to serve frontend and scheduled tasks.`);
    });

    const shutdown = () => {
      console.log('\n[Server] Graceful shutdown initiated...');
      JobScheduler.stopAllJobs();
      server.close(() => {
        console.log('[Server] Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();
