/*
  # Génération des données de paie pour Janvier 2026
  
  1. Objectif
    - Générer 85 bulletins de paie pour le mois de janvier 2026
    - Calculer les salaires en fonction du type de contrat et du niveau
    - Inclure les charges sociales et déductions
    
  2. Structure de données
    - Salaires bruts basés sur des grilles salariales réalistes
    - Déductions incluant CNPS, IRPP, etc.
    - Salaires nets calculés
    
  3. Données générées
    - 85 bulletins sur 100 employés
    - Masse salariale totale d'environ 200 millions XAF
*/

-- Fonction temporaire pour générer un salaire basé sur le niveau
DO $$
DECLARE
  emp_record RECORD;
  v_base_salary numeric;
  v_gross_salary numeric;
  v_cnps_base numeric;
  v_cnps_employee numeric;
  v_cnps_employer numeric;
  v_irpp numeric;
  v_total_deductions numeric;
  v_net_salary numeric;
  v_count integer := 0;
BEGIN
  FOR emp_record IN 
    SELECT e.id, COALESCE(p.level, 'junior') as level
    FROM employees e
    LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.employment_status = 'active'
      AND e.hire_date < '2026-01-01'
    LIMIT 85
  LOOP
    -- Calculer le salaire de base selon le niveau
    v_base_salary := CASE 
      WHEN emp_record.level = 'direction' THEN 6500000 + (RANDOM() * 2000000)::int
      WHEN emp_record.level = 'manager' THEN 3500000 + (RANDOM() * 1000000)::int
      WHEN emp_record.level = 'senior' THEN 2500000 + (RANDOM() * 500000)::int
      WHEN emp_record.level = 'intermediate' THEN 1800000 + (RANDOM() * 400000)::int
      ELSE 1200000 + (RANDOM() * 300000)::int
    END;
    
    -- Salaire brut (avec primes)
    v_gross_salary := v_base_salary * 1.1;
    
    -- Base CNPS (plafonnée à 750000)
    v_cnps_base := LEAST(v_gross_salary, 750000);
    
    -- Cotisations CNPS
    v_cnps_employee := v_cnps_base * 0.0428;
    v_cnps_employer := v_cnps_base * 0.1677;
    
    -- IRPP (progressif)
    v_irpp := CASE 
      WHEN v_gross_salary <= 2000000 THEN v_gross_salary * 0.10
      WHEN v_gross_salary <= 3000000 THEN 200000 + (v_gross_salary - 2000000) * 0.15
      WHEN v_gross_salary <= 5000000 THEN 350000 + (v_gross_salary - 3000000) * 0.25
      ELSE 850000 + (v_gross_salary - 5000000) * 0.35
    END;
    
    -- Total déductions
    v_total_deductions := v_cnps_employee + v_irpp;
    
    -- Salaire net
    v_net_salary := v_gross_salary - v_total_deductions;
    
    -- Insérer le bulletin
    INSERT INTO payroll_calculations (
      employee_id,
      period_month,
      period_year,
      calculation_date,
      base_salary,
      gross_salary,
      taxable_salary,
      cnps_base,
      total_gains,
      total_deductions,
      employee_contributions,
      employer_contributions,
      irpp_amount,
      cnps_employee,
      cnps_employer,
      net_salary,
      net_to_pay,
      status,
      validation_date,
      created_at
    ) VALUES (
      emp_record.id,
      1,
      2026,
      '2026-01-25 10:00:00+00'::timestamptz,
      v_base_salary,
      v_gross_salary,
      v_gross_salary,
      v_cnps_base,
      v_gross_salary,
      v_total_deductions,
      v_cnps_employee,
      v_cnps_employer,
      v_irpp,
      v_cnps_employee,
      v_cnps_employer,
      v_net_salary,
      v_net_salary,
      'validated',
      '2026-01-26 14:00:00+00'::timestamptz,
      NOW()
    ) ON CONFLICT DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % payroll records for January 2026', v_count;
END $$;
