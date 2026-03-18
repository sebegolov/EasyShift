import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, UserMe } from './api/client';
import { OwnerLayout, OwnerShifts, OwnerCreateShift, OwnerShiftApplications } from './pages/owner';
import { WorkerShifts, WorkerApply } from './pages/worker';
import { RoleSelect } from './pages/RoleSelect';
import { AccountScreen } from './pages/AccountScreen';

function AccountCornerButton() {
  const navigate = useNavigate();
  return (
    <div className="account-corner">
      <button className="account-corner-btn" onClick={() => navigate('/account?openAccount=1')}>
        Аккаунт
      </button>
    </div>
  );
}

function WantsAccountFromUrl() {
  const { search } = useLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(search);
    return sp.get('openAccount') === '1';
  }, [search]);
}

function AccountRouteGuard({ user, refreshUser }: { user: UserMe; refreshUser: () => Promise<void> }) {
  const wantsAccount = WantsAccountFromUrl();
  if (!wantsAccount) {
    return <Navigate to="/" replace />;
  }
  return <AccountScreen user={user} refreshUser={refreshUser} />;
}

function DebugBanner() {
  const loc = useLocation();
  const sp = new URLSearchParams(loc.search);
  const debug = sp.get('debug') === '1';
  if (!debug) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: 12,
        padding: '8px 10px',
      }}
    >
      <div>pathname: {loc.pathname}</div>
      <div>search: {loc.search}</div>
      <div>url: {loc.pathname + loc.search}</div>
    </div>
  );
}

function Start({ user, refreshUser }: { user: UserMe; refreshUser: () => Promise<void> }) {
  const sp = new URLSearchParams(window.location.search);
  const wantsAccount = sp.get('openAccount') === '1';
  if (wantsAccount) {
    return <Navigate to="/account" replace />;
  }

  // draft/new: роль не выбрана (в бэкенде это может быть `draft`/другое значение).
  if (user.role !== 'owner' && user.role !== 'worker') {
    return <RoleSelect user={user} refreshUser={refreshUser} />;
  }

  if (user.role === 'owner' && !user.ownerProfile) {
    return <Navigate to="/account" replace />;
  }
  if (user.role === 'worker' && !user.workerProfile) {
    return <Navigate to="/account" replace />;
  }

  // existing: сразу на функционал по роли.
  if (user.role === 'owner') {
    return <Navigate to="/owner" replace />;
  }
  if (user.role === 'worker') {
    return <Navigate to="/worker" replace />;
  }

  return <Navigate to="/" replace />;
}

function App() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isDevAdmin, setIsDevAdmin] = useState(false);

  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string; initDataUnsafe?: { user?: { id: number } } } } }).Telegram?.WebApp;
    const id = tg?.initDataUnsafe?.user?.id ?? null;
    if (id != null) setTelegramId(String(id));
  }, []);

  useEffect(() => {
    if (!telegramId) {
      setLoading(false);
      return;
    }
    api
      .get<UserMe>(`/users/me?telegramId=${encodeURIComponent(telegramId)}`)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [telegramId]);

  const refreshUser = async () => {
    if (!telegramId) return;
    try {
      const u = await api.get<UserMe>(`/users/me?telegramId=${encodeURIComponent(telegramId)}`);
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    if (!user?.telegramId) {
      setIsDevAdmin(false);
      return;
    }

    // Простейшая проверка на developer access: если /admin/stats доступен — показываем админ UI.
    api
      .get(`/admin/stats?telegramId=${encodeURIComponent(String(user.telegramId))}`)
      .then(() => setIsDevAdmin(true))
      .catch(() => setIsDevAdmin(false));
  }, [user]);

  useEffect(() => {
    if (isDevAdmin) return;

    // На случай, если "admin panel" приходит из вшитого (старого) miniapp-tools, прячем элементы по эвристике.
    const hideBySelectors = [
      '.miniapp-tools-launchers',
      '[class*="miniapp-tools"]',
      '[data-admin]',
      '[data-dev-admin]',
    ];
    hideBySelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
    });

    const nodes = Array.from(document.querySelectorAll('a, button'));
    nodes.forEach((el) => {
      const text = (el as HTMLElement).innerText || el.textContent || '';
      if (/dev(er)?\s*admin|админ|админ\s*панел/i.test(text)) {
        (el as HTMLElement).style.display = 'none';
      }
    });
  }, [isDevAdmin]);

  if (loading) return <div className="card">Загрузка…</div>;
  if (!user) {
    return (
      <div className="card">
        <p>Войдите через Telegram (кнопка «Открыть» в боте).</p>
      </div>
    );
  }

  const ownerId = user.ownerProfile?.id;
  const workerId = user.workerProfile?.id;

  return (
    <BrowserRouter>
      <DebugBanner />
      <AccountCornerButton />
      <Routes>
        <Route path="/" element={<Start user={user} refreshUser={refreshUser} />} />
        <Route
          path="/account"
          element={<AccountRouteGuard user={user} refreshUser={refreshUser} />}
        />
        <Route path="/owner" element={<OwnerLayout user={user} />}>
          <Route index element={<OwnerShifts ownerId={ownerId!} />} />
          <Route path="create-shift" element={<OwnerCreateShift ownerId={ownerId!} />} />
          <Route path="shifts/:shiftId/applications" element={<OwnerShiftApplications ownerId={ownerId!} />} />
        </Route>
        <Route path="/worker" element={workerId ? <WorkerShifts workerId={workerId} userId={user.id} /> : <Navigate to="/" replace />} />
        <Route path="/worker/apply/:shiftId" element={workerId ? <WorkerApply workerId={workerId} /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
