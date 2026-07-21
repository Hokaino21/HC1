import React, { useState, useMemo } from 'react';
import { Employee, MandatoryTrainingPreview } from '@/types/welcome';
import { exportMandatoryTraining } from '@/routes/employees';
import { groupEmployeesForMandatoryTraining, buildEmployeeClassKeyMap, applyMandatoryTrainingClassOverrides, getSkpExpiryStatus } from '@/features/shared/utils';
import { PlaceholderPanel } from '@/features/shared/components/PlaceholderPanel';
import { SkpExpiryCell } from '@/features/shared/components/SkpExpiryCell';
import { DownloadIcon, EyeIcon } from '@/features/shared/components/icons';

const mandatoryTrainingBaseColumns = [
    'No',
    'NIK',
    'Nama',
    'Lokasi',
    'Jabatan',
    'SKP Expired',
    'License',
];

type MandatoryTrainingSkpFilter = '' | 'expired' | 'within_year' | 'active';

export default function MandatoryTrainingView({ employees }: { employees: Employee[] }) {
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
    const [skpFilter, setSkpFilter] =
        useState<MandatoryTrainingSkpFilter>('');
    const [previewData, setPreviewData] =
        useState<MandatoryTrainingPreview | null>(null);

    const filteredEmployees = useMemo(() => {
        let filtered = employees;

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

        if (skpFilter) {
            filtered = filtered.filter((employee) => {
                const status = getSkpExpiryStatus(employee.skp_expired);

                if (!status) {
                    return false;
                }

                if (skpFilter === 'expired') {
                    return status.tone === 'expired';
                }

                if (skpFilter === 'within_year') {
                    return status.tone === 'warning';
                }

                if (skpFilter === 'active') {
                    return status.tone === 'active';
                }

                return true;
            });
        }

        return filtered;
    }, [employees, searchQuery, skpFilter]);

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
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
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
                        Filter SKP Expired
                        <select
                            value={skpFilter}
                            onChange={(e) =>
                                setSkpFilter(
                                    e.target.value as MandatoryTrainingSkpFilter,
                                )
                            }
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        >
                            <option value="">Semua</option>
                            <option value="expired">Expired</option>
                            <option value="within_year">Dalam 1 Tahun</option>
                            <option value="active">Aktif</option>
                        </select>
                    </label>
                </div>
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
