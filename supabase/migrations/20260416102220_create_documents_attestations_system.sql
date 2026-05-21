/*
  # Systeme de Gestion des Documents et Attestations

  ## Description
  Ce module permet la gestion complete des documents RH et la generation d'attestations
  pour les employes (attestation de travail, certificat de salaire, attestation de
  presence, etc.).

  ## Nouvelles Tables

  ### document_requests
  - Demandes d'attestations et de documents par les employes
  - Suivi du statut (en attente, approuvee, rejetee, disponible)
  - Types: attestation_travail, certificat_salaire, attestation_presence,
           attestation_conge, lettre_recommandation, autre

  ## Securite
  - RLS activee
  - Les employes voient uniquement leurs propres demandes
  - La DRH/admin/career_manager/payroll_manager gerent toutes les demandes
*/

CREATE TABLE IF NOT EXISTS document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN (
    'attestation_travail',
    'certificat_salaire',
    'attestation_presence',
    'attestation_conge',
    'lettre_recommandation',
    'bulletin_paie',
    'contrat_travail',
    'autre'
  )),
  purpose text,
  additional_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ready')),
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  rejection_reason text,
  document_url text,
  urgency text DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
  requested_language text DEFAULT 'fr' CHECK (requested_language IN ('fr', 'en')),
  copies_count integer DEFAULT 1 CHECK (copies_count BETWEEN 1 AND 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own document requests"
  ON document_requests FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager', 'payroll_manager')
    )
  );

CREATE POLICY "Employees can insert own document requests"
  ON document_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager')
    )
  );

CREATE POLICY "HR staff can update document requests"
  ON document_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager', 'payroll_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager', 'payroll_manager')
    )
  );

CREATE POLICY "HR staff can delete document requests"
  ON document_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_document_requests_employee_id ON document_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_created_at ON document_requests(created_at DESC);
