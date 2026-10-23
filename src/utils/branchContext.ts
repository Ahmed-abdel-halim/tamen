export interface Branch {
  id: number;
  code: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_user_id?: number | null;
  manager_user?: {
    id: number;
    name: string;
    username: string;
    email?: string;
    personal_phone?: string;
    is_branch_admin?: boolean;
  } | null;
  status: 'نشط' | 'موقف';
  is_main_branch?: boolean;
  commercial_registration?: string;
  tax_number?: string;
  notes?: string;
  users_count?: number;
  insurance_documents_count?: number;
  total_revenue?: number;
  month_revenue?: number;
  today_documents_count?: number;
  created_at?: string;
  updated_at?: string;
}

const ACTIVE_BRANCH_KEY = 'active_branch';

/**
 * Returns the currently active branch from localStorage, or null for HQ/General Administration
 */
export function getActiveBranch(): Branch | null {
  try {
    const raw = localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Sets the active branch context and dispatches a 'branchChanged' custom event
 */
export function setActiveBranch(branch: Branch | null): void {
  if (branch) {
    localStorage.setItem(ACTIVE_BRANCH_KEY, JSON.stringify(branch));
  } else {
    localStorage.removeItem(ACTIVE_BRANCH_KEY);
  }
  window.dispatchEvent(new CustomEvent('branchChanged', { detail: branch }));
}

/**
 * Returns headers with 'X-Branch-Id' if an active branch is selected
 */
export function getBranchHeaders(): Record<string, string> {
  const activeBranch = getActiveBranch();
  if (activeBranch && activeBranch.id) {
    return { 'X-Branch-Id': activeBranch.id.toString() };
  }
  return {};
}
