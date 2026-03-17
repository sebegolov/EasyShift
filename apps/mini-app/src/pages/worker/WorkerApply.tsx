import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Shift } from '../../api/client';

export function WorkerApply({ workerId }: { workerId: string }) {
  const { shiftId } = useParams<{ shiftId: string }>();
  const navigate = useNavigate();
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shiftId) return;
    api
      .get<Shift>(`/shifts/${shiftId}`)
      .then(setShift)
      .catch(() => setShift(null))
      .finally(() => setLoading(false));
  }, [shiftId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/shifts/${shiftId}/applications`, {
        workerId,
      });
      navigate('/worker');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить отклик');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="card">Загрузка смены…</div>;
  if (!shift) return <div className="card error">Смена не найдена.</div>;
  if (shift.status !== 'collecting_responses') {
    return (
      <div className="card">
        <p className="muted">На эту смену больше нельзя откликнуться.</p>
        <button className="secondary" onClick={() => navigate('/worker')}>В меню работника</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Откликнуться на смену</h2>
      <div className="card">
        <p><strong>{shift.title}</strong></p>
        <p className="muted">
          {new Date(shift.startAt).toLocaleString('ru')} — {new Date(shift.endAt).toLocaleString('ru')}
        </p>
        <p>{shift.baseRate} {shift.currency}</p>
        {shift.description && <p>{shift.description}</p>}
      </div>
      <form onSubmit={handleApply} className="card">
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Отправка…' : 'Откликнуться'}
        </button>
      </form>
      <button className="secondary" onClick={() => navigate('/worker')}>Отмена</button>
    </div>
  );
}
