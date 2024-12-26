/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo } from 'react';
import { Query } from './Query';
import { useTrackedValues } from './useTrackedValues';
import { NotUndefinedValue } from './types/common';
import { QueryObserver, QueryObserverState } from './QueryObserver';

export interface UseQueryProps<
  TVariables extends object,
  TData extends NotUndefinedValue,
  TTransformedData = TData,
  TError = Error,
> {
  query: Query<TVariables, TData, TError>;
  variables: TVariables | undefined;
  select?: (data: TData) => TTransformedData;
  cacheTime?: number;
  refetchInterval?: number;
  keepStateOnDisabled?: boolean;
  refetchOnMount?: boolean;
}

type UseQueryResult<TData, TTransformedData = TData, TError = Error> = QueryObserverState<
  TData,
  TTransformedData,
  TError
>;

export function useQuery<
  TVariables extends object,
  TData extends NotUndefinedValue,
  TTransformedData = TData,
  TError = Error,
>(props: UseQueryProps<TVariables, TData, TTransformedData, TError>): UseQueryResult<TData, TTransformedData, TError> {
  const queryObserver = useMemo(() => {
    if (props.variables) {
      return new QueryObserver<TVariables, TData, TTransformedData, TError>({
        query: props.query,
        variables: props.variables,
        select: props.select,
        cacheTime: props.cacheTime,
        refetchInterval: props.refetchInterval,
        refetchOnMount: props.refetchOnMount,
      });
    }
  }, [props.variables]);

  const values = useTrackedValues(queryObserver ? queryObserver.state : QueryObserver.pendingState);

  useEffect(() => {
    if (queryObserver) {
      queryObserver.setProps({
        select: props.select,
        refetchInterval: props.refetchInterval,
        cacheTime: props.cacheTime,
        refetchOnMount: props.refetchOnMount,
      });
    } else if (props.variables === undefined && !props.keepStateOnDisabled) {
      values.set(QueryObserver.pendingState);
    }
  }, [props]);

  useEffect(() => {
    if (queryObserver) {
      const unsubscribe = queryObserver.subscribe((state) => {
        values.set(state);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [queryObserver]);

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
    get originalData() {
      return values.get('originalData');
    },
  };
}
