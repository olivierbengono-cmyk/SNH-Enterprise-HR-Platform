/*
# Fix candidate document types constraint and add withdraw RLS policy

## Problems fixed

### 1. candidate_documents type constraint
The frontend sends type values like 'cni_passport', 'employment_cert', 'birth_cert', etc.
The existing CHECK constraint only allowed a subset of French-named types, causing inserts
to fail silently for most document categories. This migration drops the old constraint
and adds a new one covering all values used by the frontend.

### 2. candidate_applications UPDATE policy for candidates
There was no RLS UPDATE policy allowing candidates to update their own applications.
The "dépostuler" (withdraw) button failed silently because RLS blocked the update.
This adds a policy allowing candidates to set status='withdrawn' on their own applications only.

## Changes

### candidate_documents
- Drop old type constraint
- Add new constraint with all frontend values + existing DB values

### candidate_applications
- Add UPDATE policy for candidates limited to setting status='withdrawn'
*/

-- ── 1. Expand the type constraint on candidate_documents ──────────────────────

ALTER TABLE candidate_documents
  DROP CONSTRAINT IF EXISTS candidate_documents_type_check;

ALTER TABLE candidate_documents
  ADD CONSTRAINT candidate_documents_type_check
  CHECK (type = ANY (ARRAY[
    -- Original types
    'cv', 'cover_letter', 'diploma', 'reference', 'other',
    'cni_passeport', 'attestation_emploi', 'certificat_travail',
    'casier_judiciaire', 'attestation_diplome', 'photo',
    'bulletin_salaire', 'contrat_travail',
    -- Frontend types used in the portal
    'cni_passport', 'employment_cert', 'work_cert', 'criminal_record',
    'birth_cert', 'residence_cert', 'medical_cert', 'tax_cert', 'cnps_cert'
  ]));

-- ── 2. Add UPDATE policy so candidates can withdraw their own applications ─────

DROP POLICY IF EXISTS "Candidates can withdraw own applications" ON candidate_applications;
CREATE POLICY "Candidates can withdraw own applications"
  ON candidate_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_applications.candidate_id
        AND candidates.user_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'withdrawn'
    AND EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_applications.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );
