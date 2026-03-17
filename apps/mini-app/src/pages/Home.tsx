import { Link } from 'react-router-dom';
import type { UserMe } from '../api/client';

export function Home({ user }: { user: UserMe }) {
  const isOwner = user.role === 'owner' && user.ownerProfile;
  const isWorker = user.role === 'worker' && user.workerProfile;

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>EasyShift</h1>
      {isOwner && (
        <div className="card">
          <p><strong>Меню работодателя</strong></p>
          <p className="muted">Запросить работника на ПВЗ, смотреть отклики, назначать смену.</p>
          <Link to="/owner">
            <button style={{ marginTop: 12 }}>Открыть меню работодателя</button>
          </Link>
        </div>
      )}
      {isWorker && (
        <div className="card">
          <p><strong>Меню работника</strong></p>
          <p className="muted">Отклики на смены, снять отклик.</p>
          <Link to="/worker">
            <button style={{ marginTop: 12 }}>Открыть меню работника</button>
          </Link>
        </div>
      )}
      {!isOwner && !isWorker && (
        <div className="card">
          <p className="muted">Выберите роль в боте (работодатель или работник) и заполните профиль.</p>
        </div>
      )}
    </div>
  );
}
