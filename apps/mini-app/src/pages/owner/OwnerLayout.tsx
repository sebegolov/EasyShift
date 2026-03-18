import { Outlet, Link } from 'react-router-dom';
import type { UserMe } from '../../api/client';

export function OwnerLayout({ user }: { user: UserMe }) {
  if (user.role !== 'owner' || !user.ownerProfile) {
    return (
      <div className="card">
        <p className="error">Нужен активный профиль работодателя.</p>
        <Link to="/">На главную</Link>
      </div>
    );
  }
  return (
    <div>
      <nav style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Link to="/owner">Мои смены</Link>
        <Link to="/owner/pvz">ПВЗ</Link>
        <Link to="/owner/create-shift">Запросить работника</Link>
        <Link to="/">Главная</Link>
      </nav>
      <Outlet />
    </div>
  );
}
