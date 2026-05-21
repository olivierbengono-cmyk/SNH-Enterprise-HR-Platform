# Guide d'accès pour les employés

## 🔐 Configuration initiale des comptes

### Pour le DRH / Administrateur

1. **Connectez-vous** avec votre compte administrateur
2. **Accédez au menu** "Comptes d'accès" dans la navigation
3. **Cliquez sur** "Créer les comptes employés"
4. Le système va automatiquement :
   - Créer un compte pour chaque employé actif
   - Utiliser l'email professionnel comme identifiant
   - Définir le matricule comme mot de passe initial
   - Marquer le compte comme "premier accès"

### Résultat de l'opération

Le système affichera :
- ✅ Nombre de comptes créés avec succès
- ⏭️ Nombre de comptes ignorés (déjà existants)
- ❌ Nombre d'erreurs (employés sans email)

---

## 👤 Première connexion employé

### Identifiants par défaut

Chaque employé reçoit automatiquement :
- **Email** : Son email professionnel (ex: `jean.dupont@snh.cm`)
- **Mot de passe** : Son matricule (ex: `SNH001`)

### Processus de première connexion

1. **Se connecter** avec l'email professionnel et le matricule
2. Le système détecte automatiquement qu'il s'agit d'une première connexion
3. **Écran de changement de mot de passe obligatoire** s'affiche
4. L'employé doit :
   - Saisir un nouveau mot de passe (minimum 8 caractères)
   - Confirmer le nouveau mot de passe
   - Valider le changement

### Règles de sécurité du mot de passe

Le nouveau mot de passe doit contenir :
- ✓ Au moins 8 caractères
- ✓ Mélange de majuscules et minuscules (recommandé)
- ✓ Chiffres (recommandé)
- ✓ Caractères spéciaux (recommandé)

### Après le changement de mot de passe

Une fois le mot de passe changé :
- L'employé est automatiquement redirigé vers son tableau de bord
- Il pourra se connecter avec son nouvel identifiant personnel
- Le système ne demandera plus de changement de mot de passe

---

## 🔄 Connexions suivantes

Pour toutes les connexions suivantes :
- **Email** : Email professionnel
- **Mot de passe** : Le mot de passe personnel défini lors de la première connexion

---

## ❓ FAQ

### Un employé a oublié son mot de passe ?

Actuellement, contacter le DRH qui peut :
1. Réinitialiser le mot de passe via Supabase
2. Communiquer le nouveau mot de passe temporaire à l'employé

### L'email professionnel n'est pas configuré ?

Le compte ne peut pas être créé automatiquement. Le DRH doit :
1. Mettre à jour l'email professionnel dans la fiche employé
2. Re-lancer la création de comptes

### Un nouvel employé arrive, comment lui créer un compte ?

Deux options :
1. Ajouter l'employé dans le système puis relancer "Créer les comptes employés"
2. Le système ignorera les comptes existants et créera uniquement les nouveaux

### Que se passe-t-il si un employé quitte l'entreprise ?

Le DRH doit :
1. Changer le statut de l'employé à "inactive" dans sa fiche
2. Le compte reste actif mais l'employé n'apparaîtra plus dans les listes actives
3. Pour une désactivation complète, contacter l'administrateur système

---

## 📊 Accès par rôle

### Employé (employee)
- Tableau de bord personnel
- Mes informations
- Congés & Absences
- Formations
- Performance
- Bulletins de paie
- QVCT (consultation)

### Manager
- Tableau de bord équipe
- Mon équipe
- Validations (congés, notes de frais)
- Performance équipe
- Rapports

### DRH / Admin
- Tous les modules
- Gestion du personnel
- Configuration des comptes
- Recrutement
- Formations
- Paie
- Analytics
- QVCT
- Relations sociales

---

## 🔒 Sécurité

### Bonnes pratiques

1. **Ne jamais partager** vos identifiants
2. **Utiliser un mot de passe unique** pour cette plateforme
3. **Se déconnecter** après chaque session, surtout sur ordinateur partagé
4. **Changer régulièrement** son mot de passe (tous les 3-6 mois)
5. **Signaler immédiatement** toute activité suspecte au DRH

### Protection des données

- Toutes les connexions sont sécurisées (HTTPS)
- Les mots de passe sont cryptés
- L'accès aux données est strictement contrôlé par rôle
- Les données personnelles sont protégées selon les normes RGPD

---

## 📞 Support

Pour toute question ou problème :
- **Contact DRH** : drh@snh.cm
- **Support technique** : support.rh@snh.cm

---

**Dernière mise à jour** : Février 2026
