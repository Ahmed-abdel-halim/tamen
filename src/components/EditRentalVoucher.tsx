import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface RentalRecordForm {
  id?: number;
  from_date: string;
  to_date: string;
  apartments_count: number;
  total_amount: number;
  recipient_name: string;
}

export default function EditRentalVoucher() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Owner fields
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [notes, setNotes] = useState('');

  // Existing photo URLs
  const [existingPersonalPhoto, setExistingPersonalPhoto] = useState<string | null>(null);
  const [existingIdPhoto, setExistingIdPhoto] = useState<string | null>(null);
  const [existingNationalIdPhoto, setExistingNationalIdPhoto] = useState<string | null>(null);
  const [existingContractPaths, setExistingContractPaths] = useState<string[]>([]);
  const [existingContractUrls, setExistingContractUrls] = useState<string[]>([]);

  // New files
  const [personalPhoto, setPersonalPhoto] = useState<File | null>(null);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState<File | null>(null);
  const [contractPhotos, setContractPhotos] = useState<File[]>([]);
  const [contractPreviews, setContractPreviews] = useState<string[]>([]);

  const [records, setRecords] = useState<RentalRecordForm[]>([]);

  useEffect(() => {
    fetchVoucher();
  }, [id]);

  const fetchVoucher = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/rental-vouchers/${id}`);
      if (res.ok) {
        const { data } = await res.json();
        setOwnerName(data.owner_name);
        setPhone(data.phone);
        setNationalId(data.national_id);
        setNotes(data.notes || '');
        setExistingPersonalPhoto(data.personal_photo_url || null);
        setExistingIdPhoto(data.id_photo_url || null);
        setExistingNationalIdPhoto(data.national_id_photo_url || null);
        // Store both paths (for API) and URLs (for preview)
        const paths = data.contract_photos || [];
        const urls = data.contract_photos_urls || [];
        setExistingContractPaths(paths);
        setExistingContractUrls(urls);
        setRecords(data.records.map((r: any) => ({
          id: r.id,
          from_date: r.from_date?.substring(0, 10) || '',
          to_date: r.to_date?.substring(0, 10) || '',
          apartments_count: r.apartments_count,
          total_amount: r.total_amount,
          recipient_name: r.recipient_name,
        })));
      }
    } catch {
      showToast('خطأ في تحميل البيانات', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void
  ) => {
    setter(e.target.files?.[0] || null);
  };

  const handleContractPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setContractPhotos(prev => [...prev, ...files]);
    setContractPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeExistingContract = (idx: number) => {
    setExistingContractPaths(prev => prev.filter((_, i) => i !== idx));
    setExistingContractUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNewContract = (idx: number) => {
    setContractPhotos(prev => prev.filter((_, i) => i !== idx));
    setContractPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const addRecord = () => {
    setRecords(prev => [...prev, { from_date: '', to_date: '', apartments_count: 1, total_amount: 0, recipient_name: '' }]);
  };

  const removeRecord = (idx: number) => {
    if (records.length === 1) { showToast('يجب أن يكون هناك سجل واحد على الأقل', 'error'); return; }
    setRecords(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRecord = (idx: number, field: keyof RentalRecordForm, value: string | number) => {
    setRecords(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('_method', 'PUT');
      formData.append('owner_name', ownerName);
      formData.append('phone', phone);
      formData.append('national_id', nationalId);
      formData.append('notes', notes);

      if (personalPhoto) formData.append('personal_photo', personalPhoto);
      if (idPhoto) formData.append('id_photo', idPhoto);
      if (nationalIdPhoto) formData.append('national_id_photo', nationalIdPhoto);

      formData.append('existing_contract_photos', JSON.stringify(existingContractPaths));
      contractPhotos.forEach(f => formData.append('contract_photos[]', f));
      formData.append('records', JSON.stringify(records));

      const res = await fetch(`${API_BASE_URL}/rental-vouchers/${id}`, { method: 'POST', body: formData });
      if (res.ok) {
        showToast('تم التحديث بنجاح', 'success');
        navigate(`/reports/rental-vouchers/${id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'فشلت العملية', 'error');
      }
    } catch {
      showToast('حدث خطأ في الاتصال', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', color: '#0ea5e9' }}></i>
    </div>
  );

  const photoBox = (
    label: string,
    existingUrl: string | null,
    newFile: File | null,
    inputId: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    icon: string
  ) => {
    const preview = newFile ? URL.createObjectURL(newFile) : existingUrl;
    return (
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
          <i className={`fa-solid ${icon}`} style={{ marginLeft: '6px', color: '#0ea5e9' }}></i>
          {label}
        </label>
        <label htmlFor={inputId} style={{ cursor: 'pointer', display: 'block' }}>
          <div style={{
            width: '100%', height: '130px', borderRadius: '12px',
            border: `2px dashed ${preview ? '#0ea5e9' : 'var(--border)'}`,
            background: preview ? '#0ea5e908' : 'var(--input-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {preview
              ? <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
              : <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '28px', display: 'block', marginBottom: '6px' }}></i>
                  <span style={{ fontSize: '12px' }}>اضغط لتغيير الصورة</span>
                </div>
            }
          </div>
        </label>
        <input id={inputId} type="file" accept="image/*,application/pdf" onChange={onChange} style={{ display: 'none' }} />
      </div>
    );
  };

  const totalAmount = records.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

  return (
    <section className="users-management">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', background: 'var(--panel)', borderRadius: '12px',
        marginBottom: '20px', border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '17px', fontWeight: 'bold' }}>
          <i className="fa-solid fa-pen-to-square" style={{ marginLeft: '10px', color: '#f59e0b' }}></i>
          تعديل ورقة الإيجار
        </span>
        <button onClick={() => navigate(`/reports/rental-vouchers/${id}`)} className="ghost" style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '13px', border: '1px solid var(--border)' }}>
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }}></i> رجوع
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Owner Info */}
        <div style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#0ea5e908' }}>
            <i className="fa-solid fa-user-tie" style={{ marginLeft: '8px', color: '#0ea5e9' }}></i>
            <span style={{ fontWeight: 'bold' }}>بيانات صاحب العقار</span>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              { label: 'اسم صاحب العقار *', value: ownerName, setter: setOwnerName, placeholder: 'الاسم الكامل', type: 'text' },
              { label: 'رقم الهاتف *', value: phone, setter: setPhone, placeholder: '09xxxxxxxx', type: 'tel' },
              { label: 'الرقم الوطني *', value: nationalId, setter: setNationalId, placeholder: 'الرقم الوطني', type: 'text' },
            ].map((f, i) => (
              <div key={i}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>{f.label}</label>
                <input
                  type={f.type} required value={f.value}
                  onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>ملاحظات</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#a855f708' }}>
            <i className="fa-solid fa-images" style={{ marginLeft: '8px', color: '#a855f7' }}></i>
            <span style={{ fontWeight: 'bold' }}>المستندات والصور</span>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
              {photoBox('صورة شخصية', existingPersonalPhoto, personalPhoto, 'edit_personal_photo', e => handlePhotoChange(e, setPersonalPhoto), 'fa-user-circle')}
              {photoBox('صورة إثبات شخصي', existingIdPhoto, idPhoto, 'edit_id_photo', e => handlePhotoChange(e, setIdPhoto), 'fa-id-badge')}
              {photoBox('صورة رقم وطني', existingNationalIdPhoto, nationalIdPhoto, 'edit_national_id_photo', e => handlePhotoChange(e, setNationalIdPhoto), 'fa-id-card')}
            </div>
            {/* Contract Photos */}
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 'bold' }}>
                <i className="fa-solid fa-file-contract" style={{ marginLeft: '6px', color: '#f59e0b' }}></i>
                صور عقد الإيجار
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {existingContractUrls.map((url, i) => (
                  <div key={`ex-${i}`} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={url} alt={`عقد ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '2px solid #f59e0b' }} />
                    <button type="button" onClick={() => removeExistingContract(i)}
                      style={{ position: 'absolute', top: '-6px', left: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
                {contractPreviews.map((url, i) => (
                  <div key={`new-${i}`} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={url} alt="جديد" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '2px solid #22c55e' }} />
                    <button type="button" onClick={() => removeNewContract(i)}
                      style={{ position: 'absolute', top: '-6px', left: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
                <label htmlFor="edit_contract_photos" style={{ cursor: 'pointer' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed #f59e0b', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
                    <i className="fa-solid fa-plus" style={{ color: '#d97706', fontSize: '18px' }}></i>
                    <span style={{ fontSize: '10px', color: '#92400e' }}>إضافة</span>
                  </div>
                </label>
                <input id="edit_contract_photos" type="file" accept="image/*,application/pdf" multiple onChange={handleContractPhotosChange} style={{ display: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Records */}
        <div style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#22c55e08', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <i className="fa-solid fa-table-list" style={{ marginLeft: '8px', color: '#22c55e' }}></i>
              <span style={{ fontWeight: 'bold' }}>سجلات الإيجار</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ background: '#22c55e15', color: '#166534', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                الإجمالي: {totalAmount.toLocaleString()} د.ل
              </span>
              <button type="button" onClick={addRecord} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-plus"></i> إضافة سجل
              </button>
            </div>
          </div>
          <div style={{ padding: '20px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--input-bg)' }}>
                  {['#', 'من تاريخ', 'الى تاريخ', 'عدد الشقق', 'الإجمالي (د.ل)', 'اسم المستلم', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', padding: '8px', color: '#0ea5e9', fontWeight: 'bold' }}>{idx + 1}</td>
                    {[
                      { field: 'from_date', type: 'date', value: rec.from_date },
                      { field: 'to_date', type: 'date', value: rec.to_date },
                      { field: 'apartments_count', type: 'number', value: rec.apartments_count },
                      { field: 'total_amount', type: 'number', value: rec.total_amount },
                      { field: 'recipient_name', type: 'text', value: rec.recipient_name },
                    ].map((cell, ci) => (
                      <td key={ci} style={{ padding: '6px 8px' }}>
                        <input
                          type={cell.type} value={cell.value}
                          min={cell.type === 'number' ? '0' : undefined}
                          onChange={e => updateRecord(idx, cell.field as keyof RentalRecordForm, cell.type === 'number' ? Number(e.target.value) : e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeRecord(idx)} style={{ background: '#fee2e2', border: 'none', padding: '7px 10px', borderRadius: '7px', cursor: 'pointer', color: '#991b1b' }}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={() => navigate(`/reports/rental-vouchers/${id}`)} className="ghost" style={{ padding: '12px 28px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            إلغاء
          </button>
          <button type="submit" className="primary" disabled={loading} style={{ padding: '12px 36px', borderRadius: '10px', fontSize: '15px' }}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i>جاري الحفظ...</> : <><i className="fa-solid fa-save" style={{ marginLeft: '8px' }}></i>حفظ التعديلات</>}
          </button>
        </div>
      </form>
    </section>
  );
}
