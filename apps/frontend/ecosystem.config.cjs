module.exports = {
  apps: [{
    name: 'sys-ticket-frontend',
    script: 'npm',
    args: 'run preview',
    cwd: '/home/sys-ticket/sys-ticket/apps/frontend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
};
