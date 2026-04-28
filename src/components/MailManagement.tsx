import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config/api';
import { useParams } from 'react-router-dom';
import { showToast } from './Toast';
import '../styles/CreateInsurance.css'; // استخدام تنسيقات النظام الأساسية

interface ExternalEntity {
    id: number;
    name: string;
    default_messenger_name: string;
    default_messenger_phone: string;
    email?: string;
}

interface User {
    id: number;
    name: string;
}

interface MailDocument {
    id: number;
    type: 'incoming' | 'outgoing';
    referential_number: string;
    serial_number: string;
    entity_id: number;
    entity?: ExternalEntity;
    sender_name_manual: string;
    recipient_name_manual: string;
    subject: string;
    description: string;
    date: string;
    registered_at: string;
    messenger_name: string;
    messenger_phone: string;
    employee_id: number;
    employee?: User;
    attachment_url: string;
    attachment_urls: string[];
    attachments?: string[];
    pages_count: number;
    created_at: string;
}

const MailManagement: React.FC = () => {
    const { type } = useParams<{ type: string }>();
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>((type as 'incoming' | 'outgoing') || 'incoming');
    const [documents, setDocuments] = useState<MailDocument[]>([]);
    const [entities, setEntities] = useState<ExternalEntity[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentDocId, setCurrentDocId] = useState<number | null>(null);

    // فلاتر البحث
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

    const [formData, setFormData] = useState({
        type: 'incoming',
        serial_number: '',
        entity_id: '',
        sender_name_manual: '',
        recipient_name_manual: '',
        subject: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        registered_at: new Date().toISOString().split('T')[0],
        messenger_name: '',
        messenger_phone: '',
        employee_id: '',
        pages_count: '1',
        send_email: false,
        referential_number: ''
    });

    const [attachments, setAttachments] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);

    useEffect(() => {
        if (type && (type === 'incoming' || type === 'outgoing')) {
            setActiveTab(type);
        }
    }, [type]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [activeTab]);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const [entitiesRes, usersRes] = await Promise.all([
                fetch(`${API_BASE_URL}/external-entities`, { headers }),
                fetch(`${API_BASE_URL}/users?active=1&per_page=1000`, { headers })
            ]);

            if (entitiesRes.ok) {
                setEntities(await entitiesRes.json());
            }

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(Array.isArray(usersData) ? usersData : (usersData.data || []));
            } else {
                console.error('Failed to fetch users:', await usersRes.text());
                if (usersRes.status === 401) {
                    showToast('غير مصرح لك بجلب قائمة الموظفين، يرجى تسجيل الدخول مجدداً', 'error');
                }
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/mail-documents?type=${activeTab}`, {
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const data = await response.json();
            setDocuments(data);
        } catch (error) {
            console.error('Error fetching documents:', error);
            showToast('خطأ في جلب سجلات البريد', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEntityChange = (entityId: string) => {
        setFormData(prev => ({ ...prev, entity_id: entityId }));
        const selectedEntity = entities.find(e => e.id.toString() === entityId);
        if (selectedEntity) {
            setFormData(prev => ({
                ...prev,
                messenger_name: selectedEntity.default_messenger_name || '',
                messenger_phone: selectedEntity.default_messenger_phone || ''
            }));
        }
    };

    const recallLastMessenger = () => {
        if (!formData.entity_id) {
            showToast('الرجاء اختيار جهة أولاً', 'error');
            return;
        }
        const lastDoc = documents.find(d => d.entity_id?.toString() === formData.entity_id);
        if (lastDoc) {
            setFormData(prev => ({
                ...prev,
                messenger_name: lastDoc.messenger_name || '',
                messenger_phone: lastDoc.messenger_phone || ''
            }));
            showToast('تم استعادة بيانات آخر مندوب لهذه الجهة', 'success');
        } else {
            showToast('لا توجد سجلات سابقة لهذه الجهة لاستعادة المندوب', 'error');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingAttachment = (path: string) => {
        setExistingAttachments(prev => prev.filter(p => p !== path));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                data.append(key, String(value));
            }
        });

        attachments.forEach((file) => {
            data.append('attachments[]', file);
        });

        if (isEditing) {
            data.append('_method', 'PUT');
            data.append('existing_attachments', JSON.stringify(existingAttachments));
        }

        const url = isEditing ? `${API_BASE_URL}/mail-documents/${currentDocId}` : `${API_BASE_URL}/mail-documents`;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                method: 'POST',
                body: data,
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (response.ok) {
                showToast(isEditing ? 'تم التحديث بنجاح' : 'تم التسجيل بنجاح', 'success');
                setShowModal(false);
                resetForm();
                fetchDocuments();
            } else {
                const errData = await response.json();
                showToast(errData.message || 'حدث خطأ أثناء حفظ البيانات', 'error');
            }
        } catch (error) {
            showToast('خطأ في الاتصال بالخادم', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            type: activeTab,
            serial_number: '',
            entity_id: '',
            sender_name_manual: '',
            recipient_name_manual: '',
            subject: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            registered_at: new Date().toISOString().split('T')[0],
            messenger_name: '',
            messenger_phone: '',
            employee_id: '',
            pages_count: '1',
            send_email: false,
            referential_number: ''
        });
        setAttachments([]);
        setExistingAttachments([]);
        setIsEditing(false);
        setCurrentDocId(null);
    };

    const handleEdit = (doc: MailDocument) => {
        setFormData({
            type: doc.type,
            serial_number: doc.serial_number || '',
            entity_id: doc.entity_id?.toString() || '',
            sender_name_manual: doc.sender_name_manual || '',
            recipient_name_manual: doc.recipient_name_manual || '',
            subject: doc.subject,
            description: doc.description || '',
            date: doc.date.split('T')[0],
            registered_at: doc.registered_at ? doc.registered_at.split('T')[0] : '',
            messenger_name: doc.messenger_name || '',
            messenger_phone: doc.messenger_phone || '',
            employee_id: doc.employee_id?.toString() || '',
            pages_count: doc.pages_count.toString(),
            send_email: false,
            referential_number: doc.referential_number || ''
        });
        setExistingAttachments(doc.attachments || []);
        setIsEditing(true);
        setCurrentDocId(doc.id);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('هل أنت متأكد؟')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/mail-documents/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (response.ok) { showToast('تم الحذف', 'success'); fetchDocuments(); }
        } catch (error) { showToast('خطأ في الاتصال', 'error'); }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.referential_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEntity = filterEntity ? doc.entity_id?.toString() === filterEntity : true;
        const docDate = new Date(doc.date);
        const matchesMonth = filterMonth ? (docDate.getMonth() + 1).toString() === filterMonth : true;
        const matchesYear = filterYear ? docDate.getFullYear().toString() === filterYear : true;

        return matchesSearch && matchesEntity && matchesMonth && matchesYear;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterEntity('');
        setFilterMonth('');
        setFilterYear(new Date().getFullYear().toString());
    };

    const stats = useMemo(() => {
        return {
            total: documents.length,
            withAttachment: documents.filter(d => d.attachment_url || (d.attachment_urls && d.attachment_urls.length > 0)).length,
            today: documents.filter(d => d.date.split('T')[0] === new Date().toISOString().split('T')[0]).length
        };
    }, [documents]);

    return (
        <section className="users-management">
            <div className="users-breadcrumb" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', marginBottom: '30px', color: '#fff'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <i className={activeTab === 'incoming' ? "fa-solid fa-file-import" : "fa-solid fa-file-export"} style={{ color: '#38bdf8' }}></i>
                        إدارة البريد {activeTab === 'incoming' ? 'الوارد' : 'الصادر'}
                    </h2>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>الأرشفة الإلكترونية والمتابعة الإدارية للمراسلات {activeTab === 'incoming' ? 'الواردة' : 'الصادرة'}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }} style={{ borderRadius: '10px', padding: '12px 25px', fontSize: '15px', fontWeight: 'bold', background: 'var(--accent-cyan)', border: 'none', boxShadow: '0 4px 12px var(--accent-shadow)' }}>
                        <i className="fa-solid fa-plus"></i>
                        {activeTab === 'incoming' ? ' إضافة بريد وارد' : ' إضافة بريد صادر'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>إجمالي سجلات {activeTab === 'incoming' ? 'الوارد' : 'الصادر'}</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#2563eb' }}>{stats.total} <span style={{ fontSize: '14px' }}>رسالة</span></div>
                </div>
                <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>رسائل مؤرشفة (مرفقات)</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#10b981' }}>{stats.withAttachment} <span style={{ fontSize: '14px' }}>ملف</span></div>
                </div>
                <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>سجلت اليوم</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#f59e0b' }}>{stats.today} <span style={{ fontSize: '14px' }}>رسالة</span></div>
                </div>
            </div>

            <div className="users-card">
                <div className="users-card-header">
                    <div className="header-right">
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>
                            قائمة سجلات البريد {activeTab === 'incoming' ? 'الوارد' : 'الصادر'}
                        </h3>
                    </div>
                </div>

                <div className="filters-row" style={{
                    padding: '15px 20px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    margin: '0 0 20px 0',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.5fr',
                    gap: '15px',
                    alignItems: 'end'
                }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', marginBottom: '5px' }}>بحث نصي</label>
                        <div className="search-wrapper" style={{ width: '100%' }}>
                            <i className="fa-solid fa-magnifying-glass search-icon"></i>
                            <input
                                type="text"
                                placeholder="بحث بالرقم أو الموضوع..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', marginBottom: '5px' }}>تصفية حسب الجهة</label>
                        <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', width: '100%' }}>
                            <option value="">كل الجهات</option>
                            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', marginBottom: '5px' }}>الشهر</label>
                        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', width: '100%' }}>
                            <option value="">كل الشهور</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('ar-LY', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', marginBottom: '5px' }}>السنة</label>
                        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', width: '100%' }}>
                            <option value="">كل السنوات</option>
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button onClick={resetFilters} className="btn-cancel" style={{ padding: '10px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'var(--accent-cyan)', color: '#fff', border: 'none', fontWeight: 'bold' }}>
                        <i className="fa-solid fa-rotate-left"></i> تفريغ
                    </button>
                </div>

                <div className="users-table-wrapper">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>الرقم الإشاري</th>
                                <th>تاريخ الرسالة</th>
                                {activeTab === 'incoming' ? <th>من (الجهة)</th> : <th>إلى (الجهة)</th>}
                                <th>المندوب / المستلم</th>
                                <th>الموضوع</th>
                                <th>المسؤول</th>
                                <th>تاريخ التسجيل</th>
                                <th>ملاحظات</th>
                                <th>المرفقات</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px' }}>جاري التحميل...</td></tr>
                            ) : filteredDocs.length > 0 ? (
                                filteredDocs.map(doc => (
                                    <tr key={doc.id}>
                                        <td style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>{doc.referential_number}</td>
                                        <td>{new Date(doc.date).toLocaleDateString('ar-LY')}</td>
                                        <td style={{ color: 'var(--text)' }}>{doc.entity?.name || (activeTab === 'incoming' ? doc.sender_name_manual : doc.recipient_name_manual) || '-'}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{doc.messenger_name || '-'}</td>
                                        <td style={{ color: 'var(--text)' }}>{doc.subject}</td>
                                        <td style={{ color: 'var(--text)' }}>{doc.employee?.name || '-'}</td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{doc.registered_at ? new Date(doc.registered_at).toLocaleDateString('ar-LY') : '-'}</td>
                                        <td style={{ fontSize: '0.85rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)' }} title={doc.description}>{doc.description || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {doc.attachment_urls && doc.attachment_urls.length > 0 ? (
                                                    doc.attachment_urls.map((url, idx) => (
                                                        <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 700, textDecoration: 'none', fontSize: '0.8rem' }}>
                                                            <i className="fa-solid fa-file-pdf"></i> عرض {doc.attachment_urls.length > 1 ? (idx + 1) : ''}
                                                        </a>
                                                    ))
                                                ) : (doc.attachment_url ? (
                                                    <a href={doc.attachment_url} target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 700, textDecoration: 'none', fontSize: '0.8rem' }}>
                                                        <i className="fa-solid fa-file-pdf"></i> عرض
                                                    </a>
                                                ) : '-')}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {(doc.attachment_url || (doc.attachment_urls && doc.attachment_urls.length > 0)) && (
                                                    <button
                                                        onClick={() => {
                                                            const mainUrl = doc.attachment_urls?.[0] || doc.attachment_url;
                                                            const text = `*مراسلة من شركة المدار الليبي للتأمين*%0A*الموضوع:* ${doc.subject}%0A*الرقم الإشاري:* ${doc.referential_number}%0A*رابط الملف:* ${window.location.origin}${mainUrl}`;
                                                            const phone = doc.messenger_phone || '';
                                                            window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
                                                        }}
                                                        style={{ background: '#25d366', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer' }}
                                                        title="مشاركة عبر واتساب"
                                                    >
                                                        <i className="fa-brands fa-whatsapp"></i>
                                                    </button>
                                                )}
                                                <button onClick={() => handleEdit(doc)} style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer' }} title="تعديل"><i className="fa-solid fa-pencil"></i></button>
                                                <button onClick={() => handleDelete(doc.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer' }} title="حذف"><i className="fa-solid fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px' }}>لا توجد سجلات</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* المودال - Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content custom-scrollbar" style={{ 
                        maxWidth: '850px', 
                        width: '90%', 
                        borderRadius: '20px', 
                        maxHeight: '90vh', 
                        overflowY: 'auto',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div className="modal-header" style={{ padding: '10px 15px', position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 10 }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                <i className={activeTab === 'incoming' ? 'fa-solid fa-file-import' : 'fa-solid fa-file-export'} style={{ marginLeft: '10px', color: 'var(--primary)' }}></i>
                                {isEditing ? 'تعديل البيانات' : `تسجيل بريد ${activeTab === 'incoming' ? 'وارد' : 'صادر'} جديد`}
                            </h3>
                            <button className="close-modal" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} className="user-form" style={{ padding: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="form-group">
                                    <label>الرقم الإشاري <span style={{ fontSize: '10px', color: '#94a3b8' }}>(اختياري - يترك فارغاً للتوليد التلقائي)</span></label>
                                    <input
                                        type="text"
                                        name="referential_number"
                                        value={formData.referential_number}
                                        onChange={handleInputChange}
                                        placeholder="مثال: MLI-IN-2026-0001"
                                        style={{ border: '1px solid var(--accent-cyan)', fontWeight: 'bold', color: 'var(--accent-cyan)', background: 'var(--input-bg)' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>تاريخ الرسالة <span className="required">*</span></label>
                                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>الجهة (من الدليل)</label>
                                    <select name="entity_id" value={formData.entity_id} onChange={(e) => handleEntityChange(e.target.value)}>
                                        <option value="">-- اختر جهة --</option>
                                        {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>تاريخ التسجيل</label>
                                    <input type="date" name="registered_at" value={formData.registered_at} onChange={handleInputChange} />
                                </div>
                                {!formData.entity_id && (
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>{activeTab === 'incoming' ? 'اسم المرسل (موظف أو خارجي)' : 'اسم المرسل إليه (موظف أو خارجي)'}</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <select
                                                style={{ flex: '1', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)' }}
                                                value={users.some(u => u.name === (activeTab === 'incoming' ? formData.sender_name_manual : formData.recipient_name_manual)) ? (activeTab === 'incoming' ? formData.sender_name_manual : formData.recipient_name_manual) : "custom"}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const field = activeTab === 'incoming' ? 'sender_name_manual' : 'recipient_name_manual';
                                                    if (val === "custom") {
                                                        setFormData(prev => ({ ...prev, [field]: "" }));
                                                    } else {
                                                        setFormData(prev => ({ ...prev, [field]: val }));
                                                    }
                                                }}
                                            >
                                                <option value="custom">-- إدخال يدوي / شخص آخر --</option>
                                                {users.length > 0 ? (
                                                    users.map(u => <option key={u.id} value={u.name}>{u.name} (موظف)</option>)
                                                ) : (
                                                    <option disabled>لا يوجد موظفين مسجلين</option>
                                                )}
                                            </select>
                                            <input
                                                type="text"
                                                name={activeTab === 'incoming' ? 'sender_name_manual' : 'recipient_name_manual'}
                                                value={activeTab === 'incoming' ? formData.sender_name_manual : formData.recipient_name_manual}
                                                onChange={handleInputChange}
                                                placeholder="اكتب الاسم هنا..."
                                                style={{ flex: '1' }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>الموضوع / نوع الرسالة <span className="required">*</span></label>
                                    <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>الموظف المسؤول</label>
                                    <select name="employee_id" value={formData.employee_id} onChange={handleInputChange}>
                                        <option value="">-- اختر موظفاً --</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ 
                                    gridColumn: 'span 2', 
                                    background: 'rgba(var(--primary-rgb), 0.03)', 
                                    padding: '20px', 
                                    borderRadius: '16px', 
                                    border: '1px solid var(--border)',
                                    marginTop: '10px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <label style={{ margin: 0, fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>بيانات المندوب / الشخص المستلم</label>
                                        <button type="button" onClick={recallLastMessenger} style={{ padding: '8px 16px', fontSize: '12px', background: 'var(--accent-cyan)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px var(--accent-shadow)', transition: 'all 0.3s ease' }}>
                                            <i className="fa-solid fa-clock-rotate-left" style={{ marginLeft: '5px' }}></i> استدعاء آخر مندوب للجهة
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="inner-group">
                                            <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', display: 'block' }}>اختيار من الموظفين</label>
                                            <select
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                                                value={users.some(u => u.name === formData.messenger_name) ? formData.messenger_name : "custom"}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "custom") {
                                                        setFormData(prev => ({ ...prev, messenger_name: "" }));
                                                    } else {
                                                        setFormData(prev => ({ ...prev, messenger_name: val }));
                                                    }
                                                }}
                                            >
                                                <option value="custom">-- شخص آخر / يدوي --</option>
                                                {users.length > 0 ? (
                                                    users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                                                ) : (
                                                    <option disabled>لا يوجد موظفين</option>
                                                )}
                                            </select>
                                        </div>
                                        <div className="inner-group">
                                            <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', display: 'block' }}>الاسم (يدوي)</label>
                                            <input
                                                type="text"
                                                name="messenger_name"
                                                value={formData.messenger_name}
                                                onChange={handleInputChange}
                                                placeholder="اسم المندوب..."
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                                            />
                                        </div>
                                        <div className="inner-group" style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', display: 'block' }}>رقم هاتف المندوب</label>
                                            <input
                                                type="text"
                                                name="messenger_phone"
                                                value={formData.messenger_phone}
                                                onChange={handleInputChange}
                                                placeholder="رقم الهاتف (اختياري)..."
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>ملاحظات إضافية</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border)', padding: '10px' }}></textarea>
                                </div>

                                {/* المرفقات الحالية (عند التعديل) */}
                                {isEditing && existingAttachments.length > 0 && (
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>المرفقات الحالية</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                                            {existingAttachments.map((path, idx) => (
                                                <div key={idx} style={{ position: 'relative', background: 'rgba(var(--primary-rgb), 0.05)', padding: '8px 30px 8px 12px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444' }}></i>
                                                    <span style={{ fontSize: '12px', color: 'var(--text)' }}>مرفق {idx + 1}</span>
                                                    <button type="button" onClick={() => removeExistingAttachment(path)} style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>
                                                        <i className="fa-solid fa-circle-xmark"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>إضافة وثائق جديدة (PDF / صور)</label>
                                    <input type="file" onChange={handleFileChange} accept=".pdf,image/*" multiple style={{ marginBottom: '10px' }} />
                                    
                                    {attachments.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {attachments.map((file, idx) => (
                                                <div key={idx} style={{ position: 'relative', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 30px 8px 12px', borderRadius: '10px', border: '1px solid #10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <i className="fa-solid fa-file-pdf" style={{ color: '#10b981' }}></i>
                                                    <span style={{ fontSize: '12px', color: 'var(--text)' }}>{file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}</span>
                                                    <button type="button" onClick={() => removeAttachment(idx)} style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>
                                                        <i className="fa-solid fa-circle-xmark"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {activeTab === 'outgoing' && formData.entity_id && (
                                    <div className="form-group" style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '12px', 
                                        marginTop: '15px', 
                                        background: 'rgba(59, 130, 246, 0.1)', 
                                        padding: '15px', 
                                        borderRadius: '12px', 
                                        gridColumn: 'span 2',
                                        border: '1px solid rgba(59, 130, 246, 0.2)'
                                    }}>
                                        <input
                                            type="checkbox"
                                            id="send_email"
                                            checked={formData.send_email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, send_email: e.target.checked }))}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                                        />
                                        <label htmlFor="send_email" style={{ marginBottom: 0, cursor: 'pointer', fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>
                                            إرسال نسخة إلكترونية عبر البريد للجهة المختارة ({entities.find(e => e.id.toString() === formData.entity_id)?.email || 'لا يوجد بريد مسجل'})
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className="form-actions" style={{ marginTop: '20px', position: 'sticky', bottom: 0, background: 'var(--card-bg)', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} style={{ borderRadius: '10px' }}>إلغاء</button>
                                <button type="submit" className="btn-submit" style={{ background: 'var(--accent-cyan)', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '10px', fontWeight: 'bold', boxShadow: '0 4px 12px var(--accent-shadow)' }}>{isEditing ? 'تحديث' : 'تسجيل'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default MailManagement;
