export const API_BASE_URL = 'https://crossword-api-39um.onrender.com';

export const buildApiUrl = (path = '') => {
    if (!path) {
        return API_BASE_URL;
    }
    return path.startsWith('/')
        ? `${API_BASE_URL}${path}`
        : `${API_BASE_URL}/${path}`;
};
