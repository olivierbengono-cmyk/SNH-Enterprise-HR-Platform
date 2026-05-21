# Module "Mes Informations"

## Vue d'ensemble

Le module "Mes informations" permet à tous les utilisateurs de consulter leurs informations personnelles et professionnelles. **Seuls les Administrateurs et les Responsables du Personnel (DRH) peuvent modifier ces informations.**

---

## 🎯 Caractéristiques Principales

### Consultation (Tous les rôles)
- ✅ Voir toutes ses informations personnelles
- ✅ Voir ses informations professionnelles
- ✅ Voir ses informations bancaires
- ✅ Voir son contact d'urgence
- ✅ Interface moderne et responsive

### Modification (Admin & DRH uniquement)
- ✅ Modifier le numéro de téléphone
- ✅ Modifier l'adresse
- ✅ Modifier le contact d'urgence
- ✅ Modifier le RIB / compte bancaire
- ✅ Sauvegarde sécurisée en base de données

---

## 📍 Accès au Module

### Pour tous les utilisateurs
Le module "Mes informations" est accessible depuis le menu de navigation latéral :

```
Menu → Mes informations
```

### Disponible pour tous les rôles :
- ✅ Employé
- ✅ Manager
- ✅ DRH
- ✅ Directeur
- ✅ Administrateur
- ✅ Gestionnaire de Paie
- ✅ Responsable Recrutement
- ✅ Gestionnaire de Carrière
- ✅ Responsable QVCT

---

## 🔐 Système de Permissions

### Consultation : Tous les utilisateurs
Tout utilisateur connecté peut consulter ses propres informations.

### Modification : Admin & DRH uniquement

#### Champs Modifiables :
1. **Téléphone** : Numéro de contact
2. **Adresse** : Adresse complète
3. **Contact d'urgence** : Nom et numéro d'urgence
4. **RIB / Compte bancaire** : Informations bancaires

#### Champs Non Modifiables :
- Nom et prénom
- Email professionnel
- Matricule
- Département
- Poste
- Date d'embauche
- Type de contrat
- Statut
- Salaire de base
- Date de naissance
- Nationalité

#### Message pour utilisateurs sans permission :
Si un utilisateur sans permission tente de modifier, il verra :

```
⚠️ Information importante
Seuls les Administrateurs et les Responsables du Personnel peuvent modifier ces informations.
Si vous constatez une erreur, veuillez contacter le service RH.
```

---

## 🎨 Interface Utilisateur

### Vue Consultation

```
┌─────────────────────────────────────────────────┐
│ Mes Informations                    [Modifier]  │
├─────────────────────────────────────────────────┤
│                                                  │
│  👤 Jean DOE                                     │
│     Ingénieur Logiciel                          │
│     Matricule: SNH-2025-123                     │
│                                                  │
├─────────────────────────────────────────────────┤
│ 💼 Informations Professionnelles                │
│   Département: Informatique                      │
│   Poste: Ingénieur Logiciel                     │
│   Type de contrat: CDI                          │
│   Statut: Actif                                 │
│   Date d'embauche: 1 janvier 2025              │
│   Salaire de base: 1 500 000 XAF               │
├─────────────────────────────────────────────────┤
│ 👤 Informations Personnelles                    │
│   Email: jean.doe@snh.cm                        │
│   Téléphone: +237 6 XX XX XX XX                 │
│   Adresse: Yaoundé, Cameroun                    │
│   Date de naissance: 15 mars 1990              │
│   Nationalité: Camerounaise                     │
├─────────────────────────────────────────────────┤
│ 🏢 Informations Bancaires et Contact d'Urgence │
│   Contact d'urgence: Marie DOE +237 6 XX XX XX  │
│   RIB: CM21 XXXX XXXX XXXX XXXX XXXX XX        │
└─────────────────────────────────────────────────┘
```

### Vue Modification (Admin/DRH seulement)

```
┌─────────────────────────────────────────────────┐
│ Mes Informations          [Annuler] [Enregistrer]│
├─────────────────────────────────────────────────┤
│  ...                                             │
├─────────────────────────────────────────────────┤
│ 👤 Informations Personnelles                    │
│   Email: jean.doe@snh.cm (non modifiable)       │
│   Téléphone: [+237 6 XX XX XX XX        ]       │
│   Adresse:   [Yaoundé, Cameroun         ]       │
│              [                          ]       │
│   ...                                            │
├─────────────────────────────────────────────────┤
│ 🏢 Informations Bancaires et Contact d'Urgence │
│   Contact d'urgence: [Marie DOE +237 6...    ]  │
│   RIB: [CM21 XXXX XXXX XXXX XXXX XXXX XX    ]  │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Fonctionnement Technique

### Fichier Principal
```
src/components/modules/MyProfile.tsx
```

### Logique de Permissions

```typescript
const canEdit = profile?.role === 'admin' || profile?.role === 'drh';
```

### Chargement des Données

```typescript
const { data, error } = await supabase
  .from('employees')
  .select(`
    *,
    departments (name),
    positions (title)
  `)
  .eq('user_id', profile?.id)
  .maybeSingle();
```

### Modification des Données

```typescript
const { error } = await supabase
  .from('employees')
  .update({
    phone_number: formData.phone_number,
    address: formData.address,
    emergency_contact: formData.emergency_contact,
    bank_account: formData.bank_account,
    updated_at: new Date().toISOString(),
  })
  .eq('id', employee.id);
```

---

## 📋 Guide d'Utilisation

### Pour un Employé

1. **Accéder au module**
   - Connexion avec vos identifiants
   - Menu latéral → "Mes informations"

2. **Consulter vos informations**
   - Toutes vos informations sont affichées
   - Organisées en sections claires

3. **Signaler une erreur**
   - Vous ne pouvez pas modifier directement
   - Contactez le service RH
   - Indiquez les corrections nécessaires

### Pour un Administrateur ou DRH

1. **Accéder au module**
   - Connexion avec vos identifiants
   - Menu latéral → "Mes informations"

2. **Modifier vos informations**
   - Cliquer sur "Modifier"
   - Modifier les champs souhaités
   - Cliquer sur "Enregistrer"

3. **Modifier les informations d'un employé**
   - Menu → "Personnel"
   - Cliquer sur l'employé concerné
   - Cliquer sur "Modifier"
   - Modifier tous les champs nécessaires
   - Enregistrer

---

## 🔒 Sécurité

### Politiques RLS (Row Level Security)

Les politiques RLS de Supabase garantissent que :
- ✅ Chaque utilisateur ne peut voir QUE ses propres informations
- ✅ Seuls Admin et DRH peuvent UPDATE les données
- ✅ Les modifications sont journalisées (updated_at)

### Validation Côté Client

```typescript
if (!canEdit) {
  setMessage({
    type: 'error',
    text: 'Seuls les Administrateurs et Responsables du Personnel...'
  });
  return;
}
```

### Validation Côté Serveur

Les politiques RLS de la table `employees` empêchent toute modification non autorisée même si quelqu'un contourne le client.

---

## 📱 Responsive Design

Le module est entièrement responsive :

- ✅ **Mobile** (320px+) : Layout vertical, boutons adaptés
- ✅ **Tablette** (640px+) : Grid 2 colonnes pour certaines sections
- ✅ **Desktop** (1024px+) : Layout optimisé, sidebar fixe

---

## 🎯 Cas d'Usage

### Cas 1 : Employé consulte ses informations
```
Employé → Menu "Mes informations"
↓
Voir toutes ses infos (lecture seule)
↓
Bouton "Modifier" désactivé avec message explicatif
```

### Cas 2 : Employé détecte une erreur
```
Employé → Menu "Mes informations"
↓
Constate une adresse incorrecte
↓
Contacte le service RH
↓
DRH corrige dans "Personnel" ou via "Mes informations"
```

### Cas 3 : DRH met à jour ses propres informations
```
DRH → Menu "Mes informations"
↓
Clic sur "Modifier"
↓
Modifie téléphone et adresse
↓
Clic sur "Enregistrer"
↓
✅ Succès : "Informations mises à jour avec succès"
```

### Cas 4 : Manager tente de modifier
```
Manager → Menu "Mes informations"
↓
Clic sur "Modifier"
↓
❌ Message : "Seuls les Administrateurs et Responsables..."
↓
Pas d'accès au mode édition
```

---

## 🚀 Avantages du Système

### Pour les Employés
- ✅ Accès rapide à toutes leurs informations
- ✅ Vérification de l'exactitude des données
- ✅ Transparence sur les informations détenues
- ✅ Interface claire et professionnelle

### Pour les Administrateurs
- ✅ Contrôle total sur les modifications
- ✅ Évite les erreurs de saisie non intentionnelles
- ✅ Centralisation de la gestion des données
- ✅ Traçabilité des modifications

### Pour l'Organisation
- ✅ Données cohérentes et fiables
- ✅ Processus de mise à jour maîtrisé
- ✅ Conformité RGPD (droit d'accès aux données)
- ✅ Réduction des tickets support

---

## 🔄 Flux de Données

```
┌─────────────┐
│ Utilisateur │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  MyProfile  │ ← Composant React
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   useAuth   │ ← Context (profile.role)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Supabase  │ ← Base de données
│  employees  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  RLS Check  │ ← Vérification permissions
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Response   │ ← Données ou Erreur
└─────────────┘
```

---

## 📊 Statistiques

### Informations Affichées
- **Professionnelles** : 7 champs
- **Personnelles** : 6 champs
- **Bancaires** : 2 champs
- **Total** : 15 champs d'information

### Champs Modifiables (Admin/DRH)
- Téléphone
- Adresse
- Contact d'urgence
- RIB / Compte bancaire
- **Total** : 4 champs

### Champs Lecture Seule
- 11 champs (73% des informations)

---

## ✅ Tests de Validation

### Test 1 : Consultation Employé
1. Se connecter en tant qu'employé
2. Aller dans "Mes informations"
3. **Résultat** : Toutes les informations affichées
4. **Résultat** : Bouton "Modifier" désactivé avec message

### Test 2 : Modification DRH
1. Se connecter en tant que DRH
2. Aller dans "Mes informations"
3. Cliquer "Modifier"
4. Modifier le téléphone
5. Cliquer "Enregistrer"
6. **Résultat** : ✅ "Informations mises à jour avec succès"
7. Recharger la page
8. **Résultat** : ✅ Modifications persistées

### Test 3 : Tentative Modification Manager
1. Se connecter en tant que Manager
2. Aller dans "Mes informations"
3. Tenter de cliquer "Modifier"
4. **Résultat** : ❌ Message d'erreur approprié
5. **Résultat** : Pas d'accès au formulaire

### Test 4 : Employé Sans Fiche
1. Se connecter avec un compte sans fiche employé liée
2. Aller dans "Mes informations"
3. **Résultat** : Message "Aucune fiche employé associée"
4. **Résultat** : Consigne de contacter le service RH

---

## 🎓 Formation Utilisateurs

### Pour les Employés
> "Vous pouvez consulter toutes vos informations personnelles et professionnelles dans le menu 'Mes informations'. Si vous constatez une erreur, contactez le service RH qui procédera à la correction."

### Pour les Managers
> "Le module 'Mes informations' vous permet de consulter vos données personnelles. Pour toute modification, contactez le service RH. Pour gérer votre équipe, utilisez le menu 'Mon équipe'."

### Pour les DRH et Admin
> "Vous avez accès complet à la modification de vos informations personnelles via 'Mes informations'. Pour modifier les informations d'autres employés, utilisez le menu 'Personnel' puis cliquez sur l'employé concerné."

---

## 📝 Notes Importantes

### Distinction des Rôles

**Module "Mes informations"** (SELF-SERVICE)
- Voir ses propres informations
- Modifier uniquement si Admin/DRH
- Accès : Tous les rôles

**Module "Personnel"** (GESTION)
- Voir tous les employés
- Modifier tous les employés
- Accès : Admin et DRH uniquement

### Pourquoi Cette Distinction ?

1. **Autonomie** : Les employés peuvent vérifier leurs informations
2. **Sécurité** : Les modifications sont contrôlées
3. **Efficacité** : Les DRH peuvent se gérer eux-mêmes
4. **Clarté** : Séparation entre self-service et administration

---

## 🔮 Évolutions Futures Possibles

### Version 2.0 (Suggestions)
- [ ] Historique des modifications avec dates et auteurs
- [ ] Photo de profil uploadable
- [ ] Demande de modification (workflow de validation)
- [ ] Notifications par email lors de modifications
- [ ] Export PDF de sa fiche employé
- [ ] Signature électronique de documents
- [ ] Gestion des documents personnels (CV, diplômes, etc.)

---

## 📞 Support

### Pour les Employés
Si vous ne voyez pas vos informations ou constatez des erreurs :
1. Vérifiez que votre compte est bien lié à une fiche employé
2. Contactez le service RH : rh@snh.cm
3. Fournissez votre matricule et la nature de l'erreur

### Pour les Administrateurs
En cas de problème technique :
1. Vérifiez les logs de la console navigateur
2. Vérifiez les politiques RLS dans Supabase
3. Vérifiez que le user_id est bien lié à l'employee.id

---

## ✅ Checklist d'Implémentation

- [x] Composant MyProfile.tsx créé
- [x] Routes ajoutées dans App.tsx
- [x] Menu "Mes informations" ajouté pour tous les rôles
- [x] Permissions Admin/DRH implémentées
- [x] Messages d'erreur explicatifs
- [x] Interface responsive
- [x] Gestion des cas d'erreur
- [x] Build réussi sans erreurs
- [x] Documentation complète

---

**Version** : 1.0
**Date** : 19 Février 2026
**Status** : ✅ PRODUCTION READY
**Module** : Mes Informations
**Permissions** : Consultation (Tous) | Modification (Admin & DRH)
