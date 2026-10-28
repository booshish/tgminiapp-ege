import { taskTaxonomyData } from "./content/task-taxonomy-data";
import { getExamDefinition, type ExamSelection } from "./exams";

export type TaxonomyFilters = { subtypeId?:string; taxonomyTopicId?:string; subtopicId?:string; sourceCategoryId?:string };
export const taxonomyFilterKeys = ["subtypeId","taxonomyTopicId","subtopicId","sourceCategoryId"] as const;
export type SourceCategoryId="tochka-original"|"fipi-open-bank"|"fipi-demo"|"egkr"|"official-past-exams"|"other-verified"|"unconfirmed";
export const taskSourceCategories:readonly {id:SourceCategoryId;title:string;thirdParty:boolean}[]=[
  {id:"tochka-original",title:"Оригинальные задания «Точки»",thirdParty:false},
  {id:"fipi-open-bank",title:"Открытый банк ФИПИ",thirdParty:true},
  {id:"fipi-demo",title:"Демонстрационные варианты ФИПИ",thirdParty:true},
  {id:"egkr",title:"ЕГКР",thirdParty:true},
  {id:"official-past-exams",title:"Официальные экзамены прошлых лет",thirdParty:true},
  {id:"other-verified",title:"Другие подтверждённые источники",thirdParty:true},
  {id:"unconfirmed",title:"Происхождение требует проверки",thirdParty:true},
];
export type TaxonomyNode={id:string;kind:"topic"|"subtopic"|"subtype";subjectId:string;title:string;parentId?:string};
export type TaxonomyAssignment=[modelId:string,number:number|null,topicId:string,subtopicId:string|null,subtypeId:string|null,source:SourceCategoryId];
export type TaxonomyData={schemaVersion:1;nodes:Record<string,TaxonomyNode>;assignments:Record<string,TaxonomyAssignment>};
export const taxonomyNodes=taskTaxonomyData.nodes;
export function getTaskClassification(id:string){
  const r=taskTaxonomyData.assignments[id];
  return r?{modelId:r[0],number:r[1],topicId:r[2],subtopicId:r[3],subtypeId:r[4],sourceCategoryId:r[5],status:r[3]&&r[4]?"authored-family-reviewed" as const:"needs-editorial-review" as const}:null;
}
export function matchesTaskTaxonomy(task:{id:string},filter:TaxonomyFilters){
  if(!taxonomyFilterKeys.some(key=>filter[key]))return true;
  const c=getTaskClassification(task.id);if(!c)return false;
  return (!filter.subtypeId||c.subtypeId===filter.subtypeId)&&(!filter.taxonomyTopicId||c.topicId===filter.taxonomyTopicId)&&(!filter.subtopicId||c.subtopicId===filter.subtopicId)&&(!filter.sourceCategoryId||c.sourceCategoryId===filter.sourceCategoryId);
}
/** Clear thematic constraints, not the independently selected provenance. */
export function clearNumberThemes(filters:TaxonomyFilters):TaxonomyFilters {
  return {taxonomyTopicId:undefined,subtopicId:undefined,subtypeId:undefined,sourceCategoryId:filters.sourceCategoryId};
}
/** Metadata only. Opening filters never downloads task conditions or answers. */
export function getNumberTaxonomyOptions(selection:ExamSelection&{examNumber?:number}&TaxonomyFilters){
  const model=getExamDefinition(selection);
  const entries=Object.entries(taskTaxonomyData.assignments).filter(([,r])=>r[0]===model?.id&&r[1]===selection.examNumber);
  const options=(kind:TaxonomyNode["kind"],column:2|3|4)=>{
    const scoped=entries.filter(([,r])=>(!selection.sourceCategoryId||r[5]===selection.sourceCategoryId)&&(column===2||(!selection.taxonomyTopicId||r[2]===selection.taxonomyTopicId)&&(column!==4||!selection.subtopicId||r[3]===selection.subtopicId)));
    // Unreviewed broad labels stay in the general bank, not a claimed detailed taxonomy.
    const reviewed=scoped.filter(([,r])=>r[3]&&r[4]);
    return [...new Set(reviewed.map(([,r])=>r[column]).filter((id):id is string=>Boolean(id)))].map(id=>({id,title:taxonomyNodes[id].title,count:scoped.filter(([,r])=>r[column]===id).length,parentId:taxonomyNodes[id].parentId,kind})).sort((a,b)=>a.title.localeCompare(b.title,"ru"));
  };
  const sourceScope=entries.filter(([id])=>matchesTaskTaxonomy({id},{...selection,sourceCategoryId:undefined}));
  return {topics:options("topic",2),subtopics:options("subtopic",3),subtypes:options("subtype",4),sources:taskSourceCategories.map(s=>({...s,count:sourceScope.filter(([,r])=>r[5]===s.id).length})),total:entries.length,matching:entries.filter(([id])=>matchesTaskTaxonomy({id},selection)).length,needsReview:entries.filter(([,r])=>!r[3]||!r[4]).length};
}
