import { useCallback, useState } from 'react';

export const useRerender = () => {
  const [, rerender] = useState({});
  return useCallback(() => rerender({}), []);
};
