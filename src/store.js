/**
 * @file store.js
 * @description Global state management using Zustand.
 *
 * Manages:
 *   - Authentication state (login / logout / token persistence)
 *   - Theme preference (dark / light with localStorage sync)
 *   - Entity caches for Products, Customers, Invoices, and Dashboard data
 *   - CRUD helpers for optimistic UI updates (add, update, remove)
 *   - Cache invalidation via `clearCache()` after mutations
 */

import { create } from 'zustand';

const useStore = create((set) => ({

  /* ── Authentication ──────────────────────────────────────────── */

  /** Whether the user has a valid session token */
  isLoggedIn: !!localStorage.getItem('mz_token'),

  /** Persist token and update auth state */
  login: (token) => {
    localStorage.setItem('mz_token', token);
    localStorage.setItem('mz_logged', 'true');
    set({ isLoggedIn: true });
  },

  /** Clear session and reset all cached data */
  logout: () => {
    localStorage.removeItem('mz_token');
    localStorage.removeItem('mz_logged');
    set({ isLoggedIn: false, products: [], customers: [], invoices: [] });
  },

  /* ── Theme ───────────────────────────────────────────────────── */

  /** Current theme preference ('dark' | 'light') */
  theme: localStorage.getItem('mz_theme') || 'dark',

  /** Read saved theme from localStorage and apply it to <html> */
  initTheme: () => {
    const saved = localStorage.getItem('mz_theme') || 'dark';
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ theme: saved });
  },

  /** Toggle between dark and light themes */
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('mz_theme', next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { theme: next };
  }),

  /* ── Products Cache ──────────────────────────────────────────── */

  products: [],
  setProducts:   (p) => set({ products: p }),
  addProduct:    (p) => set((s) => ({ products: [p, ...s.products] })),
  updateProduct: (id, p) => set((s) => ({ products: s.products.map(x => x._id === id ? p : x) })),
  removeProduct: (id)    => set((s) => ({ products: s.products.filter(x => x._id !== id) })),

  /* ── Customers Cache ─────────────────────────────────────────── */

  customers: [],
  setCustomers:   (c) => set({ customers: c }),
  addCustomer:    (c) => set((s) => ({ customers: [c, ...s.customers] })),
  updateCustomer: (id, c) => set((s) => ({ customers: s.customers.map(x => x._id === id ? c : x) })),
  removeCustomer: (id)    => set((s) => ({ customers: s.customers.filter(x => x._id !== id) })),

  /* ── Invoices Cache ──────────────────────────────────────────── */

  invoices: [],
  setInvoices: (i) => set({ invoices: i }),

  /* ── Dashboard Cache ─────────────────────────────────────────── */

  dashboardData: null,
  setDashboardData: (d) => set({ dashboardData: d }),

  /* ── Cache Invalidation ──────────────────────────────────────── */

  /** Clears all cached entity data. Called after create/update/delete mutations
   *  to force a fresh re-fetch on next page load. */
  clearCache: () => set({ products: [], customers: [], invoices: [], dashboardData: null }),
}));

export default useStore;
