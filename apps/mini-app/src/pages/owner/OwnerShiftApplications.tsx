import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type Shift, type ShiftApplication } from '../../api/client';

export function OwnerShiftApplications({ ownerId }: { ownerId: string }) {
  const { shiftId } = useParams<{ shiftId: string }>();
  const [shift, setShift] = useState<Shift | null>(null);
  const [applications, setApplications] = useState<ShiftApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!shiftId) return;
    Promise.all([
      api.get<Shift>(`/shifts/${shiftId}`),
      api.get<ShiftApplication[]>(`/shifts/${shiftId}/applications`),
    ])
      .then(([s, a]) => {
        setShift(s);
        setApplications(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shiftId]);

  const handleAssign = async (applicationId: string, workerId: string, agreedRate: number) => {
    setAssigningId(applicationId);
    setError(null);
    try {
      await api.post(`/shifts/${shiftId}/assign`, {
        applicationId,
        workerId,
        agreedRate,
      });
      setApplications((prev) => prev.filter((a) => a.id !== applicationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка назначения');
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) return <div className="card">Загрузка откликов…</div>;
  if (error || !shift) return <div className="card error">{error || 'Смена не найдена'}</div>;

  const agreedRate = shift.baseRate;

  return (
    <div>
      <Link to="/owner" className="muted" style={{ display: 'block', marginBottom: 12 }}>← К списку смен</Link>
      <h2>Кто откликнулся</h2>
      <p className="muted">{shift.title}. Выберите одного — ему придёт уведомление с вашим контактом, остальным — что место занято.</p>

      {applications.length === 0 ? (
        <div className="card">
          <p>Пока никого нет. Работники в зоне этого ПВЗ получат уведомление и смогут откликнуться.</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Рейтинг</th>
                <th>Смен</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.workerProfile?.user?.fullName ?? '—'}</td>
                  <td>{app.workerProfile?.rating != null ? app.workerProfile.rating.toFixed(1) : '—'}</td>
                  <td>{app.workerProfile?.completedShiftsCount ?? 0}</td>
                  <td>
                    <button
                      onClick={() => handleAssign(app.id, app.workerId, agreedRate)}
                      disabled={!!assigningId}
                    >
                      {assigningId === app.id ? '…' : 'Выбрать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
    </div>
  );
}
