import { useEffect, useState } from 'react';
import { api, type PVZ } from '../../api/client';

type CreatePvzState = {
  title: string;
  address: string;
  city: string;
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
    requirements: '',
  });
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resolveAddressCoords = async (): Promise<{ lat: number; lng: number }> => {
    const query = `${form.address.trim()}, ${form.city.trim()}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error('Не удалось получить координаты адреса');
    }
    const items = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!items.length) {
      throw new Error('Не удалось определить координаты по адресу. Уточните адрес.');
    }
    const lat = Number(items[0].lat);
    const lng = Number(items[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Не удалось определить координаты по адресу.');
    }
    return { lat, lng };
  };

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

    setSubmitting(true);
    try {
      const coords = await resolveAddressCoords();
      setResolvedCoords(coords);
      await api.post('/pvz', {
        ownerId,
        title: form.title.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        lat: coords.lat,
        lng: coords.lng,
        requirements: form.requirements.trim() ? form.requirements.trim() : undefined,
      });
      setForm({ title: '', address: '', city: '', requirements: '' });
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

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Требования (опционально)</label>
          <textarea
            value={form.requirements}
            onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))}
            placeholder="Например: опыт/документы/форма"
            rows={2}
          />

          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
          {resolvedCoords && (
            <p className="muted" style={{ marginTop: 12 }}>
              Координаты определены автоматически: {resolvedCoords.lat.toFixed(6)}, {resolvedCoords.lng.toFixed(6)}
            </p>
          )}

          <button type="submit" disabled={submitting} style={{ marginTop: 16, width: '100%' }}>
            {submitting ? 'Определяем адрес и сохраняем…' : 'Добавить ПВЗ'}
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

