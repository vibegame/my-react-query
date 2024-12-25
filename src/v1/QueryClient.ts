import mitt from 'mitt';
import { createStore } from 'zustand';

type QueryEvents = {
  result: [any, any];
  invalidate: void;
};

type QueryStatus = 'pending' | 'loading' | 'error' | 'success';

interface QueryStore {
  promise: Promise<any> | undefined;
  data: any;
  error: any;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  updatedAt: number;
  status: QueryStatus;
}

export class Query {
  queryKey: string;

  store = createStore<QueryStore>(() => ({
    promise: undefined,
    data: undefined,
    error: undefined,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    updatedAt: 0,
    status: 'pending',
  }));

  get promise() {
    return this.store.getState().promise;
  }

  get data() {
    return this.store.getState().data;
  }

  get error() {
    return this.store.getState().error;
  }

  get dataUpdatedAt() {
    return this.store.getState().dataUpdatedAt;
  }

  get errorUpdatedAt() {
    return this.store.getState().errorUpdatedAt;
  }

  get updatedAt() {
    return this.store.getState().updatedAt;
  }

  get status() {
    return this.store.getState().status;
  }

  private emitter = mitt<QueryEvents>();

  constructor(props: { queryKey: string; data?: any; dataUpdatedAt?: number }) {
    this.queryKey = props.queryKey;
    const dataUpdatedAt = props.dataUpdatedAt ?? 0;

    this.store.setState({
      data: props.data,
      dataUpdatedAt: dataUpdatedAt,
      updatedAt: dataUpdatedAt,
    });
  }

  setData(data: any) {
    const state = this.store.getState();

    if (state.data === data) return;

    const dataUpdatedAt = Date.now();

    this.store.setState({
      data,
      dataUpdatedAt: dataUpdatedAt,
      updatedAt: dataUpdatedAt,
      error: undefined,
      errorUpdatedAt: 0,
      status: 'success',
    });

    this.emitter.emit('result', [data, undefined]);
  }

  setError(error: any) {
    const state = this.store.getState();
    if (state.error === error) return;

    const errorUpdatedAt = Date.now();

    this.store.setState({
      error: error,
      errorUpdatedAt: errorUpdatedAt,
      updatedAt: errorUpdatedAt,
      data: undefined,
      dataUpdatedAt: 0,
    });

    this.emitter.emit('result', [undefined, error]);
  }

  setPending() {
    const state = this.store.getState();

    if (state.status === 'pending') return;

    this.store.setState({ status: 'pending' });
  }

  setFetching() {
    const state = this.store.getState();

    if (state.status === 'loading') return;

    this.store.setState({ status: 'loading' });
  }

  setPromise(promise: Promise<any>) {
    const state = this.store.getState();

    if (state.promise === promise) {
      return;
    }

    this.setFetching();

    this.store.setState({ promise });

    promise
      .then((data) => {
        const state = this.store.getState();

        if (state.promise === promise) {
          this.setData(data);
        }
      })
      .catch((error) => {
        const state = this.store.getState();

        if (state.promise === promise) {
          this.setError(error);
        }
      });
  }

  invalidate() {
    this.store.setState({
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      updatedAt: 0,
    });
  }

  on<E extends keyof QueryEvents>(event: E, handler: (data: QueryEvents[E]) => void) {
    this.emitter.on(event, handler);

    return () => {
      this.emitter.off(event, handler);
    };
  }
}

export class QueryClient {
  queries = new Map<string, Query>();

  constructor() {
    this.loadFromCacheStorage();

    setInterval(() => {
      this.saveToCacheStorage();
    }, 5000);
  }

  saveToCacheStorage() {
    localStorage.setItem('queries', JSON.stringify(Array.from(this.queries.entries())));
  }

  loadFromCacheStorage() {
    const queries = localStorage.getItem('queries');
    if (queries) {
      const parsedQueries = JSON.parse(queries);

      for (const [queryKey, query] of parsedQueries) {
        this.queries.set(queryKey, new Query(query));
      }
    }
  }

  findQuery(queryKey: string) {
    return this.queries.get(queryKey);
  }

  findOrCreateQuery(queryKey: string) {
    let query = this.findQuery(queryKey);

    if (!query) {
      query = new Query({ queryKey });
      this.queries.set(queryKey, query);
    }

    return query;
  }

  addQuery(queryKey: string, query: any) {
    this.queries.set(queryKey, query);
  }
}
