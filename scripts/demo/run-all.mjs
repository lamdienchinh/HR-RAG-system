import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const spawnOptions = (extra = {}) => ({
  stdio: "inherit",
  shell: isWindows,
  ...extra,
});

const run = (command, args, label) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, spawnOptions());

    child.on("error", (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} exited with ${signal ?? `code ${code ?? "unknown"}`}`,
        ),
      );
    });
  });

const check = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, spawnOptions({ stdio: "ignore", shell: isWindows }));

    child.on("error", () => {
      resolve(false);
    });
    child.on("exit", (code) => {
      resolve(code === 0);
    });
  });

const sleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const waitForPostgres = async () => {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const ready = await check("docker", [
      "compose",
      "exec",
      "-T",
      "postgres",
      "pg_isready",
      "-U",
      "rag",
      "-d",
      "rag_hr",
    ]);
    if (ready) {
      return;
    }
    await sleep(1000);
  }
  throw new Error("PostgreSQL did not become ready within 30 seconds");
};

const startService = (command, args, label) => {
  // Sửa: Áp dụng cấu hình shell
  const child = spawn(command, args, spawnOptions());

  child.on("error", (error) => {
    console.error(`${label} failed to start: ${error.message}`);
    process.exitCode = 1;
  });
  return child;
};

const waitForExit = (child, label) =>
  new Promise((resolve, reject) => {
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} exited with ${signal ?? `code ${code ?? "unknown"}`}`,
        ),
      );
    });
  });

const main = async () => {
  console.log("Starting PostgreSQL/pgvector...");
  await run("docker", ["compose", "up", "-d", "postgres"], "docker compose");
  await waitForPostgres();

  console.log("Seeding HR policies and pgvector chunks...");
  await run("pnpm", ["demo:db:seed"], "database seed");

  console.log("Starting Express API and React app...");
  const api = startService("pnpm", ["demo:api:dev"], "Express API");
  const web = startService("pnpm", ["demo:web:dev"], "React app");
  const children = [api, web];

  const stopChildren = () => {
    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
    }
  };

  process.once("SIGINT", () => {
    stopChildren();
  });
  process.once("SIGTERM", () => {
    stopChildren();
  });

  console.log(
    "Demo ready: API http://localhost:4000, Web http://localhost:5174",
  );
  await Promise.race([
    waitForExit(api, "Express API"),
    waitForExit(web, "React app"),
  ]);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
