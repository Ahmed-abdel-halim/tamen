import React, { useState, useEffect } from 'react';
import { API_BASE_URL, BACKEND_URL } from '../config/api';
import { showToast } from './Toast';
import '../styles/CreateInsurance.css';

interface CompanyDocument {
    id: number;
    name: string;
    document_number: string;
    issue_date: string;
    expiry_date: string;
    type: string;
    attachment_urls: string[];

    attachments?: string[];
    created_at: string;
}

const CompanyDocuments: React.FC = () => {
    const [documents, setDocuments] = useState<CompanyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentDocId, setCurrentDocId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 15;
    const [filterType, setFilterType] = useState('');

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType]);

    const [formData, setFormData] = useState({
        name: '',
        type: '',
        customType: '',
        document_number: '',
        issue_date: '',
        expiry_date: ''
    });

    const dynamicTypes = Array.from(new Set(documents.map(d => d.type).filter(t => t && t !== ''))).sort();
    const documentTypes = [...dynamicTypes, 'إضافة نوع جديد'];


    const [attachments, setAttachments] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/company-documents`, {
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const data = await response.json();
            setDocuments(data);
        } catch (error) {
            console.error('Error fetching company documents:', error);
            showToast('خطأ في جلب ملفات الشركة', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    const resetForm = () => {
        setFormData({
            name: '',
            type: '',
            customType: '',
            document_number: '',
            issue_date: '',
            expiry_date: ''
        });

        setAttachments([]);
        setExistingAttachments([]);
        setIsEditing(false);
        setCurrentDocId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const data = new FormData();
        data.append('name', formData.name);
        
        const finalType = formData.type === 'إضافة نوع جديد' ? formData.customType : formData.type;
        if (finalType) data.append('type', finalType);
        
        data.append('document_number', formData.document_number);
        if (formData.issue_date) data.append('issue_date', formData.issue_date);
        if (formData.expiry_date) data.append('expiry_date', formData.expiry_date);


        attachments.forEach((file) => {
            data.append('attachments[]', file);
        });

        if (isEditing) {
            data.append('_method', 'PUT');
            // We need to send existing attachments as array of strings
            existingAttachments.forEach(path => {
                data.append('existing_attachments[]', path);
            });
        }

        const url = isEditing ? `${API_BASE_URL}/company-documents/${currentDocId}` : `${API_BASE_URL}/company-documents`;

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
                showToast(isEditing ? 'تم التحديث بنجاح' : 'تم الحفظ بنجاح', 'success');
                setShowModal(false);
                resetForm();
                fetchDocuments();
            } else {
                const errData = await response.json();
                showToast(errData.message || 'حدث خطأ أثناء حفظ البيانات', 'error');
            }
        } catch (error) {
            showToast('خطأ في الاتصال بالخادم', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (doc: CompanyDocument) => {
        const isCustomType = doc.type && !documentTypes.includes(doc.type);
        setFormData({
            name: doc.name,
            type: isCustomType ? 'إضافة نوع جديد' : (doc.type || ''),
            customType: isCustomType ? doc.type : '',
            document_number: doc.document_number,
            issue_date: doc.issue_date ? doc.issue_date.split('T')[0] : '',
            expiry_date: doc.expiry_date ? doc.expiry_date.split('T')[0] : ''
        });

        setExistingAttachments(doc.attachments || []);
        setIsEditing(true);
        setCurrentDocId(doc.id);
        setShowModal(true);
    };

    const handleDelete = (id: number) => {
        setDeletingId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/company-documents/${deletingId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (response.ok) {
                showToast('تم الحذف بنجاح', 'success');
                fetchDocuments();
            } else {
                showToast('حدث خطأ أثناء الحذف', 'error');
            }
        } catch (error) {
            showToast('خطأ في الاتصال بالخادم', 'error');
        } finally {
            setShowDeleteModal(false);
            setDeletingId(null);
        }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             doc.document_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === '' || doc.type === filterType;
        return matchesSearch && matchesType;
    });

    const totalDocsCount = filteredDocs.length;
    const totalPages = Math.ceil(totalDocsCount / perPage);
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedDocs = filteredDocs.slice(startIndex, endIndex);


    return (
        <section className="users-management">
            <div className="users-breadcrumb" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', marginBottom: '30px', color: '#fff'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <i className="fa-solid fa-folder-open" style={{ color: '#38bdf8' }}></i>
                        إدارة ملفات الشركة
                    </h2>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>أرشفة المستندات القانونية والرسمية الخاصة بالشركة</p>
                </div>
                <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }} style={{ borderRadius: '10px', padding: '12px 25px', fontSize: '15px', fontWeight: 'bold', background: 'var(--accent-cyan)', border: 'none', boxShadow: '0 4px 12px var(--accent-shadow)' }}>
                    <i className="fa-solid fa-plus"></i> إضافة مستند جديد
                </button>
            </div>

            <div className="users-card">
                <div className="users-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div className="search-wrapper" style={{ width: '400px', position: 'relative' }}>
                            <i className="fa-solid fa-magnifying-glass search-icon" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                            <input
                                type="text"
                                placeholder="بحث بالاسم أو رقم المستند..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '12px 45px 12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div className="filter-group">
                                <label style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '5px', display: 'block' }}>تصفية حسب النوع</label>
                                <select 
                                    value={filterType} 
                                    onChange={(e) => setFilterType(e.target.value)}
                                    style={{ 
                                        padding: '10px 20px', 
                                        borderRadius: '10px', 
                                        border: '1px solid #e2e8f0', 
                                        background: '#fff', 
                                        fontWeight: 700, 
                                        color: '#1e293b', 
                                        outline: 'none', 
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
                                        cursor: 'pointer', 
                                        minWidth: '200px',
                                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                >
                                    <option value="">كل أنواع المستندات</option>
                                    {documentTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>

                            </div>
                            <button 
                                onClick={() => { setSearchTerm(''); setFilterType(''); }}
                                style={{ 
                                    marginTop: '20px', 
                                    padding: '10px 15px', 
                                    borderRadius: '10px', 
                                    border: '1px solid #e2e8f0', 
                                    background: '#fff', 
                                    color: '#64748b', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    transition: 'all 0.2s ease',
                                    fontWeight: 'bold'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--accent-cyan)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                                title="إعادة ضبط"
                            >
                                <i className="fa-solid fa-rotate-right"></i>
                                <span style={{ fontSize: '13px' }}>إعادة ضبط</span>
                            </button>

                        </div>
                    </div>
                </div>

                <div className="users-table-wrapper">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>اسم المستند</th>
                                <th>النوع</th>
                                <th>رقم المستند</th>

                                <th>تاريخ الإصدار</th>
                                <th>تاريخ الانتهاء</th>
                                <th>المرفقات</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>جاري التحميل...</td></tr>
                            ) : filteredDocs.length > 0 ? (
                                paginatedDocs.map(doc => (
                                    <tr key={doc.id}>
                                        <td style={{ fontWeight: 800 }}>{doc.name}</td>
                                        <td>
                                            <span style={{ 
                                                padding: '4px 10px', 
                                                borderRadius: '6px', 
                                                background: 'rgba(59, 130, 246, 0.1)', 
                                                color: '#3b82f6', 
                                                fontSize: '12px',
                                                fontWeight: 700
                                            }}>
                                                {doc.type || 'غير محدد'}
                                            </span>
                                        </td>
                                        <td>{doc.document_number}</td>

                                        <td>{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('ar-LY') : '-'}</td>
                                        <td style={{ color: doc.expiry_date && new Date(doc.expiry_date) < new Date() ? '#ef4444' : 'inherit' }}>
                                            {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('ar-LY') : '-'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                {doc.attachment_urls && doc.attachment_urls.length > 0 ? (
                                                    doc.attachment_urls.map((url, idx) => {
                                                        const fullUrl = url.startsWith('http') ? url : (url.startsWith('/') ? `${BACKEND_URL}${url}` : `${BACKEND_URL}/storage/${url}`);
                                                        return (
                                                            <button 
                                                                key={idx} 
                                                                onClick={() => setSelectedFile(fullUrl)} 
                                                                className="attachment-badge"
                                                                style={{ 
                                                                    background: 'rgba(16, 185, 129, 0.1)', 
                                                                    color: '#10b981', 
                                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                    borderRadius: '6px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <i className="fa-solid fa-file"></i> {idx + 1}
                                                            </button>
                                                        );
                                                    })
                                                ) : '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => handleEdit(doc)} className="btn-edit" style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer' }}><i className="fa-solid fa-pencil"></i></button>
                                                <button onClick={() => handleDelete(doc.id)} className="btn-delete" style={{ background: '#ef4444', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>لا توجد سجلات</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="pagination-wrapper" style={{ padding: '0 25px 25px 25px' }}>
                        <div className="pagination-info">
                            عرض {startIndex + 1}
                            {' إلى '}
                            {Math.min(startIndex + paginatedDocs.length, totalDocsCount)}
                            {' من '}
                            {totalDocsCount}
                            {' مستند'}
                        </div>
                        <div className="pagination-controls">
                            <button
                                className="pagination-btn pagination-prev"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>
                            {(() => {
                                const items: (number | 'dots')[] = [];
                                if (totalPages <= 3) {
                                    for (let p = 1; p <= totalPages; p++) {
                                        items.push(p);
                                    }
                                } else {
                                    items.push(1);
                                    let start = Math.max(2, currentPage - 1);
                                    let end = Math.min(totalPages - 1, currentPage + 1);
                                    if (start > 2) items.push('dots');
                                    for (let p = start; p <= end; p++) items.push(p);
                                    if (end < totalPages - 1) items.push('dots');
                                    items.push(totalPages);
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
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <i className="fa-solid fa-chevron-left"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for adding/editing */}
            {showModal && (
                <div className="modal-overlay" onClick={() => !submitting && setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>{isEditing ? 'تعديل مستند' : 'إضافة مستند جديد'}</h3>
                            <button className="close-modal" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} className="user-form">
                            <div className="form-group">
                                <label>اسم المستند <span className="required">*</span></label>
                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>نوع المستند</label>
                                <select name="type" value={formData.type} onChange={handleInputChange}>
                                    <option value="">اختر النوع...</option>
                                    {documentTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.type === 'إضافة نوع جديد' && (
                                <div className="form-group" style={{ animation: 'fadeIn 0.3s' }}>
                                    <label>اكتب النوع الجديد <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        name="customType" 
                                        value={formData.customType} 
                                        onChange={handleInputChange} 
                                        placeholder="مثلاً: براءة اختراع، توكيل عام..." 
                                        required 
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>رقم المستند <span className="required">*</span></label>
                                <input type="text" name="document_number" value={formData.document_number} onChange={handleInputChange} required />
                            </div>

                            <div className="form-group" style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '12px', border: '1px dashed #3b82f6' }}>
                                <label style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-paperclip"></i>
                                    إضافة ملفات (صور / PDF)
                                </label>
                                <input 
                                    type="file" 
                                    onChange={handleFileChange} 
                                    multiple 
                                    accept="image/*,.pdf" 
                                    style={{ marginTop: '10px' }}
                                />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                                    {attachments.map((file, idx) => (
                                        <div key={idx} style={{ position: 'relative', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 30px 8px 12px', borderRadius: '10px', border: '1px solid #10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fa-solid fa-file" style={{ color: '#10b981' }}></i>
                                            <span style={{ fontSize: '12px' }}>{file.name.substring(0, 10)}...</span>
                                            <button type="button" onClick={() => removeAttachment(idx)} style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                <i className="fa-solid fa-circle-xmark"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>تاريخ الإصدار</label>
                                    <input type="date" name="issue_date" value={formData.issue_date} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>تاريخ الانتهاء</label>
                                    <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleInputChange} />
                                </div>
                            </div>

                            {/* Existing attachments */}
                            {isEditing && existingAttachments.length > 0 && (
                                <div className="form-group">
                                    <label>المرفقات الحالية</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                                        {existingAttachments.map((path, idx) => (
                                            <div key={idx} style={{ position: 'relative', background: 'rgba(59, 130, 246, 0.1)', padding: '8px 30px 8px 12px', borderRadius: '10px', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <i className="fa-solid fa-file-image" style={{ color: '#3b82f6' }}></i>
                                                <span style={{ fontSize: '12px' }}>ملف {idx + 1}</span>
                                                <button type="button" onClick={() => removeExistingAttachment(path)} style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                    <i className="fa-solid fa-circle-xmark"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                            <div className="form-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel" disabled={submitting}>إلغاء</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'جاري الحفظ...' : 'حفظ المستند'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <h3>تأكيد الحذف</h3>
                        <p>هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="form-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
                            <button onClick={() => setShowDeleteModal(false)} className="btn-cancel">إلغاء</button>
                            <button onClick={confirmDelete} className="btn-primary" style={{ background: '#ef4444' }}>تأكيد الحذف</button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Preview Overlay */}
            {selectedFile && (
                <div className="modal-overlay" onClick={() => setSelectedFile(null)} style={{ zIndex: 1100 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%', padding: '10px', background: 'none', border: 'none', boxShadow: 'none' }}>
                        <button onClick={() => setSelectedFile(null)} style={{ position: 'fixed', top: '20px', right: '20px', background: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', zIndex: 1200 }}><i className="fa-solid fa-xmark"></i></button>
                        {selectedFile.toLowerCase().endsWith('.pdf') ? (
                            <iframe src={selectedFile} style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: '10px' }}></iframe>
                        ) : (
                            <img src={selectedFile} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} alt="Preview" />
                        )}
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <a href={selectedFile} download className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>تحميل الملف</a>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default CompanyDocuments;

