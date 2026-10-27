import type { Task } from "./tasks";
import { getExamDefinition } from "./exams";
import { placements2027 } from "./content/placements-2027";

export const activeStructureVersion = "2027-placement-v1";
const cache = new WeakMap<Task, Task>();

/** Immutable source tasks stay intact. This is an ID-preserving presentation view. */
export function getTaskView(task: Task): Task {
  if(task.originExam)return task;
  const map=placements2027[task.id];
  if(!map&&(task.subjectId!=="math"||task.examYear===2027))return task;
  const prior=cache.get(task);if(prior)return prior;
  const valid=map&&map.sourceVersion===task.examVersionId&&map.sourceNumber===task.examNumber;
  const compatible=valid&&map.decision!=="history-only";
  const definition=getExamDefinition({examType:task.examType[0],subjectId:task.subjectId,level:task.level});
  const number=compatible?map.number:null,slot=definition?.numbers.find(n=>n.number===number);
  const result:Task={...task,originExam:{examVersionId:task.examVersionId,examYear:task.examYear,examNumber:task.examNumber,part:task.part,scoring:task.scoring,availability:task.availability},
    ...(task.level === "base" && task.examNumber === 1 && number === 1 ? { activeTheoryTopicId:"ege-base-number-14" } : {}),
    ...(task.id === "multi-subject-20261026-25" ? {activeTheoryTopicId:"ege-informatics-n13"} : {}),
    examVersionId:definition?.versionId??task.examVersionId,examYear:2027,examNumber:number,part:slot?.part??null,
    ...(compatible?{}:{availability:"history-only"}),
    scoring:{status:number===null?"not-applicable":"pending-official-verification",maxPrimaryScore:slot?.maxPrimaryScore??null},
    placementReview:{version:activeStructureVersion,compatible:Boolean(compatible),criteriaCompatible:Boolean(valid&&map.criteriaCompatible),reason:valid?map.reason:"Нет проверенного соответствия 2027; материал сохранён вне актуальной номерной практики"},
  };
  cache.set(task,result);return result;
}

export function getMetadataPlacement(task: {id:string;examNumber:number|null;subjectId:string;examYear?:number;examVersionId?:string}) {
  const map=placements2027[task.id];
  if(task.subjectId!=="math"&&!map)return {number:task.examNumber,available:true};
  if(!map&&task.examYear===2027&&task.examVersionId?.endsWith("2027-draft"))return {number:task.examNumber,available:true};
  return {number:map?.number??null,available:Boolean(map&&map.decision!=="history-only")};
}

/** Match historical journal identity, not today's presentation number. */
export function getTaskOrigin(task: Task) {
  return task.originExam?{...task,...task.originExam,originExam:undefined}:task;
}
