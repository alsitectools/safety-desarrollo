import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ejecuta fn() al montar y cada vez que cambian deps.
 * Devuelve { data, error, loading, reload, setData } e ignora respuestas de peticiones antiguas.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => {
    const current = ++seq.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    return Promise.resolve()
      .then(() => fnRef.current())
      .then((data) => {
        if (current === seq.current) setState({ data, error: null, loading: false });
        return data;
      })
      .catch((error) => {
        if (current === seq.current) setState((prev) => ({ ...prev, error, loading: false }));
      });
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater) => {
    setState((prev) => ({ ...prev, data: typeof updater === 'function' ? updater(prev.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
