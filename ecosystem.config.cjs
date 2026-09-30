// pm2 process file for self-hosting on this machine (replaces Vercel).
// Start:  npm run selfhost:start     Logs: npx pm2 logs     Status: npx pm2 ls
// See docs/self-hosting.md.
const path = require("node:path"); // eslint-disable-line @typescript-eslint/no-require-imports

const cwd = __dirname;

module.exports = {
  apps: [
    {
      name: "sf-web",
      cwd,
      script: path.join(cwd, "node_modules/next/dist/bin/next"),
      // No -H: binding to 127.0.0.1 makes next-intl's localhost rewrite look external → proxy loop.
      args: "start -p 3000",
      env: { NODE_ENV: "production" },
      max_memory_restart: "1500M",
      restart_delay: 3000,
    },
    {
      name: "sf-cron",
      cwd,
      script: path.join(cwd, "scripts/selfhost/cron-runner.mjs"),
      restart_delay: 5000,
    },
    {
      // Public ingress. Named tunnel if ~/.cloudflared/config.yml exists, else a
      // temporary *.trycloudflare.com URL (printed in `pm2 logs sf-tunnel`).
      name: "sf-tunnel",
      cwd,
      script: path.join(cwd, "scripts/selfhost/tunnel.sh"),
      interpreter: "bash",
      restart_delay: 5000,
    },
    {
      // Postgres lives in Docker; make sure Docker Desktop is up after a reboot
      // (the container itself has restart: unless-stopped).
      name: "sf-docker",
      script: "/usr/bin/open",
      args: "-g -a Docker",
      interpreter: "none",
      autorestart: false,
    },
    {
      // Keep the Mac from idle-sleeping while the server runs.
      name: "sf-awake",
      script: "/usr/bin/caffeinate",
      args: "-i -s",
      interpreter: "none",
    },
  ],
};
