import { useEffect, useRef } from 'react';

const usePolling = (callback, delay) => {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    let timeoutId;

    const poll = async () => {
      if (savedCallback.current) {
        await savedCallback.current();
      }
      
      if (delay !== null) {
        timeoutId = setTimeout(poll, delay);
      }
    };

    if (delay !== null) {
      timeoutId = setTimeout(poll, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [delay]);
};

export default usePolling;
