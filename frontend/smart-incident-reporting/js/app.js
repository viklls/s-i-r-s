/**
 * app.js — спільні утиліти, API клієнт, auth
 * Base URL: http://localhost:3000
 *
 * Статуси (з бекенду): 'New', 'In Progress', 'Resolved'
 * Ролі: 'admin', 'user'
 */

const API_BASE = 'http://localhost:3000';

//  AUTH
function getToken()   { return localStorage.getItem('token'); }
function getUser()    { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
function isLoggedIn() { return !!getToken(); }
function isAdmin()    { return getUser()?.role === 'admin'; }

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function requireAuth() {
  if (!isLoggedIn()) window.location.href = 'login.html';
}

//  API CLIENT
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = 'login.html';
    return;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

//  STATUS HELPERS
const STATUS_LABEL = {
  'New':         'open',
  'In Progress': 'in progress',
  'Resolved':    'resolved'
};

const STATUS_CLASS = {
  'New':         'badge-open',
  'In Progress': 'badge-progress',
  'Resolved':    'badge-resolved'
};

// Flow: New → In Progress → Resolved
const STATUS_NEXT = {
  'New':         'In Progress',
  'In Progress': 'Resolved'
};

function statusLabel(s) { return STATUS_LABEL[s] || s; }
function statusClass(s)  { return STATUS_CLASS[s]  || 'badge-open'; }

//  UTILS
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth()+1)}.${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
