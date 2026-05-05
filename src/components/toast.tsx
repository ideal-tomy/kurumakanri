'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

interface ToastCtx {
  show: (msg: string) => void;
}

const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2400);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className={`toast ${msg ? 'show' : ''}`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ width: 16, height: 16 }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{msg ?? ''}</span>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
