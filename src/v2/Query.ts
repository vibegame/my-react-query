import { QueryCache } from './QueryCache';
import { NotUndefinedValue, QueryName } from './types/common';

export interface QueryConstructorProps<D, V extends object> {
  name: QueryName;
  fetcher: (variables: V) => Promise<D>;
  clearTime?: number;
}

const DEFAULT_CLEAR_TIME = 300000; // 5 minutes

export class Query<TVariables extends object, TData extends NotUndefinedValue, TError = Error> {
  readonly name: QueryName;
  readonly fetcher: (variables: TVariables) => Promise<TData>;
  readonly clearTime: number;
  readonly caches = new Map<string, QueryCache<TData, TVariables, TError>>();

  constructor(props: QueryConstructorProps<TData, TVariables>) {
    this.name = props.name;
    this.fetcher = props.fetcher;
    this.clearTime = props.clearTime ?? DEFAULT_CLEAR_TIME;
  }

  findCache(variables: TVariables) {
    return this.caches.get(QueryCache.hashVariables(variables));
  }

  createCache(variables: TVariables) {
    const cache = new QueryCache<TData, TVariables, TError>({
      variables,
      clearTime: this.clearTime,
      onClear: () => this.caches.delete(cache.variablesHash),
      fetcher: this.fetcher,
    });

    this.caches.set(cache.variablesHash, cache);

    return cache;
  }

  findOrCreateCache(variables: TVariables) {
    return this.findCache(variables) ?? this.createCache(variables);
  }
}
