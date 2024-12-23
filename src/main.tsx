import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AsyncStorage, PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as idb from 'idb-keyval';
import { queryClient } from './queryClient.ts';

const storage: AsyncStorage = {
  getItem: async (key) => {
    const res = await idb.get<string | null>(key);

    if (!res) return null;

    return res;
  },
  setItem: (key, value) => idb.set(key, value),
  removeItem: (key) => idb.del(key),
};

const asyncStoragePersister = createAsyncStoragePersister({
  storage: storage,
});

declare global {
  interface Window {
    clearCache: () => void;
  }
}

window.clearCache = async () => {
  queryClient.clear();
  await idb.clear();
  window.location.reload();
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
    <ReactQueryDevtools />
    <App />
  </PersistQueryClientProvider>
);
