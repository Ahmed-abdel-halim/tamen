import { useEffect, useState } from "react";
import { showToast } from "./Toast";

type User = {
  id: number;
  username: string;
  name: string;
  email?: string;
  is_admin?: boolean;
  authorized_documents?: string[];
  user_type?: string;
  branch_agent_info?: {
    id: number;
    type: string;
    agency_name: string;
    agent_name: string;
  } | null;
  salary?: number;
};

const INSURANCE_TYPES = [
  'تأمين سيارات إجباري',
  'تأمين سيارات',
  'تأمين سيارة جمرك',
  'تأمين سيارات أجنبية',
  'تأمين طرف ثالث سيارات',
  'تأمين سيارات دولي',
  'تأمين المسافرين',
  'تأمين زائرين ليبيا',
  'تأمين الوافدين',
  'تأمين الهياكل البحرية',
  'تأمين المسؤولية المهنية (الطبية)',
  'تأمين الحوادث الشخصية',
];

const REPORT_PERMISSIONS = [
  'كشف حساب الوكيل',
  'إغلاق حساب شهري',
  'كشف إغلاق الحساب الشهري',
];

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | { mode: 'add' | 'edit', user?: User }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const perPage = 10;
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    is_admin: false,
    authorized_documents: [] as string[],
    salary: '' as string | number
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | User>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);



  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = `/api/users?page=${currentPage}&per_page=${perPage}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      
      // إذا كان الـ response يحتوي على pagination data
      if (data.data && Array.isArray(data.data)) {
        setUsers(data.data);
        setTotalPages(data.last_page || 1);
        setTotalUsers(data.total || 0);
      } else {
        // Fallback للـ response القديم (بدون pagination)
        setUsers(Array.isArray(data) ? data : []);
        setTotalPages(1);
        setTotalUsers(Array.isArray(data) ? data.length : 0);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showToast(`حدث خطأ أثناء جلب المستخدمين: ${error.message || 'تأكد من أن الخادم يعمل على http://localhost:8000'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showForm?.mode === 'edit' && showForm.user) {
      setFormData({
        username: showForm.user.username || '',
        name: showForm.user.name || '',
        email: showForm.user.email || '',
        password: '',
        is_admin: showForm.user.is_admin || false,
        authorized_documents: showForm.user.authorized_documents || [],
        salary: showForm.user.salary || ''
      });
    } else {
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        is_admin: false,
        authorized_documents: [],
        salary: ''
      });
    }
    setFormErrors({});
  }, [showForm]);

  // فلترة المستخدمين محلياً (client-side filtering)
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // إذا كان هناك بحث، نستخدم client-side pagination
  // وإلا نستخدم server-side pagination
  const useClientPagination = searchQuery.trim() !== '';
  const displayUsers = useClientPagination ? filteredUsers : users;
  const displayTotalUsers = useClientPagination ? filteredUsers.length : totalUsers;
  const displayTotalPages = useClientPagination 
    ? (filteredUsers.length > 0 ? Math.ceil(filteredUsers.length / perPage) : 1)
    : totalPages;
  
  const startIndex = useClientPagination ? (currentPage - 1) * perPage : 0;
  const endIndex = useClientPagination ? startIndex + perPage : displayUsers.length;
  const paginatedUsers = useClientPagination 
    ? filteredUsers.slice(startIndex, endIndex)
    : displayUsers;

  const handleDeleteClick = (user: User) => {
    setDeleteConfirmation(user);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteConfirmation.id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`خطأ ${res.status}`);
      }
      setDeleteConfirmation(null);
      showToast('تم حذف المستخدم بنجاح', 'success');
      // إعادة جلب البيانات بعد الحذف
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showToast(`حدث خطأ أثناء حذف المستخدم: ${error.message || 'تأكد من أن الخادم يعمل'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.username.trim()) {
      errors.username = 'اسم المستخدم مطلوب';
    }
    if (!formData.name.trim()) {
      errors.name = 'الاسم مطلوب';
    }
    if (showForm?.mode === 'add' && !formData.password) {
      errors.password = 'كلمة المرور مطلوبة';
    }
    if (formData.password && formData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }
    // التحقق من الصلاحيات فقط للمستخدمين غير المديرين
    // يجب اختيار نوع تأمين واحد على الأقل أو تقرير واحد على الأقل
    if (!formData.is_admin) {
      const hasInsurance = formData.authorized_documents.some(doc => INSURANCE_TYPES.includes(doc));
      const hasReport = formData.authorized_documents.some(doc => REPORT_PERMISSIONS.includes(doc));
      
      if (!hasInsurance && !hasReport) {
        errors.authorized_documents = 'يجب اختيار نوع تأمين واحد على الأقل أو تقرير واحد على الأقل';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = showForm?.mode === 'edit' 
        ? `/api/users/${showForm.user?.id}` 
        : '/api/users';
      
      const method = showForm?.mode === 'edit' ? 'PUT' : 'POST';
      
      const body: any = {
        username: formData.username,
        name: formData.name,
        email: formData.email || null,
        is_admin: formData.is_admin,
        salary: formData.salary || null,
      };

      // الصلاحيات فقط للمستخدمين غير المديرين
      if (!formData.is_admin) {
        body.authorized_documents = formData.authorized_documents;
      }

      if (showForm?.mode === 'add' || formData.password) {
        body.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errorMessage = 'حدث خطأ';
        try {
          const error = await res.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = `خطأ ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const updatedData = await res.json();
      await fetchUsers();
      
      // إذا كان المستخدم المحدث هو نفس المستخدم المسجل دخول، حدث localStorage
      const currentUser = localStorage.getItem('user');
      if (currentUser && showForm?.mode === 'edit' && showForm.user?.id === updatedData.id) {
        try {
          const currentUserObj = JSON.parse(currentUser);
          if (currentUserObj.id === updatedData.id) {
            localStorage.setItem('user', JSON.stringify(updatedData));
            // أرسل حدث لتحديث Topbar
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedData }));
          }
        } catch {}
      }
      
      setShowForm(null);
      setFormData({ username: '', name: '', email: '', password: '', is_admin: false, authorized_documents: [], salary: '' });
      showToast(showForm?.mode === 'add' ? 'تم إضافة المستخدم بنجاح' : 'تم تحديث المستخدم بنجاح', 'success');
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء حفظ المستخدم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>إدارة المستخدمين / قائمة المستخدمين</span>
      </div>
      
      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input 
              type="text" 
              placeholder="بحث باسم المستخدم..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="users-search-input"
            />
            <button className="users-search-btn" type="button">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
          <button 
            className="primary add-user-btn" 
            onClick={() => setShowForm({ mode: 'add' })}
          >
            <i className="fa-solid fa-plus"></i>
            إضافة مستخدم
          </button>
        </div>

        {loading ? (
          <p className="empty-state-text">جار التحميل...</p>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>إسم المستخدم</th>
                    <th>البريد الإلكتروني</th>
                    <th>حالة المستخدم</th>
                    <th>نوع المستخدم</th>
                    <th>المرتب</th>
                    <th>الصلاحيات</th>
                    <th>معلومات إضافية</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-state">
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, index) => (
                      <tr key={u.id}>
                        <td>{useClientPagination ? startIndex + index + 1 : (currentPage - 1) * perPage + index + 1}</td>
                        <td>{u.name}</td>
                        <td>{u.email || '-'}</td>
                        <td>
                          <span className="status-badge active">مفعل</span>
                        </td>
                        <td>
                          {u.user_type === 'مدير' && (
                            <span className="type-badge admin">مدير</span>
                          )}
                          {u.user_type === 'وكيل' && (
                            <span className="type-badge agent">
                              <i className="fa-solid fa-user-tie"></i> وكيل
                            </span>
                          )}
                          {u.user_type === 'فرع من شركة' && (
                            <span className="type-badge branch">
                              <i className="fa-solid fa-building"></i> فرع
                            </span>
                          )}
                          {u.user_type === 'مستخدم عادي' && (
                            <span className="type-badge user">
                              <i className="fa-solid fa-user"></i> مستخدم
                            </span>
                          )}
                        </td>
                        <td>
                          {u.salary ? (
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{Number(u.salary).toLocaleString()} د.ل</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td>
                          {u.is_admin ? (
                            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>جميع الصلاحيات</span>
                          ) : u.authorized_documents && u.authorized_documents.length > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {u.authorized_documents.slice(0, 2).map((doc, idx) => (
                                <div key={idx} style={{ marginBottom: '0.25rem' }}>{doc}</div>
                              ))}
                              {u.authorized_documents.length > 2 && (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                  +{u.authorized_documents.length - 2} أكثر
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>لا توجد صلاحيات</span>
                          )}
                        </td>
                        <td>
                          {u.branch_agent_info ? (
                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                              <div><strong>{u.branch_agent_info.agency_name}</strong></div>
                              <div>{u.branch_agent_info.agent_name}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn edit" 
                              onClick={() => setShowForm({ mode: 'edit', user: u })}
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDeleteClick(u)}
                              aria-label="حذف"
                              title="حذف"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="users-mobile-cards">
              {paginatedUsers.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedUsers.map((u, index) => (
                  <div key={u.id} className="user-mobile-card">
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{u.name}</h4>
                        <span className="user-mobile-number">#{useClientPagination ? startIndex + index + 1 : (currentPage - 1) * perPage + index + 1}</span>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">اسم المستخدم:</span>
                        <span className="user-mobile-value">{u.username}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">البريد الإلكتروني:</span>
                        <span className="user-mobile-value">{u.email || '-'}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">حالة المستخدم:</span>
                        <span className="user-mobile-value">
                          <span className="status-badge active">مفعل</span>
                        </span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">نوع المستخدم:</span>
                        <span className="user-mobile-value">
                          {u.user_type === 'مدير' && (
                            <span className="type-badge admin">مدير</span>
                          )}
                          {u.user_type === 'وكيل' && (
                            <span className="type-badge agent">
                              <i className="fa-solid fa-user-tie"></i> وكيل
                            </span>
                          )}
                          {u.user_type === 'فرع من شركة' && (
                            <span className="type-badge branch">
                              <i className="fa-solid fa-building"></i> فرع
                            </span>
                          )}
                          {u.user_type === 'مستخدم عادي' && (
                            <span className="type-badge user">
                              <i className="fa-solid fa-user"></i> مستخدم
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">الصلاحيات:</span>
                        <span className="user-mobile-value">
                          {u.is_admin ? (
                            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>جميع الصلاحيات</span>
                          ) : u.authorized_documents && u.authorized_documents.length > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {u.authorized_documents.slice(0, 3).map((doc, idx) => (
                                <div key={idx} style={{ marginBottom: '0.25rem' }}>{doc}</div>
                              ))}
                              {u.authorized_documents.length > 3 && (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                  +{u.authorized_documents.length - 3} أكثر
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>لا توجد صلاحيات</span>
                          )}
                        </span>
                      </div>
                      {u.branch_agent_info && (
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">معلومات الوكيل/الفرع:</span>
                          <span className="user-mobile-value">
                            {u.branch_agent_info.agency_name} - {u.branch_agent_info.agent_name}
                          </span>
                        </div>
                      )}
                      <div className="user-mobile-actions">
                        <button 
                          className="action-btn edit" 
                          onClick={() => setShowForm({ mode: 'edit', user: u })}
                          aria-label="تعديل"
                          title="تعديل"
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDeleteClick(u)}
                          aria-label="حذف"
                          title="حذف"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {displayTotalPages > 1 && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {useClientPagination ? startIndex + 1 : (currentPage - 1) * perPage + 1}
                  {' إلى '}
                  {useClientPagination ? Math.min(endIndex, displayTotalUsers) : Math.min(currentPage * perPage, displayTotalUsers)}
                  {' من '}
                  {displayTotalUsers}
                  {' مستخدم'}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn pagination-prev"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                    <span className="pagination-btn-text">السابق</span>
                  </button>
                  {(() => {
                    const items: (number | 'dots')[] = [];
                    if (displayTotalPages <= 3) {
                      for (let p = 1; p <= displayTotalPages; p++) {
                        items.push(p);
                      }
                    } else {
                      items.push(1);
                      let start = Math.max(2, currentPage - 1);
                      let end = Math.min(displayTotalPages - 1, currentPage + 1);
                      if (start > 2) items.push('dots');
                      for (let p = start; p <= end; p++) items.push(p);
                      if (end < displayTotalPages - 1) items.push('dots');
                      items.push(displayTotalPages);
                    }
                    return items.map((item, idx) =>
                      item === 'dots' ? (
                        <span key={`dots-${idx}`} className="pagination-dots">...</span>
                      ) : (
                        <button
                          key={item}
                          className={`pagination-btn pagination-number ${currentPage === item ? 'active' : ''}`}
                          onClick={() => setCurrentPage(item as number)}
                        >
                          {item}
                        </button>
                      )
                    );
                  })()}
                  <button
                    className="pagination-btn pagination-next"
                    onClick={() => setCurrentPage((prev) => Math.min(displayTotalPages, prev + 1))}
                    disabled={currentPage === displayTotalPages}
                  >
                    <span className="pagination-btn-text">التالي</span>
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget) setShowForm(null);
        }}>
          <div className="modal-content user-form-modal">
            <div className="modal-header">
              <h3>{showForm.mode === 'add' ? 'إضافة مستخدم جديد' : 'تعديل مستخدم'}</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowForm(null)}
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="username">اسم المستخدم <span className="required">*</span></label>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={formErrors.username ? 'error' : ''}
                  placeholder="أدخل اسم المستخدم"
                />
                {formErrors.username && <span className="error-message">{formErrors.username}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="name">الاسم الكامل <span className="required">*</span></label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={formErrors.name ? 'error' : ''}
                  placeholder="أدخل الاسم الكامل"
                />
                {formErrors.name && <span className="error-message">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="salary">المرتب (اختياري)</label>
                <input
                  type="number"
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  className={formErrors.salary ? 'error' : ''}
                  placeholder="أدخل قيمة المرتب"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">البريد الإلكتروني</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={formErrors.email ? 'error' : ''}
                  placeholder="أدخل البريد الإلكتروني (اختياري)"
                />
                {formErrors.email && <span className="error-message">{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  كلمة المرور {showForm.mode === 'add' && <span className="required">*</span>}
                  {showForm.mode === 'edit' && <span className="optional">(اتركه فارغاً إذا لم ترد تغييره)</span>}
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={formErrors.password ? 'error' : ''}
                  placeholder="أدخل كلمة المرور"
                />
                {formErrors.password && <span className="error-message">{formErrors.password}</span>}
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({...formData, is_admin: e.target.checked, authorized_documents: e.target.checked ? [] : formData.authorized_documents})}
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  <span>مدير النظام (Admin)</span>
                </label>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
                  المدير لديه صلاحيات كاملة على جميع أجزاء النظام
                </p>
              </div>

              {!formData.is_admin && (
                <>
                  <div className="form-group">
                    <label style={{ marginBottom: '1rem', display: 'block' }}>
                      أنواع التأمين المصرح بها <span className="required">*</span>
                    </label>
                    <div className="permissions-grid" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '0.75rem',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      direction: 'rtl'
                    }}>
                      {INSURANCE_TYPES.map((type) => (
                        <label 
                          key={type} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '6px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.authorized_documents.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  authorized_documents: [...formData.authorized_documents, type]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  authorized_documents: formData.authorized_documents.filter(doc => doc !== type)
                                });
                              }
                            }}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.875rem' }}>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ marginBottom: '1rem', display: 'block' }}>
                      التقارير المصرح بها
                    </label>
                    <div className="permissions-grid" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '0.75rem',
                      padding: '1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      direction: 'rtl'
                    }}>
                      {REPORT_PERMISSIONS.map((permission) => (
                        <label 
                          key={permission} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <input
                            type="checkbox"
                            checked={formData.authorized_documents.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  authorized_documents: [...formData.authorized_documents, permission]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  authorized_documents: formData.authorized_documents.filter(doc => doc !== permission)
                                });
                              }
                            }}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.875rem' }}>{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.authorized_documents.filter(doc => INSURANCE_TYPES.includes(doc)).length === 0 && 
                   formData.authorized_documents.filter(doc => REPORT_PERMISSIONS.includes(doc)).length === 0 && (
                    <span className="error-message" style={{ display: 'block', marginTop: '0.5rem' }}>
                      يجب اختيار نوع تأمين واحد على الأقل أو تقرير واحد على الأقل
                    </span>
                  )}
                </>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowForm(null)}
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={submitting}
                >
                  {submitting ? 'جاري الحفظ...' : (showForm.mode === 'add' ? 'إضافة' : 'حفظ التعديلات')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget && !deleting) setDeleteConfirmation(null);
        }}>
          <div className="modal-content delete-confirm-modal">
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف المستخدم <strong>{deleteConfirmation.name}</strong>؟
              <br />
              <span className="delete-warning">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="delete-confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setDeleteConfirmation(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button 
                className="btn-delete-confirm" 
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}


    </section>
  )
}
