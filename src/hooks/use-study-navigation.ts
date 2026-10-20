"use client";

import { useCallback, useEffect, useState } from "react";
import { tasks } from "@/lib/tasks";
import {
  viewTitles,
  type Route,
  type Selection,
  type View,
} from "@/lib/navigation";

function readRoute(): Route {
  const [path, query] = window.location.hash.replace(/^#\/?/, "").split("?");
  const [view, index] = path.split("/");
  const params = new URLSearchParams(query);
  const taskIndex = Number(index);
  return {
    view: Object.hasOwn(viewTitles, view) ? (view as View) : "home",
    taskIndex:
      Number.isInteger(taskIndex) && taskIndex >= 0 && taskIndex < tasks.length
        ? taskIndex
        : 0,
    topicId: params.get("topic") || undefined,
    prototypeId: params.get("prototype") || undefined,
    materialId: params.get("material") || undefined,
  };
}

export function useStudyNavigation() {
  const [route, setRoute] = useState<Route>({ view: "home", taskIndex: 0 });
  useEffect(() => {
    setRoute(readRoute());
    window.history.replaceState(
      { ...window.history.state, tochkaDepth: 0 },
      "",
    );
    const update = () => setRoute(readRoute());
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);

  const navigate = useCallback(
    (view: View, selection: number | Selection = {}) => {
      const selected =
        typeof selection === "number" ? { taskIndex: selection } : selection;
      const index = selected.taskIndex ?? 0;
      const safeIndex =
        Number.isInteger(index) && index >= 0 && index < tasks.length
          ? index
          : 0;
      const params = new URLSearchParams();
      if (selected.topicId) params.set("topic", selected.topicId);
      if (selected.prototypeId) params.set("prototype", selected.prototypeId);
      if (selected.materialId) params.set("material", selected.materialId);
      const query = params.toString();
      const hash = `#/${view}${view === "tasks" ? `/${safeIndex}` : ""}${query ? `?${query}` : ""}`;
      if (window.location.hash === hash) return;
      window.history.pushState(
        { tochkaDepth: (Number(window.history.state?.tochkaDepth) || 0) + 1 },
        "",
        hash,
      );
      setRoute({
        view,
        taskIndex: safeIndex,
        topicId: selected.topicId,
        prototypeId: selected.prototypeId,
        materialId: selected.materialId,
      });
    },
    [],
  );

  const back = useCallback(() => {
    if (window.history.state?.tochkaDepth > 0) window.history.back();
    else navigate("home");
  }, [navigate]);
  return { route, navigate, back };
}
