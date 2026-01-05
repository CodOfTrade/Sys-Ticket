module.exports = {
  apps: [{
    name: 'sys-ticket-frontend',
    script: 'npx',
    args: 'vite preview --port 3002 --host 0.0.0.0',
    cwd: '/home/sys-ticket/sys-ticket/apps/frontend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
