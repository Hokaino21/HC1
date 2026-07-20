import { Employee, MandatoryTrainingGroup, SkpExpiryAlert, SkpExpiryStatus } from '@/types/welcome';

export const mandatoryTrainingRowsPerTable = 25;

export function getSkpExpiryStatus(value: string | null): SkpExpiryStatus | null {
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

export function parseLocalDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

// export function formatSkpExpiryMonthYear(value: string | null) {
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

export function groupEmployeesForMandatoryTraining(
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

export function shuffleEmployees(employees: Employee[]) {
    const shuffledEmployees = [...employees];

    for (let index = shuffledEmployees.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        const currentEmployee = shuffledEmployees[index];

        shuffledEmployees[index] = shuffledEmployees[randomIndex];
        shuffledEmployees[randomIndex] = currentEmployee;
    }

    return shuffledEmployees;
}

export function buildEmployeeClassKeyMap(groups: MandatoryTrainingGroup[]) {
    const employeeClassKeys = new Map<number, string>();

    groups.forEach((group) => {
        group.employees.forEach((employee) => {
            employeeClassKeys.set(employee.id, group.key);
        });
    });

    return employeeClassKeys;
}

export function applyMandatoryTrainingClassOverrides(
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
export function normalizeCategoryKey(value: string | null) {
    return value?.trim().toLocaleLowerCase('id-ID') ?? '';
}
