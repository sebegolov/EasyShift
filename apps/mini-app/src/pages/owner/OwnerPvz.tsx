import { useEffect, useState } from 'react';
import { api, type PVZ } from '../../api/client';

type CreatePvzState = {
  title: string;
  address: string;
  city: string;
  lat: string;
  lng: string;
  requirements: string;
};

export function OwnerPvz({ ownerId }: { ownerId: string }) {
  const [pvzList, setPvzList] = useState<PVZ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreatePvzState>({
    title: '',
    address: '',
    city: '',
    lat: '',
    lng: '',
    requirements: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<PVZ[]>(`/pvz?ownerId=${encodeURIComponent(ownerId)}`);
      setPvzList(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить ПВЗ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [ownerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.address.trim() || !form.city.trim()) {
      setError('Заполните название, адрес и город.');
      return;
    }

    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError('Координаты lat/lng должны быть числами.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/pvz', {
        ownerId,
        title: form.title.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        lat: latNum,
        lng: lngNum,
        requirements: form.requirements.trim() ? form.requirements.trim() : undefined,
      });
      setForm({ title: '', address: '', city: '', lat: '', lng: '', requirements: '' });
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Ошибка создания ПВЗ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>ПВЗ</h2>
      <p className="muted">Добавьте адреса точек, по которым можно создавать смены.</p>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Добавить ПВЗ</h3>
        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Название</label>
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Адрес</label>
          <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Город</label>
          <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Широта (lat)</label>
          <input value={form.lat} onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))} placeholder="Напр. 55.7558" required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Долгота (lng)</label>
          <input value={form.lng} onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))} placeholder="Напр. 37.6173" required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Требования (опционально)</label>
          <textarea
            value={form.requirements}
            onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))}
            placeholder="Например: опыт/документы/форма"
            rows={2}
          />

          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

          <button type="submit" disabled={submitting} style={{ marginTop: 16, width: '100%' }}>
            {submitting ? 'Сохранение…' : 'Добавить ПВЗ'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Список ПВЗ</h3>
        {loading ? (
          <p className="muted">Загрузка…</p>
        ) : pvzList.length === 0 ? (
          <p className="muted">Пока нет ПВЗ.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pvzList.map((p) => (
              <li key={p.id} style={{ marginBottom: 10 }}>
                <strong>{p.title}</strong>
                <div className="muted" style={{ fontSize: 13 }}>{p.address}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

