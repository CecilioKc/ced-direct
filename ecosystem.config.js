// PM2 process for CED-Direct. From the app folder:
//   pm2 start ecosystem.config.js ; pm2 save
// Run `npm run build` first (with NEXT_PUBLIC_BASE_PATH set).
module.exports = {
  apps: [
    {
      name: "ced-direct",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: "3003",
        HOSTNAME: "127.0.0.1",
        // Auth.js builds its callback/URLs from AUTH_URL; set it here so the
        // process always has it. Must match the basePath in auth.ts and the
        // Entra redirect URI. NEXT_PUBLIC_APP_URL is used for public survey links.
        AUTH_URL: "https://aitc.pvamu.edu/cafnr/ced-direct/api/auth",
        AUTH_TRUST_HOST: "true",
        NEXT_PUBLIC_BASE_PATH: "/cafnr/ced-direct",
        NEXT_PUBLIC_APP_URL: "https://aitc.pvamu.edu/cafnr/ced-direct",
      },
    },
  ],
};
