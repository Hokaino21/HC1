import React, { useState } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Ya, Lanjutkan',
    cancelLabel = 'Batal',
    variant = 'default',
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) {
        return null;
    }

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                    <div
                        className={[
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                            isDanger ? 'bg-red-100' : 'bg-blue-100',
                        ].join(' ')}
                    >
                        {isDanger ? (
                            <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-900">{title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={[
                            'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition disabled:opacity-70',
                            isDanger
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-[#4863df] hover:bg-[#3f57c6]',
                        ].join(' ')}
                    >
                        {isLoading && (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
