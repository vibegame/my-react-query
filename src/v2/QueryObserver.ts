import { createStore } from 'zustand/vanilla';
import { Query } from './Query';
import { QueryCache, QueryCacheState } from './QueryCache';
import { NotUndefinedValue } from './types/common';

export interface QueryObserverState<TData, TTransformedData = TData, TError = Error> {
  data: TTransformedData | undefined;
  error: TError | undefined;
  originalData: TData | undefined;

  isSuccess: boolean;
  isError: boolean;
  isLoading: boolean;
  isSettled: boolean;
  isPending: boolean;
  isFresh: boolean;

  updatedAt: number;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
}

interface QueryObserverConstructorProps<
  TVariables extends object,
  TData extends NotUndefinedValue,
  TTransformedData = TData,
  TError = Error,
> {
  query: Query<TVariables, TData, TError>;
  variables: TVariables;
  select?: ((data: TData) => TTransformedData) | undefined;
  refetchInterval: number | undefined;
  cacheTime: number | undefined;
  refetchOnMount: boolean | undefined;
}

const noop = () => {};

export class QueryObserver<
  TVariables extends object,
  TData extends NotUndefinedValue,
  TTransformedData = TData,
  TError = Error,
> {
  private query: Query<TVariables, TData, TError>;
  private cache: QueryCache<TData, TVariables, TError>;
  private unsubscribeStore: () => void = noop;

  private defaultProps = {
    cacheTime: Infinity,
    refetchInterval: 0,
    refetchOnMount: true,
    select: (data: TData) => data as unknown as TTransformedData,
  };

  refetchTimeoutId: number | null = null;
  props: {
    select: (data: TData) => TTransformedData;
    refetchInterval: number;
    cacheTime: number;
    refetchOnMount: boolean;
  } = { ...this.defaultProps };

  private store = createStore<QueryObserverState<TData, TTransformedData, TError>>(() => QueryObserver.pendingState);

  get state() {
    return this.store.getState();
  }

  subscribe = this.store.subscribe;

  constructor(props: QueryObserverConstructorProps<TVariables, TData, TTransformedData, TError>) {
    this.query = props.query;
    this.props.select = props.select ?? this.props.select;
    this.props.refetchOnMount = props.refetchOnMount ?? this.props.refetchOnMount;
    this.props.refetchInterval = props.refetchInterval ?? this.props.refetchInterval;
    this.props.cacheTime = props.cacheTime ?? this.props.cacheTime;
    this.cache = this.query.findOrCreateCache(props.variables);
    this.mount();
  }

  private mount() {
    this.props.refetchOnMount ? this.refetch() : this.fetch();
    this.cache.use();
    this.setRefetchTimeout();
    this.updateState(this.cache.state);
    this.unsubscribeStore = this.cache.store.subscribe((state, prevState) => {
      this.updateState(state, prevState);
    });
  }

  private unmount() {
    this.cache.unuse();
    this.unsubscribeStore();
    this.clearRefetchTimeout();
  }

  public destroy() {
    this.unmount();
  }

  private updateState(
    state: QueryCacheState<TData, TVariables, TError>,
    prevState?: QueryCacheState<TData, TVariables, TError>
  ) {
    let transformedData: TTransformedData | undefined;

    if (prevState) {
      // If the data hasn't changed, we don't want to recompute the transformed data
      if (state.data === prevState.data) {
        transformedData = this.state.data;
      } else {
        transformedData = state.data === undefined ? undefined : this.props.select(state.data);
      }
    }

    const isSuccess = transformedData !== undefined;
    const isError = state.error !== undefined;
    const isSettled = isSuccess || isError;

    this.store.setState({
      data: transformedData,
      originalData: state.data,
      error: state.error,
      isLoading: state.status === 'loading',
      isError,
      isSuccess,
      isSettled,
      isPending: state.status === 'pending',
      isFresh: this.cache.isFresh(this.props.cacheTime),
      updatedAt: state.updatedAt ?? 0,
      dataUpdatedAt: state.dataUpdatedAt ?? 0,
      errorUpdatedAt: state.errorUpdatedAt ?? 0,
    });
  }

  setProps(props: Partial<typeof this.props>) {
    if ('cacheTime' in props && props.cacheTime !== this.props.cacheTime) {
      this.updateCacheTime(props.cacheTime ?? this.defaultProps.cacheTime);
    }

    if ('refetchInterval' in props && props.refetchInterval !== this.props.refetchInterval) {
      this.updateRefetchInterval(props.refetchInterval ?? this.defaultProps.refetchInterval);
    }

    if ('select' in props && props.select !== this.props.select) {
      this.props.select = props.select ?? this.props.select;
    }
  }

  private setRefetchTimeout() {
    this.clearRefetchTimeout();

    if (this.props.refetchInterval && this.cache.state.updatedAt > 0) {
      this.refetchTimeoutId = window.setTimeout(
        () => this.cache.refetch(this.cache.state.variables).catch(noop),
        Date.now() - this.cache.state.updatedAt + this.props.refetchInterval
      );
    }
  }

  private clearRefetchTimeout() {
    if (this.refetchTimeoutId) {
      clearTimeout(this.refetchTimeoutId);
      this.refetchTimeoutId = null;
    }
  }

  private refetch() {
    return this.cache.refetch(this.cache.state.variables).catch(noop);
  }

  private fetch() {
    return this.cache.fetch(this.cache.state.variables, { cacheTime: this.props.cacheTime }).catch(noop);
  }

  private updateCacheTime(cacheTime: number) {
    if (this.props.cacheTime !== cacheTime) {
      this.props.cacheTime = cacheTime;
      this.fetch();
    }
  }

  private updateRefetchInterval(interval: number) {
    if (this.props.refetchInterval !== interval) {
      this.props.refetchInterval = interval;
      this.setRefetchTimeout();
    }
  }

  static get pendingState(): QueryObserverState<any, any, any> {
    return {
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
      originalData: undefined,
    };
  }
}
