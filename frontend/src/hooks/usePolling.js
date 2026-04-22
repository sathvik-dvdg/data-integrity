import { useEffect, useRef } from 'react';

const usePolling = (callback, delay) => {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    let controller = new AbortController();
    let timeoutId;

    const poll = async () => {
      try {
        if (savedCallback.current) {
          await savedCallback.current(controller.signal);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Polling error:', err);
      }
      
      if (delay !== null && !controller.signal.aborted) {
        timeoutId = setTimeout(poll, delay);
      }
    };

    timeoutId = setTimeout(poll, delay);
    
    return () => {
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [delay]);
};

export default usePolling;
