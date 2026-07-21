import React, { useState, useRef, useMemo, ChangeEvent, FormEvent, Fragment, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Employee, LicenseFilter, MultiLicenseFilter, EmployeeAvsecArchive, EmployeeDocumentColumn } from '@/types/welcome';
import { store, update, destroy, downloadTemplate } from '@/actions/App/Http/Controllers/EmployeeController';
import { UploadIcon, TrashIcon, PencilIcon, ArchiveIcon, CloseIcon, AlertTriangleIcon } from '@/features/shared/components/icons';
import { SkpExpiryCell } from '@/features/shared/components/SkpExpiryCell';
import { parseLocalDate, getSkpExpiryStatus } from '@/features/shared/utils';

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

const teknikSubLicenseOptions = [
    'A2B',
    'ACS',
    'ADG',
    'ALS',
    'BAF',
    'CCR',
    'FSD',
    'FSU',
    'GNS',
    'IFS',
    'P3KP',
    'P3UKP',
    'PBC',
    'PSS',
    'TQM',
    'TRD',
    'WPS',
] as const;

const employeeTableColumns = [
    'Ceklis',
    'No',
    'NIK',
    'Nama',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Jenis Kelamin',
    'Jabatan',
    'PG',
    'Unit',
    'Lokasi',
    'SKP Expired',
    'License',
    'Jadwal Diklat',
    'Sub License',
    'Kategori',
    ...employeeDocumentColumns.map((column) => column.label),
    'Aksi',
];

export default function EmployeeDataView({
    employees,
    initialLicenseFilter,
}: {
    employees: Employee[];
    initialLicenseFilter: LicenseFilter;
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
    const [licenseFilter, setLicenseFilter] =
        useState<LicenseFilter>(initialLicenseFilter);
    const [multiLicenseFilter, setMultiLicenseFilter] =
        useState<MultiLicenseFilter>('');
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
    }, [employees.length, licenseFilter, multiLicenseFilter, searchQuery, skpFilter]);

    useEffect(() => {
        setLicenseFilter(initialLicenseFilter);
    }, [initialLicenseFilter]);

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
    const [avsecCategoryConfirm, setAvsecCategoryConfirm] = useState<{
        employee: Employee;
        nextCategory: string | null;
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
        const licenseCountsByName = employees.reduce<Map<string, number>>(
            (counts, employee) => {
                const nameKey = normalizeNameValue(employee.name);
                const currentCount = counts.get(nameKey) ?? 0;
                const fallbackCount =
                    employee.has_multiple_licenses ||
                    employee.license_count_by_name > 1
                        ? Math.max(employee.license_count_by_name, 2)
                        : 1;

                counts.set(nameKey, Math.max(currentCount, fallbackCount));

                return counts;
            },
            new Map(),
        );

        let filtered = [...employees];

        if (licenseFilter) {
            filtered = filtered.filter(
                (employee) =>
                    normalizeLicenseValue(employee.function_category) ===
                    licenseFilter,
            );
        }

        if (multiLicenseFilter === 'multiple') {
            filtered = filtered.filter((employee) => {
                const metadataCount = employee.license_count_by_name;
                const countByName =
                    metadataCount > 0
                        ? metadataCount
                        : (licenseCountsByName.get(
                              normalizeNameValue(employee.name),
                          ) ?? 0);

                return employee.has_multiple_licenses || countByName > 1;
            });
        }

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

        return filtered.sort(compareEmployees);
    }, [employees, licenseFilter, multiLicenseFilter, searchQuery, skpFilter]);

    const editForm = useForm<{
        nik: string;
        name: string;
        place_of_birth: string | null;
        date_of_birth: string | null;
        gender: string | null;
        position: string | null;
        pg: string | null;
        unit: string | null;
        location: string | null;
        skp_expired: string | null;
        function_category: string | null;
        sub_license: string | null;
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
        gender: null,
        position: null,
        pg: null,
        unit: null,
        location: null,
        skp_expired: null,
        function_category: null,
        sub_license: null,
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

    function updateLicenseFilter(event: ChangeEvent<HTMLSelectElement>) {
        setLicenseFilter(event.target.value as LicenseFilter);
    }

    function openEditModal(employee: Employee) {
        setEditingEmployee(employee);
        editForm.setData({
            nik: employee.nik,
            name: employee.name,
            place_of_birth: employee.place_of_birth,
            date_of_birth: employee.date_of_birth,
            gender: employee.gender,
            position: employee.position,
            pg: employee.pg,
            unit: employee.unit,
            location: employee.location,
            skp_expired: employee.skp_expired,
            function_category: employee.function_category,
            sub_license: employee.sub_license,
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

        if (!supportsCategory(employee.function_category)) {
            return;
        }

        if (employee.avsec_category === normalizedCategory) {
            return;
        }

        setAvsecCategoryConfirm({
            employee,
            nextCategory: normalizedCategory,
        });
    }

    function confirmAvsecCategoryChange() {
        if (!avsecCategoryConfirm) {
            return;
        }

        const employee = avsecCategoryConfirm.employee;
        const normalizedCategory = avsecCategoryConfirm.nextCategory;

        router.put(
            update.url(employee.id),
            {
                nik: employee.nik,
                name: employee.name,
                place_of_birth: employee.place_of_birth,
                date_of_birth: employee.date_of_birth,
                gender: employee.gender,
                position: employee.position,
                pg: employee.pg,
                unit: employee.unit,
                location: employee.location,
                skp_expired: employee.skp_expired,
                function_category: employee.function_category,
                sub_license: employee.sub_license,
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
                onFinish: () => {
                    setAvsecCategoryConfirm(null);
                },
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
        <section className="flex min-w-0 flex-col gap-4">
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
                        value={licenseFilter}
                        onChange={updateLicenseFilter}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                    >
                        <option value="">Semua</option>
                        <option value="teknik">Teknik</option>
                        <option value="avsec">Avsec</option>
                        <option value="pkkp">PKKP</option>
                        <option value="arff">ARFF</option>
                        <option value="amc">AMC</option>
                    </select>
                </label>
                <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:max-w-xs">
                    Filter SKP Expired
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
                <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:max-w-xs">
                    Filter Multi License
                    <select
                        value={multiLicenseFilter}
                        onChange={(e) =>
                            setMultiLicenseFilter(
                                e.target.value as MultiLicenseFilter,
                            )
                        }
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                    >
                        <option value="">Semua</option>
                        <option value="multiple">
                            License Lebih dari 1
                        </option>
                    </select>
                </label>

                <form
                    onSubmit={submitUpload}
                    className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-[26rem]"
                >
                    <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
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
                    <div className="flex flex-wrap items-center gap-2">
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
                            onClick={() => {
                                window.location.href = downloadTemplate.url();
                            }}
                            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold whitespace-nowrap text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            Download Template Excel
                        </button>
                    </div>
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
            <div className="flex min-h-[65vh] flex-1 flex-col max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
                                            {employee.gender ?? '-'}
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
                                            {isTeknikLicense(
                                                employee.function_category,
                                            )
                                                ? employee.sub_license ?? '-'
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {supportsCategory(
                                                employee.function_category,
                                            ) ? (
                                                <div className="min-w-[180px]">
                                                    <label className="sr-only">
                                                        Kategori{' '}
                                                        {employee.name}
                                                    </label>
                                                    <select
                                                        value={
                                                            employee.avsec_category ||
                                                            ''
                                                        }
                                                        onChange={(event) => {
                                                            const nextValue =
                                                                event.target
                                                                    .value ||
                                                                null;

                                                            event.target.value =
                                                                employee.avsec_category ||
                                                                '';

                                                            updateAvsecCategory(
                                                                employee,
                                                                nextValue,
                                                            );
                                                        }}
                                                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm font-medium text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                    >
                                                        <option value="">
                                                            {getCategoryPlaceholder(
                                                                employee.function_category,
                                                            )}
                                                        </option>
                                                        {getCategoryOptions(
                                                            employee.function_category,
                                                        ).map((option) => (
                                                            <option
                                                                key={option}
                                                                value={option}
                                                            >
                                                                {option}
                                                            </option>
                                                        ))}
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
            {avsecCategoryConfirm ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="avsec-category-confirm-title"
                >
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
                        <h2
                            id="avsec-category-confirm-title"
                            className="mb-4 text-lg font-bold text-slate-900"
                        >
                            Konfirmasi Perubahan
                        </h2>
                        <p className="mb-6 text-sm text-slate-600">
                            Ubah kategori {avsecCategoryConfirm.employee.name}{' '}
                            ({avsecCategoryConfirm.employee.nik}) dari{' '}
                            {avsecCategoryConfirm.employee.avsec_category ||
                                'Belum diisi'}{' '}
                            ke{' '}
                            {avsecCategoryConfirm.nextCategory ||
                                'Belum diisi'}
                            ?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setAvsecCategoryConfirm(null)}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={confirmAvsecCategoryChange}
                                className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
                            >
                                Ya, Ubah
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
                                    Sub License Aktif
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                    {employee.sub_license ?? '-'}
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
                                        label="Sub License"
                                        value={archiveToDisplay.sub_license}
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
                                        label="Jenis Kelamin"
                                        value={archiveToDisplay.gender}
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
    const teknikLicenseSelected = isTeknikLicense(form.data.function_category);
    const categoryOptions = getCategoryOptions(form.data.function_category);

    function updateFunctionCategory(nextValue: string | null) {
        const nextCategoryOptions = getCategoryOptions(nextValue);

        form.setData('function_category', nextValue);

        if (!isTeknikLicense(nextValue)) {
            form.setData('sub_license', null);
        }

        if (!supportsCategory(nextValue)) {
            form.setData('avsec_category', null);

            return;
        }

        if (
            form.data.avsec_category &&
            !nextCategoryOptions.includes(form.data.avsec_category)
        ) {
            form.setData('avsec_category', null);
        }
    }

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
                                Jenis Kelamin
                                <select
                                    value={form.data.gender || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'gender',
                                            e.target.value || null,
                                        )
                                    }
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Pilih jenis kelamin</option>
                                    <option value="Laki-laki">
                                        Laki-laki
                                    </option>
                                    <option value="Perempuan">
                                        Perempuan
                                    </option>
                                </select>
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
                                <input
                                    type="text"
                                    value={form.data.unit || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'unit',
                                            e.target.value || null,
                                        )
                                    }
                                    placeholder="Contoh: Teknik"
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
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
                                        updateFunctionCategory(
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
                                Sub License
                                <select
                                    value={form.data.sub_license || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'sub_license',
                                            e.target.value || null,
                                        )
                                    }
                                    disabled={!teknikLicenseSelected}
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >
                                    <option value="">
                                        {teknikLicenseSelected
                                            ? 'Pilih sub license'
                                            : 'Hanya untuk license Teknik'}
                                    </option>
                                    {teknikSubLicenseOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                                Kategori
                                <select
                                    value={form.data.avsec_category || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'avsec_category',
                                            e.target.value || null,
                                        )
                                    }
                                    disabled={!supportsCategory(form.data.function_category)}
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >
                                    <option value="">
                                        {getCategoryPlaceholder(
                                            form.data.function_category,
                                        )}
                                    </option>
                                    {categoryOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <p className="mt-1 text-xs text-slate-500">
                                {avsecLicenseSelected
                                    ? 'Riwayat kategori lama akan masuk ke arsip saat kategori aktif diperbarui.'
                                    : teknikLicenseSelected
                                      ? 'Kategori Teknik tersedia: Terampil dan Ahli.'
                                      : 'Kategori hanya aktif untuk license Avsec dan Teknik.'}
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

function isTeknikLicense(value: string | null | undefined) {
    return value?.trim().toLowerCase() === 'teknik';
}

function supportsCategory(value: string | null | undefined) {
    return isAvsecLicense(value) || isTeknikLicense(value);
}

function getCategoryOptions(value: string | null | undefined) {
    if (isAvsecLicense(value)) {
        return ['Basic', 'Junior', 'Senior'];
    }

    if (isTeknikLicense(value)) {
        return ['Terampil', 'Ahli'];
    }

    return [];
}

function getCategoryPlaceholder(value: string | null | undefined) {
    if (isAvsecLicense(value) || isTeknikLicense(value)) {
        return 'Pilih kategori';
    }

    return 'Hanya untuk license Avsec dan Teknik';
}

function normalizeLicenseValue(value: string | null | undefined): LicenseFilter {
    const normalizedValue = value?.trim().toLowerCase();

    switch (normalizedValue) {
        case 'teknik':
            return 'teknik';
        case 'avsec':
        case 'avsek':
            return 'avsec';
        case 'pkkp':
        case 'pkpk':
            return 'pkkp';
        case 'arff':
            return 'arff';
        case 'amc':
            return 'amc';
        default:
            return '';
    }
}

function normalizeNameValue(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? '';
}

function compareEmployees(left: Employee, right: Employee) {
    const nameComparison = left.name.localeCompare(right.name, 'id-ID', {
        sensitivity: 'base',
    });

    if (nameComparison !== 0) {
        return nameComparison;
    }

    const licenseComparison = (left.function_category ?? '').localeCompare(
        right.function_category ?? '',
        'id-ID',
        { sensitivity: 'base' },
    );

    if (licenseComparison !== 0) {
        return licenseComparison;
    }

    const categoryComparison = (left.avsec_category ?? '').localeCompare(
        right.avsec_category ?? '',
        'id-ID',
        { sensitivity: 'base' },
    );

    if (categoryComparison !== 0) {
        return categoryComparison;
    }

    const subLicenseComparison = (left.sub_license ?? '').localeCompare(
        right.sub_license ?? '',
        'id-ID',
        { sensitivity: 'base' },
    );

    if (subLicenseComparison !== 0) {
        return subLicenseComparison;
    }

    return left.id - right.id;
}

function formatArchiveDateTime(value: string | null) {
    if (!value) {
        return '-';
    }

    const normalizedValue = value.includes(' ') && !value.includes('T')
        ? `${value.replace(' ', 'T')}Z`
        : value;

    const date = new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
