export const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Wrapper fetch qui envoie automatiquement le token JWT (Bearer > cookie)
export const authFetch = (url, options = {}) => {
    const { headers, ...rest } = options;
    const token = localStorage.getItem('token');
    return fetch(url, {
        ...rest,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    });
};
