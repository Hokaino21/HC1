import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

type ToastType = 'success' | 'error' | 'loading' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    success: (message: string, duration?: number) => string;
    error: (message: string, duration?: number) => string;
    loading: (message: string) => string;
    info: (message: string, duration?: number) => string;
    dismiss: (id: string) => void;
    update: (id: string, options: { message: string; type: ToastType; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

let toastCounter = 0;

function generateId(): string {
    toastCounter += 1;
    return `toast-${toastCounter}-${Date.now()}`;
}

const ICONS: Record<ToastType, React.ReactNode> = {
    success: (
        <svg className="h-5 w-5 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    error: (
        <svg className="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    loading: (
        <svg className="h-5 w-5 shrink-0 animate-spin text-[#4863df]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    ),
    info: (
        <svg className="h-5 w-5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (toast.type === 'loading' || !toast.duration) {
            return;
        }

        const timer = setTimeout(() => {
            setIsExiting(true);
        }, toast.duration);

        return () => clearTimeout(timer);
    }, [toast.duration, toast.type]);

    useEffect(() => {
        if (!isExiting) {
            return;
        }

        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 300);

        return () => clearTimeout(timer);
    }, [isExiting, onDismiss, toast.id]);

    return (
        <div
            className={[
                'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg transition-all duration-300',
                isExiting
                    ? 'translate-x-full opacity-0'
                    : 'translate-x-0 opacity-100',
                toast.type === 'error'
                    ? 'border-red-200'
                    : toast.type === 'success'
                      ? 'border-emerald-200'
                      : 'border-slate-200',
            ].join(' ')}
            role="alert"
        >
            {ICONS[toast.type]}
            <p className="flex-1 text-sm font-medium text-slate-700">{toast.message}</p>
            {toast.type !== 'loading' && (
                <button
                    type="button"
                    onClick={() => setIsExiting(true)}
                    className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Tutup notifikasi"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastsRef = useRef(toasts);
    toastsRef.current = toasts;

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType, duration?: number): string => {
        const id = generateId();
        setToasts((prev) => [...prev, { id, message, type, duration: duration ?? (type === 'loading' ? undefined : 3500) }]);
        return id;
    }, []);

    const update = useCallback((id: string, options: { message: string; type: ToastType; duration?: number }) => {
        setToasts((prev) =>
            prev.map((t) =>
                t.id === id
                    ? { ...t, message: options.message, type: options.type, duration: options.duration ?? (options.type === 'loading' ? undefined : 3500) }
                    : t,
            ),
        );
    }, []);

    const success = useCallback((message: string, duration?: number) => addToast(message, 'success', duration), [addToast]);
    const error = useCallback((message: string, duration?: number) => addToast(message, 'error', duration), [addToast]);
    const loading = useCallback((message: string) => addToast(message, 'loading'), [addToast]);
    const info = useCallback((message: string, duration?: number) => addToast(message, 'info', duration), [addToast]);

    const contextValue: ToastContextValue = { success, error, loading, info, dismiss, update };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col-reverse gap-2">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
