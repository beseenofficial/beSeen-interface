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
import { AnimatePresence, motion, useAnimationControls, useReducedMotion, type Variants } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastOptions = {
  variant?: ToastVariant;
  duration?: number | null;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type Toast = {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  duration: number | null;
  action?: ToastOptions["action"];
};

type ToastContextValue = {
  toast: (title: string, message?: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 4_200;
const MAX_VISIBLE_TOASTS = 4;

const toastVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.985,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

const reducedToastVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.16 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const variantStyles = {
  success: {
    icon: Check,
    iconClass: "bg-success-bg text-success",
    accentClass: "bg-success",
    progressClass: "bg-success/55",
  },
  error: {
    icon: X,
    iconClass: "bg-error-bg text-error",
    accentClass: "bg-error",
    progressClass: "bg-error/55",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "bg-warning-bg text-warning",
    accentClass: "bg-warning",
    progressClass: "bg-warning/55",
  },
  info: {
    icon: Info,
    iconClass: "bg-info-bg text-brand",
    accentClass: "bg-brand",
    progressClass: "bg-brand/45",
  },
} satisfies Record<ToastVariant, {
  icon: typeof Check;
  iconClass: string;
  accentClass: string;
  progressClass: string;
}>;

function ToastItem({ item, onDismiss }: { item: Toast; onDismiss: (id: string) => void }) {
  const shouldReduceMotion = useReducedMotion();
  const progressControls = useAnimationControls();
  const timeoutRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(item.duration ?? 0);
  const style = variantStyles[item.variant];
  const Icon = style.icon;

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    if (item.duration === null || remainingRef.current <= 0) return;
    startedAtRef.current = performance.now();
    timeoutRef.current = window.setTimeout(() => onDismiss(item.id), remainingRef.current);
    void progressControls.start({
      scaleX: 0,
      transition: { duration: remainingRef.current / 1_000, ease: "linear" },
    });
  }, [item.duration, item.id, onDismiss, progressControls]);

  useEffect(() => {
    if (item.duration === null) return;
    progressControls.set({ scaleX: 1 });
    startTimer();
    return clearTimer;
  }, [clearTimer, item.duration, progressControls, startTimer]);

  const pauseTimer = () => {
    if (item.duration === null || timeoutRef.current === null) return;
    remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - startedAtRef.current));
    clearTimer();
    progressControls.stop();
  };

  const resumeTimer = () => {
    if (item.duration === null || timeoutRef.current !== null) return;
    startTimer();
  };

  const handleAction = () => {
    item.action?.onClick();
    onDismiss(item.id);
  };

  return (
    <motion.article
      layout
      variants={shouldReduceMotion ? reducedToastVariants : toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ layout: { duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" } }}
      className="pointer-events-auto relative grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 overflow-hidden rounded-2xl border border-border bg-white py-3 pr-2.5 pl-3.5 shadow-[0_14px_42px_rgb(11_11_63/10%),0_2px_8px_rgb(11_11_63/5%)] md:w-fit md:min-w-[320px] md:max-w-[460px]"
      role={item.variant === "error" ? "alert" : "status"}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocusCapture={pauseTimer}
      onBlurCapture={resumeTimer}
    >
      <span className={cn("absolute inset-y-3 left-0 w-0.5 rounded-r-full", style.accentClass)} aria-hidden />

      <motion.span
        className="pointer-events-none absolute top-1.5 left-2 flex gap-0.5"
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
        animate={{ opacity: [0, 0.55, 0], y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0.01 : 0.42, ease: "easeOut" }}
        aria-hidden
      >
        <span className="h-1 w-0.5 rotate-[-18deg] rounded-full bg-aqua" />
        <span className="h-1 w-0.5 rotate-[-18deg] rounded-full bg-peach" />
        <span className="h-1 w-0.5 rotate-[-18deg] rounded-full bg-lilac" />
      </motion.span>

      <span className={cn("inline-flex size-8 items-center justify-center rounded-full", style.iconClass)} aria-hidden>
        <Icon size={16} strokeWidth={2.25} />
      </span>

      <span className="min-w-0 py-0.5">
        <strong className="block text-sm leading-4.5 font-semibold tracking-[-0.01em] text-navy">{item.title}</strong>
        {item.message && <span className="mt-0.5 block text-xs leading-4 text-secondary">{item.message}</span>}
      </span>

      <span className="flex items-center gap-0.5 pl-1">
        {item.action && (
          <button
            className="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-info-bg focus-visible:outline-brand/35"
            onClick={handleAction}
            type="button"
          >
            {item.action.label}
          </button>
        )}
        <button
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-muted transition-colors hover:bg-subtle hover:text-navy focus-visible:outline-brand/35"
          onClick={() => onDismiss(item.id)}
          aria-label="Dismiss notification"
          type="button"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </span>

      {item.duration !== null && (
        <motion.span
          className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left", style.progressClass)}
          initial={{ scaleX: 1 }}
          animate={progressControls}
          aria-hidden
        />
      )}
    </motion.article>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((title: string, message?: string, options: ToastOptions = {}) => {
    const id = crypto.randomUUID();
    setToasts((items) => [
      ...items.slice(-(MAX_VISIBLE_TOASTS - 1)),
      {
        id,
        title,
        message,
        variant: options.variant ?? "success",
        duration: options.duration === undefined ? TOAST_DURATION_MS : options.duration,
        action: options.action,
      },
    ]);
  }, []);

  const contextValue = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[200] flex max-h-[calc(100svh-2rem)] flex-col items-center gap-2.5 md:right-auto md:bottom-6 md:left-1/2 md:w-[min(460px,calc(100vw-32px))] md:-translate-x-1/2"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => <ToastItem item={item} onDismiss={remove} key={item.id} />)}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
