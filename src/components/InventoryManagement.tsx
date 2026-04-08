import React, { useState, useEffect } from 'react';
import { showToast } from "./Toast";

interface StoreItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  price?: number;
  unit_price?: number;
  min_threshold: number;
  stocks: { quantity: number; warehouse_location: string }[];
}

interface Custody {
  id: number;
  item: StoreItem;
  quantity: number;
  serial_start?: string;
  serial_end?: string;
  recipient: { name: string; username?: string; agency_name?: string };
  recipient_type: string;
  assigned_at: string;
  condition: string;
  status: 'active' | 'returned' | 'lost' | 'damaged';
  notes?: string;
}

const DEFAULT_CATEGORY_OPTIONS = [
  { value: 'paper', label: 'مطبوعات ودفاتر (Paper)' },
  { value: 'electronic', label: 'أجهزة إلكترونية (Devices)' },
  { value: 'furniture', label: 'أثاث ومعدات (Furniture)' },
];
const FALLBACK_CATEGORY_OPTION = { value: 'other', label: 'أخرى (Other)' };

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState<'store' | 'custody' | 'assign' | 'log'>('store');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // Form states
  const getDefaultItemForm = () => ({
    name: '',
    category: 'paper',
    unit: 'قطعة',
    price: '',
    min_threshold: 5,
    quantity: 0,
    location: '',
  });
  const [newItem, setNewItem] = useState(getDefaultItemForm());
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [assignment, setAssignment] = useState({
    item_id: '',
    recipient_id: '',
    recipient_type: 'agent',
    quantity: 1,
    serial_start: '',
    serial_end: '',
    condition: 'new',
    notes: ''
  });

  const [agents, setAgents] = useState<{id: number, agent_name: string, agency_name: string}[]>([]);
  const [employees, setEmployees] = useState<{id: number, name: string}[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const itemsRes = await fetch(`/api/inventory/items?t=${Date.now()}`, { cache: 'no-store' });
      const itemsData = await itemsRes.json();
      setItems(Array.isArray(itemsData) ? itemsData : []);

      const custodyRes = await fetch('/api/inventory/custody');
      const custodyData = await custodyRes.json();
      setCustodies(Array.isArray(custodyData) ? custodyData : []);

      // Fetch agents and employees
      const agentsRes = await fetch('/api/branches-agents');
      const agentsData = await agentsRes.json();
      setAgents(Array.isArray(agentsData) ? agentsData : []);

      const employeesRes = await fetch('/api/users');
      const employeesData = await employeesRes.json();
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

    } catch (error) {
      console.error('Error fetching inventory data:', error);
      showToast('حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedCategory = showCustomCategoryInput
        ? customCategory.trim()
        : newItem.category;
      if (!selectedCategory) {
        showToast('يرجى إدخال اسم التصنيف الجديد', 'error');
        setSubmitting(false);
        return;
      }

      const payload = {
        name: newItem.name,
        category: selectedCategory,
        unit: newItem.unit,
        min_threshold: Number(newItem.min_threshold) || 0,
        price: newItem.price === '' ? null : Number(newItem.price),
      };
      const isEditMode = editingItemId !== null;
      const itemRes = await fetch(isEditMode ? `/api/inventory/items/${editingItemId}` : '/api/inventory/items', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!itemRes.ok) {
        throw new Error('فشل حفظ بيانات الصنف');
      }

      let targetItemId = editingItemId;
      if (!isEditMode) {
        try {
          const created = await itemRes.json();
          targetItemId = created?.id ?? targetItemId;
        } catch {
          targetItemId = null;
        }
      }

      if (targetItemId) {
        const originalItem = items.find((item) => item.id === targetItemId);
        const originalQty = originalItem?.stocks?.[0]?.quantity ?? 0;
        const originalLocation = originalItem?.stocks?.[0]?.warehouse_location ?? '';
        const newQty = Number(newItem.quantity) || 0;
        const qtyDelta = isEditMode ? newQty - originalQty : newQty;
        const locationChanged = isEditMode ? newItem.location !== originalLocation : !!newItem.location;

        if (qtyDelta !== 0 || locationChanged) {
          const stockRes = await fetch('/api/inventory/update-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item_id: String(targetItemId),
              quantity: qtyDelta,
              location: newItem.location,
            }),
          });
          if (!stockRes.ok) {
            throw new Error('فشل تحديث الكمية أو موقع التخزين');
          }
        }
      }

      setNewItem(getDefaultItemForm());
      setCustomCategory('');
      setShowCustomCategoryInput(false);
      setEditingItemId(null);
      setShowAddModal(false);
      await fetchData();
      showToast(isEditMode ? 'تم تعديل الصنف بنجاح' : 'تم إضافة الصنف بنجاح', 'success');
    } catch (error) {
      console.error('Error saving item:', error);
      showToast('حدث خطأ أثناء حفظ الصنف', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddItemModal = () => {
    setEditingItemId(null);
    setNewItem(getDefaultItemForm());
    setCustomCategory('');
    setShowCustomCategoryInput(false);
    setShowAddModal(true);
  };

  const openEditItemModal = (item: StoreItem) => {
    const isDefaultCategory = DEFAULT_CATEGORY_OPTIONS.some((opt) => opt.value === item.category);
    setEditingItemId(item.id);
    setNewItem({
      name: item.name ?? '',
      category: isDefaultCategory ? (item.category ?? 'other') : 'other',
      unit: item.unit ?? 'قطعة',
      price: String(item.price ?? item.unit_price ?? ''),
      min_threshold: item.min_threshold ?? 0,
      quantity: item.stocks?.[0]?.quantity ?? 0,
      location: item.stocks?.[0]?.warehouse_location ?? '',
    });
    setCustomCategory(isDefaultCategory ? '' : (item.category ?? ''));
    setShowCustomCategoryInput(!isDefaultCategory);
    setShowAddModal(true);
  };

  const handleDeleteItem = async (item: StoreItem) => {
    if (!window.confirm(`هل تريد حذف الصنف "${item.name}"؟`)) return;
    try {
      const res = await fetch(`/api/inventory/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      showToast('تم حذف الصنف بنجاح', 'success');
      await fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('تعذر حذف الصنف، تأكد أنه غير مرتبط بحركات عهدة', 'error');
    }
  };

  const handleAssignCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/assign-custody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment)
      });
      if (res.ok) {
        showToast('تم صرف العهدة بنجاح', 'success');
        setAssignment({ 
          item_id: '', recipient_id: '', recipient_type: 'agent', 
          quantity: 1, serial_start: '', serial_end: '', condition: 'new', notes: '' 
        });
        fetchData();
        setActiveTab('custody');
      } else {
        const err = await res.json();
        showToast(err.message || 'حدث خطأ أثناء التسليم', 'error');
      }
    } catch (error) {
      console.error('Error assigning custody:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnCustody = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من استرجاع هذه العهدة للمخايزن؟')) return;
    try {
      const res = await fetch(`/api/inventory/return-custody/${id}`, { method: 'POST' });
      if (res.ok) {
        showToast('تم الاسترجاع بنجاح', 'success');
        fetchData();
      }
    } catch (error) {
      console.error('Error returning custody:', error);
    }
  };

  const handlePrintCustodyReceipt = (custody: Custody) => {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) {
      showToast('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة', 'error');
      return;
    }

    const html = `
      <html dir="rtl">
        <head>
          <title>إيصال استلام عهدة - ${custody.item.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Cairo', sans-serif;
              padding: 20px 40px;
              color: #111;
              font-size: 15px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 25px;
              border-bottom: 3px double #000;
              padding-bottom: 15px;
            }
            .header-text {
              text-align: right;
              flex: 1;
            }
            .header img.logo {
              max-width: 140px;
              height: auto;
            }
            .header h1 { margin: 0 0 5px 0; font-size: 26px; color: #014cb1; font-weight: 800; }
            .header h2 { margin: 0; font-size: 18px; color: #333; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; margin-top: 15px; }
            th, td { padding: 12px 14px; border: 1px solid #000; text-align: right; }
            th { background-color: #f1f5f9; width: 33%; font-weight: 700; color: #0f172a; }
            td { font-weight: 600; color: #1e293b; }
            .signatures { display: flex; justify-content: space-around; margin-top: 40px; padding-top: 10px; }
            .signature-box { text-align: center; width: 35%; }
            .signature-line { border-bottom: 2px dashed #64748b; margin-top: 40px; }
            .declaration { font-size: 14px; font-weight: 600; color: #334155; text-align: justify; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; background: #f8fafc; margin-bottom: 15px; }
            @media print {
              @page { margin: 10mm; size: A4 portrait; }
              body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              button { display: none; }
            }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 500);">
          <div class="header">
            <div class="header-text">
              <h1>شركة المدار الليبي للتأمين</h1>
              <h2>نموذج إقرار استلام عهدة (أصول / مستندات)</h2>
            </div>
            <img src="/img/logo.png" alt="المدار الليبي للتأمين" class="logo" />
          </div>

          <p><strong>تاريخ وتوقيت الصرف:</strong> ${custody.assigned_at}</p>
          <p><strong>الرقم المرجعي لتسجيل العهدة:</strong> #${custody.id.toString().padStart(5, '0')}</p>

          <table>
            <tr>
              <th>الجهة المستلمة (الوكيل / الموظف)</th>
              <td>${custody.recipient.agency_name || custody.recipient.name}</td>
            </tr>
            <tr>
              <th>توصيف العهدة المسلمة (الصنف)</th>
              <td>${custody.item.name} (${getCategoryName(custody.item.category)})</td>
            </tr>
            <tr>
              <th>الكمية المستلمة</th>
              <td>${custody.quantity} ${custody.item.unit}</td>
            </tr>
            ${(custody.serial_start || custody.serial_end) ? `
            <tr>
              <th>أرقام مسلسلة / سيريالات الدفاتر</th>
              <td dir="ltr" style="text-align: right;">
                ${custody.serial_start} ${custody.serial_end ? ` ➔ ${custody.serial_end}` : ''}
              </td>
            </tr>
            ` : ''}
            <tr>
              <th>حالة العهدة عند التسليم</th>
              <td>${custody.condition === 'new' ? 'جديد (لم يسبق استخدامه)' : 'مستعمل (بحالة جيدة)'}</td>
            </tr>
            <tr>
              <th>ملاحظات التسليم الإضافية</th>
              <td>${custody.notes || 'لا توجد ملاحظات.'}</td>
            </tr>
          </table>

          <div class="declaration">
            <p style="margin-top: 0">أقر أنا الموقع أدناه، بصفتي المذكورة أعلاه، بأنني استلمت العهدة الموضحة تفاصيلها بموجب هذا الإيصال وهي بحالة سليمة، وأتعهد أمام شركة المدار الليبي للتأمين بالمحافظة عليها واستخدامها في أغراض العمل الرسمية فقط، وبأنني أتحمل كامل المسؤولية المادية والقانونية في حال فقدانها أو تلفها نتيجة الإهمال، وأتعهد بإعادتها عند الطلب أو عند انتهاء تكليفي.</p>
          </div>

          <div class="signatures">
            <div class="signature-box">
              <h3>توقيع المستلم بالاستلام</h3>
              <div class="signature-line"></div>
              <p style="color: #64748b; font-size: 13px; margin-top: 10px;">الاسم والتوقيع</p>
            </div>
            <div class="signature-box">
              <h3>توقيع أمين المخزن أو المسلم</h3>
              <div class="signature-line"></div>
              <p style="color: #64748b; font-size: 13px; margin-top: 10px;">الختم والتوقيع</p>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = { paper: 'ورقيات/دفاتر', electronic: 'أجهزة إلكترونية', furniture: 'أثاث/معدات', other: 'أخرى' };
    return names[category] || category;
  };

  const filteredItems = items.filter(i => i.name.includes(searchTerm));
  const categoryOptions = [
    ...DEFAULT_CATEGORY_OPTIONS,
    ...Array.from(
      new Set(
        items
          .map((i) => i.category)
          .filter((cat) => !!cat && cat !== FALLBACK_CATEGORY_OPTION.value && !DEFAULT_CATEGORY_OPTIONS.some((opt) => opt.value === cat))
      )
    ).map((cat) => ({ value: cat, label: cat })),
    FALLBACK_CATEGORY_OPTION,
  ];
  const getItemPrice = (item: StoreItem) => {
    const value = item.price ?? item.unit_price;
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Custom inline styles to fit gracefully with the dark/light theme logic using variables
  const tabBtnStyle = (isActive: boolean) => ({
    padding: '12px 24px',
    backgroundColor: isActive ? 'var(--accent)' : 'var(--input-bg)',
    color: isActive ? '#fff' : 'var(--text)',
    border: `1px solid var(--border)`,
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  });

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الشؤون المالية / إدارة المخازن والعهدة المالية</span>
      </div>

      <div className="users-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button style={tabBtnStyle(activeTab === 'store')} onClick={() => setActiveTab('store')}>
            <i className="fa-solid fa-box"></i> المخزن الرئيسي
          </button>
          <button style={tabBtnStyle(activeTab === 'custody')} onClick={() => setActiveTab('custody')}>
            <i className="fa-solid fa-user-check"></i> العهد الحالية
          </button>
          <button style={tabBtnStyle(activeTab === 'assign')} onClick={() => setActiveTab('assign')}>
            <i className="fa-solid fa-arrow-up-right-from-square"></i> صرف عهدة
          </button>
          <button style={tabBtnStyle(activeTab === 'log')} onClick={() => setActiveTab('log')}>
            <i className="fa-solid fa-clock-rotate-left"></i> سجل الحركات
          </button>
          <button 
            style={{...tabBtnStyle(false), marginRight: 'auto', backgroundColor: 'transparent', borderColor: 'transparent', color: 'var(--accent)'}} 
            onClick={fetchData}
            title="تحديث البيانات"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> تحديث
          </button>
        </div>
      </div>

      <div className="users-card">
        {activeTab === 'store' && (
          <>
            <div className="users-header">
              <div className="users-search-bar">
                <input 
                  type="text" 
                  placeholder="بحث عن صنف في المخزن..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="users-search-input"
                />
                <button className="users-search-btn" type="button">
                  <i className="fa-solid fa-magnifying-glass"></i>
                </button>
              </div>
              <button 
                className="primary add-user-btn" 
                onClick={openAddItemModal}
              >
                <i className="fa-solid fa-plus"></i> إضافة صنف 
              </button>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>جار التحميل...</p>
            ) : (
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الصنف</th>
                      <th>التصنيف</th>
                      <th>سعر الصنف</th>
                      <th>الكمية المتوفرة</th>
                      <th>الوحدة</th>
                      <th>موقع التخزين</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-table-cell" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                          <i className="fa-solid fa-box-open" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                          لا توجد أصناف في المخزن تناسب بحثك
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                          <td>{getCategoryName(item.category)}</td>
                          <td>
                            {getItemPrice(item) !== null ? (
                              <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                                {Number(getItemPrice(item)).toLocaleString()} د.ل
                              </span>
                            ) : (
                              <span style={{ color: 'var(--muted)' }}>-</span>
                            )}
                          </td>
                          <td>
                            <span style={{ 
                              padding: '4px 12px', 
                              borderRadius: '20px', 
                              backgroundColor: (item.stocks?.[0]?.quantity || 0) <= item.min_threshold ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                              color: (item.stocks?.[0]?.quantity || 0) <= item.min_threshold ? '#ef4444' : '#22c55e',
                              fontWeight: 'bold'
                            }}>
                              {item.stocks?.[0]?.quantity || 0}
                            </span>
                          </td>
                          <td>{item.unit}</td>
                          <td>{item.stocks?.[0]?.warehouse_location || '-'}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn edit"
                                onClick={() => openEditItemModal(item)}
                                title="تعديل الصنف"
                                aria-label="تعديل الصنف"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => handleDeleteItem(item)}
                                title="حذف الصنف"
                                aria-label="حذف الصنف"
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
            )}
          </>
        )}

        {activeTab === 'custody' && (
          <div style={{ padding: '20px' }}>
            <div className="users-mobile-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: 0 }}>
              {custodies.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted)', padding: '50px 0' }}>
                  <i className="fa-solid fa-user-check" style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '15px', display: 'block' }}></i>
                  لا توجد عهدة نشطة مسجلة حالياً
                </div>
              ) : (
                custodies.map((c) => (
                  <div key={c.id} className="user-mobile-card" style={{ position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', backgroundColor: c.status === 'active' ? '#3b82f6' : 'var(--muted)' }}></div>
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{c.item.name}</h4>
                        <span className="user-mobile-number" style={{ color: 'var(--accent)' }}>
                          <i className="fa-solid fa-user" style={{ marginLeft: '5px' }}></i>
                          {c.recipient.agency_name || c.recipient.name}
                        </span>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">الكمية المستلمة:</span>
                        <span className="user-mobile-value" style={{ fontWeight: 'bold' }}>{c.quantity} {c.item.unit}</span>
                      </div>
                      {(c.serial_start || c.serial_end) && (
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">السيريالات:</span>
                          <span className="user-mobile-value" dir="ltr" style={{ fontWeight: 'bold', letterSpacing: '1px' }}>
                            {c.serial_start} {c.serial_end ? ` ➔ ${c.serial_end}` : ''}
                          </span>
                        </div>
                      )}
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">تاريخ الصرف:</span>
                        <span className="user-mobile-value">{c.assigned_at}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">حالة الصنف:</span>
                        <span className="user-mobile-value">{c.condition === 'new' ? 'جديد' : 'مستعمل'}</span>
                      </div>
                      
                      {c.status === 'active' && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                          <button 
                            className="btn-submit" 
                            style={{ width: '100%', backgroundColor: 'transparent', color: '#10b981', border: '1px solid currentColor', borderRadius: '8px' }}
                            onClick={() => handlePrintCustodyReceipt(c)}
                          >
                            <i className="fa-solid fa-print" style={{ marginLeft: '8px' }}></i>
                            طباعة إيصال التسليم
                          </button>
                          
                          <button 
                            className="btn-submit" 
                            style={{ width: '100%', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid currentColor', borderRadius: '8px' }}
                            onClick={() => handleReturnCustody(c.id)}
                          >
                            <i className="fa-solid fa-arrow-turn-down" style={{ marginLeft: '8px' }}></i>
                            تسجيل استرجاع العهدة
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'assign' && (
          <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '25px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <i className="fa-solid fa-arrow-up-right-from-square text-accent" style={{ color: 'var(--accent)', marginLeft: '10px' }}></i>
              إصدار نموذج صرف عهدة
            </h3>
            
            <form onSubmit={handleAssignCustody} className="user-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>الصنف المراد صرفه <span className="required">*</span></label>
                  <select 
                    required 
                    value={assignment.item_id}
                    onChange={(e) => setAssignment({...assignment, item_id: e.target.value})}
                  >
                    <option value="">اختر الصنف من المخزن...</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id} disabled={(i.stocks?.[0]?.quantity || 0) <= 0}>
                        {i.name} (المتوفر بالرصيد: {i.stocks?.[0]?.quantity || 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>نوع المستلم <span className="required">*</span></label>
                  <select 
                    value={assignment.recipient_type}
                    onChange={(e) => setAssignment({...assignment, recipient_type: e.target.value, recipient_id: ''})}
                  >
                    <option value="agent">وكيل / فرع</option>
                    <option value="employee">موظف عام</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>اسم المستلم <span className="required">*</span></label>
                  <select 
                    required 
                    value={assignment.recipient_id}
                    onChange={(e) => setAssignment({...assignment, recipient_id: e.target.value})}
                  >
                    <option value="">اختر اسم المستلم...</option>
                    {assignment.recipient_type === 'agent' ? (
                      agents.map(a => <option key={a.id} value={a.id}>{a.agency_name || a.agent_name}</option>)
                    ) : (
                      employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>الكمية المصروفة <span className="required">*</span></label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={assignment.quantity}
                    onChange={(e) => setAssignment({...assignment, quantity: parseInt(e.target.value)})}
                  />
                </div>

                <div className="form-group">
                  <label>حالة الصنف المسلم <span className="required">*</span></label>
                  <select 
                    value={assignment.condition}
                    onChange={(e) => setAssignment({...assignment, condition: e.target.value})}
                  >
                    <option value="new">جديد بقراطيسه</option>
                    <option value="used">مستعمل سابقاً</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>السيريال الأول / رقم بداية الدفتر</label>
                  <input 
                    type="text" 
                    dir="ltr"
                    placeholder="مثال: N-0001"
                    value={assignment.serial_start}
                    onChange={(e) => setAssignment({...assignment, serial_start: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>السيريال الأخير / رقم نهاية الدفتر</label>
                  <input 
                    type="text" 
                    dir="ltr"
                    placeholder="مثال: N-0100"
                    value={assignment.serial_end}
                    onChange={(e) => setAssignment({...assignment, serial_end: e.target.value})}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>ملاحظات الاستلام والتسليم</label>
                  <textarea 
                    rows={3}
                    placeholder="ضع أي تفاصيل إضافية متعلقة بالتسليم..."
                    value={assignment.notes}
                    onChange={(e) => setAssignment({...assignment, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '30px' }}>
                <button type="button" className="btn-cancel" onClick={() => setActiveTab('store')}>العودة</button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  <i className="fa-solid fa-check"></i> {submitting ? 'جاري الصرف والخصم من المخزن...' : 'اعتماد وتسجيل العهدة'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'log' && (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '4rem', opacity: 0.2, marginBottom: '20px' }}></i>
            <h3>سيتم توفير سجل تاريخي لجميع حركات المخازن في التحديث القادم</h3>
          </div>
        )}
      </div>

      {/* Modals Implementation */}

      {/* Create Item Modal */}
      {showAddModal && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-content user-form-modal">
            <div className="modal-header">
              <h3>{editingItemId ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد لتعريفة المخزن'}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)} aria-label="إغلاق">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveItem} className="user-form">
              <div className="form-group">
                <label>اسم الصنف (مثال: دفاتر تأمين اجباري، جهاز بصمة) <span className="required">*</span></label>
                <input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              
              <div className="form-group">
                <label>التصنيف <span className="required">*</span></label>
                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-submit"
                  style={{ width: 'fit-content', marginTop: '8px' }}
                  onClick={() => setShowCustomCategoryInput((prev) => !prev)}
                >
                  {showCustomCategoryInput ? 'إلغاء إضافة تصنيف جديد' : '+ إضافة تصنيف جديد'}
                </button>
              </div>

              {showCustomCategoryInput && (
                <div className="form-group">
                  <label>اسم التصنيف الجديد <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="مثال: أدوات مكتبية"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>وحدة القياس</label>
                  <input type="text" placeholder="مثال: قطعة، دفتر" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>سعر الصنف (اختياري)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="مثال: 150"
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>حد الإنذار للنواقص <span className="required">*</span></label>
                  <input type="number" value={newItem.min_threshold} onChange={e => setNewItem({...newItem, min_threshold: parseInt(e.target.value)})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>الكمية الحالية بالمخزن</label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value || '0')})}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>موقع التخزين</label>
                  <input
                    type="text"
                    placeholder="مثلاً: الطابق الثاني - الرف 4"
                    value={newItem.location}
                    onChange={e => setNewItem({...newItem, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)} disabled={submitting}>إلغاء</button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'جاري الحفظ...' : (editingItemId ? 'حفظ التعديلات' : 'حفظ الصنف')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
