import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { ChangeEvent, ComponentType, FormEvent, SVGProps } from 'react';

import {
    destroy,
    store,
} from '@/actions/App/Http/Controllers/EmployeeController';
import { home } from '@/routes';
import { pdf as templateLetterPdf } from '@/routes/template-surat';

type TabId = 'dashboard' | 'karyawan' | 'diklat' | 'template';
type UnitFilter = '' | 'teknik' | 'avsek' | 'pkpk';
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
    position: string | null;
    pg: string | null;
    unit: string | null;
    unit_label: string | null;
    skp_expired: string | null;
    function_category: string | null;
    photo_jpg: string | null;
    ktp_pdf: string | null;
    initial_avsec_competency_certificate: string | null;
    latest_refresher_certificate: string | null;
    latest_education_certificate: string | null;
    license_book: string | null;
    curriculum_vitae: string | null;
    skck: string | null;
    background_check: string | null;
    whatsapp_number: string | null;
};

type EmployeeDocumentColumn = {
    key: keyof Pick<
        Employee,
        | 'photo_jpg'
        | 'ktp_pdf'
        | 'initial_avsec_competency_certificate'
        | 'latest_refresher_certificate'
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
    tone: 'expired' | 'warning';
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
        title: 'Daftar Diklat Mandatory',
        icon: GraduationCapIcon,
        placeholder: 'Konten Daftar Diklat Mandatory akan ditampilkan di sini',
    },
    {
        id: 'template',
        title: 'Template Surat',
        icon: FileTextIcon,
        placeholder: 'Konten Template Surat akan ditampilkan di sini',
    },
];

const employeeDocumentColumns: EmployeeDocumentColumn[] = [
    { key: 'photo_jpg', label: 'Pas Foto (JPG)' },
    { key: 'ktp_pdf', label: 'KTP (PDF)' },
    {
        key: 'initial_avsec_competency_certificate',
        label: 'Sertifikat Kompetensi Initial Avsec',
    },
    {
        key: 'latest_refresher_certificate',
        label: 'Sertifikat Refresher Terakhir',
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
    'No',
    'NIK',
    'Nama',
    'Jabatan',
    'PG',
    'Unit',
    'SKP Expired',
    'Fungsi',
    ...employeeDocumentColumns.map((column) => column.label),
    'Aksi',
];

const mandatoryTrainingBaseColumns = [
    'No',
    'NIK',
    'Nama',
    'SKP Expired',
    'Fungsi',
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

            <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-800">
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

                <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
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

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                        {activeTab === 'karyawan' ? (
                            <EmployeeDataView
                                employees={employees}
                                unitFilter={filters.unit ?? ''}
                            />
                        ) : activeTab === 'diklat' ? (
                            <MandatoryTrainingView employees={employees} />
                        ) : activeTab === 'template' ? (
                            <TemplateLetterView />
                        ) : (
                            <PlaceholderPanel text={activeItem.placeholder} />
                        )}
                    </div>
                </main>
            </div>
        </>
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
    const [classOverrides, setClassOverrides] = useState<Record<number, string>>(
        {},
    );
    const generatedGroups = useMemo(
        () => groupEmployeesForMandatoryTraining(employees),
        [employees],
    );
    const baseEmployeeClassKeys = useMemo(
        () => buildEmployeeClassKeyMap(generatedGroups),
        [generatedGroups],
    );
    const groupedEmployees = useMemo(
        () => applyMandatoryTrainingClassOverrides(generatedGroups, classOverrides),
        [classOverrides, generatedGroups],
    );
    const classOptions = groupedEmployees.map((group) => ({
        key: group.key,
        label: `Kelas ${group.tableNumber} - ${formatSkpExpiryMonthYear(group.skpExpired)} / ${group.functionCategory ?? 'Belum diisi'}`,
    }));
    const mandatoryEmployeeIds = useMemo(
        () =>
            groupedEmployees.flatMap((group) =>
                group.employees.map((employee) => employee.id),
            ),
        [groupedEmployees],
    );
    const checkedMandatoryCount = mandatoryEmployeeIds.filter((employeeId) =>
        checkedEmployeeIds.has(employeeId),
    ).length;
    const isAllMandatoryChecked =
        mandatoryEmployeeIds.length > 0 &&
        checkedMandatoryCount === mandatoryEmployeeIds.length;

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

    function toggleAllMandatoryChecks() {
        setCheckedEmployeeIds((currentIds) => {
            const nextIds = new Set(currentIds);

            if (isAllMandatoryChecked) {
                mandatoryEmployeeIds.forEach((employeeId) =>
                    nextIds.delete(employeeId),
                );
            } else {
                mandatoryEmployeeIds.forEach((employeeId) =>
                    nextIds.add(employeeId),
                );
            }

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

    function submitMandatoryChecklist() {
        return;
    }

    return (
        <section className="flex min-h-full flex-col gap-4">
            {groupedEmployees.length > 0 ? (
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold text-slate-600">
                        {checkedMandatoryCount} dari{' '}
                        {mandatoryEmployeeIds.length} data diceklis
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
                            <input
                                type="checkbox"
                                checked={isAllMandatoryChecked}
                                onChange={toggleAllMandatoryChecks}
                                className="h-4 w-4 rounded border-slate-300 text-[#4863df] focus:ring-[#4863df]"
                            />
                            Ceklis semua
                        </label>
                        <button
                            type="button"
                            onClick={submitMandatoryChecklist}
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f57c6]"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            ) : null}

            {groupedEmployees.length > 0 ? (
                groupedEmployees.map((group) => {
                    const tableColumns = [
                        ...mandatoryTrainingBaseColumns,
                        'Pindah Kelas',
                        'Ceklis',
                    ];

                    return (
                        <div
                            key={group.key}
                            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                                        SKP Expired:{' '}
                                        {formatSkpExpiryMonthYear(
                                            group.skpExpired,
                                        )}
                                    </span>
                                    <span className="rounded-lg bg-[#4863df]/10 px-3 py-1 text-sm font-semibold text-[#2f4585] ring-1 ring-[#4863df]/20">
                                        Fungsi:{' '}
                                        {group.functionCategory ??
                                            'Belum diisi'}
                                    </span>
                                </div>
                                <span className="text-sm font-semibold text-slate-500">
                                    Kelas {group.tableNumber}/
                                    {group.totalTables} -{' '}
                                    {group.employees.length}/
                                    {mandatoryTrainingRowsPerTable} karyawan
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                                    <thead className="bg-white text-xs font-semibold text-slate-500 uppercase">
                                        <tr>
                                            {tableColumns.map((column) => (
                                                <th
                                                    key={column}
                                                    scope="col"
                                                    className="border-b border-slate-200 px-4 py-3 whitespace-nowrap"
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
                                                        <SkpExpiryCell
                                                            value={
                                                                employee.skp_expired
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {employee.function_category ??
                                                            '-'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <select
                                                            value={group.key}
                                                            onChange={(event) =>
                                                                moveEmployeeToClass(
                                                                    employee.id,
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
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
                                                    <td className="px-4 py-3 text-center whitespace-nowrap">
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
    const selectedTemplate =
        templateLetterTypes.find((template) => template.id === letter.template) ??
        templateLetterTypes[0];
    const outputQuery = {
        template: letter.template,
        number: letter.number,
        date: letter.date,
        body: letter.body,
    };
    const pdfUrl = templateLetterPdf.url({
        query: outputQuery,
    });
    const downloadPdfUrl = templateLetterPdf.url({
        query: {
            ...outputQuery,
            download: true,
        },
    });

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
                        <p className="text-xs font-normal text-slate-400">
                            Teks ini akan menggantikan bagian perjanjian kerjasama (PKS) yang dibirukan pada surat BP3.
                        </p>
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
                            href={pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            Preview PDF
                        </a>
                        <a
                            href={downloadPdfUrl}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#4863df]/30 bg-[#4863df]/5 px-4 text-sm font-semibold text-[#4863df] shadow-sm transition hover:bg-[#4863df]/10"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            Download PDF
                        </a>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <div className="mx-auto min-h-[520px] max-w-2xl rounded-sm bg-white px-10 py-9 text-sm leading-7 text-slate-800 shadow-sm ring-1 ring-slate-200">
                        {/* Kop Surat */}
                        <div className="mb-5">
                            <div className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">
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
                                    <td className="w-[90px] align-top">Nomor</td>
                                    <td className="w-[15px] align-top">:</td>
                                    <td>
                                        {letter.number || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="align-top">Lampiran</td>
                                    <td className="align-top">:</td>
                                    <td>1 Berkas</td>
                                </tr>
                                <tr>
                                    <td className="align-top">Perihal</td>
                                    <td className="align-top">:</td>
                                    <td>
                                        Permohonan Pelaksanaan Recurrent Senior Avsec bagi Karyawan Kantor Regional I PT Angkasa Pura Indonesia (Persero)
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Tujuan */}
                        <div className="mb-5 text-sm">
                            <div>Kepada Yth.</div>
                            <div className="font-semibold uppercase">
                                KELAPA BALAI PENDIDIKAN DAN PELATIHAN
                                PENERBANGAN (BP3) CURUG
                            </div>
                            <div>Di -</div>
                            <div>TEMPAT</div>
                        </div>

                        {/* Isi */}
                        <div className="text-justify text-sm leading-7">
                            <p>
                                Menindaklanjuti Perjanjian Kerjasama Antara Balai Pendidikan dan Pelatihan Penerbangan Curug dan
                                PT Angkasa Pura Indonesia Kantor Regional I Nomor{' '}
                                <span className="bg-yellow-100 px-1">
                                    {letter.body || 'HK.201/1/7/BP3C/2026; PJJ.CGR.HCB.0003/DL.06.01/2026'}
                                </span>{' '}
                                Tentang Pelatihan Personel Bidang Bandar Udara (Refreshment) Dan Personel Bidang Keamanan
                                Penerbangan (Recurrent), bersama ini disampaikan permohonan pelaksanaan Pelatihan Recurrent
                                Senior Avsec bagi karyawan di lingkungan Regional I PT Angkasa Pura Indonesia (Persero).
                            </p>
                        </div>

                        {/* Note */}
                        <div className="mt-6 rounded-lg border border-dashed border-blue-200 bg-blue-50 p-3 text-xs text-blue-600">
                            <span className="font-semibold">Template BP3:</span>{' '}
                            Output PDF dihasilkan dari{' '}
                            <code className="rounded bg-blue-100 px-1">
                                storage/app/template/BP3.docx
                            </code>
                            . Teks yang diubah tidak akan menggunakan huruf tebal (bold).
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
    const [uploadInputKey, setUploadInputKey] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

    function deleteEmployee(employee: Employee) {
        router.delete(destroy.url(employee.id), {
            preserveScroll: true,
            preserveState: true,
        });
    }

    return (
        <section className="flex min-h-full flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-end xl:justify-between">
                <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:max-w-xs">
                    Filter Unit/Fungsi
                    <select
                        value={unitFilter}
                        onChange={updateUnitFilter}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                    >
                        <option value="">Semua unit</option>
                        <option value="teknik">Teknik</option>
                        <option value="avsek">Avsek</option>
                        <option value="pkpk">PKPK</option>
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
                    <button
                        type="button"
                        disabled
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400"
                    >
                        <DownloadIcon className="h-4 w-4" />
                        Download Template
                    </button>
                </form>
            </div>

            {uploadForm.errors.employees_file && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {uploadForm.errors.employees_file}
                </div>
            )}

            {skpExpiryAlerts.length > 0 && (
                <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm sm:flex-row sm:items-start">
                    <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div className="space-y-1">
                        <p className="font-semibold">
                            Pengingat SKP expired H-7
                        </p>
                        <p>
                            {skpExpiryAlerts
                                .slice(0, 3)
                                .map(
                                    ({ employee, status }) =>
                                        `${employee.name} (${status.label})`,
                                )
                                .join(', ')}
                            {skpExpiryAlerts.length > 3
                                ? ` dan ${skpExpiryAlerts.length - 3} lainnya`
                                : ''}
                        </p>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[2600px] border-collapse text-left text-sm">
                        <thead className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase">
                            <tr>
                                {employeeTableColumns.map((column) => (
                                    <th
                                        key={column}
                                        scope="col"
                                        className="border-b border-slate-200 px-4 py-3 whitespace-nowrap"
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.length > 0 ? (
                                employees.map((employee, index) => (
                                    <tr
                                        key={employee.id}
                                        className="text-slate-700 hover:bg-slate-50"
                                    >
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
                                            {employee.position ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.pg ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.unit_label ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <SkpExpiryCell
                                                value={employee.skp_expired}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {employee.function_category ?? '-'}
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

function SkpExpiryCell({ value }: { value: string | null }) {
    const status = getSkpExpiryStatus(value);

    if (!value) {
        return <span>-</span>;
    }

    if (!status) {
        return <span>{value}</span>;
    }

    return (
        <div className="flex items-center gap-2">
            <span>{value}</span>
            <span
                className={[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    status.tone === 'expired'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700',
                ].join(' ')}
            >
                {status.label}
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

    const daysUntilExpiry = Math.round(
        (expiryDate.getTime() - today.getTime()) / 86_400_000,
    );

    if (daysUntilExpiry < 0) {
        return {
            label: 'Expired',
            tone: 'expired',
        };
    }

    if (daysUntilExpiry <= 7) {
        return {
            label: daysUntilExpiry === 0 ? 'Hari ini' : `H-${daysUntilExpiry}`,
            tone: 'warning',
        };
    }

    return null;
}

function parseLocalDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

function formatSkpExpiryMonthYear(value: string | null) {
    if (!value) {
        return 'Belum diisi';
    }

    const date = parseLocalDate(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}

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

    return Array.from(categoryGroups.values()).flatMap((group) => {
        const totalTables = Math.ceil(
            group.employees.length / mandatoryTrainingRowsPerTable,
        );

        return Array.from({ length: totalTables }, (_, tableIndex) => {
            const startIndex = tableIndex * mandatoryTrainingRowsPerTable;
            const employees = group.employees.slice(
                startIndex,
                startIndex + mandatoryTrainingRowsPerTable,
            );

            return {
                ...group,
                key: `${group.key}::${tableIndex + 1}`,
                employees,
                tableNumber: tableIndex + 1,
                totalTables,
                totalCategoryEmployees: group.employees.length,
            };
        });
    });
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
    const groupsByKey = new Map(
        groupCopies.map((group) => [group.key, group]),
    );

    groups.forEach((group) => {
        group.employees.forEach((employee) => {
            const targetGroup = groupsByKey.get(classOverrides[employee.id]) ??
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




