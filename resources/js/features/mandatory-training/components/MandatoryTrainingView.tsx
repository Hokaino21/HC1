import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Employee, MandatoryTrainingClass, MandatoryTrainingPreview } from '@/types/welcome';
import { exportMandatoryTraining, moveToClass } from '@/routes/employees';
import { store as storeClass, update as updateClass, destroy as destroyClass } from '@/routes/mandatory-training-classes';
import { groupEmployeesForMandatoryTraining, getSkpExpiryStatus } from '@/features/shared/utils';
import { PlaceholderPanel } from '@/features/shared/components/PlaceholderPanel';
import { SkpExpiryCell } from '@/features/shared/components/SkpExpiryCell';
import { DownloadIcon, EyeIcon, PlusIcon, PencilIcon, TrashIcon, CloseIcon } from '@/features/shared/components/icons';

const mandatoryTrainingBaseColumns = [
    'No',
    'NIK',
    'Nama',
    'Lokasi',
    'Jabatan',
    'SKP Expired',
    'License',
];

const MAX_PARTICIPANTS_PER_CLASS = 25;

type MandatoryTrainingSkpFilter = '' | 'expired' | 'within_year' | 'active';

export default function MandatoryTrainingView({
    employees,
    classes = [],
}: {
    employees: Employee[];
    classes?: MandatoryTrainingClass[];
}) {
    const [checkedEmployeeIds, setCheckedEmployeeIds] = useState<Set<number>>(
        () => new Set(),
    );
    const [batchNames, setBatchNames] = useState<Record<string, string>>({});
    const [documentTitles, setDocumentTitles] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [skpFilter, setSkpFilter] = useState<MandatoryTrainingSkpFilter>('');
    const [previewData, setPreviewData] = useState<MandatoryTrainingPreview | null>(null);

    // Modal state for Create Class
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassCategory, setNewClassCategory] = useState('');
    const [isCreatingClass, setIsCreatingClass] = useState(false);

    // Modal state for Edit Class
    const [editingClass, setEditingClass] = useState<{
        id: number;
        name: string;
        function_category: string | null;
    } | null>(null);
    const [editClassName, setEditClassName] = useState('');
    const [editClassCategory, setEditClassCategory] = useState('');
    const [isUpdatingClass, setIsUpdatingClass] = useState(false);

    // Loading states for actions
    const [isDeletingClassId, setIsDeletingClassId] = useState<number | null>(null);
    const [movingEmployeeId, setMovingEmployeeId] = useState<number | null>(null);

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

    const groupedEmployees = useMemo(
        () => groupEmployeesForMandatoryTraining(filteredEmployees, classes),
        [filteredEmployees, classes],
    );

    // Class map to quickly look up total count from server classes prop
    const classCountMap = useMemo(() => {
        const map = new Map<number, number>();
        classes.forEach((cls) => {
            map.set(cls.id, cls.employees_count ?? 0);
        });
        return map;
    }, [classes]);

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

    function handleMoveEmployee(employeeId: number, targetClassId: number) {
        if (!targetClassId) {
            return;
        }

        setMovingEmployeeId(employeeId);
        router.put(
            moveToClass.url({ employee: employeeId }),
            { mandatory_training_class_id: targetClassId },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setMovingEmployeeId(null);
                },
                onError: (errors) => {
                    const message =
                        errors.mandatory_training_class_id ||
                        Object.values(errors)[0] ||
                        'Gagal memindahkan peserta.';
                    alert(message);
                },
            },
        );
    }

    function handleCreateClass(e: React.FormEvent) {
        e.preventDefault();
        if (!newClassName.trim()) {
            alert('Nama kelas harus diisi.');
            return;
        }

        setIsCreatingClass(true);
        router.post(
            storeClass.url(),
            {
                name: newClassName.trim(),
                function_category: newClassCategory.trim() || null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setNewClassName('');
                    setNewClassCategory('');
                },
                onFinish: () => {
                    setIsCreatingClass(false);
                },
                onError: (errors) => {
                    const message =
                        errors.name ||
                        errors.function_category ||
                        Object.values(errors)[0] ||
                        'Gagal menambahkan kelas.';
                    alert(message);
                },
            },
        );
    }

    function openEditClassModal(group: {
        classId: number;
        className: string;
        functionCategory: string | null;
    }) {
        setEditingClass({
            id: group.classId,
            name: group.className,
            function_category: group.functionCategory,
        });
        setEditClassName(group.className);
        setEditClassCategory(group.functionCategory || '');
    }

    function handleUpdateClass(e: React.FormEvent) {
        e.preventDefault();
        if (!editingClass || !editClassName.trim()) {
            alert('Nama kelas harus diisi.');
            return;
        }

        setIsUpdatingClass(true);
        router.put(
            updateClass.url({ mandatoryTrainingClass: editingClass.id }),
            {
                name: editClassName.trim(),
                function_category: editClassCategory.trim() || null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setEditingClass(null);
                },
                onFinish: () => {
                    setIsUpdatingClass(false);
                },
                onError: (errors) => {
                    const message =
                        errors.name ||
                        errors.function_category ||
                        Object.values(errors)[0] ||
                        'Gagal memperbarui kelas.';
                    alert(message);
                },
            },
        );
    }

    function handleDeleteClass(classId: number, className: string, currentCount: number) {
        if (currentCount > 0) {
            alert(`Kelas "${className}" tidak bisa dihapus karena masih memiliki ${currentCount} peserta.`);
            return;
        }

        if (!window.confirm(`Apakah Anda yakin ingin menghapus kelas "${className}"? Data karyawan tidak akan terhapus.`)) {
            return;
        }

        setIsDeletingClassId(classId);
        router.delete(
            destroyClass.url({ mandatoryTrainingClass: classId }),
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setIsDeletingClassId(null);
                },
                onError: (errors) => {
                    const message =
                        errors.class ||
                        Object.values(errors)[0] ||
                        'Gagal menghapus kelas.';
                    alert(message);
                },
            },
        );
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
            classLabel: group.className,
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
            {/* Top Toolbar */}
            <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
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

                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                setNewClassName('');
                                setNewClassCategory('');
                                setIsCreateModalOpen(true);
                            }}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f57c6]"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Tambah Kelas
                        </button>
                    </div>
                </div>
            </div>

            {/* List of Classes */}
            {groupedEmployees.length > 0 ? (
                groupedEmployees.map((group) => {
                    const tableColumns = [
                        ...mandatoryTrainingBaseColumns,
                        'Pindah Kelas',
                        'Ceklis',
                    ];
                    const groupIds = group.employees.map((e) => e.id);
                    const groupCheckedCount = groupIds.filter((id) =>
                        checkedEmployeeIds.has(id),
                    ).length;
                    const isAllGroupChecked =
                        groupIds.length > 0 &&
                        groupCheckedCount === groupIds.length;

                    const totalInDb = classCountMap.get(group.classId) ?? group.employees.length;
                    const isFull = totalInDb >= MAX_PARTICIPANTS_PER_CLASS;
                    const isEmptyClass = totalInDb === 0;

                    return (
                        <div
                            key={group.key}
                            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                        >
                            {/* Class Card Header */}
                            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="rounded-lg bg-[#4863df]/10 px-3 py-1 text-sm font-semibold text-[#2f4585] ring-1 ring-[#4863df]/20">
                                            License: {group.functionCategory ?? 'Belum diisi'}
                                        </span>
                                        <span className="text-base font-bold text-slate-800">
                                            {group.className}
                                        </span>
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                isFull
                                                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                                                    : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                                            }`}
                                        >
                                            {totalInDb} / {MAX_PARTICIPANTS_PER_CLASS} Peserta
                                            {isFull ? ' (Penuh)' : ''}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEditClassModal(group)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                                            title="Edit Nama / Kategori Kelas"
                                        >
                                            <PencilIcon className="h-3.5 w-3.5 text-slate-500" />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDeleteClass(
                                                    group.classId,
                                                    group.className,
                                                    totalInDb,
                                                )
                                            }
                                            disabled={
                                                !isEmptyClass ||
                                                isDeletingClassId === group.classId
                                            }
                                            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-sm transition ${
                                                isEmptyClass
                                                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300'
                                                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                                            }`}
                                            title={
                                                isEmptyClass
                                                    ? 'Hapus Kelas'
                                                    : 'Kelas hanya bisa dihapus jika peserta 0'
                                            }
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                            {isDeletingClassId === group.classId
                                                ? 'Menghapus...'
                                                : 'Hapus'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                                        Judul Dokumen
                                        <input
                                            type="text"
                                            value={documentTitles[group.key] || ''}
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
                                        {groupCheckedCount} dari {groupIds.length} data diceklis
                                    </div>
                                    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={isAllGroupChecked}
                                            onChange={() => toggleGroupChecks(group.key)}
                                            disabled={groupIds.length === 0}
                                            className="h-4 w-4 rounded border-slate-300 text-[#4863df] focus:ring-[#4863df]"
                                        />
                                        Ceklis semua
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handlePreviewGroup(group.key)}
                                        disabled={groupCheckedCount === 0}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f57c6] disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        Preview PDF
                                    </button>
                                </div>
                            </div>

                            {/* Class Table or Empty State */}
                            <div className="overflow-hidden">
                                {group.employees.length > 0 ? (
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
                                            {group.employees.map((employee, index) => {
                                                const isThisMoving = movingEmployeeId === employee.id;

                                                return (
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
                                                            {employee.location ?? '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {employee.position ?? '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <SkpExpiryCell
                                                                value={employee.skp_expired}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {employee.function_category ?? '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select
                                                                value={employee.mandatory_training_class_id ?? group.classId}
                                                                disabled={isThisMoving}
                                                                onChange={(event) =>
                                                                    handleMoveEmployee(
                                                                        employee.id,
                                                                        Number(event.target.value),
                                                                    )
                                                                }
                                                                className="h-9 w-full max-w-[240px] rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20 disabled:bg-slate-100"
                                                                aria-label={`Pindah kelas ${employee.name}`}
                                                            >
                                                                {classes.map((cls) => {
                                                                    const count = cls.employees_count ?? 0;
                                                                    const isDestinationFull =
                                                                        count >= MAX_PARTICIPANTS_PER_CLASS &&
                                                                        cls.id !== employee.mandatory_training_class_id;

                                                                    return (
                                                                        <option
                                                                            key={cls.id}
                                                                            value={cls.id}
                                                                            disabled={isDestinationFull}
                                                                        >
                                                                            {cls.name} ({count}/{MAX_PARTICIPANTS_PER_CLASS}
                                                                            {isDestinationFull ? ' - Penuh' : ''})
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={checkedEmployeeIds.has(employee.id)}
                                                                onChange={() =>
                                                                    toggleEmployeeCheck(employee.id)
                                                                }
                                                                aria-label={`Ceklis ${employee.name}`}
                                                                className="h-4 w-4 rounded border-slate-300 text-[#4863df] focus:ring-[#4863df]"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-sm text-slate-500">
                                        Belum ada peserta di kelas ini. Peserta dapat dipindahkan ke kelas ini melalui menu Pindah Kelas di kelas lain.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <PlaceholderPanel text="Belum ada data kelas atau karyawan untuk daftar diklat mandatory." />
            )}

            {/* Modal: Tambah Kelas */}
            {isCreateModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">
                                Tambah Kelas Baru
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <CloseIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateClass} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Nama Kelas <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Avsec 3, Teknik 2"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Kategori License (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Avsec, Teknik, PKKP"
                                    value={newClassCategory}
                                    onChange={(e) => setNewClassCategory(e.target.value)}
                                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingClass}
                                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3f57c6] disabled:bg-slate-400"
                                >
                                    {isCreatingClass ? 'Menyimpan...' : 'Simpan Kelas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {/* Modal: Edit Kelas */}
            {editingClass ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">
                                Edit Kelas
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingClass(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <CloseIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateClass} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Nama Kelas <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Avsec 1"
                                    value={editClassName}
                                    onChange={(e) => setEditClassName(e.target.value)}
                                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Kategori License (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Avsec, Teknik, PKKP"
                                    value={editClassCategory}
                                    onChange={(e) => setEditClassCategory(e.target.value)}
                                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingClass(null)}
                                    className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingClass}
                                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3f57c6] disabled:bg-slate-400"
                                >
                                    {isUpdatingClass ? 'Memperbarui...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {/* Modal: Preview PDF */}
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
                                    License: {previewData.functionCategory || 'Belum diisi'}
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
                                                        {employee.location ?? '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.position ?? '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.skp_expired ?? '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {employee.function_category ?? '-'}
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
