module.exports = {
  apps: [{
    name: "arch3r_nvr",
    script: "./server.js",
    watch: false,
    ignore_watch: ["data", "public/recordings", "mediamtx.yml", "node_modules", "logs", "*.tmp", "*.json"],
    max_memory_restart: "450M",
    env: {
      NODE_ENV: "production"
    }
  }]
};
