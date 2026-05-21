/*
  # Système QVCT (Qualité de Vie et Conditions de Travail)
  
  1. Nouvelles tables
    - `qvct_announcements` - Annonces et communications internes
    - `qvct_surveys` - Enquêtes de satisfaction
    - `qvct_survey_responses` - Réponses aux enquêtes
    - `qvct_events` - Événements d'entreprise
    - `qvct_event_participants` - Participants aux événements
    - `qvct_suggestions` - Boîte à idées/suggestions
    - `qvct_health_incidents` - Incidents de santé au travail
    - `qvct_benefits` - Avantages sociaux
    - `qvct_employee_benefits` - Attribution des avantages aux employés
    
  2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies appropriées par rôle (DRH, managers, employés)
    
  3. Données incluses
    - Types d'événements (team building, formation, social)
    - Types de suggestions (amélioration, innovation, bien-être)
    - Types d'incidents (accident, maladie, risque psychosocial)
    - Types d'avantages (mutuelle, transport, repas, etc.)
*/

-- Table des annonces et communications
CREATE TABLE IF NOT EXISTS qvct_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  published_by uuid REFERENCES user_profiles(id),
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  target_audience text DEFAULT 'all',
  is_active boolean DEFAULT true,
  attachment_url text,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des enquêtes de satisfaction
CREATE TABLE IF NOT EXISTS qvct_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  survey_type text NOT NULL DEFAULT 'satisfaction',
  status text NOT NULL DEFAULT 'draft',
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid REFERENCES user_profiles(id),
  questions jsonb NOT NULL DEFAULT '[]',
  target_audience text DEFAULT 'all',
  is_anonymous boolean DEFAULT true,
  response_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des réponses aux enquêtes
CREATE TABLE IF NOT EXISTS qvct_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES qvct_surveys(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id),
  responses jsonb NOT NULL DEFAULT '{}',
  satisfaction_score numeric,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table des événements d'entreprise
CREATE TABLE IF NOT EXISTS qvct_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'social',
  location text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  max_participants integer,
  registration_deadline date,
  organized_by uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'planned',
  budget numeric DEFAULT 0,
  participants_count integer DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des participants aux événements
CREATE TABLE IF NOT EXISTS qvct_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES qvct_events(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id),
  registration_date timestamptz DEFAULT now(),
  attendance_status text DEFAULT 'registered',
  feedback text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Table des suggestions/boîte à idées
CREATE TABLE IF NOT EXISTS qvct_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'improvement',
  submitted_by uuid REFERENCES employees(id),
  is_anonymous boolean DEFAULT false,
  status text NOT NULL DEFAULT 'submitted',
  priority text DEFAULT 'medium',
  assigned_to uuid REFERENCES user_profiles(id),
  implementation_date date,
  feedback text,
  votes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des incidents de santé au travail
CREATE TABLE IF NOT EXISTS qvct_health_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL DEFAULT 'minor_injury',
  employee_id uuid REFERENCES employees(id),
  incident_date timestamptz NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  witness_names text,
  medical_attention_required boolean DEFAULT false,
  days_lost integer DEFAULT 0,
  reported_by uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'reported',
  investigation_notes text,
  preventive_actions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des avantages sociaux
CREATE TABLE IF NOT EXISTS qvct_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  benefit_type text NOT NULL,
  description text,
  value numeric,
  eligibility_criteria text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table d'attribution des avantages aux employés
CREATE TABLE IF NOT EXISTS qvct_employee_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  benefit_id uuid REFERENCES qvct_benefits(id),
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  monthly_value numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS sur toutes les tables
ALTER TABLE qvct_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_health_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_employee_benefits ENABLE ROW LEVEL SECURITY;

-- Policies pour qvct_announcements
CREATE POLICY "Everyone can view active announcements"
  ON qvct_announcements FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "DRH can manage announcements"
  ON qvct_announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_surveys
CREATE POLICY "Everyone can view active surveys"
  ON qvct_surveys FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "DRH can manage surveys"
  ON qvct_surveys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_survey_responses
CREATE POLICY "Employees can submit survey responses"
  ON qvct_survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = employee_id
    )
  );

CREATE POLICY "DRH can view all responses"
  ON qvct_survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_events
CREATE POLICY "Everyone can view events"
  ON qvct_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "DRH can manage events"
  ON qvct_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'manager')
    )
  );

-- Policies pour qvct_event_participants
CREATE POLICY "Employees can register for events"
  ON qvct_event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = employee_id
    )
  );

CREATE POLICY "Employees can view own registrations"
  ON qvct_event_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = employee_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'manager')
    )
  );

-- Policies pour qvct_suggestions
CREATE POLICY "Employees can submit suggestions"
  ON qvct_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = submitted_by
    )
  );

CREATE POLICY "Everyone can view suggestions"
  ON qvct_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "DRH can manage suggestions"
  ON qvct_suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_health_incidents
CREATE POLICY "Employees can report incidents"
  ON qvct_health_incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND (employees.id = employee_id OR auth.uid() = reported_by)
    )
  );

CREATE POLICY "DRH can view all incidents"
  ON qvct_health_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

CREATE POLICY "DRH can manage incidents"
  ON qvct_health_incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_benefits
CREATE POLICY "Everyone can view benefits"
  ON qvct_benefits FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "DRH can manage benefits"
  ON qvct_benefits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_employee_benefits
CREATE POLICY "Employees can view own benefits"
  ON qvct_employee_benefits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = employee_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

CREATE POLICY "DRH can manage employee benefits"
  ON qvct_employee_benefits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_qvct_announcements_published_at ON qvct_announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_qvct_announcements_active ON qvct_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_qvct_surveys_status ON qvct_surveys(status);
CREATE INDEX IF NOT EXISTS idx_qvct_events_start_date ON qvct_events(start_date);
CREATE INDEX IF NOT EXISTS idx_qvct_suggestions_status ON qvct_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_qvct_health_incidents_date ON qvct_health_incidents(incident_date DESC);
