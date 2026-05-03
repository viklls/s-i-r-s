/**
 * dashboard.js
 *
 * Список інцидентів + модалка перегляду.
 * Підтримує IoT-інциденти: бейдж "🤖 IoT" біля назви + блок "Device info" в модалці.
 */

const ALL_STATUSES = ['New', 'In Progress', 'Resolved'];

let allIncidents = [];
let categoriesCache = null;
let currentIncident = null;

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

  const user = getUser();
  const userNameEl = document.getElementById('user-name');
  if (userNameEl && user) {
    userNameEl.textContent = `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''} (${user.role})`;
  }

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearAuth();
    window.location.href = 'index.html';
  });

  const createBtn = document.getElementById('btn-create');
  if (createBtn && isAdmin()) {
    createBtn.style.display = 'none';
  }

  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('filter-category')?.addEventListener('change', applyFilters);
  document.getElementById('filter-source')?.addEventListener('change', applyFilters);
  document.getElementById('filter-reset')?.addEventListener('click', () => {
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-category').value = '';
    const fs = document.getElementById('filter-source');
    if (fs) fs.value = '';
    applyFilters();
  });

  document.getElementById('incident-close-btn')?.addEventListener('click', closeIncidentModal);
  document.getElementById('incident-overlay')?.addEventListener('click', closeIncidentModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('edit-modal').style.display === 'block') {
        closeEditModal();
      } else if (document.getElementById('incident-modal').style.display === 'block') {
        closeIncidentModal();
      }
    }
  });

  document.getElementById('edit-cancel-btn')?.addEventListener('click', closeEditModal);
  document.getElementById('edit-overlay')?.addEventListener('click', closeEditModal);
  document.getElementById('edit-save-btn')?.addEventListener('click', handleEditSave);
  document.getElementById('modal-add-comment-btn')?.addEventListener('click', handleAddComment);

  await loadCategories();
  await loadIncidents();

  // Авто-оновлення списку кожні 15 секунд (щоб бачити нові IoT-інциденти)
  setInterval(loadIncidents, 15000);
});

async function loadCategories() {
  try {
    categoriesCache = await apiFetch('/incidents/categories');
    const sel = document.getElementById('filter-category');
    if (!sel) return;
    categoriesCache.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadIncidents() {
  const listEl = document.getElementById('incidents-list');
  if (!allIncidents.length) {
    listEl.innerHTML = '<p class="empty-state">Завантаження...</p>';
  }

  try {
    allIncidents = await apiFetch('/incidents');
    applyFilters();
  } catch (err) {
    listEl.innerHTML = `<p class="empty-state" style="color:#c44;">Помилка: ${esc(err.message)}</p>`;
  }
}

function applyFilters() {
  const statusFilter = document.getElementById('filter-status')?.value || '';
  const categoryFilter = document.getElementById('filter-category')?.value || '';
  const sourceFilter = document.getElementById('filter-source')?.value || '';

  let filtered = allIncidents;
  if (statusFilter) filtered = filtered.filter(i => i.status?.name === statusFilter);
  if (categoryFilter) filtered = filtered.filter(i => i.category?.name === categoryFilter);
  if (sourceFilter === 'iot') filtered = filtered.filter(i => i.device);
  if (sourceFilter === 'human') filtered = filtered.filter(i => !i.device);

  renderIncidents(filtered);
}

function renderIncidents(incidents) {
  const listEl = document.getElementById('incidents-list');

  if (!incidents || incidents.length === 0) {
    listEl.innerHTML = '<p class="empty-state">Інцидентів не знайдено.</p>';
    return;
  }

  incidents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  listEl.innerHTML = incidents.map(inc => {
    const statusName = inc.status?.name || 'New';
    const badgeClass = statusClass(statusName);
    const label = statusLabel(statusName);
    const categoryName = inc.category?.name || '—';
    const iotBadge = inc.device ? `<span class="iot-badge" title="Reported by IoT">🤖 IoT</span>` : '';

    return `
      <div class="incident-item" data-id="${inc.id}">
        <div class="incident-item-top">
          <span class="incident-name">${iotBadge}${esc(inc.title)}</span>
          <span class="badge ${badgeClass}">${esc(label)}</span>
        </div>
        <div class="incident-item-bottom">
          <span class="incident-meta">${esc(categoryName)} · ${esc(inc.location || '—')}</span>
          <span class="incident-meta">${formatDate(inc.createdAt)}</span>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.incident-item').forEach(el => {
    el.addEventListener('click', () => openIncidentModal(el.dataset.id));
  });
}

async function openIncidentModal(id) {
  const overlay = document.getElementById('incident-overlay');
  const modal = document.getElementById('incident-modal');
  modal.style.display = 'block';
  overlay.style.display = 'block';

  document.getElementById('modal-title').textContent = 'Завантаження...';
  document.getElementById('modal-description').textContent = '';

  try {
    const inc = await apiFetch(`/incidents/${id}`);
    currentIncident = inc;
    renderIncidentModal(inc);
  } catch (err) {
    document.getElementById('modal-title').textContent = 'Помилка';
    document.getElementById('modal-description').textContent = err.message;
  }
}

function closeIncidentModal() {
  document.getElementById('incident-modal').style.display = 'none';
  document.getElementById('incident-overlay').style.display = 'none';
  currentIncident = null;
}

function renderIncidentModal(inc) {
  const authorName = inc.author
    ? `${inc.author.firstName || ''} ${inc.author.lastName || ''}`.trim() || inc.author.email
    : '—';

  const titleWithBadge = inc.device
    ? `<span class="iot-badge">🤖 IoT</span> ${esc(inc.title)}`
    : esc(inc.title);

  document.getElementById('modal-title').innerHTML = titleWithBadge;
  document.getElementById('modal-subtitle').textContent = `Інцидент #${inc.id}`;
  document.getElementById('modal-description').textContent = inc.description || '—';
  document.getElementById('modal-category').textContent = inc.category?.name || '—';
  document.getElementById('modal-location').textContent = inc.location || '—';
  document.getElementById('modal-date').textContent = formatDate(inc.createdAt);
  document.getElementById('modal-author').textContent = authorName;

  // === Блок Device info (тільки якщо інцидент від IoT) ===
  const deviceBox = document.getElementById('modal-device-box');
  if (inc.device) {
    deviceBox.style.display = 'block';
    document.getElementById('device-name').textContent = inc.device.name;
    document.getElementById('device-type').textContent = inc.device.type;
    document.getElementById('device-location').textContent = inc.device.location || '—';
    document.getElementById('device-last-seen').textContent = inc.device.lastSeenAt
      ? formatDate(inc.device.lastSeenAt)
      : 'never';
  } else {
    deviceBox.style.display = 'none';
  }

  renderStatusControl(inc);
  renderActionButtons(inc);
  renderComments(inc.comments || []);

  const ta = document.getElementById('modal-comment-input');
  if (ta) ta.value = '';
}

function renderStatusControl(inc) {
  const wrap = document.getElementById('modal-status-wrap');
  if (!wrap) return;

  const currentStatus = inc.status?.name || 'New';

  if (isAdmin()) {
    wrap.innerHTML = `
      <div class="status-control">
        <div class="select-wrap">
          <select class="field-select" id="status-select">
            ${ALL_STATUSES.map(s => `
              <option value="${esc(s)}" ${s === currentStatus ? 'selected' : ''}>${esc(s)}</option>
            `).join('')}
          </select>
          <span class="select-arrow">∨</span>
        </div>
        <button class="btn-save-status" id="status-save-btn" type="button">Змінити</button>
      </div>
    `;

    const sel = document.getElementById('status-select');
    const saveBtn = document.getElementById('status-save-btn');

    const updateBtnState = () => { saveBtn.disabled = (sel.value === currentStatus); };
    updateBtnState();
    sel.addEventListener('change', updateBtnState);

    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await handleStatusSave(inc.id, sel.value);
    });
  } else {
    const cls = statusClass(currentStatus);
    const label = statusLabel(currentStatus);
    wrap.innerHTML = `<span class="badge ${cls}">${esc(label)}</span>`;
  }
}

async function handleStatusSave(id, newStatus) {
  if (!currentIncident || newStatus === currentIncident.status?.name) return;
  if (!confirm(`Змінити статус на "${newStatus}"?`)) return;

  const saveBtn = document.getElementById('status-save-btn');
  const sel = document.getElementById('status-select');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '...'; }
  if (sel) sel.disabled = true;

  try {
    const updated = await apiFetch(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    currentIncident = updated;
    renderIncidentModal(updated);
    const idx = allIncidents.findIndex(i => i.id === updated.id);
    if (idx !== -1) {
      allIncidents[idx] = { ...allIncidents[idx], status: updated.status, lastUpdatedAt: updated.lastUpdatedAt };
      applyFilters();
    } else {
      await loadIncidents();
    }
  } catch (err) {
    alert(`Помилка: ${err.message}`);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Змінити'; }
    if (sel) { sel.disabled = false; sel.value = currentIncident.status?.name || 'New'; }
  }
}

function renderActionButtons(inc) {
  const actionsEl = document.getElementById('modal-actions');
  if (!actionsEl) return;
  actionsEl.innerHTML = '';

  const user = getUser();
  const userId = user?.id;
  const isAuthor = userId && inc.author?.id === userId;
  const isUserRole = !isAdmin();
  const statusName = inc.status?.name || 'New';

  // Юзер-автор може редагувати тільки свій інцидент і тільки в New (IoT-інциденти юзер не редагує)
  if (isUserRole && isAuthor && statusName === 'New' && !inc.device) {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-action btn-edit';
    editBtn.type = 'button';
    editBtn.textContent = 'Редагувати';
    editBtn.addEventListener('click', openEditModal);
    actionsEl.appendChild(editBtn);
  }

  if (isAdmin()) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-action btn-delete';
    delBtn.type = 'button';
    delBtn.textContent = 'Видалити';
    delBtn.addEventListener('click', () => handleDelete(inc.id));
    actionsEl.appendChild(delBtn);
  }
}

async function handleDelete(id) {
  if (!confirm('Видалити цей інцидент назавжди? Цю дію неможливо скасувати.')) return;
  try {
    await apiFetch(`/incidents/${id}`, { method: 'DELETE' });
    closeIncidentModal();
    await loadIncidents();
  } catch (err) {
    alert(`Помилка: ${err.message}`);
  }
}

function renderComments(comments) {
  const el = document.getElementById('modal-comments-list');
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

async function handleAddComment() {
  if (!currentIncident) return;
  const ta = document.getElementById('modal-comment-input');
  const content = ta?.value.trim();
  if (!content || content.length < 2) { alert('Коментар: мінімум 2 символи'); return; }

  const btn = document.getElementById('modal-add-comment-btn');
  btn.disabled = true;
  btn.textContent = 'Надсилання...';

  try {
    const updated = await apiFetch(`/incidents/${currentIncident.id}/comment`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
    currentIncident = updated;
    ta.value = '';
    renderComments(updated.comments || []);
  } catch (err) {
    alert(`Помилка: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Надіслати';
  }
}

async function openEditModal() {
  if (!currentIncident) return;
  if (!categoriesCache) {
    try {
      categoriesCache = await apiFetch('/incidents/categories');
    } catch (err) {
      alert('Не вдалося завантажити категорії: ' + err.message);
      return;
    }
  }

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

  document.getElementById('edit-modal').style.display = 'block';
  document.getElementById('edit-overlay').style.display = 'block';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.getElementById('edit-overlay').style.display = 'none';
}

async function handleEditSave() {
  if (!currentIncident) return;

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
    renderIncidentModal(updated);
    closeEditModal();
    const idx = allIncidents.findIndex(i => i.id === updated.id);
    if (idx !== -1) {
      allIncidents[idx] = updated;
      applyFilters();
    } else {
      await loadIncidents();
    }
  } catch (err) {
    alert(`Помилка: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Зберегти';
  }
}