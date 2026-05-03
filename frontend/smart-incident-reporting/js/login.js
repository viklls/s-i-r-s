/**
 * login.js
 * POST /auth/login    — логін
 * POST /auth/register — реєстрація
 */

document.addEventListener('DOMContentLoaded', () => {
  // Якщо вже залогінений — одразу на dashboard
  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Перемикання між Login / Register
  document.getElementById('show-register')?.addEventListener('click', () => toggleForm('register'));
  document.getElementById('show-login')?.addEventListener('click',    () => toggleForm('login'));

  document.getElementById('login-btn')?.addEventListener('click',    handleLogin);
  document.getElementById('register-btn')?.addEventListener('click', handleRegister);
});

function toggleForm(mode) {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  if (mode === 'register') {
    loginForm.style.display    = 'none';
    registerForm.style.display = 'block';
  } else {
    loginForm.style.display    = 'block';
    registerForm.style.display = 'none';
  }
  clearError();
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) { showError('Заповніть усі поля'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Вхід...';
  clearError();

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuth(data.token, data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'LOGIN →';
  }
}

async function handleRegister() {
  const first_name = document.getElementById('reg-first').value.trim();
  const last_name  = document.getElementById('reg-last').value.trim();
  const email      = document.getElementById('reg-email').value.trim();
  const password   = document.getElementById('reg-password').value;

  if (!first_name || !last_name || !email || !password) {
    showError('Заповніть усі поля'); return;
  }

  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.textContent = 'Реєстрація...';
  clearError();

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, first_name, last_name })
    });
    setAuth(data.token, data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Зареєструватися';
  }
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}
