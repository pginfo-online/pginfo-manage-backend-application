// Deliberate no-op jobs exercise queue delivery without billing or sending messages.
import { Queue, QueueEvents } from 'bullmq';
import { randomUUID } from 'node:crypto';
const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};
const timer = setTimeout(() => process.exit(1), 45000);
try {
  for (const name of ['billing-queue', 'communications-queue']) {
    const queue = new Queue(name, { connection });
    const events = new QueueEvents(name, { connection });
    let job;
    try {
      await events.waitUntilReady();
      if ((await queue.getWorkers()).length < 1) throw new Error('No connected worker');
      job = await queue.add('deployment-smoke-test', {}, {
        jobId: `deploy-${randomUUID()}`,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: { age: 3600 },
      });
      await job.waitUntilFinished(events, 15000);
      console.log(`${name}: no-op job completed`);
    } finally {
      if (job && (await job.getState()) === 'completed') await job.remove();
      await events.close();
      await queue.close();
    }
  }
} catch {
  console.error('Queue delivery verification failed; inspect service logs');
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
