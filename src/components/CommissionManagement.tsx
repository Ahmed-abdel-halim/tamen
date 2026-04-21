import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { exportToExcel } from '../utils/excelExport';

interface BranchAgent {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
}

interface Commission {
  id: number;
  agent_id: number;
  agent_name: string;
  document_type: string;
  document_number: string;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'paid';
  date: string;
}

const DOCUMENT_TYPES = [
  'تأمين سيارات إجباري',
  'تأمين سيارات دولي',
  'تأمين المسافرين',
  'تأمين الوافدين',
  'تأمين المسؤولية المهنية (الطبية)',
  'تأمين الهياكل البحرية',
  'تأمين الحوادث الشخصية',
  'تأمين حماية طلاب المدارس',
  'تأمين نقل النقدية',
  'تأمين شحن البضائع'
];

export default function CommissionManagement() {
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  // Filters & Form State
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  

  useEffect(() => {
    fetchAgents();
    fetchCommissions();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/branches-agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      showToast('حدث خطأ أثناء جلب الوكلاء', 'error');
    }
  };

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/commissions`);
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((item: any) => ({
          id: item.id,
          agent_id: item.branch_agent_id,
          agent_name: item.agent ? item.agent.agency_name : 'غير معروف',
          document_type: item.document_type,
          document_number: item.document_number,
          total_amount: parseFloat(item.total_amount),
          commission_rate: parseFloat(item.commission_rate),
          commission_amount: parseFloat(item.commission_amount),
          status: item.status,
          date: item.created_at ? item.created_at.split('T')[0] : ''
        }));
        setCommissions(mappedData);
      }
    } catch (error) {
      showToast('حدث خطأ أثناء جلب العمولات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayCommission = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من وضع علامة "مدفوع" لهذه العمولات؟')) return;
    
    // Logic to update status
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'paid' } : c));
    showToast('تم تحديث حالة العمولة بنجاح', 'success');
  };

  const filteredCommissions = commissions.filter(c => {
    const commissionDate = new Date(c.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0,0,0,0);
    if (end) end.setHours(23,59,59,999);

    return (selectedAgent === '' || c.agent_id.toString() === selectedAgent) &&
           (selectedType === '' || c.document_type === selectedType) &&
           (statusFilter === 'all' || c.status === statusFilter) &&
           (!start || commissionDate >= start) &&
           (!end || commissionDate <= end);
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredCommissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCommissions = filteredCommissions.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 if filtered results change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAgent, selectedType, statusFilter, startDate, endDate]);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const totalCommission = filteredCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const pendingCommission = filteredCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);

  const handlePrintReport = () => {
    const total = totalCommission.toLocaleString();
    const period = startDate && endDate ? `من: ${startDate} إلى: ${endDate}` : (startDate ? `من: ${startDate}` : (endDate ? `إلى: ${endDate}` : 'جميع الفترات'));
    const printDate = new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' });

    let htmlContent = `
      <html dir="rtl" lang="ar">
        <head>
          <title>تقرير التسويات والعمولات</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #000; background: #fff; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { max-width: 150px; height: auto; }
            .title-section { text-align: center; flex: 1; }
            h1 { margin: 0 0 10px 0; font-size: 28px; color: #111827; }
            .info { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin-bottom: 20px; background: #f3f4f6; padding: 15px; border-radius: 8px; border: 1px solid #d1d5db; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #9ca3af; padding: 10px; text-align: right; }
            th { background-color: #e5e7eb; -webkit-print-color-adjust: exact; font-weight: bold; color: #111827; }
            .footer { margin-top: 40px; font-size: 12px; text-align: center; color: #4b5563; border-top: 1px solid #d1d5db; padding-top: 10px; }
            @media print {
              body { padding: 0; }
              @page { size: A4; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="flex: 1;">
              <strong>تاريخ الطباعة:</strong> <br /> ${printDate}
            </div>
            <div class="title-section">
              <h1>تقرير التسويات والعمولات</h1>
            </div>
            <div style="flex: 1; text-align: left;">
              <img src="${window.location.origin}/img/official_logo.PNG" class="logo" alt="المدار الليبي للتأمين" />
            </div>
          </div>

          <div class="info">
            <span><strong>شامل الفترة:</strong> ${period}</span>
            <span><strong>إجمالي العمولات المحتسبة للتقرير:</strong> ${total} د.ل</span>
          </div>

          <table>
            <thead>
              <tr>
                <th width="3%">#</th>
                <th width="15%">الوكيل</th>
                <th width="15%">رقم الوثيقة</th>
                <th width="15%">نوع التأمين</th>
                <th width="12%">القيمة الإجمالية</th>
                <th width="8%">النسبة</th>
                <th width="12%">قيمة العمولة</th>
                <th width="12%">التاريخ</th>
                <th width="8%">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCommissions.map((comm, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${comm.agent_name}</td>
                  <td style="font-family: monospace; font-size: 14px;">${comm.document_number}</td>
                  <td>${comm.document_type}</td>
                  <td>${comm.total_amount.toLocaleString()} د.ل</td>
                  <td dir="ltr" style="text-align: right;">${comm.commission_rate}%</td>
                  <td style="font-weight: bold; color: #166534;">${comm.commission_amount.toLocaleString()} د.ل</td>
                  <td>${comm.date}</td>
                  <td>${comm.status === 'paid' ? 'مدفوع' : 'مستحق'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            تم استخراج هذا التقرير من النظام في ${new Date().toLocaleString('ar-LY')}
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    let printed = false;
    const printFrame = () => {
      if (!printed) {
        printed = true;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    };

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      
      const images = iframeDoc.getElementsByTagName('img');
      let imagesLoaded = 0;
      const totalImages = images.length;
      
      if (totalImages === 0) {
        printFrame();
      } else {
        Array.from(images).forEach((img) => {
          if (img.complete) {
            imagesLoaded++;
            if (imagesLoaded === totalImages) setTimeout(printFrame, 200);
          } else {
            img.onload = () => {
              imagesLoaded++;
              if (imagesLoaded === totalImages) setTimeout(printFrame, 200);
            };
            img.onerror = () => {
              imagesLoaded++;
              if (imagesLoaded === totalImages) setTimeout(printFrame, 200);
            };
          }
        });
        setTimeout(printFrame, 1500);
      }
    }
  };

  const handleExportExcel = () => {
    const total = totalCommission.toLocaleString();
    const period = startDate && endDate ? `من: ${startDate} إلى: ${endDate}` : (startDate ? `من: ${startDate}` : (endDate ? `إلى: ${endDate}` : 'جميع الفترات'));
    
    exportToExcel({
      title: 'تقرير التسويات والعمولات',
      fileName: 'تقرير_العمولات',
      columnCount: 8,
      summaryRight: `شامل الفترة: ${period}`,
      summaryLeft: `إجمالي العمولات للتقرير: ${total} د.ل`,
      tableHeaders: `
        <tr height="40">
          <th width="350">الوكيل</th>
          <th width="200">رقم الوثيقة</th>
          <th width="250">نوع التأمين</th>
          <th width="150">القيمة الإجمالية</th>
          <th width="100">النسبة</th>
          <th width="150">قيمة العمولة</th>
          <th width="150">التاريخ</th>
          <th width="120">الحالة</th>
        </tr>
      `,
      tableBody: filteredCommissions.map((comm, index) => `
        <tr class="${index % 2 === 0 ? 'row-even' : ''}">
          <td>${comm.agent_name}</td>
          <td style="mso-number-format:'\@';">${comm.document_number}</td>
          <td>${comm.document_type}</td>
          <td>${comm.total_amount}</td>
          <td dir="ltr" align="center">${comm.commission_rate}%</td>
          <td class="green">${comm.commission_amount}</td>
          <td>${comm.date}</td>
          <td class="bold">${comm.status === 'paid' ? 'مدفوع' : 'مستحق'}</td>
        </tr>
      `).join('')
    });
  };

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
          <i className="fa-solid fa-percent" style={{ marginLeft: '10px', color: '#139625' }}></i>
          نظام التسويات والعمولات
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} 
            onClick={handleExportExcel}
          >
            <i className="fa-solid fa-file-excel"></i>
            تصدير إكسيل
          </button>
          <button 
            style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} 
            onClick={handlePrintReport}
          >
            <i className="fa-solid fa-print"></i>
            طباعة التقرير
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>إجمالي العمولات المحتسبة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>
            {totalCommission.toLocaleString()} د.ل
          </div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderRight: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>عمولات مستحقة الدفع</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{pendingCommission.toLocaleString()} د.ل</div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderRight: '4px solid #139625' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>عمولات مسددة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#139625' }}>{(totalCommission - pendingCommission).toLocaleString()} د.ل</div>
        </div>
      </div>

      <div className="users-card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
          <div className="form-group">
            <label>فلترة حسب الوكيل</label>
            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
              <option value="">كل الوكلاء</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.agency_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>فلترة حسب نوع الوثيقة</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
              <option value="">كل الأنواع</option>
              {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>حالة الدفع</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
              <option value="all">الكل</option>
              <option value="pending">مستحق</option>
              <option value="paid">مدفوع</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div className="form-group">
            <label>من تاريخ</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
          </div>
          <div className="form-group">
            <label>إلى تاريخ</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button className="primary" style={{ width: '100%', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={fetchCommissions}>
              <i className="fa-solid fa-sync"></i>
              تحديث البيانات
            </button>
          </div>
        </div>
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="users-table">
          <thead>
            <tr>
              <th>الوكيل</th>
              <th>رقم الوثيقة</th>
              <th>نوع التأمين</th>
              <th>القيمة الإجمالية</th>
              <th>النسبة</th>
              <th>قيمة العمولة</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</td></tr>
            ) : currentCommissions.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>لا توجد بيانات متاحة</td></tr>
            ) : currentCommissions.map(comm => (
              <tr key={comm.id}>
                <td>{comm.agent_name}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>{comm.document_number}</td>
                <td>{comm.document_type}</td>
                <td>{comm.total_amount.toLocaleString()} د.ل</td>
                <td>%{comm.commission_rate}</td>
                <td style={{ color: '#139625', fontWeight: 'bold' }}>{comm.commission_amount.toLocaleString()} د.ل</td>
                <td>{comm.date}</td>
                <td>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                    background: comm.status === 'paid' ? '#dcfce7' : '#fef2f2',
                    color: comm.status === 'paid' ? '#166534' : '#991b1b',
                    fontWeight: '800'
                  }}>
                    {comm.status === 'paid' ? 'مدفوع' : 'مستحق'}
                  </span>
                </td>
                <td>
                  {comm.status === 'pending' && (
                    <button 
                      onClick={() => handlePayCommission(comm.id)}
                      style={{ background: '#139625', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      تسجيل كمدفوع
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="pagination" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            gap: '10px',
            borderTop: '1px solid var(--border)'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 15px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: currentPage === 1 ? '#f3f4f6' : '#fff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                color: currentPage === 1 ? '#9ca3af' : 'var(--text)',
                fontWeight: 'bold'
              }}
            >
              السابق
            </button>
            <div style={{ display: 'flex', gap: '5px' }}>
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && setCurrentPage(page)}
                  disabled={page === '...'}
                  style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    border: page === '...' ? 'none' : '1px solid',
                    borderColor: currentPage === page ? '#3b82f6' : 'var(--border)',
                    background: page === '...' ? 'transparent' : (currentPage === page ? '#3b82f6' : '#fff'),
                    color: currentPage === page ? '#fff' : 'var(--text)',
                    cursor: page === '...' ? 'default' : 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 15px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: currentPage === totalPages ? '#f3f4f6' : '#fff',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                color: currentPage === totalPages ? '#9ca3af' : 'var(--text)',
                fontWeight: 'bold'
              }}
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
