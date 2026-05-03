/**
 * view.js
 * GET    /incidents/:id          — завантажити інцидент
 * GET    /incidents/categories   — категорії для редагування
 * PATCH  /incidents/:id          — редагування (автор-юзер або адмін)
 * PATCH  /incidents/:id/status   — змінити статус (тільки Admin, будь-який з 3-х)
 * PATCH  /incidents/:id/comment  — додати коментар (Admin або User)
 * DELETE /incidents/:id          — видалити (тільки Admin)
 */

const ALL_STATUSES = ['New', 'In Progress', 'Resolved'];

let currentIncident = null;
let categoriesCache = null;

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearAuth();
    window.location.href = 'index.html';
  });

  const id = getParam('id');
  if (!id) { window.location.href = 'dashboard.html'; return; }

  await loadIncident(id);
});

async function loadIncident(id) {
  try {
    const incident = await apiFetch(`/incidents/${id}`);
    currentIncident = incident;
    renderIncident(incident);
  } catch (err) {
    document.getElementById('incident-box').innerHTML =
      `<p class="empty-state" style="color:#c44;">Помилка: ${esc(err.message)}</p>`;
  }
}

function renderIncident(inc) {
  document.title = `${inc.title} — Smart Incident Reporting`;

  document.getElementById('view-title').textContent    = inc.title;
  document.getElementById('view-desc').textContent     = inc.description;
  document.getElementById('view-category').textContent = inc.category?.name || '—';
  document.getElementById('view-location').textContent = inc.location || '—';
  document.getElementById('view-date').textContent     = formatDate(inc.createdAt);

  // === Статус ===
  renderStatus(inc);

  // === Кнопки дій ===
  renderActions(inc);

  // === Коментарі ===
  renderComments(inc.comments || []);

  // Форма коментаря — і для User, і для Admin
  const commentForm = document.getElementById('comment-form');
  if (commentForm) {
    commentForm.style.display = 'block';
    const addBtn = document.getElementById('add-comment-btn');
    const newBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newBtn, addBtn);
    newBtn.addEventListener('click', () => handleAddComment(inc.id));
  }
}

function renderStatus(inc) {
  const currentStatus = inc.status?.name || 'New';
  const wrap = document.getElementById('status-wrap');
  if (!wrap) return;

  if (isAdmin()) {
    // Адмін бачить випадаючий список з 3-х варіантів
    wrap.innerHTML = `
      <div class="select-wrap">
        <select class="field-select" id="view-status" style="min-width:160px;">
          ${ALL_STATUSES.map(s => `
            <option value="${esc(s)}" ${s === currentStatus ? 'selected' : ''}>${esc(s)}</option>
          `).join('')}
        </select>
        <span class="select-arrow">∨</span>
      </div>
    `;
    const sel = document.getElementById('view-status');
    sel.addEventListener('change', () => handleStatusChange(inc.id, sel.value));
  } else {
    // Юзер бачить тільки бейдж — readonly
    const cls = statusClass(currentStatus);
    const label = statusLabel(currentStatus);
    wrap.innerHTML = `<span class="badge ${cls}">${esc(label)}</span>`;
  }
}

function renderActions(inc) {
  const actionsEl = document.getElementById('actions-bar');
  if (!actionsEl) return;
  actionsEl.innerHTML = '';

  const user = getUser();
  const userId = user?.id;
  const isAuthor = userId && inc.author?.id === userId;
  const isUserRole = !isAdmin();
  const statusName = inc.status?.name || 'New';

  // Юзер-автор може редагувати свій інцидент тільки якщо статус "New"
  if (isUserRole && isAuthor && statusName === 'New') {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-action btn-edit';
    editBtn.textContent = 'Редагувати';
    editBtn.addEventListener('click', openEditModal);
    actionsEl.appendChild(editBtn);
  }

  // Адмін може видаляти будь-який інцидент
  if (isAdmin()) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-action btn-delete';
    delBtn.textContent = 'Видалити';
    delBtn.addEventListener('click', () => handleDelete(inc.id));
    actionsEl.appendChild(delBtn);
  }
}

async function handleStatusChange(id, newStatus) {
  if (newStatus === currentIncident.status?.name) return;

  if (!confirm(`Змінити статус на "${newStatus}"?`)) {
    // Повернути попереднє значення в селекті
    const sel = document.getElementById('view-status');
    if (sel) sel.value = currentIncident.status?.name || 'New';
    return;
  }

  const sel = document.getElementById('view-status');
  if (sel) sel.disabled = true;

  try {
    const updated = await apiFetch(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    currentIncident = updated;
    renderIncident(updated);
  } catch (err) {
    alert(`Помилка: ${err.message}`);
    if (sel) {
      sel.value = currentIncident.status?.name || 'New';
      sel.disabled = false;
    }
  }
}

async function handleAddComment(id) {
  const textarea = document.getElementById('comment-input');
  const content  = textarea?.value.trim();

  if (!content || content.length < 2) { alert('Коментар: мінімум 2 символи'); return; }

  const btn = document.getElementById('add-comment-btn');
  btn.disabled = true;
  btn.textContent = 'Надсилання...';

  try {
    const updated = await apiFetch(`/incidents/${id}/comment`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
    textarea.value = '';
    currentIncident = updated;
    renderComments(updated.comments || []);
  } catch (err) {
    alert(`Помилка: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Надіслати';
  }
}

function renderComments(comments) {
  const el = document.getElementById('comments-list');
  if (!comments.length) {
    el.innerHTML = '<p class="empty-state">Коментарів поки немає.</p>';
    return;
  }
  el.innerHTML = comments.map(c => {
    const roleName = c.author?.role?.name === 'admin' ? 'admin' : 'user';
    const roleBadge = roleName === 'admin'
      ? '<span class="comment-role-admin">admin</span>'
      : '<span class="comment-role-user">user</span>';
    return `
      <div class="comment-box ${roleName === 'admin' ? 'comment-admin' : ''}">
        <div class="comment-header">
          <span class="comment-author">${esc(c.author?.firstName || '')} ${esc(c.author?.lastName || '')} ${roleBadge}</span>
          <span class="comment-date">${formatDate(c.createdAt)}</span>
        </div>
        <p class="comment-text">${esc(c.content)}</p>
      </div>
    `;
  }).join('');
}

async function handleDelete(id) {
  if (!confirm('Видалити цей інцидент назавжди? Цю дію неможливо скасувати.')) {
    return;
  }
  try {
    await apiFetch(`/incidents/${id}`, { method: 'DELETE' });
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert(`Помилка: ${err.message}`);
  }
}

async function openEditModal() {
  if (!categoriesCache) {
    try {
      categoriesCache = await apiFetch('/incidents/categories');
    } catch (err) {
      alert('Не вдалося завантажити категорії: ' + err.message);
      return;
    }
  }

  const modal = document.getElementById('edit-modal');
  const overlay = document.getElementById('edit-overlay');
  if (!modal || !overlay) return;

  document.getElementById('edit-title').value = currentIncident.title || '';
  document.getElementById('edit-desc').value = currentIncident.description || '';
  document.getElementById('edit-address').value = currentIncident.location || '';

  const sel = document.getElementById('edit-category');
  sel.innerHTML = '';
  categoriesCache.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    if (currentIncident.category?.name === c.name) opt.selected = true;
    sel.appendChild(opt);
  });

  modal.style.display = 'block';
  overlay.style.display = 'block';

  const saveBtn = document.getElementById('edit-save-btn');
  const cancelBtn = document.getElementById('edit-cancel-btn');

  const newSave = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSave, saveBtn);
  newSave.addEventListener('click', handleEditSave);

  const newCancel = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  newCancel.addEventListener('click', closeEditModal);
  overlay.addEventListener('click', closeEditModal);
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.getElementById('edit-overlay').style.display = 'none';
}

async function handleEditSave() {
  const title       = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-desc').value.trim();
  const category    = document.getElementById('edit-category').value;
  const address     = document.getElementById('edit-address').value.trim();

  if (title.length < 3) { alert('Назва: мінімум 3 символи'); return; }
  if (description.length < 5) { alert('Опис: мінімум 5 символів'); return; }
  if (!category) { alert('Оберіть категорію'); return; }
  if (address.length < 3) { alert('Локація: мінімум 3 символи'); return; }

  const btn = document.getElementById('edit-save-btn');
  btn.disabled = true;
  btn.textContent = 'Збереження...';

  try {
    const updated = await apiFetch(`/incidents/${currentIncident.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, description, category, address })
    });
    currentIncident = updated;
    renderIncident(updated);
    closeEditModal();
  } catch (err) {
    alert(`Помилка: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Зберегти';
  }
}