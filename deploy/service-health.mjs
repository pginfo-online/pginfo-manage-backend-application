import { Redis } from 'ioredis';
import { Queue } from 'bullmq';

const timer = setTimeout(() => process.exit(1), 10000);
const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined,
  connectTimeout: 3000,
  retryStrategy: () => null,
  maxRetriesPerRequest: 1,
};
const redis = new Redis(connection);
redis.on('error', () => {});
const queues = [];
try {
  if ((await redis.ping()) !== 'PONG') throw new Error('Redis unavailable');
  if (process.argv[2] === 'worker') {
    // This deployment has one worker. BullMQ lists only currently connected workers.
    for (const name of ['billing-queue', 'communications-queue']) {
      const queue = new Queue(name, { connection });
      queues.push(queue);
      if ((await queue.getWorkers()).length === 0) throw new Error(`${name}: no worker`);
    }
  } else {
    const res = await fetch('http://127.0.0.1:3000/health/ready', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok || (await res.json()).status !== 'ok') throw new Error('API/database unavailable');
  }
  console.log('healthy');
} catch {
  console.error('Service dependency health check failed');
  process.exitCode = 1;
} finally {
  await Promise.all(queues.map((queue) => queue.close()));
  redis.disconnect();
  clearTimeout(timer);
}
