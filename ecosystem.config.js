module.exports = {
  apps: [
    {
      name: "api-mock",
      namespace: "megabot",
      script: "src/main.js",
      watch: ".",
      cron_restart: "0 8 * * *",
    },
  ],
};
