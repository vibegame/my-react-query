import { sleep } from 'radash';
import { memo, useEffect, useState } from 'react';
import { QueryClient } from './v2/QueryClient';
import { useQuery } from './v2/useQuery';

const queryClient = new QueryClient();

interface GetUsersVariables {
  filter: string;
  test: string;
}

const usersQuery = queryClient.createQuery({
  name: 'users',
  fetcher: async ({ filter }: GetUsersVariables) => {
    await sleep(1000);

    if (Math.random() > 0.5) {
      throw new Error('Failed to fetch users');
    }

    return ['Alice', 'Bob', 'Carl'].filter((name) => name.includes(filter));
  },
  clearTime: 1000,
});

const Child1 = memo(function Child1() {
  const [disabled, setDisabled] = useState(false);

  const { data, error, isSuccess, isError } = useQuery({
    query: usersQuery,
    variables: disabled
      ? undefined
      : {
          test: 'test',
          filter: 'a',
        },
    select(data) {
      return data.map((name) => name.toUpperCase());
    },
    refetchOnMount: false,
  });

  useEffect(() => {
    window.setTimeout(() => {
      setDisabled(true);
    }, 5000);
  }, []);

  console.log('Child1', { data, error, isSuccess, isError });

  return (
    <div>
      <button>Refetch 1</button>
    </div>
  );
});

const Child2 = memo(function Child2() {
  const { data, error, isSuccess, isError } = useQuery({
    query: usersQuery,
    variables: {
      filter: 'a',
      test: 'test',
    },
    refetchOnMount: false,
  });

  console.log('Child2', { data, error, isSuccess, isError });

  return (
    <div>
      <button onClick={() => {}}>Refetch 2</button>
    </div>
  );
});

function App() {
  const [renderChild2, setRenderChild2] = useState(false);
  const [disabled, setDisabled] = useState(false);

  return (
    <div>
      {!disabled && (
        <>
          <Child1 />
          <Child2 />
        </>
      )}
    </div>
  );
}

export default App;
