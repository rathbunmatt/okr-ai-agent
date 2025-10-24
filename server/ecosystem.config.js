// PM2 Ecosystem Configuration for Production Deployment

module.exports = {
  apps: [
    {
      name: 'okr-ai-agent-server',
      script: './dist/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',

      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },

      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Process Management
      autorestart: true,
      watch: false, // Disable in production for performance
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',

      // Advanced Features
      source_map_support: true,
      instance_var: 'INSTANCE_ID',

      // Health Check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Cluster Settings
      listen_timeout: 3000,
      kill_timeout: 5000,

      // Environment Variables Override (optional)
      env_file: '.env',
    },

    // Development/Debug Instance
    {
      name: 'okr-ai-agent-server-dev',
      script: './src/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
      },

      // Development Settings
      watch: ['src'],
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'dist', 'logs', 'data'],
      watch_options: {
        followSymlinks: false,
        usePolling: false,
      },

      autorestart: true,
      max_memory_restart: '512M',

      // Logging
      log_file: './logs/dev.log',
      out_file: './logs/dev-out.log',
      error_file: './logs/dev-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Health Check Service
    {
      name: 'okr-health-monitor',
      script: './scripts/health-monitor.js',
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        MONITOR_URL: 'http://localhost:3000/health',
        CHECK_INTERVAL: 30000, // 30 seconds
      },

      autorestart: true,
      max_memory_restart: '100M',
      restart_delay: 5000,

      // Logging
      log_file: './logs/health-monitor.log',
      out_file: './logs/health-monitor-out.log',
      error_file: './logs/health-monitor-error.log',
    },
  ],

  // Deployment Configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/okr-ai-agent.git',
      path: '/var/www/okr-ai-agent',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes'
    },

    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/okr-ai-agent.git',
      path: '/var/www/okr-ai-agent-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    },
  },

  // Module system configuration
  module_conf: {
    // PM2 Plus configuration
    pmx: {
      enabled: true,
      http: true,
      ignore_routes: ['/health'], // Don't monitor health check endpoint
      errors: true,
      custom_probes: true,
      network: true,
      ports: true,
    },

    // PM2 Metrics
    'pm2-server-monit': {
      enable: true,
    },
  },
};