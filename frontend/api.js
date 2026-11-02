// API client for the Calculator backend (FastAPI)
const API_BASE_URL = 'http://localhost:8000/api';

async function apiRequest(path, { method = 'GET', body, errorMessage = 'Request failed' } = {}) {
    const options = { method };
    if (body !== undefined) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, options);
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.detail === 'string' ? data.detail : errorMessage);
    }
    return response.json();
}

const CalculatorAPI = {
    basicCalculate(a, b, operation) {
        return apiRequest('/basic/calculate', {
            method: 'POST',
            body: { a, b, operation },
            errorMessage: 'Calculation failed'
        });
    },

    scientificCalculate(value, fn, angleMode) {
        return apiRequest('/scientific/calculate', {
            method: 'POST',
            body: { value, function: fn, angle_mode: angleMode },
            errorMessage: 'Calculation failed'
        });
    },

    financialCalculate({ n, iy, pv, pmt, fv, solveFor }) {
        return apiRequest('/financial/calculate', {
            method: 'POST',
            body: { n, iy, pv, pmt, fv, solve_for: solveFor },
            errorMessage: 'Calculation failed'
        });
    },

    amortization({ n, iy, pv, pmt, fv = 0 }) {
        return apiRequest('/financial/amortization', {
            method: 'POST',
            body: { n, iy, pv, pmt, fv },
            errorMessage: 'Failed to generate schedule'
        });
    },

    getHistory(limit = 50) {
        return apiRequest(`/history?limit=${limit}`, {
            errorMessage: 'Failed to load history'
        });
    },

    saveHistory(expression, result, calculationType) {
        return apiRequest('/history', {
            method: 'POST',
            body: { expression, result, calculation_type: calculationType },
            errorMessage: 'Failed to save history'
        });
    },

    clearHistory() {
        return apiRequest('/history', {
            method: 'DELETE',
            errorMessage: 'Failed to clear history'
        });
    }
};
