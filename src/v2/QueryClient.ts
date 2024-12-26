import { Query, QueryConstructorProps } from './Query';
import { NotUndefinedValue, QueryName } from './types/common';

export class QueryClient {
  private queries = new Map<QueryName, Query<any, any>>();

  findQuery(queryName: QueryName) {
    return this.queries.get(queryName);
  }

  createQuery<TData extends NotUndefinedValue, TVariables extends object>(
    props: QueryConstructorProps<TData, TVariables>
  ) {
    const query = new Query<TVariables, TData>(props);
    this.queries.set(props.name, query);

    return query;
  }
}
