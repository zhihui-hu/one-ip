import { spawn } from "node:child_process";

const children = [
  spawn("pnpm", ["dev"], { stdio: "inherit" }),
  spawn(
    "pnpm",
    [
      "exec",
      "wrangler",
      "dev",
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
