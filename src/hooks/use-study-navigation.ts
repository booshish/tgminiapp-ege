"use client";

import { useCallback, useEffect, useState } from "react";
import { tasks } from "@/lib/tasks";
import {
  parseStudyRoute,
  type Route,
  type Selection,
  type View,
} from "@/lib/navigation";

function readRoute(): Route {
  return parseStudyRoute(window.location.hash, tasks.length);
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
          : view === "tasks"
            ? -1
            : 0;
      const params = new URLSearchParams();
      if (selected.topicId) params.set("topic", selected.topicId);
      if (selected.prototypeId) params.set("prototype", selected.prototypeId);
      if (selected.materialId) params.set("material", selected.materialId);
      if (selected.exam) params.set("exam", selected.exam);
      if (selected.subjectId) params.set("subject", selected.subjectId);
      if (selected.level) params.set("level", selected.level);
      if (selected.catalogMode) params.set("mode", selected.catalogMode);
      if (selected.examNumber)
        params.set("number", String(selected.examNumber));
      if (selected.sessionId) params.set("session", selected.sessionId);
      const query = params.toString();
      const hash = `#/${view}${view === "tasks" ? `/${safeIndex}` : ""}${query ? `?${query}` : ""}`;
      if (window.location.hash === hash) return;
      window.history.pushState(
        { tochkaDepth: (Number(window.history.state?.tochkaDepth) || 0) + 1 },
        "",
        hash,
      );
      setRoute({
        ...selected,
        view,
        taskIndex: safeIndex,
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
