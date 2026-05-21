# 🚀 Connexion Rapide - Comptes de Test

## ⚠️ IMPORTANT : Création des comptes requise

L'application utilise l'authentification Supabase. Vous devez créer les comptes via le dashboard Supabase.

## 🔑 Comptes recommandés à créer

### Option A : Comptes simplifiés (3 comptes)

#### 1. 👨‍💼 Compte DRH (Recommandé en premier)
```
Email: drh@snh.cm
Password: Test123456
Rôle: DRH - Accès complet à tous les modules
```
**Fonctionnalités** :
- Vue de tous les 100 employés
- Gestion des 5 demandes de congés en attente
- Accès aux 85 bulletins de paie (123M XAF)
- Gestion des 4 offres d'emploi et 13 candidats
- Analytics et KPIs RH

#### 2. 👷 Compte Manager
```
Email: manager@snh.cm
Password: Test123456
Rôle: Manager - Gestion d'équipe
```
**Fonctionnalités** :
- Voir son équipe
- Valider les demandes de congés
- Suivre la performance de l'équipe

#### 3. 👨‍💻 Compte Employé
```
Email: employe@snh.cm
Password: Test123456
Rôle: Employé - Self-service RH
```
**Fonctionnalités** :
- Consulter son bulletin de paie
- Demander des congés (solde: 22 jours)
- S'inscrire aux formations
- Voir son historique

---

### Option B : Comptes avec noms réels (si vous préférez)

#### 1. 👨‍💼 DRH - Paul Nkotto
```
Email: p.nkotto@snh.cm
Password: Test123456
```

#### 2. 👤 Chef Service Personnel - Françoise Tchouake
```
Email: f.tchouake@snh.cm
Password: Test123456
```

#### 3. 👷 Manager - William Abega
```
Email: w.abega@snh.cm
Password: Test123456
```

#### 4. 👨‍💻 Comptable - Daniel Njoya
```
Email: d.njoya@snh.cm
Password: Test123456
```

#### 5. 🔧 Technicien - Bernard Eboko
```
Email: b.eboko@snh.cm
Password: Test123456
```

---

## 📝 Étapes de création (Via Supabase Dashboard)

### Étape 1 : Accéder à Supabase
1. Allez sur https://supabase.com
2. Connectez-vous à votre compte
3. Sélectionnez votre projet SNH

### Étape 2 : Créer un utilisateur
1. Dans le menu latéral, cliquez sur **Authentication**
2. Cliquez sur **Users**
3. Cliquez sur le bouton **Add user**
4. Sélectionnez **Create new user**

### Étape 3 : Remplir les informations
1. **Email** : Entrez l'email (ex: drh@snh.cm)
2. **Password** : Entrez Test123456
3. **✅ IMPORTANT** : Cochez **Auto Confirm User** (pour éviter la validation email)
4. Cliquez sur **Create user**

### Étape 4 : Répéter pour chaque compte
Créez au minimum le compte DRH pour avoir accès complet.

---

## 🔗 Lier les comptes aux employés (Optionnel)

Si vous utilisez les emails avec noms réels (Option B), exécutez ce script SQL dans Supabase SQL Editor après avoir créé les comptes :

```sql
-- Lier DRH
UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'p.nkotto@snh.cm')
WHERE employee_number = 'SNH-2017-003';

INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  id,
  'SNH-2017-003',
  'drh',
  'p.nkotto@snh.cm',
  'Paul',
  'Nkotto'
FROM auth.users
WHERE email = 'p.nkotto@snh.cm'
ON CONFLICT (id) DO NOTHING;

-- Lier Manager
UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'w.abega@snh.cm')
WHERE employee_number = 'SNH-2020-036';

INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  id,
  'SNH-2020-036',
  'manager',
  'w.abega@snh.cm',
  'William',
  'Abega'
FROM auth.users
WHERE email = 'w.abega@snh.cm'
ON CONFLICT (id) DO NOTHING;

-- Lier Employé
UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'd.njoya@snh.cm')
WHERE employee_number = 'SNH-2019-017';

INSERT INTO user_profiles (id, employee_id, role, email, first_name, last_name)
SELECT
  id,
  'SNH-2019-017',
  'employee',
  'd.njoya@snh.cm',
  'Daniel',
  'Njoya'
FROM auth.users
WHERE email = 'd.njoya@snh.cm'
ON CONFLICT (id) DO NOTHING;
```

---

## ✅ Vérification

Après création, testez la connexion :
1. Ouvrez l'application
2. Entrez l'email et le mot de passe
3. Vous devriez voir le dashboard correspondant au rôle

---

## 🎯 Recommandation

**Pour commencer rapidement** : Créez uniquement le compte **drh@snh.cm** (Option A)

Ce compte vous donnera accès à :
- ✅ Tous les employés (100)
- ✅ Toutes les demandes de congés
- ✅ Tous les bulletins de paie
- ✅ Tous les modules RH
- ✅ Recrutement complet
- ✅ Analytics et statistiques

**Temps estimé** : 2 minutes pour créer 1 compte !

---

## 🆘 Besoin d'aide ?

Si vous avez des difficultés :
1. Vérifiez que vous avez bien coché "Auto Confirm User"
2. Vérifiez que le mot de passe respecte les règles Supabase
3. Consultez les logs dans la console du navigateur
4. Vérifiez que l'email n'existe pas déjà

---

**Note** : Les comptes de l'Option A (drh@snh.cm, manager@snh.cm, employe@snh.cm) devront être créés manuellement dans Supabase Auth. L'application fonctionnera immédiatement après leur création.
