import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, BACKEND_URL } from '../config/api';
import { showToast } from './Toast';

interface MailDocument {
    id: number;
    type: 'incoming' | 'outgoing';
    referential_number: string;
    serial_number?: string;
    entity_id?: number;
    entity?: {
        id: number;
        name: string;
        email?: string;
    };
    sender_name_manual?: string;
    recipient_name_manual?: string;
    subject: string;
    description?: string;
    date: string;
    registered_at?: string;
    messenger_name?: string;
    messenger_phone?: string;
    employee_id: number;
    employee?: {
        id: number;
        name: string;
    };
    attachment_url?: string;
    attachment_urls?: string[];
    pages_count: number;
    created_at: string;
}

const ViewMailDocument: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doc, setDoc] = useState<MailDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [previewRotation, setPreviewRotation] = useState(0);

    const fetchDocument = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/mail-documents/${id}`, {
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setDoc(data);
        } catch (error) {
            showToast('حدث خطأ أثناء جلب تفاصيل الرسالة', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocument();
    }, [id]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '20px' }}>
            <div className="spinner" style={{ width: '50px', height: '50px', border: '5px solid var(--border)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'var(--muted)', fontWeight: 600 }}>جاري تحميل تفاصيل الرسالة...</p>
        </div>
    );

    if (!doc) return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>لم يتم العثور على الرسالة المطلوبة</div>;

    const allAttachments = doc.attachment_urls || (doc.attachment_url ? [doc.attachment_url] : []);

    const handleWhatsApp = () => {
        const mainUrl = doc.attachment_urls?.[0] || doc.attachment_url;
        const fullFileUrl = mainUrl ? (mainUrl.startsWith('http') ? mainUrl : (mainUrl.startsWith('/') ? `${BACKEND_URL}${mainUrl}` : `${BACKEND_URL}/storage/${mainUrl}`)) : '';
        const text = `*مراسلة من شركة المدار الليبي للتأمين*%0A*الموضوع:* ${doc.subject}%0A*الرقم الإشاري:* ${doc.referential_number}%0A*رابط الملف:* ${fullFileUrl}`;
        const phone = doc.messenger_phone || '';
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    return (
        <div className="view-mail-container" style={{ padding: '40px', width: '100%', minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Cairo', sans-serif" }}>
            
            {/* Unified Top Header Section with Premium Background */}
            <div style={{ 
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '35px',
                padding: '40px 50px',
                marginBottom: '40px',
                color: '#fff',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {/* Decorative Elements */}
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent-cyan)', filter: 'blur(100px)', opacity: 0.15 }}></div>
                <div style={{ position: 'absolute', bottom: '-30px', left: '10%', width: '150px', height: '150px', background: '#a855f7', filter: 'blur(80px)', opacity: 0.1 }}></div>

                <div style={{ display: 'flex', gap: '35px', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                    <div style={{ 
                        width: '110px', 
                        height: '110px', 
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3.5rem',
                        color: '#38bdf8',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 15px 30px rgba(0,0,0,0.2)'
                    }}>
                        <i className={doc.type === 'incoming' ? "fa-solid fa-file-import" : "fa-solid fa-file-export"}></i>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
                            <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px' }}>
                                {doc.referential_number}
                            </h1>
                            <div style={{ 
                                padding: '8px 25px', 
                                borderRadius: '50px', 
                                background: doc.type === 'incoming' ? '#0ea5e9' : '#a855f7',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '1rem',
                                textTransform: 'uppercase',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                            }}>
                                {doc.type === 'incoming' ? 'بريد وارد' : 'بريد صادر'}
                            </div>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.3rem', fontWeight: 600 }}>{doc.subject}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 2 }}>
                    <button onClick={handleWhatsApp} style={{ 
                        background: '#25D366', 
                        color: '#fff', 
                        border: 'none', 
                        padding: '18px 40px', 
                        borderRadius: '20px', 
                        fontWeight: 900, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        fontSize: '1.2rem',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 10px 25px rgba(37, 211, 102, 0.3)'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(37, 211, 102, 0.5)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(37, 211, 102, 0.3)'; }}
                    >
                        <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.8rem' }}></i>
                        واتساب
                    </button>
                    <button onClick={() => navigate(-1)} style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        color: '#fff', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        padding: '18px 40px', 
                        borderRadius: '20px', 
                        fontWeight: 900, 
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        إغلاق
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '40px' }}>
                
                {/* Information dossiers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {/* Unified Info Panel */}
                    <div style={{ 
                        background: 'var(--card-bg)', 
                        borderRadius: '35px', 
                        padding: '45px', 
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '8px', height: '100%', background: 'var(--accent-cyan)' }}></div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '60px' }}>
                            
                            {/* Section 1: Administrative Details */}
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '35px', display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--accent-cyan)' }}>
                                    <i className="fa-solid fa-folder-tree"></i> البيانات الإدارية للمستند
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                    <FactItem label="الرقم الإشاري" value={doc.referential_number} icon="fa-solid fa-hashtag" />
                                    <FactItem label="تاريخ المراسلة" value={new Date(doc.date).toLocaleDateString('ar-LY')} icon="fa-solid fa-calendar-alt" />
                                    <FactItem label="ساعة وتاريخ التسجيل" value={doc.registered_at ? new Date(doc.registered_at).toLocaleString('ar-LY') : 'غير مسجل'} icon="fa-solid fa-clock" />
                                    <FactItem label="عدد المرفقات" value={`${doc.pages_count} ورقة / صفحة`} icon="fa-solid fa-copy" />
                                    <FactItem label="الموظف المسؤول" value={doc.employee?.name || '---'} icon="fa-solid fa-user-shield" />
                                </div>
                            </div>

                            {/* Section 2: Parties Details */}
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '35px', display: 'flex', alignItems: 'center', gap: '15px', color: '#10b981' }}>
                                    <i className="fa-solid fa-user-gear"></i> الأطراف والمعلومات الميدانية
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                    <FactItem label="الجهة الخارجية" value={doc.entity?.name || 'جهة غير محددة'} icon="fa-solid fa-building-user" />
                                    <FactItem label={doc.type === 'incoming' ? 'المرسل' : 'المستلم'} value={doc.type === 'incoming' ? (doc.sender_name_manual || '---') : (doc.recipient_name_manual || '---')} icon="fa-solid fa-address-card" />
                                    <FactItem label="اسم المندوب" value={doc.messenger_name || '---'} icon="fa-solid fa-id-badge" />
                                    <FactItem label="رقم الهاتف" value={doc.messenger_phone || '---'} icon="fa-solid fa-phone-flip" isPhone />
                                    <FactItem label="تاريخ الإضافة" value={new Date(doc.created_at).toLocaleString('ar-LY')} icon="fa-solid fa-database" />
                                </div>
                            </div>
                        </div>

                        {/* Description Section */}
                        <div style={{ marginTop: '50px', paddingTop: '40px', borderTop: '2px solid var(--border)' }}>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', color: '#f59e0b' }}>
                                <i className="fa-solid fa-comment-dots"></i> فحوى المراسلة والملاحظات
                            </h3>
                            <div style={{ 
                                padding: '35px', 
                                background: 'rgba(var(--primary-rgb), 0.03)', 
                                borderRadius: '25px', 
                                border: '1px solid var(--border)',
                                fontSize: '1.2rem',
                                lineHeight: '2',
                                color: 'var(--text)',
                                whiteSpace: 'pre-wrap',
                                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)'
                            }}>
                                {doc.description || 'لا توجد ملاحظات تفصيلية مسجلة لهذه المعاملة.'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Attachment Dossier */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    <div style={{ 
                        background: 'var(--card-bg)', 
                        borderRadius: '35px', 
                        padding: '40px', 
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
                        position: 'sticky',
                        top: '40px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <i className="fa-solid fa-paperclip" style={{ color: '#ef4444' }}></i> ملف المرفقات
                            </h3>
                            <div style={{ background: '#ef4444', color: '#fff', padding: '6px 15px', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 900 }}>
                                {allAttachments.length} ملف
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            {allAttachments.length > 0 ? allAttachments.map((url, idx) => {
                                const fullUrl = url.startsWith('http') ? url : (url.startsWith('/') ? `${BACKEND_URL}${url}` : `${BACKEND_URL}/storage/${url}`);
                                const isImage = url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
                                const isPdf = url.toLowerCase().endsWith('.pdf');

                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => { setSelectedFile(fullUrl); setPreviewRotation(0); }}
                                        style={{ 
                                            padding: '20px', 
                                            borderRadius: '25px', 
                                            background: 'var(--panel)', 
                                            border: '2px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '20px',
                                            cursor: 'pointer',
                                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                        }}
                                        className="attachment-card"
                                        onMouseOver={e => { 
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                                            e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseOut={e => { 
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ 
                                            width: '75px', 
                                            height: '75px', 
                                            borderRadius: '18px', 
                                            overflow: 'hidden',
                                            background: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid var(--border)',
                                            boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
                                        }}>
                                            {isImage ? (
                                                <img src={fullUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <i className={`fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-file'} `} style={{ fontSize: '2.2rem', color: isPdf ? '#ef4444' : '#64748b' }}></i>
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>مرفق {idx + 1}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>اضغط للمعاينة الفورية</div>
                                        </div>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                                            <i className="fa-solid fa-magnifying-glass-plus"></i>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)', background: 'rgba(0,0,0,0.02)', borderRadius: '25px', border: '2px dashed var(--border)' }}>
                                    <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '15px', display: 'block' }}></i>
                                    <p style={{ fontWeight: 800, margin: 0 }}>لا توجد مرفقات إلكترونية</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {selectedFile && (
                <div className="modal-overlay" style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(15, 23, 42, 0.98)', display: 'flex', justifyContent: 'center', alignItems: 'center', 
                    zIndex: 3000, padding: '30px', backdropFilter: 'blur(20px)' 
                }} onClick={() => setSelectedFile(null)}>
                    
                    <div style={{ 
                        position: 'absolute', top: '30px', width: 'auto', 
                        zIndex: 3020, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
                        padding: '12px 30px', borderRadius: '100px', display: 'flex', gap: '30px',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreviewRotation(r => r + 90)} style={{ background: 'none', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1rem' }}>
                            <i className="fa-solid fa-rotate-right" style={{ color: 'var(--accent-cyan)' }}></i> تدوير العرض
                        </button>
                        <a href={selectedFile} download style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1rem' }}>
                            <i className="fa-solid fa-download" style={{ color: '#10b981' }}></i> تحميل الملف
                        </a>
                        <button onClick={() => setSelectedFile(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', padding: '5px 20px', borderRadius: '50px', fontWeight: 900, fontSize: '0.9rem' }}>
                            إغلاق X
                        </button>
                    </div>

                    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setSelectedFile(null)}>
                        {selectedFile.toLowerCase().endsWith('.pdf') ? (
                            <iframe src={`${selectedFile}#toolbar=0`} style={{ width: '85vw', height: '85vh', border: 'none', borderRadius: '30px', background: '#fff', boxShadow: '0 50px 100px rgba(0,0,0,0.5)' }} title="PDF Preview" onClick={e => e.stopPropagation()}></iframe>
                        ) : (
                            <img 
                                src={selectedFile} 
                                alt="Preview" 
                                onClick={e => e.stopPropagation()}
                                style={{ 
                                    maxWidth: '90vw', 
                                    maxHeight: '85vh', 
                                    transform: `rotate(${previewRotation}deg)`,
                                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                    borderRadius: '20px',
                                    boxShadow: '0 50px 100px rgba(0,0,0,0.5)'
                                }} 
                            />
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
                
                .view-mail-container {
                    animation: pageSlideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                @keyframes pageSlideIn {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .fact-row:last-child { border-bottom: none !important; }
            `}</style>
        </div>
    );
};

const FactItem: React.FC<{ label: string; value: string; icon: string; isPhone?: boolean }> = ({ label, value, icon, isPhone }) => (
    <div className="fact-row" style={{ display: 'flex', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px dashed var(--border)' }}>
        <div style={{ 
            width: '45px', 
            height: '45px', 
            borderRadius: '12px', 
            background: 'var(--panel)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '1.2rem',
            color: 'var(--muted)',
            flexShrink: 0,
            marginLeft: '20px'
        }}>
            <i className={icon}></i>
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>{label}</div>
            <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: 800, 
                color: 'var(--text)',
                direction: isPhone ? 'ltr' : 'inherit',
                textAlign: isPhone ? 'right' : 'inherit'
            }}>
                {value}
            </div>
        </div>
    </div>
);

export default ViewMailDocument;
