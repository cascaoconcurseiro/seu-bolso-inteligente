import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";

const sourcePattern = /\.(?:ts|tsx)$/i;

function changedFiles() {
  const baseRef = process.env.GITHUB_BASE_REF;
  const before = process.env.GITHUB_EVENT_BEFORE;
  if (baseRef) {
    return execFileSync(
      "git",
      ["diff", "--name-only", `origin/${baseRef}...HEAD`, "--", "src"],
      { encoding: "utf8" },
    )
      .split(/\r?\n/)
      .filter(Boolean);
  }

  if (before && !/^0+$/.test(before)) {
    return execFileSync(
      "git",
      ["diff", "--name-only", `${before}..HEAD`, "--", "src"],
      { encoding: "utf8" },
    )
      .split(/\r?\n/)
      .filter(Boolean);
  }

  return execFileSync("git", ["status", "--short", "--untracked-files=all", "--", "src"], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3));
}

const files = [...new Set(changedFiles().filter((file) => sourcePattern.test(file)))];
if (files.length === 0) {
  console.log("No changed TypeScript source files to format-check.");
  process.exit(0);
}

const failures = [];
for (const file of files) {
  const info = await prettier.getFileInfo(file, { ignorePath: ".prettierignore" });
  if (info.ignored) continue;
  const source = await fs.readFile(file, "utf8");
  const config = (await prettier.resolveConfig(file)) ?? {};
  if (!(await prettier.check(source, { ...config, filepath: path.resolve(file) }))) {
    failures.push(file);
  }
}

if (failures.length > 0) {
  console.error(`Prettier check failed for:\n${failures.map((file) => `- ${file}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Prettier check passed for ${files.length} changed TypeScript source file(s).`);
}
