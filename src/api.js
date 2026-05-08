import axios from 'axios';


const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://mazen-warehouse.vercel.app';

const http = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('mz_token');
  if (token) config.headers['token'] = token;
  return config;
});

const req = async (fn) => {
  try {
    const res = await fn();
    return { data: res.data, error: null };
  } catch (e) {
    let msg = e.response?.data?.message;
    if (!msg) {
      msg = 'السيرفر غير متاح الآن أو هناك عطل فني، يرجى المحاولة بعد قليل';
    }
    return { data: null, error: msg };
  }
};

// ── Auth ──────────────────────────────────────────────
// POST /auth/login  { code, password }  → { success, token }
export const authAPI = {
  login: (data) => req(() => http.post('/auth/login', data)),
};

// ── Dashboard ─────────────────────────────────────────
// GET /dashboard
export const dashboardAPI = {
  getStats: () => req(() => http.get('/dashboard')),
};

// ── Products ──────────────────────────────────────────
// GET    /product
// POST   /product/add
// PUT    /product/update/:productId
// DELETE /product/delete/:productId
export const productsAPI = {
  getAll: (q = '') => req(() => http.get(`/product${q}`)),
  getById: (id) => req(() => http.get(`/product/${id}`)),
  create: (data) => req(() => http.post('/product/add', data)),
  update: (id, d) => req(() => http.put(`/product/update/${id}`, d)),
  delete: (id) => req(() => http.delete(`/product/delete/${id}`)),
  updateStock: (id, data) => req(() => http.patch(`/product/stock/${id}`, data)),
};

// ── Customers ─────────────────────────────────────────
// GET    /customer
// POST   /customer/add
// PUT    /customer/update/:customerId
// DELETE /customer/delete/:customerId
export const customersAPI = {
  getAll: (q = '') => req(() => http.get(`/customer${q}`)),
  getById: (id) => req(() => http.get(`/customer/${id}`)),
  create: (data) => req(() => http.post('/customer/add', data)),
  update: (id, d) => req(() => http.put(`/customer/update/${id}`, d)),
  delete: (id) => req(() => http.delete(`/customer/delete/${id}`)),
};

// ── Invoices ──────────────────────────────────────────
// GET    /invoice
// POST   /invoice/create
// PUT    /invoice/refund/:invoiceId
// DELETE /invoice/delete/:invoiceId
// GET    /invoice/pdf/:invoiceId
export const invoicesAPI = {
  getAll: (q = '') => req(() => http.get(`/invoice${q}`)),
  getById: (id) => req(() => http.get(`/invoice/${id}`)),
  create: (data) => req(() => http.post('/invoice/create', data)),
  refund: (id, d) => req(() => http.put(`/invoice/refund/${id}`, d)),
  delete: (id) => req(() => http.delete(`/invoice/delete/${id}`)),
  getCustomerInvoices: (customerId) => req(() => http.get(`/invoice/customer/${customerId}/details`)),
};

export default http;
