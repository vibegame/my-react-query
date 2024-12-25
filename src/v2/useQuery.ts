/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Query } from './Query';
import { noop } from './utils';
import { useTrackedValues } from './useTrackedValues';
import { QueryCacheState } from './QueryCache';
import { useRenderCount } from './useIsMounted';
import { NotUndefinedValue } from './types/common';

const defaultProps = {
  refetchOnMount: false,
  keepStateOnDisabled: false,
  cacheTime: Infinity,
};

export interface UseQueryProps<TVariables extends object, TData extends NotUndefinedValue, TTransformedData = TData> {
  query: Query<TData, TVariables>;
  variables: TVariables | undefined;
  select?: (data: TData) => TTransformedData;
  cacheTime?: number;
  refetchInterval?: number;
  keepStateOnDisabled?: boolean;
  refetchOnMount?: boolean;
}

/**
 * Represents the base state fields that are always present in a query result
 */
type BaseQueryState = {
  isLoading: boolean;
  isSettled: boolean;
  isPending: boolean;
  isFresh: boolean;
  updatedAt: number;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  isDisabled: boolean;
};

/**
 * Represents a successful query result with data
 */
type SuccessState<TData, TTransformedData = TData> = {
  status: 'success';
  isSuccess: true;
  isError: false;
  data: TTransformedData;
  error: undefined;
  originalData: TData;
};

/**
 * Represents a failed query result with error
 */
type ErrorState<TData, TTransformedData = TData, TError = Error> = {
  status: 'error';
  isSuccess: false;
  isError: true;
  data: TTransformedData | undefined;
  originalData: TData | undefined;
  error: TError;
};

/**
 * Represents a pending query state
 */
type PendingState = {
  status: 'pending';
  isSuccess: false;
  isError: false;
  data: undefined;
  error: undefined;
  originalData: undefined;
};

/**
 * Represents all possible states of a query result
 */
type QueryResultState<TData, TTransformedData = TData, TError = Error> =
  | SuccessState<TData, TTransformedData>
  | ErrorState<TData, TTransformedData, TError>
  | PendingState;

/**
 * Combined type for a complete query result including all state fields
 */
type UseQueryResultState<TData, TTransformedData = TData, TError = Error> = BaseQueryState &
  QueryResultState<TData, TTransformedData, TError> & {
    originalData: TData | undefined;
  };

interface UseQueryResultActions {
  refetch: () => Promise<void>;
}

type UseQueryResult<D, SD = D, E = Error> = UseQueryResultState<D, SD, E> & UseQueryResultActions;

export function useQuery<
  TVariables extends object,
  TData extends NotUndefinedValue,
  TTransformedData = TData,
  TError = Error,
>(props: UseQueryProps<TVariables, TData, TTransformedData>): UseQueryResult<TData, TTransformedData, TError> {
  const getRenderCount = useRenderCount();
  const refetchTimeoutId = useRef<number | undefined>();

  const queryCache = useMemo(
    () => (props.variables ? props.query.findOrCreateCache(props.variables) : undefined),
    [props.query, props.variables]
  );

  const cacheTime = props.cacheTime ?? defaultProps.cacheTime;
  const keepDataOnDisabled = props.keepStateOnDisabled ?? defaultProps.keepStateOnDisabled;
  const refetchOnMount = props.refetchOnMount ?? defaultProps.refetchOnMount;

  const clearRefetchTimeout = useCallback(() => {
    if (refetchTimeoutId.current) {
      clearTimeout(refetchTimeoutId.current);
      refetchTimeoutId.current = undefined;
    }
  }, []);

  const selectData = (data: TData): TTransformedData => {
    return props.select ? props.select(data) : (data as unknown as TTransformedData);
  };

  const getEmptyValues = (): UseQueryResultState<TData, TTransformedData, TError> => ({
    status: 'pending',
    data: undefined,
    error: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    isSettled: false,
    isPending: false,
    isFresh: false,
    updatedAt: 0,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    isDisabled: true,
    originalData: undefined,
  });

  const getInitialValues = (): UseQueryResultState<TData, TTransformedData, TError> => {
    if (queryCache) {
      return getValuesFromState(queryCache.store.getState());
    } else {
      return getEmptyValues();
    }
  };

  const getValuesFromState = (
    state: QueryCacheState<TData, TVariables>,
    prevState?: QueryCacheState<TData, TVariables>
  ): UseQueryResultState<TData, TTransformedData, TError> => {
    let data: TTransformedData | undefined;

    if (prevState && state.data === prevState.data) {
      data = values.get('data', false);
    } else {
      data = state.data === undefined ? undefined : selectData(state.data);
    }

    const isSuccess = data !== undefined;
    const isError = state.error !== undefined;
    const isSettled = isSuccess || isError;

    return {
      data: data,
      originalData: state.data,
      error: state.error,
      isLoading: state.status === 'loading',
      isError,
      isSuccess,
      isSettled,
      isPending: state.status === 'pending',
      isFresh: queryCache ? queryCache.isFresh(cacheTime) : false,
      updatedAt: state.updatedAt ?? 0,
      dataUpdatedAt: state.dataUpdatedAt ?? 0,
      errorUpdatedAt: state.errorUpdatedAt ?? 0,
      isDisabled: !queryCache,
    } as UseQueryResultState<TData, TTransformedData, TError>;
  };

  // Subscribe to cache changes
  useEffect(() => {
    if (queryCache) {
      const unsubscribe = queryCache.store.subscribe((state, prevState) => {
        values.set(getValuesFromState(state, prevState));
      });

      return () => {
        unsubscribe();
      };
    }
  }, [queryCache]);

  // Refetch on mount
  useEffect(() => {
    const renderCount = getRenderCount();

    if (queryCache && refetchOnMount && renderCount === 0) {
      queryCache.refetch(queryCache.state.variables).catch(noop);
    }
  }, [queryCache]);

  // Fetch on mount
  useEffect(() => {
    if (queryCache) {
      queryCache.fetch(queryCache.state.variables, { cacheTime }).catch(noop);
    }
    // If queryCache is changed, then variables or query are changed
  }, [cacheTime, queryCache]);

  // Refetch on interval
  useEffect(() => {
    if (queryCache) {
      const refetchWithTimeout = () => {
        if (props.refetchInterval && queryCache.state.updatedAt > 0) {
          refetchTimeoutId.current = window.setTimeout(
            () => queryCache.refetch(queryCache.state.variables).catch(noop),
            Date.now() - queryCache.state.updatedAt + props.refetchInterval
          );
        }
      };

      refetchWithTimeout();

      return () => {
        clearRefetchTimeout();
      };
    }
  }, [props.refetchInterval, queryCache]);

  // If queryCache is updated, then update values on update (without mount)
  useEffect(() => {
    const renderCount = getRenderCount();

    if (renderCount > 0) {
      if (queryCache) {
        values.set(getValuesFromState(queryCache.store.getState()));
      } else if (keepDataOnDisabled) {
        values.set({ isDisabled: true });
      } else {
        values.set(getEmptyValues());
      }
    }
  }, [queryCache]);

  // Execute use/unuse on queryCache
  useEffect(() => {
    if (queryCache) {
      queryCache.use();

      return () => {
        queryCache.unuse();
      };
    }
  }, [queryCache]);

  const values = useTrackedValues(getInitialValues());

  return {
    get data() {
      return values.get('data');
    },
    get error() {
      return values.get('error');
    },
    get isLoading() {
      return values.get('isLoading');
    },
    get isError() {
      return values.get('isError');
    },
    get isSuccess() {
      return values.get('isSuccess');
    },
    get isSettled() {
      return values.get('isSettled');
    },
    get isPending() {
      return values.get('isPending');
    },
    get isFresh() {
      return values.get('isFresh');
    },
    get updatedAt() {
      return values.get('updatedAt');
    },
    get dataUpdatedAt() {
      return values.get('dataUpdatedAt');
    },
    get errorUpdatedAt() {
      return values.get('errorUpdatedAt');
    },
    get isDisabled() {
      return values.get('isDisabled');
    },
    get originalData() {
      return values.get('originalData');
    },
    get status() {
      return values.get('status');
    },
    refetch: useCallback(async () => {
      if (queryCache) {
        await queryCache.refetch(queryCache.state.variables);
      }
    }, [queryCache]),
  } as UseQueryResult<TData, TTransformedData, TError>;
}
