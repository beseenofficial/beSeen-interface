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
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
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
const MIN_TOAST_DURATION_MS = 4_800;
const MAX_TOAST_DURATION_MS = 8_000;
const MAX_VISIBLE_TOASTS = 4;

export function toastDurationForContent(title: string, message?: string): number {
  const readingTime = 3_200 + `${title} ${message ?? ""}`.trim().length * 35;
  return Math.min(MAX_TOAST_DURATION_MS, Math.max(MIN_TOAST_DURATION_MS, readingTime));
}

const toastVariants: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.985, filter: "blur(5px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 460, damping: 32, mass: 0.72 },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.99,
    filter: "blur(3px)",
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
    icon: CircleCheck,
    surfaceClass: "bg-success-bg/55",
    iconClass: "bg-white text-success shadow-[0_5px_14px_rgb(19_126_88/12%)]",
    actionClass: "bg-white text-success hover:bg-success-bg focus-visible:outline-success/40",
    progressClass: "bg-success/65",
  },
  error: {
    icon: CircleAlert,
    surfaceClass: "bg-error-bg/65",
    iconClass: "bg-white text-error shadow-[0_5px_14px_rgb(201_62_80/12%)]",
    actionClass: "bg-white text-error hover:bg-error-bg focus-visible:outline-error/40",
    progressClass: "bg-error/65",
  },
  warning: {
    icon: TriangleAlert,
    surfaceClass: "bg-warning-bg/75",
    iconClass: "bg-white text-warning shadow-[0_5px_14px_rgb(168_104_0/12%)]",
    actionClass: "bg-white text-warning hover:bg-warning-bg focus-visible:outline-warning/40",
    progressClass: "bg-warning/65",
  },
  info: {
    icon: Info,
    surfaceClass: "bg-info-bg/70",
    iconClass: "bg-white text-brand shadow-[0_5px_14px_rgb(16_69_245/12%)]",
    actionClass: "bg-white text-brand hover:bg-info-bg focus-visible:outline-brand/40",
    progressClass: "bg-brand/60",
  },
} satisfies Record<ToastVariant, {
  icon: typeof CircleCheck;
  surfaceClass: string;
  iconClass: string;
  actionClass: string;
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
      className={cn(
        "pointer-events-auto relative grid w-full grid-cols-[40px_minmax(0,1fr)_40px] items-start gap-x-3 overflow-hidden rounded-2xl px-3.5 py-3.5 shadow-[0_18px_48px_rgb(11_11_63/13%),0_4px_14px_rgb(11_11_63/6%)] md:w-fit md:min-w-[340px] md:max-w-[480px]",
        style.surfaceClass,
      )}
      role={item.variant === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocusCapture={pauseTimer}
      onBlurCapture={resumeTimer}
    >
      <span className={cn("inline-flex size-10 items-center justify-center rounded-xl", style.iconClass)} aria-hidden>
        <Icon size={20} strokeWidth={2.15} />
      </span>

      <span className="min-w-0 pt-0.5">
        <strong className="block text-sm font-semibold leading-5 tracking-[-0.01em] text-navy">{item.title}</strong>
        {item.message && <span className="mt-1 block break-words text-[13px] leading-[1.45] text-secondary">{item.message}</span>}
        {item.action && (
          <button
            className={cn(
              "mt-2.5 inline-flex min-h-10 cursor-pointer items-center rounded-xl px-3 text-xs font-semibold shadow-[0_3px_10px_rgb(11_11_63/6%)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
              style.actionClass,
            )}
            onClick={handleAction}
            type="button"
          >
            {item.action.label}
          </button>
        )}
      </span>

      <button
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-secondary transition-colors hover:bg-white/75 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/40"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        type="button"
      >
        <X size={17} strokeWidth={2} />
      </button>

      {item.duration !== null && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-navy/5" aria-hidden>
          <motion.span
            className={cn("block h-full origin-left", style.progressClass)}
            initial={{ scaleX: 1 }}
            animate={progressControls}
          />
        </span>
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
        duration:
          options.duration === undefined
            ? toastDurationForContent(title, message)
            : options.duration,
        action: options.action,
      },
    ]);
  }, []);

  const contextValue = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-[200] flex max-h-[calc(100svh-1.5rem)] flex-col items-center gap-2.5 overflow-y-auto overscroll-contain py-1 md:right-6 md:bottom-6 md:left-auto md:w-[min(480px,calc(100vw-48px))] md:items-end"
        role="region"
        aria-label="Notifications"
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
