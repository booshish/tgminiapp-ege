import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build"], {
  env: { ...process.env, GITHUB_PAGES: "true" },
  stdio: "inherit",
});

if (result.error) {
  console.error("Не удалось запустить сборку GitHub Pages:", result.error);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

// GitHub Pages должен отдавать каталог _next без обработки через Jekyll.
writeFileSync(resolve("out", ".nojekyll"), "");
console.log("Сборка GitHub Pages готова в папке out.");
