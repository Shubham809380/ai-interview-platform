const http = require("http");
const { env } = require("./config/env");
const { connectDb } = require("./config/db");
const { app } = require("./app");
const { ensureSeedData } = require("./scripts/seed");
function checkExistingBackendHealth(port) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/health",
        timeout: 1800
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode !== 200) {
            resolve(false);
            return;
          }
          try {
            const payload = JSON.parse(body || "{}");
            resolve(payload?.status === "ok");
          } catch {
            resolve(false);
          }
        });
      }
    );
    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}
function holdProcessInReuseMode(port) {
  console.warn(`Port ${port} is already serving a healthy backend. Reusing existing instance.`);
  console.warn("This watcher process is idle so frontend + user login can continue normally.");
  setInterval(() => {
  }, 60 * 60 * 1e3);
}
async function bootstrap() {
  const alreadyRunning = await checkExistingBackendHealth(env.port);
  if (alreadyRunning) {
    holdProcessInReuseMode(env.port);
    return;
  }
  await connectDb();
  await ensureSeedData();
  const server = app.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port}`);
  });
  server.on("error", async (error) => {
    if (error.code === "EADDRINUSE") {
      const healthyExistingServer = await checkExistingBackendHealth(env.port);
      if (healthyExistingServer) {
        holdProcessInReuseMode(env.port);
        return;
      }
      console.error(
        `Port ${env.port} is already in use. Stop the existing process or set a different PORT in backend/.env.`
      );
      process.exit(1);
    }
    console.error("Server startup error:", error);
    process.exit(1);
  });
}
bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});