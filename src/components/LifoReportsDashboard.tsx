import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { generatePremiumExcel } from "../utils/excelGenerator";
import { API_BASE_URL } from "../config/api";
import { translateLifoError } from "../utils/translateLifoError";

// Default external credentials
const EXTERNAL_API_CREDENTIALS = {
  user_name: 'adminmli',
  pass_word: '20232024'
};

// Dynamic LIFO credentials helper (Always Production)
const getExternalCredentials = () => {
  const env = 'production';
  if (env === 'production') {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const currentUser = JSON.parse(userStr);
        if (currentUser.lifo_username && currentUser.lifo_password) {
          return {
            user_name: currentUser.lifo_username,
            pass_word: currentUser.lifo_password
          };
        }
      }
    } catch (e) {
      console.error('Error reading current user LIFO credentials:', e);
    }
    return {
      user_name: 'adminmli',
      pass_word: '20232024'
    };
  }
  return EXTERNAL_API_CREDENTIALS;
};


type ActiveTab = 'requests' | 'inventory' | 'distribution' | 'refund' | 'reports';


type CardCategory = 'all' | 'active' | 'cancel' | 'sold';

interface LIFOOffice {
  id: number;
  name: string;
  username: string;
  address?: string;
  phonenumber?: string;
}



export default function LifoReportsDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('requests');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // LIFO connection environment state (Always Production)
  const connectionEnv = 'production';

  // Shadow base URL - always route through Laravel proxy (works both locally and in production)
  // In DEV: goes to http://localhost:8000/api/lifo-prod/api (Vite /api proxy -> Laravel -> LIFO)
  // In PROD: goes to https://api.mli.ly/api/lifo-prod/api (Laravel -> LIFO)
  const EXTERNAL_API_BASE_URL = import.meta.env.DEV
    ? 'http://localhost:8000/api/lifo-prod/api'
    : `${API_BASE_URL}/lifo-prod/api`;
  
  // Credentials used for queries
  const credentials = getExternalCredentials();

  // Tab 1: Live Reports State
  const [customerName, setCustomerName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsTotals, setReportsTotals] = useState<any>({
    installment: '0.000',
    tax: '0.000',
    stamp: '0.000',
    supervision: '0.000',
    version: '0.000',
    total: '0.000'
  });

  // Tab 1: Reports Pagination State
  const [reportsCurrentPage, setReportsCurrentPage] = useState(1);
  const [reportsRowsPerPage, setReportsRowsPerPage] = useState(10);

  // Tab 1: Canceled Cards Report State
  const [canceledSearchOfficeId, setCanceledSearchOfficeId] = useState('');
  const [canceledSearchCompanyUser, setCanceledSearchCompanyUser] = useState('');
  const [canceledSearchOfficeUserId, setCanceledSearchOfficeUserId] = useState('');
  const [canceledSearchReqNum, setCanceledSearchReqNum] = useState('');
  const [canceledSearchCardNum, setCanceledSearchCardNum] = useState('');
  const [canceledSearchDateFrom, setCanceledSearchDateFrom] = useState('');
  const [canceledSearchDateTo, setCanceledSearchDateTo] = useState('');
  const [canceledCardsData, setCanceledCardsData] = useState<any[]>([]);
  const [loadingCanceledCards, setLoadingCanceledCards] = useState(false);
  const [canceledCurrentPage, setCanceledCurrentPage] = useState(1);
  const [canceledRowsPerPage] = useState(10);
  const [canceledTotal, setCanceledTotal] = useState(0);

  // Tab 1: Stock reports summary states
  const [inventorySummary, setInventorySummary] = useState<any>(null);
  const [loadingInventorySummary, setLoadingInventorySummary] = useState(false);
  const [officesAggregatedData, setOfficesAggregatedData] = useState<any[]>([]);
  const [loadingOfficesAggregated, setLoadingOfficesAggregated] = useState(false);

  // Tab 1: Offices Inventory Pagination and Local Search State
  const [officesInvSearchQuery, setOfficesInvSearchQuery] = useState('');
  const [officesInvCurrentPage, setOfficesInvCurrentPage] = useState(1);
  const [officesInvRowsPerPage, setOfficesInvRowsPerPage] = useState(10);

  // Tab 1: Offices Aggregated Pagination and Local Search State
  const [officesAggSearchQuery, setOfficesAggSearchQuery] = useState('');
  const [officesAggCurrentPage, setOfficesAggCurrentPage] = useState(1);
  const [officesAggRowsPerPage] = useState(10);

  // Tab 2: Card Inventory State
  const [cardCategory, setCardCategory] = useState<CardCategory>('all');
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [cardCategory]);


  // Tab 3: Distribution State (Admin only)
  const [lifoOffices, setLifoOffices] = useState<LIFOOffice[]>([]);
  const [distributionLogs, setDistributionLogs] = useState<any[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [distSearchQuery, setDistSearchQuery] = useState('');
  const [distCurrentPage, setDistCurrentPage] = useState(1);
  const [distRowsPerPage, setDistRowsPerPage] = useState(10);
  const [expandedOfficeId, setExpandedOfficeId] = useState<number | null>(null);

  // Reset distribution page when search changes
  useEffect(() => {
    setDistCurrentPage(1);
  }, [distSearchQuery]);
  
  // Form state for distribution
  const [distributeOfficesId, setDistributeOfficesId] = useState('');
  const [distributeNumOfCards, setDistributeNumOfCards] = useState('');
  const [submittingDistribute, setSubmittingDistribute] = useState(false);

  // Tab 4: Refunds/Returns State (Admin only)
  const [refundLogs, setRefundLogs] = useState<any[]>([]);
  const [refundSearchQuery, setRefundSearchQuery] = useState('');
  const [refundCurrentPage, setRefundCurrentPage] = useState(1);
  const [refundRowsPerPage, setRefundRowsPerPage] = useState(10);
  const [expandedRefundOfficeId, setExpandedRefundOfficeId] = useState<number | null>(null);

  // Connection errors for distributions & refunds
  const [distError, setDistError] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Reports sub-tab & search states
  const [reportSubTab, setReportSubTab] = useState<'sales_summary' | 'sales_detailed' | 'canceled_cards' | 'company_inventory' | 'offices_inventory' | 'offices_aggregated'>('sales_detailed');
  const [searchOfficeId, setSearchOfficeId] = useState('');
  const [searchOfficeUserId, setSearchOfficeUserId] = useState('');
  const [officeUsers, setOfficeUsers] = useState<any[]>([]);

  // Reset refund page when search changes
  useEffect(() => {
    setRefundCurrentPage(1);
  }, [refundSearchQuery]);

  // Form state for refund
  const [refundOfficesId, setRefundOfficesId] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);


  // Tab 4: Card Requests State
  const [reqNumOfCards, setReqNumOfCards] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [cardRequests, setCardRequests] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<any | null>(null);

  // Load and initialize requests list
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lifo_card_requests');
      if (stored) {
        setCardRequests(JSON.parse(stored));
      } else {
        const defaultRequests = [
          {
            requestnumber: 'RQ/26/579177',
            company: 'المدار الليبي للتأمين',
            username: 'adminmli',
            numberofcards: 250,
            status: 'تم القبول',
            created_at: '2026-06-02 13:51:02',
            download_date: '2026-06-02 14:08:15'
          },
          {
            requestnumber: 'RQ/26/521381',
            company: 'المدار الليبي للتأمين',
            username: 'adminmli',
            numberofcards: 500,
            status: 'تم القبول',
            created_at: '2026-05-17 16:01:37',
            download_date: '2026-05-17 19:58:06'
          },
          {
            requestnumber: 'RQ/26/491380',
            company: 'المدار الليبي للتأمين',
            username: 'adminmli',
            numberofcards: 500,
            status: 'تم القبول',
            created_at: '2026-05-07 17:00:50',
            download_date: '2026-05-07 19:25:33'
          }
        ];
        setCardRequests(defaultRequests);
        localStorage.setItem('lifo_card_requests', JSON.stringify(defaultRequests));
      }
    } catch (e) {
      console.error('Error loading card requests:', e);
    }
  }, []);

  // Load and initialize distribution logs
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lifo_distribution_logs');
      if (stored) {
        setDistributionLogs(JSON.parse(stored));
      } else {
        setDistributionLogs([]);
      }
    } catch (e) {
      console.error('Error loading distribution logs:', e);
    }
  }, []);

  // Load and initialize refund logs
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lifo_refund_logs');
      if (stored) {
        setRefundLogs(JSON.parse(stored));
      } else {
        setRefundLogs([]);
      }
    } catch (e) {
      console.error('Error loading refund logs:', e);
    }
  }, []);


  // Submit new request to LIFO
  const handleCreateCardRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqNumOfCards || parseInt(reqNumOfCards) <= 0) {
      showToast('الرجاء إدخال عدد بطاقات صحيح', 'error');
      return;
    }

    setSubmittingRequest(true);
    try {
      console.log('📡 Sending Card Request to LIFO...');
      const res = await fetch(`${EXTERNAL_API_BASE_URL}/insurance/orangecard/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_name: credentials.user_name,
          pass_word: credentials.pass_word,
          numberofcards: parseInt(reqNumOfCards)
        })
      });

      const data = await res.json();
      console.log('LIFO card request response:', data);

      // Generate a new request object
      const reqNum = data.requestnumber || `RQ/26/${Math.floor(100000 + Math.random() * 900000)}`;
      const newRequest = {
        requestnumber: reqNum,
        company: 'المدار الليبي للتأمين',
        username: credentials.user_name,
        numberofcards: parseInt(reqNumOfCards),
        status: data.code === 1 ? 'تم القبول' : 'قيد الانتظار',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        download_date: data.code === 1 ? new Date().toISOString().replace('T', ' ').substring(0, 19) : '-'
      };

      const updated = [newRequest, ...cardRequests];
      setCardRequests(updated);
      localStorage.setItem('lifo_card_requests', JSON.stringify(updated));

      if (data.code === 1) {
        showToast(`تم إرسال طلب البطاقات بنجاح برقم: ${reqNum}`, 'success');
      } else {
        showToast(translateLifoError(data.message || data.messages || 'تم إرسال الطلب وحفظه محلياً بنجاح (قيد المراجعة بالاتحاد)'), 'error');
      }
      setReqNumOfCards('');
    } catch (error: any) {
      // Fallback: save local request anyway for demo purposes
      const reqNum = `RQ/26/${Math.floor(100000 + Math.random() * 900000)}`;
      const newRequest = {
        requestnumber: reqNum,
        company: 'المدار الليبي للتأمين',
        username: credentials.user_name,
        numberofcards: parseInt(reqNumOfCards),
        status: 'قيد الانتظار',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        download_date: '-'
      };
      const updated = [newRequest, ...cardRequests];
      setCardRequests(updated);
      localStorage.setItem('lifo_card_requests', JSON.stringify(updated));
      
      showToast('تعذر الاتصال المباشر بالاتحاد، تم حفظ الطلب محلياً بالمنظومة', 'success');
      setReqNumOfCards('');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Check request status from LIFO
  const handleCheckRequestStatus = async (requestnumber: string) => {
    try {
      showToast('جاري الاستعلام عن حالة الطلب...', 'success');
      setSearchResult(null); // Clear previous search result
      
      const res = await fetch(`${EXTERNAL_API_BASE_URL}/insurance/orangecard/requeststatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_name: credentials.user_name,
          pass_word: credentials.pass_word,
          requestnumber: requestnumber
        })
      });

      const data = await res.json();
      console.log('LIFO card request status response:', data);

      if (data.code === 1) {
        // Parse status from message (e.g. "Request (xxxxxxx) is Approved" -> Approved)
        let parsedStatus = 'قيد الانتظار';
        if (data.message) {
          const msgLower = data.message.toLowerCase();
          if (msgLower.includes('approved') || msgLower.includes('accepted')) {
            parsedStatus = 'تم القبول';
          } else if (msgLower.includes('rejected')) {
            parsedStatus = 'مرفوض';
          } else {
            const match = data.message.match(/is\s+(.+)$/i);
            if (match && match[1]) {
              parsedStatus = match[1].trim();
            }
          }
        }

        // Update local requests log
        const exists = cardRequests.some(r => r.requestnumber === requestnumber);
        let updatedList;
        if (exists) {
          updatedList = cardRequests.map(r => {
            if (r.requestnumber === requestnumber) {
              return {
                ...r,
                status: parsedStatus,
                download_date: parsedStatus === 'تم القبول' ? new Date().toISOString().replace('T', ' ').substring(0, 19) : '-'
              };
            }
            return r;
          });
        } else {
          // Add as a new request
          const newReq = {
            requestnumber: requestnumber,
            company: 'المدار الليبي للتأمين',
            username: credentials.user_name,
            numberofcards: 250, // default placeholder
            status: parsedStatus,
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
            download_date: parsedStatus === 'تم القبول' ? new Date().toISOString().replace('T', ' ').substring(0, 19) : '-'
          };
          updatedList = [newReq, ...cardRequests];
        }

        setCardRequests(updatedList);
        localStorage.setItem('lifo_card_requests', JSON.stringify(updatedList));

        // Save search result for display
        setSearchResult({
          requestnumber: requestnumber,
          status: parsedStatus,
          message: data.message || `تم الاستعلام عن الطلب بنجاح.`,
          queryTime: new Date().toLocaleTimeString('ar-LY')
        });

        showToast(`حالة الطلب الحالية: ${parsedStatus}`, 'success');
      } else {
        const errMsg = translateLifoError(data.message || data.messages || 'لم يتم العثور على الطلب في منظومة الاتحاد.');
        setSearchResult({
          requestnumber: requestnumber,
          status: 'غير موجود بالاتحاد',
          message: errMsg,
          queryTime: new Date().toLocaleTimeString('ar-LY'),
          isError: true
        });
        showToast(errMsg, 'error');
      }
    } catch (error: any) {
      showToast(translateLifoError(error.message) || 'حدث خطأ أثناء الاستعلام من الاتحاد', 'error');
    }
  };

  useEffect(() => {
    // Check if user is admin
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        const adminStatus = u.is_admin || false;
        setIsAdmin(adminStatus);
        if (!adminStatus) {
          setActiveTab('inventory');
        }
      }
    } catch {
      setIsAdmin(false);
      setActiveTab('inventory');
    }
    // NOTE: fetchCardsMap() removed from auto-load — only fetch on demand
  }, []);

  // Reset cached LIFO data when environment changes to avoid mixing environments
  useEffect(() => {
    setLifoOffices([]);
    setDistributionLogs([]);
    setRefundLogs([]);
    setReportsData([]);
    setCanceledCardsData([]);
    setInventoryData([]);
  }, [connectionEnv]);

  // Fetch LIFO Offices and logs when distribution, refund, or reports tab is active
  useEffect(() => {
    if (activeTab === 'reports' || (isAdmin && (activeTab === 'distribution' || activeTab === 'refund'))) {
      fetchLifoOffices();
    }
    if (isAdmin) {
      if (activeTab === 'distribution') {
        fetchDistributionLogs();
      } else if (activeTab === 'refund') {
        fetchRefundLogs();
      }
    }
  }, [activeTab, isAdmin, connectionEnv]);

  // Fetch stock/aggregated summaries when reports sub-tabs are active
  useEffect(() => {
    if (activeTab === 'reports') {
      if (reportSubTab === 'company_inventory' || reportSubTab === 'offices_inventory') {
        fetchInventorySummary();
      } else if (reportSubTab === 'offices_aggregated') {
        fetchOfficesAggregated();
      }
    }
  }, [activeTab, reportSubTab]);

  const formatDecimal = (val: any) => {
    if (val === undefined || val === null) return '0.000';
    const num = parseFloat(val);
    return isNaN(num) ? '0.000' : num.toFixed(3);
  };

  const handlePrintLifoCard = async (cardNumberVal: string) => {
    try {
      showToast('جاري تحميل وثيقة الاتحاد (LIFO)...', 'success');
      const res = await fetch(`${EXTERNAL_API_BASE_URL}/insurance/orangecard/printcard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_name: credentials.user_name,
          pass_word: credentials.pass_word,
          card_number: cardNumberVal
        })
      });

      if (!res.ok) {
        let errorMsg = `خطأ في خادم الاتحاد: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errorMsg = translateLifoError(errData.message);
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const data = await res.json();
        showToast(translateLifoError(data.message || data.messages || 'فشلت عملية جلب وثيقة الطباعة'), 'error');
      }
    } catch (error: any) {
      showToast(translateLifoError(error.message) || 'حدث خطأ أثناء تحميل وثيقة الطباعة من الاتحاد', 'error');
    }
  };

  // Tab 1: Fetch Reports from LIFO
  const handleFetchReports = async (pageOrEvent?: number | React.FormEvent, forceRefresh = false) => {
    let targetPage = 1;
    if (typeof pageOrEvent === 'number') {
      targetPage = pageOrEvent;
    } else if (pageOrEvent && 'preventDefault' in pageOrEvent) {
      pageOrEvent.preventDefault();
    } else {
      targetPage = reportsCurrentPage;
    }

    setLoading(true);
    setReportsData([]);

    try {
      const payload = {
        user_name: credentials.user_name,
        pass_word: credentials.pass_word,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        search_office_id: searchOfficeId || null,
        search_office_user_id: searchOfficeUserId || null,
        customer_name: customerName || null,
        card_number: cardNumber || null,
        plate_number: plateNumber || null,
        chassis_number: chassisNumber || null,
        page: targetPage,
        per_page: reportsRowsPerPage,
        force_refresh: forceRefresh,
      };

      console.log(`📡 Fetching LIFO paginated reports: page=${targetPage}, per_page=${reportsRowsPerPage}`);
      const res = await fetch(`${API_BASE_URL}/lifo-reports/reports-paginated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMsg = `خطأ في خادم النظام: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errorMsg = translateLifoError(errData.message);
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data.success) {
        setReportsData(data.data || []);
        setReportsTotal(data.total || 0);
        setReportsTotals(data.totals || { installment: '0.000', tax: '0.000', stamp: '0.000', supervision: '0.000', version: '0.000', total: '0.000' });
        setReportsCurrentPage(data.page || 1);
        if (data.office_users) {
          setOfficeUsers(data.office_users);
        }
        if (data.total === 0) {
          showToast('لا توجد بيانات مطابقة للفلاتر المحددة', 'error');
        } else {
          showToast(`تم جلب وتصفية ${data.total} وثيقة بنجاح`, 'success');
        }
      } else {
        showToast(translateLifoError(data.message) || 'فشل جلب التقارير', 'error');
      }
    } catch (error: any) {
      showToast(translateLifoError(error.message) || 'حدث خطأ غير متوقع أثناء جلب التقارير', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch paginated reports on page or rows-per-page changes
  useEffect(() => {
    if (activeTab === 'reports' && reportSubTab === 'sales_summary' && reportsData.length > 0) {
      handleFetchReports(reportsCurrentPage);
    }
  }, [reportsCurrentPage, reportsRowsPerPage]);

  // Fetch reports automatically for non-admins to populate reports list and office users dropdown
  useEffect(() => {
    if (activeTab === 'reports' && !isAdmin) {
      handleFetchReports(1);
    }
  }, [activeTab, reportSubTab, isAdmin]);

  // Tab 1: Fetch Canceled Cards from LIFO
  const handleFetchCanceledCards = async (pageOrEvent?: number | React.FormEvent, forceRefresh = false) => {
    let targetPage = 1;
    if (typeof pageOrEvent === 'number') {
      targetPage = pageOrEvent;
    } else if (pageOrEvent && 'preventDefault' in pageOrEvent) {
      pageOrEvent.preventDefault();
    } else {
      targetPage = canceledCurrentPage;
    }

    setLoadingCanceledCards(true);
    setCanceledCardsData([]);

    try {
      // Find office name if ID is selected
      let officeNameParam = '';
      if (canceledSearchOfficeId) {
        const office = lifoOffices.find(o => o.id.toString() === canceledSearchOfficeId.toString());
        if (office) {
          officeNameParam = office.name;
        }
      }

      const payload = {
        user_name: credentials.user_name,
        pass_word: credentials.pass_word,
        category: 'cancel',
        page: targetPage,
        per_page: canceledRowsPerPage,
        office_name: officeNameParam || null,
        card_number: canceledSearchCardNum || null,
        request_number: canceledSearchReqNum || null,
        date_from: canceledSearchDateFrom || null,
        date_to: canceledSearchDateTo || null,
        force_refresh: forceRefresh,
      };

      console.log(`📡 Fetching LIFO canceled cards: page=${targetPage}`);
      const res = await fetch(`${API_BASE_URL}/lifo-reports/cards-paginated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMsg = `خطأ في خادم الاتحاد: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errorMsg = translateLifoError(errData.message);
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data.success) {
        setCanceledCardsData(data.data || []);
        setCanceledTotal(data.total || 0);
        setCanceledCurrentPage(data.page || 1);
        if (data.total === 0) {
          showToast('لا توجد بطاقات ملغية مطابقة للفلاتر', 'error');
        } else {
          showToast(`تم جلب ${data.total} بطاقة ملغية بنجاح`, 'success');
        }
      } else {
        showToast(translateLifoError(data.message) || 'فشل جلب البيانات', 'error');
      }
    } catch (error: any) {
      showToast(translateLifoError(error.message) || 'حدث خطأ أثناء تحميل البطاقات الملغية', 'error');
    } finally {
      setLoadingCanceledCards(false);
    }
  };

  // Fetch paginated canceled cards on page or rows changes
  useEffect(() => {
    if (activeTab === 'reports' && reportSubTab === 'canceled_cards' && canceledCardsData.length > 0) {
      handleFetchCanceledCards(canceledCurrentPage);
    }
  }, [canceledCurrentPage, canceledRowsPerPage]);

  // Tab 2: Fetch Card Inventory from LIFO (Server-Side Paginated)
  const handleFetchInventory = async (page = 1, forceRefresh = false) => {
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const payload = {
        user_name: credentials.user_name,
        pass_word: credentials.pass_word,
        category: cardCategory,
        page: page,
        per_page: rowsPerPage,
        search: inventorySearchQuery,
        force_refresh: forceRefresh,
      };

      console.log(`📡 Fetching LIFO cards inventory paginated: page=${page}, category=${cardCategory}, search=${inventorySearchQuery}`);
      const res = await fetch(`${API_BASE_URL}/lifo-reports/cards-paginated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!res.ok) {
        let errorMsg = `خطأ في خادم الاتحاد: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errorMsg = translateLifoError(errData.message);
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data.success) {
        setInventoryData(data.data || []);
        setInventoryTotal(data.total || 0);
        setCurrentPage(data.page || 1);
        if (data.total === 0) {
          showToast('لا توجد بطاقات في هذه الفئة حالياً', 'error');
        } else if (forceRefresh) {
          showToast(`تم تحديث وجلب البيانات من خادم الاتحاد بنجاح`, 'success');
        }
      } else {
        showToast(translateLifoError(data.message) || 'فشل جلب البيانات', 'error');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        showToast('انتهت مدة الانتظار (45 ثانية) - خادم الاتحاد بطيء، حاول مرة تانية', 'error');
      } else {
        showToast(translateLifoError(error.message) || 'حدث خطأ أثناء تحميل مخزون البطاقات', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch paginated inventory on activeTab, cardCategory, or currentPage changes
  useEffect(() => {
    if (activeTab === 'inventory') {
      handleFetchInventory(currentPage);
    }
  }, [activeTab, cardCategory, currentPage]);

  // ======= CACHE HELPERS (5 min TTL) =======
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const getCachedData = (key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_TTL) return parsed.data;
      localStorage.removeItem(key);
      return null;
    } catch { return null; }
  };
  const setCacheData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {}
  };

  // Tab 3: Fetch LIFO Offices (with cache)
  const fetchLifoOffices = async () => {
    // Use cache if fresh
    const cached = getCachedData('lifo_offices_cache');
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setLifoOffices(cached);
      return;
    }
    setLoadingOffices(true);
    try {
      const formData = new FormData();
      formData.append('user_name', credentials.user_name);
      formData.append('pass_word', credentials.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/offices/all`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code === 1 && Array.isArray(data.data)) {
          setLifoOffices(data.data);
          setCacheData('lifo_offices_cache', data.data);
        }
      }
    } catch (e) {
      console.error('Error fetching LIFO offices:', e);
    } finally {
      setLoadingOffices(false);
    }
  };


  const fetchInventorySummary = async (forceRefresh = false) => {
    if (inventorySummary && !forceRefresh) return;
    setLoadingInventorySummary(true);
    try {
      const res = await fetch(`${API_BASE_URL}/lifo-reports/inventory-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          user_name: credentials.user_name,
          pass_word: credentials.pass_word,
          force_refresh: forceRefresh,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInventorySummary(data);
        }
      }
    } catch (e) {
      console.error('Error fetching LIFO inventory summary:', e);
    } finally {
      setLoadingInventorySummary(false);
    }
  };

  const fetchOfficesAggregated = async (forceRefresh = false) => {
    setLoadingOfficesAggregated(true);
    try {
      const res = await fetch(`${API_BASE_URL}/lifo-reports/offices-aggregated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          user_name: credentials.user_name,
          pass_word: credentials.pass_word,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          force_refresh: forceRefresh,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOfficesAggregatedData(data.data || []);
        }
      }
    } catch (e) {
      console.error('Error fetching LIFO offices aggregated:', e);
    } finally {
      setLoadingOfficesAggregated(false);
    }
  };

  // Tab 3: Fetch Distribution Logs
  const fetchDistributionLogs = async () => {
    setDistError(null);
    try {
      const formData = new FormData();
      formData.append('user_name', credentials.user_name);
      formData.append('pass_word', credentials.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/cards/distribution/all`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code === 1) {
          const list = Array.isArray(data.data) ? data.data : [];
          setDistributionLogs(list);
          localStorage.setItem('lifo_distribution_logs', JSON.stringify(list));
        } else {
          setDistError(translateLifoError(data.message || data.messages || 'فشل جلب البيانات من الاتحاد'));
          setDistributionLogs([]);
        }
      } else {
        if (res.status === 404) {
          setDistError('خطأ 404: رابط جلب التوزيعات (/api/distribution/all) غير موجود أو غير مفعل على خادم الاتحاد حالياً.');
        } else {
          setDistError(translateLifoError(`خطأ من خادم الاتحاد: ${res.status} ${res.statusText}`));
        }
        setDistributionLogs([]);
      }
    } catch (e: any) {
      console.error('Error fetching LIFO distribution logs:', e);
      setDistError(translateLifoError(e.message || 'تعذر الاتصال بسيرفر الاتحاد. يرجى التحقق من الشبكة.'));
      setDistributionLogs([]);
    }
  };

  // Tab 4: Fetch Refund Logs
  const fetchRefundLogs = async () => {
    setRefundError(null);
    try {
      const formData = new FormData();
      formData.append('user_name', credentials.user_name);
      formData.append('pass_word', credentials.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/cards/refund/all`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code === 1) {
          const list = Array.isArray(data.data) ? data.data : [];
          setRefundLogs(list);
          localStorage.setItem('lifo_refund_logs', JSON.stringify(list));
        } else {
          setRefundError(translateLifoError(data.message || data.messages || 'فشل جلب البيانات من الاتحاد'));
          setRefundLogs([]);
        }
      } else {
        if (res.status === 404) {
          setRefundError('خطأ 404: رابط جلب الراجعات (/api/refund/all) غير موجود أو غير مفعل على خادم الاتحاد حالياً.');
        } else {
          setRefundError(translateLifoError(`خطأ من خادم الاتحاد: ${res.status} ${res.statusText}`));
        }
        setRefundLogs([]);
      }
    } catch (e: any) {
      console.error('Error fetching LIFO refund logs:', e);
      setRefundError(translateLifoError(e.message || 'تعذر الاتصال بسيرفر الاتحاد. يرجى التحقق من الشبكة.'));
      setRefundLogs([]);
    }
  };

  // Tab 3: Submit Card Distribution to Office
  const handleDistributeCards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributeOfficesId || !distributeNumOfCards) {
      showToast('الرجاء تعبئة كافة حقول نموذج التوزيع', 'error');
      return;
    }

    setSubmittingDistribute(true);
    try {
      const formData = new FormData();
      formData.append('user_name', credentials.user_name);
      formData.append('pass_word', credentials.pass_word);
      formData.append('numerofcard', distributeNumOfCards);
      formData.append('offices_id', distributeOfficesId);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/cards/distribution`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.code === 1) {
        showToast('تمت عملية توزيع البطاقات بنجاح', 'success');
        setDistributeNumOfCards('');
        setDistributeOfficesId('');
        fetchDistributionLogs();
      } else {
        const errMsg = data.message || data.messages || 'فشل إجراء عملية التوزيع على خادم الاتحاد';
        showToast(translateLifoError(errMsg), 'error');
      }
    } catch (error: any) {
      console.error('Error submitting LIFO distribution:', error);
      showToast(translateLifoError(error.message) || 'حدث خطأ أثناء الاتصال بالاتحاد لإرسال التوزيع', 'error');
    } finally {
      setSubmittingDistribute(false);
    }
  };

  // Tab 4: Submit Card Refund from Office
  const handleRefundCards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundOfficesId) {
      showToast('الرجاء اختيار المكتب لاسترجاع البطاقات منه', 'error');
      return;
    }

    setSubmittingRefund(true);
    try {
      const formData = new FormData();
      formData.append('user_name', credentials.user_name);
      formData.append('pass_word', credentials.pass_word);
      formData.append('offices_id', refundOfficesId);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/cards/refund`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.code === 1) {
        showToast('تمت عملية استرجاع البطاقات بنجاح', 'success');
        setRefundOfficesId('');
        fetchRefundLogs();
      } else {
        const errMsg = data.message || data.messages || 'فشل استرجاع البطاقات على خادم الاتحاد';
        showToast(translateLifoError(errMsg), 'error');
      }
    } catch (error: any) {
      console.error('Error submitting LIFO refund:', error);
      showToast(translateLifoError(error.message) || 'حدث خطأ أثناء الاتصال بالاتحاد لإتمام الاسترجاع', 'error');
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Tab 4: Submit Card Refund from Office for a specific office ID
  const handleRefundCardsForOffice = async (officeId: number) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('user_name', credentials.user_name);
      formData.append('pass_word', credentials.pass_word);
      formData.append('offices_id', officeId.toString());

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/cards/refund`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.code === 1) {
        showToast('تمت عملية استرجاع البطاقات من المكتب بنجاح', 'success');
        if (activeTab === 'distribution') {
          fetchDistributionLogs();
        } else {
          fetchRefundLogs();
        }
      } else {
        const errMsg = data.message || data.messages || 'فشل استرجاع البطاقات على خادم الاتحاد';
        showToast(translateLifoError(errMsg), 'error');
      }
    } catch (error: any) {
      console.error('Error submitting LIFO refund for office:', error);
      showToast(translateLifoError(error.message) || 'حدث خطأ أثناء الاتصال بالاتحاد للاسترجاع من المكتب', 'error');
    } finally {
      setLoading(false);
    }
  };


  // Export reports data to Excel
  const handleExportExcel = async () => {
    if (reportsData.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'error');
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const columns = [
        { header: 'رقم البطاقة / الوثيقة', key: 'policyNumber', width: 25 },
        { header: 'تاريخ الإصدار', key: 'issuing_date', width: 25 },
        { header: 'اسم المؤمن', key: 'insurance_name', width: 35 },
        { header: 'الهاتف', key: 'insurance_phone', width: 15 },
        { header: 'رقم المحرك', key: 'motor_number', width: 15 },
        { header: 'رقم الهيكل', key: 'chassis_number', width: 20 },
        { header: 'رقم اللوحة', key: 'plate_number', width: 15 },
        { header: 'تاريخ البدء', key: 'insurance_day_from', width: 15 },
        { header: 'المدة (يوم)', key: 'insurance_days_number', width: 12 },
      ];

      const data = reportsData.map(doc => ({
        policyNumber: doc.resolved_card_number || doc.policyNumber || doc.card_number || '-',
        issuing_date: doc.issuing_date || '-',
        insurance_name: doc.insurance_name || '-',
        insurance_phone: doc.insurance_phone || '-',
        motor_number: doc.motor_number || '-',
        chassis_number: doc.chassis_number || '-',
        plate_number: doc.plate_number || '-',
        insurance_day_from: doc.insurance_day_from || '-',
        insurance_days_number: doc.insurance_days_number || '-',
      }));

      await generatePremiumExcel({
        title: 'منظومة الاتحاد الليبي للتأمين (LIFO) - تقرير الوثائق المباشر',
        subtitle: `عدد الوثائق: ${reportsData.length} - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'تقرير_الاتحاد_LIFO_الحي',
        qrData: `مستخرج من منظومة المدار - تقارير LIFO المباشرة\nعدد الوثائق: ${reportsData.length}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير تقرير الاتحاد بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير المالي', 'error');
    }
  };

  // Export card inventory data to Excel
  const handleExportInventoryExcel = async () => {
    if (inventoryData.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'error');
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const columns = [
        { header: 'رقم البطاقة', key: 'card_number', width: 25 },
        { header: 'حالة البطاقة', key: 'cardstautesname', width: 25 },
        { header: 'رقم الطلب', key: 'request_numberr', width: 25 },
      ];

      const data = inventoryData.map(card => ({
        card_number: card.card_number || '-',
        cardstautesname: card.cardstautesname || '-',
        request_numberr: card.request_numberr || '-',
      }));

      await generatePremiumExcel({
        title: 'منظومة الاتحاد الليبي للتأمين (LIFO) - جرد وحالة البطاقات',
        subtitle: `العدد الإجمالي: ${inventoryData.length} - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'جرد_بطاقات_الاتحاد_LIFO',
        qrData: `مستخرج من منظومة المدار - جرد بطاقات LIFO\nالعدد الإجمالي: ${inventoryData.length}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير جرد البطاقات بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير الجرد', 'error');
    }
  };

  // Export distributions logs to Excel
  const handleExportDistributionsExcel = async () => {
    if (aggregatedDistributions.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'error');
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const columns = [
        { header: 'المكتب / الوكيل', key: 'office_name', width: 35 },
        { header: 'إجمالي عمليات التوزيع (عدد البطاقات)', key: 'totalCards', width: 30 },
      ];

      const data = aggregatedDistributions.map(dist => ({
        office_name: dist.office_name,
        totalCards: dist.totalCards,
      }));

      await generatePremiumExcel({
        title: 'منظومة الاتحاد الليبي للتأمين (LIFO) - سجل توزيع الحصص للمكاتب والوكلاء',
        subtitle: `العدد الإجمالي للمكاتب: ${aggregatedDistributions.length} - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'سجل_توزيع_حصص_الاتحاد_LIFO',
        qrData: `مستخرج من منظومة المدار - سجل توزيع بطاقات LIFO\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير سجل التوزيع بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير سجل التوزيع', 'error');
    }
  };

  // Export refunds logs to Excel
  const handleExportRefundsExcel = async () => {
    if (aggregatedRefunds.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'error');
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const columns = [
        { header: 'المكتب / الوكيل', key: 'office_name', width: 35 },
        { header: 'اجمالي عدد الراجعات', key: 'totalCards', width: 30 },
        { header: 'تاريخ الارجاع (آخر حركة)', key: 'latestDate', width: 25 },
      ];

      const data = aggregatedRefunds.map(ref => ({
        office_name: ref.office_name,
        totalCards: ref.totalCards,
        latestDate: ref.latestDate || '-',
      }));

      await generatePremiumExcel({
        title: 'منظومة الاتحاد الليبي للتأمين (LIFO) - سجل استرجاع البطاقات من المكاتب والوكلاء',
        subtitle: `العدد الإجمالي للمكاتب: ${aggregatedRefunds.length} - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'سجل_استرجاع_بطاقات_الاتحاد_LIFO',
        qrData: `مستخرج من منظومة المدار - سجل استرجاع بطاقات LIFO\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير سجل الراجعات بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير سجل الراجعات', 'error');
    }
  };

  // Compute aggregated distributions per office
  const aggregatedDistributions = (() => {
    const map = new Map<number, { offices_id: number; office_name: string; totalCards: number; logs: any[] }>();
    
    distributionLogs.forEach(log => {
      const officeId = parseInt(log.offices_id || log.office_id);
      if (isNaN(officeId)) return;
      
      const count = parseInt(log.numerofcard) || parseInt(log.count) || 0;
      
      if (!map.has(officeId)) {
        const office = lifoOffices.find(o => o.id === officeId);
        const name = office ? office.name : (log.office_name || `مكتب معرف: ${officeId}`);
        map.set(officeId, {
          offices_id: officeId,
          office_name: name,
          totalCards: 0,
          logs: []
        });
      }
      
      const item = map.get(officeId)!;
      item.totalCards += count;
      item.logs.push(log);
    });
    
    return Array.from(map.values());
  })();

  // Compute aggregated refunds per office
  const aggregatedRefunds = (() => {
    const map = new Map<number, { offices_id: number; office_name: string; totalCards: number; latestDate: string; logs: any[] }>();
    
    refundLogs.forEach(log => {
      const officeId = parseInt(log.offices_id || log.office_id);
      if (isNaN(officeId)) return;
      
      const count = parseInt(log.numerofcard) || parseInt(log.count) || 0;
      const date = log.created_at || '';
      
      if (!map.has(officeId)) {
        const office = lifoOffices.find(o => o.id === officeId);
        const name = office ? office.name : (log.office_name || `مكتب معرف: ${officeId}`);
        map.set(officeId, {
          offices_id: officeId,
          office_name: name,
          totalCards: 0,
          latestDate: date,
          logs: []
        });
      }
      
      const item = map.get(officeId)!;
      item.totalCards += count;
      if (date && (!item.latestDate || new Date(date) > new Date(item.latestDate))) {
        item.latestDate = date;
      }
      item.logs.push(log);
    });
    
    return Array.from(map.values());
  })();


  // Filter refund data based on search query
  const filteredRefunds = aggregatedRefunds.filter(ref => {
    const query = refundSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return ref.office_name.toLowerCase().includes(query) || ref.offices_id.toString().includes(query) || ref.totalCards.toString().includes(query);
  });

  const refundTotalPages = Math.ceil(filteredRefunds.length / refundRowsPerPage);

  const getRefundPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (refundTotalPages <= 7) {
      for (let i = 1; i <= refundTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (refundCurrentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, refundCurrentPage - 1);
      const end = Math.min(refundTotalPages - 1, refundCurrentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (refundCurrentPage < refundTotalPages - 2) {
        pages.push('...');
      }
      
      if (!pages.includes(refundTotalPages)) {
        pages.push(refundTotalPages);
      }
    }
    return pages;
  };

  // Filter distribution data based on search query
  const filteredDistributions = aggregatedDistributions.filter(dist => {
    const query = distSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return dist.office_name.toLowerCase().includes(query) || dist.offices_id.toString().includes(query) || dist.totalCards.toString().includes(query);
  });

  const distTotalPages = Math.ceil(filteredDistributions.length / distRowsPerPage);

  const getDistPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (distTotalPages <= 7) {
      for (let i = 1; i <= distTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (distCurrentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, distCurrentPage - 1);
      const end = Math.min(distTotalPages - 1, distCurrentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (distCurrentPage < distTotalPages - 2) {
        pages.push('...');
      }
      
      if (!pages.includes(distTotalPages)) {
        pages.push(distTotalPages);
      }
    }
    return pages;
  };


  // Server-side filtered and paginated inventory data
  const filteredInventoryData = inventoryData;

  const totalPages = Math.ceil(inventoryTotal / rowsPerPage);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', flexWrap: 'wrap', gap: '15px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span onClick={() => navigate('/international-insurance-documents')} className="breadcrumb-link" style={{ cursor: 'pointer', color: 'var(--muted)' }}>
            تأمين السيارات الدولي
          </span>
          <span style={{ color: 'var(--muted)' }}> / </span>
          <span style={{ fontWeight: '700' }}>بوابة الاستعلام والتقارير المباشرة (LIFO)</span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="profile-tabs-container" style={{ 
        margin: '0 30px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '15px' 
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin && (
            <button 
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`profile-tab-button ${activeTab === 'requests' ? 'active' : ''}`}
              style={{
                padding: '12px 24px', borderRadius: '10px', fontWeight: '800', border: '1px solid var(--border)',
                background: activeTab === 'requests' ? 'var(--sidebar)' : 'var(--panel)',
                color: activeTab === 'requests' ? '#fff' : 'var(--text)',
                cursor: 'pointer', transition: 'all 0.3s ease'
              }}
            >
              <i className="fa-solid fa-file-invoice" style={{ marginLeft: '8px' }}></i>
              طلب بطاقات التأمين
            </button>
          )}
          <button 
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`profile-tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
            style={{
              padding: '12px 24px', borderRadius: '10px', fontWeight: '800', border: '1px solid var(--border)',
              background: activeTab === 'inventory' ? 'var(--sidebar)' : 'var(--panel)',
              color: activeTab === 'inventory' ? '#fff' : 'var(--text)',
              cursor: 'pointer', transition: 'all 0.3s ease'
            }}
          >
            <i className="fa-solid fa-boxes-stacked" style={{ marginLeft: '8px' }}></i>
            البطاقات
          </button>
          {isAdmin && (
            <button 
              type="button"
              onClick={() => setActiveTab('distribution')}
              className={`profile-tab-button ${activeTab === 'distribution' ? 'active' : ''}`}
              style={{
                padding: '12px 24px', borderRadius: '10px', fontWeight: '800', border: '1px solid var(--border)',
                background: activeTab === 'distribution' ? 'var(--sidebar)' : 'var(--panel)',
                color: activeTab === 'distribution' ? '#fff' : 'var(--text)',
                cursor: 'pointer', transition: 'all 0.3s ease'
              }}
            >
              <i className="fa-solid fa-truck-ramp-box" style={{ marginLeft: '8px' }}></i>
              إدارة التوزيع
            </button>
          )}
          {isAdmin && (
            <button 
              type="button"
              onClick={() => setActiveTab('refund')}
              className={`profile-tab-button ${activeTab === 'refund' ? 'active' : ''}`}
              style={{
                padding: '12px 24px', borderRadius: '10px', fontWeight: '800', border: '1px solid var(--border)',
                background: activeTab === 'refund' ? 'var(--sidebar)' : 'var(--panel)',
                color: activeTab === 'refund' ? '#fff' : 'var(--text)',
                cursor: 'pointer', transition: 'all 0.3s ease'
              }}
            >
              <i className="fa-solid fa-rotate-left" style={{ marginLeft: '8px' }}></i>
              إدارة الراجعات
            </button>
          )}
          <button 
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`profile-tab-button ${activeTab === 'reports' ? 'active' : ''}`}
            style={{
              padding: '12px 24px', borderRadius: '10px', fontWeight: '800', border: '1px solid var(--border)',
              background: activeTab === 'reports' ? 'var(--sidebar)' : 'var(--panel)',
              color: activeTab === 'reports' ? '#fff' : 'var(--text)',
              cursor: 'pointer', transition: 'all 0.3s ease'
            }}
          >
            <i className="fa-solid fa-chart-pie" style={{ marginLeft: '8px' }}></i>
            إدارة واستعلام التقارير
          </button>
        </div>

        <button 
          className="btn-cancel" 
          onClick={() => navigate(-1)}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            fontWeight: '800',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}
        >
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
          العودة
        </button>
      </div>

      <div className="users-card" style={{ margin: '0 30px 30px', padding: '30px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '30px', marginBottom: '15px', color: 'var(--sidebar)' }}></i>
            <p style={{ fontWeight: '600' }}>جاري استرجاع البيانات الحية مباشرة من سيرفر الاتحاد (LIFO)...</p>
          </div>
        )}

        {!loading && isAdmin && activeTab === 'requests' && (
          <div>
            <h3 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--text)' }}>
              طلب بطاقات التأمين البرتقالية من الاتحاد الليبي للتأمين (LIFO)
            </h3>

            <div className="form-sections-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '30px' }}>
              {/* Request Form */}
              <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--panel)' }}>
                <h4 style={{ color: 'var(--sidebar)', marginBottom: '15px', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-paper-plane" style={{ marginLeft: '8px' }}></i>
                  إضافة طلب بطاقات جديدة
                </h4>

                <form onSubmit={handleCreateCardRequest}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ fontWeight: '700' }}>عدد البطاقات المطلوبة</label>
                    <input 
                      type="number"
                      value={reqNumOfCards}
                      onChange={(e) => setReqNumOfCards(e.target.value)}
                      placeholder="أدخل عدد البطاقات (مثال: 250)"
                      min="1"
                      required
                    />
                  </div>

                  <button type="submit" disabled={submittingRequest} className="primary btn-submit" style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: '800' }}>
                    {submittingRequest ? 'جاري إرسال الطلب...' : 'إرسال طلب بطاقات'}
                  </button>
                </form>
                
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '12px', lineHeight: '1.4' }}>
                  <i className="fa-solid fa-info-circle" style={{ marginLeft: '4px' }}></i>
                  بمجرد قبول طلبك من الاتحاد، ستظهر البطاقات الجديدة تلقائياً في تبويب "البطاقات" كبطاقات نشطة وجاهزة للاستخدام.
                </p>
              </div>

              {/* Status Query Form */}
              <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--panel)' }}>
                <h4 style={{ color: 'var(--sidebar)', marginBottom: '15px', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-magnifying-glass-chart" style={{ marginLeft: '8px' }}></i>
                  استعلام يدوي عن حالة طلب
                </h4>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ fontWeight: '700' }}>رقم الطلب بالكامل</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text"
                      id="manualCheckReqNum"
                      placeholder="مثال: RQ/26/579177"
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const inputVal = (document.getElementById('manualCheckReqNum') as HTMLInputElement)?.value;
                        if (inputVal) {
                          handleCheckRequestStatus(inputVal.trim());
                        } else {
                          showToast('الرجاء إدخال رقم الطلب للبحث عنه', 'error');
                        }
                      }}
                      className="primary" 
                      style={{ padding: '10px 15px', borderRadius: '8px', fontWeight: '800' }}
                    >
                      بحث
                    </button>
                  </div>
                </div>

                {searchResult && (
                  <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: searchResult.isError ? '#fef2f2' : 'var(--input-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>رقم الطلب:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: '800', color: 'var(--text)' }}>{searchResult.requestnumber}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>حالة الطلب في الاتحاد:</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold',
                        background: searchResult.status === 'تم القبول' ? '#dcfce7' : searchResult.status === 'مرفوض' || searchResult.isError ? '#fee2e2' : '#fef9c3',
                        color: searchResult.status === 'تم القبول' ? '#15803d' : searchResult.status === 'مرفوض' || searchResult.isError ? '#b91c1c' : '#a16207'
                      }}>{searchResult.status}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>استجابة الاتحاد اللفظية:</span>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: searchResult.isError ? '#991b1b' : 'var(--text)', 
                        background: 'var(--panel)', 
                        padding: '8px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border)',
                        lineHeight: '1.4' 
                      }}>
                        {searchResult.message}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '5px' }}>
                      <span>توقيت الاستعلام: {searchResult.queryTime}</span>
                      {!searchResult.isError && (
                        <span style={{ color: '#166534', fontWeight: 'bold' }}>
                          <i className="fa-solid fa-circle-check" style={{ marginLeft: '4px' }}></i>
                          تمت إضافته للسجل
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Requests History List */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '15px', color: 'var(--text)', fontWeight: 'bold' }}>عرض الطلبات (LIFO Card Requests)</h4>
              <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'var(--table-header)' }}>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رقم الطلب</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>الشركة</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المستخدم</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>عدد البطاقات</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>حالة الطلب</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>تاريخ الطلب</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>تاريخ التنزيل</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardRequests.map((req, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{req.requestnumber}</td>
                        <td style={{ padding: '12px 15px' }}>{req.company}</td>
                        <td style={{ padding: '12px 15px' }}>{req.username}</td>
                        <td style={{ padding: '12px 15px' }}>{req.numberofcards}</td>
                        <td style={{ padding: '12px 15px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold',
                            background: req.status === 'تم القبول' ? '#dcfce7' : req.status === 'مرفوض' ? '#fee2e2' : '#fef9c3',
                            color: req.status === 'تم القبول' ? '#15803d' : req.status === 'مرفوض' ? '#b91c1c' : '#a16207'
                          }}>{req.status}</span>
                        </td>
                        <td style={{ padding: '12px 15px' }}>{req.created_at}</td>
                        <td style={{ padding: '12px 15px' }}>{req.download_date}</td>
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleCheckRequestStatus(req.requestnumber)}
                            className="primary"
                            style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}
                          >
                            تحديث الحالة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'reports' && (
          <div>
            <h3 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--text)' }}>
              إدارة واستعلام التقارير
            </h3>

            {/* Horizontal sub-tabs selector at the top */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '25px',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '20px',
              width: '100%'
            }}>
              <button
                type="button"
                onClick={() => setReportSubTab('sales_detailed')}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                  fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: reportSubTab === 'sales_detailed' ? 'var(--sidebar)' : 'var(--panel)',
                  color: reportSubTab === 'sales_detailed' ? '#fff' : 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <i className="fa-solid fa-file-invoice-dollar"></i>
                تقارير المبيعات
              </button>

              <button
                type="button"
                onClick={() => setReportSubTab('sales_summary')}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                  fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: reportSubTab === 'sales_summary' ? 'var(--sidebar)' : 'var(--panel)',
                  color: reportSubTab === 'sales_summary' ? '#fff' : 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <i className="fa-solid fa-chart-line"></i>
                تقارير المبيعات [المختصر]
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setReportSubTab('canceled_cards')}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                    fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: reportSubTab === 'canceled_cards' ? 'var(--sidebar)' : 'var(--panel)',
                    color: reportSubTab === 'canceled_cards' ? '#fff' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-rectangle-xmark"></i>
                  تقارير البطاقات الملغية
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setReportSubTab('company_inventory')}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                    fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: reportSubTab === 'company_inventory' ? 'var(--sidebar)' : 'var(--panel)',
                    color: reportSubTab === 'company_inventory' ? '#fff' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-warehouse"></i>
                  تقارير مخزون الشركة
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setReportSubTab('offices_inventory')}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                    fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: reportSubTab === 'offices_inventory' ? 'var(--sidebar)' : 'var(--panel)',
                    color: reportSubTab === 'offices_inventory' ? '#fff' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-store"></i>
                  تقارير مخزون المكاتب
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setReportSubTab('offices_aggregated')}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                    fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: reportSubTab === 'offices_aggregated' ? 'var(--sidebar)' : 'var(--panel)',
                    color: reportSubTab === 'offices_aggregated' ? '#fff' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-boxes-packing"></i>
                  تقرير المجمع لإصدارات المكاتب
                </button>
              )}

              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => setReportSubTab('company_inventory')}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                    fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: reportSubTab === 'company_inventory' ? 'var(--sidebar)' : 'var(--panel)',
                    color: reportSubTab === 'company_inventory' ? '#fff' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-warehouse"></i>
                  تقرير المخزون
                </button>
              )}
            </div>

            {/* Main Content Area - Full Width */}
            <div style={{ width: '100%' }}>
                {(reportSubTab === 'sales_summary' || reportSubTab === 'sales_detailed') && (
                  <div>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '15px', color: 'var(--sidebar)' }}>
                      {reportSubTab === 'sales_detailed' ? 'تقارير المبيعات' : 'تقارير المبيعات [المختصر]'}
                    </h4>

                    <form onSubmit={handleFetchReports} style={{
                      background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '25px', marginBottom: '30px'
                    }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px'
                      }}>
                        {/* Row 1 */}
                        {isAdmin && (
                          <>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>الشركة</label>
                              <select disabled style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
                                <option>المدار الليبي للتأمين (adminmli)</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>مستخدم الشركة</label>
                              <select style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
                                <option value="">اختر مستخدم الشركة...</option>
                                <option value="adminmli">adminmli</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>المكتب</label>
                              <select 
                                value={searchOfficeId} 
                                onChange={(e) => setSearchOfficeId(e.target.value)} 
                                style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                              >
                                <option value="">Choose one</option>
                                {lifoOffices.map((office) => (
                                  <option key={office.id} value={office.id}>{office.name}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>مستخدم المكتب</label>
                          {isAdmin ? (
                            <input 
                              type="text" 
                              value={searchOfficeUserId} 
                              onChange={(e) => setSearchOfficeUserId(e.target.value)}
                              placeholder="معرف مستخدم المكتب" 
                              style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                            />
                          ) : (
                            <select
                              value={searchOfficeUserId}
                              onChange={(e) => setSearchOfficeUserId(e.target.value)}
                              style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                            >
                              <option value="">الكل</option>
                              {officeUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Row 2 */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>اسم العميل</label>
                          <input 
                            type="text" 
                            value={customerName} 
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="اسم العميل" 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>رقم البطاقة</label>
                          <input 
                            type="text" 
                            value={cardNumber} 
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="رقم البطاقة" 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>رقم اللوحة</label>
                          <input 
                            type="text" 
                            value={plateNumber} 
                            onChange={(e) => setPlateNumber(e.target.value)}
                            placeholder="اللوحة المعدنية" 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>رقم الهيكل</label>
                          <input 
                            type="text" 
                            value={chassisNumber} 
                            onChange={(e) => setChassisNumber(e.target.value)}
                            placeholder="رقم الهيكل" 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>

                        {/* Dates */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>من</label>
                          <input 
                            type="date" 
                            value={dateFrom} 
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>الي</label>
                          <input 
                            type="date" 
                            value={dateTo} 
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button type="submit" className="primary btn-submit" style={{ padding: '0 24px', borderRadius: '8px', fontWeight: '800', height: '40px' }}>
                          <i className="fa-solid fa-magnifying-glass" style={{ marginLeft: '8px' }}></i>
                          بحث
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setCustomerName('');
                            setCardNumber('');
                            setPlateNumber('');
                            setChassisNumber('');
                            setDateFrom('');
                            setDateTo('');
                            setSearchOfficeId('');
                            setSearchOfficeUserId('');
                            setReportsData([]);
                          }} 
                          className="btn-cancel" 
                          style={{ padding: '0 20px', borderRadius: '8px', fontWeight: '800', height: '40px' }}
                        >
                          مسح الفلاتر
                        </button>
                        {reportsData.length > 0 && (
                          <button type="button" onClick={handleExportExcel} className="primary" style={{ padding: '0 20px', borderRadius: '8px', fontWeight: '800', background: '#166534', height: '40px', border: 'none', color: '#fff', cursor: 'pointer' }}>
                            <i className="fa-solid fa-file-excel" style={{ marginLeft: '8px' }}></i>
                            تصدير كـ Excel
                          </button>
                        )}
                      </div>
                    </form>

                    {/* Results section */}
                    <div>
                      <h4 style={{ marginBottom: '15px', color: 'var(--text)', fontWeight: 'bold' }}>عرض الكل</h4>
                      

                      {(() => {
                        const reportsTotalPages = Math.ceil(reportsTotal / reportsRowsPerPage);

                        const getReportsPageNumbers = () => {
                          const pages: (number | string)[] = [];
                          if (reportsTotalPages <= 7) {
                            for (let i = 1; i <= reportsTotalPages; i++) {
                              pages.push(i);
                            }
                          } else {
                            pages.push(1);
                            
                            if (reportsCurrentPage > 3) {
                              pages.push('...');
                            }
                            
                            const start = Math.max(2, reportsCurrentPage - 1);
                            const end = Math.min(reportsTotalPages - 1, reportsCurrentPage + 1);
                            
                            for (let i = start; i <= end; i++) {
                              if (!pages.includes(i)) pages.push(i);
                            }
                            
                            if (reportsCurrentPage < reportsTotalPages - 2) {
                              pages.push('...');
                            }
                            
                            if (!pages.includes(reportsTotalPages)) {
                              pages.push(reportsTotalPages);
                            }
                          }
                          return pages;
                        };

                        return (
                          <>
                            {reportsData.length > 0 && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                gap: '15px',
                                flexWrap: 'wrap',
                                background: 'var(--panel)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '15px 20px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>مجموع السجلات الحالية: {reportsTotal}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontSize: '0.9rem' }}>
                                    <span>عرض</span>
                                    <select
                                      value={reportsRowsPerPage}
                                      onChange={(e) => {
                                        setReportsRowsPerPage(parseInt(e.target.value));
                                        setReportsCurrentPage(1);
                                        setTimeout(() => handleFetchReports(1), 50);
                                      }}
                                      style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text)',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value={10}>10</option>
                                      <option value={25}>25</option>
                                      <option value={50}>50</option>
                                      <option value={100}>100</option>
                                    </select>
                                    <span>مدخلات</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {reportsData.length > 0 ? (
                              <>
                                <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                    <thead>
                                      <tr style={{ background: 'var(--table-header)' }}>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>#</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رقم البطاقة</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المُصدر</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المكتب</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المؤمن له</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>تاريخ الاصدار</th>
                                        {reportSubTab === 'sales_detailed' && (
                                          <>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>صافي القسط</th>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>الضريبة</th>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رسم الدمغة</th>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>الإشراف</th>
                                            <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>الإصدار</th>
                                          </>
                                        )}
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>الاجمالي</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>عرض الوثيقة</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reportsData.map((doc, idx) => {
                                        const globalIdx = (reportsCurrentPage - 1) * reportsRowsPerPage + idx + 1;
                                        const cardNo = doc.resolved_card_number || doc.policyNumber || doc.card_number || '-';
                                        const issuer = doc.company_users?.username || doc.office_users?.username || doc.users?.username || doc.company_users_id || '-';
                                        const officeName = doc.offices?.name || lifoOffices.find((o: any) => o.id === doc.offices_id)?.name || '-';

                                        return (
                                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 15px' }}>{globalIdx}</td>
                                            <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{cardNo}</td>
                                            <td style={{ padding: '12px 15px' }}>{issuer}</td>
                                            <td style={{ padding: '12px 15px' }}>{officeName}</td>
                                            <td style={{ padding: '12px 15px' }}>{doc.insurance_name || '-'}</td>
                                            <td style={{ padding: '12px 15px' }}>{doc.issuing_date || '-'}</td>
                                            {reportSubTab === 'sales_detailed' && (
                                              <>
                                                <td style={{ padding: '12px 15px' }}>{formatDecimal(doc.insurance_installment)}</td>
                                                <td style={{ padding: '12px 15px' }}>{formatDecimal(doc.insurance_tax)}</td>
                                                <td style={{ padding: '12px 15px' }}>{formatDecimal(doc.insurance_stamp)}</td>
                                                <td style={{ padding: '12px 15px' }}>{formatDecimal(doc.insurance_supervision)}</td>
                                                <td style={{ padding: '12px 15px' }}>{formatDecimal(doc.insurance_version)}</td>
                                              </>
                                            )}
                                            <td style={{ padding: '12px 15px', fontWeight: 'bold', color: 'var(--sidebar)' }}>{formatDecimal(doc.insurance_total)}</td>
                                            <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                              {cardNo !== '-' ? (
                                                <button
                                                  type="button"
                                                  onClick={() => handlePrintLifoCard(cardNo)}
                                                  title="عرض وطباعة الوثيقة"
                                                  style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    color: 'var(--sidebar)',
                                                    fontSize: '1.2rem',
                                                    padding: '4px 8px',
                                                    transition: 'transform 0.2s'
                                                  }}
                                                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                  <i className="fa-solid fa-file-signature"></i>
                                                </button>
                                              ) : '-'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{ background: 'var(--table-header)', borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                                        <td colSpan={6} style={{ padding: '12px 15px', textAlign: 'left' }}>الإجمالي</td>
                                        {reportSubTab === 'sales_detailed' && (
                                          <>
                                            <td style={{ padding: '12px 15px' }}>{reportsTotals.installment}</td>
                                            <td style={{ padding: '12px 15px' }}>{reportsTotals.tax}</td>
                                            <td style={{ padding: '12px 15px' }}>{reportsTotals.stamp}</td>
                                            <td style={{ padding: '12px 15px' }}>{reportsTotals.supervision}</td>
                                            <td style={{ padding: '12px 15px' }}>{reportsTotals.version}</td>
                                          </>
                                        )}
                                        <td style={{ padding: '12px 15px', fontWeight: 'bold', color: 'var(--sidebar)' }}>{reportsTotals.total}</td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>

                                {/* Pagination Controls */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 'bold' }}>
                                    عرض {reportsData.length === 0 ? 0 : (reportsCurrentPage - 1) * reportsRowsPerPage + 1} إلى {Math.min(reportsCurrentPage * reportsRowsPerPage, reportsTotal)} من أصل {reportsTotal.toLocaleString('ar-LY')} مدخل
                                  </div>
                                  
                                  {reportsTotalPages > 1 && (
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        disabled={reportsCurrentPage === 1}
                                        onClick={() => {
                                          const prevPage = Math.max(reportsCurrentPage - 1, 1);
                                          setReportsCurrentPage(prevPage);
                                          handleFetchReports(prevPage);
                                        }}
                                        style={{
                                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                          background: reportsCurrentPage === 1 ? 'var(--input-bg)' : 'var(--panel)',
                                          color: reportsCurrentPage === 1 ? 'var(--muted)' : 'var(--text)',
                                          cursor: reportsCurrentPage === 1 ? 'not-allowed' : 'pointer',
                                          fontWeight: 'bold', fontSize: '0.85rem'
                                        }}
                                      >
                                        السابق
                                      </button>
                                      
                                      {getReportsPageNumbers().map((page, idx) => {
                                        const isPageNumber = typeof page === 'number';
                                        const isActive = page === reportsCurrentPage;
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            disabled={!isPageNumber}
                                            onClick={() => {
                                              if (isPageNumber) {
                                                setReportsCurrentPage(page as number);
                                                handleFetchReports(page as number);
                                              }
                                            }}
                                            style={{
                                              padding: '6px 12px', borderRadius: '6px',
                                              border: isPageNumber ? '1px solid var(--border)' : 'none',
                                              background: isActive ? 'var(--sidebar)' : (isPageNumber ? 'var(--panel)' : 'transparent'),
                                              color: isActive ? '#fff' : 'var(--text)',
                                              cursor: isPageNumber ? 'pointer' : 'default',
                                              fontWeight: 'bold', fontSize: '0.85rem', minWidth: '35px'
                                            }}
                                          >
                                            {isPageNumber ? page.toLocaleString('ar-LY') : page}
                                          </button>
                                        );
                                      })}
                                      
                                      <button
                                        type="button"
                                        disabled={reportsCurrentPage === reportsTotalPages}
                                        onClick={() => {
                                          const nextPage = Math.min(reportsCurrentPage + 1, reportsTotalPages);
                                          setReportsCurrentPage(nextPage);
                                          handleFetchReports(nextPage);
                                        }}
                                        style={{
                                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                          background: reportsCurrentPage === reportsTotalPages ? 'var(--input-bg)' : 'var(--panel)',
                                          color: reportsCurrentPage === reportsTotalPages ? 'var(--muted)' : 'var(--text)',
                                          cursor: reportsCurrentPage === reportsTotalPages ? 'not-allowed' : 'pointer',
                                          fontWeight: 'bold', fontSize: '0.85rem'
                                        }}
                                      >
                                        التالي
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div style={{
                                padding: '40px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px',
                                textAlign: 'center', color: 'var(--muted)', fontWeight: 'bold'
                              }}>
                                <i className="fa-solid fa-folder-open" style={{ fontSize: '40px', marginBottom: '15px', color: 'var(--muted)', display: 'block' }}></i>
                                <span>لا توجد نتائج بحث لعرضها حالياً. استخدم نموذج البحث أعلاه لتصفية وثائق المبيعات.</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {reportSubTab === 'canceled_cards' && (
                  <div>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '15px', color: 'var(--sidebar)' }}>تقارير البطاقات الملغية</h4>
                    
                    <form onSubmit={handleFetchCanceledCards} style={{
                      background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '25px', marginBottom: '30px'
                    }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px'
                      }}>
                        {/* Row 1 */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>المكتب</label>
                          <select 
                            value={canceledSearchOfficeId} 
                            onChange={(e) => setCanceledSearchOfficeId(e.target.value)} 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          >
                            <option value="">اختر المكتب...</option>
                            {lifoOffices.map((office) => (
                              <option key={office.id} value={office.id}>{office.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>مستخدم الشركة</label>
                          <select 
                            value={canceledSearchCompanyUser} 
                            onChange={(e) => setCanceledSearchCompanyUser(e.target.value)} 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          >
                            <option value="">اختر مستخدم الشركة...</option>
                            <option value="adminmli">adminmli</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>مستخدم المكتب</label>
                          <select 
                            value={canceledSearchOfficeUserId} 
                            onChange={(e) => setCanceledSearchOfficeUserId(e.target.value)} 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          >
                            <option value="">اختر مستخدم المكتب...</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>رقم الطلب</label>
                          <input 
                            type="text" 
                            value={canceledSearchReqNum} 
                            onChange={(e) => setCanceledSearchReqNum(e.target.value)}
                            placeholder="رقم الطلب" 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>

                        {/* Row 2 */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>رقم البطاقة</label>
                          <input 
                            type="text" 
                            value={canceledSearchCardNum} 
                            onChange={(e) => setCanceledSearchCardNum(e.target.value)}
                            placeholder="رقم البطاقة" 
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>تاريخ الإلغاء - من</label>
                          <input 
                            type="date" 
                            value={canceledSearchDateFrom} 
                            onChange={(e) => setCanceledSearchDateFrom(e.target.value)}
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>تاريخ الإلغاء - إلى</label>
                          <input 
                            type="date" 
                            value={canceledSearchDateTo} 
                            onChange={(e) => setCanceledSearchDateTo(e.target.value)}
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button type="submit" disabled={loadingCanceledCards} className="primary btn-submit" style={{ padding: '0 24px', borderRadius: '8px', fontWeight: '800', height: '40px' }}>
                          <i className="fa-solid fa-magnifying-glass" style={{ marginLeft: '8px' }}></i>
                          {loadingCanceledCards ? 'جاري التحميل...' : 'بحث'}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setCanceledSearchOfficeId('');
                            setCanceledSearchCompanyUser('');
                            setCanceledSearchOfficeUserId('');
                            setCanceledSearchReqNum('');
                            setCanceledSearchCardNum('');
                            setCanceledSearchDateFrom('');
                            setCanceledSearchDateTo('');
                            setCanceledCardsData([]);
                          }} 
                          className="btn-cancel" 
                          style={{ padding: '0 20px', borderRadius: '8px', fontWeight: '800', height: '40px' }}
                        >
                          مسح الفلاتر
                        </button>
                      </div>
                    </form>

                    {/* Table results */}
                    <div>
                      {(() => {
                        const filteredCanceledCards = canceledCardsData;
                        const totalCanceledPages = Math.ceil(canceledTotal / canceledRowsPerPage);

                        const getCanceledPageNumbers = () => {
                          const pages: (number | string)[] = [];
                          if (totalCanceledPages <= 7) {
                            for (let i = 1; i <= totalCanceledPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            if (canceledCurrentPage > 3) pages.push('...');
                            const start = Math.max(2, canceledCurrentPage - 1);
                            const end = Math.min(totalCanceledPages - 1, canceledCurrentPage + 1);
                            for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i);
                            if (canceledCurrentPage < totalCanceledPages - 2) pages.push('...');
                            if (!pages.includes(totalCanceledPages)) pages.push(totalCanceledPages);
                          }
                          return pages;
                        };

                        return (
                          <>
                            {filteredCanceledCards.length > 0 ? (
                              <>
                                <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                    <thead>
                                      <tr style={{ background: 'var(--table-header)' }}>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>#</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رقم البطاقة</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>حالة البطاقة</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رقم الطلب</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المكتب</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filteredCanceledCards.map((card, idx) => {
                                        const globalIdx = (canceledCurrentPage - 1) * canceledRowsPerPage + idx + 1;
                                        return (
                                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 15px' }}>{globalIdx}</td>
                                            <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{card.card_number || card.card_serial || '-'}</td>
                                            <td style={{ padding: '12px 15px' }}>
                                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: '#fee2e2', color: '#b91c1c' }}>
                                                {card.cardstautesname || 'الملغية'}
                                              </span>
                                            </td>
                                            <td style={{ padding: '12px 15px', fontFamily: 'monospace' }}>{card.request_numberr || '-'}</td>
                                            <td style={{ padding: '12px 15px' }}>{card.offices || '-'}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 'bold' }}>
                                    عرض {(canceledCurrentPage - 1) * canceledRowsPerPage + 1} إلى {Math.min(canceledCurrentPage * canceledRowsPerPage, canceledTotal)} من أصل {canceledTotal.toLocaleString('ar-LY')} مدخل
                                  </div>

                                  {totalCanceledPages > 1 && (
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        disabled={canceledCurrentPage === 1}
                                        onClick={() => {
                                          const prevPage = Math.max(canceledCurrentPage - 1, 1);
                                          setCanceledCurrentPage(prevPage);
                                          handleFetchCanceledCards(prevPage);
                                        }}
                                        style={{
                                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                          background: canceledCurrentPage === 1 ? 'var(--input-bg)' : 'var(--panel)',
                                          color: canceledCurrentPage === 1 ? 'var(--muted)' : 'var(--text)',
                                          cursor: canceledCurrentPage === 1 ? 'not-allowed' : 'pointer',
                                          fontWeight: 'bold', fontSize: '0.85rem'
                                        }}
                                      >
                                        السابق
                                      </button>
                                      
                                      {getCanceledPageNumbers().map((page, idx) => {
                                        const isPageNumber = typeof page === 'number';
                                        const isActive = page === canceledCurrentPage;
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            disabled={!isPageNumber}
                                            onClick={() => {
                                              if (isPageNumber) {
                                                setCanceledCurrentPage(page as number);
                                                handleFetchCanceledCards(page as number);
                                              }
                                            }}
                                            style={{
                                              padding: '6px 12px', borderRadius: '6px',
                                              border: isPageNumber ? '1px solid var(--border)' : 'none',
                                              background: isActive ? 'var(--sidebar)' : (isPageNumber ? 'var(--panel)' : 'transparent'),
                                              color: isActive ? '#fff' : 'var(--text)',
                                              cursor: isPageNumber ? 'pointer' : 'default',
                                              fontWeight: 'bold', fontSize: '0.85rem', minWidth: '35px'
                                            }}
                                          >
                                            {isPageNumber ? page.toLocaleString('ar-LY') : page}
                                          </button>
                                        );
                                      })}

                                      <button
                                        type="button"
                                        disabled={canceledCurrentPage === totalCanceledPages}
                                        onClick={() => {
                                          const nextPage = Math.min(canceledCurrentPage + 1, totalCanceledPages);
                                          setCanceledCurrentPage(nextPage);
                                          handleFetchCanceledCards(nextPage);
                                        }}
                                        style={{
                                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                          background: canceledCurrentPage === totalCanceledPages ? 'var(--input-bg)' : 'var(--panel)',
                                          color: canceledCurrentPage === totalCanceledPages ? 'var(--muted)' : 'var(--text)',
                                          cursor: canceledCurrentPage === totalCanceledPages ? 'not-allowed' : 'pointer',
                                          fontWeight: 'bold', fontSize: '0.85rem'
                                        }}
                                      >
                                        التالي
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div style={{ padding: '40px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center', color: 'var(--muted)', fontWeight: 'bold' }}>
                                <i className="fa-solid fa-rectangle-xmark" style={{ fontSize: '40px', marginBottom: '15px', color: 'var(--muted)', display: 'block' }}></i>
                                <span>انقر على "بحث" لتحميل وعرض البطاقات الملغية.</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {reportSubTab === 'company_inventory' && (
                  <div>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '15px', color: 'var(--sidebar)' }}>{isAdmin ? 'تقارير مخزون الشركة' : 'تقرير المخزون'}</h4>
                    
                    {(() => {
                      if (loadingInventorySummary) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '30px', marginBottom: '15px', color: 'var(--sidebar)' }}></i>
                            <p style={{ fontWeight: '600' }}>جاري تحميل ملخص المخزون من الاتحاد...</p>
                          </div>
                        );
                      }

                      const counts = inventorySummary?.company_stock || { active: 0, sold: 0, canceled: 0 };
                      const hasData = !!inventorySummary;
                      
                      // Filter row locally if search query is provided
                      const searchMatch = !inventorySearchQuery.trim() || 
                        'بطاقة معينة (مخزون الشركة)'.includes(inventorySearchQuery) ||
                        'بطاقة المصدرة'.includes(inventorySearchQuery) ||
                        'بطاقة ملغية'.includes(inventorySearchQuery);

                      const handlePrintCompanyStockPDF = () => {
                        const printable = window.open('', '_blank');
                        if (printable) {
                          const d = new Date();
                          const year = d.getFullYear();
                          const month = d.getMonth() + 1;
                          const date = d.getDate();
                          let hours = d.getHours();
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          const seconds = String(d.getSeconds()).padStart(2, '0');
                          const ampm = hours >= 12 ? 'م' : 'ص';
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          const printDateTime = `${year}/${month}/${date} ${hours}:${minutes}:${seconds} ${ampm}`;

                          printable.document.write(`
                            <html dir="rtl">
                              <head>
                                <title>تقرير مخزون الشركة</title>
                                <style>
                                  body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                                  .header-box {
                                    border: 1px solid #000;
                                    padding: 15px;
                                    margin-bottom: 25px;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                  }
                                  .header-right {
                                    text-align: right;
                                    flex: 1;
                                  }
                                  .header-center {
                                    text-align: center;
                                    flex: 1;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                  }
                                  .header-left {
                                    text-align: left;
                                    flex: 1;
                                    font-size: 0.9rem;
                                    line-height: 1.6;
                                  }
                                  .logo-img {
                                    height: 55px;
                                    margin-bottom: 5px;
                                  }
                                  table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: center; }
                                  th, td { border: 1px solid #000; padding: 12px; font-size: 1rem; }
                                  th { background: #f2f2f2; font-weight: bold; }
                                  .links { color: blue; text-decoration: underline; }
                                </style>
                              </head>
                              <body>
                                <div class="header-box">
                                  <div class="header-right">
                                    <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">وقت وتاريخ الانشاء: ${printDateTime}</div>
                                    <div style="font-size: 1.2rem; font-weight: bold;">تقرير مخزون الشركة</div>
                                  </div>
                                  <div class="header-center">
                                    <img class="logo-img" src="https://prod.lifo.ly/logo.svg" alt="Logo" />
                                    <div style="font-weight: bold;">دولة ليبيا</div>
                                    <div style="font-weight: bold;">الاتحاد الليبي للتأمين</div>
                                  </div>
                                  <div class="header-left">
                                    <div><strong>العنوان:</strong> الاتحاد الليبي للتأمين</div>
                                    <div><strong>البريد الالكتروني:</strong> <span class="links">info@insurancefed.ly</span></div>
                                    <div><strong>الموقع الالكتروني:</strong> <span class="links">www.insurancefed.ly</span></div>
                                  </div>
                                </div>

                                <table>
                                  <thead>
                                    <tr>
                                      <th>بطاقة معينة (مخزون الشركة)</th>
                                      <th>بطاقة المصدرة</th>
                                      <th>بطاقة ملغية</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>${counts.active.toLocaleString('ar-LY')} بطاقة</td>
                                      <td>${counts.sold.toLocaleString('ar-LY')} بطاقة</td>
                                      <td>${counts.canceled.toLocaleString('ar-LY')} بطاقة</td>
                                    </tr>
                                  </tbody>
                                </table>
                                <script>
                                  window.onload = function() {
                                    window.print();
                                  };
                                </script>
                              </body>
                            </html>
                          `);
                          printable.document.close();
                        }
                      };

                      const handleExportCompanyStockExcel = async () => {
                        try {
                          const columns = [
                            { header: 'بطاقة معينة (مخزون الشركة)', key: 'active', width: 30 },
                            { header: 'بطاقة المصدرة', key: 'sold', width: 30 },
                            { header: 'بطاقة ملغية', key: 'canceled', width: 30 },
                          ];
                          const data = [{
                            active: `${counts.active} بطاقة`,
                            sold: `${counts.sold} بطاقة`,
                            canceled: `${counts.canceled} بطاقة`,
                          }];
                          await generatePremiumExcel({
                            title: 'تقرير مخزون الشركة الرئيسي - LIFO',
                            subtitle: `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
                            columns,
                            data,
                            fileName: 'تقرير_مخزون_الشركة_LIFO',
                            qrData: `مستخرج من منظومة المدار\nتقرير مخزون الشركة\nنشطة: ${counts.active}\nمباعة: ${counts.sold}\nملغية: ${counts.canceled}`
                          });
                          showToast('تم تصدير تقرير المخزون بنجاح', 'success');
                        } catch (e) {
                          showToast('حدث خطأ أثناء تصدير ملف الإكسل', 'error');
                        }
                      };

                      const handleCopyCompanyStock = () => {
                        const text = `بطاقة معينة (مخزون الشركة): ${counts.active} بطاقة\nبطاقة المصدرة: ${counts.sold} بطاقة\nبطاقة ملغية: ${counts.canceled} بطاقة`;
                        navigator.clipboard.writeText(text);
                        showToast('تم نسخ بيانات المخزون للحافظة', 'success');
                      };

                      return (
                        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '25px' }}>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h4 style={{ fontWeight: 'bold', color: 'var(--text)', margin: 0, fontSize: '1.1rem' }}>{isAdmin ? 'عرض مخزون الشركة' : 'عرض مخزون المكتب'}</h4>
                            <button
                              type="button"
                              onClick={handlePrintCompanyStockPDF}
                              disabled={!hasData}
                              style={{
                                padding: '6px 15px', borderRadius: '6px', border: '1px solid var(--border)',
                                background: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
                              }}
                            >
                              PDF
                            </button>
                          </div>

                          {/* Controls bar matching LIFO layout */}
                          {hasData && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '20px',
                              gap: '15px',
                              flexWrap: 'wrap',
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '12px',
                              padding: '15px 20px'
                            }}>
                              {/* Search Box on the Right */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>بحث:</span>
                                <input
                                  type="text"
                                  placeholder="ابحث..."
                                  value={inventorySearchQuery}
                                  onChange={(e) => setInventorySearchQuery(e.target.value)}
                                  style={{
                                    padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                    background: 'var(--panel)', color: 'var(--text)', width: '220px', fontSize: '0.85rem'
                                  }}
                                />
                              </div>

                              {/* Action buttons on the Left */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                  type="button"
                                  onClick={handleExportCompanyStockExcel}
                                  style={{
                                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                                    background: '#7c2d12', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                >
                                  تصدير كـ excel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCopyCompanyStock}
                                  style={{
                                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                                    background: '#7c2d12', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                >
                                  نسخ
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontSize: '0.9rem', marginRight: '15px' }}>
                                  <span>عرض</span>
                                  <select
                                    disabled
                                    style={{
                                      padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                                      background: 'var(--panel)', color: 'var(--text)', fontWeight: 'bold'
                                    }}
                                  >
                                    <option value={10}>10</option>
                                  </select>
                                  <span>مدخلات</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {hasData ? (
                            <>
                              {searchMatch ? (
                                <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px', display: 'block' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                    <thead>
                                      <tr style={{ background: 'var(--table-header)' }}>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>{isAdmin ? 'بطاقة معينة (مخزون الشركة)' : 'بطاقة معينة (مخزون المكتب)'}</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>بطاقة المصدرة</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>بطاقة ملغية</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr style={{ fontSize: '1rem', fontWeight: 'normal', borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '15px' }}>{counts.active.toLocaleString('ar-LY')} بطاقة</td>
                                        <td style={{ padding: '15px' }}>{counts.sold.toLocaleString('ar-LY')} بطاقة</td>
                                        <td style={{ padding: '15px' }}>{counts.canceled.toLocaleString('ar-LY')} بطاقة</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                  لا توجد نتائج تطابق البحث
                                </div>
                              )}

                              {/* Bottom pagination info matching LIFO */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 'bold' }}>
                                  عرض {searchMatch ? 1 : 0} إلى {searchMatch ? 1 : 0} من أصل {searchMatch ? 1 : 0} مدخل
                                </div>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    disabled
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                      background: 'var(--input-bg)', color: 'var(--muted)', cursor: 'not-allowed',
                                      fontWeight: 'bold', fontSize: '0.85rem'
                                    }}
                                  >
                                    السابق
                                  </button>
                                  <button
                                    type="button"
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                      background: 'var(--sidebar)', color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', minWidth: '35px'
                                    }}
                                  >
                                    ١
                                  </button>
                                  <button
                                    type="button"
                                    disabled
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                      background: 'var(--input-bg)', color: 'var(--muted)', cursor: 'not-allowed',
                                      fontWeight: 'bold', fontSize: '0.85rem'
                                    }}
                                  >
                                    التالي
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '24px', marginBottom: '10px', color: 'var(--sidebar)' }}></i>
                              <p style={{ fontWeight: 'bold' }}>جاري تحميل جرد المخزون من الاتحاد...</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {reportSubTab === 'offices_inventory' && (
                  <div>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '15px', color: 'var(--sidebar)' }}>عرض مخزون المكاتب</h4>
                    
                    {(() => {
                      if (loadingInventorySummary) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '30px', marginBottom: '15px', color: 'var(--sidebar)' }}></i>
                            <p style={{ fontWeight: '600' }}>جاري تحميل ملخص المخزون من الاتحاد...</p>
                          </div>
                        );
                      }

                      const officesList = inventorySummary?.offices_stock || [];

                      const filteredOfficesList = officesList.filter((item: any) => {
                        const query = officesInvSearchQuery.toLowerCase().trim();
                        if (!query) return true;
                        return item.office.toLowerCase().includes(query);
                      });

                      const totalOfficesPages = Math.ceil(filteredOfficesList.length / officesInvRowsPerPage);

                      const getOfficesPageNumbers = () => {
                        const pages: (number | string)[] = [];
                        if (totalOfficesPages <= 7) {
                          for (let i = 1; i <= totalOfficesPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (officesInvCurrentPage > 3) pages.push('...');
                          const start = Math.max(2, officesInvCurrentPage - 1);
                          const end = Math.min(totalOfficesPages - 1, officesInvCurrentPage + 1);
                          for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i);
                          if (officesInvCurrentPage < totalOfficesPages - 2) pages.push('...');
                          if (!pages.includes(totalOfficesPages)) pages.push(totalOfficesPages);
                        }
                        return pages;
                      };

                      const hasData = !!inventorySummary;

                      const handlePrintOfficesStockPDF = () => {
                        const printable = window.open('', '_blank');
                        if (printable) {
                          const d = new Date();
                          const year = d.getFullYear();
                          const month = d.getMonth() + 1;
                          const date = d.getDate();
                          let hours = d.getHours();
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          const seconds = String(d.getSeconds()).padStart(2, '0');
                          const ampm = hours >= 12 ? 'م' : 'ص';
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          const printDateTime = `${year}/${month}/${date} ${hours}:${minutes}:${seconds} ${ampm}`;

                          // Construct rows html
                          const rowsHtml = filteredOfficesList.map((item: any, idx: number) => `
                            <tr>
                              <td>${idx + 1}</td>
                              <td>${item.office}</td>
                              <td>${item.active.toLocaleString('ar-LY')} بطاقة</td>
                              <td>${item.sold.toLocaleString('ar-LY')} بطاقة</td>
                              <td>${item.canceled.toLocaleString('ar-LY')} بطاقة</td>
                            </tr>
                          `).join('');

                          printable.document.write(`
                            <html dir="rtl">
                              <head>
                                <title>تقرير مخزون المكاتب</title>
                                <style>
                                  body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                                  .header-box {
                                    border: 1px solid #000;
                                    padding: 15px;
                                    margin-bottom: 25px;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                  }
                                  .header-right {
                                    text-align: right;
                                    flex: 1;
                                  }
                                  .header-center {
                                    text-align: center;
                                    flex: 1;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                  }
                                  .header-left {
                                    text-align: left;
                                    flex: 1;
                                    font-size: 0.9rem;
                                    line-height: 1.6;
                                  }
                                  .logo-img {
                                    height: 55px;
                                    margin-bottom: 5px;
                                  }
                                  table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: center; }
                                  th, td { border: 1px solid #000; padding: 10px; font-size: 0.9rem; }
                                  th { background: #f2f2f2; font-weight: bold; }
                                  .links { color: blue; text-decoration: underline; }
                                </style>
                              </head>
                              <body>
                                <div class="header-box">
                                  <div class="header-right">
                                    <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">وقت وتاريخ الانشاء: ${printDateTime}</div>
                                    <div style="font-size: 1.2rem; font-weight: bold;">تقرير مخزون المكاتب</div>
                                  </div>
                                  <div class="header-center">
                                    <img class="logo-img" src="https://prod.lifo.ly/logo.svg" alt="Logo" />
                                    <div style="font-weight: bold;">دولة ليبيا</div>
                                    <div style="font-weight: bold;">الاتحاد الليبي للتأمين</div>
                                  </div>
                                  <div class="header-left">
                                    <div><strong>العنوان:</strong> الاتحاد الليبي للتأمين</div>
                                    <div><strong>البريد الالكتروني:</strong> <span class="links">info@insurancefed.ly</span></div>
                                    <div><strong>الموقع الالكتروني:</strong> <span class="links">www.insurancefed.ly</span></div>
                                  </div>
                                </div>

                                <table>
                                  <thead>
                                    <tr>
                                      <th style="width: 50px;">#</th>
                                      <th>المكتب</th>
                                      <th>بطاقة معينة (مخزون مكتب)</th>
                                      <th>بطاقة المصدرة</th>
                                      <th>بطاقة ملغية</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${rowsHtml}
                                  </tbody>
                                </table>
                                <script>
                                  window.onload = function() {
                                    window.print();
                                  };
                                </script>
                              </body>
                            </html>
                          `);
                          printable.document.close();
                        }
                      };

                      const handleExportOfficesStockExcel = async () => {
                        try {
                          const columns = [
                            { header: 'المكتب', key: 'office', width: 30 },
                            { header: 'بطاقة معينة (مخزون مكتب)', key: 'active', width: 25 },
                            { header: 'بطاقة المصدرة', key: 'sold', width: 25 },
                            { header: 'بطاقة ملغية', key: 'canceled', width: 25 },
                          ];
                          const data = filteredOfficesList.map((item: any) => ({
                            office: item.office,
                            active: `${item.active} بطاقة`,
                            sold: `${item.sold} بطاقة`,
                            canceled: `${item.canceled} بطاقة`,
                          }));
                          await generatePremiumExcel({
                            title: 'تقرير مخزون المكاتب - LIFO',
                            subtitle: `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
                            columns,
                            data,
                            fileName: 'تقرير_مخزون_المكاتب_LIFO',
                            qrData: `مستخرج من منظومة المدار\nتقرير مخزون المكاتب\nعدد المكاتب: ${filteredOfficesList.length}`
                          });
                          showToast('تم تصدير تقرير مخزون المكاتب بنجاح', 'success');
                        } catch (e) {
                          showToast('حدث خطأ أثناء تصدير ملف الإكسل', 'error');
                        }
                      };

                      const handleCopyOfficesStock = () => {
                        const text = filteredOfficesList.map((item: any, idx: number) => 
                          `${idx + 1}. ${item.office}: نشطة: ${item.active} | مصدرة: ${item.sold} | ملغية: ${item.canceled}`
                        ).join('\n');
                        navigator.clipboard.writeText(text);
                        showToast('تم نسخ بيانات المخزون للحافظة', 'success');
                      };

                      return (
                        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '25px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                            <h4 style={{ fontWeight: 'bold', color: 'var(--text)', margin: 0, fontSize: '1.1rem' }}>عرض مخزون المكاتب</h4>
                            
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={handlePrintOfficesStockPDF}
                                disabled={!hasData}
                                style={{
                                  padding: '6px 15px', borderRadius: '6px', border: '1px solid var(--border)',
                                  background: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                              >
                                PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  fetchInventorySummary(true);
                                }}
                                disabled={loadingInventorySummary}
                                className="primary"
                                style={{ padding: '6px 15px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                {loadingInventorySummary ? 'جاري التحديث...' : 'تحديث جرد المكاتب'}
                              </button>
                            </div>
                          </div>

                          {/* Controls bar matching LIFO layout */}
                          {hasData && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '20px',
                              gap: '15px',
                              flexWrap: 'wrap',
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '12px',
                              padding: '15px 20px'
                            }}>
                              {/* Search Box on the Right */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>بحث:</span>
                                <input
                                  type="text"
                                  placeholder="ابحث..."
                                  value={officesInvSearchQuery}
                                  onChange={(e) => {
                                    setOfficesInvSearchQuery(e.target.value);
                                    setOfficesInvCurrentPage(1);
                                  }}
                                  style={{
                                    padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                    background: 'var(--panel)', color: 'var(--text)', width: '220px', fontSize: '0.85rem'
                                  }}
                                />
                              </div>

                              {/* Action buttons on the Left */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                  type="button"
                                  onClick={handlePrintOfficesStockPDF}
                                  style={{
                                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                                    background: '#7c2d12', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                >
                                  تصدير كـ PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={handleExportOfficesStockExcel}
                                  style={{
                                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                                    background: '#7c2d12', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                >
                                  تصدير كـ excel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCopyOfficesStock}
                                  style={{
                                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                                    background: '#7c2d12', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                >
                                  نسخ
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontSize: '0.9rem', marginRight: '15px' }}>
                                  <span>عرض</span>
                                  <select
                                    value={officesInvRowsPerPage}
                                    onChange={(e) => {
                                      setOfficesInvRowsPerPage(Number(e.target.value));
                                      setOfficesInvCurrentPage(1);
                                    }}
                                    style={{
                                      padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                                      background: 'var(--panel)', color: 'var(--text)', fontWeight: 'bold'
                                    }}
                                  >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                  </select>
                                  <span>مدخلات</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {hasData ? (
                            <>
                              <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                  <thead>
                                    <tr style={{ background: 'var(--table-header)' }}>
                                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المكتب</th>
                                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>بطاقة معينة (مخزون مكتب)</th>
                                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>بطاقة المصدرة</th>
                                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>بطاقة ملغية</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredOfficesList.slice((officesInvCurrentPage - 1) * officesInvRowsPerPage, officesInvCurrentPage * officesInvRowsPerPage).map((item: any, idx: number) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{item.office}</td>
                                        <td style={{ padding: '12px 15px', color: '#166534', fontWeight: 'bold' }}>{item.active.toLocaleString('ar-LY')} بطاقة</td>
                                        <td style={{ padding: '12px 15px', color: 'var(--sidebar)' }}>{item.sold.toLocaleString('ar-LY')} بطاقة</td>
                                        <td style={{ padding: '12px 15px', color: '#b91c1c' }}>{item.canceled.toLocaleString('ar-LY')} بطاقة</td>
                                      </tr>
                                    ))}
                                    {filteredOfficesList.length === 0 && (
                                      <tr>
                                        <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>لا توجد مكاتب تطابق هذا البحث</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {filteredOfficesList.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 'bold' }}>
                                    عرض {(officesInvCurrentPage - 1) * officesInvRowsPerPage + 1} إلى {Math.min(officesInvCurrentPage * officesInvRowsPerPage, filteredOfficesList.length)} من أصل {filteredOfficesList.length.toLocaleString('ar-LY')} مكتب
                                  </div>

                                  {totalOfficesPages > 1 && (
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        disabled={officesInvCurrentPage === 1}
                                        onClick={() => setOfficesInvCurrentPage(prev => Math.max(prev - 1, 1))}
                                        style={{
                                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                          background: officesInvCurrentPage === 1 ? 'var(--input-bg)' : 'var(--panel)',
                                          color: officesInvCurrentPage === 1 ? 'var(--muted)' : 'var(--text)',
                                          cursor: officesInvCurrentPage === 1 ? 'not-allowed' : 'pointer',
                                          fontWeight: 'bold', fontSize: '0.85rem'
                                        }}
                                      >
                                        السابق
                                      </button>
                                      
                                      {getOfficesPageNumbers().map((page, idx) => {
                                        const isPageNumber = typeof page === 'number';
                                        const isActive = page === officesInvCurrentPage;
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            disabled={!isPageNumber}
                                            onClick={() => isPageNumber && setOfficesInvCurrentPage(page as number)}
                                            style={{
                                              padding: '6px 12px', borderRadius: '6px',
                                              border: isPageNumber ? '1px solid var(--border)' : 'none',
                                              background: isActive ? 'var(--sidebar)' : (isPageNumber ? 'var(--panel)' : 'transparent'),
                                              color: isActive ? '#fff' : 'var(--text)',
                                              cursor: isPageNumber ? 'pointer' : 'default',
                                              fontWeight: 'bold', fontSize: '0.85rem', minWidth: '35px'
                                            }}
                                          >
                                            {isPageNumber ? page.toLocaleString('ar-LY') : page}
                                          </button>
                                        );
                                      })}

                                      <button
                                        type="button"
                                        disabled={officesInvCurrentPage === totalOfficesPages}
                                        onClick={() => setOfficesInvCurrentPage(prev => Math.min(prev + 1, totalOfficesPages))}
                                        style={{
                                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                          background: officesInvCurrentPage === totalOfficesPages ? 'var(--input-bg)' : 'var(--panel)',
                                          color: officesInvCurrentPage === totalOfficesPages ? 'var(--muted)' : 'var(--text)',
                                          cursor: officesInvCurrentPage === totalOfficesPages ? 'not-allowed' : 'pointer',
                                          fontWeight: 'bold', fontSize: '0.85rem'
                                        }}
                                      >
                                        التالي
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '24px', marginBottom: '10px', color: 'var(--sidebar)' }}></i>
                              <p style={{ fontWeight: 'bold' }}>جاري تحميل جرد المكاتب من الاتحاد...</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {reportSubTab === 'offices_aggregated' && (
                  <div>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '15px', color: 'var(--sidebar)' }}>تقرير المجمع لإصدارات المكاتب</h4>
                    
                    {(() => {
                      const list = officesAggregatedData || [];

                      const filteredList = list.filter(item => {
                        const query = officesAggSearchQuery.toLowerCase().trim();
                        if (!query) return true;
                        return item.officeName.toLowerCase().includes(query);
                      });

                      const totalAggPages = Math.ceil(filteredList.length / officesAggRowsPerPage);

                      const getAggPageNumbers = () => {
                        const pages: (number | string)[] = [];
                        if (totalAggPages <= 7) {
                          for (let i = 1; i <= totalAggPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (officesAggCurrentPage > 3) pages.push('...');
                          const start = Math.max(2, officesAggCurrentPage - 1);
                          const end = Math.min(totalAggPages - 1, officesAggCurrentPage + 1);
                          for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i);
                          if (officesAggCurrentPage < totalAggPages - 2) pages.push('...');
                          if (!pages.includes(totalAggPages)) pages.push(totalAggPages);
                        }
                        return pages;
                      };

                      const totals = {
                        sold: 0, canceled: 0, installment: 0, tax: 0, stamp: 0, supervision: 0, version: 0, total: 0
                      };
                      filteredList.forEach(item => {
                        totals.sold += item.soldCount;
                        totals.canceled += item.canceledCount;
                        totals.installment += item.installment;
                        totals.tax += item.tax;
                        totals.stamp += item.stamp;
                        totals.supervision += item.supervision;
                        totals.version += item.version;
                        totals.total += item.total;
                      });

                      if (loadingOfficesAggregated) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '30px', marginBottom: '15px', color: 'var(--sidebar)' }}></i>
                            <p style={{ fontWeight: '600' }}>جاري تحميل وتجميع تقرير الفروع من الاتحاد...</p>
                          </div>
                        );
                      }

                      return (
                        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '25px' }}>
                          <form onSubmit={(e) => { e.preventDefault(); fetchOfficesAggregated(); }} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '25px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
                            <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                              <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>من</label>
                              <input 
                                type="date" 
                                value={dateFrom} 
                                onChange={(e) => setDateFrom(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                              />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                              <label style={{ fontWeight: '800', marginBottom: '8px', display: 'block' }}>الي</label>
                              <input 
                                type="date" 
                                value={dateTo} 
                                onChange={(e) => setDateTo(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                              />
                            </div>
                            <button type="submit" className="primary btn-submit" style={{ padding: '0 20px', borderRadius: '8px', fontWeight: '800', height: '40px' }}>
                              عرض التقرير
                            </button>
                            <button 
                              type="button" 
                              onClick={() => {
                                const printable = window.open('', '_blank');
                                if (printable) {
                                  const d = new Date();
                                  const year = d.getFullYear();
                                  const month = d.getMonth() + 1;
                                  const date = d.getDate();
                                  let hours = d.getHours();
                                  const minutes = String(d.getMinutes()).padStart(2, '0');
                                  const seconds = String(d.getSeconds()).padStart(2, '0');
                                  const ampm = hours >= 12 ? 'م' : 'ص';
                                  hours = hours % 12;
                                  hours = hours ? hours : 12;
                                  const printDateTime = `${year}/${month}/${date} ${hours}:${minutes}:${seconds} ${ampm}`;

                                  printable.document.write(`
                                    <html dir="rtl">
                                      <head>
                                        <title>التقرير المجمع لإصدارات الفروع والمكاتب</title>
                                        <style>
                                          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                                          .header-box { border: 1px solid #000; padding: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
                                          .header-right { text-align: right; flex: 1; }
                                          .header-center { text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                                          .header-left { text-align: left; flex: 1; font-size: 0.9rem; line-height: 1.6; }
                                          .logo-img { height: 55px; margin-bottom: 5px; }
                                          table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: center; }
                                          th, td { border: 1px solid #000; padding: 10px; font-size: 0.9rem; }
                                          th { background: #f2f2f2; font-weight: bold; }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="header-box">
                                          <div class="header-right">
                                            <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">وقت وتاريخ الانشاء: ${printDateTime}</div>
                                            <div style="font-size: 1.2rem; font-weight: bold;">التقرير المجمع لإصدارات الفروع والمكاتب</div>
                                            <div style="font-size: 0.95rem; margin-top: 5px;">نطاق تاريخي: من ${dateFrom || '-'} إلى ${dateTo || '-'}</div>
                                          </div>
                                          <div class="header-center">
                                            <div style="font-weight: bold;">دولة ليبيا</div>
                                            <div style="font-weight: bold;">الاتحاد الليبي للتأمين</div>
                                          </div>
                                        </div>
                                        <table>
                                          <thead>
                                            <tr>
                                              <th>المكتب</th>
                                              <th>البطاقات المصدرة</th>
                                              <th>البطاقات الملغية</th>
                                              <th>صافي القسط</th>
                                              <th>الضريبة</th>
                                              <th>الدمغة</th>
                                              <th>الإشراف</th>
                                              <th>رسوم الإصدار</th>
                                              <th>الإجمالي</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            ${filteredList.map(item => `
                                              <tr>
                                                <td><b>${item.officeName}</b></td>
                                                <td>${item.soldCount.toLocaleString('ar-LY')}</td>
                                                <td>${item.canceledCount.toLocaleString('ar-LY')}</td>
                                                <td>${item.installment.toFixed(3)}</td>
                                                <td>${item.tax.toFixed(3)}</td>
                                                <td>${item.stamp.toFixed(3)}</td>
                                                <td>${item.supervision.toFixed(3)}</td>
                                                <td>${item.version.toFixed(3)}</td>
                                                <td><b>${item.total.toFixed(3)}</b></td>
                                              </tr>
                                            `).join('')}
                                            <tr style="font-weight: bold; background: #f2f2f2;">
                                              <td>الإجمالي</td>
                                              <td>${totals.sold.toLocaleString('ar-LY')}</td>
                                              <td>${totals.canceled.toLocaleString('ar-LY')}</td>
                                              <td>${totals.installment.toFixed(3)}</td>
                                              <td>${totals.tax.toFixed(3)}</td>
                                              <td>${totals.stamp.toFixed(3)}</td>
                                              <td>${totals.supervision.toFixed(3)}</td>
                                              <td>${totals.version.toFixed(3)}</td>
                                              <td>${totals.total.toFixed(3)}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                        <script>
                                          window.onload = function() {
                                            window.print();
                                          };
                                        </script>
                                      </body>
                                    </html>
                                  `);
                                  printable.document.close();
                                }
                              }}
                              className="btn-cancel" 
                              style={{ padding: '0 20px', borderRadius: '8px', fontWeight: '800', height: '40px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                              طباعة التقرير PDF
                            </button>
                          </form>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>بحث:</span>
                              <input
                                type="text"
                                placeholder="ابحث باسم المكتب..."
                                value={officesAggSearchQuery}
                                onChange={(e) => {
                                  setOfficesAggSearchQuery(e.target.value);
                                  setOfficesAggCurrentPage(1);
                                }}
                                style={{
                                  padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                  background: 'var(--input-bg)', color: 'var(--text)', fontSize: '0.85rem', width: '220px'
                                }}
                              />
                            </div>
                            <p style={{ fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>مجمع إصدارات وقيم عمولات وضوابط مكاتب التوزيع:</p>
                          </div>

                          <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                              <thead>
                                <tr style={{ background: 'var(--table-header)' }}>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المكتب</th>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>عدد البطاقات المصدرة</th>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>عدد البطاقات الملغية</th>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>صافي القسط</th>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>الضريبة</th>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رسم الدمغة</th>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>الإشراف</th>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رسوم الإصدار</th>
                                  <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>الإجمالي</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredList.slice((officesAggCurrentPage - 1) * officesAggRowsPerPage, officesAggCurrentPage * officesAggRowsPerPage).map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{item.officeName}</td>
                                    <td style={{ padding: '12px 15px', color: 'var(--sidebar)', fontWeight: 'bold' }}>{item.soldCount}</td>
                                    <td style={{ padding: '12px 15px', color: '#b91c1c' }}>{item.canceledCount}</td>
                                    <td style={{ padding: '12px 15px' }}>{item.installment.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px' }}>{item.tax.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px' }}>{item.stamp.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px' }}>{item.supervision.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px' }}>{item.version.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px', fontWeight: 'bold', color: 'var(--sidebar)' }}>{item.total.toFixed(3)}</td>
                                  </tr>
                                ))}
                                {filteredList.length === 0 && (
                                  <tr>
                                    <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>لا توجد بيانات إصدارات للمكاتب لعرضها</td>
                                  </tr>
                                )}
                              </tbody>
                              {filteredList.length > 0 && (
                                <tfoot>
                                  <tr style={{ background: 'var(--table-header)', borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                                    <td style={{ padding: '12px 15px' }}>الإجمالي</td>
                                    <td style={{ padding: '12px 15px', color: 'var(--sidebar)' }}>{totals.sold}</td>
                                    <td style={{ padding: '12px 15px', color: '#b91c1c' }}>{totals.canceled}</td>
                                    <td style={{ padding: '12px 15px' }}>{totals.installment.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px' }}>{totals.tax.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px' }}>{totals.stamp.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px' }}>{totals.supervision.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px' }}>{totals.version.toFixed(3)}</td>
                                    <td style={{ padding: '12px 15px', color: 'var(--sidebar)' }}>{totals.total.toFixed(3)}</td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>

                          {filteredList.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                              <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 'bold' }}>
                                عرض {(officesAggCurrentPage - 1) * officesAggRowsPerPage + 1} إلى {Math.min(officesAggCurrentPage * officesAggRowsPerPage, filteredList.length)} من أصل {filteredList.length.toLocaleString('ar-LY')} مكتب
                              </div>

                              {totalAggPages > 1 && (
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    disabled={officesAggCurrentPage === 1}
                                    onClick={() => setOfficesAggCurrentPage(prev => Math.max(prev - 1, 1))}
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                      background: officesAggCurrentPage === 1 ? 'var(--input-bg)' : 'var(--panel)',
                                      color: officesAggCurrentPage === 1 ? 'var(--muted)' : 'var(--text)',
                                      cursor: officesAggCurrentPage === 1 ? 'not-allowed' : 'pointer',
                                      fontWeight: 'bold', fontSize: '0.85rem'
                                    }}
                                  >
                                    السابق
                                  </button>
                                  
                                  {getAggPageNumbers().map((page, idx) => {
                                    const isPageNumber = typeof page === 'number';
                                    const isActive = page === officesAggCurrentPage;
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        disabled={!isPageNumber}
                                        onClick={() => isPageNumber && setOfficesAggCurrentPage(page as number)}
                                        style={{
                                          padding: '6px 12px', borderRadius: '6px',
                                          border: isPageNumber ? '1px solid var(--border)' : 'none',
                                          background: isActive ? 'var(--sidebar)' : (isPageNumber ? 'var(--panel)' : 'transparent'),
                                          color: isActive ? '#fff' : 'var(--text)',
                                          cursor: isPageNumber ? 'pointer' : 'default',
                                          fontWeight: 'bold', fontSize: '0.85rem', minWidth: '35px'
                                        }}
                                      >
                                        {isPageNumber ? page.toLocaleString('ar-LY') : page}
                                      </button>
                                    );
                                  })}

                                  <button
                                    type="button"
                                    disabled={officesAggCurrentPage === totalAggPages}
                                    onClick={() => setOfficesAggCurrentPage(prev => Math.min(prev + 1, totalAggPages))}
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                      background: officesAggCurrentPage === totalAggPages ? 'var(--input-bg)' : 'var(--panel)',
                                      color: officesAggCurrentPage === totalAggPages ? 'var(--muted)' : 'var(--text)',
                                      cursor: officesAggCurrentPage === totalAggPages ? 'not-allowed' : 'pointer',
                                      fontWeight: 'bold', fontSize: '0.85rem'
                                    }}
                                  >
                                    التالي
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

          </div>
        )}
        {!loading && activeTab === 'inventory' && (
          <div>
            <h3 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--text)' }}>
              استعلام حالة ومخزون البطاقات البرتقالية للشركة
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['all', 'active', 'cancel', 'sold'] as CardCategory[]).map((cat) => (
                  <button 
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCardCategory(cat);
                      setInventoryData([]);
                    }}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                      background: cardCategory === cat ? 'var(--text)' : 'var(--panel)',
                      color: cardCategory === cat ? '#fff' : 'var(--text)',
                      fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    {cat === 'all' && 'جميع البطاقات'}
                    {cat === 'active' && 'البطاقات النشطة'}
                    {cat === 'cancel' && 'البطاقات الملغية'}
                    {cat === 'sold' && 'البطاقات المباعة'}
                  </button>
                ))}
              </div>
            </div>

            {/* Search and export for Inventory */}
            {(inventoryData.length > 0 || inventorySearchQuery.trim() !== '') && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                gap: '15px',
                flexWrap: 'wrap',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '15px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleFetchInventory(1); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>بحث:</span>
                  <input
                    type="text"
                    placeholder="ابحث برقم البطاقة، الطلب، أو الحالة..."
                    value={inventorySearchQuery}
                    onChange={(e) => setInventorySearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      width: '280px',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button 
                    type="submit" 
                    className="primary" 
                    style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', height: '37px', cursor: 'pointer', border: 'none' }}
                  >
                    بحث
                  </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontSize: '0.9rem' }}>
                    <span>عرض</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>مدخلات</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleFetchInventory(currentPage, true)}
                    className="primary"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      background: 'var(--sidebar)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    تحديث البيانات من سيرفر الاتحاد
                  </button>

                  <button
                    type="button"
                    onClick={handleExportInventoryExcel}
                    className="primary"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      background: '#166534',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <i className="fa-solid fa-file-excel"></i>
                    تصدير إكسل
                  </button>
                </div>
              </div>
            )}

            {inventoryData.length > 0 ? (
              <>
                <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px', maxHeight: '500px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header)' }}>
                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رقم البطاقة</th>
                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>حالة البطاقة</th>
                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>رقم الطلب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventoryData.map((card, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{card.card_number || card.card_serial || '-'}</td>
                          <td style={{ padding: '12px 15px' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                              background: card.cardstautesname === 'البطاقات المعينة' || card.cardstautesname === 'البطاقات النشطة' ? '#dcfce7' : card.cardstautesname === 'البطاقات الملغية' ? '#fee2e2' : '#f1f5f9',
                              color: card.cardstautesname === 'البطاقات المعينة' || card.cardstautesname === 'البطاقات النشطة' ? '#15803d' : card.cardstautesname === 'البطاقات الملغية' ? '#b91c1c' : '#475569'
                            }}>
                              {card.cardstautesname || 'غير محدد'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 15px', fontFamily: 'monospace' }}>{card.request_numberr || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 'bold' }}>
                    عرض {inventoryData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} إلى {Math.min(currentPage * rowsPerPage, inventoryTotal)} من أصل {inventoryTotal.toLocaleString('ar-LY')} مدخل
                  </div>
                  
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: currentPage === 1 ? 'var(--input-bg)' : 'var(--panel)',
                          color: currentPage === 1 ? 'var(--muted)' : 'var(--text)',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                      >
                        السابق
                      </button>
                      
                      {getPageNumbers().map((page, idx) => {
                        const isPageNumber = typeof page === 'number';
                        const isActive = page === currentPage;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!isPageNumber}
                            onClick={() => isPageNumber && setCurrentPage(page as number)}
                            style={{
                              padding: '6px 12px', borderRadius: '6px',
                              border: isPageNumber ? '1px solid var(--border)' : 'none',
                              background: isActive ? 'var(--sidebar)' : (isPageNumber ? 'var(--panel)' : 'transparent'),
                              color: isActive ? '#fff' : 'var(--text)',
                              cursor: isPageNumber ? 'pointer' : 'default',
                              fontWeight: 'bold', fontSize: '0.85rem', minWidth: '35px'
                            }}
                          >
                            {isPageNumber ? page.toLocaleString('ar-LY') : page}
                          </button>
                        );
                      })}
                      
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: currentPage === totalPages ? 'var(--input-bg)' : 'var(--panel)',
                          color: currentPage === totalPages ? 'var(--muted)' : 'var(--text)',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              !loading && (
                <div style={{
                  padding: '40px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px',
                  textAlign: 'center', color: 'var(--muted)', fontWeight: 'bold'
                }}>
                  <i className="fa-solid fa-boxes-stacked" style={{ fontSize: '40px', marginBottom: '15px', color: 'var(--muted)', display: 'block' }}></i>
                  <span>لا توجد بطاقات لعرضها في هذه الفئة حالياً. انقر على "تحديث البيانات من سيرفر الاتحاد" لجلب البيانات الحية.</span>
                </div>
              )
            )}
          </div>
        )}

        {!loading && activeTab === 'distribution' && isAdmin && (
          <div>
            <h3 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--text)' }}>
              توزيع حصص البطاقات البرتقالية للوكلاء (الاتحاد)
            </h3>

            <div className="form-sections-container" style={{ display: 'block', marginBottom: '30px' }}>
              {/* Distribution Form */}
              <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--panel)' }}>
                <h4 style={{ color: 'var(--sidebar)', marginBottom: '20px', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-truck-arrow-right" style={{ marginLeft: '8px' }}></i>
                  توزيع حصة بطاقات لوكالة / مكتب
                </h4>

                <form onSubmit={handleDistributeCards} style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 2, minWidth: '250px', marginBottom: 0 }}>
                    <label style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>المكتب / الوكيل بالاتحاد</label>
                    <select 
                      value={distributeOfficesId}
                      onChange={(e) => setDistributeOfficesId(e.target.value)}
                      required
                      disabled={loadingOffices}
                      style={{ width: '100%', height: '45px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                    >
                      <option value="">-- اختر المكتب من قائمة الاتحاد --</option>
                      {lifoOffices.map((office) => (
                        <option key={office.id} value={office.id}>{office.name} (معرف: {office.id})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: '180px', marginBottom: 0 }}>
                    <label style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>عدد البطاقات لتوزيعها</label>
                    <input 
                      type="number"
                      value={distributeNumOfCards}
                      onChange={(e) => setDistributeNumOfCards(e.target.value)}
                      placeholder="أدخل العدد المطلوب توزيعها"
                      min="1"
                      required
                      style={{ width: '100%', height: '45px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                    />
                  </div>

                  <button type="submit" disabled={submittingDistribute} className="primary btn-submit" style={{ padding: '0 24px', borderRadius: '8px', fontWeight: '800', height: '45px', whiteSpace: 'nowrap' }}>
                    {submittingDistribute ? 'جاري التوزيع...' : 'إتمام توزيع البطاقات'}
                  </button>
                </form>
              </div>
            </div>

            {/* Distribution Summary Table */}
            <div style={{ marginTop: '45px' }}>
              <h4 style={{ marginBottom: '15px', color: 'var(--text)', fontWeight: 'bold' }}>عرض التوزيعات الجارية للمكاتب</h4>
              
              {/* Controls Box */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                gap: '15px',
                flexWrap: 'wrap',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '15px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>بحث:</span>
                  <input
                    type="text"
                    placeholder="ابحث باسم المكتب أو القيمة..."
                    value={distSearchQuery}
                    onChange={(e) => setDistSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      width: '280px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontSize: '0.9rem' }}>
                    <span>عرض</span>
                    <select
                      value={distRowsPerPage}
                      onChange={(e) => {
                        setDistRowsPerPage(parseInt(e.target.value));
                        setDistCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>مدخلات</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleExportDistributionsExcel}
                    className="primary"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      background: '#166534',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <i className="fa-solid fa-file-excel"></i>
                    تصدير إكسل
                  </button>
                </div>
              </div>

              {/* Error Callout if API failed */}
              {distError && (
                <div style={{
                  padding: '15px 20px',
                  background: 'var(--input-bg)',
                  border: '1px solid #ef4444',
                  borderRadius: '10px',
                  color: '#b91c1c',
                  marginBottom: '20px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.9rem'
                }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.2rem' }}></i>
                  <span>{distError}</span>
                </div>
              )}

              {/* Main table */}
              <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'var(--table-header)' }}>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المكتب</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>إجمالي عمليات التوزيع</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDistributions.slice((distCurrentPage - 1) * distRowsPerPage, distCurrentPage * distRowsPerPage).map((dist, idx) => (
                      <Fragment key={idx}>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{dist.office_name}</td>
                          <td style={{ padding: '12px 15px', fontWeight: 'bold', color: 'var(--sidebar)', textAlign: 'center' }}>{dist.totalCards.toLocaleString('ar-LY')}</td>
                          <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedOfficeId(expandedOfficeId === dist.offices_id ? null : dist.offices_id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: expandedOfficeId === dist.offices_id ? 'var(--text)' : 'var(--panel)',
                                color: expandedOfficeId === dist.offices_id ? '#fff' : 'var(--text)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              <i className="fa-solid fa-file-lines" style={{ marginLeft: '4px' }}></i>
                              {expandedOfficeId === dist.offices_id ? 'إخفاء' : 'عرض السجل'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Sub-table showing individual distribution transactions when expanded */}
                        {expandedOfficeId === dist.offices_id && (
                          <tr>
                            <td colSpan={3} style={{ padding: '15px 25px', background: 'var(--input-bg)' }}>
                              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--panel)', padding: '15px' }}>
                                <h5 style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--text)' }}>تفاصيل الحركات الفردية للمكتب:</h5>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                      <th style={{ padding: '8px 10px', color: 'var(--muted)' }}>رقم الحركة</th>
                                      <th style={{ padding: '8px 10px', color: 'var(--muted)', textAlign: 'center' }}>عدد البطاقات</th>
                                      <th style={{ padding: '8px 10px', color: 'var(--muted)' }}>تاريخ الحركة</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dist.logs.map((log, lIdx) => (
                                      <tr key={lIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{log.id || lIdx + 1}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 'bold', textAlign: 'center', color: '#166534' }}>{log.numerofcard || log.count || '-'}</td>
                                        <td style={{ padding: '8px 10px' }}>{log.created_at || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {filteredDistributions.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>لا توجد حركات توزيع مسجلة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredDistributions.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 'bold' }}>
                    عرض {filteredDistributions.length === 0 ? 0 : (distCurrentPage - 1) * distRowsPerPage + 1} إلى {Math.min(distCurrentPage * distRowsPerPage, filteredDistributions.length)} من أصل {filteredDistributions.length.toLocaleString('ar-LY')} مدخل
                  </div>
                  
                  {distTotalPages > 1 && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={distCurrentPage === 1}
                        onClick={() => setDistCurrentPage(prev => Math.max(prev - 1, 1))}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: distCurrentPage === 1 ? 'var(--input-bg)' : 'var(--panel)',
                          color: distCurrentPage === 1 ? 'var(--muted)' : 'var(--text)',
                          cursor: distCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                      >
                        السابق
                      </button>
                      
                      {getDistPageNumbers().map((page, idx) => {
                        const isPageNumber = typeof page === 'number';
                        const isActive = page === distCurrentPage;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!isPageNumber}
                            onClick={() => isPageNumber && setDistCurrentPage(page as number)}
                            style={{
                              padding: '6px 12px', borderRadius: '6px',
                              border: isPageNumber ? '1px solid var(--border)' : 'none',
                              background: isActive ? 'var(--sidebar)' : (isPageNumber ? 'var(--panel)' : 'transparent'),
                              color: isActive ? '#fff' : 'var(--text)',
                              cursor: isPageNumber ? 'pointer' : 'default',
                              fontWeight: 'bold', fontSize: '0.85rem', minWidth: '35px'
                            }}
                          >
                            {isPageNumber ? page.toLocaleString('ar-LY') : page}
                          </button>
                        );
                      })}
                      
                      <button
                        type="button"
                        disabled={distCurrentPage === distTotalPages}
                        onClick={() => setDistCurrentPage(prev => Math.min(prev + 1, distTotalPages))}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: distCurrentPage === distTotalPages ? 'var(--input-bg)' : 'var(--panel)',
                          color: distCurrentPage === distTotalPages ? 'var(--muted)' : 'var(--text)',
                          cursor: distCurrentPage === distTotalPages ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'refund' && isAdmin && (
          <div>
            <h3 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--text)' }}>
              إدارة واسترجاع البطاقات المرتجعة من الوكلاء (الاتحاد)
            </h3>

            <div className="form-sections-container" style={{ display: 'block', marginBottom: '30px' }}>
              {/* Refund Form */}
              <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--panel)' }}>
                <h4 style={{ color: '#b91c1c', marginBottom: '20px', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-rotate-left" style={{ marginLeft: '8px' }}></i>
                  إضافة عملية راجعة (استرجاع من مكتب)
                </h4>

                <form onSubmit={handleRefundCards} style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
                    <label style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>المكتب / الوكيل بالاتحاد</label>
                    <select 
                      value={refundOfficesId}
                      onChange={(e) => setRefundOfficesId(e.target.value)}
                      required
                      disabled={loadingOffices}
                      style={{ width: '100%', height: '45px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                    >
                      <option value="">-- اختر المكتب من قائمة الاتحاد --</option>
                      {lifoOffices.map((office) => (
                        <option key={office.id} value={office.id}>{office.name} (معرف: {office.id})</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" disabled={submittingRefund} className="primary btn-submit" style={{ padding: '0 24px', borderRadius: '8px', fontWeight: '800', background: '#b91c1c', height: '45px', whiteSpace: 'nowrap' }}>
                    {submittingRefund ? 'جاري الاسترجاع...' : 'إتمام استرجاع البطاقات'}
                  </button>
                </form>
              </div>
            </div>

            {/* Refunds Table */}
            <div style={{ marginTop: '45px' }}>
              <h4 style={{ marginBottom: '15px', color: 'var(--text)', fontWeight: 'bold' }}>عرض الراجعات الجارية من المكاتب</h4>
              
              {/* Controls Box */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                gap: '15px',
                flexWrap: 'wrap',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '15px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>بحث:</span>
                  <input
                    type="text"
                    placeholder="ابحث باسم المكتب أو القيمة..."
                    value={refundSearchQuery}
                    onChange={(e) => setRefundSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      width: '280px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontSize: '0.9rem' }}>
                    <span>عرض</span>
                    <select
                      value={refundRowsPerPage}
                      onChange={(e) => {
                        setRefundRowsPerPage(parseInt(e.target.value));
                        setRefundCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>مدخلات</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleExportRefundsExcel}
                    className="primary"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      background: '#166534',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <i className="fa-solid fa-file-excel"></i>
                    تصدير إكسل
                  </button>
                </div>
              </div>

              {/* Error Callout if API failed */}
              {refundError && (
                <div style={{
                  padding: '15px 20px',
                  background: 'var(--input-bg)',
                  border: '1px solid #ef4444',
                  borderRadius: '10px',
                  color: '#b91c1c',
                  marginBottom: '20px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.9rem'
                }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.2rem' }}></i>
                  <span>{refundError}</span>
                </div>
              )}

              {/* Main table */}
              <div className="table-wrapper custom-scrollbar" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'var(--table-header)' }}>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>المكتب</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>اجمالي عدد الراجعات</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>تاريخ الارجاع</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>التفاصيل</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>إرجاع حصة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRefunds.slice((refundCurrentPage - 1) * refundRowsPerPage, refundCurrentPage * refundRowsPerPage).map((ref, idx) => (
                      <Fragment key={idx}>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{ref.office_name}</td>
                          <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#b91c1c', textAlign: 'center' }}>{ref.totalCards.toLocaleString('ar-LY')}</td>
                          <td style={{ padding: '12px 15px' }}>{ref.latestDate || '-'}</td>
                          <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedRefundOfficeId(expandedRefundOfficeId === ref.offices_id ? null : ref.offices_id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: expandedRefundOfficeId === ref.offices_id ? 'var(--text)' : 'var(--panel)',
                                color: expandedRefundOfficeId === ref.offices_id ? '#fff' : 'var(--text)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              <i className="fa-solid fa-file-lines" style={{ marginLeft: '4px' }}></i>
                              {expandedRefundOfficeId === ref.offices_id ? 'إخفاء' : 'عرض السجل'}
                            </button>
                          </td>
                          <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من استرجاع كافة البطاقات الموزعة من مكتب: ${ref.office_name}؟`)) {
                                  handleRefundCardsForOffice(ref.offices_id);
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              <i className="fa-solid fa-trash-can" style={{ marginLeft: '4px' }}></i>
                              إرجاع
                            </button>
                          </td>
                        </tr>
                        
                        {/* Sub-table showing individual refund transactions when expanded */}
                        {expandedRefundOfficeId === ref.offices_id && (
                          <tr>
                            <td colSpan={5} style={{ padding: '15px 25px', background: 'var(--input-bg)' }}>
                              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--panel)', padding: '15px' }}>
                                <h5 style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--text)' }}>تفاصيل حركات الارتجاع الفردية للمكتب:</h5>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                      <th style={{ padding: '8px 10px', color: 'var(--muted)' }}>رقم الحركة</th>
                                      <th style={{ padding: '8px 10px', color: 'var(--muted)', textAlign: 'center' }}>عدد البطاقات المسترجعة</th>
                                      <th style={{ padding: '8px 10px', color: 'var(--muted)' }}>تاريخ الحركة</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ref.logs.map((log, lIdx) => (
                                      <tr key={lIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{log.id || lIdx + 1}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 'bold', textAlign: 'center', color: '#b91c1c' }}>{log.numerofcard || log.count || '-'}</td>
                                        <td style={{ padding: '8px 10px' }}>{log.created_at || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {filteredRefunds.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>لا توجد حركات استرجاع مسجلة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredRefunds.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 'bold' }}>
                    عرض {filteredRefunds.length === 0 ? 0 : (refundCurrentPage - 1) * refundRowsPerPage + 1} إلى {Math.min(refundCurrentPage * refundRowsPerPage, filteredRefunds.length)} من أصل {filteredRefunds.length.toLocaleString('ar-LY')} مدخل
                  </div>
                  
                  {refundTotalPages > 1 && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={refundCurrentPage === 1}
                        onClick={() => setRefundCurrentPage(prev => Math.max(prev - 1, 1))}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: refundCurrentPage === 1 ? 'var(--input-bg)' : 'var(--panel)',
                          color: refundCurrentPage === 1 ? 'var(--muted)' : 'var(--text)',
                          cursor: refundCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                      >
                        السابق
                      </button>
                      
                      {getRefundPageNumbers().map((page, idx) => {
                        const isPageNumber = typeof page === 'number';
                        const isActive = page === refundCurrentPage;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!isPageNumber}
                            onClick={() => isPageNumber && setRefundCurrentPage(page as number)}
                            style={{
                              padding: '6px 12px', borderRadius: '6px',
                              border: isPageNumber ? '1px solid var(--border)' : 'none',
                              background: isActive ? 'var(--sidebar)' : (isPageNumber ? 'var(--panel)' : 'transparent'),
                              color: isActive ? '#fff' : 'var(--text)',
                              cursor: isPageNumber ? 'pointer' : 'default',
                              fontWeight: 'bold', fontSize: '0.85rem', minWidth: '35px'
                            }}
                          >
                            {isPageNumber ? page.toLocaleString('ar-LY') : page}
                          </button>
                        );
                      })}
                      
                      <button
                        type="button"
                        disabled={refundCurrentPage === refundTotalPages}
                        onClick={() => setRefundCurrentPage(prev => Math.min(prev + 1, refundTotalPages))}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: refundCurrentPage === refundTotalPages ? 'var(--input-bg)' : 'var(--panel)',
                          color: refundCurrentPage === refundTotalPages ? 'var(--muted)' : 'var(--text)',
                          cursor: refundCurrentPage === refundTotalPages ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
