/* eslint-disable react-hooks/exhaustive-deps */
// TODO: Add refetchInterval

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRerender } from './useRerender';
import { QueryClient } from './QueryClient';

const queryClient = new QueryClient();

interface UseQueryOptions<GData, GError = Error, GSelectedData = GData> {
  queryKey: any[];
  queryFn: () => Promise<GData>;
  select?: (data: GData) => GSelectedData;
  cacheTime?: number;
  refetchInterval?: number;
  keepPreviousData?: boolean;
}

interface UseQueryResult<GData, GError = Error, GSelectedData = GData> {
  data: GSelectedData | undefined;
  error: GError | undefined;
  isFetching: boolean;
  isFetched: boolean;
  isPending: boolean;
  isFresh: boolean;
  updatedAt: number;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

type TrackedField =
  | 'data'
  | 'error'
  | 'isFetching'
  | 'isFetched'
  | 'isPending'
  | 'isFresh'
  | 'updatedAt'
  | 'dataUpdatedAt'
  | 'errorUpdatedAt';

const serializeQueryKey = (queryKey: any[]) => JSON.stringify(queryKey);

export const createQuery = <GData, GError = Error, GSelectedData = GData>(
  options: UseQueryOptions<GData, GError, GSelectedData>
) => options;

/**
 * Custom hook to manage and fetch query data.
 *
 * @template GData - The type of data returned by the query.
 * @template GError - The type of error returned by the query. Defaults to `Error`.
 * @template GSelectedData - The type of selected data returned by the query. Defaults to `GData`.
 *
 * @param {UseQueryOptions<GData, GError, GSelectedData>} options - The options for the query.
 * @returns {UseQueryResult<GData, GError, GSelectedData>} The result of the query, including data, error, and fetching status.
 *
 * @example
 * const { data, error, isFetching, refetch } = useQuery({
 *   queryKey: 'todos',
 *   queryFn: fetchTodos,
 *   select: (data) => data.filter(todo => !todo.completed),
 * });
 */
export const useQuery = <GData, GError = Error, GSelectedData = GData>(
  options: UseQueryOptions<GData, GError, GSelectedData>
): UseQueryResult<GData, GError, GSelectedData> => {
  const tracked = useRef<{ [key in TrackedField]?: boolean }>(Object.create(null));
  const serializedQueryKey = serializeQueryKey(options.queryKey);
  const cacheTime = options.cacheTime ?? 0;
  const refetchTimeoutId = useRef<number | undefined>();
  const rerender = useRerender();
  const query = useMemo(() => queryClient.findOrCreateQuery(serializedQueryKey), [serializedQueryKey]);
  const keepPreviousData = options.keepPreviousData ?? true;

  const selectData = useCallback(
    (data: GData | undefined): GSelectedData =>
      options.select && data !== undefined ? options.select(data) : (data as GSelectedData),
    [options.select]
  );

  const values = useRef<Pick<UseQueryResult<GData, GError, GSelectedData>, TrackedField>>({
    data: selectData(query.data),
    error: query.error,
    isFetching: query.status === 'loading',
    isFetched: query.updatedAt > 0,
    isFresh: cacheTime + query.updatedAt > Date.now(),
    isPending: query.status === 'pending',
    updatedAt: query.updatedAt,
    dataUpdatedAt: query.dataUpdatedAt,
    errorUpdatedAt: query.errorUpdatedAt,
  });

  const refetch = useCallback(async () => {
    const promise = options.queryFn();
    query.setPromise(promise);
    await promise;
  }, [query]);

  const smartRefetch = useCallback(async () => {
    if (query.status === 'loading') return;

    const isFresh = cacheTime + (query.dataUpdatedAt || query.errorUpdatedAt) > Date.now();
    if (isFresh) return;

    await refetch();
  }, [query]);

  const refetchWithTimeout = useCallback(() => {
    if (refetchTimeoutId.current) {
      clearTimeout(refetchTimeoutId.current);
    }

    if (options.refetchInterval) {
      refetchTimeoutId.current = window.setTimeout(
        () => {
          if (query.status === 'loading') return;

          refetch();
        },
        options.refetchInterval + Date.now() - query.updatedAt
      );
    }
  }, [query, query.updatedAt, options.refetchInterval]);

  const trackField = (field: TrackedField) => {
    tracked.current[field] = true;
  };

  const setData = (data: GData | undefined) => {
    setFieldValue('data', selectData(data));
  };

  const setFieldValue = (field: TrackedField, value: any) => {
    if (values.current[field] === value) {
      return;
    }

    // @ts-ignore
    values.current[field] = value;

    if (Object.keys(tracked.current).length === 0 || tracked.current[field]) {
      rerender();
    }
  };

  const fieldGetter = <T extends TrackedField>(field: T) => {
    trackField(field);
    return values.current[field];
  };

  // Subscribe to query events
  useEffect(() => {
    const subscriptions: (() => void)[] = [];

    subscriptions.push(
      query.store.subscribe((state) => {
        if (!keepPreviousData && state.status === 'loading') {
          setData(undefined);
        } else {
          setData(state.data);
        }

        setFieldValue('error', state.error);
        setFieldValue('isFetching', state.status === 'loading');
        setFieldValue('isFetched', state.updatedAt > 0);
        setFieldValue('isPending', state.status === 'pending');
        setFieldValue('updatedAt', state.updatedAt);
        setFieldValue('dataUpdatedAt', state.dataUpdatedAt);
        setFieldValue('errorUpdatedAt', state.errorUpdatedAt);
      })
    );

    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [query, keepPreviousData]);

  // Fetch data on mount
  useEffect(() => {
    smartRefetch();
  }, [query]);

  // Select data
  useEffect(() => {
    setData(query.data);
  }, [options.select]);

  // Refetch data on interval
  useEffect(() => {
    refetchWithTimeout();
  }, [refetchWithTimeout]);

  return {
    get data() {
      return fieldGetter('data');
    },
    get error() {
      return fieldGetter('error');
    },
    get isFetching() {
      return fieldGetter('isFetching');
    },
    get isFetched() {
      return fieldGetter('isFetched');
    },
    get isPending() {
      return fieldGetter('isPending');
    },
    get isFresh() {
      return fieldGetter('isFresh');
    },
    get updatedAt() {
      return fieldGetter('updatedAt');
    },
    get dataUpdatedAt() {
      return fieldGetter('dataUpdatedAt');
    },
    get errorUpdatedAt() {
      return fieldGetter('errorUpdatedAt');
    },
    refetch,
    invalidate: query.invalidate,
  };
};
