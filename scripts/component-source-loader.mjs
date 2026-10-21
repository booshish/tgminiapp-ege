import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/** Load repository TS/TSX for component rendering; CSS is tested in the browser. */
export function createComponentLoader() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const nativeRequire = createRequire(import.meta.url);
  const cache = new Map();
  function load(file) {
    let path = resolve(root, file);
    if (relative(root, path).startsWith("..")) throw new Error("Only repository components may be loaded");
    if (!extname(path)) path += existsSync(`${path}.tsx`) ? ".tsx" : ".ts";
    if (path.endsWith(".css")) return {};
    if (cache.has(path)) return cache.get(path).exports;
    const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
      fileName: path,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    const sourceModule = { exports: {} };
    cache.set(path, sourceModule);
    const requireSource = (id) => id.startsWith("@/") ? load(resolve(root, "src", id.slice(2)))
      : id.startsWith(".") ? load(resolve(dirname(path), id)) : nativeRequire(id);
    new Function("require", "module", "exports", outputText)(requireSource, sourceModule, sourceModule.exports);
    return sourceModule.exports;
  }
  return load;
}
