import React from 'react';
import { getSkpExpiryStatus } from '@/features/shared/utils';
import { SkpExpiryStatus } from '@/types/welcome';

export function SkpExpiryCell({ value }: { value: string | null }) {
    const status = getSkpExpiryStatus(value);

    if (!value) {
        return <span>-</span>;
    }

    if (!status) {
        return <span>{value}</span>;
    }

    return (
        <div className="flex items-center gap-1.5">
            <span
                className={[
                    'inline-block h-2 w-2 shrink-0 rounded-full',
                    status.tone === 'expired'
                        ? 'bg-red-500'
                        : status.tone === 'active'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500',
                ].join(' ')}
            />
            <span>{value}</span>
            <span
                className={[
                    'text-xs font-medium',
                    status.tone === 'expired'
                        ? 'text-red-600'
                        : status.tone === 'active'
                          ? 'text-emerald-600'
                          : 'text-amber-600',
                ].join(' ')}
            >
                ({status.label})
            </span>
        </div>
    );
}
