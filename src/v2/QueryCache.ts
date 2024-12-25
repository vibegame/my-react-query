import { createStore } from 'zustand/vanilla';
import { NotUndefinedValue } from './types/common';
import { stringifyVariables } from './stringifyVariables';

type QueryStatus = 'pending' | 'loading' | 'error' | 'success';

export type QueryCacheState<D, V extends object, E = Error> = {
  data: D | undefined;
  error: E | undefined;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  updatedAt: number;
  status: QueryStatus;
  variables: V;
} & (
  | {
      status: 'success';
      data: D;
      error: undefined;
    }
  | {
      status: 'error';
      error: E;
      data: D | undefined;
    }
  | {
      status: 'pending';
      data: undefined;
      error: undefined;
    }
  | {
      status: 'loading';
      data: D | undefined;
      error: E | undefined;
    }
);

interface QueryCacheConstructorProps<D extends NotUndefinedValue, V extends object> {
  variables: V;
  clearTime: number;
  onClear: () => void;
  fetcher: (variables: V) => Promise<D>;
}

export class QueryCache<TData extends NotUndefinedValue, TVariables extends object, TError = Error> {
  readonly variablesHash: string;
  private readonly clearTime: number;
  private usedCount = 0;
  private readonly onClear: () => void;
  private clearTimeoutId: number | undefined;
  public fetcher: (variables: TVariables) => Promise<TData>;

  store = createStore<QueryCacheState<TData, TVariables, TError>>(() => ({
    data: undefined,
    error: undefined,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    updatedAt: 0,
    status: 'pending',
    variables: undefined as unknown as TVariables,
  }));

  get state() {
    return this.store.getState();
  }

  constructor(props: QueryCacheConstructorProps<TData, TVariables>) {
    this.store.setState({ variables: props.variables });
    this.variablesHash = QueryCache.hashVariables(props.variables);
    this.clearTime = props.clearTime;
    this.onClear = props.onClear;
    this.fetcher = props.fetcher;
  }

  static hashVariables<V extends object>(variables: V) {
    return stringifyVariables(variables);
  }

  startFetching() {
    this.store.setState({ status: 'loading' });
  }

  setData(data: TData) {
    this.store.setState({
      data,
      status: 'success',
      updatedAt: Date.now(),
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      error: undefined,
    });
  }

  setError(error: any) {
    this.store.setState({
      error,
      status: 'error',
      updatedAt: Date.now(),
      errorUpdatedAt: Date.now(),
    });
  }

  isFresh(cacheTime: number) {
    return Date.now() - this.state.updatedAt < cacheTime;
  }

  use() {
    this.usedCount++;

    if (this.clearTimeoutId !== undefined) {
      window.clearTimeout(this.clearTimeoutId);
      this.clearTimeoutId = undefined;
    }
  }

  unuse() {
    this.usedCount--;

    if (
      this.usedCount === 0 &&
      this.clearTime > 0 &&
      this.clearTime !== Infinity &&
      this.clearTimeoutId === undefined
    ) {
      this.clearTimeoutId = window.setTimeout(() => {
        this.onClear();
      }, this.clearTime);
    }
  }

  // Fetch data without using cache
  refetch(variables: TVariables) {
    return this.fetch(variables, { cacheTime: 0 });
  }

  // Fetch data
  async fetch(variables: TVariables, options?: { cacheTime?: number }): Promise<TData> {
    if (this.state.status === 'loading') {
      return new Promise<TData>((resolve, reject) => {
        this.store.subscribe((state) => {
          if (state.status === 'success') {
            resolve(state.data);
          } else if (state.status === 'error') {
            reject(state.error);
          }
        });
      });
    }

    const cacheTime = options?.cacheTime ?? Infinity;

    if (this.isFresh(cacheTime)) {
      if (this.state.status === 'success') {
        return this.state.data;
      }

      if (this.state.status === 'error') {
        throw this.state.error;
      }
    }

    this.startFetching();

    return await this.fetcher(variables)
      .then((data) => {
        if (data === undefined) {
          throw new Error('data in fetcher should not be undefined. Use null instead');
        }

        this.setData(data);
        return data;
      })
      .catch((error) => {
        this.setError(error);
        throw error;
      });
  }
}
