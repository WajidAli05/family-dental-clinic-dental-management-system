import { useState, useCallback } from "react";

export function useTableSort(defaultKey = "date", defaultDir = "desc") {
  const [sortBy, setSortBy] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const toggle = useCallback(
    (key) => {
      if (key === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortDir("desc");
      }
    },
    [sortBy]
  );

  // Returns props to spread on a <th> or header button
  const headerProps = useCallback(
    (key) => ({
      onClick: () => toggle(key),
      className: "cursor-pointer select-none whitespace-nowrap",
      "aria-sort": sortBy === key ? (sortDir === "asc" ? "ascending" : "descending") : "none",
    }),
    [toggle, sortBy, sortDir]
  );

  // Chevron indicator character
  const indicator = useCallback(
    (key) => {
      if (key !== sortBy) return " ↕";
      return sortDir === "asc" ? " ↑" : " ↓";
    },
    [sortBy, sortDir]
  );

  return { sortBy, sortDir, toggle, headerProps, indicator };
}
