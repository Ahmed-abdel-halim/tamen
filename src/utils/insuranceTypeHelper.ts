// تعريف موحد لجميع أنواع التأمين
export const INSURANCE_TYPES = {
  CAR_MANDATORY: 'تأمين إجباري سيارات',
  CAR_CUSTOMS: 'تأمين سيارة جمرك',
  CAR_FOREIGN: 'تأمين سيارات أجنبية',
  CAR_THIRD_PARTY: 'تأمين طرف ثالث سيارات',
  CAR_INTERNATIONAL: 'تأمين السيارات الدولي',
  TRAVEL: 'تأمين المسافرين',
  RESIDENT: 'تأمين الوافدين',
  MARINE: 'تأمين الهياكل البحرية',
  PROFESSIONAL: 'تأمين المسؤولية المهنية',
  PERSONAL_ACCIDENT: 'تأمين الحوادث الشخصية',
} as const;

export const CAR_INSURANCE_TYPES: string[] = [
  INSURANCE_TYPES.CAR_MANDATORY,
  INSURANCE_TYPES.CAR_CUSTOMS,
  INSURANCE_TYPES.CAR_FOREIGN,
  INSURANCE_TYPES.CAR_THIRD_PARTY,
];

const ALIASES: Record<string, string> = {
  'تأمين إجباري سيارات': INSURANCE_TYPES.CAR_MANDATORY,
  'تأمين سيارات إجباري': INSURANCE_TYPES.CAR_MANDATORY,
  'تأمين سيارات اجباري': INSURANCE_TYPES.CAR_MANDATORY,
  'تأمين السيارات الدولي': INSURANCE_TYPES.CAR_INTERNATIONAL,
  'تأمين سيارات دولي': INSURANCE_TYPES.CAR_INTERNATIONAL,
};

/**
 * تحويل اسم التأمين إلى القيمة الموحدة
 */
export function normalizeInsuranceType(type: string): string {
  return ALIASES[type] || type;
}

/**
 * التحقق من نوع تأمين سيارات
 */
export function isCarInsurance(type: string): boolean {
  const normalized = normalizeInsuranceType(type);
  return CAR_INSURANCE_TYPES.includes(normalized) || 
         normalized === INSURANCE_TYPES.CAR_INTERNATIONAL;
}

/**
 * التحقق من تطابق نوع التأمين مع الفلتر
 */
export function matchesInsuranceFilter(
  docCategory: string,
  docInsuranceType: string,
  filter: string
): boolean {
  if (filter === 'all') {
    return true;
  }

  const normalizedFilter = normalizeInsuranceType(filter);
  const normalizedCategory = normalizeInsuranceType(docCategory);
  const normalizedInsuranceType = normalizeInsuranceType(docInsuranceType);

  // تطابق مباشر
  if (normalizedCategory === normalizedFilter || 
      normalizedInsuranceType === normalizedFilter ||
      docCategory === filter ||
      docInsuranceType === filter) {
    return true;
  }

  // معالجة "تأمين السيارات" (جميع أنواع السيارات)
  if (filter === 'تأمين السيارات') {
    return isCarInsurance(docCategory) || isCarInsurance(docInsuranceType);
  }

  return false;
}

/**
 * فلترة الوثائق حسب نوع التأمين
 */
export function filterDocumentsByInsuranceType<T extends { category?: string; insurance_type?: string }>(
  docs: T[],
  insuranceType: string
): T[] {
  if (insuranceType === 'all') {
    return docs;
  }

  return docs.filter(doc => {
    const category = doc.category || '';
    const insuranceTypeValue = doc.insurance_type || '';
    
    return matchesInsuranceFilter(category, insuranceTypeValue, insuranceType);
  });
}

/**
 * إضافة "تأمين السيارات" تلقائياً إذا كان الوكيل لديه أي نوع من أنواع تأمين السيارات
 */
export function enhanceAuthorizedDocuments(authorizedDocs: string[]): string[] {
  const carInsuranceTypes = [
    INSURANCE_TYPES.CAR_MANDATORY,
    'تأمين سيارات إجباري',
    INSURANCE_TYPES.CAR_CUSTOMS,
    INSURANCE_TYPES.CAR_FOREIGN,
    INSURANCE_TYPES.CAR_THIRD_PARTY,
    INSURANCE_TYPES.CAR_INTERNATIONAL,
    'تأمين سيارات دولي',
  ];

  const hasCarInsurance = authorizedDocs.some(doc => 
    carInsuranceTypes.includes(doc) || isCarInsurance(doc)
  );

  const enhanced = [...authorizedDocs];
  if (hasCarInsurance && !enhanced.includes('تأمين السيارات')) {
    enhanced.unshift('تأمين السيارات');
  }

  return enhanced;
}

