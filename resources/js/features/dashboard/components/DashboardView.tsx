import React, { useEffect, useMemo, useState } from 'react';
import { Employee } from '@/types/welcome';
import { getSkpExpiryStatus } from '@/features/shared/utils';
import { ShieldCheckIcon, CalendarIcon, MapPinIcon, AwardIcon, AlertTriangleIcon, UsersIcon } from '@/features/shared/components/icons';

export default function DashboardView({ employees = [] }: { employees: Employee[] }) {
    const [dashboardLicenseQuery, setDashboardLicenseQuery] = useState('');
    const [dashboardCategoryFilter, setDashboardCategoryFilter] =
        useState<string>('all');
    const [dashboardSubLicenseFilter, setDashboardSubLicenseFilter] =
        useState<string>('all');

    const licenseTypes = useMemo(() => {
        return Array.from(
            new Set(
                employees
                    .map((employee) =>
                        normalizeDashboardLicense(employee.function_category),
                    )
                    .filter((value): value is string => value !== null),
            ),
        );
    }, [employees]);

    const licenseFilteredEmployees = useMemo(() => {
        return employees.filter((employee) =>
            matchesDashboardLicenseQuery(
                employee.function_category,
                dashboardLicenseQuery,
            ),
        );
    }, [employees, dashboardLicenseQuery]);

    const categoryOptions = useMemo(() => {
        return Array.from(
            new Set(
                licenseFilteredEmployees
                    .map((employee) => employee.avsec_category?.trim())
                    .filter(
                        (value): value is string =>
                            Boolean(value) && value.length > 0,
                    ),
            ),
        ).sort((left, right) =>
            left.localeCompare(right, 'id-ID', { sensitivity: 'base' }),
        );
    }, [licenseFilteredEmployees]);

    const subLicenseOptions = useMemo(() => {
        return Array.from(
            new Set(
                licenseFilteredEmployees
                    .map((employee) => employee.sub_license?.trim())
                    .filter(
                        (value): value is string =>
                            Boolean(value) && value.length > 0,
                    ),
            ),
        ).sort((left, right) =>
            left.localeCompare(right, 'id-ID', { sensitivity: 'base' }),
        );
    }, [licenseFilteredEmployees]);

    useEffect(() => {
        if (
            dashboardCategoryFilter !== 'all' &&
            !categoryOptions.some((option) =>
                hasMatchingLabel(option, dashboardCategoryFilter),
            )
        ) {
            setDashboardCategoryFilter('all');
        }
    }, [categoryOptions, dashboardCategoryFilter]);

    useEffect(() => {
        if (
            dashboardSubLicenseFilter !== 'all' &&
            !subLicenseOptions.some((option) =>
                hasMatchingLabel(option, dashboardSubLicenseFilter),
            )
        ) {
            setDashboardSubLicenseFilter('all');
        }
    }, [dashboardSubLicenseFilter, subLicenseOptions]);

    const filteredEmployees = useMemo(() => {
        return licenseFilteredEmployees.filter((employee) => {
            if (
                dashboardCategoryFilter !== 'all' &&
                !hasMatchingLabel(
                    employee.avsec_category,
                    dashboardCategoryFilter,
                )
            ) {
                return false;
            }

            if (
                dashboardSubLicenseFilter !== 'all' &&
                !hasMatchingLabel(
                    employee.sub_license,
                    dashboardSubLicenseFilter,
                )
            ) {
                return false;
            }

            return true;
        });
    }, [
        dashboardCategoryFilter,
        dashboardSubLicenseFilter,
        licenseFilteredEmployees,
    ]);

    // 2. Summary stats
    const stats = useMemo(() => {
        let active = 0;
        let warning = 0;
        let expired = 0;
        let noData = 0;
        let male = 0;
        let female = 0;

        filteredEmployees.forEach((e) => {
            const status = getSkpExpiryStatus(e.skp_expired);
            const normalizedGender = normalizeGenderLabel(e.gender);

            if (normalizedGender === 'Laki-laki') {
                male++;
            } else if (normalizedGender === 'Perempuan') {
                female++;
            }

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
            male,
            female,
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
            const lic =
                formatDashboardLicenseLabel(
                    normalizeDashboardLicense(e.function_category),
                ) || 'Belum Diisi';
            counts[lic] = (counts[lic] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredEmployees]);

    const maxLicenseCount = useMemo(() => {
        return Math.max(...licenseCounts.map((l) => l.count), 1);
    }, [licenseCounts]);

    const statusFilteredStats = useMemo(() => {
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

    const categoryBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};

        filteredEmployees.forEach((employee) => {
            const category = employee.avsec_category?.trim() || 'Tanpa Kategori';

            counts[category] = (counts[category] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((left, right) => {
                if (right.count !== left.count) {
                    return right.count - left.count;
                }

                return left.name.localeCompare(right.name, 'id-ID', {
                    sensitivity: 'base',
                });
            });
    }, [filteredEmployees]);

    const subLicenseBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};

        filteredEmployees.forEach((employee) => {
            const subLicense =
                employee.sub_license?.trim() || 'Tanpa Sub License';

            counts[subLicense] = (counts[subLicense] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((left, right) => {
                if (right.count !== left.count) {
                    return right.count - left.count;
                }

                return left.name.localeCompare(right.name, 'id-ID', {
                    sensitivity: 'base',
                });
            });
    }, [filteredEmployees]);

    const detailBreakdown = useMemo(() => {
        const counts = new Map<
            string,
            {
                license: string;
                category: string;
                subLicense: string;
                count: number;
                active: number;
                warning: number;
                expired: number;
                noData: number;
            }
        >();

        filteredEmployees.forEach((employee) => {
            const license = formatDashboardLicenseLabel(
                normalizeDashboardLicense(employee.function_category) ??
                    employee.function_category?.trim() ??
                    null,
            );
            const category = employee.avsec_category?.trim() || 'Tanpa Kategori';
            const subLicense =
                employee.sub_license?.trim() || 'Tanpa Sub License';
            const key = [
                license.toLowerCase(),
                category.toLowerCase(),
                subLicense.toLowerCase(),
            ].join('::');
            const status = getSkpExpiryStatus(employee.skp_expired);

            if (!counts.has(key)) {
                counts.set(key, {
                    license,
                    category,
                    subLicense,
                    count: 0,
                    active: 0,
                    warning: 0,
                    expired: 0,
                    noData: 0,
                });
            }

            const current = counts.get(key);

            if (!current) {
                return;
            }

            current.count += 1;

            if (!employee.skp_expired) {
                current.noData += 1;
            } else if (status?.tone === 'expired') {
                current.expired += 1;
            } else if (status?.tone === 'warning') {
                current.warning += 1;
            } else {
                current.active += 1;
            }
        });

        return Array.from(counts.values()).sort((left, right) => {
            if (right.count !== left.count) {
                return right.count - left.count;
            }

            return `${left.license} ${left.category} ${left.subLicense}`
                .localeCompare(
                    `${right.license} ${right.category} ${right.subLicense}`,
                    'id-ID',
                    { sensitivity: 'base' },
                );
        });
    }, [filteredEmployees]);

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
            const lic =
                formatDashboardLicenseLabel(
                    normalizeDashboardLicense(e.function_category),
                ) || 'Belum Diisi';

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
                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="flex min-w-[180px] flex-col gap-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Filter License
                            <input
                                type="text"
                                list="dashboard-license-options"
                                value={dashboardLicenseQuery}
                                onChange={(event) =>
                                    setDashboardLicenseQuery(event.target.value)
                                }
                                placeholder="Ketik license, misal Teknik"
                                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                            />
                            <datalist id="dashboard-license-options">
                                {licenseTypes.map((license) => (
                                    <option
                                        key={license}
                                        value={formatDashboardLicenseLabel(
                                            license,
                                        )}
                                    />
                                ))}
                            </datalist>
                        </label>
                        <label className="flex min-w-[180px] flex-col gap-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Filter Kategori
                            <select
                                value={dashboardCategoryFilter}
                                onChange={(event) =>
                                    setDashboardCategoryFilter(
                                        event.target.value,
                                    )
                                }
                                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                            >
                                <option value="all">Semua Kategori</option>
                                {categoryOptions.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex min-w-[180px] flex-col gap-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Filter Sub License
                            <select
                                value={dashboardSubLicenseFilter}
                                onChange={(event) =>
                                    setDashboardSubLicenseFilter(
                                        event.target.value,
                                    )
                                }
                                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                            >
                                <option value="all">
                                    Semua Sub License
                                </option>
                                {subLicenseOptions.map((subLicense) => (
                                    <option
                                        key={subLicense}
                                        value={subLicense}
                                    >
                                        {subLicense}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        License:{' '}
                        {dashboardLicenseQuery.trim()
                            ? dashboardLicenseQuery
                            : 'Semua License'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        Kategori:{' '}
                        {dashboardCategoryFilter === 'all'
                            ? 'Semua Kategori'
                            : dashboardCategoryFilter}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        Sub License:{' '}
                        {dashboardSubLicenseFilter === 'all'
                            ? 'Semua Sub License'
                            : dashboardSubLicenseFilter}
                    </span>
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
                <StatCard
                    title="Laki-laki"
                    value={stats.male}
                    description="Total personel laki-laki"
                    icon={<UsersIcon className="h-6 w-6 text-sky-500" />}
                    colorClass="border-l-4 border-sky-500 bg-sky-50/10"
                />
                <StatCard
                    title="Perempuan"
                    value={stats.female}
                    description="Total personel perempuan"
                    icon={<UsersIcon className="h-6 w-6 text-fuchsia-500" />}
                    colorClass="border-l-4 border-fuchsia-500 bg-fuchsia-50/10"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <AwardIcon className="h-5 w-5 text-[#4863df]" />
                        <h3 className="font-bold text-slate-800">
                            Rincian Kategori
                        </h3>
                    </div>
                    {categoryBreakdown.length > 0 ? (
                        <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
                            {categoryBreakdown.map((item) => (
                                <SummaryBreakdownRow
                                    key={item.name}
                                    label={item.name}
                                    count={item.count}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyBreakdown text="Belum ada kategori pada hasil filter." />
                    )}
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <AwardIcon className="h-5 w-5 text-cyan-500" />
                        <h3 className="font-bold text-slate-800">
                            Rincian Sub License
                        </h3>
                    </div>
                    {subLicenseBreakdown.length > 0 ? (
                        <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
                            {subLicenseBreakdown.map((item) => (
                                <SummaryBreakdownRow
                                    key={item.name}
                                    label={item.name}
                                    count={item.count}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyBreakdown text="Belum ada sub license pada hasil filter." />
                    )}
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <UsersIcon className="h-5 w-5 text-emerald-500" />
                        <h3 className="font-bold text-slate-800">
                            Ringkasan Filter
                        </h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <MiniInfoCard
                            label="Data Ditampilkan"
                            value={filteredEmployees.length}
                        />
                        <MiniInfoCard
                            label="Jenis Kategori"
                            value={categoryBreakdown.length}
                        />
                        <MiniInfoCard
                            label="Jenis Sub License"
                            value={subLicenseBreakdown.length}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <AwardIcon className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-800">
                        Rincian License, Kategori, dan Sub License
                    </h3>
                </div>
                {detailBreakdown.length > 0 ? (
                    <div className="flex max-h-[360px] flex-col gap-3 overflow-y-auto pr-1">
                        {detailBreakdown.map((item) => (
                            <div
                                key={`${item.license}-${item.category}-${item.subLicense}`}
                                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                            License: {item.license}
                                        </span>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                            Kategori: {item.category}
                                        </span>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                            Sub License: {item.subLicense}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">
                                        {item.count} personel
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                                    <StatusPill
                                        label="Aktif"
                                        count={item.active}
                                        className="bg-emerald-50 text-emerald-700"
                                    />
                                    <StatusPill
                                        label="Warning"
                                        count={item.warning}
                                        className="bg-amber-50 text-amber-700"
                                    />
                                    <StatusPill
                                        label="Expired"
                                        count={item.expired}
                                        className="bg-rose-50 text-rose-700"
                                    />
                                    <StatusPill
                                        label="Tanpa Data"
                                        count={item.noData}
                                        className="bg-slate-100 text-slate-700"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyBreakdown text="Belum ada kombinasi detail untuk filter yang dipilih." />
                )}
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
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {dashboardLicenseQuery.trim()
                                ? dashboardLicenseQuery
                                : 'Semua License'}
                        </span>
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

function SummaryBreakdownRow({
    label,
    count,
}: {
    label: string;
    count: number;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="text-sm font-semibold text-slate-700">
                {label}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {count}
            </span>
        </div>
    );
}

function MiniInfoCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {label}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {value}
            </p>
        </div>
    );
}

function EmptyBreakdown({ text }: { text: string }) {
    return (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-medium text-slate-400">
            {text}
        </div>
    );
}

function StatusPill({
    label,
    count,
    className,
}: {
    label: string;
    count: number;
    className: string;
}) {
    return (
        <span className={['rounded-full px-3 py-1', className].join(' ')}>
            {label}: {count}
        </span>
    );
}

function normalizeDashboardLicense(value: string | null | undefined): string | null {
    const normalized = value?.trim().toLowerCase();

    switch (normalized) {
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
        case undefined:
        case null:
        case '':
            return null;
        default:
            return normalized ?? null;
    }
}

function normalizeDashboardSearchValue(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? '';
}

function hasMatchingLabel(
    value: string | null | undefined,
    query: string | null | undefined,
): boolean {
    return normalizeDashboardSearchValue(value) ===
        normalizeDashboardSearchValue(query);
}

function matchesDashboardLicenseQuery(
    value: string | null | undefined,
    query: string | null | undefined,
): boolean {
    const normalizedQuery = normalizeDashboardSearchValue(query);

    if (!normalizedQuery) {
        return true;
    }

    const normalizedLicense = normalizeDashboardLicense(value);
    const formattedLicense = formatDashboardLicenseLabel(normalizedLicense);
    const rawValue = normalizeDashboardSearchValue(value);
    const formattedValue = normalizeDashboardSearchValue(formattedLicense);
    const canonicalValue = normalizeDashboardSearchValue(normalizedLicense);

    return rawValue.includes(normalizedQuery) ||
        formattedValue.includes(normalizedQuery) ||
        canonicalValue.includes(normalizedQuery);
}

function formatDashboardLicenseLabel(value: string | null | undefined): string {
    switch (value) {
        case 'teknik':
            return 'Teknik';
        case 'avsec':
            return 'Avsec';
        case 'pkkp':
            return 'PKKP';
        case 'arff':
            return 'ARFF';
        case 'amc':
            return 'AMC';
        default:
            return value ? value.charAt(0).toUpperCase() + value.slice(1) : '-';
    }
}

function normalizeGenderLabel(value: string | null | undefined): string | null {
    const normalized = value?.trim().toLowerCase();

    switch (normalized) {
        case 'l':
        case 'lk':
        case 'laki':
        case 'laki-laki':
        case 'lakilaki':
        case 'pria':
        case 'male':
        case 'm':
            return 'Laki-laki';
        case 'p':
        case 'pr':
        case 'perempuan':
        case 'wanita':
        case 'female':
        case 'f':
            return 'Perempuan';
        default:
            return value ?? null;
    }
}
