import { Employee, MandatoryTrainingClass, MandatoryTrainingGroup, SkpExpiryAlert, SkpExpiryStatus } from '@/types/welcome';

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

    const yearsDiff = expiryDate.getFullYear() - today.getFullYear();
    const monthsDiff = expiryDate.getMonth() - today.getMonth();
    const totalMonthsDiff = yearsDiff * 12 + monthsDiff;

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

export function groupEmployeesForMandatoryTraining(
    employees: Employee[],
    classes: MandatoryTrainingClass[] = [],
): MandatoryTrainingGroup[] {
    const classesById = new Map<number, MandatoryTrainingClass>();
    classes.forEach((cls) => classesById.set(cls.id, cls));

    const classEmployeesMap = new Map<number, Employee[]>();
    const functionCategoryByClassId = new Map<number, string | null>();
    const classNameByClassId = new Map<number, string>();

    classes.forEach((cls) => {
        classEmployeesMap.set(cls.id, []);
        functionCategoryByClassId.set(cls.id, cls.function_category);
        classNameByClassId.set(cls.id, cls.name);
    });

    employees.forEach((employee) => {
        const classId = employee.mandatory_training_class_id;
        if (classId == null) {
            return;
        }
        if (!classEmployeesMap.has(classId)) {
            classEmployeesMap.set(classId, []);
        }
        classEmployeesMap.get(classId)!.push(employee);
    });

    const categoryClassCounters = new Map<string, number>();
    const totalByCategory = new Map<string, number>();

    const sortedClassIds = Array.from(classesById.keys()).sort((a, b) => {
        const clsA = classesById.get(a);
        const clsB = classesById.get(b);
        const catA = normalizeCategoryKey(clsA?.function_category ?? '');
        const catB = normalizeCategoryKey(clsB?.function_category ?? '');
        if (catA !== catB) return catA.localeCompare(catB);
        const nameA = clsA?.name ?? '';
        const nameB = clsB?.name ?? '';
        return nameA.localeCompare(nameB, 'id-ID');
    });

    sortedClassIds.forEach((classId) => {
        const funcCat = functionCategoryByClassId.get(classId) ?? '';
        const key = normalizeCategoryKey(funcCat);
        totalByCategory.set(key, (totalByCategory.get(key) ?? 0) + 1);
    });

    const allGroups: MandatoryTrainingGroup[] = [];

    sortedClassIds.forEach((classId) => {
        const emps = classEmployeesMap.get(classId) ?? [];
        const funcCat = functionCategoryByClassId.get(classId) ?? null;
        const key = normalizeCategoryKey(funcCat);
        const currentNumber = (categoryClassCounters.get(key) ?? 0) + 1;
        categoryClassCounters.set(key, currentNumber);

        const firstSkpExpired = emps[0]?.skp_expired ?? null;

        allGroups.push({
            key: `class-${classId}`,
            classId,
            skpExpired: firstSkpExpired,
            functionCategory: funcCat,
            employees: emps.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                if (nameA !== nameB) return nameA.localeCompare(nameB);
                return a.nik.localeCompare(b.nik);
            }),
            tableNumber: currentNumber,
            totalTables: totalByCategory.get(key) ?? 1,
            totalCategoryEmployees: emps.length,
            className: classNameByClassId.get(classId) ?? `Kelas ${classId}`,
        });
    });

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

export function buildEmployeeClassIdMap(groups: MandatoryTrainingGroup[]) {
    const employeeClassIds = new Map<number, number>();

    groups.forEach((group) => {
        group.employees.forEach((employee) => {
            employeeClassIds.set(employee.id, group.classId);
        });
    });

    return employeeClassIds;
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

export function getSkpExpiryAlerts(employees: Employee[]): SkpExpiryAlert[] {
    return employees.reduce<SkpExpiryAlert[]>((alerts, employee) => {
        const status = getSkpExpiryStatus(employee.skp_expired);

        if (status) {
            alerts.push({ employee, status });
        }

        return alerts;
    }, []);
}
