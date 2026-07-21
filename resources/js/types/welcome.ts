import type { ComponentType, SVGProps } from 'react';

type TabId = 'dashboard' | 'karyawan' | 'diklat' | 'template';
type LicenseFilter = '' | 'teknik' | 'avsec' | 'pkkp' | 'arff' | 'amc';
type MultiLicenseFilter = '' | 'multiple';
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
    gender: string | null;
    position: string | null;
    pg: string | null;
    unit: string | null;
    location: string | null;
    unit_label: string | null;
    skp_expired: string | null;
    function_category: string | null;
    sub_license: string | null;
    training_schedule: string | null;
    avsec_category: string | null;
    has_multiple_licenses: boolean;
    license_count_by_name: number;
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
    gender: string | null;
    position: string | null;
    pg: string | null;
    unit: string | null;
    location: string | null;
    skp_expired: string | null;
    function_category: string | null;
    sub_license: string | null;
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
        license: LicenseFilter | null;
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
