import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type PVZ } from '../../api/client';

export function OwnerCreateShift({ ownerId }: { ownerId: string }) {
  const navigate = useNavigate();
  const [pvzList, setPvzList] = useState<PVZ[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pvzId, setPvzId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [baseRate, setBaseRate] = useState('');

  useEffect(() => {
    api
      .get<PVZ[]>(`/pvz?ownerId=${encodeURIComponent(ownerId)}`)
      .then(setPvzList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ownerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pvzId || !title || !startAt || !endAt || !baseRate) {
      setError('Заполните ПВЗ, название, даты и ставку.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const shift = await api.post<{ id: string }>('/shifts', {
        pvzId,
        ownerId,
        title,
        description: description || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        baseRate: Number(baseRate),
        currency: 'RUB',
      });
      await api.post(`/shifts/${shift.id}/publish`, {});
      navigate('/owner');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания смены');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="card">Загрузка ПВЗ…</div>;
  if (pvzList.length === 0) return <div className="card">Сначала добавьте ПВЗ (через бота или админку).</div>;

  return (
    <div>
      <h2>Запросить работника</h2>
      <p className="muted">Выберите ПВЗ и параметры смены. После публикации работникам в зоне придёт уведомление.</p>

      <form onSubmit={handleSubmit} className="card">
        <label style={{ display: 'block', marginBottom: 8 }}>ПВЗ</label>
        <select value={pvzId} onChange={(e) => setPvzId(e.target.value)} required>
          <option value="">— выбрать —</option>
          {pvzList.map((p) => (
            <option key={p.id} value={p.id}>{p.title} — {p.address}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Название смены</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Выдача заказов" required />

        <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Описание (необязательно)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Начало</label>
        <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />

        <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Окончание</label>
        <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />

        <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Ставка (₽)</label>
        <input type="number" min="0" step="100" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} required />

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? 'Создаём и публикуем…' : 'Создать и опубликовать'}
        </button>
      </form>
    </div>
  );
}
