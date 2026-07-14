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

type TabId = 'dashboard' | 'karyawan' | 'diklat' | 'template';
type UnitFilter = '' | 'teknik' | 'avsek' | 'pkpk' | 'arff' | 'amc';
type SkpFilter = '' | 'expired' | 'active' | 'within_year';
type TemplateLetterType = 'bp3' | 'ppic';

type NavigationItem = {
    id: TabId;
    title: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    placeholder: string;
};

type Employee = {
    id: number;
    nik: string;
    name: string;
    place_of_birth: string | null;
    date_of_birth: string | null;
    position: string | null;
    pg: string | null;
    unit: string | null;
    location: string | null;
    unit_label: string | null;
    skp_expired: string | null;
    function_category: string | null;
    training_schedule: string | null;
    avsec_category: string | null;
    avsec_archives: EmployeeAvsecArchive[];
    photo_jpg: string | null;
    ktp_pdf: string | null;
    competency_certificate: string | null;
    latest_certificate: string | null;
    latest_education_certificate: string | null;
    license_book: string | null;
    curriculum_vitae: string | null;
    skck: string | null;
    background_check: string | null;
    whatsapp_number: string | null;
};

type EmployeeAvsecArchive = {
    id: string;
    nik: string | null;
    name: string | null;
    place_of_birth: string | null;
    date_of_birth: string | null;
    position: string | null;
    pg: string | null;
    unit: string | null;
    location: string | null;
    skp_expired: string | null;
    function_category: string | null;
    training_schedule: string | null;
    avsec_category: string;
    photo_jpg: string | null;
    ktp_pdf: string | null;
    competency_certificate: string | null;
    latest_certificate: string | null;
    latest_education_certificate: string | null;
    license_book: string | null;
    curriculum_vitae: string | null;
    skck: string | null;
    background_check: string | null;
    whatsapp_number: string | null;
    archived_at: string | null;
};

type EmployeeDocumentColumn = {
    key: keyof Pick<
        Employee,
        | 'photo_jpg'
        | 'ktp_pdf'
        | 'competency_certificate'
        | 'latest_certificate'
        | 'latest_education_certificate'
        | 'license_book'
        | 'curriculum_vitae'
        | 'skck'
        | 'background_check'
        | 'whatsapp_number'
    >;
    label: string;
};

type WelcomeProps = {
    employees: Employee[];
    filters: {
        unit: UnitFilter | null;
    };
};

type SkpExpiryStatus = {
    label: string;
    tone: 'expired' | 'warning' | 'active';
};

type SkpExpiryAlert = {
    employee: Employee;
    status: SkpExpiryStatus;
};

type MandatoryTrainingGroup = {
    key: string;
    skpExpired: string | null;
    functionCategory: string | null;
    employees: Employee[];
    tableNumber: number;
    totalTables: number;
    totalCategoryEmployees: number;
};

type MandatoryTrainingPreview = {
    groupKey: string;
    documentTitle: string;
    batchName: string;
    functionCategory: string | null;
    classLabel: string;
    employees: Employee[];
};

const templateLetterTypes: Array<{ id: TemplateLetterType; label: string }> = [
    { id: 'bp3', label: 'BP3' },
    { id: 'ppic', label: 'PPIC' },
];

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

const employeeDocumentColumns: EmployeeDocumentColumn[] = [
    { key: 'photo_jpg', label: 'Pas Foto' },
    { key: 'ktp_pdf', label: 'KTP' },
    {
        key: 'competency_certificate',
        label: 'Sertifikat Kompetensi',
    },
    {
        key: 'latest_certificate',
        label: 'Sertifikat Terakhir',
    },
    {
        key: 'latest_education_certificate',
        label: 'Ijazah Pendidikan Terakhir',
    },
    { key: 'license_book', label: 'Buku Lisensi' },
    { key: 'curriculum_vitae', label: 'Daftar Riwayat Hidup' },
    { key: 'skck', label: 'SKCK' },
    { key: 'background_check', label: 'Background Check' },
    { key: 'whatsapp_number', label: 'Nomor WA' },
];

const employeeTableColumns = [
    'Ceklis',
    'No',
    'NIK',
    'Nama',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Jabatan',
    'PG',
    'Unit',
    'Lokasi',
    'SKP Expired',
    'License',
    'Jadwal Diklat',
    'Kategori Avsec',
    ...employeeDocumentColumns.map((column) => column.label),
    'Aksi',
];

const mandatoryTrainingBaseColumns = [
    'No',
    'NIK',
    'Nama',
    'Lokasi',
    'Jabatan',
    'SKP Expired',
    'License',
];

const mandatoryTrainingRowsPerTable = 25;

export default function Welcome({
    employees = [],
    filters = { unit: null },
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
                                ? 'flex flex-col overflow-hidden'
                                : 'overflow-y-auto',
                        ].join(' ')}
                    >
                        {activeTab === 'karyawan' ? (
                            <EmployeeDataView
                                employees={employees}
                                unitFilter={filters.unit ?? ''}
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

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
    );
}

function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function AwardIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
    );
}

function MapPinIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function DashboardView({ employees = [] }: { employees: Employee[] }) {
    const [avsecFilter, setAvsecFilter] = useState<string>('all');
    const [licenseFilter, setLicenseFilter] = useState<string>('all');

    // 1. Filter employees based on Avsec Category (Senior, Basic, Junior)
    const filteredEmployees = useMemo(() => {
        return employees.filter((employee) => {
            if (avsecFilter !== 'all') {
                return (
                    employee.avsec_category?.toLowerCase() ===
                    avsecFilter.toLowerCase()
                );
            }

            return true;
        });
    }, [employees, avsecFilter]);

    // Get all unique function categories for status filtering
    const licenseTypes = useMemo(() => {
        const categories = new Set<string>();
        employees.forEach((e) => {
            if (e.function_category) {
                categories.add(e.function_category);
            }
        });

        return Array.from(categories).sort();
    }, [employees]);

    // 2. Summary stats
    const stats = useMemo(() => {
        let active = 0;
        let warning = 0;
        let expired = 0;
        let noData = 0;

        filteredEmployees.forEach((e) => {
            const status = getSkpExpiryStatus(e.skp_expired);

            if (!e.skp_expired) {
                noData++;
            } else if (status?.tone === 'expired') {
                expired++;
            } else if (status?.tone === 'warning') {
                warning++;
            } else {
                active++;
            }
        });

        return {
            total: filteredEmployees.length,
            active,
            warning,
            expired,
            noData,
        };
    }, [filteredEmployees]);

    // 3. Location counts for Horizontal Chart (Left Chart)
    const locationCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredEmployees.forEach((e) => {
            const loc = e.location?.trim() || 'Belum Diisi';
            counts[loc] = (counts[loc] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredEmployees]);

    const maxLocationCount = useMemo(() => {
        return Math.max(...locationCounts.map((l) => l.count), 1);
    }, [locationCounts]);

    // 4. License counts for Vertical Chart (Bottom Chart)
    const licenseCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredEmployees.forEach((e) => {
            const lic = e.function_category?.trim() || 'Belum Diisi';
            counts[lic] = (counts[lic] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredEmployees]);

    const maxLicenseCount = useMemo(() => {
        return Math.max(...licenseCounts.map((l) => l.count), 1);
    }, [licenseCounts]);

    // 5. Expiry status specifically filtered by License Type (Second Dashboard section)
    const statusFilteredEmployees = useMemo(() => {
        return filteredEmployees.filter((e) => {
            if (licenseFilter !== 'all') {
                return e.function_category === licenseFilter;
            }

            return true;
        });
    }, [filteredEmployees, licenseFilter]);

    const statusFilteredStats = useMemo(() => {
        let active = 0;
        let warning = 0;
        let expired = 0;
        let noData = 0;

        statusFilteredEmployees.forEach((e) => {
            const status = getSkpExpiryStatus(e.skp_expired);

            if (!e.skp_expired) {
                noData++;
            } else if (status?.tone === 'expired') {
                expired++;
            } else if (status?.tone === 'warning') {
                warning++;
            } else {
                active++;
            }
        });

        return {
            total: statusFilteredEmployees.length,
            active,
            warning,
            expired,
            noData,
        };
    }, [statusFilteredEmployees]);

    // 6. Stacked status per license type
    const licenseTypeStatuses = useMemo(() => {
        const statuses: Record<
            string,
            {
                active: number;
                warning: number;
                expired: number;
                noData: number;
                total: number;
            }
        > = {};

        filteredEmployees.forEach((e) => {
            const lic = e.function_category?.trim() || 'Belum Diisi';

            if (!statuses[lic]) {
                statuses[lic] = {
                    active: 0,
                    warning: 0,
                    expired: 0,
                    noData: 0,
                    total: 0,
                };
            }

            statuses[lic].total++;
            const status = getSkpExpiryStatus(e.skp_expired);

            if (!e.skp_expired) {
                statuses[lic].noData++;
            } else if (status?.tone === 'expired') {
                statuses[lic].expired++;
            } else if (status?.tone === 'warning') {
                statuses[lic].warning++;
            } else {
                statuses[lic].active++;
            }
        });

        return Object.entries(statuses)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [filteredEmployees]);

    return (
        <div className="flex flex-col gap-6">
            {/* Header & Filter Card */}
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Dashboard Analitik Personel & Lisensi
                        </h2>
                        <p className="text-sm text-slate-500">
                            Overview status keaktifan, lisensi, dan lokasi
                            personel bandara secara real-time.
                        </p>
                    </div>
                    {/* Avsec Level Filter */}
                    <div className="flex shrink-0 flex-col gap-1.5">
                        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Filter Level Avsec
                        </span>
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                            {['all', 'Senior', 'Basic', 'Junior'].map(
                                (level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setAvsecFilter(level)}
                                        className={[
                                            'rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                                            avsecFilter === level
                                                ? 'bg-white text-[#4863df] shadow-sm ring-1 ring-slate-200/50'
                                                : 'text-slate-500 hover:text-slate-800',
                                        ].join(' ')}
                                    >
                                        {level === 'all'
                                            ? 'Semua Level'
                                            : level}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Personel"
                    value={stats.total}
                    description="Personel terdaftar"
                    icon={<UsersIcon className="h-6 w-6 text-slate-500" />}
                    colorClass="border-l-4 border-slate-400"
                />
                <StatCard
                    title="Lisensi Aktif"
                    value={stats.active}
                    description="Masa berlaku aman"
                    icon={
                        <ShieldCheckIcon className="h-6 w-6 text-emerald-500" />
                    }
                    colorClass="border-l-4 border-emerald-500 bg-emerald-50/10"
                />
                <StatCard
                    title="Mendekati Expired"
                    value={stats.warning}
                    description="Habis dalam < 12 bulan"
                    icon={<CalendarIcon className="h-6 w-6 text-amber-500" />}
                    colorClass="border-l-4 border-amber-500 bg-amber-50/10"
                />
                <StatCard
                    title="Lisensi Expired"
                    value={stats.expired}
                    description="Masa berlaku habis"
                    icon={
                        <AlertTriangleIcon className="h-6 w-6 text-rose-500" />
                    }
                    colorClass="border-l-4 border-rose-500 bg-rose-50/10"
                />
            </div>

            {/* FIRST DASHBOARD: Distribusi Lokasi & Lisensi */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* Location Chart (Left column) */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <MapPinIcon className="h-5 w-5 text-indigo-500" />
                        <h3 className="font-bold text-slate-800">
                            Distribusi Lokasi Personel
                        </h3>
                    </div>
                    {locationCounts.length > 0 ? (
                        <div className="mt-2 flex max-h-[300px] flex-col gap-4 overflow-y-auto pr-1">
                            {locationCounts.map((item) => (
                                <div
                                    key={item.name}
                                    className="flex flex-col gap-1.5"
                                >
                                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                                        <span>{item.name}</span>
                                        <span>{item.count} Personel</span>
                                    </div>
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500 ease-out"
                                            style={{
                                                width: `${(item.count / maxLocationCount) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-40 items-center justify-center text-sm font-medium text-slate-400">
                            Tidak ada data lokasi
                        </div>
                    )}
                </div>

                {/* License Chart (Right column) */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <AwardIcon className="h-5 w-5 text-blue-500" />
                        <h3 className="font-bold text-slate-800">
                            Distribusi Kategori Lisensi (Fungsi)
                        </h3>
                    </div>
                    {licenseCounts.length > 0 ? (
                        <div className="flex h-full min-h-[300px] flex-col justify-between pt-4">
                            <div className="flex h-60 items-end justify-around gap-3 px-2">
                                {licenseCounts.map((item) => (
                                    <div
                                        key={item.name}
                                        className="group relative flex h-full flex-1 flex-col items-center justify-end"
                                    >
                                        {/* Tooltip */}
                                        <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden flex-col items-center group-hover:flex">
                                            <span className="rounded bg-slate-800 px-2 py-1 text-xs font-bold whitespace-nowrap text-white shadow-md">
                                                {item.name}: {item.count}
                                            </span>
                                            <div className="-mt-1 h-1.5 w-1.5 rotate-45 bg-slate-800"></div>
                                        </div>
                                        {/* Bar */}
                                        <div
                                            className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 shadow-sm transition-all duration-500 ease-out hover:from-blue-700 hover:to-cyan-500"
                                            style={{
                                                height: `${(item.count / maxLicenseCount) * 100}%`,
                                            }}
                                        />
                                        <span
                                            className="mt-2 w-full truncate text-center text-[10px] font-bold text-slate-500"
                                            title={item.name}
                                        >
                                            {item.name}
                                        </span>
                                        <span className="mt-0.5 text-xs font-bold text-slate-700">
                                            {item.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-60 items-center justify-center text-sm font-medium text-slate-400">
                            Tidak ada data fungsi/lisensi
                        </div>
                    )}
                </div>
            </div>

            {/* SECOND DASHBOARD: Status Keaktifan Lisensi (Expired vs Aktif) */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* Donut Chart Rasio Keaktifan */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
                            <h3 className="font-bold text-slate-800">
                                Rasio Keaktifan Lisensi
                            </h3>
                        </div>
                        {/* Selector based on license type */}
                        <select
                            value={licenseFilter}
                            onChange={(e) => setLicenseFilter(e.target.value)}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 transition outline-none focus:border-[#4863df] focus:ring-1 focus:ring-[#4863df]/20"
                        >
                            <option value="all">Semua Lisensi</option>
                            {licenseTypes.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col items-center justify-center py-4 sm:flex-row sm:gap-8">
                        <DonutChart
                            active={statusFilteredStats.active}
                            warning={statusFilteredStats.warning}
                            expired={statusFilteredStats.expired}
                            noData={statusFilteredStats.noData}
                            total={statusFilteredStats.total}
                        />
                        <div className="mt-4 flex flex-col gap-2.5 sm:mt-0">
                            <LegendItem
                                color="bg-emerald-500"
                                label="Aktif"
                                count={statusFilteredStats.active}
                                total={statusFilteredStats.total}
                            />
                            <LegendItem
                                color="bg-amber-500"
                                label="Mendekati Expired"
                                count={statusFilteredStats.warning}
                                total={statusFilteredStats.total}
                            />
                            <LegendItem
                                color="bg-rose-500"
                                label="Expired"
                                count={statusFilteredStats.expired}
                                total={statusFilteredStats.total}
                            />
                            <LegendItem
                                color="bg-slate-400"
                                label="Tanpa Data SKP"
                                count={statusFilteredStats.noData}
                                total={statusFilteredStats.total}
                            />
                        </div>
                    </div>
                </div>

                {/* Stacked Bar Chart per License Type */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <AwardIcon className="h-5 w-5 text-indigo-500" />
                        <h3 className="font-bold text-slate-800">
                            Status Keaktifan Per Kategori Lisensi
                        </h3>
                    </div>

                    {licenseTypeStatuses.length > 0 ? (
                        <div className="mt-2 flex max-h-[300px] flex-col gap-4 overflow-y-auto pr-1">
                            {licenseTypeStatuses.map((item) => {
                                const actPct =
                                    item.total > 0
                                        ? (item.active / item.total) * 100
                                        : 0;
                                const warnPct =
                                    item.total > 0
                                        ? (item.warning / item.total) * 100
                                        : 0;
                                const expPct =
                                    item.total > 0
                                        ? (item.expired / item.total) * 100
                                        : 0;
                                const ndPct =
                                    item.total > 0
                                        ? (item.noData / item.total) * 100
                                        : 0;

                                return (
                                    <div
                                        key={item.name}
                                        className="flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-slate-700">
                                                {item.name}{' '}
                                                <span className="text-[10px] text-slate-400">
                                                    ({item.total} personel)
                                                </span>
                                            </span>
                                            <div className="flex gap-2.5 text-[10px]">
                                                {item.active > 0 && (
                                                    <span className="font-medium text-emerald-600">
                                                        Aktif: {item.active}
                                                    </span>
                                                )}
                                                {item.warning > 0 && (
                                                    <span className="font-medium text-amber-600">
                                                        H-365: {item.warning}
                                                    </span>
                                                )}
                                                {item.expired > 0 && (
                                                    <span className="font-medium text-rose-600">
                                                        Exp: {item.expired}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                                            {item.active > 0 && (
                                                <div
                                                    className="h-full bg-emerald-500 transition-all duration-500"
                                                    style={{
                                                        width: `${actPct}%`,
                                                    }}
                                                    title={`Aktif: ${item.active} (${actPct.toFixed(1)}%)`}
                                                />
                                            )}
                                            {item.warning > 0 && (
                                                <div
                                                    className="h-full bg-amber-500 transition-all duration-500"
                                                    style={{
                                                        width: `${warnPct}%`,
                                                    }}
                                                    title={`Mendekati Expired: ${item.warning} (${warnPct.toFixed(1)}%)`}
                                                />
                                            )}
                                            {item.expired > 0 && (
                                                <div
                                                    className="h-full bg-rose-500 transition-all duration-500"
                                                    style={{
                                                        width: `${expPct}%`,
                                                    }}
                                                    title={`Expired: ${item.expired} (${expPct.toFixed(1)}%)`}
                                                />
                                            )}
                                            {item.noData > 0 && (
                                                <div
                                                    className="h-full bg-slate-400 transition-all duration-500"
                                                    style={{
                                                        width: `${ndPct}%`,
                                                    }}
                                                    title={`Tanpa Data SKP: ${item.noData} (${ndPct.toFixed(1)}%)`}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex h-40 items-center justify-center text-sm font-medium text-slate-400">
                            Tidak ada data kategori
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    description,
    icon,
    colorClass,
}: {
    title: string;
    value: number;
    description: string;
    icon: React.ReactNode;
    colorClass?: string;
}) {
    return (
        <div
            className={[
                'rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md',
                colorClass,
            ].join(' ')}
        >
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">
                    {title}
                </span>
                {icon}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {value}
                </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
    );
}

function DonutChart({
    active,
    warning,
    expired,
    noData,
    total,
}: {
    active: number;
    warning: number;
    expired: number;
    noData: number;
    total: number;
}) {
    const radius = 65;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;

    if (total === 0) {
        return (
            <div className="relative flex items-center justify-center">
                <svg width="180" height="180" className="rotate-[-90deg]">
                    <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-slate-300">
                        0
                    </span>
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        Personel
                    </span>
                </div>
            </div>
        );
    }

    const activePct = active / total;
    const warningPct = warning / total;
    const expiredPct = expired / total;
    const noDataPct = noData / total;

    // Calculate offsets
    const activeLength = activePct * circumference;
    const warningLength = warningPct * circumference;
    const expiredLength = expiredPct * circumference;
    const noDataLength = noDataPct * circumference;

    const offset1 = 0;
    const offset2 = activeLength;
    const offset3 = activeLength + warningLength;
    const offset4 = activeLength + warningLength + expiredLength;

    return (
        <div className="relative flex items-center justify-center">
            <svg width="180" height="180" className="rotate-[-90deg]">
                {/* Background circle */}
                <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth + 2}
                />
                {/* Active slice */}
                {active > 0 && (
                    <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${activeLength} ${circumference}`}
                        strokeDashoffset={-offset1}
                        className="transition-all duration-500 ease-in-out"
                        strokeLinecap={active === total ? 'butt' : 'round'}
                    />
                )}
                {/* Warning slice */}
                {warning > 0 && (
                    <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${warningLength} ${circumference}`}
                        strokeDashoffset={-offset2}
                        className="transition-all duration-500 ease-in-out"
                        strokeLinecap={warning === total ? 'butt' : 'round'}
                    />
                )}
                {/* Expired slice */}
                {expired > 0 && (
                    <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="transparent"
                        stroke="#f43f5e"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${expiredLength} ${circumference}`}
                        strokeDashoffset={-offset3}
                        className="transition-all duration-500 ease-in-out"
                        strokeLinecap={expired === total ? 'butt' : 'round'}
                    />
                )}
                {/* No Data slice */}
                {noData > 0 && (
                    <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="transparent"
                        stroke="#94a3b8"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${noDataLength} ${circumference}`}
                        strokeDashoffset={-offset4}
                        className="transition-all duration-500 ease-in-out"
                        strokeLinecap={noData === total ? 'butt' : 'round'}
                    />
                )}
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-800">
                    {total}
                </span>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Total
                </span>
            </div>
        </div>
    );
}

function LegendItem({
    color,
    label,
    count,
    total,
}: {
    color: string;
    label: string;
    count: number;
    total: number;
}) {
    const pct = total > 0 ? (count / total) * 100 : 0;

    return (
        <div className="flex items-center gap-3">
            <span
                className={['h-3 w-3 shrink-0 rounded-full', color].join(' ')}
            />
            <div className="flex w-40 items-center justify-between gap-4 text-xs font-semibold">
                <span className="text-slate-550">{label}</span>
                <span className="text-slate-800">
                    {count}{' '}
                    <span className="text-slate-450 text-[10px]">
                        ({pct.toFixed(0)}%)
                    </span>
                </span>
            </div>
        </div>
    );
}

function PlaceholderPanel({ text }: { text: string }) {
    return (
        <section className="flex min-h-full w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-6 text-center">
            <p className="font-medium text-slate-400">{text}</p>
        </section>
    );
}

function MandatoryTrainingView({ employees }: { employees: Employee[] }) {
    const [checkedEmployeeIds, setCheckedEmployeeIds] = useState<Set<number>>(
        () => new Set(),
    );
    const [classOverrides, setClassOverrides] = useState<
        Record<number, string>
    >({});
    const [batchNames, setBatchNames] = useState<Record<string, string>>({});
    const [documentTitles, setDocumentTitles] = useState<
        Record<string, string>
    >({});
    const [searchQuery, setSearchQuery] = useState('');
    const [previewData, setPreviewData] =
        useState<MandatoryTrainingPreview | null>(null);

    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) {
            return employees;
        }

        const lowerQuery = searchQuery.toLowerCase().trim();

        return employees.filter(
            (employee) =>
                employee.nik.toLowerCase().includes(lowerQuery) ||
                employee.name.toLowerCase().includes(lowerQuery) ||
                (employee.function_category &&
                    employee.function_category
                        .toLowerCase()
                        .includes(lowerQuery)),
        );
    }, [employees, searchQuery]);

    const generatedGroups = useMemo(
        () => groupEmployeesForMandatoryTraining(filteredEmployees),
        [filteredEmployees],
    );
    const baseEmployeeClassKeys = useMemo(
        () => buildEmployeeClassKeyMap(generatedGroups),
        [generatedGroups],
    );
    const groupedEmployees = useMemo(
        () =>
            applyMandatoryTrainingClassOverrides(
                generatedGroups,
                classOverrides,
            ),
        [classOverrides, generatedGroups],
    );
    const classOptions = groupedEmployees.map((group) => ({
        key: group.key,
        label: `${group.functionCategory || 'Belum diisi'} ${group.tableNumber}`,
    }));

    function toggleEmployeeCheck(employeeId: number) {
        setCheckedEmployeeIds((currentIds) => {
            const nextIds = new Set(currentIds);

            if (nextIds.has(employeeId)) {
                nextIds.delete(employeeId);
            } else {
                nextIds.add(employeeId);
            }

            return nextIds;
        });
    }

    function toggleGroupChecks(groupKey: string) {
        const group = groupedEmployees.find((g) => g.key === groupKey);

        if (!group) {
            return;
        }

        setCheckedEmployeeIds((currentIds) => {
            const nextIds = new Set(currentIds);
            const groupIds = group.employees.map((e) => e.id);
            const allChecked = groupIds.every((id) => currentIds.has(id));

            groupIds.forEach((id) => {
                if (allChecked) {
                    nextIds.delete(id);
                } else {
                    nextIds.add(id);
                }
            });

            return nextIds;
        });
    }

    function moveEmployeeToClass(employeeId: number, targetClassKey: string) {
        setClassOverrides((currentOverrides) => {
            const nextOverrides = { ...currentOverrides };
            const baseClassKey = baseEmployeeClassKeys.get(employeeId);

            if (!baseClassKey || targetClassKey === baseClassKey) {
                delete nextOverrides[employeeId];
            } else {
                nextOverrides[employeeId] = targetClassKey;
            }

            return nextOverrides;
        });
    }

    function submitMandatoryTrainingExport(preview: MandatoryTrainingPreview) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = exportMandatoryTraining.url();

        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        if (csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);
        }

        const documentTitleInput = document.createElement('input');
        documentTitleInput.type = 'hidden';
        documentTitleInput.name = 'document_title';
        documentTitleInput.value = preview.documentTitle;
        form.appendChild(documentTitleInput);

        const batchNameInput = document.createElement('input');
        batchNameInput.type = 'hidden';
        batchNameInput.name = 'batch_name';
        batchNameInput.value = preview.batchName;
        form.appendChild(batchNameInput);

        preview.employees.forEach((employee) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'employee_ids[]';
            input.value = employee.id.toString();
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    function handlePreviewGroup(groupKey: string) {
        const group = groupedEmployees.find((g) => g.key === groupKey);

        if (!group) {
            return;
        }

        const selectedEmployees = group.employees.filter((employee) =>
            checkedEmployeeIds.has(employee.id),
        );

        if (selectedEmployees.length === 0) {
            alert('Pilih minimal satu karyawan untuk dipreview');

            return;
        }

        setPreviewData({
            groupKey,
            documentTitle: documentTitles[groupKey] || 'DAFTAR PESERTA',
            batchName: batchNames[groupKey] || `Kelas-${group.tableNumber}`,
            functionCategory: group.functionCategory,
            classLabel: `${group.functionCategory || 'Belum diisi'} ${group.tableNumber}`,
            employees: selectedEmployees,
        });
    }

    function handleConfirmExport() {
        if (!previewData) {
            return;
        }

        submitMandatoryTrainingExport(previewData);
        setPreviewData(null);
    }

    return (
        <section className="flex min-h-full flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:max-w-xs">
                    Cari (NIK, Nama, License)
                    <input
                        type="text"
                        placeholder="Cari karyawan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                    />
                </label>
            </div>
            {groupedEmployees.length > 0 ? (
                groupedEmployees.map((group) => {
                    const tableColumns = [
                        ...mandatoryTrainingBaseColumns,
                        ' Kelas',
                        'Ceklis',
                    ];
                    const groupIds = group.employees.map((e) => e.id);
                    const groupCheckedCount = groupIds.filter((id) =>
                        checkedEmployeeIds.has(id),
                    ).length;
                    const isAllGroupChecked =
                        groupIds.length > 0 &&
                        groupCheckedCount === groupIds.length;

                    return (
                        <div
                            key={group.key}
                            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="rounded-lg bg-[#4863df]/10 px-3 py-1 text-sm font-semibold text-[#2f4585] ring-1 ring-[#4863df]/20">
                                        License:{' '}
                                        {group.functionCategory ??
                                            'Belum diisi'}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-500">
                                        {group.functionCategory ||
                                            'Belum diisi'}{' '}
                                        {group.tableNumber}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                                        Judul Dokumen
                                        <input
                                            type="text"
                                            value={
                                                documentTitles[group.key] || ''
                                            }
                                            onChange={(e) =>
                                                setDocumentTitles((prev) => ({
                                                    ...prev,
                                                    [group.key]: e.target.value,
                                                }))
                                            }
                                            placeholder="Masukan Judul Dokumen"
                                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                                        Nama Batch
                                        <input
                                            type="text"
                                            value={batchNames[group.key] || ''}
                                            onChange={(e) =>
                                                setBatchNames((prev) => ({
                                                    ...prev,
                                                    [group.key]: e.target.value,
                                                }))
                                            }
                                            placeholder="Masukkan nama batch"
                                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                                        />
                                    </label>
                                    <div className="text-sm font-semibold text-slate-600">
                                        {groupCheckedCount} dari{' '}
                                        {groupIds.length} data diceklis
                                    </div>
                                    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={isAllGroupChecked}
                                            onChange={() =>
                                                toggleGroupChecks(group.key)
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-[#4863df] focus:ring-[#4863df]"
                                        />
                                        Ceklis semua
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handlePreviewGroup(group.key)
                                        }
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f57c6]"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        Preview PDF
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-hidden">
                                <table className="w-full table-fixed border-collapse text-left text-sm">
                                    <thead className="bg-white text-xs font-semibold text-slate-500 uppercase">
                                        <tr>
                                            {tableColumns.map((column) => (
                                                <th
                                                    key={column}
                                                    scope="col"
                                                    className="border-b border-slate-200 px-4 py-3 whitespace-normal"
                                                >
                                                    {column}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {group.employees.map(
                                            (employee, index) => (
                                                <tr
                                                    key={employee.id}
                                                    className="text-slate-700 hover:bg-slate-50"
                                                >
                                                    <td className="px-4 py-3">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.nik}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">
                                                        {employee.name}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.location ??
                                                            '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.position ??
                                                            '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <SkpExpiryCell
                                                            value={
                                                                employee.skp_expired
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.function_category ??
                                                            '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={group.key}
                                                            onChange={(event) =>
                                                                moveEmployeeToClass(
                                                                    employee.id,
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="h-9 w-full max-w-[220px] rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                                                            aria-label={`Pindah kelas ${employee.name}`}
                                                        >
                                                            {classOptions.map(
                                                                (option) => (
                                                                    <option
                                                                        key={
                                                                            option.key
                                                                        }
                                                                        value={
                                                                            option.key
                                                                        }
                                                                    >
                                                                        {
                                                                            option.label
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={checkedEmployeeIds.has(
                                                                employee.id,
                                                            )}
                                                            onChange={() =>
                                                                toggleEmployeeCheck(
                                                                    employee.id,
                                                                )
                                                            }
                                                            aria-label={`Ceklis ${employee.name}`}
                                                            className="h-4 w-4 rounded border-slate-300 text-[#4863df] focus:ring-[#4863df]"
                                                        />
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })
            ) : (
                <PlaceholderPanel text="Belum ada data karyawan untuk daftar diklat mandatory." />
            )}
            {previewData ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="border-b border-slate-200 px-6 py-4">
                            <p className="text-xs font-semibold tracking-wide text-[#4863df] uppercase">
                                Preview Diklat Mandatory
                            </p>
                            <h3 className="mt-1 text-lg font-bold text-slate-900">
                                {previewData.documentTitle}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                    Batch: {previewData.batchName}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                    License:{' '}
                                    {previewData.functionCategory ||
                                        'Belum diisi'}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                    Kelas: {previewData.classLabel}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                    Peserta: {previewData.employees.length}
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-hidden overflow-y-auto px-6 py-4">
                            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-900">
                                        {previewData.documentTitle}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {previewData.batchName}
                                    </p>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full table-fixed border-collapse text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                        <tr>
                                            {mandatoryTrainingBaseColumns.map(
                                                (column) => (
                                                    <th
                                                        key={column}
                                                        className="border-b border-slate-200 px-4 py-3 whitespace-normal"
                                                    >
                                                        {column}
                                                    </th>
                                                ),
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {previewData.employees.map(
                                            (employee, index) => (
                                                <tr key={employee.id}>
                                                    <td className="px-4 py-3">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.nik}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">
                                                        {employee.name}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.location ??
                                                            '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.position ??
                                                            '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.skp_expired ??
                                                            '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.function_category ??
                                                            '-'}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setPreviewData(null)}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Tutup
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmExport}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f57c6]"
                            >
                                <DownloadIcon className="h-4 w-4" />
                                Export PDF
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
function TemplateLetterView() {
    const [draft, setDraft] = useState({
        template: 'bp3' as TemplateLetterType,
        number: 'API.17610/DL.06.01/2026/REG I-B',
        date: 'Tangerang, 01 Juli 2026',
        body: 'HK.201/1/7/BP3C/2026; PJJ.CGR.HCB.0003/DL.06.01/2026',
    });
    const [letter, setLetter] = useState(draft);
    const outputQuery = {
        template: letter.template,
        number: letter.number,
        date: letter.date,
        body: letter.body,
    };
    // const pdfUrl = templateLetterPdf.url({
    //     query: outputQuery,
    // });
    const downloadPdfUrl = templateLetterPdf.url({
        query: {
            ...outputQuery,
            download: true,
        },
    });

    // Template configs for preview
    const templateConfigs: Record<
        TemplateLetterType,
        {
            perihal: string;
            tujuan: string;
            isi: string;
        }
    > = {
        bp3: {
            perihal:
                'Permohonan Pelaksanaan Recurrent Senior Avsec bagi Karyawan Kantor Regional I PT Angkasa Pura Indonesia (Persero)',
            tujuan: 'KEPADA BALAI PENDIDIKAN DAN PELATIHAN PENERBANGAN (BP3) CURUG',
            isi: 'Menindaklanjuti Perjanjian Kerjasama Antara Balai Pendidikan dan Pelatihan Penerbangan Curug dan PT Angkasa Pura Indonesia Kantor Regional I Nomor {isi} Tentang Pelatihan Personel Bidang Bandar Udara (Refreshment) Dan Personel Bidang Keamanan Penerbangan (Recurrent), bersama ini disampaikan permohonan pelaksanaan Pelatihan Recurrent Senior Avsec bagi karyawan di lingkungan Regional I PT Angkasa Pura Indonesia (Persero).',
        },
        ppic: {
            perihal: 'Permohonan Pelaksanaan Pelatihan PPIC',
            tujuan: 'KEPADA PIHAK YANG BERWAJIB',
            isi: 'Menindaklanjuti Perjanjian Kerjasama Antara Pihak Terkait dan PT Angkasa Pura Indonesia Kantor Regional I Nomor {isi} Tentang Pelatihan PPIC, bersama ini disampaikan permohonan pelaksanaan Pelatihan PPIC bagi karyawan di lingkungan Regional I PT Angkasa Pura Indonesia (Persero).',
        },
    };

    const currentConfig =
        templateConfigs[letter.template] || templateConfigs.bp3;

    function updateTemplate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLetter(draft);
    }

    return (
        <section className="flex min-h-full flex-col gap-4">
            <form
                onSubmit={updateTemplate}
                className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
            >
                <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Pilih Template
                        <select
                            value={draft.template}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    template: event.target
                                        .value as TemplateLetterType,
                                }))
                            }
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        >
                            {templateLetterTypes.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Nomor Surat
                        <input
                            type="text"
                            value={draft.number}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    number: event.target.value,
                                }))
                            }
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Tanggal Surat
                        <input
                            type="text"
                            value={draft.date}
                            placeholder="mis. Tangerang, 01 Juli 2026"
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    date: event.target.value,
                                }))
                            }
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Isi Surat (Nomor PKS)
                        <textarea
                            value={draft.body}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    body: event.target.value,
                                }))
                            }
                            rows={4}
                            className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        />
                    </label>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f57c6]"
                        >
                            Generate Surat
                        </button>
                        <a
                            href={downloadPdfUrl}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#4863df]/30 bg-[#4863df]/5 px-4 text-sm font-semibold text-[#4863df] shadow-sm transition hover:bg-[#4863df]/10"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            Download DOCX
                        </a>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <div className="mx-auto min-h-[520px] max-w-2xl rounded-sm bg-white px-10 py-9 text-sm leading-7 text-slate-800 shadow-sm ring-1 ring-slate-200">
                        {/* Kop Surat */}
                        <div className="mb-5">
                            <div className="text-[22px] leading-tight font-bold tracking-tight text-slate-900">
                                InJourney
                            </div>
                            <div className="text-[11px] font-bold tracking-[6px] text-[#00A99D]">
                                AIRPORTS
                            </div>
                        </div>

                        {/* Tanggal */}
                        <div className="mb-4 text-sm font-normal">
                            {letter.date || 'Tangerang, 01 Juli 2026'}
                        </div>

                        {/* Info Surat */}
                        <table className="mb-5 text-sm">
                            <tbody>
                                <tr>
                                    <td className="w-[90px] align-top">
                                        Nomor
                                    </td>
                                    <td className="w-[15px] align-top">:</td>
                                    <td>{letter.number || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="align-top">Lampiran</td>
                                    <td className="align-top">:</td>
                                    <td>1 Berkas</td>
                                </tr>
                                <tr>
                                    <td className="align-top">Perihal</td>
                                    <td className="align-top">:</td>
                                    <td>{currentConfig.perihal}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Tujuan */}
                        <div className="mb-5 text-sm">
                            <div>Kepada Yth.</div>
                            <div className="font-semibold uppercase">
                                {currentConfig.tujuan}
                            </div>
                            <div>Di -</div>
                            <div>TEMPAT</div>
                        </div>

                        {/* Isi */}
                        <div className="text-justify text-sm leading-7">
                            <p>
                                {(() => {
                                    const parts =
                                        currentConfig.isi.split('{isi}');
                                    const bodyContent =
                                        letter.body ||
                                        'HK.201/1/7/BP3C/2026; PJJ.CGR.HCB.0003/DL.06.01/2026';

                                    return (
                                        <>
                                            {parts[0]}
                                            <span className="bg-yellow-100 px-1">
                                                {bodyContent}
                                            </span>
                                            {parts.slice(1).map((part, i) => (
                                                <Fragment key={i}>
                                                    <span className="bg-yellow-100 px-1">
                                                        {bodyContent}
                                                    </span>
                                                    {part}
                                                </Fragment>
                                            ))}
                                        </>
                                    );
                                })()}
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </section>
    );
}
function EmployeeDataView({
    employees,
    unitFilter,
}: {
    employees: Employee[];
    unitFilter: UnitFilter;
}) {
    const topTableScrollRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const scrollSyncLockRef = useRef(false);
    const [uploadInputKey, setUploadInputKey] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(
        null,
    );
    const [archiveEmployee, setArchiveEmployee] = useState<Employee | null>(
        null,
    );
    const [selectedArchive, setSelectedArchive] =
        useState<EmployeeAvsecArchive | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [skpFilter, setSkpFilter] = useState<SkpFilter>('');
    const [showAllAlerts, setShowAllAlerts] = useState(false);
    const [checkedEmployeeIds, setCheckedEmployeeIds] = useState<Set<number>>(
        () => new Set(),
    );
    const [tableScrollWidth, setTableScrollWidth] = useState(2200);

    useEffect(() => {
        function updateTableScrollWidth() {
            const nextWidth = tableScrollRef.current?.scrollWidth ?? 2200;

            setTableScrollWidth(nextWidth);
        }

        updateTableScrollWidth();

        const resizeObserver =
            typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(() => {
                      updateTableScrollWidth();
                  })
                : null;

        if (tableScrollRef.current) {
            resizeObserver?.observe(tableScrollRef.current);
        }

        const tableElement = tableScrollRef.current?.querySelector('table');

        if (tableElement instanceof HTMLElement) {
            resizeObserver?.observe(tableElement);
        }

        window.addEventListener('resize', updateTableScrollWidth);

        return () => {
            window.removeEventListener('resize', updateTableScrollWidth);
            resizeObserver?.disconnect();
        };
    }, [employees.length, searchQuery, skpFilter]);

    function syncTableScroll(source: HTMLDivElement) {
        if (scrollSyncLockRef.current) {
            return;
        }

        scrollSyncLockRef.current = true;

        [topTableScrollRef.current, tableScrollRef.current]
            .filter((element): element is HTMLDivElement => element !== null)
            .forEach((element) => {
                if (element !== source) {
                    element.scrollLeft = source.scrollLeft;
                }
            });

        window.requestAnimationFrame(() => {
            scrollSyncLockRef.current = false;
        });
    }

    function toggleEmployeeCheck(employeeId: number) {
        setCheckedEmployeeIds((currentIds) => {
            const nextIds = new Set(currentIds);

            if (nextIds.has(employeeId)) {
                nextIds.delete(employeeId);
            } else {
                nextIds.add(employeeId);
            }

            return nextIds;
        });
    }

    const [deleteConfirm, setDeleteConfirm] = useState<{
        type: 'single' | 'multiple';
        employee?: Employee;
        count?: number;
    } | null>(null);

    function deleteSelectedEmployees() {
        const employeeIds = Array.from(checkedEmployeeIds);

        if (employeeIds.length === 0) {
            return;
        }

        setDeleteConfirm({
            type: 'multiple',
            count: employeeIds.length,
        });
    }

    function confirmDeleteSelected() {
        const employeeIds = Array.from(checkedEmployeeIds);
        employeeIds.forEach((id) => {
            router.delete(destroy.url(id), {
                preserveScroll: true,
                preserveState: true,
            });
        });
        setCheckedEmployeeIds(new Set());
        setDeleteConfirm(null);
    }

    function deleteEmployee(employee: Employee) {
        setDeleteConfirm({
            type: 'single',
            employee,
        });
    }

    function confirmDeleteSingle() {
        if (
            !deleteConfirm ||
            deleteConfirm.type !== 'single' ||
            !deleteConfirm.employee
        ) {
            return;
        }

        router.delete(destroy.url(deleteConfirm.employee.id), {
            preserveScroll: true,
            preserveState: true,
        });
        setDeleteConfirm(null);
    }

    function cancelDelete() {
        setDeleteConfirm(null);
    }

    const filteredEmployees = useMemo(() => {
        let filtered = employees;

        // Apply search query
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(
                (employee) =>
                    employee.nik.toLowerCase().includes(lowerQuery) ||
                    employee.name.toLowerCase().includes(lowerQuery) ||
                    (employee.function_category &&
                        employee.function_category
                            .toLowerCase()
                            .includes(lowerQuery)),
            );
        }

        // Apply skp filter
        if (skpFilter) {
            filtered = filtered.filter((employee) => {
                const status = getSkpExpiryStatus(employee.skp_expired);

                if (!status) {
                    return false;
                }

                if (skpFilter === 'expired') {
                    return status.tone === 'expired';
                } else if (skpFilter === 'active') {
                    return status.tone === 'active';
                } else if (skpFilter === 'within_year') {
                    return status.tone === 'warning';
                }

                return true;
            });
        }

        return filtered;
    }, [employees, searchQuery, skpFilter]);

    const editForm = useForm<{
        nik: string;
        name: string;
        place_of_birth: string | null;
        date_of_birth: string | null;
        position: string | null;
        pg: string | null;
        unit: string | null;
        location: string | null;
        skp_expired: string | null;
        function_category: string | null;
        training_schedule: string | null;
        avsec_category: string | null;
        photo_jpg: string | null;
        ktp_pdf: string | null;
        competency_certificate: string | null;
        latest_certificate: string | null;
        latest_education_certificate: string | null;
        license_book: string | null;
        curriculum_vitae: string | null;
        skck: string | null;
        background_check: string | null;
        whatsapp_number: string | null;
    }>({
        nik: '',
        name: '',
        place_of_birth: null,
        date_of_birth: null,
        position: null,
        pg: null,
        unit: null,
        location: null,
        skp_expired: null,
        function_category: null,
        training_schedule: null,
        avsec_category: null,
        photo_jpg: null,
        ktp_pdf: null,
        competency_certificate: null,
        latest_certificate: null,
        latest_education_certificate: null,
        license_book: null,
        curriculum_vitae: null,
        skck: null,
        background_check: null,
        whatsapp_number: null,
    });
    const uploadForm = useForm<{ employees_file: File | null }>({
        employees_file: null,
    });
    const skpExpiryAlerts = employees.reduce<SkpExpiryAlert[]>(
        (alerts, employee) => {
            const status = getSkpExpiryStatus(employee.skp_expired);

            if (status) {
                alerts.push({ employee, status });
            }

            return alerts;
        },
        [],
    );

    function submitUpload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        uploadForm.post(store.url(), {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                uploadForm.reset('employees_file');
                setUploadInputKey((key) => key + 1);
            },
        });
    }

    function updateUnitFilter(event: ChangeEvent<HTMLSelectElement>) {
        const unit = event.target.value as UnitFilter;

        router.get(
            home.url({
                query: unit ? { unit } : {},
            }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function openEditModal(employee: Employee) {
        setEditingEmployee(employee);
        editForm.setData({
            nik: employee.nik,
            name: employee.name,
            place_of_birth: employee.place_of_birth,
            date_of_birth: employee.date_of_birth,
            position: employee.position,
            pg: employee.pg,
            unit: employee.unit,
            location: employee.location,
            skp_expired: employee.skp_expired,
            function_category: employee.function_category,
            training_schedule: employee.training_schedule,
            avsec_category: employee.avsec_category,
            photo_jpg: employee.photo_jpg,
            ktp_pdf: employee.ktp_pdf,
            competency_certificate: employee.competency_certificate,
            latest_certificate: employee.latest_certificate,
            latest_education_certificate: employee.latest_education_certificate,
            license_book: employee.license_book,
            curriculum_vitae: employee.curriculum_vitae,
            skck: employee.skck,
            background_check: employee.background_check,
            whatsapp_number: employee.whatsapp_number,
        });
    }

    function closeEditModal() {
        setEditingEmployee(null);
        editForm.reset();
    }

    function updateAvsecCategory(
        employee: Employee,
        nextCategory: string | null,
    ) {
        const normalizedCategory = nextCategory || null;

        if (!isAvsecLicense(employee.function_category)) {
            return;
        }

        if (employee.avsec_category === normalizedCategory) {
            return;
        }

        router.put(
            update.url(employee.id),
            {
                nik: employee.nik,
                name: employee.name,
                place_of_birth: employee.place_of_birth,
                date_of_birth: employee.date_of_birth,
                position: employee.position,
                pg: employee.pg,
                unit: employee.unit,
                location: employee.location,
                skp_expired: employee.skp_expired,
                function_category: employee.function_category,
                training_schedule: employee.training_schedule,
                avsec_category: normalizedCategory,
                photo_jpg: employee.photo_jpg,
                ktp_pdf: employee.ktp_pdf,
                competency_certificate: employee.competency_certificate,
                latest_certificate: employee.latest_certificate,
                latest_education_certificate:
                    employee.latest_education_certificate,
                license_book: employee.license_book,
                curriculum_vitae: employee.curriculum_vitae,
                skck: employee.skck,
                background_check: employee.background_check,
                whatsapp_number: employee.whatsapp_number,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!editingEmployee) {
            return;
        }

        editForm.put(update.url(editingEmployee.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                closeEditModal();
            },
        });
    }

    return (
        <section className="flex flex-1 min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
            <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-end xl:justify-between">
                <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:max-w-xs">
                    Cari (NIK, Nama, License)
                    <input
                        type="text"
                        placeholder="Cari karyawan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                    />
                </label>
                <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:max-w-xs">
                    Filter Lisensi
                    <select
                        value={unitFilter}
                        onChange={updateUnitFilter}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                    >
                        <option value="">Semua</option>
                        <option value="teknik">Teknik</option>
                        <option value="avsek">Avsec</option>
                        <option value="pkpk">PKKP</option>
                        <option value="arff">ARFF</option>
                        <option value="amc">AMC</option>
                    </select>
                </label>
                <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:max-w-xs">
                    Filter SKP Expiry
                    <select
                        value={skpFilter}
                        onChange={(e) =>
                            setSkpFilter(e.target.value as SkpFilter)
                        }
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                    >
                        <option value="">Semua</option>
                        <option value="expired">Expired</option>
                        <option value="within_year">Dalam 1 Tahun</option>
                        <option value="active">Aktif</option>
                    </select>
                </label>

                <form
                    onSubmit={submitUpload}
                    className="flex flex-col gap-2 lg:flex-row lg:items-end"
                >
                    <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 lg:w-80">
                        Upload Data CSV/XLSX
                        <input
                            key={uploadInputKey}
                            type="file"
                            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={(event) =>
                                uploadForm.setData(
                                    'employees_file',
                                    event.target.files?.[0] ?? null,
                                )
                            }
                            className="block h-10 w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:h-full file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={uploadForm.processing}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f57c6] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        <UploadIcon className="h-4 w-4" />
                        {uploadForm.processing ? 'Mengupload...' : 'Upload'}
                    </button>
                </form>
            </div>

            {uploadForm.errors.employees_file && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {uploadForm.errors.employees_file}
                </div>
            )}



            <div className="flex flex-wrap gap-3 border-b border-slate-200 bg-slate-50 p-4">
                <button
                    type="button"
                    disabled={checkedEmployeeIds.size === 0}
                    onClick={deleteSelectedEmployees}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    <TrashIcon className="h-4 w-4" />
                    Hapus Terpilih ({checkedEmployeeIds.size})
                </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div
                    ref={topTableScrollRef}
                    onScroll={(event) =>
                        syncTableScroll(event.currentTarget)
                    }
                    className="overflow-x-auto overflow-y-hidden border-b border-slate-200 bg-slate-50"
                >
                    <div
                        className="h-4 min-w-[2200px]"
                        style={{ width: `${tableScrollWidth}px` }}
                    />
                </div>
                <div
                    ref={tableScrollRef}
                    onScroll={(event) =>
                        syncTableScroll(event.currentTarget)
                    }
                    className="employee-table-scroll min-h-0 flex-1 overflow-x-auto overflow-y-auto"
                >
                    <table className="w-full min-w-[2200px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-semibold text-slate-600 uppercase">
                            <tr>
                                {employeeTableColumns.map((column) => (
                                    <th
                                        key={column}
                                        scope="col"
                                        className="border-b border-slate-200 px-4 py-3 whitespace-nowrap"
                                    >
                                        {column === 'Ceklis' ? (
                                            <input
                                                type="checkbox"
                                                checked={
                                                    filteredEmployees.length >
                                                        0 &&
                                                    filteredEmployees.every(
                                                        (e) =>
                                                            checkedEmployeeIds.has(
                                                                e.id,
                                                            ),
                                                    )
                                                }
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setCheckedEmployeeIds(
                                                            new Set(
                                                                filteredEmployees.map(
                                                                    (e) => e.id,
                                                                ),
                                                            ),
                                                        );
                                                    } else {
                                                        setCheckedEmployeeIds(
                                                            new Set(),
                                                        );
                                                    }
                                                }}
                                                className="h-4 w-4 rounded border-slate-300 text-[#4863df] focus:ring-[#4863df]"
                                            />
                                        ) : (
                                            column
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map((employee, index) => (
                                    <tr
                                        key={employee.id}
                                        className="text-slate-700 hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={checkedEmployeeIds.has(
                                                    employee.id,
                                                )}
                                                onChange={() =>
                                                    toggleEmployeeCheck(
                                                        employee.id,
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-[#4863df] focus:ring-[#4863df]"
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.nik}
                                        </td>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap text-slate-900">
                                            {employee.name}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.place_of_birth ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.date_of_birth ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.position ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.pg ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.unit_label ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.location ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <SkpExpiryCell
                                                value={employee.skp_expired}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.function_category ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.training_schedule ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {isAvsecLicense(
                                                employee.function_category,
                                            ) ? (
                                                <div className="min-w-[180px]">
                                                    <label className="sr-only">
                                                        Kategori Avsec{' '}
                                                        {employee.name}
                                                    </label>
                                                    <select
                                                        value={
                                                            employee.avsec_category ||
                                                            ''
                                                        }
                                                        onChange={(event) =>
                                                            updateAvsecCategory(
                                                                employee,
                                                                event.target
                                                                    .value ||
                                                                    null,
                                                            )
                                                        }
                                                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm font-medium text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                    >
                                                        <option value="">
                                                            Pilih kategori
                                                        </option>
                                                        <option value="Basic">
                                                            Basic
                                                        </option>
                                                        <option value="Junior">
                                                            Junior
                                                        </option>
                                                        <option value="Senior">
                                                            Senior
                                                        </option>
                                                    </select>
                                                </div>
                                            ) : (
                                                (employee.avsec_category ?? '-')
                                            )}
                                        </td>
                                        {employeeDocumentColumns.map(
                                            (column) => (
                                                <td
                                                    key={column.key}
                                                    className="px-4 py-3 whitespace-nowrap"
                                                >
                                                    {formatTableValue(
                                                        employee[column.key],
                                                        setPreviewUrl,
                                                    )}
                                                </td>
                                            ),
                                        )}
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEditModal(employee)
                                                    }
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 transition hover:bg-blue-50 hover:text-blue-600"
                                                    aria-label={`Edit ${employee.name}`}
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setArchiveEmployee(
                                                            employee,
                                                        );
                                                        setSelectedArchive(
                                                            employee
                                                                .avsec_archives?.[0] ??
                                                                null,
                                                        );
                                                    }}
                                                    disabled={
                                                        (employee.avsec_archives
                                                            ?.length ?? 0) === 0
                                                    }
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                                                    aria-label={`Lihat arsip ${employee.name}`}
                                                >
                                                    <ArchiveIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        deleteEmployee(employee)
                                                    }
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600"
                                                    aria-label={`Hapus ${employee.name}`}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={employeeTableColumns.length}
                                        className="h-40 px-4 py-8 text-center text-sm font-medium text-slate-400"
                                    >
                                        Belum ada data karyawan yang
                                        ditampilkan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {previewUrl ? (
                <LinkPreviewModal
                    url={previewUrl}
                    onClose={() => setPreviewUrl(null)}
                />
            ) : null}
            {archiveEmployee ? (
                <EmployeeAvsecArchiveModal
                    employee={archiveEmployee}
                    selectedArchive={selectedArchive}
                    onSelectArchive={setSelectedArchive}
                    onClose={() => {
                        setArchiveEmployee(null);
                        setSelectedArchive(null);
                    }}
                />
            ) : null}
            {editingEmployee ? (
                <EditEmployeeModal
                    employee={editingEmployee}
                    form={editForm}
                    onSubmit={handleEditSubmit}
                    onClose={closeEditModal}
                />
            ) : null}
            {deleteConfirm ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-confirm-title"
                >
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
                        <h2
                            id="delete-confirm-title"
                            className="mb-4 text-lg font-bold text-slate-900"
                        >
                            Konfirmasi Hapus
                        </h2>
                        <p className="mb-6 text-sm text-slate-600">
                            {deleteConfirm.type === 'single'
                                ? `Apakah Anda yakin ingin menghapus karyawan ${deleteConfirm.employee?.name} (${deleteConfirm.employee?.nik})?`
                                : `Apakah Anda yakin ingin menghapus ${deleteConfirm.count} karyawan yang terpilih?`}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={cancelDelete}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={
                                    deleteConfirm.type === 'single'
                                        ? confirmDeleteSingle
                                        : confirmDeleteSelected
                                }
                                className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function LinkPreviewModal({
    url,
    onClose,
}: {
    url: string;
    onClose: () => void;
}) {
    const embeddedUrl = getPreviewEmbedUrl(url);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-preview-title"
        >
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h2
                            id="link-preview-title"
                            className="text-base font-bold text-slate-900"
                        >
                            Preview Dokumen
                        </h2>
                        <p className="mt-1 truncate text-sm text-slate-500">
                            {url}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Buka tab baru
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            aria-label="Tutup preview"
                        >
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="min-h-[320px] flex-1 bg-slate-100">
                    {isImagePreviewUrl(url) ? (
                        <img
                            src={url}
                            alt="Preview dokumen"
                            className="h-full max-h-[72vh] w-full object-contain"
                        />
                    ) : (
                        <iframe
                            title="Preview dokumen"
                            src={embeddedUrl}
                            className="h-[72vh] w-full border-0 bg-white"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function EmployeeAvsecArchiveModal({
    employee,
    selectedArchive,
    onSelectArchive,
    onClose,
}: {
    employee: Employee;
    selectedArchive: EmployeeAvsecArchive | null;
    onSelectArchive: (archive: EmployeeAvsecArchive | null) => void;
    onClose: () => void;
}) {
    const archiveToDisplay =
        selectedArchive ?? employee.avsec_archives?.[0] ?? null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-employee-title"
        >
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                        <h2
                            id="archive-employee-title"
                            className="text-base font-bold text-slate-900"
                        >
                            Arsip Kategori Avsec
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {employee.name} ({employee.nik})
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        aria-label="Tutup arsip"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="border-b border-slate-200 bg-slate-50 lg:border-r lg:border-b-0">
                        <div className="border-b border-slate-200 px-4 py-3">
                            <h3 className="text-sm font-semibold text-slate-900">
                                Riwayat Update
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Pilih riwayat untuk melihat data lengkap sebelum
                                update.
                            </p>
                        </div>
                        <div className="max-h-[32vh] overflow-y-auto lg:max-h-none">
                            {(employee.avsec_archives?.length ?? 0) > 0 ? (
                                <div className="divide-y divide-slate-200">
                                    {employee.avsec_archives.map((archive) => {
                                        const isSelected =
                                            archiveToDisplay?.id === archive.id;

                                        return (
                                            <button
                                                key={archive.id}
                                                type="button"
                                                onClick={() =>
                                                    onSelectArchive(archive)
                                                }
                                                className={[
                                                    'flex w-full flex-col gap-1 px-4 py-3 text-left transition',
                                                    isSelected
                                                        ? 'bg-blue-50'
                                                        : 'hover:bg-slate-100',
                                                ].join(' ')}
                                            >
                                                <span className="text-sm font-semibold text-slate-900">
                                                    {archive.avsec_category}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {formatArchiveDateTime(
                                                        archive.archived_at,
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {archive.training_schedule ??
                                                        'Tanpa jadwal diklat'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="px-4 py-8 text-center text-sm font-medium text-slate-400">
                                    Belum ada arsip kategori Avsec.
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="overflow-y-auto p-4">
                        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">
                                    License Aktif
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                    {employee.function_category ?? '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">
                                    Kategori Aktif
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                    {employee.avsec_category ?? '-'}
                                </p>
                            </div>
                        </div>
                        {archiveToDisplay ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    Data ini adalah snapshot read-only sebelum
                                    update dilakukan.
                                </div>
                                <div className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <ArchiveField
                                        label="Diarsipkan Pada"
                                        value={formatArchiveDateTime(
                                            archiveToDisplay.archived_at,
                                        )}
                                    />
                                    <ArchiveField
                                        label="Kategori Lama"
                                        value={archiveToDisplay.avsec_category}
                                    />
                                    <ArchiveField
                                        label="License"
                                        value={
                                            archiveToDisplay.function_category
                                        }
                                    />
                                    <ArchiveField
                                        label="NIK"
                                        value={archiveToDisplay.nik}
                                    />
                                    <ArchiveField
                                        label="Nama"
                                        value={archiveToDisplay.name}
                                    />
                                    <ArchiveField
                                        label="Jadwal Diklat"
                                        value={
                                            archiveToDisplay.training_schedule
                                        }
                                    />
                                    <ArchiveField
                                        label="Tempat Lahir"
                                        value={archiveToDisplay.place_of_birth}
                                    />
                                    <ArchiveField
                                        label="Tanggal Lahir"
                                        value={archiveToDisplay.date_of_birth}
                                    />
                                    <ArchiveField
                                        label="Jabatan"
                                        value={archiveToDisplay.position}
                                    />
                                    <ArchiveField
                                        label="PG"
                                        value={archiveToDisplay.pg}
                                    />
                                    <ArchiveField
                                        label="Unit"
                                        value={archiveToDisplay.unit}
                                    />
                                    <ArchiveField
                                        label="Lokasi"
                                        value={archiveToDisplay.location}
                                    />
                                    <ArchiveField
                                        label="SKP Expired"
                                        value={archiveToDisplay.skp_expired}
                                    />
                                    <ArchiveField
                                        label="Pas Foto"
                                        value={archiveToDisplay.photo_jpg}
                                    />
                                    <ArchiveField
                                        label="KTP"
                                        value={archiveToDisplay.ktp_pdf}
                                    />
                                    <ArchiveField
                                        label="Sertifikat Kompetensi"
                                        value={
                                            archiveToDisplay.competency_certificate
                                        }
                                    />
                                    <ArchiveField
                                        label="Sertifikat Terakhir"
                                        value={
                                            archiveToDisplay.latest_certificate
                                        }
                                    />
                                    <ArchiveField
                                        label="Ijazah Pendidikan Terakhir"
                                        value={
                                            archiveToDisplay.latest_education_certificate
                                        }
                                    />
                                    <ArchiveField
                                        label="Buku Lisensi"
                                        value={archiveToDisplay.license_book}
                                    />
                                    <ArchiveField
                                        label="Daftar Riwayat Hidup"
                                        value={
                                            archiveToDisplay.curriculum_vitae
                                        }
                                    />
                                    <ArchiveField
                                        label="SKCK"
                                        value={archiveToDisplay.skck}
                                    />
                                    <ArchiveField
                                        label="Background Check"
                                        value={
                                            archiveToDisplay.background_check
                                        }
                                    />
                                    <ArchiveField
                                        label="Nomor WA"
                                        value={archiveToDisplay.whatsapp_number}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-400">
                                Belum ada arsip kategori Avsec.
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end border-t border-slate-200 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

function ArchiveField({
    label,
    value,
}: {
    label: string;
    value: string | null;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                {label}
            </p>
            <p className="mt-1 text-sm font-medium break-all text-slate-900">
                {value && value.trim() !== '' ? value : '-'}
            </p>
        </div>
    );
}

function EditEmployeeModal({
    employee,
    form,
    onSubmit,
    onClose,
}: {
    employee: Employee;
    form: ReturnType<typeof useForm<any>>;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onClose: () => void;
}) {
    const avsecLicenseSelected = isAvsecLicense(form.data.function_category);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-employee-title"
        >
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h2
                        id="edit-employee-title"
                        className="text-base font-bold text-slate-900"
                    >
                        Edit Karyawan: {employee.name}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        aria-label="Tutup"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>

                <form
                    onSubmit={onSubmit}
                    className="flex-1 overflow-y-auto p-4"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                NIK
                                <input
                                    type="text"
                                    value={form.data.nik}
                                    onChange={(e) =>
                                        form.setData('nik', e.target.value)
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    required
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Nama
                                <input
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    required
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Tempat Lahir
                                <input
                                    type="text"
                                    value={form.data.place_of_birth || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'place_of_birth',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Tanggal Lahir
                                <input
                                    type="date"
                                    value={form.data.date_of_birth || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'date_of_birth',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Jabatan
                                <input
                                    type="text"
                                    value={form.data.position || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'position',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                PG
                                <input
                                    type="text"
                                    value={form.data.pg || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'pg',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Unit
                                <select
                                    value={form.data.unit || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'unit',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Pilih Unit</option>
                                    <option value="teknik">Teknik</option>
                                    <option value="avsek">Avsec</option>
                                    <option value="pkpk">PKPK</option>
                                    <option value="arff">ARFF</option>
                                    <option value="amc">AMC</option>
                                </select>
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Lokasi
                                <input
                                    type="text"
                                    value={form.data.location || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'location',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                SKP Expired
                                <input
                                    type="date"
                                    value={form.data.skp_expired || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'skp_expired',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                License
                                <input
                                    type="text"
                                    value={form.data.function_category || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'function_category',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Jadwal Diklat
                                <input
                                    type="text"
                                    value={form.data.training_schedule || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'training_schedule',
                                            e.target.value || null,
                                        )
                                    }
                                    placeholder="Contoh: 12 Agustus 2026"
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Kategori Avsec
                                <select
                                    value={form.data.avsec_category || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'avsec_category',
                                            e.target.value || null,
                                        )
                                    }
                                    disabled={!avsecLicenseSelected}
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >
                                    <option value="">
                                        {avsecLicenseSelected
                                            ? 'Pilih Kategori Avsec'
                                            : 'Hanya untuk license Avsec'}
                                    </option>
                                    <option value="Basic">Basic</option>
                                    <option value="Junior">Junior</option>
                                    <option value="Senior">Senior</option>
                                </select>
                            </label>
                            <p className="mt-1 text-xs text-slate-500">
                                Riwayat kategori lama akan masuk ke arsip saat
                                kategori aktif diperbarui.
                            </p>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Pas Foto
                                <input
                                    type="text"
                                    value={form.data.photo_jpg || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'photo_jpg',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                KTP
                                <input
                                    type="text"
                                    value={form.data.ktp_pdf || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'ktp_pdf',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Sertifikat Kompetensi
                                <input
                                    type="text"
                                    value={
                                        form.data.competency_certificate || ''
                                    }
                                    onChange={(e) =>
                                        form.setData(
                                            'competency_certificate',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Sertifikat Terakhir
                                <input
                                    type="text"
                                    value={form.data.latest_certificate || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'latest_certificate',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Ijazah Pendidikan Terakhir (URL)
                                <input
                                    type="text"
                                    value={
                                        form.data
                                            .latest_education_certificate || ''
                                    }
                                    onChange={(e) =>
                                        form.setData(
                                            'latest_education_certificate',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Buku Lisensi (URL)
                                <input
                                    type="text"
                                    value={form.data.license_book || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'license_book',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Curriculum Vitae (URL)
                                <input
                                    type="text"
                                    value={form.data.curriculum_vitae || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'curriculum_vitae',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                SKCK (URL)
                                <input
                                    type="text"
                                    value={form.data.skck || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'skck',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Background Check (URL)
                                <input
                                    type="text"
                                    value={form.data.background_check || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'background_check',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Nomor WhatsApp
                                <input
                                    type="text"
                                    value={form.data.whatsapp_number || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'whatsapp_number',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {form.processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function formatTableValue(
    value: string | null,
    onPreviewLink?: (url: string) => void,
) {
    const displayValue = value?.trim();

    if (!displayValue) {
        return '-';
    }

    if (isClickableUrl(displayValue)) {
        return (
            <a
                href={displayValue}
                onClick={(event) => {
                    if (!onPreviewLink) {
                        return;
                    }

                    event.preventDefault();
                    onPreviewLink(displayValue);
                }}
                className="font-medium text-[#4863df] underline underline-offset-2 transition hover:text-[#2f4585]"
            >
                {displayValue}
            </a>
        );
    }

    return displayValue;
}

function isClickableUrl(value: string) {
    return /^https?:\/\//i.test(value);
}

function isImagePreviewUrl(value: string) {
    return /\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:[?#].*)?$/i.test(value);
}

function getPreviewEmbedUrl(value: string) {
    const driveFileMatch = value.match(
        /^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)(?:\/[^?]*)?(?:\?.*)?$/i,
    );

    if (driveFileMatch?.[1]) {
        return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
    }

    const driveOpenMatch = value.match(
        /^https?:\/\/drive\.google\.com\/open\?id=([^&]+)/i,
    );

    if (driveOpenMatch?.[1]) {
        return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
    }

    return value;
}

function isAvsecLicense(value: string | null | undefined) {
    const normalizedValue = value?.trim().toLowerCase();

    return normalizedValue === 'avsec' || normalizedValue === 'avsek';
}

function formatArchiveDateTime(value: string | null) {
    if (!value) {
        return '-';
    }

    const date = new Date(value.replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function SkpExpiryCell({ value }: { value: string | null }) {
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

function getSkpExpiryStatus(value: string | null): SkpExpiryStatus | null {
    if (!value) {
        return null;
    }

    const expiryDate = parseLocalDate(value);

    if (!expiryDate) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate months between today and expiry date
    const yearsDiff = expiryDate.getFullYear() - today.getFullYear();
    const monthsDiff = expiryDate.getMonth() - today.getMonth();
    const totalMonthsDiff = yearsDiff * 12 + monthsDiff;

    // Adjust for day of month
    const adjustedMonthsUntilExpiry =
        totalMonthsDiff + (expiryDate.getDate() >= today.getDate() ? 0 : -1);

    if (adjustedMonthsUntilExpiry < 0) {
        return {
            label: 'Expired',
            tone: 'expired',
        };
    } else if (adjustedMonthsUntilExpiry <= 12) {
        return {
            label: `-${adjustedMonthsUntilExpiry} bulan`,
            tone: 'warning',
        };
    } else {
        return {
            label: 'Aktif',
            tone: 'active',
        };
    }
}

function parseLocalDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

// function formatSkpExpiryMonthYear(value: string | null) {
//     if (!value) {
//         return 'Belum diisi';
//     }
//
//     const date = parseLocalDate(value);
//
//     if (!date) {
//         return value;
//     }
//
//     return new Intl.DateTimeFormat('id-ID', {
//         month: 'long',
//         year: 'numeric',
//     }).format(date);
// }

function groupEmployeesForMandatoryTraining(
    employees: Employee[],
): MandatoryTrainingGroup[] {
    const categoryGroups = new Map<
        string,
        Pick<
            MandatoryTrainingGroup,
            'key' | 'skpExpired' | 'functionCategory' | 'employees'
        >
    >();

    shuffleEmployees(employees).forEach((employee) => {
        const skpExpired = employee.skp_expired;
        const functionCategory = employee.function_category;
        const functionKey = normalizeCategoryKey(functionCategory);
        const key = `${skpExpired ?? 'empty'}::${functionKey || 'empty'}`;
        const group = categoryGroups.get(key);

        if (group) {
            group.employees.push(employee);

            return;
        }

        categoryGroups.set(key, {
            key,
            skpExpired,
            functionCategory,
            employees: [employee],
        });
    });

    const categoryTableCounters = new Map<string, number>();
    const allGroups: MandatoryTrainingGroup[] = [];

    for (const group of categoryGroups.values()) {
        const functionKey = normalizeCategoryKey(group.functionCategory);
        const totalTables = Math.ceil(
            group.employees.length / mandatoryTrainingRowsPerTable,
        );
        const startTableNumber =
            (categoryTableCounters.get(functionKey) ?? 0) + 1;

        for (let tableIndex = 0; tableIndex < totalTables; tableIndex++) {
            const startIndex = tableIndex * mandatoryTrainingRowsPerTable;
            const groupEmployees = group.employees.slice(
                startIndex,
                startIndex + mandatoryTrainingRowsPerTable,
            );
            const tableNumber = startTableNumber + tableIndex;

            allGroups.push({
                ...group,
                key: `${group.key}::${tableNumber}`,
                employees: groupEmployees,
                tableNumber,
                totalTables,
                totalCategoryEmployees: group.employees.length,
            });
        }

        categoryTableCounters.set(
            functionKey,
            (categoryTableCounters.get(functionKey) ?? 0) + totalTables,
        );
    }

    return allGroups;
}

function shuffleEmployees(employees: Employee[]) {
    const shuffledEmployees = [...employees];

    for (let index = shuffledEmployees.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        const currentEmployee = shuffledEmployees[index];

        shuffledEmployees[index] = shuffledEmployees[randomIndex];
        shuffledEmployees[randomIndex] = currentEmployee;
    }

    return shuffledEmployees;
}

function buildEmployeeClassKeyMap(groups: MandatoryTrainingGroup[]) {
    const employeeClassKeys = new Map<number, string>();

    groups.forEach((group) => {
        group.employees.forEach((employee) => {
            employeeClassKeys.set(employee.id, group.key);
        });
    });

    return employeeClassKeys;
}

function applyMandatoryTrainingClassOverrides(
    groups: MandatoryTrainingGroup[],
    classOverrides: Record<number, string>,
): MandatoryTrainingGroup[] {
    const groupCopies = groups.map((group) => ({
        ...group,
        employees: [] as Employee[],
    }));
    const groupsByKey = new Map(groupCopies.map((group) => [group.key, group]));

    groups.forEach((group) => {
        group.employees.forEach((employee) => {
            const targetGroup =
                groupsByKey.get(classOverrides[employee.id]) ??
                groupsByKey.get(group.key);

            targetGroup?.employees.push(employee);
        });
    });

    return groupCopies;
}
function normalizeCategoryKey(value: string | null) {
    return value?.trim().toLocaleLowerCase('id-ID') ?? '';
}

function LayoutGridIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
    );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function FileTextIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
        </svg>
    );
}

function GraduationCapIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M22 10 12 5 2 10l10 5 10-5Z" />
            <path d="M6 12v5c3 2 9 2 12 0v-5" />
            <path d="M22 10v6" />
        </svg>
    );
}

function MenuIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M4 12h16" />
            <path d="M4 6h16" />
            <path d="M4 18h16" />
        </svg>
    );
}

function UploadIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8 12 3 7 8" />
            <path d="M12 3v12" />
        </svg>
    );
}

function DownloadIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10 12 15 17 10" />
            <path d="M12 15V3" />
        </svg>
    );
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function ArchiveIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <rect x="3" y="4" width="18" height="5" rx="1" />
            <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
            <path d="M10 13h4" />
        </svg>
    );
}

function AlertTriangleIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function TrashIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
        </svg>
    );
}

function PencilIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
    );
}
