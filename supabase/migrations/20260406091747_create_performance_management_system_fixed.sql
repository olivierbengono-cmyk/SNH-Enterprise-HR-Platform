/*
  # Create Performance Management System

  ## Overview
  Complete performance management system with OKRs, reviews, 360 feedback, and development plans.

  ## New Tables
  
  ### 1. `objectives` - Employee objectives and key results (OKR)
  ### 2. `key_results` - Key results for objectives
  ### 3. `performance_reviews` - Performance review cycles
  ### 4. `feedback_360` - 360 degree feedback requests
  ### 5. `feedback_responses` - Individual feedback responses
  ### 6. `development_plans` - Individual Development Plans (IDP)
  ### 7. `development_actions` - Actions within development plans
  ### 8. `competency_framework` - Competency definitions

  ## Security
  - Enable RLS on all tables
  - Employees can view their own performance data
  - Managers can view and edit their team members' data
  - HR can manage all performance data
*/

-- Create objectives table
CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('individual', 'team', 'company')),
  period text NOT NULL CHECK (period IN ('Q1', 'Q2', 'Q3', 'Q4', 'annual')),
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create key results table
CREATE TABLE IF NOT EXISTS key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES objectives(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  metric text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  unit text NOT NULL,
  weight integer DEFAULT 100 CHECK (weight >= 0 AND weight <= 100),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'at_risk', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create performance reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES employees(id) NOT NULL,
  review_period text NOT NULL CHECK (review_period IN ('Q1', 'Q2', 'Q3', 'Q4', 'annual', 'probation')),
  review_year integer NOT NULL,
  review_type text NOT NULL CHECK (review_type IN ('self', 'manager', 'peer', '360')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'validated')),
  overall_rating numeric CHECK (overall_rating >= 1 AND overall_rating <= 5),
  strengths text,
  areas_for_improvement text,
  achievements text,
  goals_met text,
  comments text,
  competencies jsonb DEFAULT '[]'::jsonb,
  submitted_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create feedback 360 table
CREATE TABLE IF NOT EXISTS feedback_360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES employees(id) NOT NULL,
  campaign_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create feedback responses table
CREATE TABLE IF NOT EXISTS feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_360_id uuid REFERENCES feedback_360(id) ON DELETE CASCADE NOT NULL,
  respondent_id uuid REFERENCES employees(id) NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('manager', 'peer', 'direct_report', 'self')),
  ratings jsonb DEFAULT '{}'::jsonb,
  strengths text,
  areas_for_development text,
  additional_comments text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create development plans table
CREATE TABLE IF NOT EXISTS development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  start_date date NOT NULL,
  target_completion_date date NOT NULL,
  actual_completion_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create development actions table
CREATE TABLE IF NOT EXISTS development_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES development_plans(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('training', 'mentoring', 'project', 'certification', 'other')),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  due_date date NOT NULL,
  completion_date date,
  resources_needed text,
  progress_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create competency framework table
CREATE TABLE IF NOT EXISTS competency_framework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('technical', 'behavioral', 'leadership', 'core')),
  description text NOT NULL,
  level_definitions jsonb DEFAULT '{}'::jsonb,
  applicable_roles text[] DEFAULT ARRAY[]::text[],
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_framework ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is HR/manager
CREATE OR REPLACE FUNCTION is_hr_or_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('drh', 'career_manager', 'admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for objectives
CREATE POLICY "Employees can view own objectives"
  ON objectives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = objectives.employee_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Employees can manage own objectives"
  ON objectives FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = objectives.employee_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for key_results
CREATE POLICY "Users can view key results"
  ON key_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectives o
      JOIN employees e ON e.id = o.employee_id
      WHERE o.id = key_results.objective_id
      AND (e.user_id = auth.uid() OR is_hr_or_manager())
    )
  );

CREATE POLICY "Users can manage key results"
  ON key_results FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectives o
      JOIN employees e ON e.id = o.employee_id
      WHERE o.id = key_results.objective_id
      AND (e.user_id = auth.uid() OR is_hr_or_manager())
    )
  );

-- RLS Policies for performance_reviews
CREATE POLICY "Users can view relevant reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE (employees.id = performance_reviews.employee_id 
         OR employees.id = performance_reviews.reviewer_id)
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Reviewers can manage reviews"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = performance_reviews.reviewer_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for feedback_360
CREATE POLICY "Users can view relevant feedback campaigns"
  ON feedback_360 FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE (employees.id = feedback_360.employee_id 
         OR employees.id = feedback_360.requester_id)
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Managers can manage feedback campaigns"
  ON feedback_360 FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = feedback_360.requester_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for feedback_responses
CREATE POLICY "Users can view feedback responses"
  ON feedback_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = feedback_responses.respondent_id
      AND employees.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM feedback_360 f
      JOIN employees e ON e.id = f.employee_id
      WHERE f.id = feedback_responses.feedback_360_id
      AND e.user_id = auth.uid()
      AND f.anonymous = false
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Users can submit feedback responses"
  ON feedback_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = feedback_responses.respondent_id
      AND employees.user_id = auth.uid()
    )
  );

-- RLS Policies for development_plans
CREATE POLICY "Users can view development plans"
  ON development_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = development_plans.employee_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Users can manage own development plans"
  ON development_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = development_plans.employee_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for development_actions
CREATE POLICY "Users can view development actions"
  ON development_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM development_plans dp
      JOIN employees e ON e.id = dp.employee_id
      WHERE dp.id = development_actions.plan_id
      AND (e.user_id = auth.uid() OR is_hr_or_manager())
    )
  );

CREATE POLICY "Users can manage development actions"
  ON development_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM development_plans dp
      JOIN employees e ON e.id = dp.employee_id
      WHERE dp.id = development_actions.plan_id
      AND (e.user_id = auth.uid() OR is_hr_or_manager())
    )
  );

-- RLS Policies for competency_framework
CREATE POLICY "Everyone can view active competencies"
  ON competency_framework FOR SELECT
  TO authenticated
  USING (active = true OR is_hr_or_manager());

CREATE POLICY "HR can manage competency framework"
  ON competency_framework FOR ALL
  TO authenticated
  USING (is_hr_or_manager());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_objectives_employee_id ON objectives(employee_id);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_period_year ON objectives(period, year);
CREATE INDEX IF NOT EXISTS idx_key_results_objective_id ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_feedback_360_employee_id ON feedback_360(employee_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_feedback_360_id ON feedback_responses(feedback_360_id);
CREATE INDEX IF NOT EXISTS idx_development_plans_employee_id ON development_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_development_actions_plan_id ON development_actions(plan_id);