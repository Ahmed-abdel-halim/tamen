import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from '../Toast';
import { API_BASE_URL } from '../../config/api';
import CreateClaimModal from './CreateClaim';
import ExcelJS from 'exceljs';
// @ts-ignore
import { saveAs } from 'file-saver';


export default function ClaimsList() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [damageTypeFilter, setDamageTypeFilter] = useState('');
  const [editingClaim, setEditingClaim] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [claimIdToDelete, setClaimIdToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, damageTypeFilter]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const params = new URLSearchParams({
        user_id: user.id || '',
        status: statusFilter,
        damage_type: damageTypeFilter
      });
      const response = await fetch(`${API_BASE_URL}/claims?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error fetching claims');
      const data = await response.json();
      setClaims(data);
    } catch (error) {
      showToast('حدث خطأ أثناء جلب المطالبات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setClaimIdToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleEditClick = async (claim: any) => {
    try {
      // Fetch full claim details to ensure all fields are available (e.g., personal_id)
      const response = await fetch(`${API_BASE_URL}/claims/${claim.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const fullClaim = await response.json();
        setEditingClaim(fullClaim);
      } else {
        setEditingClaim(claim);
      }
    } catch {
      setEditingClaim(claim);
    }
    setShowAddModal(true);
  };

  const confirmDelete = async () => {
    if (!claimIdToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/claims/${claimIdToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        showToast('تم حذف المطالبة بنجاح', 'success');
        fetchClaims();
      }
    } catch (error) {
      showToast('خطأ في حذف المطالبة', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setClaimIdToDelete(null);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDamageTypeFilter('');
  };

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('المطالبات');

      // RTL Direction
      worksheet.views = [{ rightToLeft: true }];

      // Add Company Logo
      try {
        const response = await fetch('/img/logo.png');
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const logoImage = workbook.addImage({
          buffer: arrayBuffer,
          extension: 'png',
        });
        
        // Position logo at the top right (cell A1 area)
        worksheet.addImage(logoImage, {
          tl: { col: 0, row: 0 },
          ext: { width: 80, height: 80 }
        });
      } catch (err) {
        console.warn('Could not load logo for excel:', err);
      }

      // Add QR Code
      try {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const qrData = `تقرير المطالبات - شركة المدار الليبي\nالتاريخ: ${new Date().toLocaleString('ar-LY')}\nبواسطة: ${currentUser.name || 'النظام'}`;
        const qrResponse = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`);
        const qrBlob = await qrResponse.blob();
        const qrArrayBuffer = await qrBlob.arrayBuffer();
        const qrImage = workbook.addImage({
          buffer: qrArrayBuffer,
          extension: 'png',
        });
        
        // Position QR code at the top left (Column G)
        worksheet.addImage(qrImage, {
          tl: { col: 6, row: 0 },
          ext: { width: 80, height: 80 }
        });
      } catch (err) {
        console.warn('Could not load QR code for excel:', err);
      }

      // Add Main Title
      worksheet.mergeCells('B2:F2');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'شركة المدار الليبي للتأمين - إدارة المطالبات';
      titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: '1e293b' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add Report Info
      worksheet.mergeCells('B3:F3');
      const infoCell = worksheet.getCell('B3');
      infoCell.value = `تقرير المطالبات المسجلة - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`;
      infoCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: '64748b' } };
      infoCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Start table from row 6
      const tableStartRow = 5;

      // Define columns (just for widths)
      worksheet.columns = [
        { key: 'claim_number', width: 20 },
        { key: 'claim_date', width: 20 },
        { key: 'insurance_number', width: 25 },
        { key: 'claimant_name', width: 35 },
        { key: 'damage_type', width: 15 },
        { key: 'status', width: 25 },
        { key: 'created_at', width: 20 },
      ];

      // Set Header Row
      const headerRow = worksheet.getRow(tableStartRow);
      headerRow.values = ['رقم المطالبة', 'تاريخ المطالبة', 'رقم الوثيقة', 'مقدم المطالبة', 'نوع الأضرار', 'الحالة', 'تاريخ التسجيل'];
      headerRow.height = 30;

      // Format Header
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1e293b' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Add Data
      filteredClaims.forEach((claim, index) => {
        const row = worksheet.getRow(tableStartRow + 1 + index);
        row.values = [
          claim.claim_number,
          new Date(claim.claim_date).toLocaleDateString('ar-LY'),
          claim.document?.insurance_number || '—',
          claim.claimant_name,
          claim.damage_type,
          getStatusLabel(claim.status),
          new Date(claim.created_at).toLocaleDateString('ar-LY')
        ];
        row.height = 25;
      });

      // Format Data Rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > tableStartRow) {
          row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
          // Zebra stripes (alternate colors)
          if (rowNumber % 2 !== 0) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'f1f5f9' }
              };
            });
          }
        }
      });

      // Generate Buffer and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `تقرير_المطالبات_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showToast('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      console.error('Excel Export Error:', error);
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };


  const getStatusLabel = (status: string) => {
    const statuses: any = {
      pending: 'قيد الانتظار',
      'تسويه وديه': 'تسوية ودية',
      'تحويل الى مركز الشرطة': 'مركز الشرطة',
      'تحويل الى النيابة': 'النيابة',
      'تحويل الى المحكمة': 'المحكمة',
      'استئناف في حكم المحكمة': 'استئناف',
      'للتسديد - الشؤون المالية': 'للتسديد'
    };
    return statuses[status] || status;
  };

  const filteredClaims = claims.filter(c =>
    c.claim_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.claimant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.document?.insurance_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>المطالبات / قائمة المطالبات</span>
      </div>

      <div className="users-card">
        <div className="claims-modern-header">
          <div className="header-main-row">
            <h5 className="claims-title">قائمة المطالبات المسجلة</h5>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="export-excel-btn"
                onClick={exportToExcel}
                title="تصدير إكسل"
              >
                <i className="fa-solid fa-file-excel"></i>
                <span>تصدير إكسل</span>
              </button>
              <button
                className="add-claim-btn"
                onClick={() => {
                  setEditingClaim(null);
                  setShowAddModal(true);
                }}
              >
                <i className="fa-solid fa-plus"></i>
                <span>إضافة مطالبة جديدة</span>
              </button>
            </div>
          </div>


          <div className="search-row-modern">
            <label>بحث نصي</label>
            <div className="modern-search-bar">
              <input
                type="text"
                placeholder="بحث برقم المطالبة أو اسم المقدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button">
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>
          </div>

          <div className="filters-row-modern">
            <div className="filter-group">
              <label>تصفية حسب الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">كل الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="تسويه وديه">تسوية ودية</option>
                <option value="تحويل الى مركز الشرطة">مركز الشرطة</option>
                <option value="للتسديد - الشؤون المالية">للتسديد</option>
              </select>
            </div>

            <div className="filter-group">
              <label>نوع الأضرار</label>
              <select
                value={damageTypeFilter}
                onChange={(e) => setDamageTypeFilter(e.target.value)}
              >
                <option value="">كل أنواع الأضرار</option>
                <option value="مادي">مادي</option>
                <option value="بدني">بدني</option>
                <option value="اخر">أخرى</option>
              </select>
            </div>

            <button className="reset-filters-btn" onClick={handleResetFilters}>
              <i className="fa-solid fa-rotate-left"></i>
              <span>تفريغ</span>
            </button>
          </div>
        </div>

        {/* Custom Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="transfer-overlay">
            <div className="transfer-modal" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3 style={{ color: '#ef4444' }}><i className="fa-solid fa-triangle-exclamation"></i> تأكيد الحذف</h3>
                <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>&times;</button>
              </div>
              <div className="form-body" style={{ textAlign: 'center', padding: '30px' }}>
                <i className="fa-solid fa-trash-can" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '20px', display: 'block' }}></i>
                <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>هل أنت متأكد من حذف المطالبة؟</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>لا يمكن التراجع عن هذا الإجراء بعد التنفيذ.</p>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'center', gap: '15px', paddingBottom: '30px' }}>
                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>إلغاء</button>
                <button className="btn-confirm" style={{ background: '#ef4444' }} onClick={confirmDelete}>تأكيد الحذف نهائياً</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .claims-modern-header {
            padding: 0 0 24px 0;
            display: flex;
            flex-direction: column;
            gap: 20px;
            background: transparent !important;
          }
          .header-main-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .claims-title {
            font-size: 1.4rem;
            font-weight: 800;
            color: var(--text) !important;
            margin: 0;
          }
          .add-claim-btn {
            background: var(--sidebar) !important;
            color: white !important;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            transition: all 0.2s;
            cursor: pointer;
          }
          [data-theme='dark'] .add-claim-btn {
            background: var(--accent-cyan) !important;
            box-shadow: 0 4px 12px var(--accent-shadow) !important;
          }
          .add-claim-btn:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }
          
          .export-excel-btn {
            background: #166534 !important;
            color: white !important;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            transition: all 0.2s;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(22, 101, 52, 0.2);
          }
          .export-excel-btn:hover {
            background: #15803d !important;
            transform: translateY(-1px);
            box-shadow: 0 6px 15px rgba(22, 101, 52, 0.3);
          }

          
          .search-row-modern label, .filter-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--text-muted) !important;
            margin-bottom: 8px;
          }
          
          .modern-search-bar {
            display: flex;
            background: var(--panel) !important;
            border: 1.5px solid var(--border) !important;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.2s;
          }
          .modern-search-bar:focus-within {
            border-color: var(--sidebar) !important;
          }
          [data-theme='dark'] .modern-search-bar:focus-within {
            border-color: var(--accent-cyan) !important;
          }
          .modern-search-bar input {
            flex: 1;
            border: none;
            background: transparent !important;
            padding: 12px 16px;
            font-size: 0.95rem;
            outline: none;
            color: var(--text) !important;
          }
          .modern-search-bar button {
            background: var(--sidebar) !important;
            color: white !important;
            border: none;
            width: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            cursor: pointer;
          }
          [data-theme='dark'] .modern-search-bar button {
            background: var(--accent-cyan) !important;
          }

          .filters-row-modern {
            display: flex;
            gap: 16px;
            align-items: flex-end;
            background: var(--panel) !important;
            padding: 20px;
            border-radius: 14px;
            border: 1px solid var(--border) !important;
          }
          .filter-group {
            flex: 1;
          }
          .filter-group select {
            width: 100%;
            height: 42px;
            padding: 0 12px;
            border-radius: 10px;
            border: 1.5px solid var(--border) !important;
            background: var(--panel) !important;
            color: var(--text) !important;
            font-size: 0.9rem;
            font-weight: 500;
            outline: none;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: left 12px center;
            background-size: 16px;
          }
          .filter-group select:focus {
            border-color: var(--sidebar);
          }
          
          .reset-filters-btn {
            height: 42px;
            padding: 0 20px;
            background: transparent !important;
            border: 1.5px solid var(--sidebar) !important;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            color: var(--sidebar) !important;
            cursor: pointer;
            transition: all 0.2s;
          }
          [data-theme='dark'] .reset-filters-btn {
            border-color: var(--accent-cyan) !important;
            color: var(--accent-cyan) !important;
          }
          .reset-filters-btn:hover {
            background: var(--sidebar) !important;
            color: #fff !important;
          }
          [data-theme='dark'] .reset-filters-btn:hover {
            background: var(--accent-cyan) !important;
            color: #fff !important;
          }

          /* Modal Popup Styling */
          .transfer-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          }
          .transfer-modal {
            background: var(--panel);
            width: 100%;
            max-width: 450px;
            border-radius: 20px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
            overflow: hidden;
            border: 1px solid var(--border);
            animation: modalSlide 0.3s ease-out;
          }
          @keyframes modalSlide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          
          .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
          .modal-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; gap: 12px; }
          .close-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
          
          .form-body { padding: 30px; }
          .modal-footer { padding: 20px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; }
          .btn-cancel { background: var(--panel); border: 1.5px solid var(--border); color: var(--text); padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
          .btn-confirm { color: #fff; border: none; padding: 10px 30px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        `}</style>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : filteredClaims.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-scale-balanced" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '1rem' }}></i>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              {searchQuery || statusFilter || damageTypeFilter ? 'لا توجد نتائج للبحث' : 'لا توجد مطالبات مسجلة'}
            </p>
          </div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>رقم المطالبة</th>
                  <th>تاريخ المطالبة</th>
                  <th>رقم الوثيقة</th>
                  <th>مقدم المطالبة</th>
                  <th>نوع الأضرار</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td><span className="fw-bold">{claim.claim_number}</span></td>
                    <td>{claim.claim_date ? new Date(String(claim.claim_date).replace(' ', 'T')).toLocaleDateString('ar-EG') : 'غير متوفر'}</td>
                    <td>{claim.document?.insurance_number || 'غير متوفر'}</td>
                    <td>{claim.claimant_name}</td>
                    <td>{claim.damage_type}</td>
                    <td>
                      <span className="badge" style={{
                        background: claim.status === 'pending' ? '#f59e0b' : '#3b82f6',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        {getStatusLabel(claim.status)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/claims/${claim.id}`} className="action-btn view" title="عرض التفاصيل">
                          <i className="fa-solid fa-eye"></i>
                        </Link>
                        <button
                          className="action-btn edit"
                          title="تعديل"
                          onClick={() => handleEditClick(claim)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="action-btn delete"
                          title="حذف"
                          onClick={() => handleDeleteClick(claim.id)}
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
        )}
      </div>

      {showAddModal && (
        <CreateClaimModal
          claim={editingClaim}
          onClose={() => {
            setShowAddModal(false);
            setEditingClaim(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingClaim(null);
            fetchClaims();
          }}
        />
      )}
    </section>
  );
}
