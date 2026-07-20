import React from 'react';

export function PlaceholderPanel({ text }: { text: string }) {
    return (
        <section className="flex min-h-full w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-6 text-center">
            <p className="font-medium text-slate-400">{text}</p>
        </section>
    );
}
