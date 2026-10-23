// Runs the web version: `node scripts/web.mjs` starts it in the browser, `node scripts/web.mjs build` exports it to dist/.
// It lives here rather than in package.json's scripts because changing those changes the app's fingerprint, and the
// installed Android app would then stop receiving over-the-air updates.
import { spawnSync } from "node:child_process";

const run = (command) => {
  const { status } = spawnSync(command, { stdio: "inherit", shell: true });
  if (status !== 0) process.exit(status ?? 1);
};

// Skia's drawing engine for the browser, copied from node_modules (public/.gitignore keeps it out of git)
run("npx setup-skia-web public");
run(process.argv[2] === "build" ? "npx expo export --platform web" : "npx expo start --web");
