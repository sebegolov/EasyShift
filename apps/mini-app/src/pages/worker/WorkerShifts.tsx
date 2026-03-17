import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ShiftApplication, type NotificationEvent } from '../../api/client';

export function WorkerShifts({ workerId, userId }: { workerId: string; userId: string }) {
  const [applications, setApplications] = useState<ShiftApplication[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const load = () => {
    Promise.all([
      api.get<ShiftApplication[]>(`/shifts/applications/by-worker/${encodeURIComponent(workerId)}`),
      api.get<NotificationEvent[]>(`/notifications/history/${encodeURIComponent(userId)}`),
    ])
      .then(([apps, evts]) => {
        setApplications(apps);
        setNotifications(evts.slice(0, 30));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [workerId, userId]);

  const handleWithdraw = async (shiftId: string, applicationId: string) => {
    setWithdrawingId(applicationId);
    try {
      await api.post(`/shifts/${shiftId}/applications/${applicationId}/withdraw`, { workerId });
      setApplications((prev) => prev.filter((a) => a.id !== applicationId));
    } finally {
      setWithdrawingId(null);
    }
  };

  if (loading) return <div className="card">Загрузка…</div>;

  const shiftPublished = notifications.filter((n) => n.eventType === 'shift_published');
  const assigned = notifications.filter((n) => n.eventType === 'shift_assigned');
  const slotTaken = notifications.filter((n) => n.eventType === 'shift_slot_taken');

  return (
    <div>
      <h2>Меню работника</h2>

      <div className="card">
        <h3>Мои отклики</h3>
        {applications.length === 0 ? (
          <p className="muted">Нет активных откликов. Когда вам придёт уведомление о смене в вашей зоне, можно откликнуться.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {applications.map((app) => (
              <li key={app.id} style={{ marginBottom: 12 }}>
                {app.shift && (
                  <>
                    <strong>{app.shift.title}</strong> — {new Date(app.shift.startAt).toLocaleString('ru')}, {app.shift.baseRate} {app.shift.currency}
                    <br />
                    <button
                      className="secondary"
                      style={{ marginTop: 6 }}
                      onClick={() => app.shift && handleWithdraw(app.shift.id, app.id)}
                      disabled={!!withdrawingId}
                    >
                      {withdrawingId === app.id ? '…' : 'Снять отклик'}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Уведомления</h3>
        <p className="muted">Смены в вашей зоне — откройте и нажмите «Откликнуться».</p>
        {shiftPublished.length === 0 && assigned.length === 0 && slotTaken.length === 0 ? (
          <p className="muted">Пока нет уведомлений.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {shiftPublished.slice(0, 10).map((n) => (
              <li key={n.id} style={{ marginBottom: 8 }}>
                {n.payload?.shiftId && (
                  <Link to={`/worker/apply/${n.payload.shiftId}`}>
                    <button className="secondary">Смена — откликнуться</button>
                  </Link>
                )}
              </li>
            ))}
            {assigned.slice(0, 5).map((n) => (
              <li key={n.id} className="muted" style={{ marginBottom: 4 }}>
                Вас выбрали на смену (в уведомлении контакт работодателя).
              </li>
            ))}
            {slotTaken.slice(0, 5).map((n) => (
              <li key={n.id} className="muted" style={{ marginBottom: 4 }}>
                Место по смене занято.
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link to="/">На главную</Link>
    </div>
  );
}
