import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL, BACKEND_URL } from '../config/api';
import { showToast } from './Toast';
import '../styles/CreateInsurance.css';

interface ExternalEntity {
    id: number;
    name: string;
    entity_number: string;
    address: string;
    phone: string;
    email: string;
    default_messenger_name: string;
    default_messenger_phone: string;
    logo_url: string;
    created_at: string;
}

const ExternalEntitiesManagement: React.FC = () => {
    const [entities, setEntities] = useState<ExternalEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEntityId, setCurrentEntityId] = useState<number | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAddress, setFilterAddress] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setCurrentUser(JSON.parse(userStr));
            } catch (e) {
                console.error('Error parsing user from localStorage', e);
            }
        }
    }, []);

    const canDelete = useMemo(() => {
        return currentUser?.is_admin || currentUser?.authorized_documents?.includes('دليل الجهات الخارجية');
    }, [currentUser]);

    const [formData, setFormData] = useState({
        name: '',
        entity_number: '',
        address: '',
        phone: '',
        email: '',
        default_messenger_name: '',
        default_messenger_phone: '',
        logo: null as File | null
    });

    useEffect(() => {
        fetchEntities();
    }, []);

    const fetchEntities = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/external-entities`);
            const data = await response.json();
            setEntities(data);
        } catch (error) {
            console.error('Error fetching entities:', error);
            showToast('خطأ في جلب بيانات الجهات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, files } = e.target;
        if (type === 'file' && files) {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isEditing 
            ? `${API_BASE_URL}/external-entities/${currentEntityId}`
            : `${API_BASE_URL}/external-entities`;
        
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (value !== null) data.append(key, value);
        });

        if (isEditing) {
            data.append('_method', 'PUT');
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: data
            });

            if (response.ok) {
                showToast(isEditing ? 'تم تحديث البيانات بنجاح' : 'تم إضافة الجهة بنجاح', 'success');
                setShowModal(false);
                resetForm();
                fetchEntities();
            } else {
                showToast('حدث خطأ أثناء حفظ البيانات', 'error');
            }
        } catch (error) {
            showToast('خطأ في الاتصال بالخادم', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            entity_number: '',
            address: '',
            phone: '',
            email: '',
            default_messenger_name: '',
            default_messenger_phone: '',
            logo: null
        });
        setIsEditing(false);
        setCurrentEntityId(null);
        // Reset file input if needed
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleEdit = (entity: ExternalEntity) => {
        setFormData({
            name: entity.name,
            entity_number: entity.entity_number || '',
            address: entity.address || '',
            phone: entity.phone || '',
            email: entity.email || '',
            default_messenger_name: entity.default_messenger_name || '',
            default_messenger_phone: entity.default_messenger_phone || '',
            logo: null
        });
        setIsEditing(true);
        setCurrentEntityId(entity.id);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه الجهة؟')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/external-entities/${id}`, { 
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (response.ok) { showToast('تم الحذف بنجاح', 'success'); fetchEntities(); }
        } catch (error) { showToast('خطأ في الاتصال', 'error'); }
    };

    const filteredEntities = entities.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.entity_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAddress = filterAddress ? e.address?.toLowerCase().includes(filterAddress.toLowerCase()) : true;
        
        return matchesSearch && matchesAddress;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterAddress('');
    };

    const stats = useMemo(() => ({
        total: entities.length,
        withEmail: entities.filter(e => e.email).length,
        today: entities.filter(e => e.created_at?.split('T')[0] === new Date().toISOString().split('T')[0]).length
    }), [entities]);

    return (
        <section className="users-management">
            <div className="users-breadcrumb" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', marginBottom: '30px', color: '#fff'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <i className="fa-solid fa-address-book" style={{ color: '#38bdf8' }}></i>
                        دليل الجهات الخارجية
                    </h2>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>إدارة بيانات الوزارات والشركات والمؤسسات المتعامل معها</p>
                </div>
                <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }} style={{ borderRadius: '10px', padding: '12px 25px', fontSize: '15px', fontWeight: 'bold', background: 'var(--accent-cyan)', border: 'none', boxShadow: '0 4px 12px var(--accent-shadow)' }}>
                    <i className="fa-solid fa-plus"></i> إضافة جهة جديدة
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>إجمالي الجهات المسجلة</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#2563eb' }}>{stats.total} <span style={{ fontSize: '14px' }}>جهة</span></div>
                </div>
                <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>جهات ببريد إلكتروني</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#10b981' }}>{stats.withEmail} <span style={{ fontSize: '14px' }}>جهة</span></div>
                </div>
                <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>أضيفت اليوم</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#f59e0b' }}>{stats.today} <span style={{ fontSize: '14px' }}>جهة</span></div>
                </div>
            </div>

            <div className="users-card">
                <div className="users-card-header">
                    <div className="header-right">
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>قائمة الجهات والمؤسسات</h3>
                    </div>
                </div>

                <div className="filters-row" style={{ 
                    padding: '15px 20px', 
                    background: 'transparent', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px',
                    margin: '0 0 20px 0',
                    display: 'grid', 
                    gridTemplateColumns: '2fr 2fr 0.5fr', 
                    gap: '15px', 
                    alignItems: 'end' 
                }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', marginBottom: '5px' }}>بحث نصي</label>
                        <div className="search-wrapper" style={{ width: '100%' }}>
                            <i className="fa-solid fa-magnifying-glass search-icon"></i>
                            <input 
                                type="text" 
                                placeholder="بحث باسم الجهة أو الرقم..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', marginBottom: '5px' }}>تصفية حسب العنوان</label>
                        <input 
                            type="text" 
                            placeholder="العنوان (طرابلس، بنغازي...)" 
                            value={filterAddress}
                            onChange={(e) => setFilterAddress(e.target.value)}
                            style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', width: '100%' }}
                        />
                    </div>
                    <button onClick={resetFilters} className="btn-cancel" style={{ padding: '10px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'var(--accent-cyan)', color: '#fff', border: 'none', fontWeight: 'bold' }}>
                        <i className="fa-solid fa-rotate-left"></i> تفريغ
                    </button>
                </div>

                <div className="users-table-wrapper">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>الشعار</th>
                                <th>اسم الجهة</th>
                                <th>رقم الجهة</th>
                                <th>الهاتف</th>
                                <th>البريد الإلكتروني</th>
                                <th>المندوب الافتراضي</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>جاري التحميل...</td></tr>
                            ) : filteredEntities.length > 0 ? (
                                filteredEntities.map(entity => (
                                    <tr key={entity.id}>
                                        <td>
                                            {entity.logo_url ? (
                                                <img 
                                                    src={`${BACKEND_URL}${entity.logo_url}`} 
                                                    alt={entity.name} 
                                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} 
                                                />
                                            ) : (
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-cyan-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                                                    <i className="fa-solid fa-building"></i>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{entity.name}</td>
                                        <td style={{ color: '#2563eb', fontWeight: 700 }}>{entity.entity_number || '-'}</td>
                                        <td>{entity.phone || '-'}</td>
                                        <td>{entity.email || '-'}</td>
                                        <td>{entity.default_messenger_name || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => handleEdit(entity)} style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer' }}><i className="fa-solid fa-pencil"></i></button>
                                                {canDelete && (
                                                    <button onClick={() => handleDelete(entity.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>لا توجد بيانات مسجلة</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '850px', width: '90%', borderRadius: '20px', maxHeight: 'none', overflow: 'visible' }}>
                        <div className="modal-header" style={{ padding: '10px 15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{isEditing ? 'تعديل بيانات الجهة' : 'إضافة جهة جديدة بالدليل'}</h3>
                            <button className="close-modal" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} className="user-form" style={{ padding: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="form-group">
                                    <label>اسم الجهة <span className="required">*</span></label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>رقم الجهة / الشركة</label>
                                    <input type="text" name="entity_number" value={formData.entity_number} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>العنوان</label>
                                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>هاتف التواصل</label>
                                    <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>البريد الإلكتروني</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>اسم المندوب الافتراضي</label>
                                    <input type="text" name="default_messenger_name" value={formData.default_messenger_name} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>رقم هاتف المندوب</label>
                                    <input type="text" name="default_messenger_phone" value={formData.default_messenger_phone} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>شعار الجهة / الشركة</label>
                                    <input type="file" name="logo" onChange={handleInputChange} accept="image/*" />
                                </div>
                            </div>
                            <div className="form-actions" style={{ marginTop: '10px' }}>
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} style={{ borderRadius: '10px' }}>إلغاء</button>
                                <button type="submit" className="btn-submit" style={{ background: 'var(--accent-cyan)', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '10px', fontWeight: 'bold', boxShadow: '0 4px 12px var(--accent-shadow)' }}>{isEditing ? 'تحديث' : 'حفظ'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ExternalEntitiesManagement;
