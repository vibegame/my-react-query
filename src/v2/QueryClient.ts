import { Query, QueryConstructorProps } from './Query';
import { NotUndefinedValue, QueryName } from './types/common';

export class QueryClient {
  private queries = new Map<QueryName, Query<any, any>>();

  findQuery(queryName: QueryName) {
    return this.queries.get(queryName);
  }

  createQuery<D extends NotUndefinedValue, V extends object>(props: QueryConstructorProps<D, V>) {
    const query = new Query<D, V>(props);
    this.queries.set(props.name, query);

    return query;
  }
}
