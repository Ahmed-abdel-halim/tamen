import React, { useState, useEffect } from 'react';
import { showToast } from "./Toast";

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
  const [submitting, setSubmitting] = useState(false);
  const [assignInventoryType, setAssignInventoryType] = useState<'fixed' | 'consumable'>('fixed');
  const [assignmentItems, setAssignmentItems] = useState<Array<{
    item_id: string;
    quantity: number;
    serial_start: string;
    serial_end: string;
    condition: string;
  }>>([
    { item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new' }
  ]);

  const getBatchKey = (custody: Custody) =>
    custody.batch_ref || `single-${custody.id}`;

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

      setMovementsLoading(true);
      const movementsRes = await fetch('/api/inventory/movements');
      const movementsData = await movementsRes.json();
      setMovements(Array.isArray(movementsData) ? movementsData : []);

      // Fetch agents and employees
      const agentsRes = await fetch('/api/branches-agents');
      const agentsData = await agentsRes.json();
      setAgents(Array.isArray(agentsData) ? agentsData : []);

      const employeesRes = await fetch('/api/users');
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
      const batchRef = `BATCH-${Date.now()}`;
      for (const row of assignmentItems) {
        const res = await fetch('/api/inventory/assign-custody', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...assignment,
            inventory_type: assignInventoryType,
            batch_ref: batchRef,
            item_id: row.item_id,
            quantity: row.quantity,
            serial_start: row.serial_start,
            serial_end: row.serial_end,
            condition: row.condition,
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
      setAssignmentItems([{ item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new' }]);
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
    setAssignmentItems((prev) => [...prev, { item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new' }]);
  };

  const removeAssignmentItemRow = (index: number) => {
    setAssignmentItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAssignmentItemRow = (index: number, key: 'item_id' | 'quantity' | 'serial_start' | 'serial_end' | 'condition', value: string | number) => {
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
      for (const row of activeRows) {
        const res = await fetch(`/api/inventory/return-custody/${row.id}`, { method: 'POST' });
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

        <p><strong>تاريخ وتوقيت الصرف:</strong> ${main.assigned_at}</p>
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

    const matchesType = custodyFilterType === 'all' || groupType === custodyFilterType;
    const matchesStatus =
      custodyFilterStatus === 'all' ||
      (custodyFilterStatus === 'active' && isActive) ||
      (custodyFilterStatus === 'inactive' && !isActive);
    const matchesRecipientType = custodyFilterRecipientType === 'all' || main.recipient_type === custodyFilterRecipientType;
    const matchesRecipient = !recipientQuery || recipientName.includes(recipientQuery);
    const matchesItem = !itemQuery || itemNames.includes(itemQuery);
    return matchesType && matchesStatus && matchesRecipientType && matchesRecipient && matchesItem;
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>نوع المخزون</label>
                <select value={filterInventoryType} onChange={(e) => setFilterInventoryType(e.target.value as 'all' | 'fixed' | 'consumable')}>
                  <option value="all">الكل</option>
                  <option value="fixed">مخزون ثابت</option>
                  <option value="consumable">مخزون مستهلك</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>التصنيف</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">كل التصنيفات</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>حالة الكمية</label>
                <select value={filterQuantityStatus} onChange={(e) => setFilterQuantityStatus(e.target.value as 'all' | 'low' | 'available' | 'out')}>
                  <option value="all">الكل</option>
                  <option value="available">متوفر</option>
                  <option value="low">قرب النفاد</option>
                  <option value="out">نافد</option>
                </select>
              </div>
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
                      <th>نوع المخزون</th>
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
                        <td colSpan={9} className="empty-table-cell" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                          <i className="fa-solid fa-box-open" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                          لا توجد أصناف في المخزن تناسب بحثك
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                          <td>{getInventoryTypeName(item.inventory_type)}</td>
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
            <div className="custody-filters-panel">
              <select value={custodyFilterType} onChange={(e) => setCustodyFilterType(e.target.value as 'all' | 'fixed' | 'consumable')}>
                <option value="all">كل أنواع العهد</option>
                <option value="fixed">مخزون ثابت</option>
                <option value="consumable">مخزون مستهلك</option>
              </select>
              <select value={custodyFilterStatus} onChange={(e) => setCustodyFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}>
                <option value="all">كل الحالات</option>
                <option value="active">نشطة</option>
                <option value="inactive">غير نشطة</option>
              </select>
              <select value={custodyFilterRecipientType} onChange={(e) => setCustodyFilterRecipientType(e.target.value as 'all' | 'agent' | 'employee')}>
                <option value="all">كل أنواع المستلمين</option>
                <option value="agent">وكيل / فرع</option>
                <option value="employee">موظف عام</option>
              </select>
              <input
                type="text"
                placeholder="بحث باسم المستلم..."
                value={custodyFilterRecipient}
                onChange={(e) => setCustodyFilterRecipient(e.target.value)}
              />
              <input
                type="text"
                placeholder="بحث باسم الصنف داخل العهدة..."
                value={custodyFilterItem}
                onChange={(e) => setCustodyFilterItem(e.target.value)}
              />
              <button
                type="button"
                className="btn-cancel custody-reset-btn"
                onClick={() => {
                  setCustodyFilterType('all');
                  setCustodyFilterStatus('all');
                  setCustodyFilterRecipientType('all');
                  setCustodyFilterRecipient('');
                  setCustodyFilterItem('');
                }}
              >
                تصفير الفلاتر
              </button>
              <button
                className="btn-submit custody-print-btn"
                onClick={() => handlePrintAllCustodyReceipts(filteredCustodyGroups.flat())}
                disabled={filteredCustodyGroups.length === 0}
              >
                <i className="fa-solid fa-print" style={{ marginLeft: '8px' }}></i>
                طباعة كل العهد الحالية
              </button>
            </div>
            <div className="users-mobile-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: 0 }}>
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
                        <span className="user-mobile-value">{main.assigned_at}</span>
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
                )})
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
                  <label>نوع الصنف المصروف <span className="required">*</span></label>
                  <select
                    value={assignInventoryType}
                    onChange={(e) => {
                      const nextType = e.target.value as 'fixed' | 'consumable';
                      setAssignInventoryType(nextType);
                      setAssignmentItems([{ item_id: '', quantity: 1, serial_start: '', serial_end: '', condition: 'new' }]);
                    }}
                  >
                    <option value="fixed">مخزون ثابت</option>
                    <option value="consumable">مخزون مستهلك</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>الأصناف المراد صرفها <span className="required">*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {assignmentItems.map((row, index) => (
                      <div key={`assign-row-${index}`} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>الصنف #{index + 1}</label>
                            <select
                              required
                              value={row.item_id}
                              onChange={(e) => updateAssignmentItemRow(index, 'item_id', e.target.value)}
                            >
                              <option value="">اختر الصنف من المخزن...</option>
                              {assignableItems.map(i => (
                                <option key={i.id} value={i.id} disabled={(i.stocks?.[0]?.quantity || 0) <= 0}>
                                  {i.name} (المتوفر: {i.stocks?.[0]?.quantity || 0})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>الكمية</label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => updateAssignmentItemRow(index, 'quantity', parseInt(e.target.value || '1'))}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>السيريال الأول</label>
                            <input
                              type="text"
                              dir="ltr"
                              value={row.serial_start}
                              onChange={(e) => updateAssignmentItemRow(index, 'serial_start', e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>السيريال الأخير</label>
                            <input
                              type="text"
                              dir="ltr"
                              value={row.serial_end}
                              onChange={(e) => updateAssignmentItemRow(index, 'serial_end', e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => removeAssignmentItemRow(index)}
                            disabled={assignmentItems.length === 1}
                            style={{ padding: '8px 10px' }}
                            title="حذف الصنف"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                        <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                          <label>حالة الصنف المسلم</label>
                          <select
                            value={row.condition}
                            onChange={(e) => updateAssignmentItemRow(index, 'condition', e.target.value)}
                          >
                            <option value="new">جديد بقراطيسه</option>
                            <option value="used">مستعمل سابقاً</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="btn-submit" onClick={addAssignmentItemRow} style={{ width: 'fit-content' }}>
                      <i className="fa-solid fa-plus" style={{ marginLeft: '6px' }}></i>
                      إضافة صنف آخر
                    </button>
                  </div>
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
          <div style={{ padding: '20px' }}>
            <div className="custody-filters-panel">
              <select value={movementFilterType} onChange={(e) => setMovementFilterType(e.target.value as 'all' | 'issue' | 'return' | 'loss' | 'damage')}>
                <option value="all">كل أنواع الحركات</option>
                <option value="issue">صرف عهدة</option>
                <option value="return">استرجاع عهدة</option>
                <option value="loss">فقد</option>
                <option value="damage">تلف</option>
              </select>
              <select value={movementFilterRecipientType} onChange={(e) => setMovementFilterRecipientType(e.target.value as 'all' | 'agent' | 'employee')}>
                <option value="all">كل أنواع المستلمين</option>
                <option value="agent">وكيل / فرع</option>
                <option value="employee">موظف عام</option>
              </select>
              <input type="date" value={movementFilterFromDate} onChange={(e) => setMovementFilterFromDate(e.target.value)} />
              <input type="date" value={movementFilterToDate} onChange={(e) => setMovementFilterToDate(e.target.value)} />
              <input
                type="text"
                placeholder="بحث باسم الصنف..."
                value={movementFilterItem}
                onChange={(e) => setMovementFilterItem(e.target.value)}
              />
              <input
                type="text"
                placeholder="بحث باسم المستلم..."
                value={movementFilterRecipient}
                onChange={(e) => setMovementFilterRecipient(e.target.value)}
              />
              <button
                type="button"
                className="btn-cancel custody-reset-btn"
                onClick={() => {
                  setMovementFilterType('all');
                  setMovementFilterRecipientType('all');
                  setMovementFilterFromDate('');
                  setMovementFilterToDate('');
                  setMovementFilterItem('');
                  setMovementFilterRecipient('');
                }}
              >
                تصفير الفلاتر
              </button>
            </div>

            <div className="table-wrapper" style={{ marginTop: '10px' }}>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>نوع الحركة</th>
                    <th>الصنف</th>
                    <th>نوع المخزون</th>
                    <th>الكمية</th>
                    <th>المستلم</th>
                    <th>نوع المستلم</th>
                    <th>تمت بواسطة</th>
                    <th>ملاحظات</th>
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
                        <td>{getMovementTypeName(row.type)}</td>
                        <td>{row.item?.name || '-'}</td>
                        <td>{getInventoryTypeName(row.item?.inventory_type)}</td>
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
