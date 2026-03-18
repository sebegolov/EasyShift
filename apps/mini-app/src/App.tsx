import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api, UserMe } from './api/client';
import { OwnerLayout, OwnerShifts, OwnerCreateShift, OwnerShiftApplications } from './pages/owner';
import { WorkerShifts, WorkerApply } from './pages/worker';
import { Home } from './pages/Home';

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
      <Routes>
        <Route path="/" element={<Home user={user} />} />
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
