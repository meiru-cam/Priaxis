module.exports = {
  apps: [{
    name: "obsidian-bridge",
    script: "./scripts/mcp-bridge.js",
    watch: ["scripts"],
    ignore_watch: ["node_modules", "logs"],
    autorestart: true,
    env: {
      NODE_ENV: "development",
      BRIDGE_PORT: 3002
    },
    error_file: "./logs/bridge-error.log",
    out_file: "./logs/bridge-out.log",
    merge_logs: true,
    time: true
  }]
}
