"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X } from "lucide-react";

type Toast = { id: string; title: string; message?: string };
type ToastContextValue = {
  toast: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 4_200;
const MAX_VISIBLE_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, number>());
  const remove = useCallback(
    (id: string) => {
      const timer = timers.current.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.current.delete(id);
      setToasts((items) => items.filter((item) => item.id !== id));
    },
    [],
  );
  const toast = useCallback(
    (title: string, message?: string) => {
      const id = crypto.randomUUID();
      setToasts((items) => [
        ...items.slice(-(MAX_VISIBLE_TOASTS - 1)),
        { id, title, message },
      ]);
      const timer = window.setTimeout(() => remove(id), TOAST_DURATION_MS);
      timers.current.set(id, timer);
    },
    [remove],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const contextValue = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-5 right-5 z-100 grid w-[min(380px,calc(100vw-40px))] gap-2.5" role="region" aria-label="Notifications">
        {toasts.map((item) => (
          <div className="grid grid-cols-[22px_minmax(0,1fr)_40px] items-center gap-2.5 rounded-[14px] border border-[#bee8d5] bg-white p-3.75 shadow-elevated" role="status" key={item.id}>
            <CheckCircle2 className="text-success" size={20} aria-hidden />
            <div>
              <strong className="block text-sm">{item.title}</strong>
              {item.message && <p className="mt-0.5 text-[11px] text-secondary">{item.message}</p>}
            </div>
            <button
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent hover:bg-subtle"
              onClick={() => remove(item.id)}
              aria-label="Dismiss notification"
            >
              <X size={17} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
