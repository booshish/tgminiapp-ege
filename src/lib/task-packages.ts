import { taskPackageIndex } from "./task-package-index";
import { registerTaskPackage, type Task, type PracticeTaskFilter } from "./tasks";
import { getMetadataPlacement } from "./task-placement";
import { matchesTaskTaxonomy } from "./task-taxonomy";

const pending = new Map<string, Promise<void>>();
export async function ensureTaskPackages(filter?: PracticeTaskFilter, savedText = "", options: {maxPackages?:number;taskIds?:readonly string[]} = {}): Promise<void> {
  const exactIds = new Set(options.taskIds ?? []);
  const saved = taskPackageIndex.filter(p=>p.tasks.some(t=>exactIds.has(t.id)||savedText.includes(t.id)));
  const matching = taskPackageIndex.filter((p) => p.tasks.some((t) => (filter &&
    t.examType[0] === filter.examType && t.subjectId === filter.subjectId &&
    (t.subjectId !== "math" || t.level === (filter.examType === "ЕГЭ" ? filter.level ?? "profile" : null)) &&
    (filter.examNumber !== undefined || filter.topicId || filter.prototypeId) &&
    getMetadataPlacement(t).available && (filter.examNumber === undefined || getMetadataPlacement(t).number === filter.examNumber) &&
    (!filter.topicId || filter.topicId === t.topicId) && (!filter.prototypeId || filter.prototypeId === t.prototypeId) && matchesTaskTaxonomy(t,filter))));
  const selected = [...new Set([...saved,...matching.slice(0,options.maxPackages??matching.length)])];
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

/** Same digest-checked loader, restricted to the IDs visible on the current page. */
export function ensureTaskIds(ids:readonly string[]) {
  return ensureTaskPackages(undefined,"",{taskIds:ids});
}

/** Restore actual drafts/journal/attempt anchors, not every candidate ID in a practice session. */
export function savedTaskIds(rawValues:readonly string[]):string[] {
  const ids = new Set<string>();
  const add = (id:unknown) => {if(typeof id==="string"&&/^[a-z0-9-]{1,160}$/.test(id))ids.add(id);};
  const visit = (value:unknown,depth=0) => {
    if(depth>20||!value||typeof value!=="object")return;
    if(Array.isArray(value)){for(const item of value)visit(item,depth+1);return;}
    const obj=value as Record<string,unknown>;
    const selection=obj.selection as Record<string,unknown>|undefined;
    const practice=selection&&(selection.mode==="number"||selection.mode==="topic");
    if(practice&&Array.isArray(obj.taskIds))add(obj.lastTaskId??obj.taskIds[typeof obj.lastPosition==="number"?obj.lastPosition:0]);
    for(const [key,item] of Object.entries(obj)){
      if(key==="taskIds"&&practice)continue;
      if(["taskId","lastTaskId","itemId"].includes(key))add(item);
      if(key==="taskIds"&&Array.isArray(item))for(const id of item)add(id);
      if((key==="taskStates"||key==="states")&&item&&typeof item==="object")for(const id of Object.keys(item))add(id);
      visit(item,depth+1);
    }
  };
  for(const raw of rawValues){if(raw.length>8_000_000)continue;try{visit(JSON.parse(raw));}catch{/* Existing store parsers own invalid/unknown schemas. */}}
  return [...ids];
}
