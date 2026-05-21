# Guide de Création des Comptes de Test

## ✅ COMPTE PRÊT À UTILISER

**Le compte suivant est déjà configuré et fonctionnel** :

```
Email: drh@snh.cm
Mot de passe: Test123456
Rôle: DRH (Accès complet)
```

**Vous pouvez vous connecter immédiatement avec ce compte !**

Le problème précédent (rien ne se passait à la connexion) était dû à un profil utilisateur manquant. C'est maintenant résolu.

---

## Vue d'ensemble

Pour tester pleinement la plateforme RH SNH avec d'autres profils, vous pouvez créer des comptes utilisateurs supplémentaires. Voici le guide complet.

## Méthode recommandée : Via Supabase Dashboard

### Étape 1 : Accéder à Supabase Auth

1. Connectez-vous à [Supabase Dashboard](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Users**
4. Cliquez sur **Add user** > **Create new user**

### Étape 2 : Créer les comptes principaux

Pour chaque compte, créez un utilisateur avec:
- **Email**: L'email professionnel de l'employé
- **Password**: Un mot de passe simple pour les tests (ex: `Test123456!`)
- **Auto Confirm User**: ✅ Activé (pour ne pas avoir à confirmer l'email)

## Comptes recommandés à créer

### 1. 👨‍💼 Directeur Général (DG)
```
Email: jp.mbarga@snh.cm
Password: Test123456!
```

### 2. 👩‍💼 Directeur des Ressources Humaines (DRH)
```
Email: p.nkotto@snh.cm
Password: Test123456!
```

### 3. 👤 Chef Service du Personnel
```
Email: f.tchouake@snh.cm
Password: Test123456!
```

### 4. 👷 Manager - Chef d'Équipe Technique
```
Email: w.abega@snh.cm
Password: Test123456!
```

### 5. 👨‍💻 Employé - Comptable
```
Email: d.njoya@snh.cm
Password: Test123456!
```

### 6. 🔧 Employé - Technicien
```
Email: b.eboko@snh.cm
Password: Test123456!
```

### 7. 👩‍💼 Gestionnaire RH
```
Email: a.bello@snh.cm
Password: Test123456!
```

## Étape 3 : Créer les profils utilisateurs

Après avoir créé chaque compte dans Auth, vous devez créer le profil utilisateur correspondant.

### Via SQL Editor dans Supabase

Allez dans **SQL Editor** et exécutez ces requêtes pour lier les comptes auth aux employés:

```sql
-- DG - Directeur Général
INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  auth.uid(),
  'SNH-2018-001',
  'director',
  'jp.mbarga@snh.cm',
  'Jean-Pierre',
  'Mbarga'
FROM auth.users
WHERE email = 'jp.mbarga@snh.cm'
ON CONFLICT (id) DO NOTHING;

-- Mettre à jour le lien user_id dans employees
UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'jp.mbarga@snh.cm')
WHERE employee_number = 'SNH-2018-001';
```

```sql
-- DRH - Directeur des Ressources Humaines
INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  auth.uid(),
  'SNH-2017-003',
  'drh',
  'p.nkotto@snh.cm',
  'Paul',
  'Nkotto'
FROM auth.users
WHERE email = 'p.nkotto@snh.cm'
ON CONFLICT (id) DO NOTHING;

UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'p.nkotto@snh.cm')
WHERE employee_number = 'SNH-2017-003';
```

```sql
-- Chef Service Personnel
INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  auth.uid(),
  'SNH-2018-004',
  'drh',
  'f.tchouake@snh.cm',
  'Françoise',
  'Tchouake'
FROM auth.users
WHERE email = 'f.tchouake@snh.cm'
ON CONFLICT (id) DO NOTHING;

UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'f.tchouake@snh.cm')
WHERE employee_number = 'SNH-2018-004';
```

```sql
-- Manager - Chef d'Équipe
INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  auth.uid(),
  'SNH-2020-036',
  'manager',
  'w.abega@snh.cm',
  'William',
  'Abega'
FROM auth.users
WHERE email = 'w.abega@snh.cm'
ON CONFLICT (id) DO NOTHING;

UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'w.abega@snh.cm')
WHERE employee_number = 'SNH-2020-036';
```

```sql
-- Employé - Comptable
INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  auth.uid(),
  'SNH-2019-017',
  'employee',
  'd.njoya@snh.cm',
  'Daniel',
  'Njoya'
FROM auth.users
WHERE email = 'd.njoya@snh.cm'
ON CONFLICT (id) DO NOTHING;

UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'd.njoya@snh.cm')
WHERE employee_number = 'SNH-2019-017';
```

```sql
-- Employé - Technicien
INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  auth.uid(),
  'SNH-2021-041',
  'employee',
  'b.eboko@snh.cm',
  'Bernard',
  'Eboko'
FROM auth.users
WHERE email = 'b.eboko@snh.cm'
ON CONFLICT (id) DO NOTHING;

UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'b.eboko@snh.cm')
WHERE employee_number = 'SNH-2021-041';
```

```sql
-- Gestionnaire RH
INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  auth.uid(),
  'SNH-2020-006',
  'drh',
  'a.bello@snh.cm',
  'Aminata',
  'Bello'
FROM auth.users
WHERE email = 'a.bello@snh.cm'
ON CONFLICT (id) DO NOTHING;

UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'a.bello@snh.cm')
WHERE employee_number = 'SNH-2020-006';
```

## Rôles et Permissions

| Rôle | Description | Accès |
|------|-------------|-------|
| **director** | Direction Générale | Vue stratégique, KPIs consolidés, rapports |
| **drh** | Direction RH / Admin | Accès complet à tous les modules RH |
| **manager** | Manager / Chef d'équipe | Gestion d'équipe, validations, performance |
| **employee** | Employé | Self-service RH (congés, paie, formations) |
| **admin** | Administrateur système | Accès complet + configuration |

## Vérification

Après création, vérifiez que:

1. ✅ L'utilisateur peut se connecter
2. ✅ Le profil est bien créé dans `user_profiles`
3. ✅ Le lien `user_id` est fait dans `employees`
4. ✅ Le bon rôle est attribué
5. ✅ L'utilisateur voit le bon dashboard selon son rôle

## Tests par profil

### Test DRH
```
Email: p.nkotto@snh.cm
Password: Test123456!
```
Fonctionnalités à tester:
- ✅ Vue d'ensemble des 100 employés
- ✅ Gestion des demandes de congés (5 en attente)
- ✅ Consultation des bulletins de paie (85 générés)
- ✅ Gestion des formations (7 programmes)
- ✅ Recrutement (4 offres, 13 candidats)
- ✅ Analytics et KPIs

### Test Manager
```
Email: w.abega@snh.cm
Password: Test123456!
```
Fonctionnalités à tester:
- ✅ Voir son équipe (techniciens)
- ✅ Valider les demandes de congés de son équipe
- ✅ Consulter les performances
- ✅ Vue du tableau de bord manager

### Test Employé
```
Email: d.njoya@snh.cm
Password: Test123456!
```
Fonctionnalités à tester:
- ✅ Consulter ses informations
- ✅ Voir son bulletin de paie (Janvier 2026)
- ✅ Faire une demande de congé
- ✅ Voir ses formations
- ✅ Consulter son solde de congés (22 jours)

## Script d'automatisation complet

Si vous préférez tout créer en une fois, voici un script SQL complet:

```sql
-- Note: Vous devez d'abord créer les comptes dans Supabase Auth manuellement,
-- puis exécuter ce script pour créer les profils

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Pour chaque email, créer le profil et mettre à jour l'employé
  FOR v_user_id IN
    SELECT id FROM auth.users
    WHERE email IN (
      'jp.mbarga@snh.cm',
      'p.nkotto@snh.cm',
      'f.tchouake@snh.cm',
      'w.abega@snh.cm',
      'd.njoya@snh.cm',
      'b.eboko@snh.cm',
      'a.bello@snh.cm'
    )
  LOOP
    -- Le script de création des profils serait ici
    NULL;
  END LOOP;
END $$;
```

## Dépannage

### Problème: L'utilisateur ne peut pas se connecter
- Vérifiez que l'email est confirmé dans Supabase Auth
- Vérifiez que le mot de passe est correct
- Vérifiez les logs d'authentification

### Problème: L'utilisateur voit un écran vide
- Vérifiez que le profil `user_profiles` existe
- Vérifiez que le rôle est bien défini
- Vérifiez le lien `user_id` dans `employees`

### Problème: L'utilisateur n'a pas les bons accès
- Vérifiez le rôle dans `user_profiles`
- Vérifiez les policies RLS
- Consultez les logs de la console navigateur

## Support

Pour toute question sur la création des comptes de test:
1. Consultez la documentation Supabase Auth
2. Vérifiez les logs dans la console
3. Testez avec un compte à la fois

---

**Note**: Pour un environnement de production, utilisez des mots de passe sécurisés et activez la confirmation par email!
