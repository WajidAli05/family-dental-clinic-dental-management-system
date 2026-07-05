import { useState, useCallback } from "react";

export function usePagination(defaultLimit = 50) {
  const [page, setPage] = useState(1);
  const [limit] = useState(defaultLimit);

  const resetPage = useCallback(() => setPage(1), []);

  const goTo = useCallback((p) => setPage(p), []);

  return { page, limit, setPage: goTo, resetPage };
}
