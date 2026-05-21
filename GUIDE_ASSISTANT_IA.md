# 🤖 Guide de l'Assistant IA Virtuel

## Vue d'ensemble

L'assistant IA virtuel est un système complet qui permet aux utilisateurs d'accéder rapidement aux fonctionnalités de l'application et de générer des rapports PDF personnalisés via des commandes vocales ou textuelles.

---

## 🎯 Fonctionnalités Principales

### 1. **Interaction Vocale et Textuelle**
- 🎤 **Reconnaissance vocale** : Parlez naturellement en français
- 💬 **Saisie texte** : Tapez vos demandes
- 🔊 **Synthèse vocale** : L'assistant répond à haute voix
- ⚡ **Temps réel** : Réponses instantanées

### 2. **Accès Rapide aux Modules**
L'assistant peut ouvrir directement les modules suivants :

| Commande | Action |
|----------|--------|
| "Mes congés" | Affiche vos demandes de congé |
| "Ma fiche de paie" | Consulter vos bulletins de paie |
| "Mon profil" | Voir vos informations personnelles |
| "Nouvelle demande de congé" | Ouvrir le formulaire de demande |
| "Liste des employés" | Voir tous les employés (managers) |
| "Mes formations" | Voir les programmes de formation |

### 3. **Génération de Rapports PDF**
L'assistant peut générer et afficher des rapports professionnels en HTML (convertibles en PDF via Ctrl+P) :

#### Types de Rapports Disponibles

**📋 Rapport des Congés**
- Commande : "Rapport des congés", "État des congés du mois"
- Contenu : Liste complète des demandes avec statuts
- Colonnes : Matricule, Employé, Type, Dates, Jours, Statut

**👥 Rapport de Présence**
- Commande : "État des présences", "Rapport d'attendance"
- Contenu : Liste des employés actifs avec statut de présence
- Colonnes : Matricule, Employé, Département, Présent

**💰 Rapport des Paies**
- Commande : "Rapport des paies", "État des salaires"
- Contenu : Historique des bulletins de paie
- Colonnes : Matricule, Employé, Période, Salaire Brut, Salaire Net

**📚 Rapport des Formations**
- Commande : "Rapport des formations", "Bilan des formations"
- Contenu : Liste des programmes de formation
- Colonnes : Formation, Catégorie, Date, Durée, Participants, Statut

---

## 🚀 Comment Utiliser l'Assistant

### Accès à l'Assistant

1. **Cliquez sur l'icône 🤖** dans le header (à côté des notifications)
2. Une fenêtre modale s'ouvre avec l'interface de chat
3. Le point vert indique que l'assistant est en ligne

### Utilisation Vocale

1. **Cliquez sur le bouton microphone** 🎤
2. Le bouton devient rouge et affiche "En écoute..."
3. **Parlez clairement** en français
4. L'assistant transcrit automatiquement votre demande
5. Cliquez sur "Envoyer" ou appuyez sur Entrée

### Utilisation Textuelle

1. **Tapez votre message** dans le champ de saisie
2. Appuyez sur **Entrée** ou cliquez sur **Envoyer** ➤
3. L'assistant traite votre demande et répond

### Contrôle de la Synthèse Vocale

- L'assistant lit automatiquement ses réponses
- **Icône Volume** 🔊 : Indique que l'assistant parle
- **Cliquez sur l'icône** pour arrêter la lecture vocale

---

## 💡 Exemples de Commandes

### Commandes Simples
```
"Mes congés"
"Ma fiche de paie"
"Mon profil"
"Liste des employés"
```

### Commandes pour Créer
```
"Nouvelle demande de congé"
"Créer une demande d'absence"
"Poser un congé"
```

### Commandes pour Générer des Rapports
```
"Génère un rapport des congés"
"Rapport des paies de janvier"
"État des présences"
"Bilan annuel des formations"
"Rapport de performance"
```

### Commandes d'Aide
```
"Aide"
"Help"
"Que peux-tu faire ?"
"Comment utiliser l'assistant"
```

---

## 🖨️ Génération et Export PDF

### Processus Automatique

1. **Demandez un rapport** via l'assistant
2. L'assistant génère un rapport HTML professionnel
3. Le rapport **s'ouvre automatiquement** dans un nouvel onglet
4. Vous recevez une confirmation dans le chat

### Convertir en PDF

**Méthode 1 : Impression système**
1. Dans l'onglet du rapport : **Ctrl + P** (Windows) ou **Cmd + P** (Mac)
2. Sélectionnez "Enregistrer au format PDF"
3. Choisissez l'emplacement et enregistrez

**Méthode 2 : Navigateur**
1. Menu navigateur → Imprimer
2. Destination : "Enregistrer au format PDF"
3. Ajustez les marges si nécessaire
4. Enregistrez

### Personnalisation du Rapport

Chaque rapport inclut :
- ✅ En-tête avec titre et date de génération
- ✅ Tableau formaté avec données filtrées
- ✅ Badges colorés pour les statuts
- ✅ Pied de page avec informations SNH
- ✅ Design professionnel prêt à imprimer

---

## 🏗️ Architecture Technique

### Frontend : `AIAssistant.tsx`
```
src/components/ai/AIAssistant.tsx
```

**Fonctionnalités :**
- Interface utilisateur du chat
- Web Speech API pour reconnaissance vocale
- Speech Synthesis API pour lecture vocale
- Gestion des messages et de l'état
- Intégration avec les Edge Functions

### Backend : Edge Functions

**1. `ai-assistant`**
```
supabase/functions/ai-assistant/index.ts
```
- Analyse des commandes utilisateur
- Détection des intentions (NLP basique)
- Routage vers les actions appropriées
- Réponses contextuelles

**2. `generate-ai-report`**
```
supabase/functions/generate-ai-report/index.ts
```
- Génération de rapports HTML
- Requêtes à la base de données Supabase
- Formatage professionnel
- Support multi-types de rapports

### Utilitaires
```
src/utils/reportToPDF.ts
```
- Fonctions d'export et de conversion
- Gestion des fenêtres popup
- Téléchargement de fichiers

---

## 🔒 Sécurité et Permissions

### Authentification
- ✅ Toutes les requêtes nécessitent un JWT valide
- ✅ Edge Functions avec `verify_jwt: true`
- ✅ Vérification de l'identité utilisateur

### Permissions RLS (Row Level Security)
- Les rapports respectent les politiques RLS de Supabase
- Les employés voient uniquement leurs données
- Les managers accèdent aux données de leur équipe
- Les DRH/Admin ont accès complet

### Données Sensibles
- ❌ Aucune donnée sensible stockée côté client
- ✅ Communication HTTPS uniquement
- ✅ Pas de logs de données personnelles

---

## 🎨 Design et UX

### Interface
- Modal centré et responsive
- Design moderne avec Tailwind CSS
- Animations fluides
- Indicateurs visuels clairs

### Feedback Utilisateur
- 💬 Messages utilisateur en bleu
- 🤖 Messages assistant en blanc
- ⏳ Indicateur de chargement
- 📄 Notification de génération PDF
- 🎤 Indication "En écoute..." pour le micro

### Accessibilité
- Contraste de couleurs optimal
- Icônes descriptives
- Titres et labels explicites
- Support clavier complet

---

## 🛠️ Configuration et Déploiement

### Variables d'Environnement

Les Edge Functions utilisent automatiquement :
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Déploiement des Edge Functions

Les fonctions sont déjà déployées :
- ✅ `ai-assistant`
- ✅ `generate-ai-report`

### Intégration dans MainLayout

L'assistant est intégré dans `MainLayout.tsx` :
```typescript
// Bouton d'accès dans le header
<button onClick={() => setIsAIAssistantOpen(true)}>
  <Bot className="w-5 h-5 text-blue-600" />
</button>

// Composant modal
<AIAssistant
  isOpen={isAIAssistantOpen}
  onClose={() => setIsAIAssistantOpen(false)}
  onNavigate={handleAINavigation}
/>
```

---

## 📈 Évolutions Futures Possibles

### Court Terme
- [ ] Support multilingue (EN, ES)
- [ ] Historique des conversations
- [ ] Raccourcis clavier (Ctrl+K)

### Moyen Terme
- [ ] IA avancée (GPT/Claude API)
- [ ] Prédictions et suggestions
- [ ] Analyse de sentiment

### Long Terme
- [ ] Génération de graphiques
- [ ] Export Excel/CSV
- [ ] Intégration calendrier
- [ ] Notifications intelligentes

---

## 🐛 Dépannage

### Le Micro ne Fonctionne Pas
- Vérifiez les permissions du navigateur
- Chrome/Edge : chrome://settings/content/microphone
- Firefox : about:preferences#privacy
- Autorisez l'accès au micro pour le site

### La Synthèse Vocale ne Fonctionne Pas
- Vérifiez que le son n'est pas coupé
- Vérifiez les paramètres de langue du navigateur
- Supporté sur Chrome, Edge, Safari, Firefox modernes

### Les Rapports ne s'Ouvrent Pas
- Autorisez les popups pour le site
- Vérifiez le bloqueur de popups
- Essayez dans un onglet navigation privée

### Erreurs de Connexion
- Vérifiez votre connexion internet
- Vérifiez que Supabase est accessible
- Consultez la console développeur (F12)

---

## 📞 Support

Pour toute question ou problème :
1. Dites "Aide" à l'assistant
2. Consultez ce guide
3. Contactez l'administrateur système

---

**Document créé le :** 6 avril 2026
**Version :** 1.0
**Société :** SNH - Société Nationale des Hydrocarbures
