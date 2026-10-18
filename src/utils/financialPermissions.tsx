export interface CurrentUserPermissions {
  isAdmin: boolean;
  authorizedDocs: string[];
}

/**
 * جلب بيانات وصلاحيات المستخدم الحالي من localStorage
 */
export function getCurrentUserPermissions(): CurrentUserPermissions {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return { isAdmin: false, authorizedDocs: [] };
    const user = JSON.parse(userStr);
    const isAdmin = Boolean(user.is_admin);
    let authorizedDocs: string[] = [];
    if (Array.isArray(user.authorized_documents)) {
      authorizedDocs = user.authorized_documents;
    } else if (typeof user.authorized_documents === 'string') {
      try {
        authorizedDocs = JSON.parse(user.authorized_documents);
      } catch {
        authorizedDocs = [];
      }
    }
    return { isAdmin, authorizedDocs };
  } catch {
    return { isAdmin: false, authorizedDocs: [] };
  }
}

/**
 * التحقق مما إذا كان المستخدم يمتلك صلاحية التعديل والإضافة في قسم المحاسب المالي
 * 1. Admin -> نعم
 * 2. يمتلك 'المحاسب المالي' (أو 'المحاسب المالي (تعديل كامل)') -> نعم
 * 3. يمتلك صلاحية قسم محددة ولم يتم تعيينه كـ 'المحاسب المالي (عرض فقط)' -> نعم
 * 4. إذا كان يمتلك فقط 'المحاسب المالي (عرض فقط)' -> لا (عرض واطلاع فقط بدون تعديل)
 */
export function canEditFinancial(specificSectionPermission?: string): boolean {
  const { isAdmin, authorizedDocs } = getCurrentUserPermissions();
  if (isAdmin) return true;

  const hasFullAccountant = 
    authorizedDocs.includes('المحاسب المالي') || 
    authorizedDocs.includes('المحاسب المالي (تعديل كامل)') ||
    authorizedDocs.includes('المحاسب المالي - صلاحية كاملة (دخول وتعديل)');

  if (hasFullAccountant) return true;

  const hasReadOnlyAccountant = 
    authorizedDocs.includes('المحاسب المالي (عرض فقط)') ||
    authorizedDocs.includes('المحاسب المالي - عرض واطلاع فقط (يدخل بدون تعديل)');

  // إذا كان يمتلك صلاحية فرعية محددة ولم يكن مخصصاً كحساب عرض فقط للمالية
  if (specificSectionPermission && authorizedDocs.includes(specificSectionPermission)) {
    if (!hasReadOnlyAccountant) {
      return true;
    }
  }

  return false;
}

/**
 * هل المستخدم في وضع القراءة فقط لقسم المحاسب المالي؟
 */
export function isFinancialReadOnly(): boolean {
  return !canEditFinancial();
}

/**
 * شريط تنبيه أنيق يظهر عند الدخول بوضع القراءة فقط
 */
export function ReadOnlyNotice({ message }: { message?: string }) {
  if (!isFinancialReadOnly()) return null;

  return (
    <div 
      className="financial-readonly-banner no-print" 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRight: '4px solid #f59e0b',
        borderRadius: '10px',
        color: '#92400e',
        marginBottom: '18px',
        fontSize: '13.5px',
        fontWeight: '600',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}
    >
      <i className="fa-solid fa-eye" style={{ fontSize: '18px', color: '#f59e0b' }}></i>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontWeight: '700' }}>وضع العرض والاطلاع فقط (محاسب مالي بدون تعديل)</span>
        <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: '500' }}>
          {message || 'يمكنك استعراض كافة السجلات والتقارير والبحث والطباعة والتصدير، ولا تملك صلاحية لإضافة أو تعديل أو حذف البيانات.'}
        </span>
      </div>
    </div>
  );
}
