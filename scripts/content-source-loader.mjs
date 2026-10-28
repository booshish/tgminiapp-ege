import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));

/** Load our own TypeScript data without a build, dependencies or database writes. */
export function createContentLoader({ revision } = {}) {
  const cache = new Map();
  const nativeRequire = createRequire(import.meta.url);
  function load(file) {
    const absolute = resolve(projectRoot, file);
    const sourcePath = extname(absolute) ? absolute : `${absolute}.ts`;
    if (cache.has(sourcePath)) return cache.get(sourcePath).exports;
    const repoPath = relative(projectRoot, sourcePath).replaceAll("\\", "/");
    if (repoPath.startsWith("../")) throw new Error("Source must stay in this project");
    const source = revision
      ? execFileSync("git", ["show", `${revision}:${repoPath}`], { cwd: projectRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
      : readFileSync(sourcePath, "utf8");
    const { outputText, diagnostics } = ts.transpileModule(source, {
      fileName: sourcePath,
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });
    const errors = diagnostics?.filter((entry) => entry.category === ts.DiagnosticCategory.Error) ?? [];
    if (errors.length) throw new Error(`TypeScript syntax error in ${repoPath}`);
    const sourceModule = { exports: {} };
    cache.set(sourcePath, sourceModule);
    const requireSource = (specifier) => {
      if (specifier.startsWith("@/")) return load(resolve(projectRoot, "src", specifier.slice(2)));
      if (specifier.startsWith(".")) return load(resolve(dirname(sourcePath), specifier));
      return nativeRequire(specifier);
    };
    // Only repository-owned source files are evaluated; no downloaded content is loaded.
    new Function("require", "module", "exports", outputText)(requireSource, sourceModule, sourceModule.exports);
    return sourceModule.exports;
  }
  return load;
}

export function loadContent(options) {
  const load = createContentLoader(options);
  const exams = load("src/lib/exams.ts");
  // Frozen source/publication reports use the source-era definitions. Current
  // presentation placements are separately validated, never written into bodies.
  return {
    ...load("src/lib/tasks.ts"),
    ...load("src/lib/theory.ts"),
    ...exams,
    activeExamDefinitions:exams.examDefinitions,
    examDefinitions:exams.legacyExamDefinitions ?? exams.examDefinitions,
  };
}
