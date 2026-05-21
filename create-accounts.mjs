import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  const envContent = readFileSync('.env', 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      envVars[key.trim()] = value.trim();
    }
  });

  return envVars;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createEmployeeAccounts() {
  console.log('🚀 Début de la création des comptes employés...\n');

  const { data: employees, error: employeesError } = await supabaseAdmin
    .from('employees')
    .select('id, employee_number, email, first_name, last_name, user_id')
    .eq('employment_status', 'active');

  if (employeesError) {
    console.error('❌ Erreur lors de la récupération des employés:', employeesError);
    return;
  }

  console.log(`📊 ${employees.length} employés actifs trouvés\n`);

  const results = {
    success: 0,
    skipped: 0,
    errors: 0,
  };

  for (const employee of employees) {
    if (employee.user_id) {
      results.skipped++;
      console.log(`⏭️  ${employee.employee_number} - Compte déjà existant`);
      continue;
    }

    if (!employee.email) {
      results.errors++;
      console.log(`❌ ${employee.employee_number} - Pas d'email`);
      continue;
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: employee.email,
        password: employee.employee_number,
        email_confirm: true,
      });

      if (authError) throw authError;

      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: employee.email,
          first_name: employee.first_name,
          last_name: employee.last_name,
          role: 'employee',
          employee_id: employee.id,
          password_changed: false,
        });

      if (profileError) throw profileError;

      const { error: employeeUpdateError } = await supabaseAdmin
        .from('employees')
        .update({ user_id: authData.user.id })
        .eq('id', employee.id);

      if (employeeUpdateError) throw employeeUpdateError;

      results.success++;
      console.log(`✅ ${employee.employee_number} - ${employee.email} - Compte créé`);
    } catch (err) {
      results.errors++;
      console.log(`❌ ${employee.employee_number} - Erreur: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DE L\'OPÉRATION');
  console.log('='.repeat(60));
  console.log(`✅ Comptes créés avec succès: ${results.success}`);
  console.log(`⏭️  Comptes ignorés (déjà existants): ${results.skipped}`);
  console.log(`❌ Erreurs: ${results.errors}`);
  console.log('='.repeat(60) + '\n');

  if (results.success > 0) {
    console.log('🎉 Les employés peuvent maintenant se connecter avec:');
    console.log('   - Email: leur email professionnel');
    console.log('   - Mot de passe: leur matricule');
    console.log('   - Ils devront changer leur mot de passe à la première connexion\n');
  }
}

createEmployeeAccounts();
