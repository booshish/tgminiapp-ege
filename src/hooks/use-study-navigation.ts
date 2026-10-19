"use client";

import { useCallback, useEffect, useState } from "react";
import { tasks } from "@/lib/demo";
import { viewTitles, type Route, type View } from "@/lib/navigation";

function readRoute(): Route {
  const [view, index] = window.location.hash.replace(/^#\/?/, "").split("/");
  const taskIndex = Number(index);
  return {
    view: Object.hasOwn(viewTitles, view) ? (view as View) : "home",
    taskIndex:
      Number.isInteger(taskIndex) && taskIndex >= 0 && taskIndex < tasks.length
        ? taskIndex
        : 0,
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
    const updateRoute = () => setRoute(readRoute());
    window.addEventListener("popstate", updateRoute);
    window.addEventListener("hashchange", updateRoute);
    return () => {
      window.removeEventListener("popstate", updateRoute);
      window.removeEventListener("hashchange", updateRoute);
    };
  }, []);

  const navigate = useCallback(
    (view: View, taskIndex = 0) => {
      const safeIndex =
        Number.isInteger(taskIndex) &&
        taskIndex >= 0 &&
        taskIndex < tasks.length
          ? taskIndex
          : 0;
      if (
        route.view === view &&
        (view !== "tasks" || route.taskIndex === safeIndex)
      )
        return;
      const hash = `#/${view}${view === "tasks" ? `/${safeIndex}` : ""}`;
      window.history.pushState(
        { tochkaDepth: (Number(window.history.state?.tochkaDepth) || 0) + 1 },
        "",
        hash,
      );
      setRoute({ view, taskIndex: safeIndex });
    },
    [route],
  );

  const back = useCallback(() => {
    if (window.history.state?.tochkaDepth > 0) window.history.back();
    else navigate("home");
  }, [navigate]);

  return { route, navigate, back };
}
