import { Review } from '../types';
import { demoProducts } from './products';

const REFERENCE = new Date('2026-08-20T10:00:00.000Z').getTime();
const daysAgo = (days: number) => new Date(REFERENCE - days * 86_400_000).toISOString();

const FIRST_NAMES = [
  'Marie', 'Thomas', 'Awa', 'Julien', 'Sarah', 'Karim', 'Léa', 'Ibrahim',
  'Camille', 'Fatou', 'Nicolas', 'Aminata', 'Lucas', 'Sophie', 'Mehdi', 'Chloé',
];

/** Commentaires génériques par niveau de note, réutilisés sur tout le catalogue. */
const COMMENTS: Record<number, string[]> = {
  5: [
    'Parfait, exactement ce que je cherchais. Livraison rapide et emballage soigné.',
    'Qualité au rendez-vous, je recommande sans hésiter.',
    'Très satisfait de mon achat, produit conforme à la description.',
    'Excellent rapport qualité-prix, rien à redire.',
  ],
  4: [
    'Très bon produit dans l’ensemble, quelques détails perfectibles.',
    'Content de mon achat. Un poil cher mais la qualité est là.',
    'Conforme à mes attentes, je le reprendrais.',
  ],
  3: [
    'Correct sans être exceptionnel. Fait le travail au quotidien.',
    'Produit moyen, l’autonomie pourrait être meilleure.',
  ],
  2: ['Déçu par la finition, je m’attendais à mieux pour ce prix.'],
};

/**
 * Les avis sont dérivés de la note et du nombre d'avis de chaque produit, avec
 * un tirage déterministe : la fiche produit affiche donc toujours les mêmes.
 */
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const buildReviews = (): Review[] => {
  const reviews: Review[] = [];

  demoProducts.forEach((product, productIndex) => {
    const count = Math.min(5, Math.max(2, Math.round(product.reviews_count / 60)));

    for (let i = 0; i < count; i += 1) {
      const seed = productIndex * 31 + i * 7;
      const roll = pseudoRandom(seed);

      // Une note élevée sur le produit rend les avis 5 étoiles plus probables.
      let rating: number;
      if (product.rating >= 4.7) rating = roll > 0.25 ? 5 : 4;
      else if (product.rating >= 4.4) rating = roll > 0.55 ? 5 : roll > 0.15 ? 4 : 3;
      else rating = roll > 0.6 ? 5 : roll > 0.3 ? 4 : roll > 0.1 ? 3 : 2;

      const pool = COMMENTS[rating] ?? COMMENTS[4];

      reviews.push({
        id: `${product.id}-review-${i}`,
        product_id: product.id,
        user_id: `demo-user-${(productIndex + i) % 12}`,
        author_first_name: FIRST_NAMES[(productIndex * 3 + i) % FIRST_NAMES.length],
        rating,
        comment: pool[Math.floor(pseudoRandom(seed + 1) * pool.length)],
        created_at: daysAgo(3 + i * 9 + (productIndex % 11)),
      });
    }
  });

  return reviews;
};

export const demoReviews: Review[] = buildReviews();
