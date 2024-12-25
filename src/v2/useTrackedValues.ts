import { useCallback, useRef } from 'react';
import { useRerender } from './useRerender';

export function useTrackedValues<T extends object>(initialValues: T) {
  const values = useRef(initialValues);
  const trackedFields = useRef<(keyof T)[]>([]);
  const rerender = useRerender();

  const trackField = useCallback(<K extends keyof T>(field: K) => {
    if (!trackedFields.current.includes(field)) {
      trackedFields.current.push(field);
    }
  }, []);

  const setValues = useCallback(
    (newValues: Partial<T>) => {
      let shouldRerender = false;

      for (const key in newValues) {
        if (values.current[key] !== newValues[key]) {
          values.current = {
            ...values.current,
            [key]: newValues[key],
          };

          if (trackedFields.current.length === 0 || trackedFields.current.includes(key)) {
            shouldRerender = true;
          }
        }
      }

      if (shouldRerender) {
        rerender();
      }
    },
    [rerender]
  );

  const getValue = useCallback(
    <K extends keyof T>(field: K, track = true): T[K] => {
      if (track) {
        trackField(field);
      }

      return values.current[field];
    },
    [trackField]
  );

  return { set: setValues, get: getValue };
}
