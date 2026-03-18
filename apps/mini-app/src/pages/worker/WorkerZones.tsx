import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

type WorkerZone = {
  id: string;
  label: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  preferredRate?: number | null;
  color: string;
  isActive: boolean;
};

type WorkerProfileResp = {
  id: string;
  city: string;
  expectedRate?: number | null;
  zones: WorkerZone[];
};

export function WorkerZones({ workerProfileId }: { workerProfileId: string }) {
  const [profile, setProfile] = useState<WorkerProfileResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    label: '',
    centerLat: '',
    centerLng: '',
    radiusKm: '',
    preferredRate: '',
    color: '#5f7cff',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get<WorkerProfileResp>(`/users/workers/${encodeURIComponent(workerProfileId)}`);
      setProfile(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить зону');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [workerProfileId]);

  const stats = useMemo(() => {
    const zones = profile?.zones ?? [];
    const active = zones.filter((z) => z.isActive).length;
    return { total: zones.length, active };
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.label.trim()) {
      setError('Укажите название/метку зоны.');
      return;
    }

    const centerLatNum = Number(form.centerLat);
    const centerLngNum = Number(form.centerLng);
    const radiusKmNum = Number(form.radiusKm);

    if (!Number.isFinite(centerLatNum) || !Number.isFinite(centerLngNum) || !Number.isFinite(radiusKmNum)) {
      setError('lat/lng/radiusKm должны быть числами.');
      return;
    }

    const preferredRateNum = form.preferredRate.trim() ? Number(form.preferredRate) : null;
    if (preferredRateNum != null && !Number.isFinite(preferredRateNum)) {
      setError('preferredRate должен быть числом или пустым.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users/worker-zones', {
        workerProfileId,
        label: form.label.trim(),
        centerLat: centerLatNum,
        centerLng: centerLngNum,
        radiusKm: radiusKmNum,
        preferredRate: preferredRateNum,
        color: form.color || undefined,
      });
      setForm({ label: '', centerLat: '', centerLng: '', radiusKm: '', preferredRate: '', color: '#5f7cff' });
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Ошибка создания зоны');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Зона работы</h2>
      <p className="muted">
        Активных зон: {stats.active}/{stats.total}. ПВЗ будут попадать в ваши уведомления, если расстояние до них в пределах радиуса.
      </p>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Добавить зону</h3>
        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Метка зоны</label>
          <input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Центр lat</label>
          <input value={form.centerLat} onChange={(e) => setForm((p) => ({ ...p, centerLat: e.target.value }))} placeholder="55.7558" required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Центр lng</label>
          <input value={form.centerLng} onChange={(e) => setForm((p) => ({ ...p, centerLng: e.target.value }))} placeholder="37.6173" required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Радиус (км)</label>
          <input value={form.radiusKm} onChange={(e) => setForm((p) => ({ ...p, radiusKm: e.target.value }))} placeholder="2.5" required />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Предпочтительная ставка (опционально)</label>
          <input value={form.preferredRate} onChange={(e) => setForm((p) => ({ ...p, preferredRate: e.target.value }))} placeholder="3500" inputMode="numeric" />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Цвет (опционально)</label>
          <input value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} placeholder="#5f7cff" />

          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

          <button type="submit" disabled={submitting} style={{ marginTop: 16, width: '100%' }}>
            {submitting ? 'Сохранение…' : 'Добавить зону'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Текущие зоны</h3>
        {loading ? (
          <p className="muted">Загрузка…</p>
        ) : !profile || profile.zones.length === 0 ? (
          <p className="muted">Зон пока нет.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {profile.zones.map((z) => (
              <li key={z.id} style={{ marginBottom: 10 }}>
                <strong>{z.label}</strong> <span className="muted">({z.radiusKm} км)</span>
                <div className="muted" style={{ fontSize: 13 }}>
                  центр: {z.centerLat.toFixed(6)}, {z.centerLng.toFixed(6)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

