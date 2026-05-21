# Guide des Comptes Gestionnaires - SNH GRH System

## 📋 Vue d'Ensemble

Ce document détaille les comptes de test pour les **4 nouveaux rôles métiers** intégrés dans le système GRH de la SNH, équivalents aux modules SAP HCM.

---

## 🔐 Rôles Métiers Disponibles

### 1. Gestionnaire de Paie (payroll_manager)
**Responsabilité** : Traitement complet de la paie, primes, et intégration comptable OHADA

**Comptes de test** :
- **Marie DUBOIS**
  - Email : `marie.dubois@snh.cm`
  - Rôle : Gestionnaire de Paie
  - Matricule : SNH-PAY-001
  - Grade : B2, Échelon 5

- **Paul NGOUNOU**
  - Email : `paul.ngounou@snh.cm`
  - Rôle : Gestionnaire de Paie
  - Matricule : SNH-PAY-002
  - Grade : B1, Échelon 8

**Accès et fonctionnalités** :
- ✅ Calcul et traitement de la paie mensuelle
- ✅ Gestion des primes (13ème mois, bonus, gratifications)
- ✅ Configuration des rubriques de paie
- ✅ Gestion des grilles et échelles salariales
- ✅ Paramètres fiscaux IRPP
- ✅ Cotisations sociales CNPS
- ✅ Génération des bulletins de paie PDF
- ✅ Écritures comptables OHADA
- ✅ Exports comptables
- ✅ Consultation des employés (lecture seule)

---

### 2. Responsable Recrutement (recruitment_manager)
**Responsabilité** : Gestion du recrutement, dossiers administratifs, et intégration famille

**Comptes de test** :
- **Sarah KAMGA**
  - Email : `sarah.kamga@snh.cm`
  - Rôle : Responsable Recrutement
  - Matricule : SNH-REC-001
  - Grade : B2, Échelon 3

- **Ibrahim SOULEYMANE**
  - Email : `ibrahim.souleymane@snh.cm`
  - Rôle : Responsable Recrutement
  - Matricule : SNH-REC-002
  - Grade : B1, Échelon 7

**Accès et fonctionnalités** :
- ✅ Création et gestion des offres d'emploi
- ✅ Gestion des candidats et dossiers
- ✅ Organisation des entretiens
- ✅ Création de nouveaux employés
- ✅ Gestion des documents RH (upload, vérification)
  - Actes de naissance
  - Actes de mariage
  - Diplômes
  - CNI/Passeport
  - Certificats médicaux
  - Photos d'identité
  - RIB
- ✅ Gestion des membres de famille
  - Conjoints
  - Enfants
  - Ascendants et descendants
  - Couverture santé
- ✅ Validation des dossiers administratifs
- ✅ Processus d'intégration (onboarding)
- ✅ Consultation des employés (lecture seule)

---

### 3. Gestionnaire de Carrière (career_manager)
**Responsabilité** : Évolution professionnelle, mobilité, suspensions et actions disciplinaires

**Comptes de test** :
- **Christine FOTSO**
  - Email : `christine.fotso@snh.cm`
  - Rôle : Gestionnaire de Carrière
  - Matricule : SNH-CAR-001
  - Grade : B2, Échelon 4

- **Jean MBARGA**
  - Email : `jean.mbarga@snh.cm`
  - Rôle : Gestionnaire de Carrière
  - Matricule : SNH-CAR-002
  - Grade : B1, Échelon 6

**Accès et fonctionnalités** :
- ✅ Gestion des événements de carrière
  - Promotions
  - Avancements d'échelon
  - Mouvements latéraux
  - Rétrogradations
- ✅ Gestion des suspensions
  - Congé maternité
  - Congé maladie
  - Congé sans solde
  - Suspension disciplinaire
- ✅ Actions disciplinaires
  - Avertissements (verbal, écrit, final)
  - Mise à pied
  - Licenciement
- ✅ Gestion des départs
  - Démission
  - Retraite
  - Fin de contrat
- ✅ Mobilité interne
- ✅ Évaluations de performance
- ✅ Objectifs de performance
- ✅ Historique complet de carrière
- ✅ Modification des employés (pour évolutions)
- ✅ Consultation de l'historique salarial (lecture seule)

---

### 4. Responsable QVCT (qvct_manager)
**Responsabilité** : Qualité de Vie et Conditions de Travail, bien-être et sécurité

**Compte de test** :
- **Nadine AKONO**
  - Email : `nadine.akono@snh.cm`
  - Rôle : Responsable QVCT
  - Matricule : SNH-QVC-001
  - Grade : B2, Échelon 3

**Accès et fonctionnalités** :
- ✅ Gestion des enquêtes QVCT
- ✅ Organisation d'événements bien-être
- ✅ Gestion des avantages sociaux
- ✅ Suivi des incidents de santé et sécurité
- ✅ Gestion des suggestions employés
- ✅ Programme de reconnaissance
- ✅ Indicateurs de bien-être
- ✅ Gestion des incidents au travail
- ✅ Suivi psychosocial
- ✅ Consultation des employés (lecture seule)

---

## 🔑 Informations de Connexion

### Mot de passe par défaut
**TOUS les comptes de test** utilisent le mot de passe par défaut configuré dans le système.

**Important** : À la première connexion, le système demandera de changer le mot de passe.

---

## 📊 Données de Test Disponibles

### Employés fictifs
- **15 employés** avec profils complets
- Différents départements et grades
- Salaires variés selon grilles
- Statuts variés (actif, suspension, etc.)

### Données de Paie (Janvier 2026)
- Calculs de paie générés
- Primes secteur hydrocarbures (15% du salaire)
- Primes de rendement pour employés performants
- Historique de paie

### Événements de Carrière
- **Promotion** : Rodrigue NGONO (B1 échelon 5)
- **Congé maternité** : Valérie MVONDO (en cours)
- **Avertissement** : Thierry TCHOUA

### Données Familiales
- Familles complètes pour :
  - Eric BIWOLE (conjoint + 2 enfants)
  - Françoise NGO (conjoint + 1 enfant)
  - Rodrigue NGONO (conjoint + 1 enfant)
  - Charles EBANGA (conjoint + 3 enfants)

---

## 🎯 Scénarios de Test Recommandés

### Scénario 1 : Traitement de Paie
**Acteur** : Marie DUBOIS (Gestionnaire de Paie)
1. Se connecter avec le compte marie.dubois@snh.cm
2. Accéder au dashboard de Paie
3. Consulter la paie de janvier 2026
4. Générer des bulletins de paie
5. Attribuer une prime exceptionnelle
6. Exporter les écritures comptables OHADA

### Scénario 2 : Recrutement avec Famille
**Acteur** : Sarah KAMGA (Responsable Recrutement)
1. Se connecter avec le compte sarah.kamga@snh.cm
2. Créer une nouvelle offre d'emploi
3. Ajouter des candidats
4. Organiser des entretiens
5. Recruter un candidat
6. Intégrer la famille (conjoint, enfants)
7. Uploader les documents requis

### Scénario 3 : Promotion et Évolution
**Acteur** : Christine FOTSO (Gestionnaire de Carrière)
1. Se connecter avec le compte christine.fotso@snh.cm
2. Consulter les événements de carrière existants
3. Créer une nouvelle promotion
4. Gérer une suspension (congé maladie)
5. Traiter une action disciplinaire

### Scénario 4 : Bien-être au Travail
**Acteur** : Nadine AKONO (Responsable QVCT)
1. Se connecter avec le compte nadine.akono@snh.cm
2. Lancer une nouvelle enquête QVCT
3. Créer un événement bien-être
4. Gérer un incident de sécurité
5. Consulter les indicateurs

---

## ⚠️ Notes Importantes

### Sécurité RLS
- Chaque rôle a des **permissions strictes** définies par Row Level Security
- Les gestionnaires ne peuvent PAS modifier les rôles utilisateurs (réservé DRH/Admin)
- Traçabilité complète de toutes les actions

### Intégration Comptable OHADA
- Plan comptable conforme OHADA pré-configuré
- Écritures automatiques lors de la validation de paie
- Export compatible avec systèmes comptables

### Conformité Cameroun
- Barème IRPP 2024
- Cotisations CNPS (Pension 4.2%, Familiales 7%, Accidents 2.5%)
- Plafond CNPS : 750 000 FCFA
- Convention Collective Hydrocarbures

---

## 📞 Support

Pour toute question ou problème :
- Consulter la documentation technique dans `/supabase/migrations/`
- Vérifier les politiques RLS dans les migrations
- Examiner les logs d'audit dans `audit_logs` et `payroll_history`

---

## 🚀 Prochaines Étapes

Une fois les comptes de test validés, le système est prêt pour :
1. Configuration des paramètres spécifiques SNH
2. Import des employés réels
3. Configuration des grilles salariales définitives
4. Paramétrage des workflows de validation
5. Formation des utilisateurs finaux
6. Mise en production

---

**Version** : 1.0
**Date** : Février 2026
**Système** : SNH GRH - ERP Niveau SAP HCM
