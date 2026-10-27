import { taskPackageIndex } from "./task-package-index";
import { registerTaskPackage, type Task, type PracticeTaskFilter } from "./tasks";
import { getMetadataPlacement } from "./task-placement";

const pending = new Map<string, Promise<void>>();
export async function ensureTaskPackages(filter?: PracticeTaskFilter, savedText = ""): Promise<void> {
  const selected = taskPackageIndex.filter((p) => p.tasks.some((t) => savedText.includes(t.id) || (filter &&
    t.examType[0] === filter.examType && t.subjectId === filter.subjectId &&
    (t.subjectId !== "math" || t.level === (filter.examType === "ЕГЭ" ? filter.level ?? "profile" : null)) &&
    (filter.examNumber !== undefined || filter.topicId || filter.prototypeId) &&
    getMetadataPlacement(t).available && (filter.examNumber === undefined || getMetadataPlacement(t).number === filter.examNumber) &&
    (!filter.topicId || filter.topicId === t.topicId) && (!filter.prototypeId || filter.prototypeId === t.prototypeId))));
  await Promise.all(selected.map((entry) => {
    if (!pending.has(entry.file)) {
      const request = (async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/task-packages/${entry.file}`);
        if (!response.ok) throw Error("Не удалось загрузить пакет заданий");
        const body = await response.text();
        const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
        const digest = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
        if (digest !== entry.sha256) throw Error("Пакет заданий повреждён");
        const items: Task[] = JSON.parse(body);
        if (!Array.isArray(items) || items.length !== entry.tasks.length || items.some((t, i) => t.id !== entry.tasks[i].id)) throw Error("Неверный состав пакета");
        registerTaskPackage(items);
      })();
      pending.set(entry.file, request);
      request.catch(() => pending.delete(entry.file)); // A failed request can be retried.
    }
    return pending.get(entry.file)!;
  }));
}
