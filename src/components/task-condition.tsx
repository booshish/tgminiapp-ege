import type { Task } from "@/lib/tasks";
import { MathFormula } from "./math-formula";
import { TriangleDiagram } from "./illustrations";

/** The same complete condition in the reader and answer card; no answers or hints. */
export function TaskCondition({task,prompt=task.prompt}:{task:Task;prompt?:string}){
  return <>
    <p className="task-prompt">{prompt}</p>
    {task.resources && <section aria-label="Материалы задания"><h2>Материалы задания</h2><ul>
      {task.resources.map(resource=><li key={resource.name}><a download={resource.name} href={`data:text/plain;charset=utf-8,${encodeURIComponent(resource.content)}`}>{resource.name} · скачать</a></li>)}
    </ul></section>}
    {task.diagram?.type==="right-triangle"&&<div className="task-diagram-wrap">
      <TriangleDiagram adjacent={task.diagram.adjacent} opposite={task.diagram.opposite}/><span className="task-diagram-caption">Рисунок к условию</span>
    </div>}
    {task.conditionLatex&&<div className="task-formula"><MathFormula latex={task.conditionLatex} block/></div>}
  </>;
}
