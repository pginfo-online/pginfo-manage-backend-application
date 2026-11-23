/**
 * PM2 Ecosystem Configuration for PgInfo Manage Backend
 *
 * Applications:
 *  1. pginfo-manage-api: Main NestJS REST API server
 *  2. pginfo-manage-worker: Background BullMQ worker for billing and communications
 *
 * Designed to run isolated on a shared VPS alongside other applications.
 */

module.exports = {
  apps: [
    {
      name: 'pginfo-manage-api',
      script: './dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      kill_timeout: 5000,
      restart_delay: 2000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'pginfo-manage-worker',
      script: './dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      kill_timeout: 15000,
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-err.log',
      out_file: './logs/worker-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
