import { useEffect, useRef } from 'react';

export function useRenderCount() {
  const count = useRef(0);

  useEffect(() => {
    return () => {
      count.current = count.current + 1;
    };
  }, []);

  return () => count.current;
}
