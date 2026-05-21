export type UserRole = 'employee' | 'manager' | 'drh' | 'director' | 'admin' | 'payroll_manager' | 'recruitment_manager' | 'career_manager' | 'qvct_manager';

export interface UserProfile {
  id: string;
  employee_id: string | null;
  role: UserRole;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  password_changed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'M' | 'F' | null;
  nationality: string;
  marital_status: string | null;
  address: string | null;
  city: string | null;
  department_id: string | null;
  position_id: string | null;
  manager_id: string | null;
  hire_date: string;
  employment_status: 'active' | 'on_leave' | 'suspended' | 'terminated';
  contract_type: 'CDI' | 'CDD' | 'Stage' | 'Consultant';
  photo_url: string | null;
  grade: string | null;
  echelon: number | null;
  current_salary: number | null;
  created_at: string;
  updated_at: string;
}

export interface BonusType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: 'monthly' | 'quarterly' | 'annual' | 'exceptional' | 'performance';
  calculation_method: 'fixed' | 'percentage_salary' | 'percentage_performance' | 'formula' | 'manual';
  base_amount: number | null;
  percentage_rate: number | null;
  formula: string | null;
  is_prorated: boolean;
  proration_basis: string | null;
  is_taxable: boolean;
  is_subject_to_cnps: boolean;
  requires_approval: boolean;
  approval_level: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  is_active: boolean;
  effective_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBonus {
  id: string;
  employee_id: string;
  bonus_type_id: string | null;
  bonus_code: string | null;
  bonus_name: string | null;
  period_month: number | null;
  period_year: number | null;
  calculation_base: number | null;
  rate: number | null;
  calculated_amount: number | null;
  adjustment_amount: number;
  final_amount: number | null;
  status: 'pending' | 'calculated' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  justification: string | null;
  performance_score: number | null;
  prorata_factor: number;
  requested_by: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  paid_with_payroll_id: string | null;
  paid_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface CareerEvent {
  id: string;
  employee_id: string;
  event_type: 'promotion' | 'advancement' | 'lateral_move' | 'demotion' | 'suspension' |
    'maternity_leave' | 'sick_leave' | 'unpaid_leave' | 'disciplinary_action' | 'warning' |
    'dismissal' | 'resignation' | 'retirement' | 'contract_renewal' | 'contract_amendment' |
    'salary_increase' | 'position_change' | 'department_change';
  event_date: string;
  effective_date: string | null;
  end_date: string | null;
  previous_position_id: string | null;
  new_position_id: string | null;
  previous_department_id: string | null;
  new_department_id: string | null;
  previous_salary: number | null;
  new_salary: number | null;
  reason: string | null;
  description: string | null;
  decision_maker: string | null;
  decision_date: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
  is_suspension: boolean;
  suspension_type: string | null;
  is_paid_suspension: boolean;
  reinstatement_date: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface EmployeeFamily {
  id: string;
  employee_id: string;
  relationship_type: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: 'M' | 'F' | null;
  is_dependent: boolean;
  has_health_coverage: boolean;
  birth_certificate_id: string | null;
  id_document_id: string | null;
  additional_info: any;
  created_at: string;
  updated_at: string;
}

export interface HRDocument {
  id: string;
  employee_id: string | null;
  category_id: string | null;
  category_code: string | null;
  document_name: string;
  document_type: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  version: number;
  is_current_version: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_notes: string | null;
  expiry_date: string | null;
  is_archived: boolean;
  archived_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface OHADAAccount {
  id: string;
  account_number: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  account_class: string | null;
  parent_account_id: string | null;
  level: number;
  is_active: boolean;
  requires_analytic: boolean;
  description: string | null;
  created_at: string;
}

export interface PayrollAccountingEntry {
  id: string;
  payroll_calculation_id: string | null;
  entry_date: string;
  journal_code: string;
  entry_number: string | null;
  account_id: string | null;
  account_number: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  entry_type: string | null;
  description: string | null;
  employee_id: string | null;
  cost_center: string | null;
  analytic_code: string | null;
  is_posted: boolean;
  posted_at: string | null;
  posted_by: string | null;
  fiscal_year: number | null;
  fiscal_period: number | null;
  created_at: string;
  updated_at: string;
}
