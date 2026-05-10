/**
 * @file api.js
 * @description Centralized HTTP client and API service layer.
 *
 * Uses Axios with a request interceptor that attaches the auth token
 * from localStorage. All API calls are wrapped with the `req()` helper
 * which normalises responses into { data, error } objects and translates
 * backend English error messages into Arabic via the messages utility.
 *
 * Exported services:
 *   - authAPI       → Login / authentication
 *   - dashboardAPI  → Dashboard statistics
 *   - productsAPI   → Product CRUD + stock adjustment
 *   - customersAPI  → Customer CRUD
 *   - invoicesAPI   → Invoice CRUD + refund + customer invoices
 */

import axios from 'axios';
import { translateMessage } from './utils/messages.js';

/* ── Base URL Configuration ──────────────────────────────────── */

const BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://mazen-warehouse.vercel.app';

/* ── Axios Instance ──────────────────────────────────────────── */

const http = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

/** Attach auth token to every outgoing request */
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('mz_token');
  if (token) config.headers['token'] = token;
  return config;
});

/* ── Request Wrapper ─────────────────────────────────────────── */

/**
 * Wraps an Axios call and normalises the result.
 * @param {Function} fn - A function that returns an Axios promise.
 * @returns {{ data: any, error: string|null }}
 */
const req = async (fn) => {
  try {
    const res = await fn();
    return { data: res.data, error: null };
  } catch (e) {
    let msg = e.response?.data?.message;
    if (!msg) {
      msg = 'السيرفر غير متاح الآن أو هناك عطل فني، يرجى المحاولة بعد قليل';
    }
    return { data: null, error: translateMessage(msg) };
  }
};

/* ── Auth API ────────────────────────────────────────────────── */
// POST /auth/login  { code, password }  → { success, token }

export const authAPI = {
  login: (data) => req(() => http.post('/auth/login', data)),
};

/* ── Dashboard API ───────────────────────────────────────────── */
// GET /dashboard → sales statistics by period + inventory summary

export const dashboardAPI = {
  getStats: () => req(() => http.get('/dashboard')),
};

/* ── Products API ────────────────────────────────────────────── */
// GET    /product                → List (paginated, searchable)
// GET    /product/:id            → Single product
// POST   /product/add            → Create
// PUT    /product/update/:id     → Update
// DELETE /product/delete/:id     → Delete
// PATCH  /product/stock/:id      → Stock adjustment (ADD / REMOVE)

export const productsAPI = {
  getAll: (q = '') => req(() => http.get(`/product${q}`)),
  getById: (id) => req(() => http.get(`/product/${id}`)),
  create: (data) => req(() => http.post('/product/add', data)),
  update: (id, d) => req(() => http.put(`/product/update/${id}`, d)),
  delete: (id) => req(() => http.delete(`/product/delete/${id}`)),
  updateStock: (id, data) => req(() => http.patch(`/product/stock/${id}`, data)),
};

/* ── Customers API ───────────────────────────────────────────── */
// GET    /customer                → List (paginated, searchable)
// GET    /customer/:id            → Single customer
// POST   /customer/add            → Create
// PUT    /customer/update/:id     → Update
// DELETE /customer/delete/:id     → Delete

export const customersAPI = {
  getAll: (q = '') => req(() => http.get(`/customer${q}`)),
  getById: (id) => req(() => http.get(`/customer/${id}`)),
  create: (data) => req(() => http.post('/customer/add', data)),
  update: (id, d) => req(() => http.put(`/customer/update/${id}`, d)),
  delete: (id) => req(() => http.delete(`/customer/delete/${id}`)),
};

/* ── Invoices API ────────────────────────────────────────────── */
// GET    /invoice                          → List (paginated, filterable)
// GET    /invoice/:id                      → Single invoice (populated)
// POST   /invoice/create                   → Create new invoice
// PUT    /invoice/refund/:id               → Refund items / update paid amount
// DELETE /invoice/delete/:id               → Delete
// GET    /invoice/customer/:customerId/details → Customer-specific invoices

export const invoicesAPI = {
  getAll: (q = '') => req(() => http.get(`/invoice${q}`)),
  getById: (id) => req(() => http.get(`/invoice/${id}`)),
  create: (data) => req(() => http.post('/invoice/create', data)),
  refund: (id, d) => req(() => http.put(`/invoice/refund/${id}`, d)),
  delete: (id) => req(() => http.delete(`/invoice/delete/${id}`)),
  getCustomerInvoices: (customerId) => req(() => http.get(`/invoice/customer/${customerId}/details`)),
};

export default http;
