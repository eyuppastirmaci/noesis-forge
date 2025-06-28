// Favorite Interface
export interface Favorite {
  id: string;
  userID: string;
  documentID: string;
  createdAt: string;
}

// Favorite Response from API
export interface FavoriteResponse {
  favorite: Favorite;
}

// Check if document is favorited response
export interface IsFavoritedResponse {
  isFavorited: boolean;
}

// Favorite count response
export interface FavoriteCountResponse {
  favoriteCount: number;
}

// === API Endpoints ===
export const FAVORITE_ENDPOINTS = {
  // User favorites
  LIST: "/favorites",
  
  // Document favorite operations
  ADD: (id: string) => `/favorites/${id}`,
  REMOVE: (id: string) => `/favorites/${id}`,
  STATUS: (id: string) => `/favorites/${id}/status`,
  COUNT: (id: string) => `/favorites/${id}/count`,
} as const;

// === Query Keys ===
export const FAVORITE_QUERY_KEYS = {
  FAVORITES: {
    ALL: ["favorites"] as const,
    LIST: ["favorites", "list"] as const,
    STATUS: (documentId: string) => ["favorites", "status", documentId] as const,
    COUNT: (documentId: string) => ["favorites", "count", documentId] as const,
  },
} as const;

// === Mutation Keys ===
export const FAVORITE_MUTATION_KEYS = {
  ADD: "favorites.add",
  REMOVE: "favorites.remove",
} as const; 