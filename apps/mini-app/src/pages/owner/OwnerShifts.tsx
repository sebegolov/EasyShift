import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Shift } from '../../api/client';

export function OwnerShifts({ ownerId }: { ownerId: string }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Shift[]>(`/shifts/owner/${encodeURIComponent(ownerId)}`)
      .then(setShifts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ownerId]);

  if (loading) return <div className="card">Загрузка смен…</div>;
  if (error) return <div className="card error">{error}</div>;

  const collecting = shifts.filter((s) => s.status === 'collecting_responses');
  const others = shifts.filter((s) => s.status !== 'collecting_responses');

  return (
    <div>
      <h2>Мои смены</h2>
      <p className="muted">Создайте смену по ПВЗ и опубликуйте — работникам в зоне придёт уведомление. Затем смотрите отклики и выберите одного.</p>

      {collecting.length > 0 && (
        <div className="card">
          <h3>Сбор откликов</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {collecting.map((s) => (
              <li key={s.id} style={{ marginBottom: 12 }}>
                <strong>{s.title}</strong> — {new Date(s.startAt).toLocaleString('ru')}, {s.baseRate} {s.currency}
                <br />
                <Link to={`/owner/shifts/${s.id}/applications`}>
                  <button className="secondary" style={{ marginTop: 6 }}>Кто откликнулся</button>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {others.length > 0 && (
        <div className="card">
          <h3>Остальные смены</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {others.map((s) => (
              <li key={s.id} style={{ marginBottom: 8 }}>
                <strong>{s.title}</strong> — {s.status}, {new Date(s.startAt).toLocaleString('ru')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {shifts.length === 0 && (
        <div className="card">
          <p>Нет смен. Создайте смену и опубликуйте, чтобы запросить работников.</p>
          <Link to="/owner/create-shift"><button>Запросить работника</button></Link>
        </div>
      )}
    </div>
  );
}
