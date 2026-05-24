import React, { useState, useEffect, useRef } from 'react';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";
import { generatePremiumExcel } from '../utils/excelGenerator';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch (e) {
    return dateStr;
  }
};

interface StoreItem {
  id: number;
  name: string;
  category: string;
  inventory_type?: 'fixed' | 'consumable';
  unit: string;
  price?: number;
  unit_price?: number;
  min_threshold: number;
  stocks: { quantity: number; warehouse_location: string }[];
}

interface Custody {
  id: number;
  batch_ref?: string | null;
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

interface InventoryMovement {
  id: number;
  type: 'issue' | 'return' | 'loss' | 'damage';
  quantity: number;
  notes?: string;
  created_at: string;
  item: {
    id?: number;
    name?: string;
    inventory_type?: 'fixed' | 'consumable';
  };
  recipient: {
    id?: number;
    type: 'agent' | 'employee';
    name: string;
  };
  processor: {
    id?: number;
    name: string;
  };
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
  const [filterInventoryType, setFilterInventoryType] = useState<'all' | 'fixed' | 'consumable'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterQuantityStatus, setFilterQuantityStatus] = useState<'all' | 'low' | 'available' | 'out'>('all');
  const [custodyFilterType, setCustodyFilterType] = useState<'all' | 'fixed' | 'consumable'>('all');
  const [custodyFilterStatus, setCustodyFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [custodyFilterRecipientType, setCustodyFilterRecipientType] = useState<'all' | 'agent' | 'employee'>('all');
  const [custodyFilterRecipient, setCustodyFilterRecipient] = useState('');
  const [custodyFilterItem, setCustodyFilterItem] = useState('');
  const [custodyFilterFromDate, setCustodyFilterFromDate] = useState('');
  const [custodyFilterToDate, setCustodyFilterToDate] = useState('');
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementFilterType, setMovementFilterType] = useState<'all' | 'issue' | 'return' | 'loss' | 'damage'>('all');
  const [movementFilterRecipientType, setMovementFilterRecipientType] = useState<'all' | 'agent' | 'employee'>('all');
  const [movementFilterFromDate, setMovementFilterFromDate] = useState('');
  const [movementFilterToDate, setMovementFilterToDate] = useState('');
  const [movementFilterItem, setMovementFilterItem] = useState('');
  const [movementFilterRecipient, setMovementFilterRecipient] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // Form states
  const getDefaultItemForm = () => ({
    name: '',
    inventory_type: 'consumable' as 'fixed' | 'consumable',
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
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const recipientDropdownRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assignInventoryType, setAssignInventoryType] = useState<'fixed' | 'consumable'>('fixed');
  const [assignmentItems, setAssignmentItems] = useState<Array<{
    item_id: string;
    quantity: number;
    serial_start: string;
    serial_end: string;
    condition: string;
    notes: string;
  }>>([
    { item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new', notes: '' }
  ]);

  const getBatchKey = (custody: Custody) =>
    custody.batch_ref || `single-${custody.id}`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const itemsRes = await fetch(`${API_BASE_URL}/inventory/items?t=${Date.now()}`, { 
        cache: 'no-store',
        headers 
      });
      const itemsData = await itemsRes.json();
      setItems(Array.isArray(itemsData) ? itemsData : []);

      const custodyRes = await fetch(`${API_BASE_URL}/inventory/custody`, { headers });
      const custodyData = await custodyRes.json();
      setCustodies(Array.isArray(custodyData) ? custodyData : []);

      setMovementsLoading(true);
      const movementsRes = await fetch(`${API_BASE_URL}/inventory/movements`, { headers });
      const movementsData = await movementsRes.json();
      setMovements(Array.isArray(movementsData) ? movementsData : []);

      // Fetch agents and employees
      const agentsRes = await fetch(`${API_BASE_URL}/branches-agents`, { headers });
      const agentsData = await agentsRes.json();
      setAgents(Array.isArray(agentsData) ? agentsData : []);

      const employeesRes = await fetch(`${API_BASE_URL}/users?active=1&per_page=1000`, { headers });
      const employeesData = await employeesRes.json();
      const employeesList = Array.isArray(employeesData)
        ? employeesData
        : (Array.isArray(employeesData?.data) ? employeesData.data : []);
      setEmployees(employeesList);

    } catch (error) {
      console.error('Error fetching inventory data:', error);
      showToast('حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      setMovementsLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(event.target as Node)) {
        setShowRecipientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        inventory_type: newItem.inventory_type,
        category: selectedCategory,
        unit: newItem.unit,
        min_threshold: Number(newItem.min_threshold) || 0,
        price: newItem.price === '' ? null : Number(newItem.price),
      };
      const token = localStorage.getItem('token');
      const isEditMode = editingItemId !== null;
      const itemRes = await fetch(isEditMode ? `${API_BASE_URL}/inventory/items/${editingItemId}` : `${API_BASE_URL}/inventory/items`, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
          const token = localStorage.getItem('token');
          const stockRes = await fetch(`${API_BASE_URL}/inventory/update-stock`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
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
      inventory_type: item.inventory_type ?? 'consumable',
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/inventory/items/${item.id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'فشل الحذف');
      }
      showToast(data.message || 'تم حذف الصنف بنجاح', 'success');
      await fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast((error as Error).message || 'تعذر حذف الصنف', 'error');
    }
  };

  const handleAssignCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignmentItems.length === 0 || assignmentItems.some((it) => !it.item_id)) {
      showToast('يرجى اختيار صنف واحد على الأقل', 'error');
      return;
    }

    const selectedItems = assignmentItems
      .map((it) => items.find((i) => String(i.id) === it.item_id))
      .filter(Boolean) as StoreItem[];
    const hasWrongType = selectedItems.some((it) => (it.inventory_type ?? 'consumable') !== assignInventoryType);
    if (hasWrongType) {
      showToast('يجب أن تكون كل الأصناف المختارة من نفس النوع المحدد', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const batchRef = `BATCH-${Date.now()}`;
      for (const row of assignmentItems) {
        const res = await fetch(`${API_BASE_URL}/inventory/assign-custody`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            ...assignment,
            inventory_type: assignInventoryType,
            batch_ref: batchRef,
            item_id: row.item_id,
            quantity: row.quantity,
            serial_start: row.serial_start,
            serial_end: row.serial_end,
            condition: row.condition,
            notes: row.notes || assignment.notes, // Use row-specific notes if provided, otherwise global
          })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'حدث خطأ أثناء التسليم');
        }
      }
      showToast('تم صرف العهدة بنجاح', 'success');
      setAssignment({ 
        item_id: '', recipient_id: '', recipient_type: 'agent', 
        quantity: 1, serial_start: '', serial_end: '', condition: 'new', notes: '' 
      });
      setRecipientSearch('');
      setAssignmentItems([{ item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new', notes: '' }]);
      fetchData();
      setActiveTab('custody');
    } catch (error) {
      console.error('Error assigning custody:', error);
      showToast((error as Error).message || 'حدث خطأ أثناء التسليم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const addAssignmentItemRow = () => {
    setAssignmentItems((prev) => [...prev, { item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new', notes: '' }]);
  };

  const removeAssignmentItemRow = (index: number) => {
    setAssignmentItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAssignmentItemRow = (index: number, key: 'item_id' | 'quantity' | 'serial_start' | 'serial_end' | 'condition' | 'notes', value: string | number) => {
    setAssignmentItems((prev) => prev.map((row, i) => i === index ? { ...row, [key]: value } : row));
  };

  const handleReturnCustodyGroup = async (group: Custody[]) => {
    const activeRows = group.filter((item) => item.status === 'active');
    if (activeRows.length === 0) {
      showToast('لا توجد أصناف نشطة داخل هذه العهدة', 'error');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من استرجاع كل أصناف هذه العهدة؟ (${activeRows.length} صنف)`)) return;

    try {
      const token = localStorage.getItem('token');
      for (const row of activeRows) {
        const res = await fetch(`${API_BASE_URL}/inventory/return-custody/${row.id}`, { 
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          throw new Error('تعذر استرجاع بعض الأصناف');
        }
      }
      showToast('تم استرجاع كل أصناف العهدة بنجاح', 'success');
      fetchData();
    } catch (error) {
      console.error('Error returning custody group:', error);
      showToast((error as Error).message || 'حدث خطأ أثناء استرجاع العهدة', 'error');
    }
  };

  const buildBatchReceiptSection = (batch: Custody[]) => {
    const main = batch[0];
    const rows = batch.map((c, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${c.item.name}</td>
        <td>${getCategoryName(c.item.category)}</td>
        <td>${c.quantity} ${c.item.unit}</td>
        <td dir="ltr" style="text-align: right;">${c.serial_start || '-'} ${c.serial_end ? `➔ ${c.serial_end}` : ''}</td>
        <td>${c.condition === 'new' ? 'جديد' : 'مستعمل'}</td>
        <td>${c.notes || '-'}</td>
      </tr>
    `).join('');

    return `
      <section class="receipt-page">
        <div class="header">
          <div class="header-text">
            <h1>شركة المدار الليبي للتأمين</h1>
            <h2>نموذج إقرار استلام عهدة (أصول / مستندات)</h2>
          </div>
          <img src="/img/logo.png" alt="المدار الليبي للتأمين" class="logo" />
        </div>

        <p><strong>تاريخ وتوقيت الصرف:</strong> ${formatDateTime(main.assigned_at)}</p>
        <p><strong>الرقم المرجعي لتسجيل العهدة:</strong> #${main.id.toString().padStart(5, '0')}</p>
        <p><strong>نوع العهدة:</strong> ${getInventoryTypeName(main.item.inventory_type)}</p>
        <p><strong>الجهة المستلمة:</strong> ${main.recipient.agency_name || main.recipient.name}</p>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>الصنف</th>
              <th>التصنيف</th>
              <th>الكمية</th>
              <th>السيريال</th>
              <th>الحالة</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
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
      </section>
    `;
  };

  const printBatches = (batches: Custody[][], title: string) => {
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (!printWindow) {
      showToast('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة', 'error');
      return;
    }
    const sections = batches.map((b) => buildBatchReceiptSection(b)).join('');
    const html = `
      <html dir="rtl"><head><title>${title}</title>
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
      body { font-family: 'Cairo', sans-serif; padding: 20px 40px; color: #111; font-size: 15px; line-height: 1.5; }
      .receipt-page { page-break-after: always; margin-bottom: 20px; }
      .receipt-page:last-child { page-break-after: auto; }
      .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; border-bottom: 3px double #000; padding-bottom: 15px; }
      .header-text { text-align: right; flex: 1; } .header img.logo { max-width: 140px; height: auto; }
      .header h1 { margin: 0 0 5px 0; font-size: 26px; color: #014cb1; font-weight: 800; } .header h2 { margin: 0; font-size: 18px; color: #333; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 25px; margin-top: 15px; }
      th, td { padding: 10px 12px; border: 1px solid #000; text-align: right; }
      th { background-color: #f1f5f9; font-weight: 700; color: #0f172a; }
      td { font-weight: 600; color: #1e293b; }
      .signatures { display: flex; justify-content: space-around; margin-top: 40px; padding-top: 10px; }
      .signature-box { text-align: center; width: 35%; } .signature-line { border-bottom: 2px dashed #64748b; margin-top: 40px; }
      .declaration { font-size: 14px; font-weight: 600; color: #334155; text-align: justify; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; background: #f8fafc; margin-bottom: 15px; }
      @media print { @page { margin: 10mm; size: A4 portrait; } body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head>
      <body onload="setTimeout(() => window.print(), 500);">${sections}</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintCustodyReceipt = (custody: Custody) => {
    const batchKey = getBatchKey(custody);
    const batch = custodies.filter((c) => getBatchKey(c) === batchKey);
    printBatches([batch.length ? batch : [custody]], 'إيصال استلام عهدة');
  };

  const handlePrintAllCustodyReceipts = (custodyList: Custody[]) => {
    if (!custodyList.length) {
      showToast('لا توجد عهدة للطباعة', 'error');
      return;
    }
    const grouped = custodyList.reduce((acc, item) => {
      const key = getBatchKey(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, Custody[]>);
    printBatches(Object.values(grouped), 'طباعة جميع إيصالات العهد');
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = { paper: 'ورقيات/دفاتر', electronic: 'أجهزة إلكترونية', furniture: 'أثاث/معدات', other: 'أخرى' };
    return names[category] || category;
  };

  const getInventoryTypeName = (inventoryType?: string) => {
    return inventoryType === 'fixed' ? 'مخزون ثابت' : 'مخزون مستهلك';
  };
  const getMovementTypeName = (type: InventoryMovement['type']) => {
    const labels: Record<InventoryMovement['type'], string> = {
      issue: 'صرف عهدة',
      return: 'استرجاع عهدة',
      loss: 'فقد',
      damage: 'تلف',
    };
    return labels[type] || type;
  };
  const getRecipientTypeName = (type: 'agent' | 'employee') => (type === 'agent' ? 'وكيل / فرع' : 'موظف عام');
  const assignableItems = items.filter((i) => (i.inventory_type ?? 'consumable') === assignInventoryType);

  const filteredItems = items.filter((i) => {
    const matchesSearch = i.name.includes(searchTerm.trim());
    const matchesType = filterInventoryType === 'all' || i.inventory_type === filterInventoryType;
    const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
    const qty = i.stocks?.[0]?.quantity || 0;
    const isLow = qty <= i.min_threshold;
    const matchesQty =
      filterQuantityStatus === 'all' ||
      (filterQuantityStatus === 'out' && qty <= 0) ||
      (filterQuantityStatus === 'low' && qty > 0 && isLow) ||
      (filterQuantityStatus === 'available' && qty > i.min_threshold);
    return matchesSearch && matchesType && matchesCategory && matchesQty;
  });
  const custodyGroups = Object.values(
    custodies.reduce((acc, custody) => {
      const key = getBatchKey(custody);
      if (!acc[key]) acc[key] = [];
      acc[key].push(custody);
      return acc;
    }, {} as Record<string, Custody[]>)
  );
  const filteredCustodyGroups = custodyGroups.filter((group) => {
    const main = group[0];
    const isActive = group.some((item) => item.status === 'active');
    const groupType = main.item.inventory_type ?? 'consumable';
    const recipientName = (main.recipient.agency_name || main.recipient.name || '').toLowerCase();
    const itemNames = group.map((entry) => entry.item.name.toLowerCase()).join(' ');
    const itemQuery = custodyFilterItem.trim().toLowerCase();
    const recipientQuery = custodyFilterRecipient.trim().toLowerCase();

    // Date filtering based on assigned_at
    const rowDate = main.assigned_at ? new Date(main.assigned_at.replace(' ', 'T')) : null;
    const fromDate = custodyFilterFromDate ? new Date(`${custodyFilterFromDate}T00:00:00`) : null;
    const toDate = custodyFilterToDate ? new Date(`${custodyFilterToDate}T23:59:59`) : null;
    const matchesFrom = !fromDate || (rowDate && rowDate >= fromDate);
    const matchesTo = !toDate || (rowDate && rowDate <= toDate);

    const matchesType = custodyFilterType === 'all' || groupType === custodyFilterType;
    const matchesStatus =
      custodyFilterStatus === 'all' ||
      (custodyFilterStatus === 'active' && isActive) ||
      (custodyFilterStatus === 'inactive' && !isActive);
    const matchesRecipientType = custodyFilterRecipientType === 'all' || main.recipient_type === custodyFilterRecipientType;
    const matchesRecipient = !recipientQuery || recipientName.includes(recipientQuery);
    const matchesItem = !itemQuery || itemNames.includes(itemQuery);
    return matchesType && matchesStatus && matchesRecipientType && matchesRecipient && matchesItem && matchesFrom && matchesTo;
  });
  const filteredMovements = movements.filter((row) => {
    const rowDate = row.created_at ? new Date(row.created_at) : null;
    const fromDate = movementFilterFromDate ? new Date(`${movementFilterFromDate}T00:00:00`) : null;
    const toDate = movementFilterToDate ? new Date(`${movementFilterToDate}T23:59:59`) : null;
    const itemName = (row.item?.name || '').toLowerCase();
    const recipientName = (row.recipient?.name || '').toLowerCase();
    const itemQuery = movementFilterItem.trim().toLowerCase();
    const recipientQuery = movementFilterRecipient.trim().toLowerCase();

    const matchesType = movementFilterType === 'all' || row.type === movementFilterType;
    const matchesRecipientType = movementFilterRecipientType === 'all' || row.recipient?.type === movementFilterRecipientType;
    const matchesItem = !itemQuery || itemName.includes(itemQuery);
    const matchesRecipient = !recipientQuery || recipientName.includes(recipientQuery);
    const matchesFrom = !fromDate || (rowDate && rowDate >= fromDate);
    const matchesTo = !toDate || (rowDate && rowDate <= toDate);

    return matchesType && matchesRecipientType && matchesItem && matchesRecipient && matchesFrom && matchesTo;
  });
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

  const handlePrintMainInventoryReport = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const printWindow = window.open('', '', 'width=1100,height=850');
    if (!printWindow) {
      showToast('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة', 'error');
      return;
    }

    let grandTotalValue = 0;

    const rows = filteredItems.map((item, index) => {
      const price = getItemPrice(item) || 0;
      const qty = item.stocks?.[0]?.quantity || 0;
      const totalValue = price * qty;
      grandTotalValue += totalValue;

      return `
        <tr>
          <td>${index + 1}</td>
          <td style="text-align: right; font-weight: bold;">${item.name}</td>
          <td>${getInventoryTypeName(item.inventory_type)}</td>
          <td>${getCategoryName(item.category)}</td>
          <td>${item.unit || 'قطعة'}</td>
          <td>${qty}</td>
          <td>${price.toLocaleString()} د.ل</td>
          <td>${totalValue.toLocaleString()} د.ل</td>
          <td>${item.stocks?.[0]?.warehouse_location || '-'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html dir="rtl">
      <head>
        <title>تقرير المخزن الرئيسي</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 10px; color: #000; background-color: #fff; }
          .report-container { border: 2px solid #000; padding: 15px; margin: 0 auto; max-width: 1100px; box-sizing: border-box; }
          .report-header { display: flex; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; justify-content: space-between; align-items: stretch; }
          .header-side { width: 25%; border: 1px solid #000; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; font-size: 13px; font-weight: bold; box-sizing: border-box; }
          .header-center { width: 48%; border: 1px solid #000; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; }
          .header-center h1 { margin: 0; font-size: 24px; font-weight: 800; color: #000; }
          .header-center h2 { margin: 5px 0 0 0; font-size: 16px; font-weight: 700; color: #000; border-top: 1px solid #000; width: 100%; padding-top: 5px; }
          .logo-box { display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
          .logo-box img { max-height: 55px; width: auto; margin-bottom: 4px; }
          table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; margin-top: 10px; }
          table.report-table th, table.report-table td { border: 1px solid #000; padding: 8px 6px; text-align: center; font-size: 12px; font-weight: 600; }
          table.report-table th { background-color: #e2e8f0; font-weight: 700; }
          .total-row { background-color: #f1f5f9; font-weight: bold !important; }
          .footer-note { font-size: 11px; color: #475569; text-align: left; margin-top: 10px; }
          @media print { 
            @page { margin: 10mm; } 
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .report-container { border: 2px solid #000 !important; }
          }
        </style>
      </head>
      <body onload="setTimeout(() => window.print(), 500);">
        <div class="report-container">
          <div class="report-header">
            <div class="header-side" style="text-align: right; justify-content: center;">
              <div style="display: flex; justify-content: space-between;">
                <span>تاريخ التقرير:</span>
                <span>${new Date().toLocaleDateString('ar-LY')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                <span>إجمالي الأصناف:</span>
                <span>${filteredItems.length}</span>
              </div>
            </div>
            
            <div class="header-center">
              <h1>المدار الليبي للتأمين</h1>
              <h2>تقرير المخزن الرئيسي</h2>
            </div>
            
            <div class="header-side logo-box">
              <img src="/img/logo.png" alt="لوجو" onerror="this.src='https://placehold.co/120x50?text=Logo'" />
              <div style="font-size: 11px; margin-top: 4px;">اسم المستخدم: ${currentUser.name || currentUser.username || 'مرام'}</div>
            </div>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 3%;">م</th>
                <th style="width: 25%; text-align: right;">اسم الصنف</th>
                <th style="width: 12%;">النوع</th>
                <th style="width: 12%;">التصنيف</th>
                <th style="width: 8%;">الوحدة</th>
                <th style="width: 10%;">الكمية</th>
                <th style="width: 10%;">السعر</th>
                <th style="width: 10%;">الإجمالي</th>
                <th style="width: 10%;">الموقع</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows : `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">لا توجد أصناف مطابقة للفلاتر المحددة</td></tr>`}
              <tr class="total-row">
                <td colspan="7" style="text-align: left; padding-left: 20px;">المجموع العام</td>
                <td>${grandTotalValue.toLocaleString()} د.ل</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="footer-note">تاريخ الاستخراج: ${new Date().toLocaleString('ar-LY')}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportFixedAssetsReport = async () => {
    const fixedCustodies = custodies.filter(c => (c.item.inventory_type ?? 'consumable') === 'fixed' && c.status === 'active');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    let grandTotalValue = 0;
    let grandTotalDepreciation = 0;
    
    try {
      const columns = [
        { header: '#', key: 'index', width: 8 },
        { header: 'الصنف', key: 'name', width: 35 },
        { header: 'الكمية', key: 'quantity', width: 15 },
        { header: 'المستلم', key: 'recipient', width: 30 },
        { header: 'تاريخ الصرف', key: 'date', width: 20 },
        { header: 'إجمالي القيمة', key: 'total_value', width: 20 },
        { header: 'قيمة الاستهلاك', key: 'depreciation', width: 20 },
        { header: 'التفاصيل', key: 'details', width: 35 },
      ];

      const data = fixedCustodies.map((c, index) => {
        const price = getItemPrice(c.item) || 0;
        const totalValue = price * c.quantity;
        
        const assignedDate = new Date(c.assigned_at);
        const years = Math.max(0, (new Date().getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
        const depreciationRate = 0.10; 
        const depreciationValue = totalValue * depreciationRate * years;
        
        grandTotalValue += totalValue;
        grandTotalDepreciation += depreciationValue;
        
        return {
          index: index + 1,
          name: c.item.name,
          quantity: `${c.quantity} ${c.item.unit}`,
          recipient: c.recipient.agency_name || c.recipient.name,
          date: new Date(c.assigned_at).toLocaleDateString('ar-LY'),
          total_value: totalValue.toLocaleString() + ' د.ل',
          depreciation: depreciationValue.toFixed(2) + ' د.ل',
          details: `${c.notes || '-'} ${c.serial_start ? `(S/N: ${c.serial_start})` : ''}`,
        };
      });

      // Summary row
      data.push({
        index: '-' as any,
        name: 'الإجمالي العام',
        quantity: '',
        recipient: '',
        date: '',
        total_value: grandTotalValue.toLocaleString() + ' د.ل',
        depreciation: grandTotalDepreciation.toLocaleString() + ' د.ل',
        details: '',
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير العهد والأصول الثابتة',
        subtitle: `إجمالي عدد الأصول: ${fixedCustodies.length} - تاريخ التقرير: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'العهد_الثابتة',
        qrData: `الأصول الثابتة - شركة المدار الليبي\nعدد الأصناف: ${fixedCustodies.length}\nإجمالي القيمة: ${grandTotalValue.toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير تقرير الأصول الثابتة بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  const handleExportConsumableAssetsReport = async () => {
    const consumableCustodies = custodies.filter(c => (c.item.inventory_type ?? 'consumable') === 'consumable' && c.status === 'active');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    let grandTotalValue = 0;

    try {
      const columns = [
        { header: '#', key: 'index', width: 8 },
        { header: 'الصنف', key: 'name', width: 35 },
        { header: 'الكمية', key: 'quantity', width: 15 },
        { header: 'المستلم', key: 'recipient', width: 30 },
        { header: 'تاريخ الصرف', key: 'date', width: 20 },
        { header: 'إجمالي القيمة', key: 'total_value', width: 20 },
        { header: 'التفاصيل', key: 'details', width: 35 },
      ];

      const data = consumableCustodies.map((c, index) => {
        const price = getItemPrice(c.item) || 0;
        const totalValue = price * c.quantity;
        grandTotalValue += totalValue;
        
        return {
          index: index + 1,
          name: c.item.name,
          quantity: `${c.quantity} ${c.item.unit}`,
          recipient: c.recipient.agency_name || c.recipient.name,
          date: new Date(c.assigned_at).toLocaleDateString('ar-LY'),
          total_value: totalValue.toLocaleString() + ' د.ل',
          details: c.notes || '-',
        };
      });

      // Summary row
      data.push({
        index: '-' as any,
        name: 'إجمالي قيمة العهد المستهلكة',
        quantity: '',
        recipient: '',
        date: '',
        total_value: grandTotalValue.toLocaleString() + ' د.ل',
        details: '',
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير العهد والمخازن (المواد المستهلكة)',
        subtitle: `إجمالي عدد العهد: ${consumableCustodies.length} - تاريخ التقرير: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'العهد_المستهلكة',
        qrData: `العهد المستهلكة - شركة المدار الليبي\nعدد العهد: ${consumableCustodies.length}\nإجمالي القيمة: ${grandTotalValue.toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير تقرير العهد المستهلكة بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  const handlePrintFixedCustodyReport = () => {
    const fixedCustodies = filteredCustodyGroups
      .flat()
      .filter(c => (c.item.inventory_type ?? 'consumable') === 'fixed' && c.status === 'active');

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const printWindow = window.open('', '', 'width=1100,height=850');
    if (!printWindow) {
      showToast('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة', 'error');
      return;
    }

    let grandTotalValue = 0;
    let grandTotalNet = 0;

    const rows = fixedCustodies.map((c, index) => {
      const price = getItemPrice(c.item) || 0;
      const totalValue = price * c.quantity;
      const depreciationRate = 0.20; 
      const netValue = totalValue * (1 - depreciationRate);

      grandTotalValue += totalValue;
      grandTotalNet += netValue;

      return `
        <tr>
          <td>${index + 1}</td>
          <td style="text-align: right;">${c.item.name}</td>
          <td>${c.recipient.agency_name || c.recipient.name || '-'}</td>
          <td>${new Date(c.assigned_at).toLocaleDateString('ar-LY')}</td>
          <td>مخزون ثابت</td>
          <td>${getCategoryName(c.item.category)}</td>
          <td>${c.item.unit || 'قطعة'}</td>
          <td>${c.condition === 'new' ? 'جديد' : 'مستعمل'}</td>
          <td>${c.quantity}</td>
          <td>${price.toLocaleString()} د.ل</td>
          <td>${totalValue.toLocaleString()} د.ل</td>
          <td>20%</td>
          <td>${netValue.toLocaleString()} د.ل</td>
          <td style="text-align: right;">${c.notes || '-'} ${c.serial_start ? `(S/N: ${c.serial_start})` : ''}</td>
        </tr>
      `;
    }).join('');

    const fromDateStr = custodyFilterFromDate ? custodyFilterFromDate.replace(/-/g, '/') : '2024/01/01';
    const toDateStr = custodyFilterToDate ? custodyFilterToDate.replace(/-/g, '/') : new Date().toLocaleDateString('zh-Hans-CN');

    const html = `
      <html dir="rtl">
      <head>
        <title>تقرير العهد والأصول الثابتة</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 10px; color: #000; background-color: #fff; }
          .report-container { border: 2px solid #000; padding: 15px; margin: 0 auto; max-width: 1100px; box-sizing: border-box; }
          .report-header { display: flex; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; justify-content: space-between; align-items: stretch; }
          .header-side { width: 25%; border: 1px solid #000; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; font-size: 13px; font-weight: bold; box-sizing: border-box; }
          .header-center { width: 48%; border: 1px solid #000; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; }
          .header-center h1 { margin: 0; font-size: 24px; font-weight: 800; color: #000; }
          .header-center h2 { margin: 5px 0 0 0; font-size: 16px; font-weight: 700; color: #000; border-top: 1px solid #000; width: 100%; padding-top: 5px; }
          .logo-box { display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
          .logo-box img { max-height: 55px; width: auto; margin-bottom: 4px; }
          table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; margin-top: 10px; }
          table.report-table th, table.report-table td { border: 1px solid #000; padding: 8px 6px; text-align: center; font-size: 12px; font-weight: 600; }
          table.report-table th { background-color: #e2e8f0; font-weight: 700; }
          .total-row { background-color: #f1f5f9; font-weight: bold !important; }
          .footer-note { font-size: 11px; color: #475569; text-align: left; margin-top: 10px; }
          @media print { 
            @page { margin: 10mm; } 
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .report-container { border: 2px solid #000 !important; }
          }
        </style>
      </head>
      <body onload="setTimeout(() => window.print(), 500);">
        <div class="report-container">
          <div class="report-header">
            <div class="header-side" style="text-align: right;">
              <div style="display: flex; justify-content: space-between;">
                <span>من:</span>
                <span>${fromDateStr}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                <span>الى:</span>
                <span>${toDateStr}</span>
              </div>
            </div>
            
            <div class="header-center">
              <h1>المدار الليبي للتأمين</h1>
              <h2>تقرير العهد الثابتة</h2>
            </div>
            
            <div class="header-side logo-box">
              <img src="/img/logo.png" alt="لوجو" onerror="this.src='https://placehold.co/120x50?text=Logo'" />
              <div style="font-size: 11px; margin-top: 4px;">اسم المستخدم: ${currentUser.name || currentUser.username || 'مرام'}</div>
            </div>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 3%;">م</th>
                <th style="width: 12%; text-align: right;">اسم الصنف</th>
                <th style="width: 13%; text-align: right;">المستلم</th>
                <th style="width: 8%;">تاريخ الصرف</th>
                <th style="width: 6%;">نوع المخزون</th>
                <th style="width: 8%;">التصنيف</th>
                <th style="width: 5%;">الوحدة</th>
                <th style="width: 5%;">الحالة</th>
                <th style="width: 4%;">الكمية</th>
                <th style="width: 6%;">السعر</th>
                <th style="width: 7%;">القيمة</th>
                <th style="width: 6%;">الاستهلاك</th>
                <th style="width: 7%;">الصافي</th>
                <th style="width: 10%; text-align: right;">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows : `<tr><td colspan="14" style="text-align: center; padding: 20px; color: #64748b;">لا توجد عهد ثابتة مطابقة للفلاتر المحددة</td></tr>`}
              <tr class="total-row">
                <td colspan="10" style="text-align: left; padding-left: 20px;">المجموع العام</td>
                <td>${grandTotalValue.toLocaleString()} د.ل</td>
                <td>—</td>
                <td>${grandTotalNet.toLocaleString()} د.ل</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="footer-note">تاريخ الاستخراج: ${new Date().toLocaleString('ar-LY')}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintConsumedCustodyReport = () => {
    const consumableCustodies = filteredCustodyGroups
      .flat()
      .filter(c => (c.item.inventory_type ?? 'consumable') === 'consumable' && c.status === 'active');

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const printWindow = window.open('', '', 'width=1100,height=850');
    if (!printWindow) {
      showToast('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة', 'error');
      return;
    }

    let grandTotalValue = 0;

    const rows = consumableCustodies.map((c, index) => {
      const price = getItemPrice(c.item) || 0;
      const totalValue = price * c.quantity;

      grandTotalValue += totalValue;

      return `
        <tr>
          <td>${index + 1}</td>
          <td style="text-align: right;">${c.item.name}</td>
          <td>${c.recipient.agency_name || c.recipient.name || '-'}</td>
          <td>${new Date(c.assigned_at).toLocaleDateString('ar-LY')}</td>
          <td>مخزون مستهلك</td>
          <td>${getCategoryName(c.item.category)}</td>
          <td>${c.item.unit || 'قطعة'}</td>
          <td>${c.condition === 'new' ? 'جديد' : 'مستعمل'}</td>
          <td>${c.quantity}</td>
          <td>${price.toLocaleString()} د.ل</td>
          <td>${totalValue.toLocaleString()} د.ل</td>
          <td style="text-align: right;">${c.notes || '-'}</td>
        </tr>
      `;
    }).join('');

    const fromDateStr = custodyFilterFromDate ? custodyFilterFromDate.replace(/-/g, '/') : '2024/01/01';
    const toDateStr = custodyFilterToDate ? custodyFilterToDate.replace(/-/g, '/') : new Date().toLocaleDateString('zh-Hans-CN');

    const html = `
      <html dir="rtl">
      <head>
        <title>تقرير العهد المستهلكة</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 10px; color: #000; background-color: #fff; }
          .report-container { border: 2px solid #000; padding: 15px; margin: 0 auto; max-width: 1100px; box-sizing: border-box; }
          .report-header { display: flex; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; justify-content: space-between; align-items: stretch; }
          .header-side { width: 25%; border: 1px solid #000; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; font-size: 13px; font-weight: bold; box-sizing: border-box; }
          .header-center { width: 48%; border: 1px solid #000; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; }
          .header-center h1 { margin: 0; font-size: 24px; font-weight: 800; color: #000; }
          .header-center h2 { margin: 5px 0 0 0; font-size: 16px; font-weight: 700; color: #000; border-top: 1px solid #000; width: 100%; padding-top: 5px; }
          .logo-box { display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
          .logo-box img { max-height: 55px; width: auto; margin-bottom: 4px; }
          table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; margin-top: 10px; }
          table.report-table th, table.report-table td { border: 1px solid #000; padding: 8px 6px; text-align: center; font-size: 12px; font-weight: 600; }
          table.report-table th { background-color: #e2e8f0; font-weight: 700; }
          .total-row { background-color: #f1f5f9; font-weight: bold !important; }
          .footer-note { font-size: 11px; color: #475569; text-align: left; margin-top: 10px; }
          @media print { 
            @page { margin: 10mm; } 
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .report-container { border: 2px solid #000 !important; }
          }
        </style>
      </head>
      <body onload="setTimeout(() => window.print(), 500);">
        <div class="report-container">
          <div class="report-header">
            <div class="header-side" style="text-align: right;">
              <div style="display: flex; justify-content: space-between;">
                <span>من:</span>
                <span>${fromDateStr}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                <span>الى:</span>
                <span>${toDateStr}</span>
              </div>
            </div>
            
            <div class="header-center">
              <h1>المدار الليبي للتأمين</h1>
              <h2>تقرير العهد المستهلكة</h2>
            </div>
            
            <div class="header-side logo-box">
              <img src="/img/logo.png" alt="لوجو" onerror="this.src='https://placehold.co/120x50?text=Logo'" />
              <div style="font-size: 11px; margin-top: 4px;">اسم المستخدم: ${currentUser.name || currentUser.username || 'مرام'}</div>
            </div>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 3%;">م</th>
                <th style="width: 15%; text-align: right;">اسم الصنف</th>
                <th style="width: 15%; text-align: right;">المستلم</th>
                <th style="width: 8%;">تاريخ الصرف</th>
                <th style="width: 8%;">نوع المخزون</th>
                <th style="width: 8%;">التصنيف</th>
                <th style="width: 6%;">الوحدة</th>
                <th style="width: 6%;">الحالة</th>
                <th style="width: 6%;">الكمية</th>
                <th style="width: 8%;">السعر</th>
                <th style="width: 8%;">الإجمالي</th>
                <th style="width: 11%; text-align: right;">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows : `<tr><td colspan="12" style="text-align: center; padding: 20px; color: #64748b;">لا توجد عهد مستهلكة مطابقة للفلاتر المحددة</td></tr>`}
              <tr class="total-row">
                <td colspan="10" style="text-align: left; padding-left: 20px;">المجموع العام</td>
                <td>${grandTotalValue.toLocaleString()} د.ل</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="footer-note">تاريخ الاستخراج: ${new Date().toLocaleString('ar-LY')}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const totalWarehouseQty = items.reduce((acc, item) => acc + (Number(item.stocks?.[0]?.quantity) || 0), 0);
  const activeCustodyCount = custodies.filter(c => c.status === 'active').reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
  const activeFixedCustodyCount = custodies.filter(c => c.status === 'active' && (c.item.inventory_type === 'fixed')).reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
  const lowStockCount = items.filter(item => (item.stocks?.[0]?.quantity || 0) <= item.min_threshold).length;

  return (
    <section className="users-management">
      <div className="inventory-dashboard-wrapper">
        <div className="users-breadcrumb">
          <span>الشؤون المالية / إدارة المخازن والعهدة المالية</span>
        </div>

        {/* Premium KPI Stats Cards Grid */}
        <div className="premium-stats-grid">
          <div className="premium-stat-card">
            <div className="premium-stat-icon-wrapper kpi-total">
              <i className="fa-solid fa-warehouse"></i>
            </div>
            <div className="premium-stat-info">
              <div className="premium-stat-value">{totalWarehouseQty.toLocaleString()}</div>
              <div className="premium-stat-label">إجمالي المخزون بالمخزن</div>
            </div>
          </div>
          <div className="premium-stat-card">
            <div className="premium-stat-icon-wrapper kpi-fixed">
              <i className="fa-solid fa-couch"></i>
            </div>
            <div className="premium-stat-info">
              <div className="premium-stat-value">{activeFixedCustodyCount.toLocaleString()}</div>
              <div className="premium-stat-label">عهد الأصول الثابتة النشطة</div>
            </div>
          </div>
          <div className="premium-stat-card">
            <div className="premium-stat-icon-wrapper kpi-consumable">
              <i className="fa-solid fa-box-open"></i>
            </div>
            <div className="premium-stat-info">
              <div className="premium-stat-value">{activeCustodyCount.toLocaleString()}</div>
              <div className="premium-stat-label">إجمالي العهد النشطة المصروفة</div>
            </div>
          </div>
          <div className="premium-stat-card">
            <div className="premium-stat-icon-wrapper kpi-alert">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div className="premium-stat-info">
              <div className="premium-stat-value">{lowStockCount.toLocaleString()}</div>
              <div className="premium-stat-label">أصناف تحت حد الطلب</div>
            </div>
          </div>
        </div>

        {/* Premium Tab Switcher Container */}
        <div className="premium-tabs-container">
          <div className="premium-tabs-nav">
            <button className={`premium-tab-btn ${activeTab === 'store' ? 'active' : ''}`} onClick={() => setActiveTab('store')}>
              <i className="fa-solid fa-box"></i> المخزن الرئيسي
            </button>
            <button className={`premium-tab-btn ${activeTab === 'custody' ? 'active' : ''}`} onClick={() => setActiveTab('custody')}>
              <i className="fa-solid fa-user-check"></i> العهد الحالية
            </button>
            <button className={`premium-tab-btn ${activeTab === 'assign' ? 'active' : ''}`} onClick={() => setActiveTab('assign')}>
              <i className="fa-solid fa-arrow-up-right-from-square"></i> صرف عهدة
            </button>
            <button className={`premium-tab-btn ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
              <i className="fa-solid fa-clock-rotate-left"></i> سجل الحركات
            </button>
          </div>
          <button 
            className="premium-tab-btn" 
            style={{ backgroundColor: 'transparent', color: 'var(--accent-cyan)', border: 'none', cursor: 'pointer' }} 
            onClick={fetchData}
            title="تحديث البيانات"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> تحديث البيانات
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'store' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Premium Filter Bar */}
            <div className="premium-filter-bar">
              <div className="premium-filter-group filter-span-2">
                <label><i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--accent-cyan)' }}></i> بحث عن صنف</label>
                <input 
                  type="text" 
                  placeholder="بحث باسم الصنف..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="premium-filter-input"
                />
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-cyan)' }}></i> نوع المخزون</label>
                <select 
                  value={filterInventoryType} 
                  onChange={(e) => setFilterInventoryType(e.target.value as 'all' | 'fixed' | 'consumable')}
                  className="premium-filter-select"
                >
                  <option value="all">الكل</option>
                  <option value="fixed">مخزون ثابت</option>
                  <option value="consumable">مخزون مستهلك</option>
                </select>
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-tags" style={{ color: 'var(--accent-cyan)' }}></i> التصنيف</label>
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="premium-filter-select"
                >
                  <option value="all">كل التصنيفات</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-circle-exclamation" style={{ color: 'var(--accent-cyan)' }}></i> حالة الكمية</label>
                <select 
                  value={filterQuantityStatus} 
                  onChange={(e) => setFilterQuantityStatus(e.target.value as 'all' | 'low' | 'available' | 'out')}
                  className="premium-filter-select"
                >
                  <option value="all">الكل</option>
                  <option value="available">متوفر</option>
                  <option value="low">قرب النفاد</option>
                  <option value="out">نافد</option>
                </select>
              </div>
              
              <div className="premium-filter-actions-row">
                <button 
                  type="button" 
                  className="premium-reset-btn" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterInventoryType('all');
                    setFilterCategory('all');
                    setFilterQuantityStatus('all');
                  }}
                >
                  <i className="fa-solid fa-arrows-rotate"></i> تصفير الفلاتر
                </button>
                
                <div className="premium-action-buttons-group">
                  <button 
                    type="button"
                    className="premium-excel-btn" 
                    onClick={async () => {
                      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                      try {
                        const columns = [
                          { header: '#', key: 'index', width: 8 },
                          { header: 'الصنف', key: 'name', width: 35 },
                          { header: 'النوع', key: 'type', width: 20 },
                          { header: 'التصنيف', key: 'category', width: 20 },
                          { header: 'السعر', key: 'price', width: 15 },
                          { header: 'الكمية', key: 'quantity', width: 12 },
                          { header: 'الوحدة', key: 'unit', width: 12 },
                          { header: 'الموقع', key: 'location', width: 20 },
                        ];

                        const data = filteredItems.map((item, index) => ({
                          index: index + 1,
                          name: item.name,
                          type: getInventoryTypeName(item.inventory_type),
                          category: getCategoryName(item.category),
                          price: getItemPrice(item) ? item.price + ' د.ل' : '-',
                          quantity: item.stocks?.[0]?.quantity || 0,
                          unit: item.unit,
                          location: item.stocks?.[0]?.warehouse_location || '-',
                        }));

                        await generatePremiumExcel({
                          title: 'شركة المدار الليبي للتأمين - تقرير المخزن الرئيسي',
                          subtitle: `إجمالي الأصناف: ${filteredItems.length} - تاريخ التصدير: ${new Date().toLocaleDateString('ar-LY')}`,
                          columns,
                          data,
                          fileName: 'المخزن_الرئيسي',
                          qrData: `المخزن الرئيسي - شركة المدار الليبي\nعدد الأصناف: ${filteredItems.length}\nبواسطة: ${currentUser.name || 'النظام'}`
                        });

                        showToast('تم تصدير تقرير المخزن بنجاح', 'success');
                      } catch (error) {
                        showToast('حدث خطأ أثناء تصدير التقرير', 'error');
                      }
                    }}
                  >
                    <i className="fa-solid fa-file-excel"></i> تصدير Excel
                  </button>
                  <button 
                    type="button"
                    className="premium-primary-btn" 
                    onClick={handlePrintMainInventoryReport}
                    style={{ background: '#014cb1', color: '#fff', border: '1px solid #013a88' }}
                  >
                    <i className="fa-solid fa-print"></i> طباعة التقرير
                  </button>
                  <button 
                    type="button"
                    className="premium-primary-btn" 
                    onClick={openAddItemModal}
                  >
                    <i className="fa-solid fa-plus"></i> إضافة صنف
                  </button>
                </div>
              </div>
            </div>

            {/* Store Table */}
            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>جار التحميل...</p>
            ) : (
              <div className="premium-card-table-wrapper">
                <div className="premium-table-header-row">
                  <h3 className="premium-table-title">
                    <i className="fa-solid fa-boxes-stacked" style={{ color: 'var(--accent-cyan)' }}></i>
                    قائمة جرد وموجودات المخزن الرئيسي ({filteredItems.length} صنف)
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th style={{ width: '5%' }}>#</th>
                        <th style={{ width: '25%' }}>الصنف</th>
                        <th style={{ width: '12%' }}>نوع المخزون</th>
                        <th style={{ width: '15%' }}>التصنيف</th>
                        <th style={{ width: '12%' }}>سعر الصنف</th>
                        <th style={{ width: '10%' }}>الكمية المتوفرة</th>
                        <th style={{ width: '8%' }}>الوحدة</th>
                        <th style={{ width: '15%' }}>موقع التخزين</th>
                        <th style={{ width: '10%' }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                            <i className="fa-solid fa-box-open" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                            لا توجد أصناف في المخزن تناسب بحثك
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item, index) => {
                          const qty = item.stocks?.[0]?.quantity || 0;
                          const isLow = qty <= item.min_threshold;
                          return (
                            <tr key={item.id}>
                              <td>{index + 1}</td>
                              <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>{item.name}</td>
                              <td>
                                <span className={`premium-badge ${item.inventory_type === 'fixed' ? 'badge-purple' : 'badge-success'}`}>
                                  {item.inventory_type === 'fixed' ? 'مخزون ثابت' : 'مخزون مستهلك'}
                                </span>
                              </td>
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
                                <span className={`premium-badge ${isLow ? (qty === 0 ? 'badge-danger' : 'badge-warning') : 'badge-success'}`}>
                                  {qty} {isLow ? (qty === 0 ? '(نافد)' : '(منخفض)') : ''}
                                </span>
                              </td>
                              <td>{item.unit}</td>
                              <td>{item.stocks?.[0]?.warehouse_location || '-'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    className="action-btn edit"
                                    onClick={() => openEditItemModal(item)}
                                    title="تعديل الصنف"
                                    aria-label="تعديل الصنف"
                                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                                  >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() => handleDeleteItem(item)}
                                    title="حذف الصنف"
                                    aria-label="حذف الصنف"
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'custody' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Premium Filter Bar */}
            <div className="premium-filter-bar" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-cyan)' }}></i> نوع العهدة</label>
                <select 
                  value={custodyFilterType} 
                  onChange={(e) => setCustodyFilterType(e.target.value as 'all' | 'fixed' | 'consumable')}
                  className="premium-filter-select"
                >
                  <option value="all">كل الأنواع</option>
                  <option value="fixed">مخزون ثابت</option>
                  <option value="consumable">مخزون مستهلك</option>
                </select>
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-toggle-on" style={{ color: 'var(--accent-cyan)' }}></i> الحالة</label>
                <select 
                  value={custodyFilterStatus} 
                  onChange={(e) => setCustodyFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="premium-filter-select"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشطة</option>
                  <option value="inactive">غير نشطة</option>
                </select>
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-user-tag" style={{ color: 'var(--accent-cyan)' }}></i> تصنيف المستلم</label>
                <select 
                  value={custodyFilterRecipientType} 
                  onChange={(e) => setCustodyFilterRecipientType(e.target.value as 'all' | 'agent' | 'employee')}
                  className="premium-filter-select"
                >
                  <option value="all">كل المستلمين</option>
                  <option value="agent">وكيل / فرع</option>
                  <option value="employee">موظف عام</option>
                </select>
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-user" style={{ color: 'var(--accent-cyan)' }}></i> اسم المستلم</label>
                <input
                  type="text"
                  placeholder="بحث باسم المستلم..."
                  value={custodyFilterRecipient}
                  onChange={(e) => setCustodyFilterRecipient(e.target.value)}
                  className="premium-filter-input"
                />
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-box" style={{ color: 'var(--accent-cyan)' }}></i> الصنف داخل العهدة</label>
                <input
                  type="text"
                  placeholder="اسم الصنف..."
                  value={custodyFilterItem}
                  onChange={(e) => setCustodyFilterItem(e.target.value)}
                  className="premium-filter-input"
                />
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-calendar" style={{ color: 'var(--accent-cyan)' }}></i> من</label>
                <input
                  type="date"
                  value={custodyFilterFromDate}
                  onChange={(e) => setCustodyFilterFromDate(e.target.value)}
                  className="premium-filter-input"
                />
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-calendar" style={{ color: 'var(--accent-cyan)' }}></i> إلى</label>
                <input
                  type="date"
                  value={custodyFilterToDate}
                  onChange={(e) => setCustodyFilterToDate(e.target.value)}
                  className="premium-filter-input"
                />
              </div>
              
              <div className="premium-filter-actions-row">
                <button
                  type="button"
                  className="premium-reset-btn"
                  onClick={() => {
                    setCustodyFilterType('all');
                    setCustodyFilterStatus('all');
                    setCustodyFilterRecipientType('all');
                    setCustodyFilterRecipient('');
                    setCustodyFilterItem('');
                    setCustodyFilterFromDate('');
                    setCustodyFilterToDate('');
                  }}
                >
                  <i className="fa-solid fa-arrows-rotate"></i> تصفير الفلاتر
                </button>
                
                <div className="premium-action-buttons-group">
                  <button
                    type="button"
                    className="premium-primary-btn"
                    onClick={() => handlePrintAllCustodyReceipts(filteredCustodyGroups.flat())}
                    disabled={filteredCustodyGroups.length === 0}
                  >
                    <i className="fa-solid fa-print"></i> إيصالات التسليم
                  </button>
                  <button
                    type="button"
                    className="premium-secondary-btn"
                    onClick={handlePrintFixedCustodyReport}
                  >
                    <i className="fa-solid fa-print"></i> تقرير العهد الثابتة
                  </button>
                  <button
                    type="button"
                    className="premium-excel-btn"
                    onClick={handlePrintConsumedCustodyReport}
                  >
                    <i className="fa-solid fa-print"></i> تقرير العهد المستهلكة
                  </button>
                  <button
                    type="button"
                    className="premium-secondary-btn"
                    onClick={handleExportFixedAssetsReport}
                  >
                    <i className="fa-solid fa-file-excel"></i> تصدير الثابتة Excel
                  </button>
                  <button
                    type="button"
                    className="premium-excel-btn"
                    onClick={handleExportConsumableAssetsReport}
                  >
                    <i className="fa-solid fa-file-excel"></i> تصدير المستهلكة Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="premium-card-table-wrapper desktop-only">
              <div className="premium-table-header-row">
                <h3 className="premium-table-title">
                  <i className="fa-solid fa-receipt" style={{ color: 'var(--accent-cyan)' }}></i>
                  بيان وإيصالات العهد المالية المصروفة للمستلمين ({filteredCustodyGroups.length} حركة عهدة)
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '18%' }}>المستلم (الجهة)</th>
                      <th style={{ width: '12%' }}>نوع المستلم</th>
                      <th style={{ width: '12%' }}>تاريخ الصرف</th>
                      <th style={{ width: '12%' }}>نوع العهدة</th>
                      <th style={{ width: '23%' }}>الأصناف والكميات المصروفة</th>
                      <th style={{ width: '10%' }}>حالة العهدة</th>
                      <th style={{ width: '8%' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustodyGroups.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                          <i className="fa-solid fa-user-check" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                          لا توجد عهد مطابقة للفلاتر الحالية
                        </td>
                      </tr>
                    ) : (
                      filteredCustodyGroups.map((group, index) => {
                        const main = group[0];
                        const isActive = group.some((item) => item.status === 'active');
                        return (
                          <tr key={getBatchKey(main)}>
                            <td>{index + 1}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                              {main.recipient.agency_name || main.recipient.name}
                            </td>
                            <td>
                              <span className={`premium-badge ${main.recipient_type === 'agent' ? 'badge-info' : 'badge-purple'}`}>
                                {main.recipient_type === 'agent' ? 'وكيل / فرع' : 'موظف عام'}
                              </span>
                            </td>
                            <td>{formatDateTime(main.assigned_at)}</td>
                            <td>
                              <span className={`premium-badge ${main.item.inventory_type === 'fixed' ? 'badge-purple' : 'badge-success'}`}>
                                {getInventoryTypeName(main.item.inventory_type)}
                              </span>
                            </td>
                            <td>
                              <ul style={{ margin: 0, paddingInlineStart: '16px', listStyleType: 'square' }}>
                                {group.map((entry) => (
                                  <li key={entry.id} style={{ fontSize: '0.85rem', marginBottom: '2px' }}>
                                    {entry.item.name} - <span style={{ fontWeight: 'bold' }}>{entry.quantity}</span> {entry.item.unit}
                                    {(entry.serial_start || entry.serial_end) ? ` (S/N: ${entry.serial_start || ''}${entry.serial_end ? ` ➔ ${entry.serial_end}` : ''})` : ''}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td>
                              <span className={`premium-badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                                {isActive ? 'نشطة' : 'غير نشطة'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="action-btn edit"
                                  onClick={() => handlePrintCustodyReceipt(main)}
                                  title="طباعة إيصال التسليم"
                                  style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '1.1rem' }}
                                >
                                  <i className="fa-solid fa-print"></i>
                                </button>
                                {isActive && (
                                  <button
                                    className="action-btn delete"
                                    onClick={() => handleReturnCustodyGroup(group)}
                                    title="تسجيل استرجاع العهدة"
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}
                                  >
                                    <i className="fa-solid fa-arrow-rotate-left"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="users-mobile-cards mobile-only" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: 0 }}>
              {filteredCustodyGroups.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted)', padding: '50px 0' }}>
                  <i className="fa-solid fa-user-check" style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '15px', display: 'block' }}></i>
                  لا توجد عهد مطابقة للفلاتر الحالية
                </div>
              ) : (
                filteredCustodyGroups.map((group) => {
                  const main = group[0];
                  const isActive = group.some((item) => item.status === 'active');
                  return (
                    <div key={getBatchKey(main)} className="user-mobile-card" style={{ position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', backgroundColor: isActive ? '#3b82f6' : 'var(--muted)' }}></div>
                      <div className="user-mobile-header">
                        <div>
                          <h4 className="user-mobile-title">{getInventoryTypeName(main.item.inventory_type)}</h4>
                          <span className="user-mobile-number" style={{ color: 'var(--accent)' }}>
                            <i className="fa-solid fa-user" style={{ marginLeft: '5px' }}></i>
                            {main.recipient.agency_name || main.recipient.name}
                          </span>
                        </div>
                      </div>
                      <div className="user-mobile-body">
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">عدد الأصناف:</span>
                          <span className="user-mobile-value" style={{ fontWeight: 'bold' }}>{group.length}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">الأصناف المسلمة:</span>
                          <span className="user-mobile-value" style={{ display: 'block', width: '100%' }}>
                            <ul style={{ margin: '6px 0 0 0', paddingInlineStart: '16px' }}>
                              {group.map((entry) => (
                                <li key={entry.id} style={{ marginBottom: '4px' }}>
                                  {entry.item.name} - {entry.quantity} {entry.item.unit}
                                  {(entry.serial_start || entry.serial_end) ? ` (${entry.serial_start || ''}${entry.serial_end ? ` ➔ ${entry.serial_end}` : ''})` : ''}
                                </li>
                              ))}
                            </ul>
                          </span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">تاريخ الصرف:</span>
                          <span className="user-mobile-value">{formatDateTime(main.assigned_at)}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">حالة العهدة:</span>
                          <span className="user-mobile-value">{isActive ? 'نشطة' : 'غير نشطة'}</span>
                        </div>
                        
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                          <button
                            className="btn-submit"
                            style={{ width: '100%', backgroundColor: 'transparent', color: '#10b981', border: '1px solid currentColor', borderRadius: '8px' }}
                            onClick={() => handlePrintCustodyReceipt(main)}
                          >
                            <i className="fa-solid fa-print" style={{ marginLeft: '8px' }}></i>
                            طباعة إيصال التسليم
                          </button>

                          {isActive && (
                            <button
                              className="btn-submit"
                              style={{ width: '100%', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid currentColor', borderRadius: '8px' }}
                              onClick={() => handleReturnCustodyGroup(group)}
                            >
                              <i className="fa-solid fa-arrow-turn-down" style={{ marginLeft: '8px' }}></i>
                              تسجيل استرجاع العهدة
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'assign' && (
          <div style={{ width: '100%' }}>
            <div className="form-card" style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderRadius: '16px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              padding: '24px',
              border: '1px solid var(--border)',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: '800' }}>
                  <i className="fa-solid fa-file-signature" style={{ color: 'var(--accent-cyan)', fontSize: '1.4rem' }}></i>
                  إصدار وإسناد نموذج صرف عهدة جديدة
                </h3>
                <span className="premium-badge badge-info" style={{ padding: '6px 16px', borderRadius: '30px' }}>
                  رقم الحركة التلقائي: #{Date.now().toString().slice(-6)}
                </span>
              </div>
              
              <form onSubmit={handleAssignCustody} className="user-form">
                {/* 1. Global Type Selection */}
                <div style={{ marginBottom: '20px', padding: '12px 18px', backgroundColor: 'var(--hover-bg)', borderRadius: '12px', border: '1px dashed var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                  <label style={{ margin: 0, fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                    <i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-cyan)' }}></i>
                    نوع المخزون المصروف حالياً:
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '8px 16px', 
                      borderRadius: '8px', 
                      border: `2px solid ${assignInventoryType === 'fixed' ? 'var(--accent-cyan)' : 'var(--border)'}`,
                      backgroundColor: assignInventoryType === 'fixed' ? 'var(--card-bg)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      margin: 0
                    }}>
                      <input 
                        type="radio" 
                        name="assignType" 
                        value="fixed" 
                        checked={assignInventoryType === 'fixed'} 
                        onChange={() => {
                          setAssignInventoryType('fixed');
                          setAssignmentItems([{ item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new', notes: '' }]);
                        }}
                      />
                      <span style={{ fontWeight: assignInventoryType === 'fixed' ? 'bold' : 'normal', fontSize: '0.9rem', color: 'var(--text)' }}>مخزون ثابت (أجهزة، أثاث، سيارات)</span>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '8px 16px', 
                      borderRadius: '8px', 
                      border: `2px solid ${assignInventoryType === 'consumable' ? 'var(--accent-cyan)' : 'var(--border)'}`,
                      backgroundColor: assignInventoryType === 'consumable' ? 'var(--card-bg)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      margin: 0
                    }}>
                      <input 
                        type="radio" 
                        name="assignType" 
                        value="consumable" 
                        checked={assignInventoryType === 'consumable'} 
                        onChange={() => {
                          setAssignInventoryType('consumable');
                          setAssignmentItems([{ item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new', notes: '' }]);
                        }}
                      />
                      <span style={{ fontWeight: assignInventoryType === 'consumable' ? 'bold' : 'normal', fontSize: '0.9rem', color: 'var(--text)' }}>مخزون مستهلك (قرطاسية، مطبوعات، دفاتر)</span>
                    </label>
                  </div>
                </div>

                {/* 2. Recipient Section (Compact Horizontal Grid) */}
                <div className="recipient-horizontal-grid">
                  <div className="form-group">
                    <label><i className="fa-solid fa-user-tag" style={{ color: 'var(--accent-cyan)' }}></i> تصنيف الجهة المستلمة <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button 
                        type="button"
                        onClick={() => {
                          setAssignment({...assignment, recipient_type: 'agent', recipient_id: ''});
                          setRecipientSearch('');
                        }}
                        style={{ 
                          flex: 1, 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border)',
                          backgroundColor: assignment.recipient_type === 'agent' ? 'var(--accent-cyan)' : 'var(--input-bg)',
                          color: assignment.recipient_type === 'agent' ? '#fff' : 'var(--text)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          height: '42px',
                          transition: 'all 0.2s'
                        }}
                      >
                        وكيل / فرع
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setAssignment({...assignment, recipient_type: 'employee', recipient_id: ''});
                          setRecipientSearch('');
                        }}
                        style={{ 
                          flex: 1, 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border)',
                          backgroundColor: assignment.recipient_type === 'employee' ? 'var(--accent-cyan)' : 'var(--input-bg)',
                          color: assignment.recipient_type === 'employee' ? '#fff' : 'var(--text)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          height: '42px',
                          transition: 'all 0.2s'
                        }}
                      >
                        موظف عام
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ position: 'relative' }} ref={recipientDropdownRef}>
                    <label><i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--accent-cyan)' }}></i> بحث واختيار المستلم الفعلي <span className="required">*</span></label>
                    <div className="searchable-select-container" style={{ position: 'relative', marginTop: '6px' }}>
                      <input 
                        type="text" 
                        placeholder="ابحث عن الاسم..." 
                        value={recipientSearch}
                        onChange={(e) => {
                          setRecipientSearch(e.target.value);
                          setShowRecipientDropdown(true);
                        }}
                        onFocus={() => setShowRecipientDropdown(true)}
                        className="premium-filter-input"
                        style={{ paddingLeft: '35px', height: '42px' }}
                      />
                      <i 
                        className={`fa-solid ${showRecipientDropdown ? 'fa-chevron-up' : 'fa-chevron-down'}`} 
                        style={{ 
                          position: 'absolute', 
                          left: '12px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          color: 'var(--muted)',
                          pointerEvents: 'none'
                        }}
                      ></i>

                      {showRecipientDropdown && (
                        <div className="searchable-dropdown" style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          left: 0,
                          zIndex: 1000,
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          marginTop: '4px'
                        }}>
                          {assignment.recipient_type === 'agent' ? (
                            agents
                              .filter(a => 
                                (a.agency_name || '').toLowerCase().includes(recipientSearch.toLowerCase()) || 
                                (a.agent_name || '').toLowerCase().includes(recipientSearch.toLowerCase())
                              )
                              .map(a => (
                                <div 
                                  key={a.id} 
                                  className="dropdown-item"
                                  onClick={() => {
                                    setAssignment({...assignment, recipient_id: a.id.toString()});
                                    setRecipientSearch(a.agency_name || a.agent_name);
                                    setShowRecipientDropdown(false);
                                  }}
                                  style={{ 
                                    padding: '10px 15px', 
                                    cursor: 'pointer', 
                                    borderBottom: '1px solid var(--border)',
                                    backgroundColor: assignment.recipient_id === a.id.toString() ? 'var(--hover-bg)' : 'transparent',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  <i className="fa-solid fa-building-user" style={{ marginLeft: '10px', color: 'var(--muted)' }}></i>
                                  {a.agency_name || a.agent_name}
                                </div>
                              ))
                          ) : (
                            employees
                              .filter(e => (e.name || '').toLowerCase().includes(recipientSearch.toLowerCase()))
                              .map(e => (
                                <div 
                                  key={e.id} 
                                  className="dropdown-item"
                                  onClick={() => {
                                    setAssignment({...assignment, recipient_id: e.id.toString()});
                                    setRecipientSearch(e.name);
                                    setShowRecipientDropdown(false);
                                  }}
                                  style={{ 
                                    padding: '10px 15px', 
                                    cursor: 'pointer', 
                                    borderBottom: '1px solid var(--border)',
                                    backgroundColor: assignment.recipient_id === e.id.toString() ? 'var(--hover-bg)' : 'transparent',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  <i className="fa-solid fa-user-tie" style={{ marginLeft: '10px', color: 'var(--muted)' }}></i>
                                  {e.name}
                                </div>
                              ))
                          )}
                          {((assignment.recipient_type === 'agent' && agents.filter(a => (a.agency_name || '').toLowerCase().includes(recipientSearch.toLowerCase()) || (a.agent_name || '').toLowerCase().includes(recipientSearch.toLowerCase())).length === 0) ||
                            (assignment.recipient_type === 'employee' && employees.filter(e => (e.name || '').toLowerCase().includes(recipientSearch.toLowerCase())).length === 0)) && (
                            <div style={{ padding: '15px', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                              لا توجد نتائج مطابقة لبحثك
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label><i className="fa-solid fa-comment-dots" style={{ color: 'var(--accent-cyan)' }}></i> ملاحظات الصرف العامة (على الإيصال)</label>
                    <input 
                      type="text"
                      placeholder="ملاحظات عامة متعلقة بالتسليم..."
                      className="premium-filter-input"
                      style={{ marginTop: '6px', height: '42px' }}
                      value={assignment.notes}
                      onChange={(e) => setAssignment({...assignment, notes: e.target.value})}
                    />
                  </div>
                </div>

                {/* 3. Items List (Compact Horizontal Table Format) */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ margin: 0, fontWeight: 'bold', fontSize: '1rem', color: 'var(--text)' }}>
                      الأصناف والكميات المراد صرفها في هذه العهدة:
                    </label>
                  </div>
                  
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--card-bg)' }}>
                    <table className="compact-form-table">
                      <thead>
                        <tr>
                          <th style={{ width: '4%', textAlign: 'center' }}>#</th>
                          <th style={{ width: '28%' }}>الصنف المصروف <span className="required">*</span></th>
                          <th style={{ width: '10%' }}>الكمية</th>
                          <th style={{ width: '10%' }}>حالة الصنف</th>
                          <th style={{ width: '14%' }}>السيريال (من)</th>
                          <th style={{ width: '14%' }}>السيريال (إلى)</th>
                          <th style={{ width: '16%' }}>ملاحظات الصنف</th>
                          <th style={{ width: '4%', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentItems.map((row, index) => (
                          <tr key={`assign-row-${index}`}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text)' }}>{index + 1}</td>
                            <td>
                              <select
                                required
                                value={row.item_id}
                                onChange={(e) => updateAssignmentItemRow(index, 'item_id', e.target.value)}
                                className="premium-filter-select"
                                style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
                              >
                                <option value="">اختر صنفاً...</option>
                                {assignableItems.map(i => (
                                  <option key={i.id} value={i.id} disabled={(i.stocks?.[0]?.quantity || 0) <= 0}>
                                    {i.name} (المتوفر: {i.stocks?.[0]?.quantity || 0})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                required
                                value={row.quantity}
                                onChange={(e) => updateAssignmentItemRow(index, 'quantity', parseInt(e.target.value || '1'))}
                                className="premium-filter-input"
                                style={{ height: '36px', textAlign: 'center', fontSize: '0.85rem', width: '100%' }}
                              />
                            </td>
                            <td>
                              <select
                                value={row.condition}
                                onChange={(e) => updateAssignmentItemRow(index, 'condition', e.target.value)}
                                className="premium-filter-select"
                                style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
                              >
                                <option value="new">جديد</option>
                                <option value="used">مستعمل</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                dir="ltr"
                                placeholder="اختياري"
                                value={row.serial_start}
                                onChange={(e) => updateAssignmentItemRow(index, 'serial_start', e.target.value)}
                                className="premium-filter-input"
                                style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                dir="ltr"
                                placeholder="اختياري"
                                value={row.serial_end}
                                onChange={(e) => updateAssignmentItemRow(index, 'serial_end', e.target.value)}
                                className="premium-filter-input"
                                style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                placeholder="مثال: موديل/موقع..."
                                value={row.notes}
                                onChange={(e) => updateAssignmentItemRow(index, 'notes', e.target.value)}
                                className="premium-filter-input"
                                style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => removeAssignmentItemRow(index)}
                                disabled={assignmentItems.length === 1}
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: '#ef4444', 
                                  cursor: 'pointer',
                                  padding: '4px',
                                  opacity: assignmentItems.length === 1 ? 0.3 : 1,
                                  fontSize: '1rem'
                                }}
                                title="حذف السطر"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                    <button 
                      type="button" 
                      onClick={addAssignmentItemRow} 
                      style={{ 
                        backgroundColor: 'transparent', 
                        color: 'var(--accent-cyan)', 
                        border: '2px dashed var(--accent-cyan)',
                        padding: '6px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fa-solid fa-plus-circle" style={{ marginLeft: '8px' }}></i>
                      إضافة صنف إضافي لنموذج الصرف الحالي
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={() => setActiveTab('store')}
                    style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', fontSize: '0.95rem', height: '42px', cursor: 'pointer' }}
                  >
                    إلغاء والعودة للمخزن
                  </button>
                  <button 
                    type="submit" 
                    className="btn-submit" 
                    disabled={submitting}
                    style={{ flex: 2, padding: '10px 20px', borderRadius: '8px', fontSize: '0.95rem', height: '42px', boxShadow: '0 3px 10px rgba(6, 182, 212, 0.15)', cursor: 'pointer', backgroundColor: 'var(--accent-cyan)' }}
                  >
                    <i className="fa-solid fa-check-double" style={{ marginLeft: '10px' }}></i> 
                    {submitting ? 'جاري تسجيل الحركة...' : 'اعتماد وصرف العهدة وإصدار الإيصال'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {/* Premium Filter Bar */}
            <div className="premium-filter-bar" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-cyan)' }}></i> نوع الحركة</label>
                <select 
                  value={movementFilterType} 
                  onChange={(e) => setMovementFilterType(e.target.value as 'all' | 'issue' | 'return' | 'loss' | 'damage')}
                  className="premium-filter-select"
                >
                  <option value="all">كل الحركات</option>
                  <option value="issue">صرف عهدة</option>
                  <option value="return">استرجاع عهدة</option>
                  <option value="loss">فقد</option>
                  <option value="damage">تلف</option>
                </select>
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-user-tag" style={{ color: 'var(--accent-cyan)' }}></i> نوع المستلم</label>
                <select 
                  value={movementFilterRecipientType} 
                  onChange={(e) => setMovementFilterRecipientType(e.target.value as 'all' | 'agent' | 'employee')}
                  className="premium-filter-select"
                >
                  <option value="all">كل المستلمين</option>
                  <option value="agent">وكيل / فرع</option>
                  <option value="employee">موظف عام</option>
                </select>
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-calendar" style={{ color: 'var(--accent-cyan)' }}></i> من</label>
                <input 
                  type="date" 
                  value={movementFilterFromDate} 
                  onChange={(e) => setMovementFilterFromDate(e.target.value)} 
                  className="premium-filter-input"
                />
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-calendar" style={{ color: 'var(--accent-cyan)' }}></i> إلى</label>
                <input 
                  type="date" 
                  value={movementFilterToDate} 
                  onChange={(e) => setMovementFilterToDate(e.target.value)} 
                  className="premium-filter-input"
                />
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-box" style={{ color: 'var(--accent-cyan)' }}></i> اسم الصنف</label>
                <input
                  type="text"
                  placeholder="بحث باسم الصنف..."
                  value={movementFilterItem}
                  onChange={(e) => setMovementFilterItem(e.target.value)}
                  className="premium-filter-input"
                />
              </div>
              <div className="premium-filter-group">
                <label><i className="fa-solid fa-user" style={{ color: 'var(--accent-cyan)' }}></i> اسم المستلم</label>
                <input
                  type="text"
                  placeholder="بحث باسم المستلم..."
                  value={movementFilterRecipient}
                  onChange={(e) => setMovementFilterRecipient(e.target.value)}
                  className="premium-filter-input"
                />
              </div>
              <button
                type="button"
                className="premium-reset-btn"
                onClick={() => {
                  setMovementFilterType('all');
                  setMovementFilterRecipientType('all');
                  setMovementFilterFromDate('');
                  setMovementFilterToDate('');
                  setMovementFilterItem('');
                  setMovementFilterRecipient('');
                }}
              >
                <i className="fa-solid fa-arrows-rotate"></i> تصفير
              </button>
            </div>

            <div className="premium-card-table-wrapper">
              <div className="premium-table-header-row">
                <h3 className="premium-table-title">
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent-cyan)' }}></i>
                  سجل العمليات وحركات المخزون والعهدة التاريخية ({filteredMovements.length} حركة)
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>التاريخ</th>
                      <th style={{ width: '12%' }}>نوع الحركة</th>
                      <th style={{ width: '18%' }}>الصنف</th>
                      <th style={{ width: '12%' }}>نوع المخزون</th>
                      <th style={{ width: '8%' }}>الكمية</th>
                      <th style={{ width: '14%' }}>المستلم</th>
                      <th style={{ width: '10%' }}>نوع المستلم</th>
                      <th style={{ width: '10%' }}>تمت بواسطة</th>
                      <th style={{ width: '14%' }}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsLoading ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '28px 0' }}>جاري تحميل سجل الحركات...</td>
                      </tr>
                    ) : filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '28px 0' }}>لا توجد حركات مطابقة للفلاتر</td>
                      </tr>
                    ) : (
                      filteredMovements.map((row) => (
                        <tr key={row.id}>
                          <td>{row.created_at ? new Date(row.created_at).toLocaleString('en-GB') : '-'}</td>
                          <td>
                            <span className={`premium-badge ${
                              row.type === 'issue' ? 'badge-info' : 
                              row.type === 'return' ? 'badge-success' : 
                              row.type === 'loss' ? 'badge-danger' : 'badge-warning'
                            }`}>
                              {getMovementTypeName(row.type)}
                            </span>
                          </td>
                          <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>{row.item?.name || '-'}</td>
                          <td>
                            <span className={`premium-badge ${row.item?.inventory_type === 'fixed' ? 'badge-purple' : 'badge-success'}`}>
                              {getInventoryTypeName(row.item?.inventory_type)}
                            </span>
                          </td>
                          <td>{row.quantity}</td>
                          <td>{row.recipient?.name || '-'}</td>
                          <td>{getRecipientTypeName(row.recipient?.type || 'employee')}</td>
                          <td>{row.processor?.name || '-'}</td>
                          <td>{row.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
                <label>نوع المخزون <span className="required">*</span></label>
                <select value={newItem.inventory_type} onChange={e => setNewItem({...newItem, inventory_type: e.target.value as 'fixed' | 'consumable'})}>
                  <option value="consumable">مخزون مستهلك</option>
                  <option value="fixed">مخزون ثابت</option>
                </select>
              </div>

              <div className="form-group">
                <label>التصنيف <span className="required">*</span></label>
                {!showCustomCategoryInput ? (
                  <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="اسم التصنيف الجديد (مثال: أدوات مكتبية)"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                )}
                <button
                  type="button"
                  className="btn-submit"
                  style={{ width: 'fit-content', marginTop: '8px' }}
                  onClick={() => setShowCustomCategoryInput((prev) => !prev)}
                >
                  {showCustomCategoryInput ? 'إلغاء واختيار تصنيف موجود' : '+ إضافة تصنيف جديد'}
                </button>
              </div>

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
