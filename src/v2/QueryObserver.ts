import { Query } from './Query';
import { QueryCache } from './QueryCache';
import { NotUndefinedValue } from './types/common';

interface QueryObserverConstructorProps<
  TVariables extends object,
  TData extends NotUndefinedValue,
  TTransformedData = TData,
  TError = Error,
> {
  query: Query<TData, TVariables, TError>;
  variables: TVariables;
  select?: (data: TData) => TTransformedData;
  refetchInterval?: number;
}

const noop = () => {};

export class QueryObserver<
  TVariables extends object,
  TData extends NotUndefinedValue,
  TTransformedData = TData,
  TError = Error,
> {
  cache: QueryCache<TData, TVariables, TError>;
  props: QueryObserverConstructorProps<TVariables, TData, TTransformedData, TError>;
  refetchTimeoutId: number | null = null;

  constructor(props: QueryObserverConstructorProps<TVariables, TData, TTransformedData, TError>) {
    this.cache = props.query.findOrCreateCache(props.variables);
    this.props = props;

    this.cache.use();
    this.setRefetchTimeout();
  }

  setRefetchTimeout() {
    if (this.props.refetchInterval && this.cache.state.updatedAt > 0) {
      this.refetchTimeoutId = window.setTimeout(
        () => this.cache.refetch(this.cache.state.variables).catch(noop),
        Date.now() - this.cache.state.updatedAt + this.props.refetchInterval
      );
    }
  }

  clearRefetchTimeout() {
    if (this.refetchTimeoutId) {
      clearTimeout(this.refetchTimeoutId);
      this.refetchTimeoutId = null;
    }
  }

  selectData(data: TData) {
    return this.props.select ? this.props.select(data) : (data as unknown as TTransformedData);
  }

  destroy() {
    this.cache.unuse();
    this.clearRefetchTimeout();
  }
}
