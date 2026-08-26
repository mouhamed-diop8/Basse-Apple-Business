import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Icône représentative par catégorie. Sert aux visuels de repli quand un
 * produit n'a pas encore de photo, et aux cartes de catégories.
 */
const CATEGORY_ICONS: Record<string, IconName> = {
  iphone: 'phone-portrait',
  smartphones: 'phone-portrait-outline',
  macbook: 'laptop-outline',
  laptops: 'laptop-outline',
  tablets: 'tablet-portrait-outline',
  monitors: 'desktop-outline',
  storage: 'save-outline',
  audio: 'headset-outline',
  keyboards: 'keypad-outline',
  mice: 'ellipse-outline',
  printers: 'print-outline',
  accessories: 'flash-outline',
  office: 'briefcase-outline',
};

export const categoryIcon = (categoryId: string, fallback: IconName = 'cube-outline'): IconName =>
  CATEGORY_ICONS[categoryId] ?? fallback;

/**
 * Dégradés neutres (gris clairs) déclinés pour que deux produits voisins ne
 * soient pas identiques, tout en restant dans la palette de la boutique.
 */
const GRADIENTS: [string, string][] = [
  ['#FFFFFF', '#EEEFF3'],
  ['#FAFAFC', '#E6E8EE'],
  ['#F5F6F9', '#E9EAEF'],
  ['#FFFFFF', '#E4E7EE'],
  ['#F7F8FA', '#EBECF1'],
];

/** Choix stable : le même produit garde toujours le même fond. */
export const visualGradient = (seed: string, offset = 0): [string, string] => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffff;
  }
  return GRADIENTS[(hash + offset) % GRADIENTS.length];
};

/**
 * Nombre de visuels générés pour la galerie d'une fiche produit sans photo :
 * assez pour démontrer le carrousel, sans donner l'illusion de vraies photos.
 */
export const FALLBACK_GALLERY_SIZE = 3;
