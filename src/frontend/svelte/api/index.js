/**
 * API Layer centrale - Esportazioni per tutti i moduli API
 * 
 * Fornisce un punto di accesso unico per tutte le chiamate API
 * Uso: import { api } from '../api';
 */

import * as entity from './entity.js';

export const api = {
    entity
};

// Export diretto per compatibilità
export { entity };

export default api;