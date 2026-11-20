import { execFileSync, spawn } from "node:child_process";

const PORTS = [5137, 8787];

function pidsOnPort(port) {
  try {
    return execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" })
      .split("\n")
      .map((line) => Number(line.trim()))
      .filter((pid) => pid > 0 && pid !== process.pid);
  } catch {
    return [];
  }
}

function freePorts() {
  for (const port of PORTS) {
    const pids = pidsOnPort(port);
    if (pids.length === 0) continue;
    console.log(`端口 ${port} 被占用，结束进程: ${pids.join(", ")}`);
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {}
    }
  }
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && PORTS.some((port) => pidsOnPort(port).length > 0)) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  for (const port of PORTS) {
    for (const pid of pidsOnPort(port)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
  }
}

freePorts();

const children = [
  spawn("pnpm", ["dev"], { stdio: "inherit" }),
  spawn(
    "pnpm",
    [
      "exec",
      "wrangler",
      "dev",
      "--env",
      "local",
      "--var",
      "LOCAL_DEV:true",
      "--assets",
      "./public",
      "--ip",
      "127.0.0.1",
      "--port",
      "8787",
    ],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code ?? 1));
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
