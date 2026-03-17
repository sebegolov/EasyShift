(() => {
  const root = document.getElementById('root');
  const searchParams = new URLSearchParams(window.location.search);
  const apiBaseUrl = `${window.location.origin}/api`;
  const tg = window.Telegram?.WebApp;
  const telegramId = String(tg?.initDataUnsafe?.user?.id ?? '').trim();
  const state = {
    isDeveloper: false,
    account: null,
    stats: null,
    users: [],
    userDetail: null,
    incidents: [],
    userPage: 1,
    userPageSize: 20,
    userTotal: 0,
    userRole: '',
    userStatus: '',
    userSearch: '',
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setRootContent(html) {
    if (root) {
      root.innerHTML = html;
    }
  }

  async function request(path, options = {}) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });
    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const error = new Error(payload?.message || response.statusText);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  function buildIdentityQuery() {
    const params = new URLSearchParams();
    if (telegramId) {
      params.set('telegramId', telegramId);
    }
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  async function loadAccount() {
    if (!telegramId) {
      return null;
    }
    state.account = await request(`/users/me${buildIdentityQuery()}`);
    return state.account;
  }

  async function switchRole(targetRole) {
    await request('/users/switch-role', {
      method: 'POST',
      body: JSON.stringify({
        telegramId,
        targetRole,
      }),
    });
    alert(`Роль переключена на ${targetRole}. Теперь заполните профиль для новой роли.`);
    const url = new URL(window.location.href);
    url.searchParams.delete('settings');
    url.searchParams.delete('admin');
    url.searchParams.set('role', targetRole);
    window.location.href = url.toString();
  }

  async function deleteAccount() {
    const confirmed = window.confirm('Удалить аккаунт? Это действие сработает только если у аккаунта нет активных зависимостей.');
    if (!confirmed) {
      return;
    }
    await request(`/users/me${buildIdentityQuery()}`, {
      method: 'DELETE',
    });
    alert('Аккаунт удален.');
    const url = new URL(window.location.href);
    url.search = '';
    window.location.href = url.toString();
  }

  function upsertOverlay() {
    let overlay = document.getElementById('account-tools-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'account-tools-overlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function closeOverlay() {
    const overlay = document.getElementById('account-tools-overlay');
    if (overlay) {
      overlay.innerHTML = '';
      overlay.className = '';
    }
  }

  function renderDependencySummary(account) {
    const dependencies = account?.dependencies;
    if (!dependencies) {
      return '<p class="miniapp-tools-muted">Данные о зависимостях пока недоступны.</p>';
    }
    return `
      <div class="miniapp-tools-grid">
        <div class="miniapp-tools-card">
          <h4>Работодатель</h4>
          <p>ПВЗ: <strong>${dependencies.owner.pvzCount}</strong></p>
          <p>Смены: <strong>${dependencies.owner.shiftCount}</strong></p>
          <p>Подписки: <strong>${dependencies.owner.subscriptionCount}</strong></p>
          <p class="${dependencies.owner.canReset ? 'miniapp-tools-ok' : 'miniapp-tools-bad'}">
            ${dependencies.owner.canReset ? 'Можно сбросить роль' : 'Есть блокирующие зависимости'}
          </p>
        </div>
        <div class="miniapp-tools-card">
          <h4>Работник</h4>
          <p>Зоны: <strong>${dependencies.worker.zoneCount}</strong></p>
          <p>Отклики: <strong>${dependencies.worker.applicationCount}</strong></p>
          <p>Назначения: <strong>${dependencies.worker.assignmentCount}</strong></p>
          <p class="${dependencies.worker.canReset ? 'miniapp-tools-ok' : 'miniapp-tools-bad'}">
            ${dependencies.worker.canReset ? 'Можно сбросить роль' : 'Есть блокирующие зависимости'}
          </p>
        </div>
      </div>
    `;
  }

  function renderAccountOverlay(account) {
    const overlay = upsertOverlay();
    overlay.className = 'miniapp-tools-overlay';
    overlay.innerHTML = `
      <div class="miniapp-tools-backdrop" data-close-overlay="true"></div>
      <div class="miniapp-tools-modal">
        <div class="miniapp-tools-header">
          <div>
            <div class="miniapp-tools-badge">Аккаунт</div>
            <h3>${escapeHtml(account.fullName || 'Пользователь')}</h3>
            <p class="miniapp-tools-muted">Текущая роль: <strong>${escapeHtml(account.role)}</strong></p>
          </div>
          <button class="miniapp-tools-close" type="button" data-close-overlay="true">Закрыть</button>
        </div>
        <div class="miniapp-tools-body">
          <div class="miniapp-tools-card">
            <p><strong>Telegram ID:</strong> ${escapeHtml(account.telegramId || 'не привязан')}</p>
            <p><strong>Телефон:</strong> ${escapeHtml(account.phone || 'не указан')}</p>
            <p><strong>Статус:</strong> ${escapeHtml(account.status)}</p>
            <p><strong>Профиль работодателя:</strong> ${account.profileState?.owner?.isCompleted ? 'заполнен' : 'не заполнен'}</p>
            <p><strong>Профиль работника:</strong> ${account.profileState?.worker?.isCompleted ? 'заполнен' : 'не заполнен'}</p>
          </div>
          ${renderDependencySummary(account)}
          <div class="miniapp-tools-actions">
            ${account.role !== 'owner'
              ? '<button type="button" data-switch-role="owner" class="miniapp-tools-primary">Стать работодателем</button>'
              : ''}
            ${account.role !== 'worker'
              ? '<button type="button" data-switch-role="worker" class="miniapp-tools-primary">Стать работником</button>'
              : ''}
            <button type="button" data-delete-account="true" class="miniapp-tools-danger">Удалить аккаунт</button>
          </div>
        </div>
      </div>
    `;
  }

  function injectTopAccountBar() {
    if (document.getElementById('es-account-admin-bar')) {
      return;
    }
    const rootShell = document.querySelector('.app-shell') || root?.parentElement || document.body;
    if (!rootShell) {
      return;
    }
    const bar = document.createElement('div');
    bar.id = 'es-account-admin-bar';
    bar.className = 'es-top-bar';
    bar.innerHTML = `
      <div class="es-top-bar-inner">
        <span class="es-top-bar-label">EasyShift</span>
        <div class="es-top-bar-actions">
          <span class="es-top-link" role="button" tabindex="0" data-open-account="true">Аккаунт</span>
          <span class="es-top-link es-top-link-admin" role="button" tabindex="0" data-open-admin="true">Dev Admin</span>
        </div>
      </div>
    `;
    rootShell.parentElement?.insertBefore(bar, rootShell);
  }

  function updateDeveloperButton() {
    // Кнопка Dev Admin теперь показывается всегда, доступ всё равно проверяет backend.
  }

  function renderAdminShell() {
    setRootContent(`
      <div class="app-shell miniapp-admin-shell">
        <div class="app-card">
          <section class="hero">
            <div class="miniapp-tools-header-row">
              <div>
                <div class="miniapp-tools-badge">Developer Admin</div>
                <h1>EasyShift Control Room</h1>
                <p>Внутренний раздел для статистики, пользователей и инцидентов.</p>
              </div>
              <button type="button" class="ghost compact" data-exit-admin="true">Вернуться в приложение</button>
            </div>
          </section>
          <section class="section" id="miniapp-admin-dashboard"></section>
          <section class="section" id="miniapp-admin-users"></section>
          <section class="section" id="miniapp-admin-user-detail"></section>
          <section class="section" id="miniapp-admin-incidents"></section>
        </div>
      </div>
    `);
  }

  function renderStats() {
    const node = document.getElementById('miniapp-admin-dashboard');
    if (!node || !state.stats) {
      return;
    }
    node.innerHTML = `
      <div class="step-header">
        <div>
          <div class="step-badge">Dashboard</div>
          <h2>Ключевые метрики</h2>
        </div>
      </div>
      <div class="miniapp-tools-grid">
        <div class="miniapp-tools-card">
          <h4>Пользователи</h4>
          <p>Всего: <strong>${state.stats.users.total}</strong></p>
          <p>Активные: <strong>${state.stats.users.active}</strong></p>
          <p>Черновики: <strong>${state.stats.users.draft}</strong></p>
          <p>Удаленные: <strong>${state.stats.users.deleted}</strong></p>
        </div>
        <div class="miniapp-tools-card">
          <h4>Роли</h4>
          <p>Работодатели: <strong>${state.stats.users.owner}</strong></p>
          <p>Работники: <strong>${state.stats.users.worker}</strong></p>
          <p>С Telegram: <strong>${state.stats.users.withTelegram}</strong></p>
          <p>С телефоном: <strong>${state.stats.users.withPhone}</strong></p>
        </div>
        <div class="miniapp-tools-card">
          <h4>Операции</h4>
          <p>ПВЗ: <strong>${state.stats.operations.pvz}</strong></p>
          <p>Draft-смены: <strong>${state.stats.operations.shifts.draft}</strong></p>
          <p>Открытые смены: <strong>${state.stats.operations.shifts.collectingResponses}</strong></p>
          <p>Назначенные: <strong>${state.stats.operations.shifts.assigned}</strong></p>
        </div>
        <div class="miniapp-tools-card">
          <h4>Риски и биллинг</h4>
          <p>Активные подписки: <strong>${state.stats.subscriptions.active}</strong></p>
          <p>Открытые инциденты: <strong>${state.stats.operations.incidents.open}</strong></p>
          <p>Решенные инциденты: <strong>${state.stats.operations.incidents.resolved}</strong></p>
          <p>Trusted workers: <strong>${state.stats.workers.trusted}</strong></p>
        </div>
      </div>
    `;
  }

  function renderUsers() {
    const node = document.getElementById('miniapp-admin-users');
    if (!node) {
      return;
    }
    const rows = state.users.map((user) => `
      <tr class="es-user-row" role="button" tabindex="0" data-open-user="${user.id}">
        <td>${escapeHtml(user.fullName)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td>${escapeHtml(user.status)}</td>
        <td>${escapeHtml(user.telegramId || '—')}</td>
        <td>${escapeHtml(user.phone || '—')}</td>
        <td><span class="es-open-label">Открыть</span></td>
      </tr>
    `).join('');
    node.innerHTML = `
      <div class="step-header">
        <div>
          <div class="step-badge">Users</div>
          <h2>Пользователи</h2>
        </div>
      </div>
      <div class="miniapp-tools-filters">
        <input type="text" placeholder="Поиск по имени, телефону, Telegram ID" value="${escapeHtml(state.userSearch)}" data-users-search="true" />
        <select data-users-role="true">
          <option value="">Все роли</option>
          <option value="owner" ${state.userRole === 'owner' ? 'selected' : ''}>owner</option>
          <option value="worker" ${state.userRole === 'worker' ? 'selected' : ''}>worker</option>
          <option value="draft" ${state.userRole === 'draft' ? 'selected' : ''}>draft</option>
          <option value="deleted" ${state.userRole === 'deleted' ? 'selected' : ''}>deleted</option>
        </select>
        <select data-users-status="true">
          <option value="">Все статусы</option>
          <option value="active" ${state.userStatus === 'active' ? 'selected' : ''}>active</option>
          <option value="draft" ${state.userStatus === 'draft' ? 'selected' : ''}>draft</option>
          <option value="deleted" ${state.userStatus === 'deleted' ? 'selected' : ''}>deleted</option>
        </select>
        <button type="button" class="primary compact" data-users-refresh="true">Обновить</button>
      </div>
      <div class="miniapp-tools-table-wrap">
        <table class="miniapp-tools-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Telegram</th>
              <th>Телефон</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6">Пользователи не найдены.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="miniapp-tools-pagination">
        <span>Страница ${state.userPage}</span>
        <button type="button" class="ghost compact" data-users-page="prev" ${state.userPage <= 1 ? 'disabled' : ''}>Назад</button>
        <button type="button" class="ghost compact" data-users-page="next" ${(state.userPage * state.userPageSize) >= state.userTotal ? 'disabled' : ''}>Дальше</button>
      </div>
    `;
  }

  function renderUserDetail() {
    const node = document.getElementById('miniapp-admin-user-detail');
    if (!node) {
      return;
    }
    if (!state.userDetail) {
      node.innerHTML = `
        <div class="step-header">
          <div>
            <div class="step-badge">User Detail</div>
            <h2>Карточка пользователя</h2>
          </div>
        </div>
        <p class="muted">Выберите пользователя из списка, чтобы посмотреть детали.</p>
      `;
      return;
    }
    const detail = state.userDetail;
    node.innerHTML = `
      <div class="step-header">
        <div>
          <div class="step-badge">User Detail</div>
          <h2>${escapeHtml(detail.user.fullName)}</h2>
        </div>
      </div>
      <div class="miniapp-tools-grid">
        <div class="miniapp-tools-card">
          <p><strong>Роль:</strong> ${escapeHtml(detail.user.role)}</p>
          <p><strong>Статус:</strong> ${escapeHtml(detail.user.status)}</p>
          <p><strong>Telegram:</strong> ${escapeHtml(detail.user.telegramId || '—')}</p>
          <p><strong>Телефон:</strong> ${escapeHtml(detail.user.phone || '—')}</p>
        </div>
        <div class="miniapp-tools-card">
          <h4>Профили</h4>
          <p>Owner profile: ${detail.user.ownerProfile ? 'есть' : 'нет'}</p>
          <p>Worker profile: ${detail.user.workerProfile ? 'есть' : 'нет'}</p>
          <p>Уведомления: ${detail.notifications.length}</p>
          <p>Инциденты: ${detail.incidents.length}</p>
        </div>
      </div>
      ${renderDependencySummary(detail.user)}
      <div class="miniapp-tools-actions">
        ${detail.user.workerProfile ? `<button type="button" class="primary compact" data-trust-worker="${detail.user.workerProfile.id}">Сделать trusted_worker</button>` : ''}
        <button type="button" class="miniapp-tools-danger compact" data-admin-delete-user="${detail.user.id}">Удалить пользователя</button>
      </div>
    `;
  }

  function renderIncidents() {
    const node = document.getElementById('miniapp-admin-incidents');
    if (!node) {
      return;
    }
    node.innerHTML = `
      <div class="step-header">
        <div>
          <div class="step-badge">Incidents</div>
          <h2>Инциденты</h2>
        </div>
      </div>
      <div class="miniapp-tools-grid">
        ${state.incidents.map((incident) => `
          <div class="miniapp-tools-card">
            <p><strong>${escapeHtml(incident.type)}</strong></p>
            <p>Статус: ${escapeHtml(incident.status)}</p>
            <p>Смена: ${escapeHtml(incident.shiftId)}</p>
            <p>${escapeHtml(incident.description || 'Без описания')}</p>
            ${incident.status !== 'resolved'
              ? `<button type="button" class="ghost compact" data-resolve-incident="${incident.id}">Пометить решенным</button>`
              : ''}
          </div>
        `).join('') || '<p class="muted">Инцидентов пока нет.</p>'}
      </div>
    `;
  }

  async function loadDeveloperState() {
    if (!telegramId) {
      state.isDeveloper = false;
      return;
    }
    try {
      state.stats = await request(`/admin/stats?telegramId=${encodeURIComponent(telegramId)}`);
      state.isDeveloper = true;
    } catch (error) {
      state.isDeveloper = false;
      state.stats = null;
    }
  }

  async function loadUsers() {
    const params = new URLSearchParams({
      telegramId,
      page: String(state.userPage),
      pageSize: String(state.userPageSize),
    });
    if (state.userRole) {
      params.set('role', state.userRole);
    }
    if (state.userStatus) {
      params.set('status', state.userStatus);
    }
    if (state.userSearch) {
      params.set('search', state.userSearch);
    }
    const payload = await request(`/admin/users?${params.toString()}`);
    state.users = payload.items;
    state.userTotal = payload.total;
  }

  async function loadUserDetail(userId) {
    state.userDetail = await request(`/admin/users/${encodeURIComponent(userId)}?telegramId=${encodeURIComponent(telegramId)}`);
  }

  async function loadIncidents() {
    state.incidents = await request(`/admin/incidents?telegramId=${encodeURIComponent(telegramId)}`);
  }

  async function renderAdminMode() {
    renderAdminShell();
    if (!telegramId) {
      setRootContent(`
        <div class="app-shell">
          <div class="app-card">
            <section class="error-box">
              <h2>Developer Admin недоступен</h2>
              <p>Откройте раздел из Telegram Mini App, чтобы система увидела ваш Telegram ID.</p>
            </section>
          </div>
        </div>
      `);
      return;
    }
    try {
      await loadDeveloperState();
      if (!state.isDeveloper) {
        throw new Error('forbidden');
      }
      await Promise.all([loadUsers(), loadIncidents()]);
      renderStats();
      renderUsers();
      renderUserDetail();
      renderIncidents();
    } catch (error) {
      setRootContent(`
        <div class="app-shell">
          <div class="app-card">
            <section class="error-box">
              <h2>Developer Admin недоступен</h2>
              <p>У этого Telegram-аккаунта нет прав на developer admin section.</p>
            </section>
          </div>
        </div>
      `);
    }
  }

  async function handleBodyClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const openUserEl = target.closest('[data-open-user]');
    if (openUserEl?.dataset.openUser) {
      await loadUserDetail(openUserEl.dataset.openUser);
      renderUserDetail();
      return;
    }
    if (target.dataset.closeOverlay) {
      closeOverlay();
      return;
    }
    if (target.dataset.openAccount) {
      try {
        const account = await loadAccount();
        if (account) {
          renderAccountOverlay(account);
        }
      } catch (error) {
        alert(error.payload?.message || error.message || 'Не удалось открыть настройки аккаунта.');
      }
      return;
    }
    if (target.dataset.switchRole) {
      await switchRole(target.dataset.switchRole);
      return;
    }
    if (target.dataset.deleteAccount) {
      await deleteAccount();
      return;
    }
    if (target.dataset.openAdmin) {
      const url = new URL(window.location.href);
      url.searchParams.set('admin', '1');
      window.location.href = url.toString();
      return;
    }
    if (target.dataset.exitAdmin) {
      const url = new URL(window.location.href);
      url.searchParams.delete('admin');
      window.location.href = url.toString();
      return;
    }
    if (target.dataset.usersRefresh) {
      await loadUsers();
      renderUsers();
      return;
    }
    if (target.dataset.usersPage) {
      state.userPage += target.dataset.usersPage === 'next' ? 1 : -1;
      state.userPage = Math.max(state.userPage, 1);
      await loadUsers();
      renderUsers();
      return;
    }
    if (target.dataset.trustWorker) {
      await request(`/admin/workers/${encodeURIComponent(target.dataset.trustWorker)}/trust?telegramId=${encodeURIComponent(telegramId)}`, {
        method: 'POST',
      });
      alert('Работник отмечен как trusted_worker.');
      await loadUserDetail(state.userDetail.user.id);
      renderUserDetail();
      return;
    }
    if (target.dataset.resolveIncident) {
      await request(`/admin/incidents/${encodeURIComponent(target.dataset.resolveIncident)}/resolve?telegramId=${encodeURIComponent(telegramId)}`, {
        method: 'POST',
      });
      await loadIncidents();
      renderIncidents();
      return;
    }
    if (target.dataset.adminDeleteUser) {
      const userId = target.dataset.adminDeleteUser;
      if (!window.confirm('Удалить этого пользователя? Аккаунт будет анонимизирован. Действие возможно только если нет активных зависимостей (ПВЗ, смены, зоны, отклики и т.д.).')) {
        return;
      }
      try {
        await request(`/admin/users/${encodeURIComponent(userId)}?telegramId=${encodeURIComponent(telegramId)}`, { method: 'DELETE' });
        alert('Пользователь удалён.');
        state.userDetail = null;
        await loadUsers();
        renderUsers();
        renderUserDetail();
      } catch (err) {
        alert(err.payload?.message || err.message || 'Не удалось удалить.');
      }
    }
  }

  function handleInputChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.usersSearch) {
      state.userSearch = target.value.trim();
      state.userPage = 1;
    }
    if (target.dataset.usersRole) {
      state.userRole = target.value;
      state.userPage = 1;
    }
    if (target.dataset.usersStatus) {
      state.userStatus = target.value;
      state.userPage = 1;
    }
  }

  async function bootstrap() {
    tg?.ready?.();
    tg?.expand?.();
    setTimeout(injectTopAccountBar, 300);
    document.body.addEventListener('click', (event) => {
      void handleBodyClick(event);
    });
    document.body.addEventListener('change', handleInputChange);
    document.body.addEventListener('focusin', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return;
      }
      const type = (target.type || '').toLowerCase();
      if (type && !['text', 'tel', 'email', 'search'].includes(type)) {
        return;
      }
      if (!target.dataset.esOriginalValueSaved) {
        target.dataset.esOriginalValue = target.value;
        target.dataset.esOriginalValueSaved = '1';
      }
      target.dataset.esClearedOnFocus = '1';
      target.value = '';
    });
    document.body.addEventListener('focusout', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return;
      }
      if (target.dataset.esClearedOnFocus === '1' && !target.value && target.dataset.esOriginalValue !== undefined) {
        target.value = target.dataset.esOriginalValue;
      }
      target.dataset.esClearedOnFocus = '';
    });
    await loadDeveloperState();
    updateDeveloperButton();
    if (searchParams.get('admin') === '1') {
      await renderAdminMode();
      return;
    }
    if (searchParams.get('settings') === 'account') {
      try {
        const account = await loadAccount();
        if (account) {
          renderAccountOverlay(account);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  void bootstrap();
})();
