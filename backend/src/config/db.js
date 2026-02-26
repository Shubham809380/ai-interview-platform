const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const mongoose = require("mongoose");
const { env } = require("./env");

const LOCAL_MONGO_REGEX = /^mongodb:\/\/(127\.0\.0\.1|localhost):27017(\/|$)/i;

function shouldTryLocalMongoAutoStart(error) {
  const enabled = String(process.env.MONGO_AUTOSTART_LOCAL || "true").toLowerCase() !== "false";
  if (!enabled || process.platform !== "win32") {
    return false;
  }

  if (!LOCAL_MONGO_REGEX.test(String(env.mongoUri || "").trim())) {
    return false;
  }

  const text = String(error?.message || "");
  return text.includes("ECONNREFUSED") || text.includes("Server selection timed out");
}

function waitForPort({ host, port, timeoutMs = 20000, intervalMs = 500 }) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    function tryConnect() {
      const socket = net.createConnection({ host, port });
      let done = false;

      const finish = (value) => {
        if (done) return;
        done = true;
        socket.destroy();
        resolve(value);
      };

      socket.setTimeout(1200);
      socket.once("connect", () => finish(true));
      socket.once("timeout", () => finish(false));
      socket.once("error", () => finish(false));

      setTimeout(() => {
        if (done) return;
        finish(false);
      }, 1300);
    }

    (function loop() {
      tryConnect().then((ok) => {
        if (ok) {
          resolve(true);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }

        setTimeout(loop, intervalMs);
      });
    })();
  });
}

function tryStartLocalMongoProcess() {
  const mongoExe = process.env.MONGO_BIN_PATH || "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe";
  if (!fs.existsSync(mongoExe)) {
    return { started: false, reason: `mongod not found at ${mongoExe}` };
  }

  const projectRoot = path.join(__dirname, "..", "..");
  const dataDir = process.env.MONGO_LOCAL_DATA_DIR || path.join(projectRoot, ".mongodb", "data");
  const logDir = process.env.MONGO_LOCAL_LOG_DIR || path.join(projectRoot, ".mongodb", "log");
  const logPath = process.env.MONGO_LOCAL_LOG_PATH || path.join(logDir, "mongod.log");

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });

  const child = spawn(
    mongoExe,
    ["--dbpath", dataDir, "--logpath", logPath, "--bind_ip", "127.0.0.1", "--port", "27017"],
    { detached: true, stdio: "ignore", windowsHide: true }
  );
  child.unref();

  return { started: true, pid: child.pid, logPath };
}

async function connectDb() {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
    return mongoose.connection;
  } catch (error) {
    if (!shouldTryLocalMongoAutoStart(error)) {
      throw error;
    }

    const startResult = tryStartLocalMongoProcess();
    if (!startResult.started) {
      throw new Error(
        `MongoDB connection failed and auto-start skipped: ${startResult.reason}. Original error: ${error.message}`
      );
    }

    const isReady = await waitForPort({ host: "127.0.0.1", port: 27017, timeoutMs: 25000, intervalMs: 600 });
    if (!isReady) {
      throw new Error(
        `MongoDB auto-start attempted (pid ${startResult.pid}) but port 27017 did not become ready. Check log: ${startResult.logPath}`
      );
    }

    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
    return mongoose.connection;
  }
}

module.exports = { connectDb };
