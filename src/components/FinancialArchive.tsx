import React, { useState, useEffect } from 'react';
import { API_BASE_URL, BACKEND_URL } from '../config/api';
import { showToast } from './Toast';

interface DocumentRecord {
  id: number;
  document_name: string;
  category: string;
  file_type: string;
  size: string;
  upload_date: string;
  uploaded_by: string;
  related_entity: string;
  status: 'active' | 'archived';
}

const CATEGORIES = ['إيصالات قبض', 'وثائق تأمين ملغاة', 'كشوفات بنكية', 'فواتير مصروفات', 'عقود وكلاء', 'تقارير دورية', 'أخرى'];

export default function FinancialArchive() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    document_name: '',
    category: CATEGORIES[0],
    custom_category: '',
    related_entity: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchArchive();
  }, [activeCategory]);

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE_URL}/financial-archive`);
      if (activeCategory !== 'all') url.searchParams.append('category', activeCategory);
      if (searchQuery) url.searchParams.append('search', searchQuery);

      const response = await fetch(url.toString());

      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((item: any) => ({
          id: item.id,
          document_name: item.document_name,
          category: item.category,
          file_type: item.file_type,
          size: item.file_size,
          upload_date: item.created_at.split('T')[0],
          uploaded_by: item.uploaded_by,
          related_entity: item.related_entity || '-',
          status: 'active',
          file_path: item.file_path
        }));
        setDocuments(mapped);
      }
    } catch (error) {
      showToast('خطأ في جلب الأرشيف', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) return showToast('يرجى اختيار ملف', 'error');

    const data = new FormData();
    data.append('document_name', formData.document_name);
    data.append('category', formData.category === 'أخرى' ? formData.custom_category : formData.category);
    data.append('related_entity', formData.related_entity);
    data.append('file', formData.file);

    try {
      const response = await fetch(`${API_BASE_URL}/financial-archive`, {
        method: 'POST',
        body: data
      });
      if (response.ok) {
        setShowModal(false);
        fetchArchive();
        showToast('تمت أرشفة المستند بنجاح', 'success');
        setFormData({ document_name: '', category: CATEGORIES[0], custom_category: '', related_entity: '', file: null });
      }
    } catch (error) {
      showToast('فشل رفع المستند', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المستند نهائياً؟')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/financial-archive/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('تم حذف المستند بنجاح', 'success');
        fetchArchive();
      } else {
        showToast('فشل في حذف المستند', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.document_name.includes(searchQuery) || doc.related_entity.includes(searchQuery);
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="users-management">
      <div className="users-breadcrumb" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        background: 'var(--panel)',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
          <i className="fa-solid fa-folder-open" style={{ marginLeft: '10px', color: '#139625' }}></i>
          الأرشيف المالي والمستندات
        </span>
        <button className="primary" style={{ padding: '10px 24px', borderRadius: '10px' }} onClick={() => setShowModal(true)}>
          <i className="fa-solid fa-cloud-arrow-up" style={{ marginLeft: '8px' }}></i>
          أرشفة مستند جديد
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: '20px' }}>
        {/* Left Sidebar - Categories */}
        <div style={{ background: 'var(--panel)', borderRadius: '15px', padding: '20px', border: '1px solid var(--border)', height: 'fit-content' }}>
          <h4 style={{ marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', fontSize: '14px' }}>تصنيفات الأرشيف</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button
              onClick={() => setActiveCategory('all')}
              style={{ textAlign: 'right', padding: '10px 15px', borderRadius: '8px', border: 'none', background: activeCategory === 'all' ? '#014cb1' : 'transparent', color: activeCategory === 'all' ? '#fff' : 'var(--text)', cursor: 'pointer' }}>
              الكل
            </button>
            {(() => {
              const availableCategories = Array.from(new Set([
                ...CATEGORIES.filter(c => c !== 'أخرى'),
                ...documents.map(doc => doc.category)
              ]));
              return availableCategories.map(cat => (
                <button
                  key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ textAlign: 'right', padding: '10px 15px', borderRadius: '8px', border: 'none', background: activeCategory === cat ? '#014cb1' : 'transparent', color: activeCategory === cat ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: '13px' }}>
                  {cat}
                </button>
              ));
            })()}
          </div>
        </div>

        {/* Right Content - Explorer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="users-card" style={{ padding: '15px' }}>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-search" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم المستند، رقم الإيصال، أو جهة التعامل..."
                style={{ width: '100%', padding: '12px 45px 12px 15px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
              />
            </div>
          </div>

          <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>اسم المستند</th>
                  <th>التصنيف</th>
                  <th>الحجم</th>
                  <th>تاريخ الأرشفة</th>
                  <th>الموظف</th>
                  <th>جهة التعامل</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>جاري التحميل...</td></tr>
                ) : filteredDocs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>الأرشيف فارغ حالياً</td></tr>
                ) : filteredDocs.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 'bold' }}>
                      <i className={`fa-solid ${doc.file_type === 'PDF' ? 'fa-file-pdf' : 'fa-file-image'}`} style={{ marginLeft: '8px', color: doc.file_type === 'PDF' ? '#ef4444' : '#014cb1' }}></i>
                      {doc.document_name}
                    </td>
                    <td>{doc.category}</td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{doc.size}</td>
                    <td>{doc.upload_date}</td>
                    <td>{doc.uploaded_by}</td>
                    <td>{doc.related_entity}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a href={`${BACKEND_URL}/storage/${(doc as any).file_path}`} target="_blank" rel="noreferrer" style={{ background: 'var(--table-header)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text)' }} title="معاينة"><i className="fa-solid fa-eye"></i></a>
                        <a href={`${BACKEND_URL}/storage/${(doc as any).file_path}`} download style={{ background: 'var(--table-header)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text)' }} title="تحميل"><i className="fa-solid fa-download"></i></a>
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }} 
                          title="حذف"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content dark-modal" style={{ maxWidth: '500px', background: 'var(--panel)' }}>
            <div className="modal-header">
              <h3>أرشفة مستند مالي جديد</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleUpload} style={{ padding: '20px' }}>
              <div className="form-group">
                <label>اسم المستند / الوصف</label>
                <input type="text" required placeholder="مثال: إيصال صيانة سيارة الإدارة" value={formData.document_name} onChange={e => setFormData({ ...formData, document_name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>تصنيف المستند</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {(() => {
                      const dynamicCategoriesArr = Array.from(new Set([
                        ...CATEGORIES.filter(c => c !== 'أخرى'),
                        ...documents.map(doc => doc.category)
                      ]));
                      return [
                        ...dynamicCategoriesArr.map(c => <option key={c} value={c}>{c}</option>),
                        <option key="other" value="أخرى">أخرى</option>
                      ];
                    })()}
                  </select>
                </div>
                {formData.category === 'أخرى' && (
                  <div className="form-group">
                    <label>اكتب التصنيف الجديد</label>
                    <input type="text" required placeholder="مثال: مستندات قانونية" value={formData.custom_category} onChange={e => setFormData({ ...formData, custom_category: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label>جهة التعامل (اختياري)</label>
                  <input type="text" placeholder="اسم الوكيل أو المصرف" value={formData.related_entity} onChange={e => setFormData({ ...formData, related_entity: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label>اختيار الملف (PDF أو صورة)</label>
                <input type="file" required accept=".pdf,image/*" onChange={e => setFormData({ ...formData, file: e.target.files ? e.target.files[0] : null })} />
              </div>
              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="secondary" style={{ padding: '10px 20px' }}>إلغاء</button>
                <button type="submit" className="primary" style={{ padding: '10px 30px' }}>بدء الأرشفة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
