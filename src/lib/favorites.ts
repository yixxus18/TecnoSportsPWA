import { supabase } from './supabase';
import { API_ENDPOINTS, getFullUrl } from '../config/api';

export interface Favorite {
  id: number;
  userId: number;
  matchId: number;
}

const getAuthHeaders = async () => {
  let token: string | undefined;
  
  // First try: get from localStorage (saved during login)
  const storedSession = localStorage.getItem('session');
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession);
      token = parsed.access_token;
      console.log('[Favorites] Token from localStorage:', token ? 'Found' : 'Not found');
    } catch (e) {
      console.warn('[Favorites] Error parsing stored session:', e);
    }
  }
  
  // Fallback: Try Supabase session (may not work if login was via backend)
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
      console.log('[Favorites] Token from Supabase:', token ? 'Found' : 'Not found');
    } catch (e) {
      console.warn('[Favorites] Error getting Supabase session:', e);
    }
  }
  
  if (!token) {
    console.error('[Favorites] No authentication token available!');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const addFavorite = async (userId: number, matchId: number) => {
  const headers = await getAuthHeaders();
  const url = getFullUrl(API_ENDPOINTS.FAVORITES);
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ matchId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error adding favorite: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
};

export const removeFavorite = async (userId: number, matchId: number) => {
  const headers = await getAuthHeaders();
  const url = getFullUrl(API_ENDPOINTS.DELETE_FAVORITE(userId, matchId));

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error removing favorite: ${response.statusText} - ${errorText}`);
  }
};

export const getFavorites = async (userId: number) => {
  const headers = await getAuthHeaders();
  const url = getFullUrl(API_ENDPOINTS.FAVORITES_BY_USER(userId));

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error fetching favorites: ${response.statusText} - ${errorText}`);
  }

  // The API returns favorite objects. We map them to ensure consistent structure if needed,
  // but based on the entity, it should have id, userId, matchId (or camelCase variants).
  // The entity usually has camelCase, but let's check the response in usage.
  // Assuming the API returns the entity directly.
  const data = await response.json();
  return data as Favorite[]; 
};

export const isFavorite = async (userId: number, matchId: number) => {
  // Since we don't have a specific 'isFavorite' endpoint that checks logic efficiently 
  // without fetching all, we can just fetch all and check. 
  // OR, we can optimize if the backend provides a specific check. 
  // For now, reusing getFavorites is safer than a direct DB call.
  try {
    const favorites = await getFavorites(userId);
    return favorites.some(f => f.matchId === matchId); // Handle potential case/snake difference
  } catch (error) {
    console.error("Error checking isFavorite:", error);
    return false;
  }
};
