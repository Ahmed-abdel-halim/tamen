import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL, BACKEND_URL } from "../config/api";
import { showToast } from "./Toast";
import { generatePremiumExcel } from "../utils/excelGenerator";

// ─── Interfaces & Types ───────────────────────────────────────────────────────

export interface Employee {
  id: number;
  username: string;
  name: string;
  email?: string;
  is_admin?: boolean;
  is_active?: boolean;
  is_blocked?: boolean;
  authorized_documents?: string[];
  salary?: number;
  salary_type?: string;
  hourly_rate?: number;
  national_id_number?: string | null;
  job_title?: string | null;
  full_name_quad?: string;
  mother_name?: string;
  gender?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  social_status?: string;
  qualification?: string;
  blood_type?: string;
  personal_phone?: string;
  guardian_phone?: string;
  address?: string;
  financial_number?: string;
  job_number?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  start_date?: string;
  end_date?: string | null;
  working_hours_from?: string;
  working_hours_to?: string;
  working_days_from?: string;
  working_days_to?: string;
  contract_type?: string;
  contract_duration?: string;
  contract_conditions?: string;
  housing_allowance?: number;
  transportation_allowance?: number;
  communication_allowance?: number;
  fixed_bonuses?: number;
  fixed_fines?: number;
  hourly_leave_deduction?: number;
  daily_leave_deduction?: number;
  social_security_percentage?: number;
  tax_percentage?: number;
  solidarity_percentage?: number;
  tax_file_number?: string | null;
  social_security_file_number?: string | null;
  apply_tax?: boolean;
  apply_social_security?: boolean;
  apply_solidarity?: boolean;
  profile_photo_url?: string | null;
  national_id_photo_url?: string | null;
  identity_proof_url?: string | null;
  employment_contract_url?: string | null;
  certified_stamp_url?: string | null;
  approved_signature_url?: string | null;
  educational_certificate_url?: string | null;
  health_certificate_url?: string | null;
  personal_id_proof_url?: string | null;
  contract_conditions_photo_url?: string | null;
  passport_photo_url?: string | null;
  clearance_certificate_url?: string | null;
  experience_certificate_url?: string | null;
  work_commencement_order_url?: string | null;
  resignation_letter_url?: string | null;
}

interface Payroll {
  id: number;
  year: number;
  month: number;
  base_salary: number;
  housing_allowance: number;
  transportation_allowance: number;
  communication_allowance: number;
  allowance_amount: number;
  bonus_amount: number;
  other_additions: number;
  penalty_amount: number;
  tax_amount: number;
  social_security_amount: number;
  solidarity_amount?: number;
  deduction_amount: number;
  advance_amount: number;
  net_salary: number;
  status: "paid" | "unpaid";
  delivery_method?: string;
  paid_at?: string | null;
  notes?: string | null;
  voucher_number?: string | null;
}

interface CustodyItem {
  id: number;
  name?: string;
  item_name?: string;
  quantity: number;
  inventory_type: string;
  category?: string;
  unit?: string;
  description?: string;
  assigned_at?: string;
  status: string;
  serial_start?: string;
  serial_end?: string;
  condition?: string;
  notes?: string;
  item?: {
    name: string;
    inventory_type?: string;
    category?: string;
    unit?: string;
  };
}

interface InsuranceDoc {
  id: number;
  document_number: string;
  insured_name?: string;
  insurance_type?: string;
  start_date?: string;
  end_date?: string;
  premium?: number;
  status?: string;
  created_at: string;
}

interface EmployeeRequest {
  id: number;
  type: "termination" | "leave_hourly" | "leave_daily" | "salary_advance" | "allowance" | "complaint" | "maintenance" | "other";
  status: "pending" | "approved" | "rejected";
  with_salary: boolean;
  reason: string;
  created_at: string;
  admin_notes?: string;
  details?: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolvePublicUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  let clean = path.startsWith("/") ? path.slice(1) : path;
  if (clean.startsWith("img/")) return `${window.location.origin}/${clean}`;
  if (clean.startsWith("storage/")) return `${BACKEND_URL}/${clean}`;
  return `${BACKEND_URL}/storage/${clean}`;
}

const fmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (v: unknown) => fmt.format(Number(v ?? 0));
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("ar-LY") : "—");

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const REQUEST_TYPE_LABELS: Record<string, string> = {
  termination: "طلب استقالة",
  leave_hourly: "إجازة بالساعة",
  leave_daily: "إجازة يومية",
  salary_advance: "سلفة راتب",
  allowance: "طلب بدل",
  complaint: "شكوى أو تظلم",
  maintenance: "طلب صيانة عهدة",
  other: "طلب إداري آخر",
};

const DOCUMENT_ITEMS = [
  { key: "national_id_photo_url", label: "صورة الرقم الوطني / الهوية", icon: "fa-id-card", color: "#3b82f6" },
  { key: "passport_photo_url", label: "جواز السفر", icon: "fa-passport", color: "#6366f1" },
  { key: "employment_contract_url", label: "عقد العمل المعتمد", icon: "fa-file-contract", color: "#10b981" },
  { key: "work_commencement_order_url", label: "إذن مباشرة العمل", icon: "fa-file-signature", color: "#f59e0b" },
  { key: "identity_proof_url", label: "إثبات الهوية الشخصي", icon: "fa-address-card", color: "#8b5cf6" },
  { key: "certified_stamp_url", label: "الختم المعتمد", icon: "fa-stamp", color: "#ec4899" },
  { key: "approved_signature_url", label: "التوقيع المعتمد", icon: "fa-pen-nib", color: "#06b6d4" },
  { key: "educational_certificate_url", label: "المؤهل والشهادة التعليمية", icon: "fa-graduation-cap", color: "#14b8a6" },
  { key: "health_certificate_url", label: "الشهادة الصحية", icon: "fa-heart-pulse", color: "#ef4444" },
  { key: "clearance_certificate_url", label: "شهادة إبراء الذمة", icon: "fa-certificate", color: "#84cc16" },
  { key: "experience_certificate_url", label: "شهادات الخبرة السابقة", icon: "fa-award", color: "#f97316" },
  { key: "contract_conditions_photo_url", label: "ملحق شروط العقد", icon: "fa-file-lines", color: "#64748b" },
];

const LEDGER_DOC_TYPES = [
  { key: "all", label: "جميع أنواع التأمين (الكل)" },
  { key: "insurance_documents", label: "تأمين سيارات" },
  { key: "international_insurance_documents", label: "تأمين سيارات دولي" },
  { key: "travel_insurance_documents", label: "تأمين المسافرين" },
  { key: "resident_insurance_documents", label: "تأمين الوافدين" },
  { key: "marine_structure_insurance_documents", label: "تأمين الهياكل البحرية" },
  { key: "professional_liability_insurance_documents", label: "تأمين المسؤولية المهنية" },
  { key: "personal_accident_insurance_documents", label: "تأمين الحوادث الشخصية" },
  { key: "school_student_insurance_documents", label: "تأمين طلاب المدارس" },
  { key: "cargo_insurance_documents", label: "تأمين شحن البضائع" },
  { key: "cash_in_transit_insurance_documents", label: "تأمين نقل النقدية" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeManagement() {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // All employees list for switcher
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [loadingEmployeesList, setLoadingEmployeesList] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    urlId ? parseInt(urlId, 10) : null
  );

  // Search & filter in employee dropdown
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Employee data & sub-lists
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [payFormData, setPayFormData] = useState<null | {
    id?: number;
    year: number;
    month: number;
    salary_type: "monthly" | "hourly";
    base_salary: number;
    hourly_rate: number;
    hours_worked: number;
    housing_allowance: number;
    transportation_allowance: number;
    communication_allowance: number;
    bonus_amount: number;
    other_additions: number;
    deduction_amount: number;
    advance_amount: number;
    penalty_amount: number;
    apply_tax: boolean;
    tax_percentage: number;
    apply_social_security: boolean;
    social_security_percentage: number;
    apply_solidarity: boolean;
    solidarity_percentage: number;
    status: "paid" | "unpaid";
    paid_at: string;
    delivery_method: string;
    custom_delivery_method: string;
    notes: string;
    voucher_number: string;
  }>(null);

  const handleOpenQuickPay = () => {
    if (!employee) return;
    const now = new Date();
    setPayFormData({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      salary_type: (employee.salary_type as any) || "monthly",
      base_salary: Number(employee.salary || 0),
      hourly_rate: Number(employee.hourly_rate || 0),
      hours_worked: 0,
      housing_allowance: Number(employee.housing_allowance || 0),
      transportation_allowance: Number(employee.transportation_allowance || 0),
      communication_allowance: Number(employee.communication_allowance || 0),
      bonus_amount: Number(employee.fixed_bonuses || 0),
      other_additions: 0,
      deduction_amount: Number(employee.fixed_fines || 0),
      advance_amount: 0,
      penalty_amount: 0,
      apply_tax: employee.apply_tax !== false,
      tax_percentage: Number(employee.tax_percentage ?? 10),
      apply_social_security: employee.apply_social_security !== false,
      social_security_percentage: Number(employee.social_security_percentage ?? 19.475),
      apply_solidarity: employee.apply_solidarity === true,
      solidarity_percentage: Number(employee.solidarity_percentage ?? 1),
      status: "paid",
      paid_at: now.toISOString().substring(0, 10),
      delivery_method: "نقدي (خزينة الشركة)",
      custom_delivery_method: "",
      notes: "",
      voucher_number: "",
    });
  };

  const openPaySalaryModal = (p: Payroll) => {
    setPayFormData({
      id: p.id,
      year: p.year,
      month: p.month,
      salary_type: (employee?.salary_type as any) || "monthly",
      base_salary: Number(p.base_salary ?? (employee?.salary || 0)),
      hourly_rate: Number(employee?.hourly_rate || 0),
      hours_worked: (p as any).hours_worked ? Number((p as any).hours_worked) : 0,
      housing_allowance: Number(p.housing_allowance || 0),
      transportation_allowance: Number(p.transportation_allowance || 0),
      communication_allowance: Number(p.communication_allowance || 0),
      bonus_amount: Number(p.bonus_amount || 0),
      other_additions: Number(p.other_additions || p.allowance_amount || 0),
      deduction_amount: Number(p.deduction_amount || 0),
      advance_amount: Number(p.advance_amount || 0),
      penalty_amount: Number(p.penalty_amount || 0),
      apply_tax: p.tax_amount != null ? Number(p.tax_amount) > 0 : (employee?.apply_tax !== false),
      tax_percentage: Number(employee?.tax_percentage ?? 10),
      apply_social_security: p.social_security_amount != null ? Number(p.social_security_amount) > 0 : (employee?.apply_social_security !== false),
      social_security_percentage: Number(employee?.social_security_percentage ?? 19.475),
      apply_solidarity: (p as any).solidarity_amount != null ? Number((p as any).solidarity_amount) > 0 : (employee?.apply_solidarity === true),
      solidarity_percentage: Number(employee?.solidarity_percentage ?? 1),
      status: p.status || "paid",
      paid_at: p.paid_at ? p.paid_at.substring(0, 10) : new Date().toISOString().substring(0, 10),
      delivery_method: p.delivery_method || "نقدي (خزينة الشركة)",
      custom_delivery_method: (p as any).custom_delivery_method || "",
      notes: p.notes || "",
      voucher_number: (p as any).voucher_number || "",
    });
  };
  const [custody, setCustody] = useState<CustodyItem[]>([]);
  const [insuranceDocs, setInsuranceDocs] = useState<InsuranceDoc[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters
  const [selectedDocType, setSelectedDocType] = useState("all");
  const [excludeCanceledDocs, setExcludeCanceledDocs] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    | "payroll"
    | "insurance_docs"
    | "custody"
    | "documents"
    | "requests"
    | "settlement"
    | "certificates"
    | "profile"
    | "performance"
    | "attendance"
    | "loans"
    | "badge"
  >("payroll");

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [showAssignCustodyModal, setShowAssignCustodyModal] = useState(false);
  const [newCustodyName, setNewCustodyName] = useState("");
  const [newCustodyType, setNewCustodyType] = useState("fixed");
  const [newCustodyQty, setNewCustodyQty] = useState("1");
  const [newCustodySerial, setNewCustodySerial] = useState("");
  const [newCustodyCondition, setNewCustodyCondition] = useState("جديد");
  const [newCustodyNotes, setNewCustodyNotes] = useState("");
  const [assigningCustody, setAssigningCustody] = useState(false);

  const [showReqModal, setShowReqModal] = useState(false);
  const [newReq, setNewReq] = useState({
    type: "leave_daily" as any,
    with_salary: true,
    reason: "",
    details: {} as any,
  });
  const [submittingReq, setSubmittingReq] = useState(false);

  const [notesModal, setNotesModal] = useState<{ reqId: number; status: "approved" | "rejected" } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Digital vCard modal
  const [showVCardModal, setShowVCardModal] = useState(false);

  // End of Service Gratuity Calculator Custom State
  const [settlementTerminationDate, setSettlementTerminationDate] = useState(new Date().toISOString().split("T")[0]);
  const [settlementLeaveDays, setSettlementLeaveDays] = useState("15");
  const [settlementDeductions, setSettlementDeductions] = useState("0");
  const [settlementBonus, setSettlementBonus] = useState("0");

  // ─── 1. Performance & KPI Evaluation State (NEW ENTERPRISE FEATURE) ───
  const [evalList, setEvalList] = useState([
    {
      id: 1,
      period: "التقييم السنوي الشامل 2025",
      date: "2025-12-31",
      score: 96.5,
      grade: "ممتاز مرتفع ⭐⭐⭐⭐⭐",
      evaluator: "لجنة الموارد البشرية والمدير العام",
      recommendation: "صرف مكافأة تميز سنوية بقيمة راتب شهر + ترقية استثنائية",
      notes: "أداء استثنائي ودقة متناهية في إصدار وثائق التأمين، وانضباط تام في مواعيد العمل والتعامل الراقي مع العملاء.",
      breakdown: { punctuality: 97, accuracy: 98, tasks: 95, teamwork: 96, custody: 100 },
    },
    {
      id: 2,
      period: "التقييم الدوري - الربع الثالث Q3 2025",
      date: "2025-09-30",
      score: 94.0,
      grade: "ممتاز ⭐⭐⭐⭐",
      evaluator: "مدير الشؤون الإدارية",
      recommendation: "توجيه كتاب شكر وتقدير رسمي من الإدارة العليا",
      notes: "تحقيق المستهدف التأميني بنسبة 115% بدون أي مخالفات أو ملاحظات إجرائية.",
      breakdown: { punctuality: 94, accuracy: 96, tasks: 92, teamwork: 94, custody: 98 },
    },
  ]);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalForm, setEvalForm] = useState({
    period: "تقييم الأداء الدوري 2026",
    punctuality: 95,
    accuracy: 98,
    tasks: 92,
    teamwork: 96,
    custody: 100,
    recommendation: "صرف مكافأة تميز وظيفي للموظف",
    notes: "ملتزم ومبادر ويؤدي مهامه بدقة وسرعة عالية.",
  });

  // ─── 2. Attendance & Working Hours State (NEW ENTERPRISE FEATURE) ───
  const [attendanceMonth, setAttendanceMonth] = useState("2026-03");
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);
  const [manualAttData, setManualAttData] = useState({
    date: new Date().toISOString().split("T")[0],
    checkIn: "08:30",
    checkOut: "16:30",
    status: "present",
    overtimeHours: "0",
    notes: "تسجيل دوام يدوي معتمد",
  });
  const [attendanceRecords, setAttendanceRecords] = useState([
    { id: 1, date: "2026-03-01", day: "الأحد", checkIn: "08:25", checkOut: "16:30", hours: 8, overtime: 0, status: "present", notes: "حضور في الموعد" },
    { id: 2, date: "2026-03-02", day: "الإثنين", checkIn: "08:30", checkOut: "18:00", hours: 9.5, overtime: 1.5, status: "present", notes: "ساعات إضافية معتمدة" },
    { id: 3, date: "2026-03-03", day: "الثلاثاء", checkIn: "08:20", checkOut: "16:35", hours: 8.25, overtime: 0, status: "present", notes: "حضور في الموعد" },
    { id: 4, date: "2026-03-04", day: "الأربعاء", checkIn: "08:45", checkOut: "16:30", hours: 7.75, overtime: 0, status: "late", notes: "تأخير 15 دقيقة بعذر مقبول" },
    { id: 5, date: "2026-03-05", day: "الخميس", checkIn: "08:30", checkOut: "17:30", hours: 9, overtime: 1, status: "present", notes: "ساعات عمل إضافية" },
    { id: 6, date: "2026-03-08", day: "الأحد", checkIn: "08:28", checkOut: "16:30", hours: 8, overtime: 0, status: "present", notes: "حضور في الموعد" },
    { id: 7, date: "2026-03-09", day: "الإثنين", checkIn: "08:30", checkOut: "16:30", hours: 8, overtime: 0, status: "present", notes: "حضور في الموعد" },
  ]);

  // ─── 3. Loans & Salary Advances State (NEW ENTERPRISE FEATURE) ───
  const [loansList, setLoansList] = useState([
    {
      id: 1,
      loanCode: "LN-2025-08",
      amount: 3000,
      monthlyInstallment: 500,
      paidAmount: 2500,
      remainingAmount: 500,
      totalMonths: 6,
      paidMonths: 5,
      startDate: "2025-08-01",
      status: "active",
      reason: "سلفة طارئة شخصية معتمدة",
    },
    {
      id: 2,
      loanCode: "LN-2024-11",
      amount: 2000,
      monthlyInstallment: 400,
      paidAmount: 2000,
      remainingAmount: 0,
      totalMonths: 5,
      paidMonths: 5,
      startDate: "2024-11-01",
      status: "completed",
      reason: "سلفة زواج ومصاريف عائلية",
    },
  ]);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [newLoanData, setNewLoanData] = useState({
    amount: "1500",
    months: "3",
    startDate: new Date().toISOString().split("T")[0],
    reason: "سلفة مصاريف موسمية",
  });

  // ─── 4. WhatsApp Quick Connect Suite (NEW ENTERPRISE FEATURE) ───
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState("salary");
  const [customWhatsappMsg, setCustomWhatsappMsg] = useState("");

  // ─── Click outside dropdown listener ───
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setEmpDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Check Auth & Load List of Employees ───
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      try {
        setIsAdmin(JSON.parse(u).is_admin);
      } catch {}
    }
    loadEmployees();
  }, []);

  // ─── React to URL or Selected ID Change ───
  useEffect(() => {
    if (urlId) {
      const parsed = parseInt(urlId, 10);
      if (!isNaN(parsed) && parsed !== selectedEmployeeId) {
        setSelectedEmployeeId(parsed);
      }
    }
  }, [urlId]);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeData(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  const authHeaders = () => ({
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
  });

  // ─── Fetch All Active Employees ───
  const loadEmployees = async () => {
    setLoadingEmployeesList(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users?per_page=1000`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const rawList: Employee[] = Array.isArray(data) ? data : data.data || [];
        // Keep all employees so that blocked/inactive employees can also be managed and unblocked
        setEmployeesList(rawList);

        if (rawList.length > 0) {
          const currentValid = selectedEmployeeId && rawList.some((e) => e.id === selectedEmployeeId);
          if (!currentValid) {
            const firstId = rawList[0].id;
            setSelectedEmployeeId(firstId);
            navigate(`/employees/${firstId}`, { replace: true });
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch employees list", err);
    } finally {
      setLoadingEmployeesList(false);
    }
  };

  // ─── Fetch Selected Employee Data ───
  const loadEmployeeData = async (empId: number) => {
    setLoading(true);
    try {
      const rEmp = await fetch(`${API_BASE_URL}/users/${empId}`, { headers: authHeaders() });
      if (rEmp.ok) {
        const empData = await rEmp.json();
        setEmployee(empData);
        setEditFormData(empData);
      } else {
        throw new Error("لم يتم العثور على بيانات الموظف");
      }

      try {
        const rPay = await fetch(`${API_BASE_URL}/employee-payrolls?user_id=${empId}&per_page=100`, { headers: authHeaders() });
        if (rPay.ok) {
          const d = await rPay.json();
          setPayrolls(Array.isArray(d) ? d : d.data || []);
        }
      } catch {}

      try {
        const rCust = await fetch(`${API_BASE_URL}/inventory/custody?recipient_id=${empId}&recipient_type=employee`, {
          headers: authHeaders(),
        });
        if (rCust.ok) {
          const d = await rCust.json();
          setCustody((Array.isArray(d) ? d : []).filter((c: any) => c.status === "active"));
        }
      } catch {}

      try {
        const rDocs = await fetch(`${API_BASE_URL}/insurance-documents?created_by=${empId}&per_page=100`, {
          headers: authHeaders(),
        });
        if (rDocs.ok) {
          const d = await rDocs.json();
          setInsuranceDocs(Array.isArray(d) ? d : d.data || []);
        }
      } catch {}

      try {
        const rReq = await fetch(`${API_BASE_URL}/employee-requests?user_id=${empId}`, { headers: authHeaders() });
        if (rReq.ok) {
          const d = await rReq.json();
          setRequests(Array.isArray(d) ? d : d.data || []);
        }
      } catch {}
    } catch (e: any) {
      showToast(e.message || "خطأ أثناء جلب البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    setEmpDropdownOpen(false);
    navigate(`/employees/${emp.id}`);
  };

  // ─── Toggle Block / Active Employee Account ───
  const handleToggleEmployeeStatus = async () => {
    if (!employee) return;
    const isCurrentlyBlocked = Boolean(employee.is_blocked || employee.is_active === false);
    const willBeBlocked = !isCurrentlyBlocked;
    const actionText = willBeBlocked ? "حظر وتعطيل" : "إلغاء حظر وتنشيط";
    if (!window.confirm(`هل أنت متأكد من ${actionText} حساب الموظف (${employee.name})؟`)) return;

    try {
      let res = await fetch(`${API_BASE_URL}/users/${employee.id}/toggle-block`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });

      if (!res.ok) {
        // Fallback to PUT /users/{id}
        res = await fetch(`${API_BASE_URL}/users/${employee.id}`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ is_blocked: willBeBlocked, is_active: !willBeBlocked }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.message || "فشل تحديث حالة الحساب");
        }
      }

      showToast(
        willBeBlocked
          ? "تم حظر الموظف وإيقاف حسابه بنجاح"
          : "تم إلغاء حظر الموظف وتنشيط حسابه بنجاح",
        "success"
      );

      const newActive = !willBeBlocked;
      setEmployee((prev) =>
        prev ? { ...prev, is_blocked: willBeBlocked, is_active: newActive } : null
      );
      setEmployeesList((prev) =>
        prev.map((e) =>
          e.id === employee.id
            ? { ...e, is_blocked: willBeBlocked, is_active: newActive }
            : e
        )
      );
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء التحديث", "error");
    }
  };

  // ─── Save Quick Edit ───
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${employee.id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      if (!res.ok) throw new Error("فشل تحديث البيانات");
      const updated = await res.json();
      setEmployee(updated);
      setEmployeesList((prev) => prev.map((e) => (e.id === employee.id ? { ...e, ...updated } : e)));
      showToast("تم تحديث بيانات الموظف بنجاح", "success");
      setShowEditModal(false);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Salary Payment & Adjustment ───
  const handleProcessSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFormData || !employee) return;
    setSubmittingPayment(true);
    try {
      const baseSalaryEffective =
        payFormData.salary_type === "hourly"
          ? Number(payFormData.hourly_rate || 0) * Number(payFormData.hours_worked || 0)
          : Number(payFormData.base_salary || 0);

      const adds =
        Number(payFormData.housing_allowance || 0) +
        Number(payFormData.transportation_allowance || 0) +
        Number(payFormData.communication_allowance || 0) +
        Number(payFormData.bonus_amount || 0) +
        Number(payFormData.other_additions || 0);

      const directDeductions =
        Number(payFormData.deduction_amount || 0) +
        Number(payFormData.advance_amount || 0) +
        Number(payFormData.penalty_amount || 0);

      const taxAmount = payFormData.apply_tax
        ? (baseSalaryEffective * Number(payFormData.tax_percentage || 0)) / 100
        : 0;

      const ssAmount = payFormData.apply_social_security
        ? (baseSalaryEffective * Number(payFormData.social_security_percentage || 0)) / 100
        : 0;

      const solidarityAmount = payFormData.apply_solidarity
        ? (baseSalaryEffective * Number(payFormData.solidarity_percentage || 0)) / 100
        : 0;

      const netSalary = Math.max(
        0,
        baseSalaryEffective + adds - directDeductions - taxAmount - ssAmount - solidarityAmount
      );

      const payload = {
        user_id: employee.id,
        year: payFormData.year,
        month: payFormData.month,
        base_salary: baseSalaryEffective,
        housing_allowance: Number(payFormData.housing_allowance || 0),
        transportation_allowance: Number(payFormData.transportation_allowance || 0),
        communication_allowance: Number(payFormData.communication_allowance || 0),
        allowance_amount: 0,
        bonus_amount: Number(payFormData.bonus_amount || 0),
        other_additions: Number(payFormData.other_additions || 0),
        penalty_amount: Number(payFormData.penalty_amount || 0),
        deduction_amount: Number(payFormData.deduction_amount || 0),
        advance_amount: Number(payFormData.advance_amount || 0),
        tax_amount: Number(taxAmount.toFixed(2)),
        social_security_amount: Number(ssAmount.toFixed(2)),
        solidarity_amount: Number(solidarityAmount.toFixed(2)),
        net_salary: Number(netSalary.toFixed(2)),
        hours_worked: payFormData.salary_type === "hourly" ? Number(payFormData.hours_worked || 0) : undefined,
        status: payFormData.status,
        paid_at: payFormData.status === "paid" ? (payFormData.paid_at || new Date().toISOString().substring(0, 10)) : null,
        delivery_method: payFormData.delivery_method,
        custom_delivery_method: payFormData.custom_delivery_method,
        voucher_number: payFormData.voucher_number,
        notes: payFormData.notes,
      };

      const res = await fetch(`${API_BASE_URL}/employee-payrolls`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || "فشل حفظ واعتماد صرف المرتب");
      }

      showToast("تم حفظ واعتماد مسير وصرف المرتب بنجاح", "success");
      setPayFormData(null);

      // Refresh payrolls
      const rPay = await fetch(`${API_BASE_URL}/employee-payrolls?user_id=${employee.id}&per_page=100`, {
        headers: authHeaders(),
      });
      if (rPay.ok) {
        const d = await rPay.json();
        setPayrolls(Array.isArray(d) ? d : d.data || []);
      }
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء حفظ المرتب", "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ─── Assign Custody ───
  const handleAssignCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !newCustodyName.trim()) return;
    setAssigningCustody(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/custody`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: employee.id,
          recipient_type: "employee",
          name: newCustodyName,
          inventory_type: newCustodyType,
          quantity: parseInt(newCustodyQty, 10) || 1,
          serial_start: newCustodySerial,
          condition: newCustodyCondition,
          notes: newCustodyNotes,
          status: "active",
        }),
      });
      if (!res.ok) throw new Error("فشل صرف العهدة");
      showToast("تم صرف العهدة للموظف بنجاح", "success");
      setShowAssignCustodyModal(false);
      setNewCustodyName("");
      setNewCustodySerial("");
      setNewCustodyNotes("");
      loadEmployeeData(employee.id);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء الصرف", "error");
    } finally {
      setAssigningCustody(false);
    }
  };

  // ─── Upload Document File ───
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      const typeKey = fieldKey.replace("_url", "");
      fd.append("type", typeKey);
      fd.append("file", file);

      const res = await fetch(`${API_BASE_URL}/users/${employee.id}/employee-files`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (!res.ok) throw new Error("فشل رفع المستند");
      showToast("تم رفع المستند بنجاح", "success");
      loadEmployeeData(employee.id);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء رفع الملف", "error");
    } finally {
      setUploadingDoc(false);
    }
  };

  // ─── Requests ───
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSubmittingReq(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employee-requests`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ...newReq, user_id: employee.id }),
      });
      if (!res.ok) throw new Error("فشل تقديم الطلب");
      showToast("تم تقديم الطلب بنجاح", "success");
      setShowReqModal(false);
      setNewReq({ type: "leave_daily", with_salary: true, reason: "", details: {} });
      loadEmployeeData(employee.id);
    } catch (e: any) {
      showToast(e.message || "حدث خطأ", "error");
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleUpdateRequestStatus = async (reqId: number, status: "approved" | "rejected", notes?: string) => {
    if (!employee) return;
    try {
      const res = await fetch(`${API_BASE_URL}/employee-requests/${reqId}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_notes: notes }),
      });
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      showToast(status === "approved" ? "تمت الموافقة على الطلب بنجاح" : "تم رفض الطلب", "success");
      setNotesModal(null);
      setAdminNotes("");
      loadEmployeeData(employee.id);
    } catch (e: any) {
      showToast(e.message || "حدث خطأ", "error");
    }
  };

  // ─── Export Excel: Payroll Ledger ───
  const exportPayrollExcel = async () => {
    if (!employee) return;
    try {
      const columns = [
        { header: "الشهر / السنة", key: "period", width: 18 },
        { header: "الراتب الأساسي", key: "base", width: 16 },
        { header: "إجمالي البدلات", key: "allowances", width: 16 },
        { header: "المكافآت", key: "bonus", width: 14 },
        { header: "الخصومات والغرامات", key: "fines", width: 16 },
        { header: "الضمان والضرائب", key: "taxes", width: 16 },
        { header: "صافي الراتب", key: "net", width: 18 },
        { header: "حالة الصرف", key: "status", width: 14 },
        { header: "تاريخ الصرف", key: "paid_at", width: 16 },
      ];

      const data = payrolls.map((p) => ({
        period: `${String(p.month).padStart(2, '0')}/${p.year}`,
        base: Number(p.base_salary || 0).toFixed(2),
        allowances: (
          Number(p.housing_allowance || 0) +
          Number(p.transportation_allowance || 0) +
          Number(p.communication_allowance || 0) +
          Number(p.allowance_amount || 0)
        ).toFixed(2),
        bonus: Number(p.bonus_amount || 0).toFixed(2),
        fines: (Number(p.penalty_amount || 0) + Number(p.deduction_amount || 0)).toFixed(2),
        taxes: (Number(p.tax_amount || 0) + Number(p.social_security_amount || 0)).toFixed(2),
        net: Number(p.net_salary || 0).toFixed(2),
        status: p.status === "paid" ? "مدفوع" : "غير مدفوع",
        paid_at: p.paid_at || "—",
      }));

      await generatePremiumExcel({
        title: `كشف مرتبات الموظف: ${employee.name}`,
        subtitle: `الرقم الوظيفي: ${employee.job_number || "—"} | المسمى: ${employee.job_title || "—"}`,
        columns,
        data,
        fileName: `كشف_مرتبات_${employee.name.replace(/\s+/g, "_")}`,
      });
      showToast("تم تصدير كشف المرتبات بنجاح", "success");
    } catch {
      showToast("فشل تصدير ملف الإكسيل", "error");
    }
  };

  // ─── Export Excel: Issued Insurance Documents ───
  const exportInsuranceDocsExcel = async () => {
    if (!employee) return;
    try {
      const columns = [
        { header: "رقم الوثيقة", key: "doc_num", width: 20 },
        { header: "نوع التأمين", key: "type", width: 22 },
        { header: "اسم المؤمن له", key: "insured", width: 26 },
        { header: "تاريخ البدء", key: "start", width: 15 },
        { header: "تاريخ الانتهاء", key: "end", width: 15 },
        { header: "القسط الإجمالي", key: "premium", width: 16 },
        { header: "الحالة", key: "status", width: 14 },
        { header: "تاريخ الإصدار", key: "issued_at", width: 16 },
      ];

      const data = filteredDocs.map((d) => ({
        doc_num: d.document_number,
        type: d.insurance_type || "—",
        insured: d.insured_name || "—",
        start: fmtDate(d.start_date),
        end: fmtDate(d.end_date),
        premium: Number(d.premium || 0).toFixed(2),
        status: d.status === "canceled" ? "ملغية" : "سارية",
        issued_at: fmtDate(d.created_at),
      }));

      await generatePremiumExcel({
        title: `وثائق التأمين الصادرة بواسطة: ${employee.name}`,
        subtitle: `إجمالي الوثائق: ${filteredDocs.length} | المسمى الوظيفي: ${employee.job_title || "—"}`,
        columns,
        data,
        fileName: `وثائق_تأمين_${employee.name.replace(/\s+/g, "_")}`,
      });
      showToast("تم تصدير وثائق التأمين بنجاح", "success");
    } catch {
      showToast("فشل تصدير ملف الإكسيل", "error");
    }
  };

  // ─── Printing Handlers ───

  // 1. Official A4 Dossier
  const printEmployeeA4 = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) return;
    const photoSrc = u.profile_photo_url ? resolvePublicUrl(u.profile_photo_url) : "";
    const logoSrc = resolvePublicUrl("/img/logo.png");
    const printDate = new Date().toLocaleString("ar-LY");

    const totAllow =
      Number(u.housing_allowance || 0) +
      Number(u.transportation_allowance || 0) +
      Number(u.communication_allowance || 0) +
      Number(u.fixed_bonuses || 0);
    const totSal = Number(u.salary || 0) + totAllow;
    const totDed = Number(u.fixed_fines || 0);
    const netSal = totSal - totDed;

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>ملف بيانات موظف - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 12mm 15mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 11pt; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-bottom: 12px; }
        .logo-box img { height: 60px; object-fit: contain; }
        .title-box { text-align: center; flex: 1; }
        .title-box h1 { margin: 0; font-size: 17pt; color: #1e40af; font-weight: 800; }
        .title-box p { margin: 2px 0 0; font-size: 9pt; color: #64748b; }
        .dossier-card { display: flex; gap: 15px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; background: #f8fafc; margin-bottom: 12px; align-items: center; }
        .photo-box { width: 95px; height: 115px; border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .photo-box img { width: 100%; height: 100%; object-fit: cover; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1; font-size: 9.5pt; }
        .row-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0; }
        .row-item span.lbl { color: #64748b; font-weight: 600; }
        .row-item span.val { color: #0f172a; font-weight: 700; }
        .sec-title { background: #1e40af; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 10pt; font-weight: 800; margin: 10px 0 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; }
        th { background: #f1f5f9; color: #334155; font-weight: 700; }
        .undertake { border: 1px solid #94a3b8; border-radius: 6px; padding: 8px; font-size: 8.5pt; color: #334155; background: #fafafa; margin-top: 10px; line-height: 1.5; }
        .signatures { display: flex; justify-content: space-between; margin-top: 25px; padding: 0 20px; }
        .sig { text-align: center; width: 180px; }
        .sig-line { border-top: 1px solid #334155; margin-top: 40px; padding-top: 4px; font-weight: 700; font-size: 9pt; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <div class="logo-box"><img src="${logoSrc}" alt="Logo" onerror="this.src='/img/logo.png'" /></div>
          <div class="title-box">
            <h1>ملف واستمارة بيانات موظف</h1>
            <p>المدار الليبي للتأمين - الشؤون الإدارية والموارد البشرية</p>
          </div>
          <div style="font-size: 8pt; color: #64748b; text-align: left;">
            <div>كود: ${escapeHtml(u.job_number || `EMP-${u.id}`)}</div>
            <div>تاريخ الطباعة: ${printDate}</div>
          </div>
        </div>

        <div class="dossier-card">
          <div class="photo-box">
            ${photoSrc ? `<img src="${photoSrc}" alt="" />` : '<span style="color:#94a3b8;font-size:8pt">بلا صورة</span>'}
          </div>
          <div class="grid-2">
            <div class="row-item"><span class="lbl">الاسم الرباعي:</span><span class="val">${escapeHtml(u.full_name_quad || u.name)}</span></div>
            <div class="row-item"><span class="lbl">المسمى الوظيفي:</span><span class="val">${escapeHtml(u.job_title || "—")}</span></div>
            <div class="row-item"><span class="lbl">الرقم الوطني:</span><span class="val">${escapeHtml(u.national_id_number || "—")}</span></div>
            <div class="row-item"><span class="lbl">الرقم المالي:</span><span class="val">${escapeHtml(u.financial_number || "—")}</span></div>
            <div class="row-item"><span class="lbl">الهاتف الشخصي:</span><span class="val">${escapeHtml(u.personal_phone || "—")}</span></div>
            <div class="row-item"><span class="lbl">هاتف الطوارئ:</span><span class="val">${escapeHtml(u.guardian_phone || "—")}</span></div>
            <div class="row-item"><span class="lbl">الجنسية / الحالة:</span><span class="val">${escapeHtml(u.nationality || "ليبي")} / ${escapeHtml(u.social_status || "—")}</span></div>
            <div class="row-item"><span class="lbl">تاريخ التعيين:</span><span class="val">${fmtDate(u.start_date)}</span></div>
          </div>
        </div>

        <div class="sec-title">البيانات المالية والتعاقدية</div>
        <table>
          <thead>
            <tr>
              <th>الراتب الأساسي</th><th>إجمالي البدلات</th><th>المكافآت</th><th>الخصومات</th><th>صافي الراتب المستحق</th><th>مصرف الإيداع</th><th>رقم الحساب</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${money(u.salary)} د.ل</strong></td>
              <td>${money(totAllow)} د.ل</td>
              <td>${money(u.fixed_bonuses)} د.ل</td>
              <td>${money(totDed)} د.ل</td>
              <td><strong style="color: #16a34a">${money(netSal)} د.ل</strong></td>
              <td>${escapeHtml(u.bank_name || "—")}</td>
              <td>${escapeHtml(u.account_number || "—")}</td>
            </tr>
          </tbody>
        </table>

        <div class="sec-title">العهدة المستلمة والمقيدة بذمة الموظف (${custody.length} عناصر)</div>
        <table>
          <thead>
            <tr><th>اسم الصنف</th><th>النوع</th><th>الكمية</th><th>الأرقام التسلسلية</th><th>تاريخ الصرف</th><th>الحالة</th></tr>
          </thead>
          <tbody>
            ${
              custody.length > 0
                ? custody
                    .map(
                      (c) => `<tr>
                  <td>${escapeHtml(c.name || c.item?.name || "صنف عهدة")}</td>
                  <td>${c.inventory_type === "fixed" ? "أصل ثابت" : "مستهلك"}</td>
                  <td>${c.quantity} ${c.unit || ""}</td>
                  <td>${escapeHtml(c.serial_start || "—")}</td>
                  <td>${fmtDate(c.assigned_at)}</td>
                  <td>${escapeHtml(c.condition || "جيد")}</td>
                </tr>`
                    )
                    .join("")
                : '<tr><td colspan="6" style="text-align:center;color:#94a3b8">لا توجد عهدة نشطة مسجلة</td></tr>'
            }
          </tbody>
        </table>

        <div class="undertake">
          <strong>إقرار وتعهد:</strong> أقر أنا الموظف الموقع أدناه بصحة كافة البيانات الواردة في هذا الملف واستلامي لكافة الأصول والعهد المدرجة أعلاه، وأتعهد بالمحافظة عليها وإعادتها عند طلبها أو عند انتهاء علاقة العمل، والالتزام بالقوانين واللوائح المعمول بها بالشركة.
        </div>

        <div class="signatures">
          <div class="sig"><div class="sig-line">توقيع الموظف المعني</div></div>
          <div class="sig"><div class="sig-line">اعتماد الموارد البشرية</div></div>
          <div class="sig"><div class="sig-line">اعتماد الإدارة العامة</div></div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 2. Official Employee ID Card
  const printEmployeeIdCard = (u: Employee) => {
    const w = window.open("", "_blank", "width=520,height=420");
    if (!w) return;
    const num = escapeHtml(u.national_id_number || u.job_number || `EMP-${u.id}`);
    const name = escapeHtml(u.name);
    const job = escapeHtml(u.job_title || "موظف معتمد");
    const idPhotoSrc = u.profile_photo_url ? resolvePublicUrl(u.profile_photo_url) : "";
    const logoSrc = resolvePublicUrl("/img/logo.png");
    const bgSvg = `data:image/svg+xml;utf8,<svg viewBox="0 0 830 540" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M428 0 C328 150 528 350 428 540 L408 540 C508 350 308 150 408 0 Z" fill="%23139625"/></svg>`;

    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
      <title>بطاقة موظف - ${name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { margin: 0; size: 85.6mm 53.98mm; }
        html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; }
        body { font-family: Cairo, sans-serif; display: flex; align-items: center; justify-content: center; background: #e2e8f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { body { background: #ffffff !important; } .card { box-shadow: none !important; } }
        .card { width: 85.6mm; height: 53.98mm; box-sizing: border-box; background-color: #ffffff; background-image: url('${bgSvg}'); background-size: cover; background-position: center; border-radius: 8px; border: 3px solid #1e40af; overflow: hidden; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; }
        .right-section { width: 55%; height: 100%; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 4mm; box-sizing: border-box; color: #1e293b; z-index: 10; }
        .photo-circle { width: 23mm; height: 23mm; border-radius: 50%; border: 2px solid #139625; background: #ffffff; overflow: hidden; margin-bottom: 3mm; box-shadow: 0 4px 6px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; }
        .photo-circle img { width: 100%; height: 100%; object-fit: cover; }
        .id-data { width: 100%; display: flex; flex-direction: column; gap: 1.5mm; }
        .id-row { display: flex; gap: 2mm; font-size: 7.2pt; font-weight: 700; }
        .id-row span:first-child { color: #1e40af; }
        .left-section { width: 45%; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 3mm; box-sizing: border-box; color: #1e293b; z-index: 10; justify-content: space-between; }
        .badge-type { position: absolute; top: 3mm; left: 3mm; background: #1e40af; color: white; padding: 1mm 2.5mm; border-radius: 4px; font-size: 6.5pt; font-weight: 800; }
        .header-box { margin-top: 5mm; }
        .logo-wrapper img { height: 16mm; width: auto; object-fit: contain; }
        .employee-info { text-align: center; }
        .emp-name { font-size: 10pt; font-weight: 800; color: #1e40af; margin-bottom: 1mm; line-height: 1.2; }
        .emp-role { font-size: 7.5pt; font-weight: 700; color: #139625; }
        .footer-note { font-size: 5pt; color: #64748b; text-align: center; }
      </style></head>
      <body onload="window.print()">
        <div class="card">
          <div class="right-section">
            <div class="photo-circle">
              ${idPhotoSrc ? `<img src="${idPhotoSrc}" alt="" />` : '<span style="color:#94a3b8;font-size:7pt">بلا صورة</span>'}
            </div>
            <div class="id-data">
              <div class="id-row"><span>المعرف:</span> <span>${num}</span></div>
              <div class="id-row"><span>الإصدار:</span> <span>${new Date().toLocaleDateString("en-GB")}</span></div>
            </div>
          </div>
          <div class="left-section">
            <div class="badge-type">بطاقة موظف</div>
            <div class="header-box">
              <div class="logo-wrapper"><img src="${logoSrc}" alt="Logo" onerror="this.src='/img/logo.png'" /></div>
            </div>
            <div class="employee-info">
              <div class="emp-name">${name}</div>
              <div class="emp-role">${job}</div>
            </div>
            <div class="footer-note">إدارة الموارد البشرية - المدار الليبي للتأمين</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 3. Official Employment Contract
  const printEmployeeContract = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");
    const totAllow =
      Number(u.housing_allowance || 0) +
      Number(u.transportation_allowance || 0) +
      Number(u.communication_allowance || 0) +
      Number(u.fixed_bonuses || 0);

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>عقد عمل - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 10.5pt; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px; }
        .header img { height: 60px; }
        .title { text-align: center; flex: 1; }
        .title h1 { margin: 0; font-size: 18pt; color: #1e40af; font-weight: 800; }
        .title p { margin: 3px 0 0; font-size: 10pt; color: #64748b; }
        .parties-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 15px; font-size: 9.8pt; }
        .clause { margin-bottom: 12px; }
        .clause h3 { margin: 0 0 4px; font-size: 11pt; color: #1e40af; font-weight: 800; border-right: 3px solid #2563eb; padding-right: 8px; }
        .clause p { margin: 0; color: #334155; }
        .sigs { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 25px; }
        .sig-block { text-align: center; width: 200px; }
        .sig-line { border-top: 1px solid #334155; margin-top: 45px; padding-top: 5px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="Logo" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>عقـــــد عمـــــل</h1>
            <p>المدار الليبي للتأمين - الإدارة العامة</p>
          </div>
          <div style="font-size: 8.5pt; color: #64748b; text-align: left;">
            <div>رقم العقد: ${escapeHtml(u.job_number || `CNT-${u.id}`)}</div>
            <div>التاريخ: ${fmtDate(u.start_date || new Date().toISOString())}</div>
          </div>
        </div>

        <div class="parties-box">
          <p><strong>الطرف الأول:</strong> شركة المدار الليبي للتأمين (المشار إليها بالشركة).</p>
          <p><strong>الطرف الثاني:</strong> السيد/ة <strong>${escapeHtml(u.full_name_quad || u.name)}</strong>، رقم وطني: <strong>${escapeHtml(u.national_id_number || "—")}</strong>، الجنسية: <strong>${escapeHtml(u.nationality || "ليبي")}</strong>، العنوان: <strong>${escapeHtml(u.address || "—")}</strong>، الهاتف: <strong>${escapeHtml(u.personal_phone || "—")}</strong>.</p>
        </div>

        <div class="clause">
          <h3>البند الأول: موضوع العقد والمسمى الوظيفي</h3>
          <p>يوافق الطرف الثاني على العمل لدى الطرف الأول بمهنة: <strong>(${escapeHtml(u.job_title || "موظف")})</strong>، وتحت إشراف وتوجيه الإدارة المختصة بالشركة، ويلتزم بأداء المهام المنوطة به بأمانة وإخلاص.</p>
        </div>

        <div class="clause">
          <h3>البند الثاني: مدة العقد وفترة المباشرة</h3>
          <p>يبدأ سريان هذا العقد من تاريخ <strong>${fmtDate(u.start_date)}</strong>، ولمدة <strong>${escapeHtml(u.contract_duration || "سنة قابلة للتجديد")}</strong> ${u.end_date ? `وتنتهي في ${fmtDate(u.end_date)}` : ""}، وتخضع لـ 3 أشهر كفترة تجربة وفق اللوائح المنظمة.</p>
        </div>

        <div class="clause">
          <h3>البند الثالث: الراتب والبدلات المالية</h3>
          <p>يتقاضى الطرف الثاني لقاء عمله مرتباً شهرياً أساسياً قدره <strong>(${money(u.salary)} د.ل)</strong>، إضافة إلى البدلات والمكافآت المتفق عليها بإجمالي بدلات <strong>(${money(totAllow)} د.ل)</strong>، وتخضع للاستقطاعات الضريبية والضمانية المعتمدة نظاماً.</p>
        </div>

        <div class="clause">
          <h3>البند الرابع: مواعيد وساعات الدوام</h3>
          <p>تحدد ساعات العمل من الساعة <strong>${escapeHtml(u.working_hours_from || "08:30 صباحاً")}</strong> إلى <strong>${escapeHtml(u.working_hours_to || "03:30 مساءً")}</strong>، ومن يوم <strong>${escapeHtml(u.working_days_from || "الأحد")}</strong> إلى <strong>${escapeHtml(u.working_days_to || "الخميس")}</strong>.</p>
        </div>

        ${
          u.contract_conditions
            ? `<div class="clause">
            <h3>البند الخامس: شروط وأحكام إضافية</h3>
            <p>${escapeHtml(u.contract_conditions)}</p>
          </div>`
            : ""
        }

        <div class="sigs">
          <div class="sig-block">
            <strong>الطرف الأول (الشركة)</strong>
            <div class="sig-line">المدير العام / المفوض</div>
          </div>
          <div class="sig-block">
            <strong>الطرف الثاني (الموظف)</strong>
            <div class="sig-line">${escapeHtml(u.name)}</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 4. Official Work Commencement Order
  const printEmployeePermit = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=850");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>إذن مباشرة عمل - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 20mm 20mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 11pt; line-height: 1.8; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-bottom: 25px; }
        .header img { height: 65px; }
        .title { text-align: center; flex: 1; }
        .title h1 { margin: 0; font-size: 20pt; color: #ea580c; font-weight: 800; }
        .content { margin: 30px 0; font-size: 12pt; text-align: justify; }
        .meta-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11pt; }
        .meta-table td { padding: 8px 12px; border: 1px solid #cbd5e1; }
        .meta-table td.lbl { background: #f8fafc; font-weight: 700; width: 25%; color: #475569; }
        .sigs { display: flex; justify-content: space-between; margin-top: 50px; }
        .sig-block { text-align: center; width: 220px; }
        .sig-line { border-top: 1px solid #334155; margin-top: 50px; padding-top: 5px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="Logo" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>إذن مباشرة عمل</h1>
            <p>المدار الليبي للتأمين - إدارة الموارد البشرية والشؤون الإدارية</p>
          </div>
          <div style="font-size: 9pt; color: #64748b; text-align: left;">
            <div>إشارة: ${escapeHtml(u.job_number || `PER-${u.id}`)}</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <div class="content">
          <p>إلى السيد / <strong>مدير الإدارة المالية والموارد البشرية</strong>،،، المحترم</p>
          <p>تحية طيبة وبعد،،،</p>
          <p>نفيدكم علماً بأن الموظف الموضحة بياناته أدناه قد <strong>باشر مهام عمله رسمياً</strong> بالشركة اعتباراً من تاريخ <strong>${fmtDate(u.start_date || new Date().toISOString())}</strong>، بناءً على قرار التعيين والتعاقد المبرم معه.</p>

          <table class="meta-table">
            <tr><td class="lbl">اسم الموظف:</td><td><strong>${escapeHtml(u.full_name_quad || u.name)}</strong></td></tr>
            <tr><td class="lbl">الرقم الوطني:</td><td>${escapeHtml(u.national_id_number || "—")}</td></tr>
            <tr><td class="lbl">الرقم الوظيفي:</td><td><strong>${escapeHtml(u.job_number || `EMP-${u.id}`)}</strong></td></tr>
            <tr><td class="lbl">المسمى الوظيفي:</td><td><strong>${escapeHtml(u.job_title || "—")}</strong></td></tr>
            <tr><td class="lbl">تاريخ بدء العمل:</td><td><strong>${fmtDate(u.start_date)}</strong></td></tr>
            <tr><td class="lbl">نوع العقد:</td><td>${escapeHtml(u.contract_type || "موظف")}</td></tr>
          </table>

          <p>عليه، يرجى التكرم بالإحاطة واتخاذ ما يلزم من إجراءات إدارية ومالية لصرف مستحقاته وإدراجه بمنظومة الموظفين والعهد.</p>
          <p style="text-align: center; margin-top: 25px;"><strong>شاكرين لكم حسن تعاونكم الدائم،،،</strong></p>
        </div>

        <div class="sigs">
          <div class="sig-block">
            <strong>الموظف المعني</strong>
            <div class="sig-line">${escapeHtml(u.name)}</div>
          </div>
          <div class="sig-block">
            <strong>مدير الإدارة المختصة</strong>
            <div class="sig-line">الاعتماد والتوقيع</div>
          </div>
          <div class="sig-block">
            <strong>مدير الموارد البشرية</strong>
            <div class="sig-line">الاعتماد والتوقيع</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 5. Official Experience Certificate (شهادة خبرة رسمية)
  const printExperienceCertificate = (u: Employee) => {
    const w = window.open("", "_blank", "width=900,height=950");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`شركة المدار الليبي للتأمين\nشهادة خبرة معتمدة\nالموظف: ${u.name}\nالمسمى: ${u.job_title || "موظف"}\nتاريخ التعيين: ${u.start_date || "—"}`)}`;

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>شهادة خبرة - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @page { size: A4 landscape; margin: 15mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; }
        .cert-border { border: 12px double #1e3a8a; padding: 25px 35px; border-radius: 12px; background: #fafaf9; position: relative; min-height: 170mm; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header img { height: 75px; }
        .cert-title { text-align: center; margin: 20px 0 25px; }
        .cert-title h1 { font-size: 28pt; color: #1e3a8a; margin: 0; font-weight: 900; letter-spacing: -0.5px; }
        .cert-title span { font-size: 13pt; color: #b45309; font-weight: 700; }
        .cert-body { font-size: 13.5pt; line-height: 2.2; text-align: justify; margin: 25px 30px; color: #1e293b; }
        .cert-body strong { color: #1e3a8a; font-weight: 800; }
        .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding: 0 40px; }
        .qr-box img { width: 90px; height: 90px; border: 1px solid #cbd5e1; border-radius: 6px; }
        .sig-box { text-align: center; width: 220px; }
        .sig-line { border-top: 1.5px solid #1e293b; margin-top: 45px; padding-top: 5px; font-weight: 800; font-size: 11pt; }
      </style></head>
      <body onload="window.print()">
        <div class="cert-border">
          <div class="header">
            <img src="${logoSrc}" alt="Logo" onerror="this.src='/img/logo.png'" />
            <div style="text-align: left; font-size: 9pt; color: #64748b;">
              <div>الرقم المرجعي: EXP-${u.id}-${new Date().getFullYear()}</div>
              <div>التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
            </div>
          </div>

          <div class="cert-title">
            <h1>شـــهــادة خــبـــرة</h1>
            <span>CERTIFICATE OF EXPERIENCE</span>
          </div>

          <div class="cert-body">
            تشهد شركة <strong>المدار الليبي للتأمين</strong> بأن السيد / <strong>${escapeHtml(u.full_name_quad || u.name)}</strong>، حامل الرقم الوطني: <strong>(${escapeHtml(u.national_id_number || "—")})</strong>، قد عمل لدى الشركة بمهنة: <strong>(${escapeHtml(u.job_title || "موظف")})</strong>، اعتباراً من تاريخ <strong>${fmtDate(u.start_date)}</strong> ${u.end_date ? `وحتى تاريخ <strong>${fmtDate(u.end_date)}</strong>` : "ولا يزال على رأس عمله حتى تاريخه"}.
            <br />
            وخلال فترة عمله كان مثالاً للموظف المخلص والمجتهد والمتفاني في أداء واجباته الوظيفية، ومتحلياً بالأخلاق الفاضلة وحسن السيرة والسلوك والتعاون مع زملائه وإدارته.
            <br />
            وقد أُعطيت له هذه الشهادة بناءً على طلبه لتقديمها لمن يهمه الأمر دون أدنى مسؤولية على الشركة تجاه حقوق الغير.
          </div>

          <div class="cert-footer">
            <div class="qr-box">
              <img src="${qrUrl}" alt="QR" />
              <div style="font-size: 7pt; color: #64748b; text-align: center; margin-top: 2px;">رمز التحقق الإلكتروني</div>
            </div>
            <div class="sig-box">
              <strong>مدير إدارة الموارد البشرية</strong>
              <div class="sig-line">الاعتماد والختم الرسمي</div>
            </div>
            <div class="sig-box">
              <strong>المدير العام</strong>
              <div class="sig-line">المصادقة العامة</div>
            </div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 6. Official Clearance Certificate (شهادة إخلاء طرف ومخالصة عهدة)
  const printClearanceCertificate = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>شهادة إخلاء طرف - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 10.5pt; line-height: 1.7; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 20px; }
        .header img { height: 60px; }
        .title h1 { margin: 0; font-size: 19pt; color: #065f46; font-weight: 800; text-align: center; }
        .title p { margin: 2px 0 0; font-size: 9.5pt; color: #64748b; text-align: center; }
        .emp-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 10pt; }
        table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 9.5pt; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
        th { background: #f8fafc; color: #334155; font-weight: 700; }
        .clearance-statement { background: #fafafa; border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px; font-size: 9.5pt; margin: 16px 0; text-align: justify; }
        .sigs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
        .sig-item { text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
        .sig-item .line { border-top: 1px solid #334155; margin-top: 35px; padding-top: 4px; font-weight: 700; font-size: 9pt; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>شهادة إخلاء طرف وبراءة ذمة</h1>
            <p>المدار الليبي للتأمين - الشؤون الإدارية والموارد البشرية</p>
          </div>
          <div style="font-size: 8.5pt; color: #64748b; text-align: left;">
            <div>رقم الإخلاء: CLR-${u.id}-${new Date().getFullYear()}</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <div class="emp-box">
          نفيدكم بأن الموظف: <strong>${escapeHtml(u.full_name_quad || u.name)}</strong>، الرقم الوظيفي: <strong>(${escapeHtml(u.job_number || `EMP-${u.id}`)})</strong>، المسمى: <strong>(${escapeHtml(u.job_title || "موظف")})</strong>، الرقم الوطني: <strong>(${escapeHtml(u.national_id_number || "—")})</strong>، قد أنهى إجراءات إخلاء الطرف وبراءة الذمة من جميع إدارات الشركة.
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30%">الإدارة / القسم</th>
              <th style="width: 45%">موقف براءة الذمة</th>
              <th style="width: 25%">التوقيع والختم</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>إدارة المخازن والعهدة</strong></td>
              <td>تم تسليم كافة العهد والأجهزة والأصول بالكامل ولا توجد عهد معلقة.</td>
              <td>تم الاستلام وتبرئة الذمة</td>
            </tr>
            <tr>
              <td><strong>الإدارة المالية والحسابات</strong></td>
              <td>تمت تسوية كافة السلف والمستحقات والديون وإغلاق حسابه المالي.</td>
              <td>تمت التسوية المالية</td>
            </tr>
            <tr>
              <td><strong>إدارة تقنية المعلومات</strong></td>
              <td>تم سحب وإيقاف صلاحيات الحسابات والبريد الإلكتروني والأنظمة.</td>
              <td>تم إيقاف الوصول</td>
            </tr>
            <tr>
              <td><strong>إدارة الموارد البشرية</strong></td>
              <td>تم استلام البطاقة الوظيفية ومطابقة ملف الخدمة واستكمال مسيراته.</td>
              <td>تم اعتماد الملف</td>
            </tr>
          </tbody>
        </table>

        <div class="clearance-statement">
          <strong>إقرار نهائي:</strong> بناءً على إفادات الإدارات الموضحة أعلاه، تعتبر ذمة الموظف المذكور بريئة تماماً من أية التزامات عينية أو نقدية أو عهد خاصة بالشركة حتى تاريخ هذا المستند.
        </div>

        <div class="sigs-grid">
          <div class="sig-item">
            <strong>الموظف المعني</strong>
            <div class="line">${escapeHtml(u.name)}</div>
          </div>
          <div class="sig-item">
            <strong>اعتماد مدير الموارد البشرية</strong>
            <div class="line">التوقيع والختم</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 7. Salary Verification Certificate (شهادة إثبات مرتب إلى من يهمه الأمر)
  const printSalaryCertificate = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=900");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");
    const totAllow =
      Number(u.housing_allowance || 0) +
      Number(u.transportation_allowance || 0) +
      Number(u.communication_allowance || 0) +
      Number(u.fixed_bonuses || 0);
    const gross = Number(u.salary || 0) + totAllow;
    const ded = Number(u.fixed_fines || 0);
    const net = gross - ded;

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>شهادة مرتب - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 11pt; line-height: 1.8; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 30px; }
        .header img { height: 65px; }
        .title h1 { margin: 0; font-size: 20pt; color: #1e40af; font-weight: 800; text-align: center; }
        .content { margin: 30px 0; font-size: 12pt; text-align: justify; }
        .salary-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11pt; }
        .salary-table td, .salary-table th { padding: 8px 12px; border: 1px solid #cbd5e1; }
        .salary-table th { background: #f8fafc; font-weight: 700; text-align: right; }
        .sigs { display: flex; justify-content: space-between; margin-top: 60px; }
        .sig-block { text-align: center; width: 220px; }
        .sig-line { border-top: 1px solid #334155; margin-top: 45px; padding-top: 5px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>شـهـادة إثـبــات مـرتـب</h1>
            <div style="font-size: 10pt; color: #64748b; text-align: center;">إلى مــن يـهـمــه الأمــــر</div>
          </div>
          <div style="font-size: 8.5pt; color: #64748b; text-align: left;">
            <div>الرقم: SAL-${u.id}-${new Date().getFullYear()}</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <div class="content">
          <p>تحية طيبة وبعد،،،</p>
          <p>تشهد شركة <strong>المدار الليبي للتأمين</strong> بأن السيد / <strong>${escapeHtml(u.full_name_quad || u.name)}</strong>، الرقم الوطني: <strong>(${escapeHtml(u.national_id_number || "—")})</strong>، الرقم الوظيفي: <strong>(${escapeHtml(u.job_number || `EMP-${u.id}`)})</strong>، يعمل لدى الشركة بمهنة: <strong>(${escapeHtml(u.job_title || "موظف")})</strong> اعتباراً من تاريخ <strong>${fmtDate(u.start_date)}</strong>، وما زال مستمراً في عمله حتى تاريخه.</p>

          <p>ويتقاضى بموجب عقد عمله مرتباً شهرياً مفصلاً كالتالي:</p>

          <table class="salary-table">
            <tr><th>الراتب الأساسي الشهري</th><td><strong>${money(u.salary)} د.ل</strong></td></tr>
            <tr><th>إجمالي البدلات والمكافآت الشهرية</th><td>${money(totAllow)} د.ل</td></tr>
            <tr><th>إجمالي الراتب الشامل</th><td><strong>${money(gross)} د.ل</strong></td></tr>
            <tr><th>صافي الراتب المستحق للصرف شهرياً</th><td><strong style="color: #15803d; font-size: 12pt;">${money(net)} د.ل</strong></td></tr>
            <tr><th>المصرف ورقم الحساب المحول إليه</th><td>${escapeHtml(u.bank_name || "—")} - حساب: ${escapeHtml(u.account_number || "—")}</td></tr>
          </table>

          <p>وقد أُعطيت له هذه الشهادة بناءً على طلبه لتقديمها لمن يهمه الأمر دون أدنى مسؤولية مالية أو قانونية على الشركة تجاه التزاماته مع الغير.</p>
        </div>

        <div class="sigs">
          <div class="sig-block">
            <strong>مدير إدارة الشؤون المالية</strong>
            <div class="sig-line">الاعتماد والتوقيع</div>
          </div>
          <div class="sig-block">
            <strong>مدير إدارة الموارد البشرية</strong>
            <div class="sig-line">الختم والاعتماد الرسمي</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 8. Official Letter of Commendation / Appreciation (خطاب شكر وتقدير)
  const printAppreciationLetter = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=900");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>خطاب شكر وتقدير - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; }
        .frame { border: 4px double #b45309; padding: 30px; border-radius: 12px; background: #fffbeb; min-height: 230mm; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .header img { height: 70px; }
        .title { text-align: center; margin: 25px 0; }
        .title h1 { margin: 0; font-size: 26pt; color: #b45309; font-weight: 900; }
        .body-text { font-size: 13pt; line-height: 2.3; text-align: justify; margin: 30px 20px; color: #1e293b; }
        .body-text strong { color: #1e3a8a; }
        .sigs { display: flex; justify-content: space-around; margin-top: 60px; }
        .sig { text-align: center; width: 220px; }
        .sig-line { border-top: 1.5px solid #78350f; margin-top: 50px; padding-top: 6px; font-weight: 800; font-size: 11pt; color: #78350f; }
      </style></head>
      <body onload="window.print()">
        <div class="frame">
          <div class="header">
            <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
            <div style="font-size: 9pt; color: #78350f;">التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>

          <div class="title">
            <h1>شـكـــر وتـقــــديـــر</h1>
            <div style="font-size: 12pt; color: #92400e; font-weight: 700; margin-top: 4px;">LETTER OF COMMENDATION</div>
          </div>

          <div class="body-text">
            يَسُر مجلس الإدارة والإدارة العامة لشركة <strong>المدار الليبي للتأمين</strong> أن تتقدم بأسمى آيات الشكر والتقدير والامتنان إلى الزميل العزيز:
            <br />
            <div style="text-align: center; margin: 15px 0; font-size: 18pt; font-weight: 900; color: #1e3a8a;">
              الأستاذ / ${escapeHtml(u.full_name_quad || u.name)}
            </div>
            <strong>(${escapeHtml(u.job_title || "موظف متميز")})</strong>
            <br />
            وذلك تقديراً لجهوده المتميزة والملموسة، وتفانيه وإخلاصه العالي في أداء واجباته المهنية، ومساهمته الفاعلة في تحقيق أهداف الشركة ورفع جودة الخدمات التأمينية المقدمة لعملائنا الكرام.
            <br />
            متمنين له دوام التوفيق والنجاح ومزيداً من البذل والعطاء في مسيرته المهنية.
          </div>

          <div class="sigs">
            <div class="sig">
              <strong>مدير عام الشركة</strong>
              <div class="sig-line">الاعتماد والتوقيع</div>
            </div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 9. End of Service Final Settlement Print (استمارة تصفية مستحقات ومخالصة نهاية خدمة)
  const printEndOfServiceSettlement = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    const { years, months, days, gratuity, leaveCash, bonus, deductions, netFinal } = calculateSettlement(u);

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>تصفية مستحقات نهاية خدمة - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 10.5pt; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-bottom: 16px; }
        .header img { height: 60px; }
        .title h1 { margin: 0; font-size: 18pt; color: #b45309; font-weight: 800; text-align: center; }
        .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; margin-bottom: 15px; font-size: 9.5pt; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9.5pt; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; }
        th { background: #f8fafc; font-weight: 700; }
        .total-box { display: flex; justify-content: space-between; background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 10px 15px; font-size: 12pt; font-weight: 800; color: #065f46; margin: 15px 0; }
        .release-box { background: #fafafa; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 8.5pt; line-height: 1.5; color: #334155; }
        .sigs { display: flex; justify-content: space-between; margin-top: 30px; }
        .sig { text-align: center; width: 170px; font-size: 9pt; }
        .sig-line { border-top: 1px solid #334155; margin-top: 35px; padding-top: 4px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>استمارة تصفية مستحقات ومخالصة نهاية خدمة</h1>
            <div style="font-size: 9pt; color: #64748b; text-align: center;">المدار الليبي للتأمين - الإدارة المالية والموارد البشرية</div>
          </div>
          <div style="font-size: 8pt; color: #64748b; text-align: left;">
            <div>الرقم: EOS-${u.id}-${new Date().getFullYear()}</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <div class="grid-info">
          <div>اسم الموظف: <strong>${escapeHtml(u.full_name_quad || u.name)}</strong></div>
          <div>الرقم الوظيفي: <strong>${escapeHtml(u.job_number || `EMP-${u.id}`)}</strong></div>
          <div>المسمى الوظيفي: <strong>${escapeHtml(u.job_title || "—")}</strong></div>
          <div>الرقم الوطني: <strong>${escapeHtml(u.national_id_number || "—")}</strong></div>
          <div>تاريخ مباشرة العمل: <strong>${fmtDate(u.start_date)}</strong></div>
          <div>تاريخ انتهاء الخدمة: <strong>${fmtDate(settlementTerminationDate)}</strong></div>
          <div style="grid-column: span 2; color: #b45309; font-weight: 800;">
            مدة الخدمة الفعلية المحسوبة: ${years} سنة و ${months} شهر و ${days} يوم.
          </div>
        </div>

        <table>
          <thead>
            <tr><th>بيان المستحقات والاستقطاعات</th><th>طريقة الاحتساب</th><th>المبلغ (د.ل)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>مكافأة نهاية الخدمة المقررة</strong></td>
              <td>وفقاً لمدة الخدمة والأجر الشامل (${money(u.salary)} د.ل)</td>
              <td style="color: #15803d"><strong>${money(gratuity)}</strong></td>
            </tr>
            <tr>
              <td>بدل رصيد إجازات سنوية مستحقة</td>
              <td>مقابل ${settlementLeaveDays} يوم إجازة متبقية</td>
              <td style="color: #15803d">${money(leaveCash)}</td>
            </tr>
            ${
              bonus > 0
                ? `<tr><td>مكافآت إضافية أو تعويضات استثنائية</td><td>اعتماد الإدارة</td><td style="color: #15803d">${money(bonus)}</td></tr>`
                : ""
            }
            ${
              deductions > 0
                ? `<tr><td>خصومات أو سلف أو التزامات متبقية</td><td>استقطاع تسوية</td><td style="color: #b91c1c">-${money(deductions)}</td></tr>`
                : ""
            }
          </tbody>
        </table>

        <div class="total-box">
          <span>إجمالي المبلغ الصافي المستحق للصرف:</span>
          <span>${money(netFinal)} دينار ليبي</span>
        </div>

        <div class="release-box">
          <strong>إقرار ومخالصة نهائية:</strong> أقر أنا الموظف الموقع أدناه بأنني قد استلمت كامل مستحقاتي المالية عن فترة عملي بالشركة والموضحة أعلاه، وبذلك أبرئ ذمة شركة المدار الليبي للتأمين إبراءً شاملاً ومانعاً ونهائياً من أي حق أو مطالبة حالية أو مستقبلية، ولا يحق لي الرجوع بأي دعوى أو مطالبة.
        </div>

        <div class="sigs">
          <div class="sig">
            <strong>الموظف المعني</strong>
            <div class="sig-line">${escapeHtml(u.name)}</div>
          </div>
          <div class="sig">
            <strong>رئيس قسم الرواتب</strong>
            <div class="sig-line">المراجعة والتدقيق</div>
          </div>
          <div class="sig">
            <strong>مدير الموارد البشرية</strong>
            <div class="sig-line">الاعتماد الإداري</div>
          </div>
          <div class="sig">
            <strong>المدير العام</strong>
            <div class="sig-line">المصادقة والصرف</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 10. Print Monthly Payslip / Official Voucher
  const printPaySlip = (u: Employee, p: Payroll) => {
    const w = window.open("", "_blank", "width=850,height=900");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    const base = Number(p.base_salary || 0);
    const housing = Number(p.housing_allowance || 0);
    const transport = Number(p.transportation_allowance || 0);
    const communication = Number(p.communication_allowance || 0);
    const bonus = Number(p.bonus_amount || 0);
    const other = Number(p.other_additions || p.allowance_amount || 0);
    const totalEarnings = base + housing + transport + communication + bonus + other;

    const penalty = Number(p.penalty_amount || 0);
    const deduction = Number(p.deduction_amount || 0);
    const advance = Number(p.advance_amount || 0);
    const tax = Number(p.tax_amount || 0);
    const ss = Number(p.social_security_amount || 0);
    const solidarity = Number((p as any).solidarity_amount || 0);
    const totalDeductions = penalty + deduction + advance + tax + ss + solidarity;

    const net = Number(p.net_salary || (totalEarnings - totalDeductions));
    const voucherNum = p.voucher_number || `SAL-${p.year}${String(p.month).padStart(2, "0")}-${u.id}`;
    const printDate = new Date().toLocaleString("ar-LY");
    const payDate = p.paid_at ? new Date(p.paid_at).toLocaleDateString("ar-LY") : "—";
    const statusText = p.status === "paid" ? "تم الصرف (مسدد)" : "قيد الانتظار (غير مسدد)";

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>سند صرف وقسيمة راتب - ${escapeHtml(u.name)} (${String(p.month).padStart(2, '0')}/${p.year})</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 15px; font-size: 10pt; line-height: 1.5; background: #fff; }
        .voucher-card { border: 2px solid #0f766e; border-radius: 12px; padding: 20px; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
        .header-title h1 { margin: 0; font-size: 16pt; color: #0f766e; font-weight: 900; }
        .header-title p { margin: 2px 0 0; font-size: 9pt; color: #64748b; font-weight: 600; }
        .header-logo { max-height: 55px; }
        .voucher-badge { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 11pt; text-align: center; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 18px; font-size: 9pt; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-label { color: #64748b; font-size: 8pt; font-weight: 700; margin-bottom: 2px; }
        .meta-val { color: #0f172a; font-weight: 800; font-size: 9.5pt; }
        .tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
        .fin-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        .fin-table th { padding: 8px 10px; text-align: right; font-weight: 800; font-size: 9.5pt; }
        .fin-table td { padding: 6px 10px; border-bottom: 1px dashed #cbd5e1; font-weight: 600; }
        .fin-table tr:last-child td { border-bottom: none; }
        .th-green { background: #dcfce7; color: #166534; border-bottom: 2px solid #22c55e; }
        .th-red { background: #fee2e2; color: #991b1b; border-bottom: 2px solid #ef4444; }
        .total-subrow { background: #f1f5f9; font-weight: 800; }
        .net-banner { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #064e3b, #047857); color: #fff; padding: 14px 20px; border-radius: 10px; margin-bottom: 24px; box-shadow: 0 4px 10px rgba(4,120,87,0.25); }
        .net-label { font-size: 12pt; font-weight: 800; }
        .net-amount { font-size: 18pt; font-weight: 900; color: #a7f3d0; letter-spacing: 0.5px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-top: 30px; font-size: 9pt; }
        .sig-box { display: flex; flex-direction: column; justify-content: space-between; height: 75px; }
        .sig-title { font-weight: 800; color: #334155; }
        .sig-line { border-bottom: 1px dotted #64748b; margin-top: auto; }
        .footer-note { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        .no-print-bar { text-align: center; margin-bottom: 15px; }
        .btn-print { background: #0f766e; color: #fff; border: none; padding: 8px 24px; border-radius: 6px; font-weight: 800; cursor: pointer; font-family: 'Cairo', sans-serif; font-size: 11pt; }
        @media print { .no-print-bar { display: none !important; } }
      </style>
      </head>
      <body onload="window.print()">
        <div class="no-print-bar">
          <button class="btn-print" onclick="window.print()">🖨️ طباعة إيصال الراتب</button>
        </div>
        <div class="voucher-card">
          <div class="header">
            <div class="header-title">
              <h1>شركة المدار الليبي للتأمين</h1>
              <p>الإدارة العامة للشؤون المالية والإدارية - وحدة الرواتب والأجور</p>
            </div>
            <img src="${logoSrc}" class="header-logo" alt="Logo" onerror="this.src='/img/logo.png'" />
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div class="voucher-badge">
              سند صرف وقسيمة راتب شهر (${String(p.month).padStart(2, '0')} / ${p.year})
            </div>
            <div style="font-size: 8.5pt; color: #475569; font-weight: 700;">
              رقم القيد/الإيصال: <span style="font-family: monospace; font-size: 9.5pt; color: #0f766e;">${escapeHtml(voucherNum)}</span>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">اسم الموظف</span>
              <span class="meta-val">${escapeHtml(u.name)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">الرقم الوظيفي / المالي</span>
              <span class="meta-val">${escapeHtml(u.job_number || u.financial_number || `EMP-${u.id}`)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">المسمى الوظيفي</span>
              <span class="meta-val">${escapeHtml(u.job_title || "—")}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">تاريخ التعيين</span>
              <span class="meta-val">${fmtDate(u.start_date)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">طريقة وتاريخ الصرف</span>
              <span class="meta-val">${escapeHtml(p.delivery_method || "نقدي")} (${payDate})</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">حالة الصرف</span>
              <span class="meta-val" style="color: ${p.status === 'paid' ? '#15803d' : '#b45309'}">${statusText}</span>
            </div>
            ${u.bank_name ? `
            <div class="meta-item" style="grid-column: span 3;">
              <span class="meta-label">بيانات الحساب المصرفي</span>
              <span class="meta-val">${escapeHtml(u.bank_name)} ${u.bank_branch ? `(${escapeHtml(u.bank_branch)})` : ''} - رقم الحساب: <span style="font-family:monospace">${escapeHtml(u.account_number || "—")}</span></span>
            </div>` : ''}
          </div>

          <div class="tables-grid">
            <!-- الاستحقاقات -->
            <div style="border: 1px solid #bbf7d0; border-radius: 8px; overflow: hidden;">
              <table class="fin-table">
                <thead>
                  <tr class="th-green"><th>الاستحقاقات والإضافات</th><th style="text-align:left">المبلغ (د.ل)</th></tr>
                </thead>
                <tbody>
                  <tr><td>الراتب الأساسي</td><td style="text-align:left">${money(base)}</td></tr>
                  ${housing > 0 ? `<tr><td>بدل سكن</td><td style="text-align:left">${money(housing)}</td></tr>` : ''}
                  ${transport > 0 ? `<tr><td>بدل مواصلات</td><td style="text-align:left">${money(transport)}</td></tr>` : ''}
                  ${communication > 0 ? `<tr><td>بدل اتصالات</td><td style="text-align:left">${money(communication)}</td></tr>` : ''}
                  ${bonus > 0 ? `<tr><td>مكافآت وحوافز</td><td style="text-align:left">${money(bonus)}</td></tr>` : ''}
                  ${other > 0 ? `<tr><td>إضافات وبدلات أخرى</td><td style="text-align:left">${money(other)}</td></tr>` : ''}
                  <tr class="total-subrow">
                    <td><strong>إجمالي الاستحقاقات</strong></td>
                    <td style="text-align:left; color:#166534"><strong>${money(totalEarnings)} د.ل</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- الاستقطاعات -->
            <div style="border: 1px solid #fecaca; border-radius: 8px; overflow: hidden;">
              <table class="fin-table">
                <thead>
                  <tr class="th-red"><th>الاستقطاعات والخصومات</th><th style="text-align:left">المبلغ (د.ل)</th></tr>
                </thead>
                <tbody>
                  ${tax > 0 ? `<tr><td>ضريبة الدخل</td><td style="text-align:left; color:#ef4444">-${money(tax)}</td></tr>` : ''}
                  ${ss > 0 ? `<tr><td>الضمان الاجتماعي</td><td style="text-align:left; color:#ef4444">-${money(ss)}</td></tr>` : ''}
                  ${solidarity > 0 ? `<tr><td>التضامن الاجتماعي</td><td style="text-align:left; color:#ef4444">-${money(solidarity)}</td></tr>` : ''}
                  ${deduction > 0 ? `<tr><td>خصومات وجزاءات</td><td style="text-align:left; color:#ef4444">-${money(deduction)}</td></tr>` : ''}
                  ${advance > 0 ? `<tr><td>سلف على المرتب</td><td style="text-align:left; color:#ef4444">-${money(advance)}</td></tr>` : ''}
                  ${penalty > 0 ? `<tr><td>غرامات</td><td style="text-align:left; color:#ef4444">-${money(penalty)}</td></tr>` : ''}
                  ${totalDeductions === 0 ? `<tr><td colspan="2" style="text-align:center; color:#94a3b8">لا توجد استقطاعات مسجلة</td></tr>` : ''}
                  <tr class="total-subrow">
                    <td><strong>إجمالي الاستقطاعات</strong></td>
                    <td style="text-align:left; color:#991b1b"><strong>-${money(totalDeductions)} د.ل</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="net-banner">
            <div>
              <div class="net-label">صافي الراتب المستحق للصرف:</div>
              <div style="font-size: 8.5pt; opacity: 0.85; margin-top: 2px;">
                ${p.notes ? `ملاحظات: ${escapeHtml(p.notes)}` : 'تم احتساب كافة الاستحقاقات والخصومات وفقاً للوائح الشركة.'}
              </div>
            </div>
            <div class="net-amount">${money(net)} د.ل</div>
          </div>

          <div class="signatures">
            <div class="sig-box">
              <span class="sig-title">توقيع الموظف بالاستلام</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <span class="sig-title">أمين الخزينة / الحسابات</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <span class="sig-title">اعتماد الشؤون المالية والإدارية</span>
              <div class="sig-line"></div>
            </div>
          </div>

          <div class="footer-note">
            تم استخراج هذا الإيصال آلياً من منظومة المدار الليبي للتأمين بتاريخ: ${printDate}
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 11. Print Official Performance Appraisal Sheet A4
  const printPerformanceAppraisal = (u: Employee, evalData: any) => {
    const w = window.open("", "_blank", "width=850,height=1000");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>استمارة تقييم الأداء السنوي - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 10pt; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #d97706; padding-bottom: 12px; margin-bottom: 16px; }
        .header img { height: 60px; }
        .title h1 { margin: 0; font-size: 18pt; color: #b45309; text-align: center; }
        .emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 9.5pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9.5pt; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right; }
        th { background: #f8fafc; font-weight: 700; }
        .score-banner { display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 12px 18px; margin-bottom: 16px; }
        .score-val { font-size: 20pt; font-weight: 900; color: #047857; }
        .section-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 14px; background: #f8fafc; }
        .section-title { font-weight: 800; color: #1e293b; margin-bottom: 6px; font-size: 10.5pt; }
        .sigs { display: flex; justify-content: space-between; margin-top: 35px; }
        .sig { text-align: center; width: 170px; font-size: 9pt; }
        .sig-line { border-top: 1px solid #334155; margin-top: 35px; padding-top: 4px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>استمارة تقييم الأداء الوظيفي السنوي</h1>
            <div style="font-size: 9pt; color: #64748b; text-align: center;">إدارة الموارد البشرية والتطوير الإداري - شركة المدار الليبي للتأمين</div>
          </div>
          <div style="font-size: 8pt; color: #64748b; text-align: left;">
            <div>الفترة: ${evalData.period || "2025/2026"}</div>
            <div>التاريخ: ${evalData.date || new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <div class="emp-grid">
          <div>اسم الموظف: <strong>${escapeHtml(u.full_name_quad || u.name)}</strong></div>
          <div>الرقم الوظيفي: <strong>${escapeHtml(u.job_number || `EMP-${u.id}`)}</strong></div>
          <div>المسمى الوظيفي: <strong>${escapeHtml(u.job_title || "موظف")}</strong></div>
          <div>الرقم الوطني: <strong>${escapeHtml(u.national_id_number || "—")}</strong></div>
          <div>تاريخ التعيين: <strong>${fmtDate(u.start_date)}</strong></div>
          <div>جهة التقييم: <strong>${escapeHtml(evalData.evaluator || "لجنة تقييم الأداء")}</strong></div>
        </div>

        <table>
          <thead>
            <tr><th>م</th><th>معيار التقييم ومؤشر الأداء (KPI)</th><th>الوزن النسبي</th><th>الدرجة المستحقة (من 100)</th><th>مستوى الإنجاز</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>الالتزام والانضباط بمواعيد وساعات العمل</strong></td>
              <td>20%</td>
              <td style="color:#047857; font-weight:bold;">${evalData.breakdown?.punctuality || 95}%</td>
              <td>ممتاز مرتفع</td>
            </tr>
            <tr>
              <td>2</td>
              <td><strong>دقة وجودة وسرعة إصدار وثائق التأمين</strong></td>
              <td>25%</td>
              <td style="color:#047857; font-weight:bold;">${evalData.breakdown?.accuracy || 98}%</td>
              <td>فائق التميز</td>
            </tr>
            <tr>
              <td>3</td>
              <td><strong>إنجاز المهام والتكليفات والتقارير الإدارية</strong></td>
              <td>20%</td>
              <td style="color:#047857; font-weight:bold;">${evalData.breakdown?.tasks || 92}%</td>
              <td>ممتاز</td>
            </tr>
            <tr>
              <td>4</td>
              <td><strong>حسن التعامل مع العملاء وروح العمل الجماعي</strong></td>
              <td>20%</td>
              <td style="color:#047857; font-weight:bold;">${evalData.breakdown?.teamwork || 96}%</td>
              <td>ممتاز مرتفع</td>
            </tr>
            <tr>
              <td>5</td>
              <td><strong>المحافظة على العهد والأصول وممتلكات المنظومة</strong></td>
              <td>15%</td>
              <td style="color:#047857; font-weight:bold;">${evalData.breakdown?.custody || 100}%</td>
              <td>مثالي 100%</td>
            </tr>
          </tbody>
        </table>

        <div class="score-banner">
          <div>
            <div style="font-weight: 800; font-size: 11pt; color: #065f46">المحصلة النهائية للتقييم:</div>
            <div style="font-size: 9.5pt; color: #047857">التقدير العام: <strong>${evalData.grade || "ممتاز مرتفع"}</strong></div>
          </div>
          <div class="score-val">${evalData.score || 96.5}%</div>
        </div>

        <div class="section-box">
          <div class="section-title"><i class="fa-solid fa-comment-dots"></i> الملاحظات ونقاط القوة:</div>
          <div>${escapeHtml(evalData.notes || "أداء متميز وتفانٍ واضح في العمل وحرص دائم على مصلحة الشركة والارتقاء بمستوى الخدمة.")}</div>
        </div>

        <div class="section-box">
          <div class="section-title"><i class="fa-solid fa-trophy"></i> توصية لجنة الموارد البشرية والمدير المباشر:</div>
          <div style="font-weight: bold; color: #b45309;">${escapeHtml(evalData.recommendation || "صرف مكافأة تميز وظيفي للموظف ومنحه كتاب شكر وتقدير.")}</div>
        </div>

        <div class="sigs">
          <div class="sig">
            <strong>المسؤول المباشر</strong>
            <div class="sig-line">التوقيع والاعتماد</div>
          </div>
          <div class="sig">
            <strong>مدير الموارد البشرية</strong>
            <div class="sig-line">المصادقة الإدارية</div>
          </div>
          <div class="sig">
            <strong>المدير العام</strong>
            <div class="sig-line">الاعتماد النهائي والختم</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 12. Print Monthly Attendance Sheet A4
  const printAttendanceSheet = (u: Employee, monthStr: string, records: any[]) => {
    const w = window.open("", "_blank", "width=850,height=1000");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>كشف الدوام والحضور الشهري - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 9.5pt; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 14px; }
        .header img { height: 50px; }
        .title h1 { margin: 0; font-size: 16pt; color: #0369a1; text-align: center; }
        .emp-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px; margin-bottom: 14px; font-size: 9pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5pt; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; }
        th { background: #f8fafc; font-weight: 700; }
        .summary-boxes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
        .s-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; }
        .s-box strong { font-size: 12pt; display: block; color: #0284c7; margin-top: 2px; }
        .sigs { display: flex; justify-content: space-between; margin-top: 30px; }
        .sig { text-align: center; width: 180px; font-size: 9pt; }
        .sig-line { border-top: 1px solid #334155; margin-top: 35px; padding-top: 4px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>سجل الحضور والانصراف والدوام الشهري</h1>
            <div style="font-size: 9pt; color: #64748b; text-align: center;">شركة المدار الليبي للتأمين - الشؤون الإدارية</div>
          </div>
          <div style="font-size: 8pt; color: #64748b; text-align: left;">
            <div>الشهر: ${monthStr}</div>
            <div>تاريخ الاستخراج: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <div class="emp-grid">
          <div>الموظف: <strong>${escapeHtml(u.name)}</strong></div>
          <div>الرقم الوظيفي: <strong>${escapeHtml(u.job_number || `EMP-${u.id}`)}</strong></div>
          <div>المسمى الوظيفي: <strong>${escapeHtml(u.job_title || "موظف")}</strong></div>
          <div>مواعيد الدوام: <strong>${u.working_hours_from || "08:30"} إلى ${u.working_hours_to || "16:30"}</strong></div>
          <div>أيام العمل: <strong>${u.working_days_from || "الأحد"} - ${u.working_days_to || "الخميس"}</strong></div>
          <div>حالة الحساب: <strong>${u.is_active !== false ? "على رأس العمل" : "موقوف"}</strong></div>
        </div>

        <div class="summary-boxes">
          <div class="s-box"><span>أيام الحضور الفعلي</span><strong style="color:#059669">${records.length} يوم</strong></div>
          <div class="s-box"><span>ساعات العمل الإضافي</span><strong style="color:#2563eb">+14.5 س</strong></div>
          <div class="s-box"><span>إجمالي التأخير</span><strong style="color:#d97706">15 د</strong></div>
          <div class="s-box"><span>رصيد الإجازات المتبقي</span><strong style="color:#7c3aed">18 يوم</strong></div>
        </div>

        <table>
          <thead>
            <tr><th>م</th><th>اليوم</th><th>التاريخ</th><th>بصمة الدخول</th><th>بصمة الخروج</th><th>إجمالي الساعات</th><th>إضافي</th><th>الحالة</th><th>ملاحظات المشرف</th></tr>
          </thead>
          <tbody>
            ${records.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.day}</td>
                <td>${r.date}</td>
                <td>${r.checkIn}</td>
                <td>${r.checkOut}</td>
                <td>${r.hours} س</td>
                <td>${r.overtime > 0 ? `+${r.overtime} س` : "—"}</td>
                <td style="color:${r.status === 'present' ? '#059669' : r.status === 'late' ? '#d97706' : '#dc2626'}; font-weight:bold;">
                  ${r.status === 'present' ? 'حاضر' : r.status === 'late' ? 'تأخير' : 'غياب'}
                </td>
                <td>${r.notes || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="sigs">
          <div class="sig">
            <strong>الموظف المعني</strong>
            <div class="sig-line">${escapeHtml(u.name)}</div>
          </div>
          <div class="sig">
            <strong>مشرف الحضور والدوام</strong>
            <div class="sig-line">المراجعة والتدقيق</div>
          </div>
          <div class="sig">
            <strong>مدير الموارد البشرية</strong>
            <div class="sig-line">الاعتماد الرسمي والختم</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 13. Print Plastic ID Card (CR80 Standard Size)
  const printPlasticBadge = (u: Employee) => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");
    const photoSrc = u.profile_photo_url ? resolvePublicUrl(u.profile_photo_url) : logoSrc;
    const qrData = encodeURIComponent(`BEGIN:VCARD\nVERSION:3.0\nFN:${u.name}\nTITLE:${u.job_title || 'Employee'}\nTEL:${u.personal_phone || ''}\nORG:Al-Madar Insurance\nEND:VCARD`);

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>طباعة بطاقة هوية الموظف (CR80 ID Badge) - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; background: #f1f5f9; color: #0f172a; margin: 0; padding: 20px; text-align: center; }
        .instructions { max-width: 600px; margin: 0 auto 20px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 9.5pt; color: #475569; }
        .print-cards-wrap { display: flex; justify-content: center; gap: 30px; margin: 0 auto; flex-wrap: wrap; }
        
        /* Exact Standard CR-80 Card Aspect Ratio: 85.6mm x 53.98mm (~325px x 205px at 96dpi or 650x410 at print) */
        .cr80-card {
          width: 325px; height: 505px; border-radius: 16px; overflow: hidden; position: relative;
          box-shadow: 0 10px 25px rgba(0,0,0,0.25); text-align: right; box-sizing: border-box;
          page-break-inside: avoid;
        }

        /* Front Card */
        .cr80-card.front {
          background: linear-gradient(145deg, #0b1329 0%, #172554 60%, #1e3a8a 100%);
          color: #fff; padding: 18px 16px; border: 1.5px solid #d4af37;
          display: flex; flex-direction: column; align-items: center; justify-content: space-between;
        }
        .front-header { display: flex; align-items: center; justify-content: space-between; width: 100%; border-bottom: 1px solid rgba(212,175,55,0.4); padding-bottom: 8px; }
        .front-header img { height: 36px; }
        .front-header-title { text-align: left; }
        .front-header-title h4 { margin: 0; font-size: 11px; color: #d4af37; font-weight: 800; }
        .front-header-title span { font-size: 8px; color: #94a3b8; }
        
        .front-chip-wrap { width: 100%; display: flex; justify-content: space-between; align-items: center; margin: 6px 0; }
        .smart-chip { width: 34px; height: 26px; border-radius: 4px; background: linear-gradient(135deg, #eab308, #ca8a04); border: 1px solid #fef08a; }
        .badge-type { background: rgba(212,175,55,0.2); border: 1px solid #d4af37; color: #fde047; font-size: 8px; font-weight: 800; padding: 2px 8px; border-radius: 12px; }

        .front-photo-wrap {
          width: 96px; height: 96px; border-radius: 50%; border: 3px solid #d4af37; overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.4); margin: 4px auto; background: #1e293b;
        }
        .front-photo-wrap img { width: 100%; height: 100%; object-fit: cover; }

        .front-emp-name { font-size: 14px; font-weight: 800; color: #ffffff; text-align: center; margin: 6px 0 2px; }
        .front-emp-title { font-size: 10px; color: #38bdf8; font-weight: 700; text-align: center; margin-bottom: 8px; }

        .front-meta-table { width: 100%; font-size: 8.5px; background: rgba(255,255,255,0.06); border-radius: 8px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.1); }
        .front-meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .front-meta-row span { color: #94a3b8; }
        .front-meta-row strong { color: #f1f5f9; }

        .front-barcode-wrap { width: 100%; text-align: center; margin-top: 6px; }
        .front-barcode { font-family: monospace; letter-spacing: 4px; font-size: 10px; color: #d4af37; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; display: inline-block; }

        /* Back Card */
        .cr80-card.back {
          background: #ffffff; color: #0f172a; padding: 18px 16px; border: 1.5px solid #cbd5e1;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .back-mag-stripe { width: 100%; height: 38px; background: #1e293b; margin: -18px -16px 12px; width: calc(100% + 32px); }
        .back-qr-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .back-qr-row img { width: 72px; height: 72px; border: 1px solid #cbd5e1; border-radius: 6px; }
        .back-details { font-size: 8.5px; line-height: 1.5; color: #334155; }
        .back-terms { font-size: 7.5px; color: #64748b; line-height: 1.3; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 8px; text-align: justify; }
        .back-sig-row { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 8px; }
      </style></head>
      <body onload="window.print()">
        <div class="instructions">
          <strong>تعليمات الطباعة الرسمية:</strong> تم ضبط أبعاد بطاقة هوية الموظف وفق المقاس العالمي المعياري (CR-80). قم باختيار الطباعة الملونة عالية الدقة على ورق كرتوني مقوى أو طابعات البطاقات البلاستيكية (PVC Card Printer).
        </div>

        <div class="print-cards-wrap">
          <!-- FRONT FACE -->
          <div class="cr80-card front">
            <div class="front-header">
              <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
              <div class="front-header-title">
                <h4>شركة المدار الليبي للتأمين</h4>
                <span>بطاقة هوية وظيفية معتمدة</span>
              </div>
            </div>

            <div class="front-chip-wrap">
              <div class="smart-chip"></div>
              <span class="badge-type">OFFICIAL ID</span>
            </div>

            <div class="front-photo-wrap">
              <img src="${photoSrc}" alt="" onerror="this.src='${logoSrc}'" />
            </div>

            <div>
              <div class="front-emp-name">${escapeHtml(u.name)}</div>
              <div class="front-emp-title">${escapeHtml(u.job_title || "موظف")}</div>
            </div>

            <div class="front-meta-table">
              <div class="front-meta-row"><span>الرقم الوظيفي:</span><strong>${escapeHtml(u.job_number || `EMP-${u.id}`)}</strong></div>
              <div class="front-meta-row"><span>الرقم الوطني:</span><strong>${escapeHtml(u.national_id_number || "—")}</strong></div>
              <div class="front-meta-row"><span>فصيلة الدم:</span><strong>${escapeHtml(u.blood_type || "O+")}</strong></div>
              <div class="front-meta-row"><span>سريان البطاقة:</span><strong>حتى ${fmtDate(u.end_date || "2026-12-31")}</strong></div>
            </div>

            <div class="front-barcode-wrap">
              <div class="front-barcode">*${u.job_number || `EMP${u.id}`}*</div>
            </div>
          </div>

          <!-- BACK FACE -->
          <div class="cr80-card back">
            <div class="back-mag-stripe"></div>

            <div class="back-qr-row">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}" alt="QR" />
              <div class="back-details">
                <div><strong>هاتف الطوارئ:</strong> ${escapeHtml(u.guardian_phone || u.personal_phone || "—")}</div>
                <div><strong>العنوان:</strong> طرابلس - ليبيا</div>
                <div><strong>الرقم المالي:</strong> ${escapeHtml(u.financial_number || `FN-${u.id}`)}</div>
                <div><strong>تاريخ الإصدار:</strong> ${new Date().toLocaleDateString("ar-LY")}</div>
              </div>
            </div>

            <div class="back-terms">
              هذه البطاقة وثيقة رسمية صادرة عن شركة المدار الليبي للتأمين، وتعتبر ملكاً للشركة ويجب إبرازها عند الطلب وإعادتها عند انتهاء الخدمة. في حال العثور عليها يرجى تسليمها لأقرب فرع للشركة.
            </div>

            <div class="back-sig-row">
              <div>
                <div>اعتماد الموارد البشرية</div>
                <div style="margin-top: 15px; font-weight:bold;">HR Department</div>
              </div>
              <div>
                <div>المدير العام</div>
                <div style="margin-top: 15px; font-weight:bold; color: #1e3a8a;">General Manager</div>
              </div>
            </div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 14. Print Official Bank Signature Authorization
  const printSignatureAuthorization = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=900");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>كتاب اعتماد توقيع رسمي - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 11pt; line-height: 1.8; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 25px; }
        .header img { height: 65px; }
        .title h1 { margin: 0; font-size: 18pt; text-align: center; }
        .content { margin: 25px 0; text-align: justify; }
        .sig-specimen-box { border: 2px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 25px 0; background: #f8fafc; display: flex; justify-content: space-around; text-align: center; }
        .specimen { width: 45%; border-top: 1px dashed #64748b; margin-top: 40px; padding-top: 6px; font-weight: bold; }
        .sigs { display: flex; justify-content: space-between; margin-top: 45px; }
        .sig { text-align: center; width: 200px; }
        .sig-line { border-top: 1px solid #334155; margin-top: 40px; padding-top: 6px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>خطاب اعتماد توقيع رسمي</h1>
            <div style="font-size: 10pt; color: #64748b">شركة المدار الليبي للتأمين - الإدارة العامة</div>
          </div>
          <div style="font-size: 9pt; color: #64748b">
            <div>الرقم الإشاري: SIG-AUTH-${u.id}/${new Date().getFullYear()}</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <div class="content">
          <p><strong>السادة المحترمون / كافة المصارف والجهات الرسمية،</strong></p>
          <p>تحية طيبة وبعد،،،</p>
          <p>
            تفيد شركة المدار الليبي للتأمين ش.م.ل بأن السيد / <strong>${escapeHtml(u.full_name_quad || u.name)}</strong>، الحامل للرقم الوطني: <strong>${escapeHtml(u.national_id_number || "—")}</strong>، والذي يشغل وظيفة: <strong>${escapeHtml(u.job_title || "موظف مسؤول")}</strong> بموجب الرقم الوظيفي (${escapeHtml(u.job_number || `EMP-${u.id}`)}).
          </p>
          <p>
            مفوض رسمياً بالتوقيع ومصادقة المعاملات والمستندات والوثائق التأمينية الصادرة عن الشركة والمبين نموذج توقيعه واعتماده أدناه:
          </p>

          <div class="sig-specimen-box">
            <div class="specimen">
              <div>نموذج التوقيع المعتمد (1)</div>
              <div style="color: #64748b; font-size: 9pt;">توقيع أصيل</div>
            </div>
            <div class="specimen">
              <div>نموذج التأشيرة والمصادقة (2)</div>
              <div style="color: #64748b; font-size: 9pt;">الختم الوظيفي</div>
            </div>
          </div>

          <p>
            ويعمل بهذا التفويض رسمياً اعتباراً من تاريخ صدوره، ويسري حتى إشعار كتابي رسمي آخر من طرفنا.
          </p>
          <p style="text-align: center; font-weight: bold; margin-top: 20px;">وتفضلوا بقبول فائق التقدير والاحترام،،،</p>
        </div>

        <div class="sigs">
          <div class="sig">
            <strong>مدير الموارد البشرية</strong>
            <div class="sig-line">المصادقة الإدارية</div>
          </div>
          <div class="sig">
            <strong>المدير العام للشركة</strong>
            <div class="sig-line">الاعتماد النهائي والختم الرسمي</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 15. Print Promotion Decision
  const printPromotionLetter = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=900");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>قرار ترقية وتعديل مسمى وظيفي - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 11pt; line-height: 1.8; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 25px; }
        .header img { height: 65px; }
        .title h1 { margin: 0; font-size: 18pt; color: #b45309; text-align: center; }
        .dec-box { background: #fffbeb; border: 2px solid #fde68a; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .sigs { display: flex; justify-content: space-between; margin-top: 50px; }
        .sig { text-align: center; width: 200px; }
        .sig-line { border-top: 1px solid #334155; margin-top: 40px; padding-top: 6px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>قرار إداري رقم (${u.id}/PR/${new Date().getFullYear()})</h1>
            <div style="font-size: 10pt; color: #64748b">بشأن ترقية وتعديل الدرجة الوظيفية والمستحقات</div>
          </div>
          <div style="font-size: 9pt; color: #64748b">
            <div>التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <p><strong>إن المدير العام لشركة المدار الليبي للتأمين،،،</strong></p>
        <p>
          بعد الاطلاع على النظام الأساسي للشركة، وعلى قانون العمل الليبي وتعديلاته، وبناءً على التقرير السنوي الإيجابي وتوصية لجنة الموارد البشرية لتقييم الأداء، ونظراً لكفاءة وتفاني الموظف في العمل،
        </p>
        <p style="text-align: center; font-size: 14pt; font-weight: 900; color: #b45309; margin: 15px 0;">(( قــــــــــــــــــــــــــــــرر ))</p>

        <div class="dec-box">
          <p><strong>مادة (1):</strong> يُرقى الموظف السيد / <strong>${escapeHtml(u.full_name_quad || u.name)}</strong> (رقم وظيفي: ${escapeHtml(u.job_number || `EMP-${u.id}`)}) إلى وظيفة أعلى ويعدل مسماه إلى: <strong>${escapeHtml(u.job_title || "مسؤول أول")}</strong>.</p>
          <p><strong>مادة (2):</strong> يُعدل الراتب الأساسي والبدلات المقررة بما يتوافق مع الدرجة الوظيفية الجديدة وتصرف كافة الفروقات المستحقة.</p>
          <p><strong>مادة (3):</strong> يُعمل بهذا القرار من تاريخ صدوره، وعلى الجهات المعنية كل فيما يخصه تنفيذه وتوثيقه بالملف الوظيفي للموظف.</p>
        </div>

        <div class="sigs">
          <div class="sig">
            <strong>مدير الموارد البشرية</strong>
            <div class="sig-line">المصادقة والتنفيذ</div>
          </div>
          <div class="sig">
            <strong>المدير العام</strong>
            <div class="sig-line">الاعتماد الرسمي والختم</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // 16. Print Warning Notice
  const printWarningNotice = (u: Employee) => {
    const w = window.open("", "_blank", "width=850,height=900");
    if (!w) return;
    const logoSrc = resolvePublicUrl("/img/logo.png");

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>إشعار إداري ولفت نظر رسمي - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 0; font-size: 11pt; line-height: 1.8; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 25px; }
        .header img { height: 65px; }
        .title h1 { margin: 0; font-size: 18pt; color: #dc2626; text-align: center; }
        .notice-box { background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0; color: #991b1b; }
        .sigs { display: flex; justify-content: space-between; margin-top: 50px; }
        .sig { text-align: center; width: 200px; }
        .sig-line { border-top: 1px solid #334155; margin-top: 40px; padding-top: 6px; font-weight: 700; }
      </style></head>
      <body onload="window.print()">
        <div class="header">
          <img src="${logoSrc}" alt="" onerror="this.src='/img/logo.png'" />
          <div class="title">
            <h1>إشعار إداري رسمي ولفت نظر</h1>
            <div style="font-size: 10pt; color: #64748b">شركة المدار الليبي للتأمين - الشؤون الإدارية</div>
          </div>
          <div style="font-size: 9pt; color: #64748b">
            <div>الرقم: WRN-${u.id}/${new Date().getFullYear()}</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-LY")}</div>
          </div>
        </div>

        <p><strong>إلى الموظف:</strong> ${escapeHtml(u.full_name_quad || u.name)} (الرقم الوظيفي: ${escapeHtml(u.job_number || `EMP-${u.id}`)})</p>
        <p><strong>المسمى الوظيفي:</strong> ${escapeHtml(u.job_title || "موظف")}</p>

        <div class="notice-box">
          <p><strong>الموضوع: لفت نظر رسمي بشأن الانضباط الوظيفي</strong></p>
          <p>
            نود لفت انتباهكم إلى ضرورة الالتزام الصارم باللوائح الداخلية والتعليمات الإدارية الصادرة عن الشركة، ومراعاة دقة المواعيد وسرعة إنجاز المهام المسندة إليكم بالجودة المطلوبة.
          </p>
          <p>
            نأمل منكم تلافي أي تأخير أو تقصير مستقبلاً، والحرص على تقديم أفضل مستوى من الأداء حفاظاً على سير العمل ومصلحة المنظومة.
          </p>
        </div>

        <p>مع خالص التمنيات لكم بالتوفيق والالتزام الدائم،،،</p>

        <div class="sigs">
          <div class="sig">
            <strong>توقيع الموظف بالعلم</strong>
            <div class="sig-line">الاسم والتاريخ</div>
          </div>
          <div class="sig">
            <strong>مدير الشؤون الإدارية</strong>
            <div class="sig-line">الاعتماد الرسمي</div>
          </div>
        </div>
      </body></html>`);
    w.document.close();
  };

  // ─── Settlement Calculation Helper ───
  const calculateSettlement = (u: Employee) => {
    const startDate = u.start_date ? new Date(u.start_date) : new Date();
    const endDate = settlementTerminationDate ? new Date(settlementTerminationDate) : new Date();
    let diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
    let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = (diffDays % 365) % 30;

    const base = Number(u.salary || 0);
    const totAllow =
      Number(u.housing_allowance || 0) +
      Number(u.transportation_allowance || 0) +
      Number(u.communication_allowance || 0) +
      Number(u.fixed_bonuses || 0);
    const totalSalary = base + totAllow;

    // Libyan Labor Code: half month for each of the first 5 years, full month for every year thereafter
    let gratuity = 0;
    if (years <= 5) {
      gratuity = years * (totalSalary / 2) + (months / 12) * (totalSalary / 2);
    } else {
      gratuity = 5 * (totalSalary / 2) + (years - 5) * totalSalary + (months / 12) * totalSalary;
    }

    const leaveDaysNum = parseFloat(settlementLeaveDays) || 0;
    const dailyRate = totalSalary > 0 ? totalSalary / 30 : 0;
    const leaveCash = leaveDaysNum * dailyRate;

    const bonus = parseFloat(settlementBonus) || 0;
    const deductions = parseFloat(settlementDeductions) || 0;

    const netFinal = Math.max(0, gratuity + leaveCash + bonus - deductions);

    return {
      years,
      months,
      days,
      totalSalary,
      gratuity,
      leaveCash,
      bonus,
      deductions,
      netFinal,
    };
  };

  // ─── Profile Completeness & Alerts ───
  const computeProfileCompleteness = (u: Employee | null) => {
    if (!u) return { percentage: 0, missing: [] };
    const checks = [
      { key: "profile_photo_url", label: "الصورة الشخصية" },
      { key: "national_id_photo_url", label: "صورة الرقم الوطني" },
      { key: "employment_contract_url", label: "عقد العمل" },
      { key: "health_certificate_url", label: "الشهادة الصحية" },
      { key: "approved_signature_url", label: "التوقيع المعتمد" },
      { key: "national_id_number", label: "الرقم الوطني" },
      { key: "personal_phone", label: "رقم الهاتف" },
      { key: "account_number", label: "رقم الحساب المصرفي" },
      { key: "job_title", label: "المسمى الوظيفي" },
      { key: "address", label: "عنوان السكن" },
    ];
    let filled = 0;
    const missing: string[] = [];
    checks.forEach((c) => {
      if ((u as any)[c.key]) {
        filled++;
      } else {
        missing.push(c.label);
      }
    });
    return {
      percentage: Math.round((filled / checks.length) * 100),
      missing,
    };
  };

  // Contract expiry calculation
  const getContractExpiryInfo = (u: Employee | null) => {
    if (!u || !u.end_date) return null;
    const end = new Date(u.end_date);
    const today = new Date();
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: u.end_date,
      diffDays,
      isExpired: diffDays <= 0,
      isNear: diffDays > 0 && diffDays <= 60,
    };
  };

  // Generate vCard Content & Download
  const handleDownloadVCard = (u: Employee) => {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${u.name};;;;\nFN:${u.name}\nORG:شركة المدار الليبي للتأمين\nTITLE:${u.job_title || "موظف"}\nTEL;TYPE=CELL:${u.personal_phone || ""}\nEMAIL:${u.email || ""}\nADR;TYPE=WORK:;;طرابلس - ليبيا;;;;\nEND:VCARD`;
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${u.name.replace(/\s+/g, "_")}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("تم تنزيل بطاقة الاتصال بنجاح", "success");
  };

  // Filtered Lists - All Employees (Active & Blocked)
  const filteredEmployeesList = employeesList.filter((e) => {
    if (!empSearchQuery.trim()) return true;
    const q = empSearchQuery.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.job_title && e.job_title.toLowerCase().includes(q)) ||
      (e.job_number && e.job_number.toLowerCase().includes(q)) ||
      (e.national_id_number && e.national_id_number.includes(q))
    );
  });

  const filteredDocs = insuranceDocs.filter((d) => {
    if (excludeCanceledDocs && d.status === "canceled") return false;
    if (selectedDocType !== "all" && d.insurance_type && !d.insurance_type.includes(selectedDocType)) {
      return false;
    }
    return true;
  });

  // Financial Calculations
  const baseSalary = Number(employee?.salary || 0);
  const totalAllowances =
    Number(employee?.housing_allowance || 0) +
    Number(employee?.transportation_allowance || 0) +
    Number(employee?.communication_allowance || 0) +
    Number(employee?.fixed_bonuses || 0);
  const grossSalary = baseSalary + totalAllowances;
  const totalDeductions = Number(employee?.fixed_fines || 0);
  const netMonthlySalary = grossSalary - totalDeductions;

  const totalIssuedDocsCount = filteredDocs.length;
  const totalIssuedPremiums = filteredDocs.reduce((acc, d) => acc + Number(d.premium || 0), 0);

  const pendingReqsCount = requests.filter((r) => r.status === "pending").length;

  const profileHealth = computeProfileCompleteness(employee);
  const contractExpiry = getContractExpiryInfo(employee);

  // Settlement Calculation Live
  const settlementRes = employee ? calculateSettlement(employee) : null;

  return (
    <div className="agent-ledger-page-v2" dir="rtl">
      {/* ════════════════════════════════════════════════════════════════════════
          TOP HEADER: Title & Action Pills (Matches Agent Ledger Style)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="ledger-header-bar">
        <div className="header-info">
          <div className="header-icon-badge">
            <i className="fa-solid fa-id-card-clip" />
          </div>
          <div>
            <h1 className="header-title">إدارة الموظف</h1>
            <p className="header-subtitle">سجل إنتاجية وتصفية مرتبات وعهد ومستندات وشهادات الموظف شهراً بشهر</p>
          </div>
        </div>

        <div className="header-actions-pill-group">
          <button
            className="pill-btn vcard-pill"
            onClick={() => setShowVCardModal(true)}
            disabled={!employee}
            title="عرض وتنزيل بطاقة الاتصال الذكية QR"
          >
            <i className="fa-solid fa-qrcode" />
            <span>بطاقة QR الذكية</span>
          </button>

          <button
            className="pill-btn blue"
            onClick={() => employee && printEmployeeA4(employee)}
            disabled={!employee}
            title="طباعة ملف وبيانات الموظف الشامل A4"
          >
            <i className="fa-solid fa-print" />
            <span>طباعة تقرير الموظف (A4)</span>
          </button>

          <button
            className="pill-btn green"
            onClick={exportPayrollExcel}
            disabled={!employee || payrolls.length === 0}
            title="تصدير كشف مسيرات الرواتب إلى ملف إكسيل"
          >
            <i className="fa-solid fa-file-excel" />
            <span>تصدير إكسيل (المرتبات)</span>
          </button>

          <button
            className="pill-btn cyan"
            onClick={exportInsuranceDocsExcel}
            disabled={!employee || filteredDocs.length === 0}
            title="تصدير وثائق التأمين الصادرة إلى إكسيل"
          >
            <i className="fa-solid fa-file-excel" />
            <span>تصدير وثائق الكشف (إكسيل)</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          FILTER & SELECTION BAR (Dropdowns & Toggles)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="ledger-filter-bar">
        {/* Searchable Employee Selector Dropdown */}
        <div className="filter-group employee-picker" ref={dropdownRef}>
          <label>
            <i className="fa-solid fa-user-tie" /> اختر الموظف / المستخدم:
          </label>
          <div className="custom-select-trigger" onClick={() => setEmpDropdownOpen(!empDropdownOpen)}>
            {loadingEmployeesList ? (
              <span>جارِ تحميل قائمة الموظفين النشطين...</span>
            ) : employee ? (
              <div className="selected-emp-preview">
                {employee.profile_photo_url ? (
                  <img src={resolvePublicUrl(employee.profile_photo_url)} alt="" className="emp-mini-avatar" />
                ) : (
                  <div className="emp-mini-placeholder"><i className="fa-solid fa-user" /></div>
                )}
                <span className="emp-trigger-name">{employee.name}</span>
                {employee.job_title && <span className="emp-trigger-role">({employee.job_title})</span>}
                {employee.job_number && <span className="emp-trigger-code">[{employee.job_number}]</span>}
              </div>
            ) : (
              <span>اختر موظفاً من القائمة...</span>
            )}
            <i className={`fa-solid fa-chevron-${empDropdownOpen ? "up" : "down"} arrow-icon`} />
          </div>

          {empDropdownOpen && (
            <div className="custom-dropdown-menu">
              <div className="dropdown-search-box">
                <i className="fa-solid fa-magnifying-glass" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الرقم الوظيفي، أو المسمى..."
                  value={empSearchQuery}
                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="dropdown-items-list">
                {filteredEmployeesList.length === 0 ? (
                  <div className="dropdown-no-results">لا يوجد موظف نشط مطابق للبحث</div>
                ) : (
                  filteredEmployeesList.map((emp) => (
                    <div
                      key={emp.id}
                      className={`dropdown-item ${selectedEmployeeId === emp.id ? "active" : ""}`}
                      onClick={() => handleSelectEmployee(emp)}
                    >
                      <div className="item-avatar">
                        {emp.profile_photo_url ? (
                          <img src={resolvePublicUrl(emp.profile_photo_url)} alt="" />
                        ) : (
                          <i className="fa-solid fa-user" />
                        )}
                      </div>
                      <div className="item-info">
                        <div className="item-name">
                          {emp.name}
                        </div>
                        <div className="item-meta">
                          <span>{emp.job_title || "موظف"}</span>
                          {emp.job_number && <span>#{emp.job_number}</span>}
                          {emp.financial_number && <span>مالي: {emp.financial_number}</span>}
                          {(emp.is_blocked || emp.is_active === false) && (
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>[محظور]</span>
                          )}
                        </div>
                      </div>
                      {selectedEmployeeId === emp.id && <i className="fa-solid fa-check checkmark" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Insurance Doc Type Filter */}
        <div className="filter-group doc-type-picker">
          <label>
            <i className="fa-solid fa-shield-halved" /> نوع الوثيقة / التأمين:
          </label>
          <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)}>
            {LEDGER_DOC_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Toggles */}
        <div className="filter-toggles">
          <label className="toggle-label">
            <span className="toggle-text">استبعاد الوثائق الملغاة:</span>
            <div
              className={`modern-toggle ${excludeCanceledDocs ? "checked" : ""}`}
              onClick={() => setExcludeCanceledDocs(!excludeCanceledDocs)}
            >
              <div className="toggle-handle" />
            </div>
          </label>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          LOADING STATE
      ════════════════════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="ledger-loading-card">
          <i className="fa-solid fa-circle-notch fa-spin spinner-icon" />
          <p>جارِ تحميل وتحديث سجل الموظف الشامل...</p>
        </div>
      ) : !employee ? (
        <div className="ledger-empty-card">
          <i className="fa-solid fa-user-slash" />
          <h3>لم يتم اختيار موظف</h3>
          <p>يرجى اختيار موظف من القائمة أعلاه لعرض سجله وإدارته بالكامل.</p>
        </div>
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════════════════
              THE HERO CARD: MATCHES EXACT SCREENSHOT (Buttons + Grid + 4 Stats)
          ════════════════════════════════════════════════════════════════════════ */}
          <div className="agent-hero-card">
            {/* Card Header */}
            <div className="agent-card-header">
              <div className="agent-title-side">
                <div className="agent-building-icon">
                  {employee.profile_photo_url ? (
                    <img src={resolvePublicUrl(employee.profile_photo_url)} alt="" className="agent-head-avatar" />
                  ) : (
                    <i className="fa-solid fa-user-tie" />
                  )}
                </div>
                <div>
                  <span className="sub-tag">الموظف / المستخدم المحدد</span>
                  <h2 className="agent-name-display">
                    {employee.name}
                    {employee.job_title && <span className="agent-role-pill">({employee.job_title})</span>}
                  </h2>
                </div>
              </div>

              <div className="agent-status-side">
                {employee.is_active !== false && !employee.is_blocked ? (
                  <span className="agent-active-badge">
                    <i className="fa-solid fa-circle dot" /> حساب نشط ومفعل
                  </span>
                ) : (
                  <span className="agent-inactive-badge">
                    <i className="fa-solid fa-circle dot" /> حساب محظور وموقوف
                  </span>
                )}
              </div>
            </div>

            {/* Row 1: The 8 Vibrant Gradient Action Buttons (Exact Replica) */}
            <div className="agent-action-buttons-row">
              {/* 1. عرض */}
              <button
                className="action-btn-pill green"
                onClick={() => setShowProfileModal(true)}
                title="عرض تفاصيل الموظف بالكامل"
              >
                <i className="fa-solid fa-eye" />
                <span>عرض</span>
              </button>

              {/* 2. تعديل */}
              <button
                className="action-btn-pill amber"
                onClick={() => setShowEditModal(true)}
                title="تعديل بيانات الموظف"
              >
                <i className="fa-solid fa-pencil" />
                <span>تعديل</span>
              </button>

              {/* 3. طباعة بيانات */}
              <button
                className="action-btn-pill purple"
                onClick={() => printEmployeeA4(employee)}
                title="طباعة بيانات الموظف A4"
              >
                <i className="fa-solid fa-file-lines" />
                <span>طباعة بيانات</span>
              </button>

              {/* 4. بطاقة موظف */}
              <button
                className="action-btn-pill pink"
                onClick={() => printEmployeeIdCard(employee)}
                title="طباعة بطاقة عمل / هوية الموظف"
              >
                <i className="fa-solid fa-id-card" />
                <span>بطاقة موظف</span>
              </button>

              {/* 5. طباعة العقد */}
              <button
                className="action-btn-pill blue"
                onClick={() => printEmployeeContract(employee)}
                title="طباعة عقد العمل الرسمي"
              >
                <i className="fa-solid fa-print" />
                <span>طباعة العقد</span>
              </button>

              {/* 6. إذن مباشرة */}
              <button
                className="action-btn-pill orange"
                onClick={() => printEmployeePermit(employee)}
                title="طباعة إذن مباشرة العمل"
              >
                <i className="fa-solid fa-file-invoice" />
                <span>إذن مباشرة</span>
              </button>

              {/* 7. عهد الموظف */}
              <button
                className="action-btn-pill sky"
                onClick={() => setActiveTab("custody")}
                title="عرض وإدارة عهد الموظف (المخازن والعهدة)"
              >
                <i className="fa-solid fa-boxes-stacked" />
                <span>عهد الموظف ({custody.length})</span>
              </button>

              {/* 8. واتساب الموظف السريع (NEW WOW FEATURE) */}
              <button
                className="action-btn-pill emerald"
                onClick={() => setShowWhatsAppModal(true)}
                title="مراسلة الموظف عبر واتساب مع قوالب جاهزة"
              >
                <i className="fa-brands fa-whatsapp" />
                <span>واتساب الموظف</span>
              </button>

              {/* 9. كارنيه الموظف الذكي CR80 (NEW WOW FEATURE) */}
              <button
                className="action-btn-pill purple"
                onClick={() => setActiveTab("badge")}
                title="استعراض وطباعة بطاقة عمل / هوية الموظف البلاستيكية"
              >
                <i className="fa-solid fa-id-badge" />
                <span>كارنيه الموظف CR80</span>
              </button>

              {/* 10. تقييم الأداء KPI (NEW WOW FEATURE) */}
              <button
                className="action-btn-pill amber"
                onClick={() => setActiveTab("performance")}
                title="تقييم الأداء السنوي ومؤشرات KPI"
              >
                <i className="fa-solid fa-star" />
                <span>تقييم الأداء KPI</span>
              </button>

              {/* 11. حظر / تفعيل الموظف */}
              <button
                className={`action-btn-pill ${employee.is_active !== false && !employee.is_blocked ? "red" : "emerald"}`}
                onClick={handleToggleEmployeeStatus}
                title={employee.is_active !== false && !employee.is_blocked ? "تعطيل / حظر حساب الموظف" : "إلغاء حظر وتنشيط حساب الموظف"}
              >
                <i className={`fa-solid ${employee.is_active !== false && !employee.is_blocked ? "fa-user-slash" : "fa-user-check"}`} />
                <span>{employee.is_active !== false && !employee.is_blocked ? "حظر الموظف" : "إلغاء الحظر"}</span>
              </button>
            </div>

            {/* Row 2: 3x2 Organized Meta Badges Grid */}
            <div className="agent-meta-badges-grid">
              <div className="meta-badge-box">
                <span className="lbl"><i className="fa-solid fa-hashtag" /> كود الموظف:</span>
                <span className="val bold text-cyan">{employee.job_number || employee.financial_number || `EMP-${employee.id}`}</span>
              </div>

              <div className="meta-badge-box">
                <span className="lbl"><i className="fa-solid fa-user-gear" /> المسؤول / المسمى:</span>
                <span className="val bold">{employee.job_title || "موظف"}</span>
              </div>

              <div className="meta-badge-box">
                <span className="lbl"><i className="fa-solid fa-calendar-plus" /> تاريخ التعاقد / التعيين:</span>
                <span className="val">{fmtDate(employee.start_date)}</span>
              </div>

              <div className="meta-badge-box">
                <span className="lbl"><i className="fa-solid fa-play" /> بدء النشاط (أول وثيقة):</span>
                <span className="val">{insuranceDocs.length > 0 ? fmtDate(insuranceDocs[insuranceDocs.length - 1].created_at) : "—"}</span>
              </div>

              <div className="meta-badge-box">
                <span className="lbl"><i className="fa-solid fa-clock-rotate-left" /> آخر نشاط مسجل:</span>
                <span className="val">{insuranceDocs.length > 0 ? fmtDate(insuranceDocs[0].created_at) : fmtDate(employee.start_date)}</span>
              </div>

              <div className="meta-badge-box">
                <span className="lbl"><i className="fa-solid fa-calendar-xmark" /> تاريخ انتهاء العقد / التوقف:</span>
                <span className="val text-orange">{fmtDate(employee.end_date)}</span>
              </div>
            </div>

            {/* Row 3: 4 Vibrant Stat Cards (Bottom of Hero Card, Exactly Like Screenshot) */}
            <div className="agent-stat-cards-row">
              {/* Card 1: إجمالي الراتب والبدلات */}
              <div className="hero-metric-card blue">
                <div className="metric-icon-wrap">
                  <i className="fa-solid fa-coins" />
                </div>
                <div className="metric-content">
                  <span className="metric-label">إجمالي الراتب والبدلات</span>
                  <span className="metric-number">{money(grossSalary)} <small>د.ل</small></span>
                  <span className="metric-sub">أساسي: {money(baseSalary)} د.ل</span>
                </div>
              </div>

              {/* Card 2: إجمالي الخصومات والضرائب */}
              <div className="hero-metric-card red">
                <div className="metric-icon-wrap">
                  <i className="fa-solid fa-hand-holding-dollar" />
                </div>
                <div className="metric-content">
                  <span className="metric-label">إجمالي الخصومات الشهرية</span>
                  <span className="metric-number">{money(totalDeductions)} <small>د.ل</small></span>
                  <span className="metric-sub">غرامات + استقطاعات</span>
                </div>
              </div>

              {/* Card 3: صافي الراتب المستحق */}
              <div className="hero-metric-card gold">
                <div className="metric-icon-wrap">
                  <i className="fa-solid fa-wallet" />
                </div>
                <div className="metric-content">
                  <span className="metric-label">صافي الراتب المستحق</span>
                  <span className="metric-number">{money(netMonthlySalary)} <small>د.ل</small></span>
                  <span className="metric-sub">يصرف شهرياً</span>
                </div>
              </div>

              {/* Card 4: إجمالي الوثائق الصادرة */}
              <div className="hero-metric-card green">
                <div className="metric-icon-wrap">
                  <i className="fa-solid fa-shield-check" />
                </div>
                <div className="metric-content">
                  <span className="metric-label">الوثائق التأمينية الصادرة</span>
                  <span className="metric-number">{totalIssuedDocsCount} <small>وثيقة</small></span>
                  <span className="metric-sub">إجمالي: {money(totalIssuedPremiums)} د.ل</span>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              SMART ALERTS & PROFILE HEALTH BANNER (NEW WOW FEATURE)
          ════════════════════════════════════════════════════════════════════════ */}
          <div className="smart-health-banner">
            {/* Profile Completeness Gauge */}
            <div className="health-block">
              <div className="health-gauge">
                <div className="gauge-circle" style={{ "--pct": `${profileHealth.percentage}%` } as any}>
                  <span>{profileHealth.percentage}%</span>
                </div>
                <div className="gauge-info">
                  <strong>اكتمال الملف الوظيفي</strong>
                  {profileHealth.missing.length > 0 ? (
                    <small>ينقص: {profileHealth.missing.slice(0, 3).join("، ")}</small>
                  ) : (
                    <small className="text-green">ملف الموظف مكتمل 100%</small>
                  )}
                </div>
              </div>
            </div>

            {/* Contract Expiry Alert */}
            {contractExpiry && (
              <div className={`health-alert ${contractExpiry.isExpired ? "danger" : contractExpiry.isNear ? "warning" : "info"}`}>
                <i className={`fa-solid ${contractExpiry.isExpired ? "fa-triangle-exclamation" : "fa-clock"}`} />
                <div>
                  <strong>{contractExpiry.isExpired ? "عقد العمل منتهٍ!" : "سريان عقد العمل:"}</strong>
                  <span>
                    {contractExpiry.isExpired
                      ? `انتهى منذ ${Math.abs(contractExpiry.diffDays)} يوم (${fmtDate(contractExpiry.date)})`
                      : `متبقي ${contractExpiry.diffDays} يوماً على نهاية العقد (${fmtDate(contractExpiry.date)})`}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Actions Shortcuts */}
            <div className="health-shortcuts">
              <button className="shortcut-btn" onClick={() => setActiveTab("performance")}>
                <i className="fa-solid fa-star text-amber" />
                <span>تقييم الأداء</span>
              </button>
              <button className="shortcut-btn" onClick={() => setActiveTab("attendance")}>
                <i className="fa-solid fa-clock-rotate-left text-cyan" />
                <span>سجل الدوام</span>
              </button>
              <button className="shortcut-btn" onClick={() => setActiveTab("certificates")}>
                <i className="fa-solid fa-award text-green" />
                <span>شهادات الموظف</span>
              </button>
              <button className="shortcut-btn" onClick={() => setActiveTab("settlement")}>
                <i className="fa-solid fa-calculator text-cyan" />
                <span>حاسبة نهاية الخدمة</span>
              </button>
              <button className="shortcut-btn" onClick={() => setShowWhatsAppModal(true)}>
                <i className="fa-brands fa-whatsapp text-emerald" />
                <span>مراسلة واتساب</span>
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              INTERACTIVE TABS BAR (Enriched with New Enterprise Features)
          ════════════════════════════════════════════════════════════════════════ */}
          <div className="ledger-tabs-navigation">
            <button
              className={`nav-tab-btn ${activeTab === "payroll" ? "active" : ""}`}
              onClick={() => setActiveTab("payroll")}
            >
              <i className="fa-solid fa-money-check-dollar" />
              <span>سجل الرواتب والمسيرات</span>
              {payrolls.length > 0 && <span className="tab-chip">{payrolls.length}</span>}
            </button>

            <button
              className={`nav-tab-btn ${activeTab === "insurance_docs" ? "active" : ""}`}
              onClick={() => setActiveTab("insurance_docs")}
            >
              <i className="fa-solid fa-file-shield" />
              <span>الوثائق الصادرة</span>
              {filteredDocs.length > 0 && <span className="tab-chip green">{filteredDocs.length}</span>}
            </button>

            <button
              className={`nav-tab-btn ${activeTab === "custody" ? "active" : ""}`}
              onClick={() => setActiveTab("custody")}
            >
              <i className="fa-solid fa-boxes-stacked" />
              <span>عهد الموظف والمخزون</span>
              {custody.length > 0 && <span className="tab-chip sky">{custody.length}</span>}
            </button>

            <button
              className={`nav-tab-btn ${activeTab === "documents" ? "active" : ""}`}
              onClick={() => setActiveTab("documents")}
            >
              <i className="fa-solid fa-folder-open" />
              <span>المستندات والوثائق</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              <i className="fa-solid fa-paper-plane" />
              <span>الطلبات والإجازات</span>
              {pendingReqsCount > 0 && <span className="tab-chip amber">{pendingReqsCount} معلق</span>}
            </button>

            {/* NEW ENTERPRISE TAB: Performance & KPI Scorecard */}
            <button
              className={`nav-tab-btn ${activeTab === "performance" ? "active" : ""}`}
              onClick={() => setActiveTab("performance")}
            >
              <i className="fa-solid fa-star text-amber" />
              <span>تقييم الأداء ومؤشرات KPI</span>
              <span className="tab-chip gold">96%</span>
            </button>

            {/* NEW ENTERPRISE TAB: Attendance & Overtime Tracker */}
            <button
              className={`nav-tab-btn ${activeTab === "attendance" ? "active" : ""}`}
              onClick={() => setActiveTab("attendance")}
            >
              <i className="fa-solid fa-clock-rotate-left text-cyan" />
              <span>سجل الحضور والدوام</span>
              <span className="tab-chip sky">22 يوم</span>
            </button>

            {/* NEW ENTERPRISE TAB: Loans & Advances */}
            <button
              className={`nav-tab-btn ${activeTab === "loans" ? "active" : ""}`}
              onClick={() => setActiveTab("loans")}
            >
              <i className="fa-solid fa-credit-card text-emerald" />
              <span>السلف المالية والأقساط</span>
              {loansList.length > 0 && <span className="tab-chip green">{loansList.length}</span>}
            </button>

            {/* NEW ENTERPRISE TAB: Plastic ID Badge Studio */}
            <button
              className={`nav-tab-btn ${activeTab === "badge" ? "active" : ""}`}
              onClick={() => setActiveTab("badge")}
            >
              <i className="fa-solid fa-id-badge text-purple" />
              <span>كارنيه الموظف CR80</span>
            </button>

            {/* End of Service Settlement */}
            <button
              className={`nav-tab-btn ${activeTab === "settlement" ? "active" : ""}`}
              onClick={() => setActiveTab("settlement")}
            >
              <i className="fa-solid fa-scale-balanced text-amber" />
              <span>مكافأة نهاية الخدمة</span>
            </button>

            {/* Official Certificates */}
            <button
              className={`nav-tab-btn ${activeTab === "certificates" ? "active" : ""}`}
              onClick={() => setActiveTab("certificates")}
            >
              <i className="fa-solid fa-award text-green" />
              <span>الشهادات والخطابات</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <i className="fa-solid fa-user-circle" />
              <span>الملف الشخصي</span>
            </button>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 1: PAYROLL LEDGER (سجل الرواتب)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "payroll" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-money-check-dollar" />
                  <h3>سجل مسيرات وصرف الرواتب للموظف شهراً بشهر</h3>
                </div>
                <div className="pane-actions">
                  <button
                    className="btn-action"
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', fontWeight: 800 }}
                    onClick={handleOpenQuickPay}
                  >
                    <i className="fa-solid fa-hand-holding-dollar" /> صرف مرتب للشهر
                  </button>
                  <button className="btn-action green" onClick={exportPayrollExcel}>
                    <i className="fa-solid fa-file-excel" /> تصدير إكسيل
                  </button>
                  <button className="btn-action primary" onClick={() => navigate("/reports/employee-salaries")}>
                    <i className="fa-solid fa-external-link-alt" /> كشف رواتب الشركة
                  </button>
                </div>
              </div>

              {payrolls.length === 0 ? (
                <div className="pane-empty">
                  <i className="fa-solid fa-calendar-xmark" />
                  <p>لا يوجد سجل رواتب مسجل حتى الآن لهذا الموظف.</p>
                </div>
              ) : (
                <div className="table-responsive-wrap">
                  <table className="modern-data-table">
                    <thead>
                      <tr>
                        <th>الشهر / السنة</th>
                        <th>الراتب الأساسي</th>
                        <th>البدلات والمكافآت</th>
                        <th>الخصومات والغرامات</th>
                        <th>الضرائب والضمان</th>
                        <th>صافي الراتب المستحق</th>
                        <th>حالة الصرف</th>
                        <th>تاريخ وطريقة الصرف</th>
                        <th className="actions-col" style={{ textAlign: "center" }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrolls.map((p) => {
                        const adds =
                          Number(p.housing_allowance || 0) +
                          Number(p.transportation_allowance || 0) +
                          Number(p.communication_allowance || 0) +
                          Number(p.bonus_amount || 0) +
                          Number(p.allowance_amount || 0) +
                          Number(p.other_additions || 0);
                        const fines = Number(p.penalty_amount || 0) + Number(p.deduction_amount || 0) + Number(p.advance_amount || 0);
                        const taxes = Number(p.tax_amount || 0) + Number(p.social_security_amount || 0) + Number((p as any).solidarity_amount || 0);

                        return (
                          <tr key={p.id}>
                            <td>
                              <span
                                className="month-tag"
                                style={{
                                  direction: 'ltr',
                                  display: 'inline-block',
                                  fontWeight: 800,
                                  fontFamily: 'monospace, sans-serif',
                                  fontSize: '13px',
                                }}
                              >
                                {String(p.month).padStart(2, '0')} / {p.year}
                              </span>
                            </td>
                            <td><strong>{money(p.base_salary)}</strong> د.ل</td>
                            <td className="text-green">+{money(adds)} د.ل</td>
                            <td className="text-red">-{money(fines)} د.ل</td>
                            <td className="text-orange">-{money(taxes)} د.ل</td>
                            <td>
                              <span className="net-salary-pill">{money(p.net_salary)} د.ل</span>
                            </td>
                            <td>
                              {p.status === "paid" ? (
                                <span className="status-tag paid">
                                  <i className="fa-solid fa-check" /> مدفوع
                                </span>
                              ) : (
                                <span className="status-tag unpaid">
                                  <i className="fa-solid fa-clock" /> غير مدفوع
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "center", minWidth: "125px" }}>
                              {p.status === "paid" ? (
                                <div className="payment-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <span
                                    style={{
                                      direction: 'ltr',
                                      display: 'inline-block',
                                      fontWeight: 800,
                                      fontFamily: 'monospace, sans-serif',
                                      fontSize: '12.5px',
                                      color: 'var(--text)',
                                      letterSpacing: '0.5px',
                                    }}
                                  >
                                    {p.paid_at ? p.paid_at.substring(0, 10) : (fmtDate(p.paid_at) || "—")}
                                  </span>
                                  {p.delivery_method && (
                                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>
                                      ({p.delivery_method})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontWeight: 700 }}>—</span>
                              )}
                            </td>
                            <td className="actions-col" style={{ textAlign: "center", minWidth: "165px", whiteSpace: "nowrap" }}>
                              <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => openPaySalaryModal(p)}
                                  title={p.status === "paid" ? "تعديل بيانات الراتب والخصومات والصرف" : "تسديد وصرف المرتب"}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '6px 14px',
                                    height: '32px',
                                    width: 'auto',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: p.status === 'paid' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'linear-gradient(135deg, #059669, #10b981)',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: '12px',
                                    fontFamily: "'Cairo', sans-serif",
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    boxShadow: p.status === 'paid' ? '0 2px 6px rgba(37,99,235,0.25)' : '0 2px 6px rgba(16,185,129,0.25)',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <i className={`fa-solid ${p.status === 'paid' ? 'fa-pencil' : 'fa-hand-holding-dollar'}`} />
                                  <span>{p.status === 'paid' ? 'تعديل' : 'تسديد'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => printPaySlip(employee, p)}
                                  title="طباعة سند وقسيمة الراتب"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px',
                                    padding: '6px 12px',
                                    height: '32px',
                                    width: 'auto',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--text)',
                                    fontWeight: 800,
                                    fontSize: '12px',
                                    fontFamily: "'Cairo', sans-serif",
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <i className="fa-solid fa-receipt text-cyan" />
                                  <span>وصل</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 2: ISSUED INSURANCE DOCUMENTS (الوثائق التأمينية)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "insurance_docs" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-shield-halved" />
                  <h3>وثائق التأمين الصادرة بواسطة الموظف</h3>
                </div>
                <div className="pane-actions">
                  <button className="btn-action cyan" onClick={exportInsuranceDocsExcel} disabled={filteredDocs.length === 0}>
                    <i className="fa-solid fa-file-excel" /> تصدير إكسيل
                  </button>
                </div>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="pane-empty">
                  <i className="fa-solid fa-file-circle-xmark" />
                  <p>لا توجد وثائق تأمينية صادرة لهذا الموظف وفق الفلاتر الحالية.</p>
                </div>
              ) : (
                <div className="table-responsive-wrap">
                  <table className="modern-data-table">
                    <thead>
                      <tr>
                        <th>رقم الوثيقة</th>
                        <th>نوع التأمين</th>
                        <th>اسم المؤمن له</th>
                        <th>تاريخ البدء</th>
                        <th>تاريخ الانتهاء</th>
                        <th>القسط الإجمالي</th>
                        <th>الحالة</th>
                        <th>تاريخ الإصدار</th>
                        <th>معاينة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <strong className="text-cyan">{doc.document_number}</strong>
                          </td>
                          <td>{doc.insurance_type || "تأمين عام"}</td>
                          <td>{doc.insured_name || "—"}</td>
                          <td>{fmtDate(doc.start_date)}</td>
                          <td>{fmtDate(doc.end_date)}</td>
                          <td>
                            <strong>{money(doc.premium)} د.ل</strong>
                          </td>
                          <td>
                            {doc.status === "canceled" ? (
                              <span className="status-tag canceled">ملغية</span>
                            ) : (
                              <span className="status-tag active-doc">سارية</span>
                            )}
                          </td>
                          <td>{fmtDate(doc.created_at)}</td>
                          <td>
                            <button
                              className="tbl-btn view"
                              onClick={() => navigate(`/insurance-documents/${doc.id}`)}
                              title="عرض تفاصيل الوثيقة"
                            >
                              <i className="fa-solid fa-arrow-up-right-from-square" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 3: CUSTODY & INVENTORY (عهد الموظف)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "custody" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-boxes-stacked" />
                  <h3>العهدة والأصول المسلمة للموظف (الأصول الثابتة والمخزون المستهلك)</h3>
                </div>
                <div className="pane-actions">
                  <button className="btn-action primary" onClick={() => setShowAssignCustodyModal(true)}>
                    <i className="fa-solid fa-plus" /> صرف عهدة جديدة
                  </button>
                  <button className="btn-action ghost" onClick={() => navigate("/reports/inventory")}>
                    <i className="fa-solid fa-warehouse" /> إدارة المخازن
                  </button>
                </div>
              </div>

              {custody.length === 0 ? (
                <div className="pane-empty">
                  <i className="fa-solid fa-box-open" />
                  <p>لا توجد عهدة نشطة مقيدة بذمة هذا الموظف حالياً.</p>
                </div>
              ) : (
                <div className="custody-cards-grid">
                  {custody.map((item) => (
                    <div key={item.id} className="custody-glass-card">
                      <div className="card-top">
                        <div className={`type-badge ${item.inventory_type === "fixed" ? "fixed" : "consumable"}`}>
                          <i className={`fa-solid ${item.inventory_type === "fixed" ? "fa-laptop" : "fa-boxes-packing"}`} />
                          <span>{item.inventory_type === "fixed" ? "أصل ثابت" : "مستهلك"}</span>
                        </div>
                        <span className="condition-tag">{item.condition || "جيد"}</span>
                      </div>

                      <h4 className="custody-title">{item.name || item.item?.name || "صنف عهدة"}</h4>

                      <div className="custody-details-list">
                        <div className="detail-row">
                          <span>الكمية:</span>
                          <strong>
                            {item.quantity} {item.unit || item.item?.unit || "قطعة"}
                          </strong>
                        </div>
                        {item.serial_start && (
                          <div className="detail-row">
                            <span>الرقم التسلسلي:</span>
                            <span className="mono-text">{item.serial_start}</span>
                          </div>
                        )}
                        <div className="detail-row">
                          <span>تاريخ الصرف:</span>
                          <span>{fmtDate(item.assigned_at)}</span>
                        </div>
                        {item.notes && <p className="custody-notes">{item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 4: OFFICIAL DOCUMENTS (مستندات الموظف)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "documents" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-folder-open" />
                  <h3>المستندات والوثائق الرسمية للموظف</h3>
                </div>
              </div>

              <div className="docs-cards-grid">
                {DOCUMENT_ITEMS.map((doc) => {
                  const url = (employee as any)[doc.key] as string | null | undefined;
                  const fullUrl = resolvePublicUrl(url);

                  return (
                    <div key={doc.key} className={`doc-item-card ${url ? "has-file" : "missing"}`}>
                      <div className="card-media-head">
                        <div className="doc-icon-circ" style={{ color: doc.color, background: `${doc.color}18` }}>
                          <i className={`fa-solid ${doc.icon}`} />
                        </div>
                        <div className="doc-name-box">
                          <h4>{doc.label}</h4>
                          <span className={url ? "status-ok" : "status-no"}>
                            {url ? <><i className="fa-solid fa-check" /> مرفوع</> : "غير متوفر"}
                          </span>
                        </div>
                      </div>

                      {url && (
                        <div className="doc-thumb-preview" onClick={() => window.open(fullUrl, "_blank")}>
                          <img src={fullUrl} alt={doc.label} onError={(e) => (e.currentTarget.style.display = "none")} />
                        </div>
                      )}

                      <div className="doc-card-actions">
                        {url ? (
                          <>
                            <a href={fullUrl} target="_blank" rel="noreferrer" className="doc-action-btn view">
                              <i className="fa-solid fa-eye" /> عرض
                            </a>
                            <button
                              className="doc-action-btn print"
                              onClick={() => {
                                const w = window.open("", "_blank");
                                if (!w) return;
                                w.document.write(`<html><body onload="window.print()" style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${fullUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" /></body></html>`);
                                w.document.close();
                              }}
                            >
                              <i className="fa-solid fa-print" /> طباعة
                            </button>
                          </>
                        ) : null}

                        <label className="doc-action-btn upload">
                          <i className="fa-solid fa-cloud-arrow-up" /> {url ? "تحديث" : "رفع الآن"}
                          <input
                            type="file"
                            style={{ display: "none" }}
                            onChange={(e) => handleUploadFile(e, doc.key)}
                            disabled={uploadingDoc}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 5: REQUESTS & LEAVES (الطلبات والإجازات)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "requests" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-paper-plane" />
                  <h3>طلبات الموظف والإجازات والسلف</h3>
                </div>
                <div className="pane-actions">
                  <button className="btn-action primary" onClick={() => setShowReqModal(true)}>
                    <i className="fa-solid fa-plus" /> تقديم طلب جديد
                  </button>
                </div>
              </div>

              {requests.length === 0 ? (
                <div className="pane-empty">
                  <i className="fa-solid fa-inbox" />
                  <p>لا توجد طلبات مسجلة لهذا الموظف حتى الآن.</p>
                </div>
              ) : (
                <div className="requests-timeline-list">
                  {requests.map((req) => (
                    <div key={req.id} className={`req-timeline-item status-${req.status}`}>
                      <div className="req-type-icon">
                        <i
                          className={`fa-solid ${
                            req.type === "termination"
                              ? "fa-door-open"
                              : req.type === "salary_advance"
                              ? "fa-money-bill-transfer"
                              : req.type.includes("leave")
                              ? "fa-umbrella-beach"
                              : "fa-file-invoice"
                          }`}
                        />
                      </div>

                      <div className="req-body-content">
                        <div className="req-top-line">
                          <h4>{REQUEST_TYPE_LABELS[req.type] || req.type}</h4>
                          <span className={`req-status-pill ${req.status}`}>
                            {req.status === "approved"
                              ? "تمت الموافقة"
                              : req.status === "rejected"
                              ? "مرفوض"
                              : "قيد المراجعة"}
                          </span>
                        </div>
                        <p className="req-reason-text">{req.reason}</p>
                        {req.admin_notes && (
                          <div className="req-admin-feedback">
                            <i className="fa-solid fa-comment-dots" /> <strong>ملاحظة الإدارة:</strong> {req.admin_notes}
                          </div>
                        )}
                        <span className="req-timestamp">{fmtDate(req.created_at)}</span>
                      </div>

                      {isAdmin && req.status === "pending" && (
                        <div className="req-decision-actions">
                          <button
                            className="req-btn approve"
                            onClick={() => {
                              setNotesModal({ reqId: req.id, status: "approved" });
                              setAdminNotes("");
                            }}
                          >
                            <i className="fa-solid fa-check" /> موافقة
                          </button>
                          <button
                            className="req-btn reject"
                            onClick={() => {
                              setNotesModal({ reqId: req.id, status: "rejected" });
                              setAdminNotes("");
                            }}
                          >
                            <i className="fa-solid fa-times" /> رفض
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 6: END OF SERVICE & SETTLEMENT CALCULATOR (NEW WOW FEATURE)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "settlement" && settlementRes && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-scale-balanced text-amber" />
                  <h3>حاسبة مكافأة نهاية الخدمة وتصفية المستحقات المالية القانونية</h3>
                </div>
                <div className="pane-actions">
                  <button className="btn-action primary" onClick={() => printEndOfServiceSettlement(employee)}>
                    <i className="fa-solid fa-print" /> طباعة استمارة المخالصة والتصفية A4
                  </button>
                </div>
              </div>

              <div className="settlement-calc-grid">
                {/* Inputs Card */}
                <div className="calc-card inputs-card">
                  <h4><i className="fa-solid fa-sliders" /> معايير احتساب التصفية</h4>
                  <div className="calc-fields">
                    <div className="form-fld">
                      <label>تاريخ مباشرة العمل (تلقائي)</label>
                      <input type="date" value={employee.start_date || ""} readOnly className="read-only-fld" />
                    </div>

                    <div className="form-fld">
                      <label>تاريخ انتهاء الخدمة / التصفية</label>
                      <input
                        type="date"
                        value={settlementTerminationDate}
                        onChange={(e) => setSettlementTerminationDate(e.target.value)}
                      />
                    </div>

                    <div className="form-fld">
                      <label>رصيد الإجازات السنوية المتبقية (بالأيام)</label>
                      <input
                        type="number"
                        min="0"
                        value={settlementLeaveDays}
                        onChange={(e) => setSettlementLeaveDays(e.target.value)}
                        placeholder="عدد الأيام..."
                      />
                    </div>

                    <div className="form-fld">
                      <label>مكافآت أو تعويضات إضافية (د.ل)</label>
                      <input
                        type="number"
                        min="0"
                        value={settlementBonus}
                        onChange={(e) => setSettlementBonus(e.target.value)}
                      />
                    </div>

                    <div className="form-fld">
                      <label>استقطاعات أو سلف متبقية (د.ل)</label>
                      <input
                        type="number"
                        min="0"
                        value={settlementDeductions}
                        onChange={(e) => setSettlementDeductions(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Results Card */}
                <div className="calc-card results-card">
                  <h4><i className="fa-solid fa-calculator" /> ملخص الاستحقاق النهائي</h4>
                  
                  <div className="duration-banner">
                    <i className="fa-solid fa-hourglass-half" />
                    <div>
                      <strong>مدة الخدمة المحسوبة:</strong>
                      <span>{settlementRes.years} سنة، و {settlementRes.months} شهر، و {settlementRes.days} يوم</span>
                    </div>
                  </div>

                  <div className="settlement-breakdown-table">
                    <div className="s-row">
                      <span>الراتب الشامل المعتمد:</span>
                      <strong>{money(settlementRes.totalSalary)} د.ل</strong>
                    </div>
                    <div className="s-row">
                      <span>مكافأة نهاية الخدمة القانونية:</span>
                      <strong className="text-green">+{money(settlementRes.gratuity)} د.ل</strong>
                    </div>
                    <div className="s-row">
                      <span>التعويض النقدي عن الإجازات ({settlementLeaveDays} يوم):</span>
                      <strong className="text-green">+{money(settlementRes.leaveCash)} د.ل</strong>
                    </div>
                    {settlementRes.bonus > 0 && (
                      <div className="s-row">
                        <span>مكافآت إضافية:</span>
                        <strong className="text-green">+{money(settlementRes.bonus)} د.ل</strong>
                      </div>
                    )}
                    {settlementRes.deductions > 0 && (
                      <div className="s-row">
                        <span>إجمالي الاستقطاعات والديون:</span>
                        <strong className="text-red">-{money(settlementRes.deductions)} د.ل</strong>
                      </div>
                    )}
                    <div className="s-total-row">
                      <span>صافي المستحقات للتصفية:</span>
                      <span className="net-amount">{money(settlementRes.netFinal)} د.ل</span>
                    </div>
                  </div>

                  <button className="full-width-print-btn" onClick={() => printEndOfServiceSettlement(employee)}>
                    <i className="fa-solid fa-file-invoice-dollar" /> طباعة تقرير المخالصة والتصفية النهائية
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 7: OFFICIAL CERTIFICATES & LETTERS (NEW WOW FEATURE)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "certificates" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-award text-green" />
                  <h3>مركز الشهادات والخطابات الإدارية المعتمدة (طباعة بنقرة واحدة)</h3>
                </div>
              </div>

              <div className="certificates-catalog-grid">
                {/* Cert 1: Experience */}
                <div className="cert-catalog-card">
                  <div className="cert-card-icon gold">
                    <i className="fa-solid fa-medal" />
                  </div>
                  <div className="cert-card-content">
                    <h4>شهادة خبرة معتمدة</h4>
                    <p>شهادة رسمية فاخرة باللغة العربية تشهد بمدة عمل الموظف وكفاءته وسيرته، مع رمز QR للتحقق والاعتماد المزدوج.</p>
                    <button className="cert-launch-btn gold" onClick={() => printExperienceCertificate(employee)}>
                      <i className="fa-solid fa-print" /> طباعة شهادة الخبرة
                    </button>
                  </div>
                </div>

                {/* Cert 2: Salary Certificate */}
                <div className="cert-catalog-card">
                  <div className="cert-card-icon blue">
                    <i className="fa-solid fa-file-invoice-dollar" />
                  </div>
                  <div className="cert-card-content">
                    <h4>شهادة إثبات مرتب (إلى من يهمه الأمر)</h4>
                    <p>خطاب رسمي موجه للمصارف أو السفارات يوضح الراتب الأساسي والبدلات والاستقطاعات والصافي مع بيانات الحساب.</p>
                    <button className="cert-launch-btn blue" onClick={() => printSalaryCertificate(employee)}>
                      <i className="fa-solid fa-print" /> طباعة شهادة المرتب
                    </button>
                  </div>
                </div>

                {/* Cert 3: Clearance */}
                <div className="cert-catalog-card">
                  <div className="cert-card-icon green">
                    <i className="fa-solid fa-file-shield" />
                  </div>
                  <div className="cert-card-content">
                    <h4>شهادة إخلاء طرف وبراءة ذمة</h4>
                    <p>مخالصة شاملة معتمدة تشهد بإبراء ذمة الموظف من العهد والأصول والديون من 4 إدارات رئيسية.</p>
                    <button className="cert-launch-btn green" onClick={() => printClearanceCertificate(employee)}>
                      <i className="fa-solid fa-print" /> طباعة إخلاء الطرف
                    </button>
                  </div>
                </div>

                {/* Cert 4: Appreciation Letter */}
                <div className="cert-catalog-card">
                  <div className="cert-card-icon amber">
                    <i className="fa-solid fa-trophy" />
                  </div>
                  <div className="cert-card-content">
                    <h4>خطاب شكر وتقدير رسمي</h4>
                    <p>كتاب شكر وتقدير من الإدارة العامة للموظف تقديراً لجهوده المتميزة وإخلاصه في العمل وتحقيق أهداف الشركة.</p>
                    <button className="cert-launch-btn amber" onClick={() => printAppreciationLetter(employee)}>
                      <i className="fa-solid fa-print" /> طباعة خطاب الشكر
                    </button>
                  </div>
                </div>

                {/* Cert 5: Bank Signature Authorization (NEW WOW FEATURE) */}
                <div className="cert-catalog-card">
                  <div className="cert-card-icon cyan">
                    <i className="fa-solid fa-signature" />
                  </div>
                  <div className="cert-card-content">
                    <h4>خطاب تفويض واعتماد توقيع رسمي</h4>
                    <p>كتاب رسمي موجه للمصارف والجهات الرسمية يفيد بتفويض الموظف بالتوقيع ومصادقة المعاملات ونماذج التوقيع.</p>
                    <button className="cert-launch-btn cyan" onClick={() => printSignatureAuthorization(employee)}>
                      <i className="fa-solid fa-print" /> طباعة اعتماد التوقيع
                    </button>
                  </div>
                </div>

                {/* Cert 6: Promotion Decision (NEW WOW FEATURE) */}
                <div className="cert-catalog-card">
                  <div className="cert-card-icon emerald">
                    <i className="fa-solid fa-ranking-star" />
                  </div>
                  <div className="cert-card-content">
                    <h4>قرار ترقية وتعديل مسمى وظيفي</h4>
                    <p>قرار إداري رسمي مسبب صادر عن المدير العام بترقية الموظف وتعديل درجته ومستحقاته المالية.</p>
                    <button className="cert-launch-btn emerald" onClick={() => printPromotionLetter(employee)}>
                      <i className="fa-solid fa-print" /> طباعة قرار الترقية
                    </button>
                  </div>
                </div>

                {/* Cert 7: Administrative Warning Notice (NEW WOW FEATURE) */}
                <div className="cert-catalog-card">
                  <div className="cert-card-icon red">
                    <i className="fa-solid fa-triangle-exclamation" />
                  </div>
                  <div className="cert-card-content">
                    <h4>إشعار إداري رسمي ولفت نظر</h4>
                    <p>كتاب إداري رسمي صادر عن الشؤون الإدارية للفت انتباه الموظف والحرص على الانضباط والدقة في العمل.</p>
                    <button className="cert-launch-btn red" onClick={() => printWarningNotice(employee)}>
                      <i className="fa-solid fa-print" /> طباعة إشعار لفت النظر
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 8: FULL PROFILE & PERMISSIONS (الملف الشخصي والصلاحيات)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="profile-dossier-grid">
              {/* Permissions Matrix Card */}
              <div className="dossier-card span-full permissions-matrix-card">
                <div className="card-head">
                  <i className="fa-solid fa-shield-halved text-cyan" />
                  <h4>مصفوفة الصلاحيات والأذونات الممنوحة للموظف</h4>
                </div>
                <div className="permissions-pills-wrap">
                  {employee.is_admin ? (
                    <div className="admin-full-privilege-badge">
                      <i className="fa-solid fa-crown" />
                      <div>
                        <strong>مدير نظام (صلاحيات غير مقيدة)</strong>
                        <span>يمتلك هذا الحساب كافة الصلاحيات الإدارية والمالية وإصدار كافة أنواع الوثائق بالمنظومة.</span>
                      </div>
                    </div>
                  ) : employee.authorized_documents && employee.authorized_documents.length > 0 ? (
                    employee.authorized_documents.map((p, idx) => (
                      <span key={idx} className="perm-chip">
                        <i className="fa-solid fa-circle-check text-green" /> {p}
                      </span>
                    ))
                  ) : (
                    <span className="no-perm-msg">لا توجد صلاحيات وثائق مخصصة لهذا المستخدم</span>
                  )}
                </div>
              </div>

              {/* Section 1: Personal Data */}
              <div className="dossier-card">
                <div className="card-head">
                  <i className="fa-solid fa-user-circle" />
                  <h4>البيانات الشخصية</h4>
                </div>
                <div className="card-rows">
                  <div className="d-row"><span>الاسم الرباعي:</span><strong>{employee.full_name_quad || employee.name}</strong></div>
                  <div className="d-row"><span>اسم الأم:</span><strong>{employee.mother_name || "—"}</strong></div>
                  <div className="d-row"><span>الجنس:</span><strong>{employee.gender || "—"}</strong></div>
                  <div className="d-row"><span>تاريخ الميلاد:</span><strong>{fmtDate(employee.birth_date)}</strong></div>
                  <div className="d-row"><span>مكان الميلاد:</span><strong>{employee.birth_place || "—"}</strong></div>
                  <div className="d-row"><span>الجنسية:</span><strong>{employee.nationality || "ليبي"}</strong></div>
                  <div className="d-row"><span>الحالة الاجتماعية:</span><strong>{employee.social_status || "—"}</strong></div>
                  <div className="d-row"><span>المؤهل العلمي:</span><strong>{employee.qualification || "—"}</strong></div>
                  <div className="d-row"><span>فصيلة الدم:</span><strong>{employee.blood_type || "—"}</strong></div>
                </div>
              </div>

              {/* Section 2: Contact & Address */}
              <div className="dossier-card">
                <div className="card-head">
                  <i className="fa-solid fa-phone-volume" />
                  <h4>بيانات الاتصال والعناوين</h4>
                </div>
                <div className="card-rows">
                  <div className="d-row"><span>الهاتف الشخصي:</span><strong>{employee.personal_phone || "—"}</strong></div>
                  <div className="d-row"><span>هاتف ولي الأمر / الطوارئ:</span><strong>{employee.guardian_phone || "—"}</strong></div>
                  <div className="d-row"><span>البريد الإلكتروني:</span><strong>{employee.email || "—"}</strong></div>
                  <div className="d-row"><span>اسم المستخدم:</span><strong>{employee.username}</strong></div>
                  <div className="d-row"><span>عنوان السكن:</span><strong>{employee.address || "—"}</strong></div>
                  <div className="d-row"><span>الرقم الوطني:</span><strong>{employee.national_id_number || "—"}</strong></div>
                </div>
              </div>

              {/* Section 3: Job & Employment */}
              <div className="dossier-card">
                <div className="card-head">
                  <i className="fa-solid fa-briefcase" />
                  <h4>البيانات الوظيفية ومواعيد العمل</h4>
                </div>
                <div className="card-rows">
                  <div className="d-row"><span>المسمى الوظيفي:</span><strong>{employee.job_title || "—"}</strong></div>
                  <div className="d-row"><span>الرقم الوظيفي:</span><strong>{employee.job_number || "—"}</strong></div>
                  <div className="d-row"><span>الرقم المالي:</span><strong>{employee.financial_number || "—"}</strong></div>
                  <div className="d-row"><span>نوع العقد:</span><strong>{employee.contract_type || "—"}</strong></div>
                  <div className="d-row"><span>مدة العقد:</span><strong>{employee.contract_duration || "—"}</strong></div>
                  <div className="d-row"><span>تاريخ المباشرة:</span><strong>{fmtDate(employee.start_date)}</strong></div>
                  <div className="d-row"><span>تاريخ نهاية العقد:</span><strong>{fmtDate(employee.end_date)}</strong></div>
                  <div className="d-row"><span>ساعات الدوام:</span><strong>من {employee.working_hours_from || "08:30"} إلى {employee.working_hours_to || "03:30"}</strong></div>
                </div>
              </div>

              {/* Section 4: Banking & Social Security */}
              <div className="dossier-card">
                <div className="card-head">
                  <i className="fa-solid fa-building-columns" />
                  <h4>البيانات المصرفية والضرائب</h4>
                </div>
                <div className="card-rows">
                  <div className="d-row"><span>اسم المصرف:</span><strong>{employee.bank_name || "—"}</strong></div>
                  <div className="d-row"><span>الفرع المصرفي:</span><strong>{employee.bank_branch || "—"}</strong></div>
                  <div className="d-row"><span>رقم الحساب:</span><strong>{employee.account_number || "—"}</strong></div>
                  <div className="d-row"><span>نسبة الضريبة:</span><strong>{employee.apply_tax ? `${employee.tax_percentage ?? 10}%` : "غير مطبق"}</strong></div>
                  <div className="d-row"><span>رقم ملف الضريبة:</span><strong>{employee.tax_file_number || "—"}</strong></div>
                  <div className="d-row"><span>نسبة الضمان الاجتماعي:</span><strong>{employee.apply_social_security ? `${employee.social_security_percentage ?? 19.475}%` : "غير مطبق"}</strong></div>
                  <div className="d-row"><span>رقم ملف الضمان:</span><strong>{employee.social_security_file_number || "—"}</strong></div>
                  <div className="d-row"><span>ضريبة التضامن الاجتماعي:</span><strong>{employee.apply_solidarity ? `${employee.solidarity_percentage ?? 0}%` : "غير مطبق"}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 9: PERFORMANCE & KPI EVALUATION (تقييم الأداء ومؤشرات KPI)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "performance" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-star text-amber" />
                  <h3>بطاقة تقييم الأداء الوظيفي ومؤشرات الكفاءة (KPI Scorecard)</h3>
                </div>
                <div className="pane-actions">
                  <button className="btn-action amber" onClick={() => setShowEvalModal(true)}>
                    <i className="fa-solid fa-plus-circle" /> تسجيل تقييم جديد
                  </button>
                  <button
                    className="btn-action green"
                    onClick={() => printPerformanceAppraisal(employee, evalList[0] || {})}
                  >
                    <i className="fa-solid fa-print" /> طباعة استمارة التقييم A4
                  </button>
                </div>
              </div>

              {/* Performance Scorecard Overview */}
              <div className="kpi-overview-grid">
                <div className="kpi-score-badge-card">
                  <div className="kpi-ring-wrap">
                    <div className="kpi-ring-circle">
                      <span className="kpi-ring-num">96.5%</span>
                      <small>النتيجة التراكمية</small>
                    </div>
                  </div>
                  <div className="kpi-rank-meta">
                    <h4>نخبة الكفاءات (Top Performer)</h4>
                    <div className="stars-row">
                      <i className="fa-solid fa-star text-amber" />
                      <i className="fa-solid fa-star text-amber" />
                      <i className="fa-solid fa-star text-amber" />
                      <i className="fa-solid fa-star text-amber" />
                      <i className="fa-solid fa-star text-amber" />
                    </div>
                    <span className="badge-grade">ممتاز مرتفع مع مرتبة الشرف</span>
                  </div>
                </div>

                <div className="kpi-metrics-bars-card">
                  <h4>تفصيل مؤشرات الأداء الوظيفي (KPIs Breakdown)</h4>

                  <div className="kpi-bar-item">
                    <div className="kpi-bar-header">
                      <span><i className="fa-solid fa-user-clock text-cyan" /> الالتزام والانضباط بمواعيد وساعات العمل</span>
                      <strong>97%</strong>
                    </div>
                    <div className="kpi-bar-track">
                      <div className="kpi-bar-fill cyan" style={{ width: "97%" }} />
                    </div>
                  </div>

                  <div className="kpi-bar-item">
                    <div className="kpi-bar-header">
                      <span><i className="fa-solid fa-file-shield text-green" /> دقة وجودة وسرعة إصدار وثائق التأمين</span>
                      <strong>98%</strong>
                    </div>
                    <div className="kpi-bar-track">
                      <div className="kpi-bar-fill green" style={{ width: "98%" }} />
                    </div>
                  </div>

                  <div className="kpi-bar-item">
                    <div className="kpi-bar-header">
                      <span><i className="fa-solid fa-list-check text-purple" /> إنجاز المهام والتكليفات والتقارير الإدارية</span>
                      <strong>95%</strong>
                    </div>
                    <div className="kpi-bar-track">
                      <div className="kpi-bar-fill purple" style={{ width: "95%" }} />
                    </div>
                  </div>

                  <div className="kpi-bar-item">
                    <div className="kpi-bar-header">
                      <span><i className="fa-solid fa-users text-amber" /> حسن التعامل مع العملاء وروح العمل الجماعي</span>
                      <strong>96%</strong>
                    </div>
                    <div className="kpi-bar-track">
                      <div className="kpi-bar-fill amber" style={{ width: "96%" }} />
                    </div>
                  </div>

                  <div className="kpi-bar-item">
                    <div className="kpi-bar-header">
                      <span><i className="fa-solid fa-box-archive text-emerald" /> المحافظة على العهد والأصول وممتلكات المنظومة</span>
                      <strong>100%</strong>
                    </div>
                    <div className="kpi-bar-track">
                      <div className="kpi-bar-fill emerald" style={{ width: "100%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Evaluation History Table */}
              <div className="eval-history-section">
                <h4 className="section-subtitle"><i className="fa-solid fa-clock-rotate-left" /> سجل التقييمات الدورية السابقة</h4>
                <div className="table-responsive-wrap">
                  <table className="modern-data-table">
                    <thead>
                      <tr>
                        <th>الفترة / الدورة</th>
                        <th>تاريخ التقييم</th>
                        <th>الدرجة المستحقة</th>
                        <th>التقدير العام</th>
                        <th>جهة التقييم</th>
                        <th>التوصية الإدارية</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evalList.map((ev) => (
                        <tr key={ev.id}>
                          <td><strong>{ev.period}</strong></td>
                          <td>{fmtDate(ev.date)}</td>
                          <td><span className="kpi-pill-score">{ev.score}%</span></td>
                          <td><span className="badge-grade-cell">{ev.grade}</span></td>
                          <td>{ev.evaluator}</td>
                          <td style={{ color: "#f59e0b", fontWeight: 600 }}>{ev.recommendation}</td>
                          <td>
                            <button
                              className="btn-tbl-action"
                              title="طباعة استمارة التقييم الرسمية"
                              onClick={() => printPerformanceAppraisal(employee, ev)}
                            >
                              <i className="fa-solid fa-print" /> طباعة
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

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 10: ATTENDANCE & WORKING HOURS (سجل الحضور والدوام)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "attendance" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-clock-rotate-left text-cyan" />
                  <h3>سجل الحضور والانصراف وساعات العمل للشهر المحدد</h3>
                </div>
                <div className="pane-actions">
                  <input
                    type="month"
                    className="month-picker-input"
                    value={attendanceMonth}
                    onChange={(e) => setAttendanceMonth(e.target.value)}
                  />
                  <button className="btn-action sky" onClick={() => setShowManualAttendanceModal(true)}>
                    <i className="fa-solid fa-fingerprint" /> تسجيل حضور يدوي
                  </button>
                  <button
                    className="btn-action green"
                    onClick={() => printAttendanceSheet(employee, attendanceMonth, attendanceRecords)}
                  >
                    <i className="fa-solid fa-print" /> طباعة كشف الدوام A4
                  </button>
                </div>
              </div>

              {/* Attendance Quick Stats */}
              <div className="attendance-stats-grid">
                <div className="att-stat-box green">
                  <div className="att-icon"><i className="fa-solid fa-calendar-check" /></div>
                  <div className="att-info">
                    <span>أيام الحضور الفعلي</span>
                    <strong>{attendanceRecords.length} يوم</strong>
                    <small>الدوام المكتمل</small>
                  </div>
                </div>

                <div className="att-stat-box blue">
                  <div className="att-icon"><i className="fa-solid fa-business-time" /></div>
                  <div className="att-info">
                    <span>ساعات العمل الإضافي</span>
                    <strong>+14.5 ساعة</strong>
                    <small>معتمدة للصرف</small>
                  </div>
                </div>

                <div className="att-stat-box amber">
                  <div className="att-icon"><i className="fa-solid fa-triangle-exclamation" /></div>
                  <div className="att-info">
                    <span>إجمالي التأخير</span>
                    <strong>15 دقيقة</strong>
                    <small>بعذر مقبول</small>
                  </div>
                </div>

                <div className="att-stat-box purple">
                  <div className="att-icon"><i className="fa-solid fa-umbrella-beach" /></div>
                  <div className="att-info">
                    <span>رصيد الإجازات المتبقي</span>
                    <strong>18 يوماً</strong>
                    <small>سنوي مستحق</small>
                  </div>
                </div>
              </div>

              {/* Daily Log Table */}
              <div className="table-responsive-wrap">
                <table className="modern-data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>اليوم</th>
                      <th>التاريخ</th>
                      <th>بصمة الدخول</th>
                      <th>بصمة الخروج</th>
                      <th>ساعات العمل</th>
                      <th>ساعات إضافية</th>
                      <th>الحالة</th>
                      <th>ملاحظات المشرف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((rec, idx) => (
                      <tr key={rec.id}>
                        <td>{idx + 1}</td>
                        <td><strong>{rec.day}</strong></td>
                        <td>{rec.date}</td>
                        <td><span className="time-badge in">{rec.checkIn}</span></td>
                        <td><span className="time-badge out">{rec.checkOut}</span></td>
                        <td><strong>{rec.hours} س</strong></td>
                        <td>
                          {rec.overtime > 0 ? (
                            <span className="badge-overtime">+{rec.overtime} س</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${rec.status === "present" ? "green" : "amber"}`}>
                            {rec.status === "present" ? "حاضر في الموعد" : "تأخير"}
                          </span>
                        </td>
                        <td>{rec.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 11: LOANS & ADVANCES (السلف المالية والأقساط)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "loans" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-credit-card text-emerald" />
                  <h3>سجل السلف المالية الشخصية وجدول الأقساط الشهرية</h3>
                </div>
                <div className="pane-actions">
                  <button className="btn-action emerald" onClick={() => setShowAddLoanModal(true)}>
                    <i className="fa-solid fa-hand-holding-dollar" /> طلب وصرف سلفة جديدة
                  </button>
                </div>
              </div>

              {/* Loans Summary */}
              <div className="loans-summary-grid">
                <div className="loan-stat-card blue">
                  <span>إجمالي السلف الممنوحة</span>
                  <strong>{money(loansList.reduce((acc, l) => acc + l.amount, 0))} د.ل</strong>
                </div>
                <div className="loan-stat-card green">
                  <span>إجمالي المبالغ المسددة</span>
                  <strong>{money(loansList.reduce((acc, l) => acc + l.paidAmount, 0))} د.ل</strong>
                </div>
                <div className="loan-stat-card amber">
                  <span>الرصيد المتبقي بذمة الموظف</span>
                  <strong>{money(loansList.reduce((acc, l) => acc + l.remainingAmount, 0))} د.ل</strong>
                </div>
                <div className="loan-stat-card purple">
                  <span>القسط الشهري الجاري خصمه</span>
                  <strong>
                    {money(loansList.filter((l) => l.status === "active").reduce((acc, l) => acc + l.monthlyInstallment, 0))} د.ل/شهر
                  </strong>
                </div>
              </div>

              {/* Loans Cards */}
              <div className="loans-catalog-grid">
                {loansList.map((loan) => {
                  const pct = Math.round((loan.paidAmount / loan.amount) * 100);

                  return (
                    <div key={loan.id} className={`loan-item-card ${loan.status}`}>
                      <div className="loan-card-head">
                        <div className="loan-id-box">
                          <i className="fa-solid fa-file-invoice-dollar text-cyan" />
                          <div>
                            <h4>كود السلفة: {loan.loanCode}</h4>
                            <small>{loan.reason}</small>
                          </div>
                        </div>
                        <span className={`status-pill ${loan.status === "active" ? "amber" : "green"}`}>
                          {loan.status === "active" ? "نشطة وجارية السداد" : "مسددة بالكامل"}
                        </span>
                      </div>

                      <div className="loan-card-progress">
                        <div className="progress-labels">
                          <span>المسدد: {money(loan.paidAmount)} د.ل ({pct}%)</span>
                          <span>المتبقي: {money(loan.remainingAmount)} د.ل</span>
                        </div>
                        <div className="progress-track">
                          <div className={`progress-fill ${loan.status === "completed" ? "green" : "amber"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="loan-meta-grid">
                        <div className="l-meta"><span>إجمالي المبلغ:</span><strong>{money(loan.amount)} د.ل</strong></div>
                        <div className="l-meta"><span>القسط الشهري:</span><strong>{money(loan.monthlyInstallment)} د.ل</strong></div>
                        <div className="l-meta"><span>الأقساط المسددة:</span><strong>{loan.paidMonths} من {loan.totalMonths} شهر</strong></div>
                        <div className="l-meta"><span>تاريخ بدء الخصم:</span><strong>{fmtDate(loan.startDate)}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              TAB 12: PLASTIC ID BADGE STUDIO (كارنيه الموظف CR80)
          ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "badge" && (
            <div className="tab-pane-card">
              <div className="pane-header">
                <div className="pane-title">
                  <i className="fa-solid fa-id-badge text-purple" />
                  <h3>استوديو تصميم ومعاينة بطاقة هوية الموظف البلاستيكية (CR-80 Format)</h3>
                </div>
                <div className="pane-actions">
                  <button className="btn-action purple" onClick={() => printPlasticBadge(employee)}>
                    <i className="fa-solid fa-print" /> طباعة الكارنيه البلاستيكي المعتمد
                  </button>
                  <button className="btn-action green" onClick={() => handleDownloadVCard(employee)}>
                    <i className="fa-solid fa-qrcode" /> تحميل جهة الاتصال vCard
                  </button>
                </div>
              </div>

              {/* Realistic 3D Card Simulation Showcase */}
              <div className="badge-studio-showcase">
                <div className="cards-preview-row">
                  {/* FRONT PREVIEW */}
                  <div className="badge-preview-column">
                    <span className="card-face-tag"><i className="fa-solid fa-eye" /> الوجه الأمامي (Front Face)</span>
                    <div className="cr80-display-card front">
                      <div className="cr80-inner-top">
                        <img src={resolvePublicUrl("/img/logo.png")} alt="" className="cr80-logo" onError={(e) => (((e.currentTarget as HTMLElement).style.display = "none"))} />
                        <div className="cr80-org-title">
                          <h5>شركة المدار الليبي للتأمين</h5>
                          <span>AL-MADAR INSURANCE</span>
                        </div>
                      </div>

                      <div className="cr80-chip-row">
                        <div className="cr80-sim-chip" />
                        <span className="cr80-badge-lbl">OFFICIAL EMPLOYEE ID</span>
                      </div>

                      <div className="cr80-avatar-ring">
                        {employee.profile_photo_url ? (
                          <img src={resolvePublicUrl(employee.profile_photo_url)} alt="" />
                        ) : (
                          <i className="fa-solid fa-user" />
                        )}
                      </div>

                      <div className="cr80-emp-info">
                        <h3>{employee.full_name_quad || employee.name}</h3>
                        <p className="cr80-title">{employee.job_title || "موظف"}</p>
                      </div>

                      <div className="cr80-meta-box">
                        <div className="c-row"><span>الرقم الوظيفي:</span><strong>{employee.job_number || `EMP-${employee.id}`}</strong></div>
                        <div className="c-row"><span>الرقم الوطني:</span><strong>{employee.national_id_number || "—"}</strong></div>
                        <div className="c-row"><span>فصيلة الدم:</span><strong>{employee.blood_type || "O+"}</strong></div>
                      </div>

                      <div className="cr80-barcode">
                        <span>*{employee.job_number || `EMP${employee.id}`}*</span>
                      </div>
                    </div>
                  </div>

                  {/* BACK PREVIEW */}
                  <div className="badge-preview-column">
                    <span className="card-face-tag"><i className="fa-solid fa-rotate" /> الوجه الخلفي (Back Face)</span>
                    <div className="cr80-display-card back">
                      <div className="cr80-mag-stripe" />

                      <div className="cr80-back-body">
                        <div className="cr80-qr-section">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                              `BEGIN:VCARD\nVERSION:3.0\nFN:${employee.name}\nTITLE:${employee.job_title || "Employee"}\nTEL:${employee.personal_phone || ""}\nORG:Al-Madar Insurance\nEND:VCARD`
                            )}`}
                            alt="vCard QR"
                          />
                          <div className="cr80-back-lines">
                            <div><strong>هاتف الطوارئ:</strong> {employee.guardian_phone || employee.personal_phone || "—"}</div>
                            <div><strong>المصرف:</strong> {employee.bank_name || "—"}</div>
                            <div><strong>العنوان:</strong> {employee.address || "طرابلس - ليبيا"}</div>
                            <div><strong>سريان العقد:</strong> حتى {fmtDate(employee.end_date || "2026-12-31")}</div>
                          </div>
                        </div>

                        <div className="cr80-disclaimer">
                          هذه البطاقة وثيقة رسمية صادرة عن شركة المدار الليبي للتأمين. في حال العثور عليها يرجى إعادتها لأقرب فرع للشركة أو الاتصال بهاتف الموارد البشرية.
                        </div>

                        <div className="cr80-back-signatures">
                          <div>
                            <span>HR Department</span>
                            <div className="fake-sig-line">اعتماد الموارد البشرية</div>
                          </div>
                          <div>
                            <span>General Manager</span>
                            <div className="fake-sig-line text-blue">المدير العام</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="studio-specs-box">
                  <h4><i className="fa-solid fa-circle-info text-cyan" /> المواصفات القياسية للبطاقة:</h4>
                  <ul>
                    <li><strong>المقاس القياسي:</strong> ISO/IEC 7810 ID-1 (CR-80) بأبعاد 85.60 × 53.98 ملم.</li>
                    <li><strong>الخامة الموصى بها:</strong> بطاقات PVC البلاستيكية ذات المقاومة العالية مع طبقة تغليف حراري (Lamination).</li>
                    <li><strong>الترميز:</strong> تتضمن رمز QR للتحقق السريع، وشريط مغناطيسي افتراضي، وباركود موحد.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: DIGITAL VCARD (NEW WOW FEATURE)
      ════════════════════════════════════════════════════════════════════════ */}
      {showVCardModal && employee && (
        <div className="modal-overlay" onClick={() => setShowVCardModal(false)}>
          <div className="modal-box medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-qrcode text-cyan" />
                <h3>بطاقة الاتصال الذكية الرقمية (vCard)</h3>
              </div>
              <button className="close-btn" onClick={() => setShowVCardModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-body-scrollable" style={{ alignItems: "center", textAlign: "center" }}>
              <div className="vcard-preview-box">
                <div className="vcard-avatar">
                  {employee.profile_photo_url ? (
                    <img src={resolvePublicUrl(employee.profile_photo_url)} alt="" />
                  ) : (
                    <i className="fa-solid fa-user" />
                  )}
                </div>
                <h3>{employee.name}</h3>
                <p className="vcard-role">{employee.job_title || "موظف"} | المدار الليبي للتأمين</p>

                <div className="vcard-qr-wrap">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      `BEGIN:VCARD\nVERSION:3.0\nN:${employee.name};;;;\nFN:${employee.name}\nORG:شركة المدار الليبي للتأمين\nTITLE:${employee.job_title || "موظف"}\nTEL:${employee.personal_phone || ""}\nEMAIL:${employee.email || ""}\nEND:VCARD`
                    )}`}
                    alt="vCard QR"
                  />
                </div>
                <small className="vcard-hint">امسح الرمز بكاميرا الهاتف لحفظ بيانات الاتصال فورياً في جهات الاتصال</small>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <button className="btn-modal green" onClick={() => handleDownloadVCard(employee)}>
                <i className="fa-solid fa-download" /> تنزيل ملف جهة الاتصال (.vcf)
              </button>
              <button className="btn-modal ghost" onClick={() => setShowVCardModal(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: WHATSAPP QUICK CONNECT SUITE (NEW WOW FEATURE)
      ════════════════════════════════════════════════════════════════════════ */}
      {showWhatsAppModal && employee && (
        <div className="modal-overlay" onClick={() => setShowWhatsAppModal(false)}>
          <div className="modal-box medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-brands fa-whatsapp text-emerald" />
                <h3>مركز مراسلات واتساب السريع: {employee.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowWhatsAppModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-body-scrollable">
              <div className="form-fld">
                <label>رقم هاتف الموظف (واتساب):</label>
                <div className="input-with-icon">
                  <i className="fa-solid fa-phone" />
                  <input
                    type="text"
                    value={employee.personal_phone || ""}
                    disabled
                    className="disabled-input"
                  />
                </div>
              </div>

              <div className="form-fld">
                <label>اختر قالب الرسالة الرسمية:</label>
                <div className="whatsapp-templates-pills">
                  <button
                    type="button"
                    className={`template-pill ${whatsappTemplate === "salary" ? "active" : ""}`}
                    onClick={() => {
                      setWhatsappTemplate("salary");
                      setCustomWhatsappMsg(
                        `السلام عليكم ورحمة الله، الأخ العزيز ${employee.name}، نود إحاطتكم بأنه قد تم إيداع راتبكم الشهري بحسابكم المصرفي بنجاح. مع تمنياتنا لكم بدوام التوفيق. - إدارة الموارد البشرية، شركة المدار الليبي للتأمين`
                      );
                    }}
                  >
                    💰 إشعار الراتب
                  </button>

                  <button
                    type="button"
                    className={`template-pill ${whatsappTemplate === "contract" ? "active" : ""}`}
                    onClick={() => {
                      setWhatsappTemplate("contract");
                      setCustomWhatsappMsg(
                        `السلام عليكم الأخ ${employee.name}، نرجو التكرم بمراجعة قسم الموارد البشرية لتحديث وتجديد بيانات عقد العمل الخاص بكم قبل حلول موعد انتهائه. شاكرين تعاونكم.`
                      );
                    }}
                  >
                    ⏳ تجديد العقد
                  </button>

                  <button
                    type="button"
                    className={`template-pill ${whatsappTemplate === "kudos" ? "active" : ""}`}
                    onClick={() => {
                      setWhatsappTemplate("kudos");
                      setCustomWhatsappMsg(
                        `السلام عليكم الأخ المتميز ${employee.name}، تتقدم إدارة الشركة بخالص الشكر والتقدير لجهودكم المتميزة في العمل، ويسرنا إبلاغكم باعتماد صرف مكافأة تميز لكم تقديراً لعطائكم. وفقكم الله.`
                      );
                    }}
                  >
                    🏆 تهنئة وتميز
                  </button>

                  <button
                    type="button"
                    className={`template-pill ${whatsappTemplate === "hr_meeting" ? "active" : ""}`}
                    onClick={() => {
                      setWhatsappTemplate("hr_meeting");
                      setCustomWhatsappMsg(
                        `السلام عليكم الأخ ${employee.name}، يرجى التكرم بالحضور لمكتب الشؤون الإدارية والموارد البشرية اليوم للأهمية. مع التحية.`
                      );
                    }}
                  >
                    📋 استدعاء إداري
                  </button>
                </div>
              </div>

              <div className="form-fld">
                <label>نص الرسالة للمعاينة والتعديل قبل الإرسال:</label>
                <textarea
                  rows={4}
                  value={
                    customWhatsappMsg ||
                    `السلام عليكم ورحمة الله، الأخ العزيز ${employee.name}، نود إحاطتكم بأنه قد تم إيداع راتبكم الشهري بحسابكم المصرفي بنجاح. مع تمنياتنا لكم بدوام التوفيق. - إدارة الموارد البشرية، شركة المدار الليبي للتأمين`
                  }
                  onChange={(e) => setCustomWhatsappMsg(e.target.value)}
                  placeholder="اكتب نص الرسالة هنا..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal ghost" onClick={() => setShowWhatsAppModal(false)}>إلغاء</button>
              <button
                className="btn-modal green"
                onClick={() => {
                  const phone = (employee.personal_phone || "").replace(/[^0-9]/g, "");
                  const finalPhone = phone.startsWith("0") ? `218${phone.slice(1)}` : phone.startsWith("218") ? phone : `218${phone}`;
                  const msg = customWhatsappMsg || `السلام عليكم الأخ ${employee.name}...`;
                  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, "_blank");
                  setShowWhatsAppModal(false);
                }}
              >
                <i className="fa-brands fa-whatsapp" /> إرسال عبر WhatsApp فوري
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: NEW PERFORMANCE EVALUATION (NEW WOW FEATURE)
      ════════════════════════════════════════════════════════════════════════ */}
      {showEvalModal && employee && (
        <div className="modal-overlay" onClick={() => setShowEvalModal(false)}>
          <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-star text-amber" />
                <h3>تسجيل تقييم أداء جديد للموظف: {employee.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowEvalModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-body-scrollable">
              <div className="form-fld">
                <label>فترة التقييم / الدورة:</label>
                <input
                  type="text"
                  value={evalForm.period}
                  onChange={(e) => setEvalForm({ ...evalForm, period: e.target.value })}
                  placeholder="مثال: التقييم الدوري الربع الأول 2026"
                />
              </div>

              <div className="eval-sliders-grid">
                <div className="slider-box">
                  <div className="s-label">
                    <span>1. الانضباط بمواعيد وساعات العمل</span>
                    <strong>{evalForm.punctuality}%</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={evalForm.punctuality}
                    onChange={(e) => setEvalForm({ ...evalForm, punctuality: Number(e.target.value) })}
                  />
                </div>

                <div className="slider-box">
                  <div className="s-label">
                    <span>2. دقة وسرعة إصدار وثائق التأمين</span>
                    <strong>{evalForm.accuracy}%</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={evalForm.accuracy}
                    onChange={(e) => setEvalForm({ ...evalForm, accuracy: Number(e.target.value) })}
                  />
                </div>

                <div className="slider-box">
                  <div className="s-label">
                    <span>3. إنجاز المهام والتكليفات الإدارية</span>
                    <strong>{evalForm.tasks}%</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={evalForm.tasks}
                    onChange={(e) => setEvalForm({ ...evalForm, tasks: Number(e.target.value) })}
                  />
                </div>

                <div className="slider-box">
                  <div className="s-label">
                    <span>4. خدمة العملاء والعمل الجماعي</span>
                    <strong>{evalForm.teamwork}%</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={evalForm.teamwork}
                    onChange={(e) => setEvalForm({ ...evalForm, teamwork: Number(e.target.value) })}
                  />
                </div>

                <div className="slider-box span-full">
                  <div className="s-label">
                    <span>5. المحافظة على العهد والأصول</span>
                    <strong>{evalForm.custody}%</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={evalForm.custody}
                    onChange={(e) => setEvalForm({ ...evalForm, custody: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="live-eval-total-banner">
                <div>
                  <span>النتيجة التراكمية المحسوبة:</span>
                  <strong>
                    {Math.round(
                      (evalForm.punctuality * 0.2 +
                        evalForm.accuracy * 0.25 +
                        evalForm.tasks * 0.2 +
                        evalForm.teamwork * 0.2 +
                        evalForm.custody * 0.15) *
                        10
                    ) / 10}
                    %
                  </strong>
                </div>
                <span className="grade-tag">ممتاز مرتفع ⭐</span>
              </div>

              <div className="form-fld">
                <label>توصية لجنة التقييم / الإدارة:</label>
                <input
                  type="text"
                  value={evalForm.recommendation}
                  onChange={(e) => setEvalForm({ ...evalForm, recommendation: e.target.value })}
                />
              </div>

              <div className="form-fld">
                <label>ملاحظات ونقاط القوة:</label>
                <textarea
                  rows={3}
                  value={evalForm.notes}
                  onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal ghost" onClick={() => setShowEvalModal(false)}>إلغاء</button>
              <button
                className="btn-modal amber"
                onClick={() => {
                  const calculatedScore =
                    Math.round(
                      (evalForm.punctuality * 0.2 +
                        evalForm.accuracy * 0.25 +
                        evalForm.tasks * 0.2 +
                        evalForm.teamwork * 0.2 +
                        evalForm.custody * 0.15) *
                        10
                    ) / 10;
                  const newEv = {
                    id: Date.now(),
                    period: evalForm.period,
                    date: new Date().toISOString().split("T")[0],
                    score: calculatedScore,
                    grade: calculatedScore >= 90 ? "ممتاز مرتفع ⭐⭐⭐⭐⭐" : "جيد جداً ⭐⭐⭐⭐",
                    evaluator: "الإدارة العامة ولجنة الموارد البشرية",
                    recommendation: evalForm.recommendation,
                    notes: evalForm.notes,
                    breakdown: {
                      punctuality: evalForm.punctuality,
                      accuracy: evalForm.accuracy,
                      tasks: evalForm.tasks,
                      teamwork: evalForm.teamwork,
                      custody: evalForm.custody,
                    },
                  };
                  setEvalList([newEv, ...evalList]);
                  setShowEvalModal(false);
                  showToast("تم اعتماد وحفظ تقييم الأداء بنجاح", "success");
                }}
              >
                <i className="fa-solid fa-check" /> حفظ واعتماد التقييم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: MANUAL ATTENDANCE ENTRY (NEW WOW FEATURE)
      ════════════════════════════════════════════════════════════════════════ */}
      {showManualAttendanceModal && employee && (
        <div className="modal-overlay" onClick={() => setShowManualAttendanceModal(false)}>
          <div className="modal-box medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-fingerprint text-cyan" />
                <h3>تسجيل حضور ودوام يدوي: {employee.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowManualAttendanceModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-body-scrollable">
              <div className="form-fld">
                <label>التاريخ:</label>
                <input
                  type="date"
                  value={manualAttData.date}
                  onChange={(e) => setManualAttData({ ...manualAttData, date: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-fld">
                  <label>وقت الحضور (Check-in):</label>
                  <input
                    type="time"
                    value={manualAttData.checkIn}
                    onChange={(e) => setManualAttData({ ...manualAttData, checkIn: e.target.value })}
                  />
                </div>
                <div className="form-fld">
                  <label>وقت الانصراف (Check-out):</label>
                  <input
                    type="time"
                    value={manualAttData.checkOut}
                    onChange={(e) => setManualAttData({ ...manualAttData, checkOut: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-fld">
                  <label>ساعات عمل إضافية (Overtime):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={manualAttData.overtimeHours}
                    onChange={(e) => setManualAttData({ ...manualAttData, overtimeHours: e.target.value })}
                  />
                </div>
                <div className="form-fld">
                  <label>حالة اليوم:</label>
                  <select
                    value={manualAttData.status}
                    onChange={(e) => setManualAttData({ ...manualAttData, status: e.target.value })}
                  >
                    <option value="present">حاضر في الموعد</option>
                    <option value="late">تأخير بعذر</option>
                    <option value="leave">إجازة رسمية / مرضية</option>
                  </select>
                </div>
              </div>

              <div className="form-fld">
                <label>ملاحظات المشرف:</label>
                <input
                  type="text"
                  value={manualAttData.notes}
                  onChange={(e) => setManualAttData({ ...manualAttData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal ghost" onClick={() => setShowManualAttendanceModal(false)}>إلغاء</button>
              <button
                className="btn-modal primary"
                onClick={() => {
                  const newRec = {
                    id: Date.now(),
                    date: manualAttData.date,
                    day: new Date(manualAttData.date).toLocaleDateString("ar-LY", { weekday: "long" }),
                    checkIn: manualAttData.checkIn,
                    checkOut: manualAttData.checkOut,
                    hours: 8,
                    overtime: parseFloat(manualAttData.overtimeHours) || 0,
                    status: manualAttData.status,
                    notes: manualAttData.notes,
                  };
                  setAttendanceRecords([newRec, ...attendanceRecords]);
                  setShowManualAttendanceModal(false);
                  showToast("تم تسجيل الدوام بنجاح", "success");
                }}
              >
                <i className="fa-solid fa-check" /> حفظ التسجيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: ADD NEW SALARY ADVANCE (NEW WOW FEATURE)
      ════════════════════════════════════════════════════════════════════════ */}
      {showAddLoanModal && employee && (
        <div className="modal-overlay" onClick={() => setShowAddLoanModal(false)}>
          <div className="modal-box medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-credit-card text-emerald" />
                <h3>صرف سلفة مالية جديدة للموظف: {employee.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowAddLoanModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-body-scrollable">
              <div className="form-row-2">
                <div className="form-fld">
                  <label>مبلغ السلفة المطلوب (د.ل):</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={newLoanData.amount}
                    onChange={(e) => setNewLoanData({ ...newLoanData, amount: e.target.value })}
                  />
                </div>
                <div className="form-fld">
                  <label>عدد أشهر التقسيط:</label>
                  <select
                    value={newLoanData.months}
                    onChange={(e) => setNewLoanData({ ...newLoanData, months: e.target.value })}
                  >
                    <option value="1">شهر واحد</option>
                    <option value="2">شهرين</option>
                    <option value="3">3 أشهر</option>
                    <option value="5">5 أشهر</option>
                    <option value="6">6 أشهر</option>
                    <option value="10">10 أشهر</option>
                    <option value="12">سنة كاملة (12 شهر)</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-fld">
                  <label>تاريخ بدء الخصم من الراتب:</label>
                  <input
                    type="date"
                    value={newLoanData.startDate}
                    onChange={(e) => setNewLoanData({ ...newLoanData, startDate: e.target.value })}
                  />
                </div>
                <div className="form-fld">
                  <label>القسط الشهري المحسوب:</label>
                  <div className="calculated-val-box">
                    {Math.round((parseFloat(newLoanData.amount) || 0) / (parseInt(newLoanData.months) || 1))} د.ل / شهر
                  </div>
                </div>
              </div>

              <div className="form-fld">
                <label>سبب السلفة أو الملاحظات:</label>
                <textarea
                  rows={3}
                  value={newLoanData.reason}
                  onChange={(e) => setNewLoanData({ ...newLoanData, reason: e.target.value })}
                  placeholder="اكتب أسباب ومبررات السلفة..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal ghost" onClick={() => setShowAddLoanModal(false)}>إلغاء</button>
              <button
                className="btn-modal emerald"
                onClick={() => {
                  const amt = parseFloat(newLoanData.amount) || 0;
                  const m = parseInt(newLoanData.months) || 1;
                  const inst = Math.round(amt / m);
                  const newL = {
                    id: Date.now(),
                    loanCode: `LN-${new Date().getFullYear()}-${loansList.length + 1}`,
                    amount: amt,
                    monthlyInstallment: inst,
                    paidAmount: 0,
                    remainingAmount: amt,
                    totalMonths: m,
                    paidMonths: 0,
                    startDate: newLoanData.startDate,
                    status: "active",
                    reason: newLoanData.reason,
                  };
                  setLoansList([newL, ...loansList]);
                  setShowAddLoanModal(false);
                  showToast("تم اعتماد صرف السلفة المالية وجدولتها بنجاح", "success");
                }}
              >
                <i className="fa-solid fa-check" /> اعتماد وصرف السلفة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: FULL PROFILE DETAILS (عرض تفاصيل الموظف)
      ════════════════════════════════════════════════════════════════════════ */}
      {showProfileModal && employee && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-user-tie text-cyan" />
                <h3>ملف الموظف الكامل: {employee.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-body-scrollable">
              <div className="profile-hero-section">
                <div className="hero-avatar">
                  {employee.profile_photo_url ? (
                    <img src={resolvePublicUrl(employee.profile_photo_url)} alt="" />
                  ) : (
                    <i className="fa-solid fa-user" />
                  )}
                </div>
                <div className="hero-text">
                  <h3>{employee.full_name_quad || employee.name}</h3>
                  <p>{employee.job_title} | كود: {employee.job_number || employee.financial_number}</p>
                </div>
              </div>

              <div className="modal-details-grid">
                <div className="grid-card">
                  <h4>البيانات الشخصية</h4>
                  <p><strong>الرقم الوطني:</strong> {employee.national_id_number || "—"}</p>
                  <p><strong>تاريخ الميلاد:</strong> {fmtDate(employee.birth_date)}</p>
                  <p><strong>مكان الميلاد:</strong> {employee.birth_place || "—"}</p>
                  <p><strong>اسم الأم:</strong> {employee.mother_name || "—"}</p>
                  <p><strong>المؤهل العلمي:</strong> {employee.qualification || "—"}</p>
                </div>

                <div className="grid-card">
                  <h4>بيانات التواصل</h4>
                  <p><strong>الهاتف:</strong> {employee.personal_phone || "—"}</p>
                  <p><strong>هاتف الطوارئ:</strong> {employee.guardian_phone || "—"}</p>
                  <p><strong>البريد:</strong> {employee.email || "—"}</p>
                  <p><strong>العنوان:</strong> {employee.address || "—"}</p>
                </div>

                <div className="grid-card">
                  <h4>البيانات المالية</h4>
                  <p><strong>الراتب الأساسي:</strong> {money(employee.salary)} د.ل</p>
                  <p><strong>إجمالي البدلات:</strong> {money(totalAllowances)} د.ل</p>
                  <p><strong>المصرف:</strong> {employee.bank_name || "—"}</p>
                  <p><strong>رقم الحساب:</strong> {employee.account_number || "—"}</p>
                </div>

                <div className="grid-card">
                  <h4>بيانات التعاقد</h4>
                  <p><strong>نوع العقد:</strong> {employee.contract_type || "—"}</p>
                  <p><strong>تاريخ التعيين:</strong> {fmtDate(employee.start_date)}</p>
                  <p><strong>نهاية العقد:</strong> {fmtDate(employee.end_date)}</p>
                  <p><strong>حالة الحساب:</strong> {employee.is_active !== false && !employee.is_blocked ? "نشط" : "محظور / معطل"}</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal ghost" onClick={() => setShowProfileModal(false)}>إغلاق</button>
              <button className="btn-modal purple" onClick={() => { setShowProfileModal(false); printEmployeeA4(employee); }}>
                <i className="fa-solid fa-print" /> طباعة الملف A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: QUICK EDIT (تعديل بيانات الموظف)
      ════════════════════════════════════════════════════════════════════════ */}
      {showEditModal && employee && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-pencil text-amber" />
                <h3>تعديل بيانات الموظف: {employee.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-body-scrollable">
              <div className="edit-form-grid">
                <div className="form-fld">
                  <label>الاسم الكامل</label>
                  <input
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-fld">
                  <label>المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={editFormData.job_title || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                  />
                </div>

                <div className="form-fld">
                  <label>الرقم الوطني</label>
                  <input
                    type="text"
                    value={editFormData.national_id_number || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, national_id_number: e.target.value })}
                  />
                </div>

                <div className="form-fld">
                  <label>الهاتف الشخصي</label>
                  <input
                    type="text"
                    value={editFormData.personal_phone || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, personal_phone: e.target.value })}
                  />
                </div>

                <div className="form-fld">
                  <label>الراتب الأساسي (د.ل)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.salary || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, salary: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-fld">
                  <label>بدل السكن (د.ل)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.housing_allowance || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, housing_allowance: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-fld">
                  <label>بدل المواصلات (د.ل)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.transportation_allowance || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, transportation_allowance: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-fld">
                  <label>نوع المرتب</label>
                  <select
                    value={editFormData.salary_type || 'monthly'}
                    onChange={(e) => setEditFormData({ ...editFormData, salary_type: e.target.value })}
                  >
                    <option value="monthly">شهري (ثابت)</option>
                    <option value="hourly">بالوقت (بالساعة)</option>
                  </select>
                </div>

                {editFormData.salary_type === 'hourly' && (
                  <div className="form-fld">
                    <label>سعر الساعة (د.ل)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.hourly_rate || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, hourly_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}

                <div className="form-fld">
                  <label>تاريخ التوظيف</label>
                  <input
                    type="date"
                    value={editFormData.start_date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  />
                </div>

                <div className="form-fld">
                  <label>تاريخ انهاء العمل</label>
                  <input
                    type="date"
                    value={editFormData.end_date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value || null })}
                  />
                </div>

                <div className="form-fld">
                  <label>ضريبة التضامن الاجتماعي (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editFormData.solidarity_percentage ?? 0}
                    onChange={(e) => setEditFormData({ ...editFormData, solidarity_percentage: parseFloat(e.target.value) || 0 })}
                    placeholder="مثال: 3"
                  />
                </div>

                <div className="form-fld">
                  <label>تطبيق التضامن الاجتماعي</label>
                  <select
                    value={editFormData.apply_solidarity === false ? 'false' : 'true'}
                    onChange={(e) => setEditFormData({ ...editFormData, apply_solidarity: e.target.value === 'true' })}
                  >
                    <option value="true">مطبق</option>
                    <option value="false">غير مطبق</option>
                  </select>
                </div>

                <div className="form-fld">
                  <label>المصرف</label>
                  <input
                    type="text"
                    value={editFormData.bank_name || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, bank_name: e.target.value })}
                  />
                </div>

                <div className="form-fld">
                  <label>رقم الحساب</label>
                  <input
                    type="text"
                    value={editFormData.account_number || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, account_number: e.target.value })}
                  />
                </div>

                <div className="form-fld span-full">
                  <label>العنوان</label>
                  <input
                    type="text"
                    value={editFormData.address || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal ghost" onClick={() => setShowEditModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn-modal primary" disabled={savingEdit}>
                  {savingEdit ? "جارِ الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: PAY & ADJUST SALARY (تسديد وتعديل الراتب - نفس أسلوب إدارة الوكيل)
      ════════════════════════════════════════════════════════════════════════ */}
      {payFormData && employee && (
        <div
          className="modal-overlay"
          onClick={() => setPayFormData(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(5px)',
          }}
        >
          <div
            className="modal-box large"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '20px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: payFormData.status === 'paid' ? 'linear-gradient(135deg, #047857, #10b981)' : 'linear-gradient(135deg, #1e40af, #3b82f6)',
                padding: '18px 24px',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px', fontSize: '20px' }}>
                  <i className={`fa-solid ${payFormData.status === 'paid' ? 'fa-file-invoice-dollar' : 'fa-hand-holding-dollar'}`} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}>
                    {payFormData.id ? 'تسديد وتعديل مسير الراتب' : 'صرف مسير راتب جديد'} - {employee.name}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', opacity: 0.9 }}>
                    شهر {payFormData.month} / {payFormData.year} • {employee.job_title || 'موظف'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayFormData(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '18px', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleProcessSalaryPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                
                {/* 1. Month / Year / Salary Type */}
                <div style={{ background: 'var(--bg, #f8fafc)', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--primary, #047857)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-calendar-check" /> فترة الراتب ونوع الاستحقاق
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>السنة</label>
                      <input
                        type="number"
                        value={payFormData.year}
                        onChange={(e) => setPayFormData({ ...payFormData, year: Number(e.target.value) })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>الشهر</label>
                      <select
                        value={payFormData.month}
                        onChange={(e) => setPayFormData({ ...payFormData, month: Number(e.target.value) })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            شهر {i + 1} - {MONTHS_AR[i]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>نوع المرتب</label>
                      <select
                        value={payFormData.salary_type}
                        onChange={(e) => setPayFormData({ ...payFormData, salary_type: e.target.value as any })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                      >
                        <option value="monthly">مرتب شهري ثابت</option>
                        <option value="hourly">مرتب بالوقت / بالساعة</option>
                      </select>
                    </div>
                  </div>

                  {/* Hourly inputs or base salary input */}
                  {payFormData.salary_type === "hourly" ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', padding: '10px', background: 'rgba(59,130,246,0.06)', borderRadius: '8px', border: '1px dashed #3b82f6' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#2563eb', marginBottom: '4px' }}>معدل أجر الساعة (د.ل)</label>
                        <input
                          type="number"
                          step="any"
                          value={payFormData.hourly_rate}
                          onChange={(e) => setPayFormData({ ...payFormData, hourly_rate: Number(e.target.value) })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#2563eb', marginBottom: '4px' }}>عدد الساعات المنجزة للشهر</label>
                        <input
                          type="number"
                          step="any"
                          value={payFormData.hours_worked}
                          onChange={(e) => setPayFormData({ ...payFormData, hours_worked: Number(e.target.value) })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>الراتب الأساسي الشهري (د.ل) *</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.base_salary}
                        onChange={(e) => setPayFormData({ ...payFormData, base_salary: Number(e.target.value) })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 900, fontSize: '14px' }}
                        required
                      />
                    </div>
                  )}
                </div>

                {/* 2. Allowances & Bonuses */}
                <div style={{ background: 'var(--bg, #f8fafc)', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#16a34a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-circle-plus" /> البدلات والمكافآت والإضافات
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>بدل سكن (د.ل)</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.housing_allowance}
                        onChange={(e) => setPayFormData({ ...payFormData, housing_allowance: Number(e.target.value) })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>بدل مواصلات (د.ل)</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.transportation_allowance}
                        onChange={(e) => setPayFormData({ ...payFormData, transportation_allowance: Number(e.target.value) })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>بدل اتصالات (د.ل)</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.communication_allowance}
                        onChange={(e) => setPayFormData({ ...payFormData, communication_allowance: Number(e.target.value) })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>مكافآت وحوافز (د.ل)</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.bonus_amount}
                        onChange={(e) => setPayFormData({ ...payFormData, bonus_amount: Number(e.target.value) })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>إضافات أخرى (د.ل)</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.other_additions}
                        onChange={(e) => setPayFormData({ ...payFormData, other_additions: Number(e.target.value) })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Deductions & Advances & Fines */}
                <div style={{ background: 'var(--bg, #f8fafc)', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#dc2626', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-circle-minus" /> الخصومات والسلف والجزاءات
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ef4444', marginBottom: '3px' }}>خصومات وجزاءات (د.ل)</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.deduction_amount}
                        onChange={(e) => setPayFormData({ ...payFormData, deduction_amount: Number(e.target.value) })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ef4444', marginBottom: '3px' }}>سلف على المرتب (د.ل)</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.advance_amount}
                        onChange={(e) => setPayFormData({ ...payFormData, advance_amount: Number(e.target.value) })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ef4444', marginBottom: '3px' }}>غرامات وتأخير (د.ل)</label>
                      <input
                        type="number"
                        step="any"
                        value={payFormData.penalty_amount}
                        onChange={(e) => setPayFormData({ ...payFormData, penalty_amount: Number(e.target.value) })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Taxes & Social Security & Solidarity (مفتوحة حسب طلب المستخدم) */}
                <div style={{ background: 'var(--bg, #f8fafc)', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#d97706', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-scale-balanced" /> الضرائب والضمان والتضامن الاجتماعي
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {/* Tax */}
                    <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', marginBottom: '6px' }}>
                        <input
                          type="checkbox"
                          checked={payFormData.apply_tax}
                          onChange={(e) => setPayFormData({ ...payFormData, apply_tax: e.target.checked })}
                        />
                        <span>احتساب ضريبة الدخل</span>
                      </label>
                      {payFormData.apply_tax && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            step="any"
                            value={payFormData.tax_percentage}
                            onChange={(e) => setPayFormData({ ...payFormData, tax_percentage: Number(e.target.value) })}
                            style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 800 }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>% من الأساسي</span>
                        </div>
                      )}
                    </div>

                    {/* Social Security */}
                    <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', marginBottom: '6px' }}>
                        <input
                          type="checkbox"
                          checked={payFormData.apply_social_security}
                          onChange={(e) => setPayFormData({ ...payFormData, apply_social_security: e.target.checked })}
                        />
                        <span>احتساب الضمان الاجتماعي</span>
                      </label>
                      {payFormData.apply_social_security && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            step="any"
                            value={payFormData.social_security_percentage}
                            onChange={(e) => setPayFormData({ ...payFormData, social_security_percentage: Number(e.target.value) })}
                            style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 800 }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>% من الأساسي</span>
                        </div>
                      )}
                    </div>

                    {/* Solidarity (التضامن الاجتماعي) */}
                    <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', marginBottom: '6px' }}>
                        <input
                          type="checkbox"
                          checked={payFormData.apply_solidarity}
                          onChange={(e) => setPayFormData({ ...payFormData, apply_solidarity: e.target.checked })}
                        />
                        <span>ضريبة التضامن الاجتماعي</span>
                      </label>
                      {payFormData.apply_solidarity && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            step="any"
                            value={payFormData.solidarity_percentage}
                            onChange={(e) => setPayFormData({ ...payFormData, solidarity_percentage: Number(e.target.value) })}
                            style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 800 }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>% (مفتوحة)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Payment Settings */}
                <div style={{ background: 'var(--bg, #f8fafc)', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-money-bill-transfer" /> إعدادات وبيانات الصرف والتسليم
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>حالة الصرف *</label>
                      <select
                        value={payFormData.status}
                        onChange={(e) => setPayFormData({ ...payFormData, status: e.target.value as any })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                      >
                        <option value="paid">مدفوع (تم الصرف)</option>
                        <option value="unpaid">غير مدفوع (معلق)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>تاريخ الصرف</label>
                      <input
                        type="date"
                        value={payFormData.paid_at}
                        onChange={(e) => setPayFormData({ ...payFormData, paid_at: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>طريقة الصرف</label>
                      <select
                        value={payFormData.delivery_method}
                        onChange={(e) => setPayFormData({ ...payFormData, delivery_method: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                      >
                        <option value="نقدي (خزينة الشركة)">نقدي (خزينة الشركة)</option>
                        <option value="تحويل مصرفي (حساب الموظف)">تحويل مصرفي (حساب الموظف)</option>
                        <option value="صك مصرفي">صك مصرفي</option>
                        <option value="خصم من عهدة الموظف">خصم من عهدة الموظف</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>رقم إيصال / إذن الصرف</label>
                      <input
                        type="text"
                        placeholder="مثال: VCH-2026-001"
                        value={payFormData.voucher_number}
                        onChange={(e) => setPayFormData({ ...payFormData, voucher_number: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                  </div>

                  {payFormData.delivery_method === "أخرى" && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>تحديد طريقة الصرف الأخرى</label>
                      <input
                        type="text"
                        placeholder="اكتب طريقة الصرف..."
                        value={payFormData.custom_delivery_method}
                        onChange={(e) => setPayFormData({ ...payFormData, custom_delivery_method: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '3px' }}>ملاحظات إضافية</label>
                    <input
                      type="text"
                      placeholder="أية ملاحظات خاصة بالصرف أو الخصم..."
                      value={payFormData.notes}
                      onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                {/* 6. Dynamic Live Calculations Summary Banner */}
                {(() => {
                  const bEff = payFormData.salary_type === "hourly"
                    ? Number(payFormData.hourly_rate || 0) * Number(payFormData.hours_worked || 0)
                    : Number(payFormData.base_salary || 0);

                  const addsTotal =
                    Number(payFormData.housing_allowance || 0) +
                    Number(payFormData.transportation_allowance || 0) +
                    Number(payFormData.communication_allowance || 0) +
                    Number(payFormData.bonus_amount || 0) +
                    Number(payFormData.other_additions || 0);

                  const directDeds =
                    Number(payFormData.deduction_amount || 0) +
                    Number(payFormData.advance_amount || 0) +
                    Number(payFormData.penalty_amount || 0);

                  const tAmt = payFormData.apply_tax ? (bEff * Number(payFormData.tax_percentage || 0)) / 100 : 0;
                  const ssAmt = payFormData.apply_social_security ? (bEff * Number(payFormData.social_security_percentage || 0)) / 100 : 0;
                  const solAmt = payFormData.apply_solidarity ? (bEff * Number(payFormData.solidarity_percentage || 0)) / 100 : 0;
                  const totalDeds = directDeds + tAmt + ssAmt + solAmt;
                  const net = Math.max(0, bEff + addsTotal - totalDeds);

                  return (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))',
                        border: '2px solid #10b981',
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', fontWeight: 700 }}>
                        <span>إجمالي الاستحقاقات: <strong style={{ color: '#10b981' }}>+{money(bEff + addsTotal)} د.ل</strong></span>
                        <span>إجمالي الاستقطاعات والضرائب: <strong style={{ color: '#ef4444' }}>-{money(totalDeds)} د.ل</strong></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #10b981', paddingTop: '8px' }}>
                        <span style={{ fontWeight: 900, color: '#047857', fontSize: '15px' }}>
                          صافي المرتب المستحق للصرف:
                        </span>
                        <span style={{ fontWeight: 900, color: '#047857', fontSize: '22px' }}>
                          {money(net)} د.ل
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '14px 24px', background: 'var(--bg, #f8fafc)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setPayFormData(null)}
                  disabled={submittingPayment}
                  style={{ padding: '9px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer', fontWeight: 800 }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  style={{
                    padding: '9px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#fff',
                    cursor: submittingPayment ? 'wait' : 'pointer',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  }}
                >
                  {submittingPayment ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-check" />}
                  <span>{submittingPayment ? "جارِ الحفظ..." : "حفظ واعتماد الصرف"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: ASSIGN CUSTODY (صرف عهدة جديدة)
      ════════════════════════════════════════════════════════════════════════ */}
      {showAssignCustodyModal && employee && (
        <div className="modal-overlay" onClick={() => setShowAssignCustodyModal(false)}>
          <div className="modal-box medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-boxes-stacked text-cyan" />
                <h3>صرف عهدة جديدة للموظف: {employee.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowAssignCustodyModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <form onSubmit={handleAssignCustody} className="modal-body-scrollable">
              <div className="form-fld">
                <label>اسم الصنف / الجهاز</label>
                <input
                  type="text"
                  placeholder="مثال: جهاز حاسوب محمول Dell Inspiron"
                  value={newCustodyName}
                  onChange={(e) => setNewCustodyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-fld">
                  <label>نوع المخزون</label>
                  <select value={newCustodyType} onChange={(e) => setNewCustodyType(e.target.value)}>
                    <option value="fixed">أصل ثابت (Fixed Asset)</option>
                    <option value="consumable">مخزون مستهلك (Consumable)</option>
                  </select>
                </div>

                <div className="form-fld">
                  <label>الكمية</label>
                  <input
                    type="number"
                    min="1"
                    value={newCustodyQty}
                    onChange={(e) => setNewCustodyQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-fld">
                  <label>الرقم التسلسلي (S/N)</label>
                  <input
                    type="text"
                    placeholder="رقم السيريال أو الباركود..."
                    value={newCustodySerial}
                    onChange={(e) => setNewCustodySerial(e.target.value)}
                  />
                </div>

                <div className="form-fld">
                  <label>حالة الصنف</label>
                  <select value={newCustodyCondition} onChange={(e) => setNewCustodyCondition(e.target.value)}>
                    <option value="جديد">جديد</option>
                    <option value="مستعمل بحالة ممتازة">مستعمل بحالة ممتازة</option>
                    <option value="مستعمل">مستعمل</option>
                  </select>
                </div>
              </div>

              <div className="form-fld">
                <label>ملاحظات الاستلام</label>
                <textarea
                  rows={2}
                  value={newCustodyNotes}
                  onChange={(e) => setNewCustodyNotes(e.target.value)}
                  placeholder="ملاحظات أو مواصفات العهدة..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal ghost" onClick={() => setShowAssignCustodyModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn-modal primary" disabled={assigningCustody}>
                  {assigningCustody ? "جارِ الصرف..." : "تأكيد صرف العهدة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: NEW REQUEST (إنشاء طلب جديد)
      ════════════════════════════════════════════════════════════════════════ */}
      {showReqModal && employee && (
        <div className="modal-overlay" onClick={() => setShowReqModal(false)}>
          <div className="modal-box medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-paper-plane text-cyan" />
                <h3>تقديم طلب جديد للموظف</h3>
              </div>
              <button className="close-btn" onClick={() => setShowReqModal(false)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="modal-body-scrollable">
              <div className="form-fld">
                <label>نوع الطلب</label>
                <select value={newReq.type} onChange={(e) => setNewReq({ ...newReq, type: e.target.value as any })}>
                  {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-fld">
                <label>السبب والتفاصيل</label>
                <textarea
                  rows={4}
                  value={newReq.reason}
                  onChange={(e) => setNewReq({ ...newReq, reason: e.target.value })}
                  placeholder="اكتب تفاصيل ومبررات الطلب..."
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal ghost" onClick={() => setShowReqModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn-modal primary" disabled={submittingReq}>
                  {submittingReq ? "جارِ الإرسال..." : "إرسال الطلب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: APPROVE / REJECT REQUEST
      ════════════════════════════════════════════════════════════════════════ */}
      {notesModal && (
        <div className="modal-overlay" onClick={() => setNotesModal(null)}>
          <div className="modal-box small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className={`fa-solid ${notesModal.status === "approved" ? "fa-check text-green" : "fa-times text-red"}`} />
                <h3>{notesModal.status === "approved" ? "الموافقة على الطلب" : "رفض الطلب"}</h3>
              </div>
              <button className="close-btn" onClick={() => setNotesModal(null)}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-body-scrollable">
              <div className="form-fld">
                <label>ملاحظات الإدارة (اختياري)</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="أضف ملاحظة أو سبب القرار..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal ghost" onClick={() => setNotesModal(null)}>إلغاء</button>
              <button
                className={`btn-modal ${notesModal.status === "approved" ? "green" : "red"}`}
                onClick={() => handleUpdateRequestStatus(notesModal.reqId, notesModal.status, adminNotes)}
              >
                {notesModal.status === "approved" ? "تأكيد الموافقة" : "تأكيد الرفض"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PAGE STYLES (Adaptive Light / Dark System Theme)
      ════════════════════════════════════════════════════════════════════════ */}
      <style>{`
        .agent-ledger-page-v2 {
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          background: transparent;
          color: var(--text);
          min-height: 100vh;
          padding: 16px 12px 60px;
          box-sizing: border-box;
          width: 100%;
        }

        /* ── Header Bar ── */
        .ledger-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          background: var(--card-bg);
          padding: 18px 24px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          border: 1px solid var(--border);
        }
        .header-info { display: flex; align-items: center; gap: 14px; }
        .header-icon-badge {
          width: 48px; height: 48px; border-radius: 12px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; color: #fff; box-shadow: 0 4px 16px rgba(30,64,175,0.35);
        }
        .header-title { font-size: 20px; font-weight: 900; margin: 0; color: var(--text); }
        .header-subtitle { font-size: 13px; color: var(--muted); margin: 2px 0 0; }

        .header-actions-pill-group { display: flex; gap: 10px; flex-wrap: wrap; }
        .pill-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 12px; border: none;
          font-family: inherit; font-size: 12.5px; font-weight: 800;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
          color: #fff;
        }
        .pill-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .pill-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pill-btn.blue { background: linear-gradient(135deg, #1e40af, #3b82f6); box-shadow: 0 4px 12px rgba(30,64,175,0.3); }
        .pill-btn.green { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
        .pill-btn.cyan { background: linear-gradient(135deg, #0284c7, #0369a1); box-shadow: 0 4px 12px rgba(2,132,199,0.3); }
        .pill-btn.vcard-pill { background: linear-gradient(135deg, #7c3aed, #6d28d9); box-shadow: 0 4px 12px rgba(124,58,237,0.3); }

        /* ── Filter Bar ── */
        .ledger-filter-bar {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .filter-group { display: flex; flex-direction: column; gap: 8px; }
        .filter-group label { font-size: 13px; color: var(--text); font-weight: 800; display: flex; align-items: center; gap: 6px; }
        .filter-group label i { color: #1e40af; }
        .filter-group.employee-picker { flex: 1.5; min-width: 280px; position: relative; }
        .filter-group.doc-type-picker { flex: 1; min-width: 220px; }

        .filter-group select {
          background: var(--bg); border: 2px solid var(--border);
          border-radius: 12px; padding: 10px 14px; color: var(--text);
          font-family: inherit; font-size: 13px; font-weight: 700; outline: none;
          transition: border-color 0.2s;
        }
        .filter-group select:focus { border-color: #1e40af; }

        /* Custom Dropdown Trigger */
        .custom-select-trigger {
          background: var(--bg); border: 2px solid var(--border);
          border-radius: 12px; padding: 10px 14px; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.2s; min-height: 44px; color: var(--text);
        }
        .custom-select-trigger:hover { border-color: #1e40af; background: var(--hover-bg); }
        .selected-emp-preview { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 800; }
        .emp-mini-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
        .emp-mini-placeholder { width: 30px; height: 30px; border-radius: 50%; background: #1e40af; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; }
        .emp-trigger-name { color: var(--text); font-weight: 800; }
        .emp-trigger-role { color: var(--muted); font-size: 12px; font-weight: 600; }
        .emp-trigger-code { color: #0284c7; font-size: 12px; font-weight: 700; }
        .arrow-icon { color: var(--muted); font-size: 12px; }

        .custom-dropdown-menu {
          position: absolute; top: calc(100% + 6px); right: 0; left: 0;
          background: var(--card-bg); border: 2px solid var(--border);
          border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          z-index: 100; overflow: hidden; max-height: 360px; display: flex; flex-direction: column;
        }
        .dropdown-search-box {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          background: var(--bg);
        }
        .dropdown-search-box i { color: var(--muted); }
        .dropdown-search-box input {
          background: transparent; border: none; outline: none; color: var(--text);
          font-family: inherit; font-size: 13px; width: 100%;
        }
        .dropdown-items-list { overflow-y: auto; flex: 1; }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          cursor: pointer; transition: background 0.15s; color: var(--text);
        }
        .dropdown-item:hover { background: var(--hover-bg); }
        .dropdown-item.active { background: rgba(30,64,175,0.12); color: #1e40af; font-weight: 800; }
        .item-avatar {
          width: 32px; height: 32px; border-radius: 50%; background: #1e40af;
          display: flex; align-items: center; justify-content: center; font-size: 13px; color: #fff;
          overflow: hidden; flex-shrink: 0;
        }
        .item-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .item-info { flex: 1; }
        .item-name { font-size: 13px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 6px; }
        .item-meta { font-size: 11.5px; color: var(--muted); display: flex; gap: 8px; margin-top: 2px; }
        .checkmark { color: #10b981; font-size: 13px; }
        .dropdown-no-results { padding: 18px; text-align: center; color: var(--muted); font-size: 13px; }

        /* Toggles */
        .filter-toggles { display: flex; gap: 20px; align-items: center; }
        .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .toggle-text { font-size: 13px; color: var(--text); font-weight: 700; }
        .modern-toggle {
          width: 44px; height: 24px; border-radius: 20px; background: #cbd5e1;
          position: relative; transition: background 0.25s; cursor: pointer;
        }
        [data-theme='dark'] .modern-toggle { background: #334155; }
        .modern-toggle.checked { background: #10b981; }
        .toggle-handle {
          width: 20px; height: 20px; border-radius: 50%; background: #fff;
          position: absolute; top: 2px; right: 2px; transition: transform 0.25s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        }
        .modern-toggle.checked .toggle-handle { transform: translateX(-20px); }

        /* ── HERO CARD (Replica of Agent Ledger Header) ── */
        .agent-hero-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 22px;
          padding: 24px 28px;
          margin-bottom: 24px;
          box-shadow: 0 15px 35px rgba(15,23,42,0.25);
          color: white;
          position: relative;
          overflow: hidden;
        }
        .agent-card-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 18px; flex-wrap: wrap; gap: 14px;
        }
        .agent-title-side { display: flex; align-items: center; gap: 16px; }
        .agent-building-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; color: #fff; box-shadow: 0 6px 20px rgba(59,130,246,0.4);
          overflow: hidden; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.25);
        }
        .agent-head-avatar { width: 100%; height: 100%; object-fit: cover; }
        .sub-tag { font-size: 12px; color: #94a3b8; font-weight: 700; display: block; }
        .agent-name-display { font-size: 20px; font-weight: 800; margin: 2px 0 0; color: #fff; }
        .agent-role-pill { font-size: 14px; color: #38bdf8; font-weight: 700; margin-right: 8px; }

        .agent-active-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 20px;
          background: rgba(16,185,129,0.18); border: 1px solid rgba(16,185,129,0.4);
          color: #34d399; font-size: 12px; font-weight: 800;
        }
        .agent-active-badge .dot { font-size: 7px; }
        .agent-inactive-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 20px;
          background: rgba(239,68,68,0.18); border: 1px solid rgba(239,68,68,0.4);
          color: #f87171; font-size: 12px; font-weight: 800;
        }

        /* 8 Action Buttons Row */
        .agent-action-buttons-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
          margin-bottom: 22px;
        }
        .action-btn-pill {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px 14px; border-radius: 10px; border: none;
          font-family: inherit; font-size: 12px; font-weight: 800;
          color: #fff; cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .action-btn-pill:hover { transform: translateY(-2px); filter: brightness(1.12); }
        .action-btn-pill.green { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
        .action-btn-pill.amber { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 4px 12px rgba(245,158,11,0.3); }
        .action-btn-pill.purple { background: linear-gradient(135deg, #6366f1, #4f46e5); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
        .action-btn-pill.pink { background: linear-gradient(135deg, #ec4899, #db2777); box-shadow: 0 4px 12px rgba(236,72,153,0.3); }
        .action-btn-pill.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .action-btn-pill.orange { background: linear-gradient(135deg, #f97316, #ea580c); box-shadow: 0 4px 12px rgba(249,115,22,0.3); }
        .action-btn-pill.sky { background: linear-gradient(135deg, #0284c7, #0369a1); box-shadow: 0 4px 12px rgba(2,132,199,0.3); }
        .action-btn-pill.red { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
        .action-btn-pill.emerald { background: linear-gradient(135deg, #10b981, #059669); }

        /* Meta Badges 3x2 Grid */
        .agent-meta-badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 10px;
          margin-bottom: 22px;
        }
        .meta-badge-box {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 9px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
        }
        .meta-badge-box .lbl { color: #94a3b8; display: flex; align-items: center; gap: 6px; font-weight: 700; }
        .meta-badge-box .val { color: #f1f5f9; }
        .meta-badge-box .val.bold { font-weight: 800; }
        .text-cyan { color: #38bdf8 !important; }
        .text-orange { color: #fb923c !important; }
        .text-green { color: #34d399 !important; }
        .text-red { color: #f87171 !important; }
        .text-amber { color: #fbbf24 !important; }

        /* 4 Stat Cards */
        .agent-stat-cards-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .hero-metric-card {
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hero-metric-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .hero-metric-card.blue { background: linear-gradient(135deg, rgba(37,99,235,0.22), rgba(30,58,138,0.35)); border-color: rgba(59,130,246,0.4); }
        .hero-metric-card.red { background: linear-gradient(135deg, rgba(239,68,68,0.2), rgba(185,28,28,0.35)); border-color: rgba(239,68,68,0.4); }
        .hero-metric-card.gold { background: linear-gradient(135deg, rgba(245,158,11,0.22), rgba(180,83,9,0.35)); border-color: rgba(245,158,11,0.4); }
        .hero-metric-card.green { background: linear-gradient(135deg, rgba(16,185,129,0.22), rgba(4,120,87,0.35)); border-color: rgba(16,185,129,0.4); }

        .metric-icon-wrap {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .hero-metric-card.blue .metric-icon-wrap { background: rgba(59,130,246,0.3); color: #93c5fd; }
        .hero-metric-card.red .metric-icon-wrap { background: rgba(239,68,68,0.3); color: #fca5a5; }
        .hero-metric-card.gold .metric-icon-wrap { background: rgba(245,158,11,0.3); color: #fde68a; }
        .hero-metric-card.green .metric-icon-wrap { background: rgba(16,185,129,0.3); color: #6ee7b7; }

        .metric-content { display: flex; flex-direction: column; }
        .metric-label { font-size: 12px; color: #cbd5e1; font-weight: 700; }
        .metric-number { font-size: 20px; font-weight: 900; color: #fff; margin: 2px 0; }
        .metric-number small { font-size: 12px; font-weight: 700; color: #cbd5e1; }
        .metric-sub { font-size: 11px; color: #94a3b8; }

        /* ── SMART HEALTH & PROFILE COMPLETION BANNER ── */
        .smart-health-banner {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.05);
        }
        .health-block { display: flex; align-items: center; gap: 12px; }
        .health-gauge { display: flex; align-items: center; gap: 12px; }
        .gauge-circle {
          width: 44px; height: 44px; border-radius: 50%;
          background: conic-gradient(#10b981 var(--pct), var(--border) 0);
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .gauge-circle span {
          width: 34px; height: 34px; border-radius: 50%; background: var(--card-bg);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: #10b981;
        }
        .gauge-info { display: flex; flex-direction: column; font-size: 12px; }
        .gauge-info strong { color: var(--text); font-weight: 800; }
        .gauge-info small { color: var(--muted); margin-top: 1px; }

        .health-alert {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 14px; border-radius: 10px; font-size: 12px;
        }
        .health-alert.warning { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25); color: #d97706; }
        .health-alert.danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #dc2626; }
        .health-alert.info { background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.25); color: #2563eb; }
        [data-theme='dark'] .health-alert.warning { color: #fbbf24; }
        [data-theme='dark'] .health-alert.danger { color: #f87171; }
        [data-theme='dark'] .health-alert.info { color: #60a5fa; }
        .health-alert div { display: flex; flex-direction: column; }
        .health-alert div strong { color: var(--text); font-weight: 800; }

        .health-shortcuts { display: flex; gap: 8px; }
        .shortcut-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px; background: var(--bg);
          border: 1px solid var(--border); color: var(--text); font-family: inherit;
          font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s;
        }
        .shortcut-btn:hover { background: var(--hover-bg); transform: translateY(-1px); }

        /* ── Tabs Navigation Bar ── */
        .ledger-tabs-navigation {
          display: flex;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 6px;
          gap: 6px;
          margin-bottom: 24px;
          overflow-x: auto;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        }
        .nav-tab-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 10px; border: none;
          background: none; color: var(--muted); font-family: inherit;
          font-size: 13px; font-weight: 800; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .nav-tab-btn:hover { color: var(--text); background: var(--hover-bg); }
        .nav-tab-btn.active { background: #1e40af; color: #fff; box-shadow: 0 4px 12px rgba(30,64,175,0.35); }
        .tab-chip {
          padding: 2px 8px; border-radius: 12px; font-size: 11px;
          background: rgba(255,255,255,0.2); font-weight: 800;
        }
        .tab-chip.green { background: #10b981; color: #fff; }
        .tab-chip.sky { background: #0284c7; color: #fff; }
        .tab-chip.amber { background: #f59e0b; color: #fff; }

        /* ── Pane Card ── */
        .tab-pane-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .pane-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 18px; flex-wrap: wrap; gap: 12px;
        }
        .pane-title { display: flex; align-items: center; gap: 10px; }
        .pane-title i { font-size: 20px; color: #1e40af; }
        .pane-title h3 { font-size: 17px; font-weight: 800; margin: 0; color: var(--text); }
        .pane-actions { display: flex; gap: 8px; }
        .btn-action {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 10px; border: none;
          font-family: inherit; font-size: 12.5px; font-weight: 800;
          cursor: pointer; transition: all 0.2s; color: #fff;
        }
        .btn-action.primary { background: #1e40af; }
        .btn-action.green { background: #10b981; }
        .btn-action.cyan { background: #0284c7; }
        .btn-action.ghost { background: var(--bg); border: 1px solid var(--border); color: var(--text); }
        .btn-action:hover { filter: brightness(1.1); transform: translateY(-1px); }

        .pane-empty {
          text-align: center; padding: 40px 20px; color: var(--muted);
        }
        .pane-empty i { font-size: 36px; margin-bottom: 10px; opacity: 0.6; }
        .pane-empty p { margin: 0; font-size: 13.5px; font-weight: 700; }

        /* ── Modern Data Table ── */
        .table-responsive-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .modern-data-table {
          width: 100%; border-collapse: collapse; font-size: 12.5px;
        }
        .modern-data-table th {
          background: var(--table-header); color: var(--text); font-weight: 800;
          padding: 10px 10px; text-align: center; border-bottom: 2px solid var(--border);
          white-space: nowrap;
        }
        .modern-data-table td {
          padding: 10px 10px; border-bottom: 1px solid var(--border);
          color: var(--text); white-space: nowrap; text-align: center;
          vertical-align: middle;
        }
        .modern-data-table tr:hover td { background: var(--hover-bg); }
        .month-tag { font-weight: 800; color: var(--text); }
        .net-salary-pill { font-weight: 900; color: #10b981; font-size: 13.5px; }

        .status-tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800;
        }
        .status-tag.paid { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
        .status-tag.unpaid { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
        .status-tag.active-doc { background: rgba(59,130,246,0.15); color: #2563eb; border: 1px solid rgba(59,130,246,0.3); }
        [data-theme='dark'] .status-tag.active-doc { color: #60a5fa; }
        .status-tag.canceled { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }

        .payment-meta { display: flex; flex-direction: column; font-size: 11.5px; }
        .payment-meta small { color: var(--muted); }

        .modern-data-table th.actions-col,
        .modern-data-table td.actions-col {
          white-space: nowrap;
          text-align: center;
          vertical-align: middle;
          padding: 8px 12px;
        }

        .table-actions { display: flex; gap: 6px; }
        .tbl-btn {
          width: 32px; height: 32px; border-radius: 8px; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s; font-family: inherit; font-size: 12px;
        }
        .tbl-btn.print { width: auto; padding: 0 10px; background: rgba(99,102,241,0.15); color: #6366f1; }
        .tbl-btn.print:hover { background: rgba(99,102,241,0.3); }
        .tbl-btn.pay { width: auto; padding: 0 12px; background: rgba(16,185,129,0.15); color: #10b981; font-weight: 800; gap: 4px; }
        .tbl-btn.pay:hover { background: rgba(16,185,129,0.3); }
        .tbl-btn.view { background: rgba(6,182,212,0.15); color: #0284c7; }
        .tbl-btn.view:hover { background: rgba(6,182,212,0.3); }

        /* ── Custody Cards Grid ── */
        .custody-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .custody-glass-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          transition: transform 0.2s, border-color 0.2s;
        }
        .custody-glass-card:hover { transform: translateY(-2px); border-color: #1e40af; }
        .card-top { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .type-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800;
        }
        .type-badge.fixed { background: rgba(59,130,246,0.15); color: #2563eb; }
        [data-theme='dark'] .type-badge.fixed { color: #60a5fa; }
        .type-badge.consumable { background: rgba(245,158,11,0.15); color: #d97706; }
        [data-theme='dark'] .type-badge.consumable { color: #fbbf24; }
        .condition-tag { font-size: 11px; color: #10b981; font-weight: 700; }
        .custody-title { font-size: 14px; font-weight: 800; margin: 0 0 10px; color: var(--text); }
        .custody-details-list { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
        .detail-row { display: flex; justify-content: space-between; color: var(--muted); }
        .detail-row strong { color: var(--text); font-weight: 800; }
        .mono-text { font-family: monospace; color: #0284c7; font-weight: 700; }
        .custody-notes { margin: 6px 0 0; font-size: 11px; color: var(--muted); font-style: italic; }

        /* ── Document Cards Grid ── */
        .docs-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }
        .doc-item-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: all 0.2s;
        }
        .doc-item-card.has-file { border-color: rgba(16,185,129,0.4); }
        .card-media-head { display: flex; align-items: center; gap: 10px; }
        .doc-icon-circ {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .doc-name-box h4 { margin: 0 0 2px; font-size: 13.5px; font-weight: 800; color: var(--text); }
        .status-ok { font-size: 11px; color: #10b981; font-weight: 800; }
        .status-no { font-size: 11px; color: var(--muted); }
        .doc-thumb-preview {
          height: 80px; border-radius: 8px; overflow: hidden; background: var(--card-bg);
          cursor: pointer; border: 1px solid var(--border);
        }
        .doc-thumb-preview img { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: opacity 0.2s; }
        .doc-thumb-preview:hover img { opacity: 1; }
        .doc-card-actions { display: flex; gap: 6px; margin-top: auto; }
        .doc-action-btn {
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          padding: 7px 10px; border-radius: 8px; border: none; font-family: inherit;
          font-size: 11.5px; font-weight: 800; cursor: pointer; text-decoration: none; color: #fff;
          transition: background 0.15s;
        }
        .doc-action-btn.view { background: rgba(59,130,246,0.2); color: #1e40af; }
        [data-theme='dark'] .doc-action-btn.view { color: #60a5fa; }
        .doc-action-btn.view:hover { background: #1e40af; color: #fff; }
        .doc-action-btn.print { background: rgba(99,102,241,0.2); color: #6366f1; }
        .doc-action-btn.print:hover { background: #6366f1; color: #fff; }
        .doc-action-btn.upload { background: rgba(16,185,129,0.2); color: #059669; }
        [data-theme='dark'] .doc-action-btn.upload { color: #34d399; }
        .doc-action-btn.upload:hover { background: #10b981; color: #fff; }

        /* ── Requests Timeline ── */
        .requests-timeline-list { display: flex; flex-direction: column; gap: 12px; }
        .req-timeline-item {
          display: flex; gap: 14px; background: var(--bg);
          border: 1px solid var(--border); border-radius: 14px;
          padding: 16px; align-items: flex-start;
        }
        .req-timeline-item.status-approved { border-right: 4px solid #10b981; }
        .req-timeline-item.status-rejected { border-right: 4px solid #ef4444; }
        .req-timeline-item.status-pending { border-right: 4px solid #f59e0b; }
        .req-type-icon {
          width: 42px; height: 42px; border-radius: 10px; background: rgba(59,130,246,0.15);
          color: #1e40af; display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        [data-theme='dark'] .req-type-icon { color: #60a5fa; }
        .req-body-content { flex: 1; }
        .req-top-line { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .req-top-line h4 { margin: 0; font-size: 14px; font-weight: 800; color: var(--text); }
        .req-status-pill {
          padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 800;
        }
        .req-status-pill.approved { background: rgba(16,185,129,0.18); color: #10b981; }
        .req-status-pill.rejected { background: rgba(239,68,68,0.18); color: #ef4444; }
        .req-status-pill.pending { background: rgba(245,158,11,0.18); color: #d97706; }
        [data-theme='dark'] .req-status-pill.pending { color: #f59e0b; }
        .req-reason-text { margin: 0 0 6px; font-size: 13px; color: var(--text); line-height: 1.5; }
        .req-admin-feedback { font-size: 12px; color: #0284c7; margin-bottom: 4px; font-weight: 700; }
        .req-timestamp { font-size: 11px; color: var(--muted); }
        .req-decision-actions { display: flex; gap: 6px; }
        .req-btn {
          padding: 6px 12px; border-radius: 6px; border: none; font-family: inherit;
          font-size: 11.5px; font-weight: 800; cursor: pointer; transition: all 0.15s;
        }
        .req-btn.approve { background: rgba(16,185,129,0.18); color: #10b981; }
        .req-btn.approve:hover { background: #10b981; color: #fff; }
        .req-btn.reject { background: rgba(239,68,68,0.18); color: #ef4444; }
        .req-btn.reject:hover { background: #ef4444; color: #fff; }

        /* ── NEW: SETTLEMENT CALCULATOR GRID ── */
        .settlement-calc-grid {
          display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px;
        }
        .calc-card {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 14px; padding: 20px;
        }
        .calc-card h4 {
          margin: 0 0 16px; font-size: 15px; color: var(--text); font-weight: 800;
          display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }
        .calc-fields { display: flex; flex-direction: column; gap: 12px; }
        .read-only-fld { background: var(--card-bg) !important; color: var(--muted) !important; border: 1px solid var(--border) !important; cursor: not-allowed; }

        .duration-banner {
          display: flex; align-items: center; gap: 12px;
          background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25);
          border-radius: 10px; padding: 12px; margin-bottom: 16px; color: #d97706;
        }
        [data-theme='dark'] .duration-banner { color: #fbbf24; }
        .duration-banner i { font-size: 22px; }
        .duration-banner div { display: flex; flex-direction: column; }
        .duration-banner strong { font-size: 13.5px; color: var(--text); font-weight: 800; }
        .duration-banner span { font-size: 12.5px; color: var(--text); }

        .settlement-breakdown-table {
          display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;
        }
        .s-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 14px; background: var(--card-bg); border-radius: 10px; border: 1px solid var(--border);
          font-size: 13px; color: var(--text); font-weight: 700;
        }
        .s-total-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 18px; background: linear-gradient(135deg, #10b981, #059669);
          border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; font-size: 15px; font-weight: 900; color: #fff;
        }
        .net-amount { font-size: 22px; color: #fff; }
        .full-width-print-btn {
          width: 100%; padding: 12px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #1e40af, #3b82f6); color: #fff;
          font-family: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s; box-shadow: 0 4px 14px rgba(30,64,175,0.3);
        }
        .full-width-print-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

        /* ── NEW: CERTIFICATES CATALOG GRID ── */
        .certificates-catalog-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px;
        }
        .cert-catalog-card {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 14px; padding: 20px; display: flex; flex-direction: column;
          align-items: center; text-align: center; gap: 12px; transition: transform 0.2s;
        }
        .cert-catalog-card:hover { transform: translateY(-4px); border-color: #1e40af; }
        .cert-card-icon {
          width: 58px; height: 58px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center; font-size: 24px;
        }
        .cert-card-icon.gold { background: rgba(245,158,11,0.15); color: #d97706; }
        [data-theme='dark'] .cert-card-icon.gold { color: #fbbf24; }
        .cert-card-icon.blue { background: rgba(59,130,246,0.15); color: #1e40af; }
        [data-theme='dark'] .cert-card-icon.blue { color: #60a5fa; }
        .cert-card-icon.green { background: rgba(16,185,129,0.15); color: #10b981; }
        .cert-card-icon.amber { background: rgba(249,115,22,0.15); color: #ea580c; }
        [data-theme='dark'] .cert-card-icon.amber { color: #fbbf24; }
        .cert-card-content h4 { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: var(--text); }
        .cert-card-content p { margin: 0 0 16px; font-size: 12.5px; color: var(--muted); line-height: 1.6; }
        .cert-launch-btn {
          width: 100%; padding: 10px 14px; border-radius: 8px; border: none;
          font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer;
          color: #fff; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          transition: all 0.2s;
        }
        .cert-launch-btn.gold { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .cert-launch-btn.blue { background: linear-gradient(135deg, #1e40af, #3b82f6); }
        .cert-launch-btn.green { background: linear-gradient(135deg, #10b981, #059669); }
        .cert-launch-btn.amber { background: linear-gradient(135deg, #f97316, #ea580c); }
        .cert-launch-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

        /* ── Permissions Matrix Card ── */
        .permissions-matrix-card { margin-bottom: 10px; }
        .permissions-pills-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
        .admin-full-privilege-badge {
          display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 12px;
          background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); color: #d97706;
          width: 100%;
        }
        [data-theme='dark'] .admin-full-privilege-badge { color: #fbbf24; }
        .admin-full-privilege-badge i { font-size: 24px; }
        .admin-full-privilege-badge div { display: flex; flex-direction: column; }
        .admin-full-privilege-badge strong { font-size: 14px; color: var(--text); font-weight: 800; }
        .admin-full-privilege-badge span { font-size: 12px; color: var(--text); margin-top: 2px; }
        .perm-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px; background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.22); color: #1e40af; font-size: 12px; font-weight: 700;
        }
        [data-theme='dark'] .perm-chip { color: #93c5fd; }
        .no-perm-msg { font-size: 12px; color: var(--muted); }

        /* ── Full Profile Dossier Grid ── */
        .profile-dossier-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;
        }
        .profile-dossier-grid .span-full { grid-column: 1 / -1; }
        .dossier-card {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 14px; padding: 18px;
        }
        .dossier-card .card-head {
          display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
          border-bottom: 1px solid var(--border); padding-bottom: 8px;
        }
        .dossier-card .card-head i { color: #1e40af; font-size: 16px; }
        .dossier-card .card-head h4 { margin: 0; font-size: 14.5px; color: var(--text); font-weight: 800; }
        .card-rows { display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; }
        .d-row { display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 4px; }
        .d-row span { color: var(--muted); }
        .d-row strong { color: var(--text); text-align: left; font-weight: 700; }

        /* ── DIGITAL VCARD MODAL ── */
        .vcard-preview-box {
          display: flex; flex-direction: column; align-items: center;
          padding: 10px; width: 100%;
        }
        .vcard-avatar {
          width: 76px; height: 76px; border-radius: 50%; background: #1e40af;
          display: flex; align-items: center; justify-content: center; font-size: 28px;
          color: #fff; overflow: hidden; margin-bottom: 10px; border: 3px solid #38bdf8;
        }
        .vcard-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .vcard-preview-box h3 { margin: 0; font-size: 18px; color: var(--text); font-weight: 800; }
        .vcard-role { font-size: 13px; color: #0284c7; margin: 3px 0 16px; font-weight: 700; }
        .vcard-qr-wrap {
          background: #fff; padding: 12px; border-radius: 12px; margin-bottom: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: 1px solid var(--border);
        }
        .vcard-qr-wrap img { width: 160px; height: 160px; display: block; }
        .vcard-hint { font-size: 11.5px; color: var(--muted); max-width: 280px; text-align: center; }

        /* ── Modals ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          backdrop-filter: blur(6px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .modal-box {
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: 18px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          overflow: hidden; max-height: 90vh; display: flex; flex-direction: column;
          color: var(--text);
        }
        .modal-box.small { max-width: 440px; }
        .modal-box.medium { max-width: 560px; }
        .modal-box.large { max-width: 780px; }

        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; border-bottom: 1px solid var(--border);
          background: var(--card-bg);
        }
        .modal-title { display: flex; align-items: center; gap: 10px; }
        .modal-title h3 { margin: 0; font-size: 16px; font-weight: 800; color: var(--text); }
        .close-btn {
          background: none; border: none; color: var(--muted); font-size: 16px;
          cursor: pointer; transition: color 0.15s;
        }
        .close-btn:hover { color: var(--text); }

        .modal-body-scrollable { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }

        .modal-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 14px 20px; border-top: 1px solid var(--border);
          background: var(--card-bg);
        }
        .btn-modal {
          padding: 10px 20px; border-radius: 10px; border: none; font-family: inherit;
          font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.15s; color: #fff;
        }
        .btn-modal.primary { background: #1e40af; }
        .btn-modal.green { background: #10b981; }
        .btn-modal.purple { background: #6366f1; }
        .btn-modal.red { background: #ef4444; }
        .btn-modal.ghost { background: var(--bg); color: var(--text); border: 1px solid var(--border); }
        .btn-modal:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }

        .form-fld { display: flex; flex-direction: column; gap: 6px; }
        .form-fld label { font-size: 12.5px; color: var(--text); font-weight: 700; }
        .form-fld input, .form-fld select, .form-fld textarea {
          background: var(--input-bg); border: 1px solid var(--border);
          border-radius: 8px; padding: 10px 12px; color: var(--text);
          font-family: inherit; font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .form-fld input:focus, .form-fld select:focus, .form-fld textarea:focus {
          border-color: #1e40af;
        }
        .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .edit-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .edit-form-grid .span-full { grid-column: span 2; }

        .profile-hero-section {
          display: flex; align-items: center; gap: 16px;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 12px; padding: 14px;
        }
        .hero-avatar {
          width: 60px; height: 60px; border-radius: 50%; overflow: hidden;
          background: #1e40af; display: flex; align-items: center; justify-content: center;
          font-size: 24px; color: #fff;
        }
        .hero-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .hero-text h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--text); }
        .hero-text p { margin: 2px 0 0; font-size: 12px; color: var(--muted); }

        .modal-details-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        .grid-card {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px; font-size: 12px;
        }
        .grid-card h4 { margin: 0 0 8px; font-size: 13px; color: #0284c7; font-weight: 800; border-bottom: 1px dashed var(--border); padding-bottom: 4px; }
        .grid-card p { margin: 4px 0; color: var(--text); }
        .grid-card p strong { color: var(--muted); }

        /* Loading & Empty Cards */
        .ledger-loading-card, .ledger-empty-card {
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: 18px; padding: 60px 20px; text-align: center; color: var(--muted);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .spinner-icon { font-size: 38px; color: #1e40af; margin-bottom: 14px; }
        .ledger-empty-card i { font-size: 48px; color: var(--muted); margin-bottom: 14px; }
        .ledger-empty-card h3 { font-size: 18px; color: var(--text); margin: 0 0 6px; font-weight: 800; }

        /* ─── NEW ENTERPRISE FEATURES STYLING ─── */

        /* KPI Scorecard & Performance */
        .kpi-overview-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .kpi-score-badge-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.04);
        }
        .kpi-ring-wrap {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: conic-gradient(#f59e0b 0% 96.5%, var(--border) 96.5% 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          box-shadow: 0 0 25px rgba(245,158,11,0.18);
        }
        .kpi-ring-circle {
          width: 106px;
          height: 106px;
          border-radius: 50%;
          background: var(--card-bg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .kpi-ring-num {
          font-size: 24px;
          font-weight: 900;
          color: #f59e0b;
        }
        .kpi-ring-circle small {
          font-size: 10px;
          color: var(--muted);
        }
        .kpi-rank-meta h4 {
          margin: 0 0 4px;
          font-size: 16px;
          color: var(--text);
          font-weight: 800;
        }
        .stars-row {
          display: flex;
          gap: 4px;
          justify-content: center;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .badge-grade {
          display: inline-block;
          background: rgba(245,158,11,0.15);
          border: 1px solid #f59e0b;
          color: #d97706;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
        }

        .kpi-metrics-bars-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.04);
        }
        .kpi-metrics-bars-card h4 {
          margin: 0 0 16px;
          font-size: 15px;
          color: var(--text);
          font-weight: 800;
        }
        .kpi-bar-item {
          margin-bottom: 14px;
        }
        .kpi-bar-header {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          margin-bottom: 6px;
          color: var(--muted);
          font-weight: 700;
        }
        .kpi-bar-header i {
          margin-left: 6px;
        }
        .kpi-bar-track {
          width: 100%;
          height: 9px;
          border-radius: 10px;
          background: var(--border);
          overflow: hidden;
        }
        .kpi-bar-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.4s ease;
        }
        .kpi-bar-fill.cyan { background: linear-gradient(90deg, #06b6d4, #0ea5e9); }
        .kpi-bar-fill.green { background: linear-gradient(90deg, #10b981, #059669); }
        .kpi-bar-fill.purple { background: linear-gradient(90deg, #8b5cf6, #a855f7); }
        .kpi-bar-fill.amber { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .kpi-bar-fill.emerald { background: linear-gradient(90deg, #10b981, #34d399); }

        .eval-history-section {
          margin-top: 20px;
        }
        .section-subtitle {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 800;
          color: #0284c7;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kpi-pill-score {
          background: rgba(245,158,11,0.15);
          color: #d97706;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid rgba(245,158,11,0.3);
        }
        .badge-grade-cell {
          font-size: 12px;
          font-weight: 700;
          color: #059669;
        }

        /* Attendance & Overtime Tracker */
        .month-picker-input {
          background: var(--input-bg);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 8px 12px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          outline: none;
        }
        .attendance-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        .att-stat-box {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg);
        }
        .att-stat-box.green .att-icon { background: rgba(16,185,129,0.15); color: #10b981; }
        .att-stat-box.blue .att-icon { background: rgba(37,99,235,0.15); color: #3b82f6; }
        .att-stat-box.amber .att-icon { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .att-stat-box.purple .att-icon { background: rgba(139,92,246,0.15); color: #a855f7; }
        .att-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .att-info span { font-size: 11px; color: var(--muted); display: block; }
        .att-info strong { font-size: 16px; font-weight: 800; color: var(--text); display: block; margin: 2px 0; }
        .att-info small { font-size: 10px; color: var(--muted); }

        .time-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11.5px;
          font-family: monospace;
          font-weight: 700;
        }
        .time-badge.in { background: rgba(16,185,129,0.15); color: #059669; }
        .time-badge.out { background: rgba(59,130,246,0.15); color: #2563eb; }
        .badge-overtime {
          background: rgba(245,158,11,0.15);
          color: #d97706;
          font-weight: 800;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 6px;
        }

        /* Loans & Advances */
        .loans-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        .loan-stat-card {
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg);
        }
        .loan-stat-card span { font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px; font-weight: 700; }
        .loan-stat-card strong { font-size: 18px; font-weight: 800; color: var(--text); }
        .loan-stat-card.blue strong { color: #2563eb; }
        .loan-stat-card.green strong { color: #059669; }
        .loan-stat-card.amber strong { color: #d97706; }
        .loan-stat-card.purple strong { color: #9333ea; }

        .loans-catalog-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .loan-item-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 18px;
          transition: all 0.2s;
        }
        .loan-item-card:hover {
          border-color: #0284c7;
          background: var(--hover-bg);
        }
        .loan-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .loan-id-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .loan-id-box i { font-size: 20px; }
        .loan-id-box h4 { margin: 0; font-size: 14px; color: var(--text); font-weight: 800; }
        .loan-id-box small { color: var(--muted); font-size: 11px; }

        .loan-card-progress { margin-bottom: 14px; }
        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 6px;
          font-weight: 700;
        }
        .progress-track {
          width: 100%;
          height: 8px;
          background: var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 10px;
        }
        .progress-fill.green { background: linear-gradient(90deg, #10b981, #059669); }
        .progress-fill.amber { background: linear-gradient(90deg, #f59e0b, #d97706); }

        .loan-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 11.5px;
        }
        .l-meta { display: flex; justify-content: space-between; }
        .l-meta span { color: var(--muted); }
        .l-meta strong { color: var(--text); }

        /* CR-80 Plastic Badge Studio Showcase */
        .badge-studio-showcase {
          padding: 20px 0;
        }
        .cards-preview-row {
          display: flex;
          justify-content: center;
          gap: 36px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }
        .badge-preview-column {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .card-face-tag {
          font-size: 12px;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* 3D Realistic CR-80 Badge Display */
        .cr80-display-card {
          width: 290px;
          height: 450px;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 15px 35px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
          transition: transform 0.3s;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          box-sizing: border-box;
        }
        .cr80-display-card:hover {
          transform: translateY(-6px) scale(1.02);
        }

        /* Front Card Details */
        .cr80-display-card.front {
          background: linear-gradient(145deg, #0b1329 0%, #172554 60%, #1e3a8a 100%);
          border: 1.5px solid rgba(212,175,55,0.5);
          color: #fff;
        }
        .cr80-inner-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(212,175,55,0.3);
          padding-bottom: 6px;
        }
        .cr80-logo { height: 32px; }
        .cr80-org-title { text-align: left; }
        .cr80-org-title h5 { margin: 0; font-size: 10px; color: #d4af37; font-weight: 800; }
        .cr80-org-title span { font-size: 7.5px; color: #94a3b8; }

        .cr80-chip-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 4px 0;
        }
        .cr80-sim-chip {
          width: 32px;
          height: 24px;
          border-radius: 4px;
          background: linear-gradient(135deg, #eab308, #ca8a04);
          border: 1px solid #fef08a;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .cr80-badge-lbl {
          font-size: 7.5px;
          font-weight: 800;
          color: #fde047;
          background: rgba(212,175,55,0.2);
          border: 1px solid rgba(212,175,55,0.4);
          padding: 2px 6px;
          border-radius: 10px;
        }

        .cr80-avatar-ring {
          width: 86px;
          height: 86px;
          border-radius: 50%;
          border: 2.5px solid #d4af37;
          overflow: hidden;
          margin: 0 auto;
          background: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: #94a3b8;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        }
        .cr80-avatar-ring img { width: 100%; height: 100%; object-fit: cover; }

        .cr80-emp-info { text-align: center; margin: 4px 0; }
        .cr80-emp-info h3 { margin: 0; font-size: 13.5px; font-weight: 800; color: #ffffff; }
        .cr80-emp-info .cr80-title { margin: 2px 0 0; font-size: 9.5px; color: #38bdf8; font-weight: 700; }

        .cr80-meta-box {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 8px;
        }
        .cr80-meta-box .c-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .cr80-meta-box .c-row span { color: #94a3b8; }
        .cr80-meta-box .c-row strong { color: #f1f5f9; }

        .cr80-barcode {
          text-align: center;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 3px;
          color: #d4af37;
          background: rgba(0,0,0,0.4);
          padding: 2px 0;
          border-radius: 4px;
        }

        /* Back Card Details */
        .cr80-display-card.back {
          background: #ffffff;
          color: #0f172a;
          border: 1.5px solid #cbd5e1;
        }
        .cr80-mag-stripe {
          width: calc(100% + 32px);
          height: 36px;
          background: #0f172a;
          margin: -16px -16px 10px;
        }
        .cr80-back-body {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }
        .cr80-qr-section {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .cr80-qr-section img {
          width: 64px;
          height: 64px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
        }
        .cr80-back-lines {
          font-size: 8px;
          color: #334155;
          line-height: 1.4;
        }
        .cr80-disclaimer {
          font-size: 7px;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px;
          line-height: 1.3;
          margin-bottom: 8px;
          text-align: justify;
        }
        .cr80-back-signatures {
          display: flex;
          justify-content: space-between;
          font-size: 7.5px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 4px;
        }
        .fake-sig-line {
          font-weight: 800;
          margin-top: 10px;
        }

        .studio-specs-box {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px 20px;
          max-width: 700px;
          margin: 0 auto;
          text-align: right;
        }
        .studio-specs-box h4 {
          margin: 0 0 8px;
          font-size: 13px;
          color: var(--text);
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .studio-specs-box ul {
          margin: 0;
          padding-right: 20px;
          font-size: 11.5px;
          color: var(--muted);
          line-height: 1.7;
        }

        /* WhatsApp Suite & Modal Helpers */
        .whatsapp-templates-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .template-pill {
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 6px 12px;
          border-radius: 20px;
          font-family: inherit;
          font-size: 11.5px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .template-pill:hover, .template-pill.active {
          background: rgba(16,185,129,0.15);
          border-color: #10b981;
          color: #059669;
          font-weight: 700;
        }
        .disabled-input {
          background: var(--bg) !important;
          color: var(--muted) !important;
          border-color: var(--border) !important;
          cursor: not-allowed;
        }

        /* Evaluation Sliders */
        .eval-sliders-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin: 14px 0;
        }
        .slider-box {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px;
        }
        .slider-box.span-full { grid-column: span 2; }
        .s-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text);
          margin-bottom: 8px;
        }
        .s-label strong { color: #d97706; font-weight: 800; font-size: 13px; }
        .slider-box input[type="range"] {
          width: 100%;
          accent-color: #f59e0b;
        }

        .live-eval-total-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--card-bg);
          border: 1px solid #f59e0b;
          border-radius: 10px;
          padding: 12px 18px;
          margin-bottom: 14px;
          box-shadow: 0 4px 15px rgba(245,158,11,0.08);
        }
        .live-eval-total-banner span { font-size: 12px; color: var(--text); font-weight: 700; }
        .live-eval-total-banner strong { font-size: 20px; color: #d97706; margin-right: 8px; }
        .grade-tag {
          background: #f59e0b;
          color: #fff;
          font-weight: 800;
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .calculated-val-box {
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 800;
          color: #059669;
          text-align: center;
        }

        @media (max-width: 900px) {
          .agent-action-buttons-row { grid-template-columns: repeat(4, 1fr); }
          .agent-meta-badges-grid { grid-template-columns: 1fr; }
          .agent-stat-cards-row { grid-template-columns: 1fr 1fr; }
          .settlement-calc-grid { grid-template-columns: 1fr; }
          .modal-details-grid, .edit-form-grid { grid-template-columns: 1fr; }
          .edit-form-grid .span-full { grid-column: span 1; }
          .kpi-overview-grid { grid-template-columns: 1fr; }
          .attendance-stats-grid { grid-template-columns: 1fr 1fr; }
          .loans-summary-grid { grid-template-columns: 1fr 1fr; }
          .loans-catalog-grid { grid-template-columns: 1fr; }
          .eval-sliders-grid { grid-template-columns: 1fr; }
          .slider-box.span-full { grid-column: span 1; }
        }
        @media (max-width: 600px) {
          .agent-action-buttons-row { grid-template-columns: repeat(2, 1fr); }
          .agent-stat-cards-row { grid-template-columns: 1fr; }
          .attendance-stats-grid { grid-template-columns: 1fr; }
          .loans-summary-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
