/*
  # Create Time Tracking and Expense Management System
  
  This migration adds comprehensive time tracking (Timmi-style) and expense management (Cleemy-style) 
  features similar to Lucca SIRH.

  ## 1. New Tables
  
  ### Time Tracking Tables
    - `time_entries` - Daily time entries/timesheets
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `date` (date) - Work date
      - `clock_in` (timestamptz) - Clock in time
      - `clock_out` (timestamptz) - Clock out time
      - `break_duration` (integer) - Break duration in minutes
      - `total_hours` (decimal) - Total worked hours
      - `overtime_hours` (decimal) - Overtime hours
      - `status` (text) - pending, approved, rejected
      - `project_id` (uuid, nullable) - Optional project allocation
      - `notes` (text) - Work description
      - `approved_by` (uuid, nullable)
      - `approved_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `projects` - Projects for time allocation
      - `id` (uuid, primary key)
      - `name` (text) - Project name
      - `code` (text) - Project code
      - `department_id` (uuid, foreign key)
      - `manager_id` (uuid, foreign key to employees)
      - `status` (text) - active, completed, on_hold, cancelled
      - `start_date` (date)
      - `end_date` (date, nullable)
      - `budget_hours` (decimal, nullable)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `work_schedules` - Employee work schedules
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `schedule_type` (text) - full_time, part_time, flexible
      - `hours_per_week` (decimal) - Expected hours per week
      - `monday_hours` (decimal)
      - `tuesday_hours` (decimal)
      - `wednesday_hours` (decimal)
      - `thursday_hours` (decimal)
      - `friday_hours` (decimal)
      - `saturday_hours` (decimal)
      - `sunday_hours` (decimal)
      - `effective_from` (date)
      - `effective_to` (date, nullable)
      - `created_at` (timestamptz)
  
  ### Expense Management Tables
    - `expense_categories` - Expense categories
      - `id` (uuid, primary key)
      - `name` (text) - Category name
      - `code` (text) - Category code
      - `max_amount` (decimal, nullable) - Maximum allowed per expense
      - `requires_receipt` (boolean) - Receipt required
      - `ohada_account_id` (uuid, nullable) - OHADA mapping
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `expense_reports` - Expense report submissions
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `report_number` (text) - Auto-generated report number
      - `title` (text) - Report title
      - `submission_date` (date)
      - `period_start` (date)
      - `period_end` (date)
      - `total_amount` (decimal)
      - `status` (text) - draft, submitted, approved, rejected, paid
      - `approved_by` (uuid, nullable)
      - `approved_at` (timestamptz, nullable)
      - `rejection_reason` (text, nullable)
      - `payment_date` (date, nullable)
      - `payment_method` (text, nullable) - bank_transfer, check, cash
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `expense_items` - Individual expense items
      - `id` (uuid, primary key)
      - `expense_report_id` (uuid, foreign key)
      - `category_id` (uuid, foreign key to expense_categories)
      - `date` (date) - Expense date
      - `description` (text)
      - `amount` (decimal)
      - `currency` (text) - Default XAF
      - `exchange_rate` (decimal) - Default 1
      - `receipt_url` (text, nullable) - Receipt image/document
      - `merchant` (text) - Vendor/merchant name
      - `payment_method` (text) - personal_card, company_card, cash
      - `billable_to_project` (uuid, nullable) - Project ID if billable
      - `vat_amount` (decimal) - VAT amount
      - `is_reimbursable` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ### Engagement Tables
    - `employee_engagement_surveys` - Engagement survey campaigns
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `start_date` (date)
      - `end_date` (date)
      - `status` (text) - draft, active, closed
      - `anonymous` (boolean)
      - `created_by` (uuid)
      - `created_at` (timestamptz)

    - `engagement_questions` - Survey questions
      - `id` (uuid, primary key)
      - `survey_id` (uuid, foreign key)
      - `question_text` (text)
      - `question_type` (text) - rating, text, multiple_choice
      - `options` (jsonb, nullable) - For multiple choice
      - `order` (integer)
      - `created_at` (timestamptz)

    - `engagement_responses` - Employee responses
      - `id` (uuid, primary key)
      - `survey_id` (uuid, foreign key)
      - `question_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key, nullable if anonymous)
      - `response_value` (text)
      - `response_date` (timestamptz)
      - `created_at` (timestamptz)

  ## 2. Security
    - Enable RLS on all new tables
    - Employees can view/create their own records
    - Managers can view/approve their team's records
    - HR/Admin can access all records
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id),
  manager_id uuid REFERENCES employees(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  start_date date NOT NULL,
  end_date date,
  budget_hours decimal(10,2),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Work schedules table
CREATE TABLE IF NOT EXISTS work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  schedule_type text DEFAULT 'full_time' CHECK (schedule_type IN ('full_time', 'part_time', 'flexible')),
  hours_per_week decimal(5,2) DEFAULT 40,
  monday_hours decimal(5,2) DEFAULT 8,
  tuesday_hours decimal(5,2) DEFAULT 8,
  wednesday_hours decimal(5,2) DEFAULT 8,
  thursday_hours decimal(5,2) DEFAULT 8,
  friday_hours decimal(5,2) DEFAULT 8,
  saturday_hours decimal(5,2) DEFAULT 0,
  sunday_hours decimal(5,2) DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz DEFAULT now()
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  break_duration integer DEFAULT 0,
  total_hours decimal(5,2),
  overtime_hours decimal(5,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  project_id uuid REFERENCES projects(id),
  notes text,
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  max_amount decimal(15,2),
  requires_receipt boolean DEFAULT true,
  ohada_account_id uuid REFERENCES ohada_accounts(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Expense reports table
CREATE TABLE IF NOT EXISTS expense_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  report_number text UNIQUE NOT NULL,
  title text NOT NULL,
  submission_date date DEFAULT CURRENT_DATE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount decimal(15,2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  rejection_reason text,
  payment_date date,
  payment_method text CHECK (payment_method IN ('bank_transfer', 'check', 'cash')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expense items table
CREATE TABLE IF NOT EXISTS expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_report_id uuid REFERENCES expense_reports(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES expense_categories(id) NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  amount decimal(15,2) NOT NULL,
  currency text DEFAULT 'XAF',
  exchange_rate decimal(10,4) DEFAULT 1,
  receipt_url text,
  merchant text,
  payment_method text DEFAULT 'personal_card' CHECK (payment_method IN ('personal_card', 'company_card', 'cash')),
  billable_to_project uuid REFERENCES projects(id),
  vat_amount decimal(15,2) DEFAULT 0,
  is_reimbursable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Employee engagement surveys
CREATE TABLE IF NOT EXISTS employee_engagement_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  anonymous boolean DEFAULT true,
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

-- Engagement questions
CREATE TABLE IF NOT EXISTS engagement_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES employee_engagement_surveys(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text DEFAULT 'rating' CHECK (question_type IN ('rating', 'text', 'multiple_choice')),
  options jsonb,
  order_num integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Engagement responses
CREATE TABLE IF NOT EXISTS engagement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES employee_engagement_surveys(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES engagement_questions(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id),
  response_value text NOT NULL,
  response_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_engagement_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Everyone can view active projects"
  ON projects FOR SELECT
  TO authenticated
  USING (status = 'active' OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
  ));

CREATE POLICY "Managers and admins can manage projects"
  ON projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

-- RLS Policies for time_entries
CREATE POLICY "Employees can view own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

CREATE POLICY "Employees can create own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can update own pending time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND status = 'pending'
  );

CREATE POLICY "Managers can approve team time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

-- RLS Policies for expense_categories
CREATE POLICY "Everyone can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

-- RLS Policies for expense_reports
CREATE POLICY "Employees can view own expense reports"
  ON expense_reports FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

CREATE POLICY "Employees can create own expense reports"
  ON expense_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can update own draft expense reports"
  ON expense_reports FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND status = 'draft'
  );

CREATE POLICY "Managers can approve expense reports"
  ON expense_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

-- RLS Policies for expense_items
CREATE POLICY "Users can view expense items from visible reports"
  ON expense_items FOR SELECT
  TO authenticated
  USING (
    expense_report_id IN (
      SELECT id FROM expense_reports
      WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

CREATE POLICY "Users can manage items in own draft reports"
  ON expense_items FOR ALL
  TO authenticated
  USING (
    expense_report_id IN (
      SELECT id FROM expense_reports
      WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
      AND status = 'draft'
    )
  );

-- RLS Policies for engagement surveys
CREATE POLICY "Everyone can view active surveys"
  ON employee_engagement_surveys FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage surveys"
  ON employee_engagement_surveys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'qvct_manager')
    )
  );

CREATE POLICY "Everyone can view questions from active surveys"
  ON engagement_questions FOR SELECT
  TO authenticated
  USING (
    survey_id IN (SELECT id FROM employee_engagement_surveys WHERE status = 'active')
  );

CREATE POLICY "Employees can submit survey responses"
  ON engagement_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IS NULL
  );

-- Insert default expense categories
INSERT INTO expense_categories (name, code, max_amount, requires_receipt) VALUES
  ('Transport', 'TRANSP', 50000, true),
  ('Repas', 'MEAL', 15000, true),
  ('Hébergement', 'HOTEL', 200000, true),
  ('Carburant', 'FUEL', 100000, true),
  ('Fournitures', 'SUPPLIES', 50000, false),
  ('Communication', 'COMM', 30000, false),
  ('Formation', 'TRAINING', 500000, true),
  ('Client', 'CLIENT', 100000, true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (name, code, department_id, start_date, description) 
SELECT 
  'Projet ' || name,
  'PROJ-' || SUBSTRING(name, 1, 3),
  id,
  CURRENT_DATE - INTERVAL '30 days',
  'Projet du département ' || name
FROM departments
LIMIT 5
ON CONFLICT (code) DO NOTHING;
