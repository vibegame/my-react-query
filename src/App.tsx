// const combineMarketsQueries = (results: UseQueryResult<[Error, undefined] | [undefined, Market[]], Error>[]) => {
//   console.log(results);

import { sleep } from 'radash';
import { createQuery, useQuery } from './my-react-query/useQuery';
import { memo, useEffect, useState } from 'react';

//   return {
//     data: sift(results.flatMap(({ data }) => data?.[1])),
//     isSettled:
//       // Settled when all queries are either successful, errored, or not enabled (if query is not enabled, it will not be stale and will not have result)
//       results.length > 0 && results.every(({ isSuccess, isError, isStale }) => isSuccess || isError || !isStale),
//   };
// };

// const marketsQueries = protocols.map((protocolId) => queries.markets({ protocolId }));

// const useMarket = (protocolId: string, marketId: string) => {
//   const { market, isSettled } = useQueries({
//     queries: protocols.map((protocolId) =>
//       queries.markets(
//         { protocolId },
//         {
//           enabled: protocolId === 'HYPERLIQUID',
//           select: ([_, data]) => {
//             if (data) {
//               return data.find((market) => market.marketId === marketId);
//             }
//           },
//         }
//       )
//     ),
//     combine: (results) => {
//       return {
//         isSettled:
//           results.length > 0 && results.every((result) => result.isSuccess || result.isError || !result.isStale),
//         market: results.find((result) => result.data)?.data,
//       };
//     },
//   });

//   return { isLoading: !market && !isSettled, market };
// };

// const useAllMarkets = () => {
//   return useQueries({
//     queries: marketsQueries,
//     combine: (results) => {
//       console.log(results);

//       return {
//         data: sift(results.flatMap(({ data }) => data?.[1])),
//         isSettled:
//           // Settled when all queries are either successful, errored, or not enabled (if query is not enabled, it will not be stale and will not have result)
//           results.length > 0 && results.every(({ isSuccess, isError, isStale }) => isSuccess || isError || !isStale),
//       };
//     },
//   });
// };

const usersQuery = createQuery({
  queryKey: ['users'],
  queryFn: async () => {
    await sleep(3000);
    return ['Alice', 'Bob', 'Charlie'];
  },
  cacheTime: 20000,
  refetchInterval: 3000,
  keepPreviousData: false,
});

const Child1 = memo(function Child1() {
  const { data, isFetching, refetch, isPending, error, isFetched } = useQuery(usersQuery);

  console.log('Child1', { data, error, isFetching, isPending, isFetched });

  return (
    <div>
      <button onClick={refetch}>Refetch 1</button>
    </div>
  );
});

const Child2 = memo(function Child2() {
  const { data, isFetching, refetch, error, isPending, isFetched } = useQuery(usersQuery);

  console.log('Child2', { data, error, isFetching, isPending, isFetched });

  return (
    <div>
      <button onClick={refetch}>Refetch 2</button>
    </div>
  );
});

function App() {
  const [renderChild2, setRenderChild2] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setRenderChild2(true);
    }, 4000);
  }, []);

  return (
    <div>
      <Child1 />
      {renderChild2 && <Child2 />}
    </div>
  );
}

export default App;
