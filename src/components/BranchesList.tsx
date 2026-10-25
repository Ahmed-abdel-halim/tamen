import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { type Branch, setActiveBranch } from '../utils/branchContext';
import { showToast } from './Toast';

export const BranchesList: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingBranchDetails, setViewingBranchDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: 'طرابلس',
    address: '',
    phone: '',
    email: '',
    manager_name: '',
    manager_phone: '',
    is_main_branch: false,
    status: 'نشط',
    commercial_registration: '',
    tax_number: '',
    notes: '',
    create_admin_account: true,
    admin_username: '',
    admin_password: '',
    admin_email: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Available cities for filter and select
  const cities = ['طرابلس', 'بنغازي', 'مصراتة', 'الزاوية', 'البيضاء', 'طبرق', 'سبها', 'سرت', 'زليتن', 'الخمس', 'غريان', 'درنة'];

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches?per_page=100`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.data || data);
      } else {
        showToast('تعذر تحميل قائمة الفروع', 'error');
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      city: 'طرابلس',
      address: '',
      phone: '',
      email: '',
      manager_name: '',
      manager_phone: '',
      is_main_branch: false,
      status: 'نشط',
      commercial_registration: '',
      tax_number: '',
      notes: '',
      create_admin_account: true,
      admin_username: '',
      admin_password: '',
      admin_email: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      city: branch.city || 'طرابلس',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      manager_name: branch.manager_name || '',
      manager_phone: branch.manager_phone || '',
      is_main_branch: Boolean(branch.is_main_branch),
      status: branch.status || 'نشط',
      commercial_registration: branch.commercial_registration || '',
      tax_number: branch.tax_number || '',
      notes: branch.notes || '',
      create_admin_account: false,
      admin_username: branch.manager_user?.username || '',
      admin_password: '',
      admin_email: branch.manager_user?.email || '',
    });
    setShowModal(true);
  };

  const handleViewDetails = async (branchId: number) => {
    try {
      setLoadingDetails(true);
      setShowDetailsModal(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches/${branchId}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setViewingBranchDetails(data);
      } else {
        showToast('تعذر تحميل تفاصيل الفرع', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('خطأ أثناء جلب التفاصيل', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('يرجى إدخال اسم الفرع', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingBranch
        ? `${API_BASE_URL}/branches/${editingBranch.id}`
        : `${API_BASE_URL}/branches`;
      const method = editingBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      const resData = await res.json();
      if (res.ok) {
        showToast(editingBranch ? 'تم تحديث بيانات الفرع بنجاح' : 'تم إضافة الفرع بنجاح', 'success');
        setShowModal(false);
        fetchBranches();
      } else {
        showToast(resData.message || 'حدث خطأ أثناء حفظ الفرع', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    const newStatus = branch.status === 'نشط' ? 'موقف' : 'نشط';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches/${branch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: branch.name,
          status: newStatus
        })
      });
      if (res.ok) {
        showToast(`تم تغيير حالة الفرع إلى: ${newStatus}`, 'success');
        fetchBranches();
      }
    } catch (e) {
      showToast('تعذر تعديل الحالة', 'error');
    }
  };

  // Switch context to operate as this branch
  const handleSwitchToBranch = (branch: Branch) => {
    setActiveBranch(branch);
    showToast(`تم الانتقال للعمل كـ: ${branch.name}`, 'success');
    window.dispatchEvent(new CustomEvent('refreshData'));
    navigate('/dashboard');
  };

  // Confirm and cascade delete branch
  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    if (branchToDelete.is_main_branch || branchToDelete.id === 1) {
      showToast('لا يمكن حذف الفرع الرئيسي للشركة', 'error');
      setBranchToDelete(null);
      return;
    }

    try {
      setDeletingBranch(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches/${branchToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        showToast(data?.message || 'تم حذف الفرع وكافة السجلات المرتبطة به بنجاح', 'success');

        // If active branch in session was this deleted branch, reset back to HQ (all)
        const active = localStorage.getItem('active_branch');
        if (active) {
          try {
            const b = JSON.parse(active);
            if (b?.id === branchToDelete.id) {
              setActiveBranch(null);
              window.dispatchEvent(new CustomEvent('refreshData'));
            }
          } catch {}
        }

        setBranchToDelete(null);
        fetchBranches();
      } else {
        showToast(data?.message || 'فشل حذف الفرع', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم أثناء الحذف', 'error');
    } finally {
      setDeletingBranch(false);
    }
  };

  // Filtered branches
  const filteredBranches = branches.filter((b) => {
    const matchSearch =
      (b.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.manager_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.city || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchCity = selectedCity === 'all' || b.city === selectedCity;
    const matchStatus = selectedStatus === 'all' || b.status === selectedStatus;

    return matchSearch && matchCity && matchStatus;
  });

  // Calculate top metrics
  const totalBranchesCount = branches.length;
  const activeBranchesCount = branches.filter((b) => b.status === 'نشط').length;
  const totalStaffCount = branches.reduce((acc, curr) => acc + (curr.users_count || 0), 0);
  const totalRevenueSum = branches.reduce((acc, curr) => acc + (Number(curr.total_revenue) || 0), 0);

  return (
    <div className="branches-page-container" style={{ padding: '24px', direction: 'rtl', minHeight: '100vh' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <i className="fa-solid fa-building" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-main, #1e293b)' }}>
                إدارة الفروع المستقلة
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                نظام إدارة وعزل الفروع المتكامل، كل فرع منظومة مستقلة خاصة به
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={fetchBranches}
            className="icon-button"
            title="تحديث البيانات"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--surface-color, #ffffff)',
              cursor: 'pointer'
            }}
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          >
            <i className="fa-solid fa-plus" />
            <span>إضافة فرع جديد</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'var(--surface-color, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fa-solid fa-building" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي الفروع</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              {totalBranchesCount}
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'var(--surface-color, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>الفروع النشطة</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
              {activeBranchesCount}
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'var(--surface-color, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fa-solid fa-users" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>موظفي الفروع</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              {totalStaffCount}
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'var(--surface-color, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fa-solid fa-coins" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي الإنتاج المالي</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>
              {totalRevenueSum.toLocaleString('ar-LY')} <span style={{ fontSize: '12px' }}>د.ل</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: 'var(--surface-color, #ffffff)',
        borderRadius: '14px',
        border: '1px solid var(--border-color, #e2e8f0)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1, minWidth: '300px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              placeholder="بحث باسم الفرع، الكود، اسم المدير، الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 40px 10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-light, #f8fafc)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* City Filter */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: 'var(--bg-light, #f8fafc)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">كافة المدن</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: 'var(--bg-light, #f8fafc)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">كافة الحالات</option>
            <option value="نشط">نشط</option>
            <option value="موقف">موقف</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b' }}>
          عدد النتائج: <strong>{filteredBranches.length}</strong> فرع
        </div>
      </div>

      {/* Branches Table / Cards */}
      {loading ? (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          backgroundColor: 'var(--surface-color, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #e2e8f0)',
          color: '#64748b'
        }}>
          <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#2563eb', marginBottom: '12px' }} />
          <div>جاري تحميل قائمة الفروع...</div>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          backgroundColor: 'var(--surface-color, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #e2e8f0)',
          color: '#64748b'
        }}>
          <i className="fa-solid fa-building-circle-xmark fa-3x" style={{ color: '#94a3b8', marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 6px', fontWeight: 700 }}>لا توجد فروع مطابقة للبحث</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>يمكنك إضافة فرع جديد باستخدام زر "إضافة فرع جديد" أعلاه.</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--surface-color, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--bg-light, #f8fafc)',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  color: '#475569',
                  fontWeight: 700
                }}>
                  <th style={{ padding: '14px 16px' }}>كود الفرع</th>
                  <th style={{ padding: '14px 16px' }}>اسم الفرع</th>
                  <th style={{ padding: '14px 16px' }}>المدينة / العنوان</th>
                  <th style={{ padding: '14px 16px' }}>المدير المسؤول</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>الموظفين</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>الوثائق</th>
                  <th style={{ padding: '14px 16px' }}>إجمالي الإنتاج</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((branch) => {
                  return (
                    <tr
                      key={branch.id}
                      style={{
                        borderBottom: '1px solid var(--border-color, #f1f5f9)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-light, #f8fafc)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Code */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#e2e8f0',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          {branch.code || `BR-${branch.id}`}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>
                            {branch.name}
                          </span>
                          {branch.is_main_branch ? (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#059669',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              ⭐ رئيسي
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* City & Address */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <i className="fa-solid fa-location-dot" style={{ color: '#ef4444', fontSize: '12px' }} />
                          <span>{branch.city || '—'}</span>
                        </div>
                        {branch.address && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {branch.address}
                          </div>
                        )}
                      </td>

                      {/* Manager & Admin */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {branch.manager_name || '—'}
                        </div>
                        {branch.manager_user ? (
                          <div style={{ marginTop: '4px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(37, 99, 235, 0.1)',
                              color: '#2563eb',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              <i className="fa-solid fa-user-shield" style={{ fontSize: '10px' }} />
                              أدمن: @{branch.manager_user.username}
                            </span>
                          </div>
                        ) : branch.manager_phone ? (
                          <div style={{ fontSize: '11px', color: '#64748b', direction: 'ltr', textAlign: 'right', marginTop: '2px' }}>
                            📞 {branch.manager_phone}
                          </div>
                        ) : null}
                      </td>

                      {/* Employees Count */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          color: '#4f46e5',
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          {branch.users_count || 0} موظف
                        </span>
                      </td>

                      {/* Documents Count */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(14, 165, 233, 0.1)',
                          color: '#0284c7',
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          {branch.insurance_documents_count || 0} وثيقة
                        </span>
                      </td>

                      {/* Total Revenue */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {(Number(branch.total_revenue) || 0).toLocaleString('ar-LY')} <span style={{ fontSize: '11px' }}>د.ل</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(branch)}
                          style={{
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '11px',
                            backgroundColor: branch.status === 'نشط' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: branch.status === 'نشط' ? '#059669' : '#dc2626',
                            transition: 'opacity 0.2s'
                          }}
                          title="اضغط للتغيير"
                        >
                          <i className={`fa-solid ${branch.status === 'نشط' ? 'fa-check' : 'fa-ban'}`} style={{ marginLeft: '4px' }} />
                          {branch.status}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          {/* Operate as Branch Button */}
                          <button
                            type="button"
                            onClick={() => handleSwitchToBranch(branch)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                            }}
                            title="الانتقال للمنظومة وتصفح كافة البيانات كـ هذا الفرع"
                          >
                            <i className="fa-solid fa-arrow-right-to-bracket" />
                            <span>دخول كفرع</span>
                          </button>

                          {/* Toggle Active / Deactivate Branch Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(branch)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: branch.status === 'نشط' ? '1px solid #fcd34d' : '1px solid #86efac',
                              backgroundColor: branch.status === 'نشط' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                              color: branch.status === 'نشط' ? '#d97706' : '#16a34a',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600
                            }}
                            title={branch.status === 'نشط' ? 'تعطيل / إيقاف هذا الفرع' : 'إعادة تنشيط هذا الفرع'}
                          >
                            <i className={`fa-solid ${branch.status === 'نشط' ? 'fa-ban' : 'fa-circle-check'}`} />
                            <span>{branch.status === 'نشط' ? 'تعطيل' : 'تنشيط'}</span>
                          </button>

                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => handleViewDetails(branch.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color, #cbd5e1)',
                              backgroundColor: 'var(--surface-color, #ffffff)',
                              color: '#475569',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="عرض التفاصيل والإحصائيات"
                          >
                            <i className="fa-solid fa-eye" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(branch)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color, #cbd5e1)',
                              backgroundColor: 'var(--surface-color, #ffffff)',
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="تعديل بيانات الفرع"
                          >
                            <i className="fa-solid fa-pen-to-square" />
                          </button>

                          {/* Delete Branch & Cascading Data */}
                          <button
                            type="button"
                            onClick={() => setBranchToDelete(branch)}
                            disabled={Boolean(branch.is_main_branch || branch.id === 1)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #fecaca',
                              backgroundColor: (branch.is_main_branch || branch.id === 1) ? '#f1f5f9' : 'rgba(239, 68, 68, 0.08)',
                              color: (branch.is_main_branch || branch.id === 1) ? '#94a3b8' : '#ef4444',
                              cursor: (branch.is_main_branch || branch.id === 1) ? 'not-allowed' : 'pointer',
                              fontSize: '12px'
                            }}
                            title={(branch.is_main_branch || branch.id === 1) ? 'الفرع الرئيسي لا يمكن حذفه' : 'حذف الفرع نهائياً مع كافة متعلقاته وسجلاته'}
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-color, #ffffff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color, #e2e8f0)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  <i className={editingBranch ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-plus'} />
                </div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                  {editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد للمنظومة'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Branch Name */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    اسم الفرع <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فرع طرابلس الرئيسي أو فرع بنغازي"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Branch Code */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    كود الفرع (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: BR-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* City */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    المدينة
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: 'var(--surface-color, #ffffff)'
                    }}
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Detailed Address */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    العنوان بالتفصيل
                  </label>
                  <input
                    type="text"
                    placeholder="الشارع، المنطقة، أقرب نقطة دالة..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Manager Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    اسم مدير الفرع
                  </label>
                  <input
                    type="text"
                    placeholder="الاسم الرباعي للمدير"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Manager Phone */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    هاتف مدير الفرع
                  </label>
                  <input
                    type="text"
                    placeholder="091xxxxxxx"
                    value={formData.manager_phone}
                    onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Branch Phone */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    هاتف الفرع / الاستقبال
                  </label>
                  <input
                    type="text"
                    placeholder="هاتف الاستقبال"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Branch Email */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    البريد الإلكتروني للفرع
                  </label>
                  <input
                    type="email"
                    placeholder="branch@almadar.ly"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Commercial Reg & Tax */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    رقم السجل التجاري (إن وجد)
                  </label>
                  <input
                    type="text"
                    placeholder="رقم السجل التجاري"
                    value={formData.commercial_registration}
                    onChange={(e) => setFormData({ ...formData, commercial_registration: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    الرقم الضريبي (إن وجد)
                  </label>
                  <input
                    type="text"
                    placeholder="الرقم الضريبي"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Status & Main Branch */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    حالة الفرع
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: 'var(--surface-color, #ffffff)'
                    }}
                  >
                    <option value="نشط">نشط</option>
                    <option value="موقف">موقف</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_main_branch}
                      onChange={(e) => setFormData({ ...formData, is_main_branch: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                    />
                    <span>تعيين كفرع رئيسي (المركز الرئيسي)</span>
                  </label>
                </div>

                {/* Branch Admin Account Section */}
                <div style={{
                  gridColumn: 'span 2',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(37, 99, 235, 0.04)',
                  border: '1.5px solid rgba(37, 99, 235, 0.2)',
                  marginTop: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.create_admin_account ? '14px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}>
                        <i className="fa-solid fa-user-shield" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                          حساب مدير / أدمن الفرع (Branch Admin)
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          يتيح له إدارة وتعيين موظفي هذا الفرع فقط بشكل مستقل
                        </div>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#2563eb' }}>
                      <input
                        type="checkbox"
                        checked={formData.create_admin_account}
                        onChange={(e) => setFormData({ ...formData, create_admin_account: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                      />
                      <span>{editingBranch ? 'إنشاء / تغيير حساب الأدمن' : 'إنشاء حساب أدمن للفرع'}</span>
                    </label>
                  </div>

                  {formData.create_admin_account && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', borderTop: '1px solid rgba(37, 99, 235, 0.1)', paddingTop: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '12px', color: '#334155' }}>
                          اسم المستخدم للدخول <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required={formData.create_admin_account}
                          placeholder="مثال: admin_tripoli"
                          value={formData.admin_username}
                          onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            fontSize: '13px',
                            outline: 'none',
                            backgroundColor: '#ffffff'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '12px', color: '#334155' }}>
                          كلمة المرور <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="password"
                          required={formData.create_admin_account}
                          placeholder="6 أحرف أو أرقام على الأقل"
                          value={formData.admin_password}
                          onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            fontSize: '13px',
                            outline: 'none',
                            backgroundColor: '#ffffff'
                          }}
                        />
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '12px', color: '#334155' }}>
                          البريد الإلكتروني للأدمن (اختياري)
                        </label>
                        <input
                          type="email"
                          placeholder="admin@almadar.ly"
                          value={formData.admin_email}
                          onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            fontSize: '13px',
                            outline: 'none',
                            backgroundColor: '#ffffff'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                    ملاحظات إضافية
                  </label>
                  <textarea
                    rows={3}
                    placeholder="أي تفاصيل أو ملاحظات خاصة بالفرع..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderTop: '1px solid var(--border-color, #e2e8f0)',
                paddingTop: '16px'
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  {submitting ? 'جاري الحفظ...' : (editingBranch ? 'تحديث الفرع' : 'حفظ الفرع')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-color, #ffffff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            {loadingDetails || !viewingBranchDetails ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#2563eb', marginBottom: '12px' }} />
                <div>جاري جلب تفاصيل الفرع...</div>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      <i className="fa-solid fa-building" />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                        {viewingBranchDetails.branch.name}
                      </h2>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        كود: {viewingBranchDetails.branch.code} | المدينة: {viewingBranchDetails.branch.city}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleSwitchToBranch(viewingBranchDetails.branch);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-arrow-right-to-bracket" style={{ marginLeft: '6px' }} />
                      دخول وتصفح كفرع
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDetailsModal(false)}
                      style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px' }}>
                  {/* Statistics Mini Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-light, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>إجمالي الوثائق</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                        {viewingBranchDetails.statistics.total_documents}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-light, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>الوثائق السارية</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                        {viewingBranchDetails.statistics.active_documents}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-light, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>الموظفين</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#6366f1' }}>
                        {viewingBranchDetails.statistics.employees_count}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-light, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>إجمالي الإيراد</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>
                        {viewingBranchDetails.statistics.total_revenue.toLocaleString('ar-LY')}
                      </div>
                    </div>
                  </div>

                  {/* Branch Staff / Users */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                      موظفي الفرع ({viewingBranchDetails.branch.users?.length || 0})
                    </h3>
                    {!viewingBranchDetails.branch.users || viewingBranchDetails.branch.users.length === 0 ? (
                      <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-light, #f8fafc)', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>
                        لم يتم تعيين موظفين لهذا الفرع بعد. يمكنك ربط الموظفين بهذا الفرع من صفحة "إدارة المستخدمين".
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {viewingBranchDetails.branch.users.map((u: any) => (
                          <div
                            key={u.id}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color, #e2e8f0)',
                              backgroundColor: 'var(--bg-light, #f8fafc)',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{u.name}</div>
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                              {u.job_title || 'موظف فرع'} | @{u.username}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Documents */}
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                      آخر الوثائق الصادرة من هذا الفرع
                    </h3>
                    {!viewingBranchDetails.recent_documents || viewingBranchDetails.recent_documents.length === 0 ? (
                      <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-light, #f8fafc)', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>
                        لا توجد وثائق مصدرة بعد من هذا الفرع.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-light, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: '#64748b' }}>
                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>رقم الوثيقة</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>المؤمّن له</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>المصدر</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>المبلغ</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>تاريخ الإصدار</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingBranchDetails.recent_documents.map((doc: any) => (
                              <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{doc.insurance_number}</td>
                                <td style={{ padding: '8px 10px' }}>{doc.insured_name}</td>
                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{doc.user?.name || '—'}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{doc.total} د.ل</td>
                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{doc.issue_date?.slice(0, 10)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {branchToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
            borderTop: '5px solid #ef4444'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px'
            }}>
              <i className="fa-solid fa-triangle-exclamation" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              تأكيد حذف الفرع نهائياً
            </h3>

            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#991b1b',
              fontWeight: 700
            }}>
              {branchToDelete.name} ({branchToDelete.code || `ID: ${branchToDelete.id}`})
            </div>

            <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.7, marginBottom: '24px', textAlign: 'right' }}>
              ⚠️ <strong style={{ color: '#dc2626' }}>تحذير خطير:</strong> سيؤدي هذا الإجراء إلى <strong>حذف الفرع نهائياً من قاعدة البيانات</strong> وحذف ومسح كافة السجلات والمتعلقات التابعة له بالكامل (وثائق التأمين بأنواعها، حركات الخزينة والبنك، المصروفات، العهد والمخازن، المطالبات، والوكلاء والموظفين التابعين له).
              <br />
              <span style={{ color: '#ef4444', fontWeight: 700, display: 'block', marginTop: '6px' }}>
                هذه العملية جذرية وفورية ولا يمكن التراجع عنها.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                disabled={deletingBranch}
                onClick={() => setBranchToDelete(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                disabled={deletingBranch}
                onClick={confirmDeleteBranch}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: deletingBranch ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                }}
              >
                {deletingBranch ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    <span>جاري الحذف الجذري...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can" />
                    <span>نعم، احذف الفرع ومتعلقاته</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesList;
