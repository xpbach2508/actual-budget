import { useCallback, useEffect, useRef, useState } from 'react';

import type { Query } from '@actual-app/core/shared/query';

import { pagedQuery } from '#queries/pagedQuery';
import type { PagedQuery } from '#queries/pagedQuery';

type UsePagedQueryOptions = {
  pageCount: number;
};

export function usePagedQuery<T>(
  query: Query,
  { pageCount }: UsePagedQueryOptions,
) {
  const paged = useRef<PagedQuery<T> | null>(null);
  const [data, setData] = useState<ReadonlyArray<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    setData(null);
    setIsLoading(true);

    const next = pagedQuery<T>(query, {
      onData: data => {
        setData(data);
        setHasNext(next.hasNext);
        setIsLoading(false);
      },
      onError: () => setIsLoading(false),
      options: { pageCount },
    });
    paged.current = next;
    setHasNext(next.hasNext);

    return () => {
      next.unsubscribe();
      if (paged.current === next) {
        paged.current = null;
      }
    };
  }, [pageCount, query]);

  const fetchNext = useCallback(async () => {
    await paged.current?.fetchNext();
    setHasNext(paged.current?.hasNext ?? false);
  }, []);

  return { data, isLoading, hasNext, fetchNext };
}
