export const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Wrapper fetch qui envoie automatiquement le cookie d'auth
export const authFetch = (url, options = {}) => {
    const { headers, ...rest } = options;
    return fetch(url, {
        ...rest,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
    });
};
