# Basse Apple Business — boutique Apple à Dakar (Keur Massar)

Application mobile et web de **Basse Apple Business**, revendeur indépendant d’Apple,
ordinateurs et accessoires, situé au **Centre commercial Keur Massar, Dakar**.
WhatsApp : **+221 77 349 18 87**.

Le périmètre fonctionnel suit le cahier des charges disponible dans
`docs/cahier-des-charges.pdf`.

## Démarrage rapide

```bash
npm install
npm start
```

Puis `i` pour iOS, `a` pour Android, `w` pour le web.

L'application démarre en **mode démonstration** : ~50 produits, commandes, avis, clients
et codes promo sont générés localement et persistés avec AsyncStorage. Aucun backend
n'est nécessaire pour parcourir toutes les fonctionnalités.

### Comptes de démonstration

| Rôle          | Email                   | Mot de passe |
| ------------- | ----------------------- | ------------ |
| Client        | client@techstore.com    | Client1234   |
| Administrateur| admin@techstore.com     | Admin1234    |

L'écran de connexion propose deux boutons qui pré-remplissent ces identifiants.

### Cartes de test au paiement

Le paiement est simulé côté client (`src/services/payment.ts`). Toute carte valide au
sens de l'algorithme de Luhn est acceptée, **sauf** celles se terminant par `0000` qui
déclenchent un refus bancaire — utile pour vérifier l'écran d'échec.

## Brancher Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Exécuter `supabase/migrations/0001_init.sql` dans l'éditeur SQL : tables, index,
   politiques RLS et fonctions (`is_admin`, `consume_stock`, `consume_promo`,
   `refresh_product_rating`…).
3. Copier `.env.example` vers `.env` et renseigner les clés :

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

4. Redémarrer le serveur Expo. L'application détecte la configuration et bascule
   automatiquement du mode démonstration vers Supabase (`src/data/index.ts`).
5. Pour peupler le catalogue, appeler `db.importDemoCatalog()` depuis un écran
   d'administration temporaire, ou insérer vos propres produits.
6. Promouvoir un compte administrateur :

```sql
update profiles set role = 'admin' where email = 'vous@exemple.com';
```

Les variables de contact de la boutique sont également configurables :
`EXPO_PUBLIC_STORE_PHONE`, `EXPO_PUBLIC_STORE_WHATSAPP`, `EXPO_PUBLIC_STORE_EMAIL`.

## Architecture

```
app/                    Routes (expo-router)
  (tabs)/               Accueil, Catégories, Recherche, Commandes, Panier, Profil
  produit/[id]          Fiche produit
  catalogue             Catalogue, filtres et tri
  commande/             Checkout en 5 étapes + confirmation PDF
  auth/                 Connexion, inscription, mot de passe oublié
  profil/               Informations, adresses
  admin/                Espace administrateur (accès protégé)
src/
  components/           Composants réutilisables (ui, product, admin, orders…)
  data/                 Modèle de domaine, données de démo, recherche, statistiques
    providers/          LocalRepository (démo) et SupabaseRepository
  store/                État global Zustand (panier, auth, favoris, notifications…)
  hooks/                useAsync, useDebounce, useGrid, useAddToCart
  services/             Passerelle de paiement
  theme/                Design tokens (couleurs, espacements, typographie)
  utils/                Formatage, validation, visuels, PDF de confirmation
supabase/migrations/    Schéma SQL et politiques RLS
```

### Principe clé : une seule interface de données

Tous les écrans consomment `db`, qui implémente l'interface `Repository`
(`src/data/repository.ts`). Deux implémentations existent :

- `LocalRepository` — données de démonstration en mémoire + AsyncStorage ;
- `SupabaseRepository` — PostgreSQL, authentification et stockage hébergés.

Changer de backend ne modifie aucun composant d'interface.

### Sécurité

- Les mots de passe ne sont jamais stockés en clair : Supabase Auth (bcrypt) en
  production, empreinte locale en mode démonstration.
- Le rôle `admin` est protégé par un trigger SQL : il ne peut pas être modifié depuis
  le client.
- Les politiques RLS restreignent chaque table (un client ne lit que ses commandes,
  ses favoris et ses adresses).
- Aucune donnée bancaire n'est conservée : seuls les quatre derniers chiffres sont
  affichés, le reste ne quitte pas l'écran de paiement.
- La garde d'accès de `app/admin/_layout.tsx` est un confort d'interface ; la véritable
  barrière est appliquée côté base.

## Fonctionnalités

**Côté client** — accueil (carrousel promotionnel, catégories, populaires, promotions,
nouveautés), catalogue avec recherche tolérante aux fautes, 12 filtres et 7 tris, fiche
produit avec variantes et prix dynamique, avis, favoris, panier avec codes promo,
checkout en 5 étapes, confirmation PDF, suivi de commande à 7 statuts, profil, adresses,
notifications, paramètres et contact WhatsApp.

**Côté administrateur** — tableau de bord (chiffre d'affaires, commandes, panier moyen,
alertes de stock) avec courbes, histogrammes et répartition par catégorie ; gestion des
produits (formulaire complet, photos, fiche technique), du stock, des commandes
(changement de statut, numéro de suivi, confirmation de paiement, annulation), des
clients (rôles, historique), des catégories (réordonnancement) et des codes promo.

## Scripts

| Commande            | Description                              |
| ------------------- | ---------------------------------------- |
| `npm start`         | Serveur de développement Expo            |
| `npm run android`   | Lancer sur Android                       |
| `npm run ios`       | Lancer sur iOS                           |
| `npm run web`       | Lancer la version web                    |
| `npm run typecheck` | Vérification TypeScript (mode strict)    |
