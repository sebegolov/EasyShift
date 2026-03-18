import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type TargetRole, type UserMe } from '../api/client';
import { RoleSelect } from './RoleSelect';

function normalizePhoneInput(raw: string) {
  return raw.replace(/[^\d+]/g, '').trim();
}

export function AccountScreen({ user, refreshUser }: { user: UserMe; refreshUser: () => Promise<void> }) {
  const navigate = useNavigate();
  const role = user.role;
  const isOwner = role === 'owner';
  const isWorker = role === 'worker';

  const [savingProfile, setSavingProfile] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ownerInitial = useMemo(() => {
    return {
      companyName: user.ownerProfile?.companyName ?? '',
      contactName: user.ownerProfile?.contactName ?? user.fullName ?? '',
      contactPhone: user.ownerProfile?.contactPhone ?? user.phone ?? '',
    };
  }, [user]);

  const workerInitial = useMemo(() => {
    return {
      city: user.workerProfile?.city ?? '',
      expectedRate: user.workerProfile?.expectedRate != null ? String(user.workerProfile.expectedRate) : '',
      experienceSummary: '',
    };
  }, [user]);

  const [companyName, setCompanyName] = useState(ownerInitial.companyName);
  const [contactName, setContactName] = useState(ownerInitial.contactName);
  const [contactPhone, setContactPhone] = useState(ownerInitial.contactPhone);

  const [city, setCity] = useState(workerInitial.city);
  const [expectedRate, setExpectedRate] = useState(workerInitial.expectedRate);
  const [experienceSummary, setExperienceSummary] = useState(workerInitial.experienceSummary);

  useEffect(() => {
    setError(null);
    setSuccess(null);

    if (isOwner) {
      setCompanyName(ownerInitial.companyName);
      setContactName(ownerInitial.contactName);
      setContactPhone(ownerInitial.contactPhone);
    }
    if (isWorker) {
      setCity(workerInitial.city);
      setExpectedRate(workerInitial.expectedRate);
      setExperienceSummary(workerInitial.experienceSummary);
    }
  }, [isOwner, isWorker, ownerInitial, workerInitial]);

  const profileCompletionText = useMemo(() => {
    if (isOwner) return user.ownerProfile ? 'Профиль работодателя заполнен' : 'Профиль работодателя не заполнен';
    if (isWorker) return user.workerProfile ? 'Профиль работника заполнен' : 'Профиль работника не заполнен';
    return 'Роль не выбрана';
  }, [isOwner, isWorker, user.ownerProfile, user.workerProfile]);

  const handleSwitchRole = async (targetRole: TargetRole) => {
    setError(null);
    setSuccess(null);
    setSwitchingRole(true);
    try {
      await api.switchRole({ userId: user.id, targetRole });
      await refreshUser();
      setSuccess('Роль обновлена. Заполните профиль.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось переключить роль');
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleSaveOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const contactNameTrim = contactName.trim();
    const contactPhoneTrim = normalizePhoneInput(contactPhone);
    const companyNameTrim = companyName.trim();

    if (!contactNameTrim) {
      setError('Введите имя/контактное лицо.');
      return;
    }
    if (!contactPhoneTrim) {
      setError('Введите телефон.');
      return;
    }

    setSavingProfile(true);
    try {
      await api.upsertOwnerProfile({
        userId: user.id,
        contactName: contactNameTrim,
        contactPhone: contactPhoneTrim,
        companyName: companyNameTrim ? companyNameTrim : undefined,
      });
      await refreshUser();
      setSuccess('Профиль сохранён.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить профиль');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveWorkerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cityTrim = city.trim();
    const expectedRateTrim = expectedRate.trim();
    const parsedExpectedRate = expectedRateTrim === '' ? null : Number(expectedRateTrim);

    if (!cityTrim) {
      setError('Введите город.');
      return;
    }
    if (expectedRateTrim !== '' && Number.isNaN(parsedExpectedRate)) {
      setError('Ожидаемая ставка должна быть числом или оставьте поле пустым.');
      return;
    }

    setSavingProfile(true);
    try {
      await api.upsertWorkerProfile({
        userId: user.id,
        city: cityTrim,
        expectedRate: parsedExpectedRate,
        experienceSummary: experienceSummary.trim() ? experienceSummary.trim() : undefined,
      });
      await refreshUser();
      setSuccess('Профиль сохранён.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить профиль');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setSuccess(null);
    if (!user.id) return;
    const ok = window.confirm('Удалить аккаунт? Это действие нельзя отменить.');
    if (!ok) return;

    setDeleting(true);
    try {
      await api.deleteAccount({
        userId: user.id,
        telegramId: user.telegramId,
      });
      // Пользователь может стать недоступным для поиска по telegramId.
      await refreshUser();
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить аккаунт');
    } finally {
      setDeleting(false);
    }
  };

  // Если пользователь еще не выбрал роль (role != owner/worker), показываем выбор роли прямо на экране "Аккаунт".
  if (!isOwner && !isWorker) {
    return <RoleSelect user={user} refreshUser={refreshUser} />;
  }

  const canSwitch = switchingRole || deleting || savingProfile;
  const nextRole: TargetRole = isOwner ? 'worker' : 'owner';

  return (
    <div>
      <h2>Аккаунт</h2>
      <p className="muted">{profileCompletionText}</p>

      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      {success && <p className="muted" style={{ marginTop: 12 }}>{success}</p>}

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Данные профиля</h3>
        {isOwner && (
          <form onSubmit={handleSaveOwnerProfile}>
            <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Компания (необязательно)</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Например: ООО Ромашка" />

            <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Имя / контактное лицо</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Как к вам обращаться" required />

            <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Телефон</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+7…" required />

            <button type="submit" disabled={savingProfile} style={{ marginTop: 16 }}>
              {savingProfile ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        )}

        {isWorker && (
          <form onSubmit={handleSaveWorkerProfile}>
            <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Город</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Например: Москва" required />

            <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Ожидаемая ставка (необязательно)</label>
            <input
              value={expectedRate}
              onChange={(e) => setExpectedRate(e.target.value)}
              placeholder="Например: 3500"
              inputMode="numeric"
            />

            <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>Опыт (опционально)</label>
            <textarea
              value={experienceSummary}
              onChange={(e) => setExperienceSummary(e.target.value)}
              rows={3}
              placeholder="Коротко о себе (может пригодиться при первоначальной настройке)"
            />

            <button type="submit" disabled={savingProfile} style={{ marginTop: 16 }}>
              {savingProfile ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Смена роли</h3>
        <p className="muted">
          При смене роли старые данные роли могут быть очищены, если нет связанных зависимостей.
        </p>
        <button className="secondary" disabled={canSwitch} onClick={() => handleSwitchRole(nextRole)} style={{ width: '100%', marginTop: 12 }}>
          Переключить на {nextRole === 'owner' ? 'работодателя' : 'работника'}
        </button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Удаление аккаунта</h3>
        <button
          disabled={deleting}
          onClick={handleDeleteAccount}
          style={{
            width: '100%',
            marginTop: 12,
            background: '#ff453a',
            color: '#ffffff',
          }}
        >
          {deleting ? 'Удаляем…' : 'Удалить аккаунт'}
        </button>
      </div>
    </div>
  );
}

