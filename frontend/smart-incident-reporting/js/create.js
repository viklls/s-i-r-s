/**
 * create.js
 * GET /incidents/categories — отримати категорії
 * POST /incidents — створити (Bearer token)
 */

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearAuth();
    window.location.href = 'index.html';
  });

  await loadCategories();

  document.getElementById('submit-btn').addEventListener('click', handleSubmit);
});

async function loadCategories() {
  const sel = document.getElementById('category');
  try {
    const cats = await apiFetch('/incidents/categories');
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } catch (err) {
    showError('Не вдалося завантажити категорії: ' + err.message);
  }
}

async function handleSubmit() {
  const title       = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const category    = document.getElementById('category').value;
  const address     = document.getElementById('address').value.trim();

  if (!title || title.length < 3) { showError('Назва: мінімум 3 символи'); return; }
  if (!description || description.length < 5) { showError('Опис: мінімум 5 символів'); return; }
  if (!category) { showError('Оберіть категорію'); return; }
  if (!address || address.length < 3) { showError('Локація: мінімум 3 символи'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Збереження...';
  clearError();

  try {
    await apiFetch('/incidents', {
      method: 'POST',
      body: JSON.stringify({ title, description, category, address })
    });

    window.location.href = 'dashboard.html';

  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Create new incident';
  }
}

function showError(msg) {
  const el = document.getElementById('form-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearError() {
  const el = document.getElementById('form-error');
  if (el) el.style.display = 'none';
}