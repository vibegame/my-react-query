import { queryOptions, skipToken } from '@tanstack/react-query';
import { sleep, tryit } from 'radash';
import { queryClient } from '../queryClient';

const random = (max: number) => Math.floor(Math.random() * max);

export type ProtocolId = 'HYPERLIQUID' | 'DYDX' | 'AAVE' | 'COMPOUND';

export interface Market {
  marketId: string;
  protocolId: ProtocolId;
}

export const protocols: ProtocolId[] = ['HYPERLIQUID', 'DYDX', 'AAVE', 'COMPOUND'] as const;

const fetchMarkets = tryit(async (protocolId: ProtocolId): Promise<Market[]> => {
  await sleep(random(2000));

  return Array.from({ length: 80 }, (_, i) => ({
    marketId: `${protocolId}-${i}`,
    protocolId,
  }));
});

export const fetchQueryMarkets = async (variables: { protocolId: ProtocolId }) => {
  return queryClient.fetchQuery(queries.markets(variables));
};

export const fetchQueryAllMarkets = async (): Promise<Market[]> => {
  const results = await Promise.all(
    protocols.map((protocolId) => queryClient.fetchQuery(queries.markets({ protocolId })))
  );

  return results.flatMap(([_, data]) => data ?? []);
};

export const queries = {
  markets: <D = Awaited<ReturnType<typeof fetchMarkets>>>(
    variables: { protocolId: ProtocolId },
    options?: { enabled?: boolean; select?: (data: Awaited<ReturnType<typeof fetchMarkets>>) => D }
  ) => {
    return queryOptions({
      queryKey: ['markets', variables],
      queryFn: (options?.enabled ?? true) ? () => fetchMarkets(variables.protocolId) : skipToken,
      staleTime: 30000,
      select: options?.select,
    });
  },
};
