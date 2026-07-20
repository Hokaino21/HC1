import { Head, router, useForm } from '@inertiajs/react';
import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ComponentType, FormEvent, SVGProps } from 'react';

import {
    destroy,
    store,
    update,
} from '@/actions/App/Http/Controllers/EmployeeController';
import { home } from '@/routes';
import { exportMandatoryTraining } from '@/routes/employees';
import { pdf as templateLetterPdf } from '@/routes/template-surat';
import { Employee, TabId, UnitFilter, NavigationItem, TemplateLetterType, SkpExpiryStatus, SkpExpiryAlert, MandatoryTrainingGroup, MandatoryTrainingPreview, EmployeeAvsecArchive, EmployeeDocumentColumn } from '@/types/welcome';
import { CalendarIcon, ShieldCheckIcon, AwardIcon, MapPinIcon, LayoutGridIcon, UsersIcon, FileTextIcon, GraduationCapIcon, MenuIcon, UploadIcon, DownloadIcon, EyeIcon, ArchiveIcon, AlertTriangleIcon, CloseIcon, TrashIcon, PencilIcon } from '@/features/shared/components/icons';
import { getSkpExpiryStatus, getSkpExpiryAlerts, groupEmployeesForMandatoryTraining, buildEmployeeClassKeyMap, applyMandatoryTrainingClassOverrides, parseLocalDate, shuffleEmployees, normalizeCategoryKey } from '@/features/shared/utils';
import { PlaceholderPanel } from '@/features/shared/components/PlaceholderPanel';
import { DashboardView } from '@/features/dashboard';
import { MandatoryTrainingView } from '@/features/mandatory-training';
import { TemplateLetterView } from '@/features/template-letter';
import { EmployeeDataView } from '@/features/employee';


const navigationItems: NavigationItem[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        icon: LayoutGridIcon,
        placeholder: 'Konten Dashboard akan ditampilkan di sini',
    },
    {
        id: 'karyawan',
        title: 'Data Karyawan',
        icon: UsersIcon,
        placeholder: 'Konten Data Karyawan akan ditampilkan di sini',
    },
    {
        id: 'diklat',
        title: 'Diklat Mandatory',
        icon: GraduationCapIcon,
        placeholder: 'Konten Diklat Mandatory akan ditampilkan di sini',
    },
    {
        id: 'template',
        title: 'Template Surat',
        icon: FileTextIcon,
        placeholder: 'Konten Template Surat akan ditampilkan di sini',
    },
];


export default function Welcome({
    employees = [],
    filters = { license: null },
}: WelcomeProps) {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const activeItem =
        navigationItems.find((item) => item.id === activeTab) ??
        navigationItems[0];

    function selectTab(tabId: TabId) {
        setActiveTab(tabId);
        setIsSidebarOpen(false);
    }

    return (
        <>
            <Head title="Injourney Airports" />

            <div className="flex h-screen w-full overflow-hidden bg-white text-slate-800">
                <aside
                    className={[
                        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#2f4585] text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
                    ].join(' ')}
                >
                    <div className="flex h-20 items-center gap-3 border-b border-white/15 bg-[#253a73] px-6 shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">
                        <img
                            src="/icon_API.png"
                            alt="API"
                            className="h-10 w-10 rounded-lg object-contain shadow-sm ring-1 ring-white/20"
                        />
                        <span className="text-xl font-bold tracking-wide text-white">
                            HC Development
                        </span>
                    </div>

                    <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.id === activeTab;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => selectTab(item.id)}
                                    className={[
                                        'flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left text-[15px] font-medium transition-all',
                                        isActive
                                            ? 'bg-[#4863df] text-white shadow-sm'
                                            : 'text-white/70 hover:bg-white/5 hover:text-white',
                                    ].join(' ')}
                                >
                                    <Icon className="h-[22px] w-[22px]" />
                                    <span>{item.title}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {isSidebarOpen && (
                    <button
                        type="button"
                        aria-label="Tutup menu"
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
                    />
                )}

                <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
                    <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6">
                        <button
                            type="button"
                            aria-label="Buka menu"
                            onClick={() => setIsSidebarOpen(true)}
                            className="mr-4 -ml-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                        >
                            <MenuIcon className="h-6 w-6" />
                        </button>
                        <h1 className="text-lg font-bold text-slate-800">
                            {activeItem.title}
                        </h1>
                    </header>

                    <div
                        className={[
                            'flex-1 min-h-0 min-w-0 p-4 sm:p-6 lg:p-8',
                            activeTab === 'karyawan'
                                ? 'flex min-h-0 flex-col overflow-y-auto overflow-x-hidden'
                                : 'overflow-y-auto',
                        ].join(' ')}
                    >
                        {activeTab === 'karyawan' ? (
                            <EmployeeDataView
                                employees={employees}
                                initialLicenseFilter={filters.license ?? ''}
                            />
                        ) : activeTab === 'diklat' ? (
                            <MandatoryTrainingView employees={employees} />
                        ) : activeTab === 'template' ? (
                            <TemplateLetterView />
                        ) : activeTab === 'dashboard' ? (
                            <DashboardView employees={employees} />
                        ) : (
                            <PlaceholderPanel text={activeItem.placeholder} />
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}
