import type { PublicationCandidate } from "../content-publication";
import { reviewedOriginalIds } from "./original-publication-ids";
import { reviewedExpansionIds } from "./expansion-publication-ids";

/** Explicit reviewed repository collections; an arbitrary `kind: author` is not a permission. */
const collections = {
  "legacy-tasks": { file: "src/lib/tasks.ts", tests: ["scripts/test-demo.mjs", "scripts/test-gamification.mjs"] },
  "oge-bank": { file: "src/lib/content/oge-bank.ts", tests: ["scripts/test-oge-bank.mjs"] },
  "ege-bank": { file: "src/lib/content/ege-bank.ts", tests: ["scripts/test-ege-bank.mjs"] },
  "challenge-bank": { file: "src/lib/content/challenge-bank.ts", tests: ["scripts/test-challenge-bank.mjs"] },
  "foundation-theory": { file: "src/lib/theory.ts", tests: ["scripts/test-number-theory.mjs", "scripts/test-foundation-learning-checks.mjs"] },
  "number-theory": { file: "src/lib/content/number-theory.ts", tests: ["scripts/test-number-theory.mjs"] },
  "base-bank": { file: "src/lib/content/base-bank.ts", tests: ["scripts/test-base-bank.mjs", "scripts/test-exam-quality.mjs"] },
  "base-theory": { file: "src/lib/content/base-theory.ts", tests: ["scripts/test-base-theory.mjs"] },
  "informatics-bank": { file: "src/lib/content/informatics-bank.ts", tests: ["scripts/test-subject-expansion.mjs"] },
} as const;
export type OriginalCollection = keyof typeof collections;

/** This records automated repository checks, never an official or expert endorsement. */
export function originalPublication(id: string, collection: OriginalCollection): PublicationCandidate {
  const record = collections[collection];
  const expansion = (reviewedExpansionIds[collection] ?? []).includes(id);
  const reviewed = expansion || ((reviewedOriginalIds as Readonly<Record<string, readonly string[]>>)[collection] ?? []).includes(id);
  return {
    id,
    provenance: {
      sourceIds: ["tochka-project-original"],
      authorship: "project-original",
      sourceFiles: collection === "foundation-theory"
        ? [record.file, "src/lib/content/foundation-learning-checks.ts"] : [record.file],
      attribution: ["Авторский материал проекта «Точка»"],
    },
    validation: reviewed
      ? { status: "automated-reviewed", checkedAt: expansion ? "2026-10-22" : "2026-10-21", evidence: [...record.tests] }
      : { status: "pending", evidence: [] },
    releaseStatus: reviewed ? "published" : "draft",
  };
}
