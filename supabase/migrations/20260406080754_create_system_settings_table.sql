/*
  # Create system_settings table for application configuration

  1. New Tables
    - `system_settings`
      - `id` (integer, primary key) - Single row configuration
      - `company_name` (text) - Company name
      - `company_siret` (text) - Company SIRET number
      - `company_address` (text) - Company address
      - `company_city` (text) - Company city
      - `company_postal_code` (text) - Company postal code
      - `company_phone` (text) - Company phone number
      - `company_email` (text) - Company email
      - `default_work_hours` (integer) - Default work hours per week
      - `default_leave_days` (integer) - Default annual leave days
      - `currency` (text) - Default currency
      - `date_format` (text) - Date format preference
      - `timezone` (text) - Timezone setting
      - `language` (text) - Language preference
      - `notification_settings` (jsonb) - Notification configuration
      - `security_settings` (jsonb) - Security configuration
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `system_settings` table
    - Only admin and drh roles can read settings
    - Only admin and drh roles can update settings
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  company_name text DEFAULT 'SNH - Société Nouvelle des Hydrocarbures',
  company_siret text DEFAULT '123 456 789 00012',
  company_address text DEFAULT '123 Avenue des Champs',
  company_city text DEFAULT 'Paris',
  company_postal_code text DEFAULT '75008',
  company_phone text DEFAULT '+33 1 23 45 67 89',
  company_email text DEFAULT 'contact@snh.com',
  default_work_hours integer DEFAULT 35,
  default_leave_days integer DEFAULT 25,
  currency text DEFAULT 'EUR',
  date_format text DEFAULT 'DD/MM/YYYY',
  timezone text DEFAULT 'Europe/Paris',
  language text DEFAULT 'fr-FR',
  notification_settings jsonb DEFAULT '{"email_notifications": true, "leave_requests": true, "payroll_ready": true, "training_reminders": true, "system_alerts": true}'::jsonb,
  security_settings jsonb DEFAULT '{"password_expiry_days": 90, "force_password_change": true, "two_factor_enabled": false, "session_timeout_minutes": 60}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row_constraint CHECK (id = 1)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and DRH can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

CREATE POLICY "Admin and DRH can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

CREATE POLICY "Admin and DRH can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

INSERT INTO system_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
