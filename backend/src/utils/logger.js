function safeMeta(meta) {
  if (!meta || typeof meta !== "object") {
    return {};
  }

  const normalized = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) {
      continue;
    }

    if (value instanceof Error) {
      normalized[key] = {
        name: value.name,
        message: value.message
      };
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function write(level, message, meta = {}) {
  const payload = {
    time: new Date().toISOString(),
    level,
    message,
    ...safeMeta(meta)
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

const logger = {
  info(message, meta) {
    write("info", message, meta);
  },
  warn(message, meta) {
    write("warn", message, meta);
  },
  error(message, meta) {
    write("error", message, meta);
  }
};

module.exports = { logger };
