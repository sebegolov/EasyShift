import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type TargetRole, type UserMe } from '../api/client';

export function RoleSelect({ user, refreshUser }: { user: UserMe; refreshUser: () => Promise<void> }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickRole = async (targetRole: TargetRole) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.switchRole({
        userId: user.id,
        targetRole,
      });
      await refreshUser();
      navigate('/account?openAccount=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выбрать роль');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Выбор роли</h2>
      <div className="card">
        <p className="muted">Выберите, кем вы хотите быть в EasyShift. Дальше заполним профиль.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button disabled={submitting} style={{ flex: 1 }} onClick={() => pickRole('owner')}>
            Работодатель
          </button>
          <button className="secondary" disabled={submitting} style={{ flex: 1 }} onClick={() => pickRole('worker')}>
            Работник
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

