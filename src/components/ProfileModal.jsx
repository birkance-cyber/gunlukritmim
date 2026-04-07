import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export function ProfileModal({ user, profile, isDarkMode, onClose, onSave, onDelete }) {
  const [name, setName] = useState(profile?.name || '')
  const [email, setEmail] = useState(profile?.email || user?.email || '')
  const [password, setPassword] = useState('')
  const [weekdayPeriods, setWeekdayPeriods] = useState(
    profile?.weekdayPeriods || { morning: 120, evening: 180 },
  )
  const [weekendPeriods, setWeekendPeriods] = useState(
    profile?.weekendPeriods || { morning: 180, evening: 240 },
  )
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const isAnonymous = Boolean(user?.is_anonymous || profile?.isAnonymous)

  const handleSave = async () => {
    setError('')
    setLoading(true)
    try {
      await onSave({ name, email, password, weekdayPeriods, weekendPeriods })
      onClose()
    } catch (err) {
      setError(err.message || 'Profil güncellenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Hesabını silmek istediğine emin misin? Tüm aktivite ve günlük kayıtların kaldırılacak.',
    )
    if (!confirmed) return

    setError('')
    setDeleting(true)
    try {
      await onDelete()
    } catch (err) {
      setError(err.message || 'Hesap silme sırasında bir hata oluştu.')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-stone-950/65 p-0 backdrop-blur-md md:items-center md:p-4">
      <div
        className={`w-full max-w-2xl rounded-t-[2rem] border shadow-2xl md:rounded-[2.2rem] ${
          isDarkMode ? 'border-stone-800 bg-[#171717]' : 'border-rose-100 bg-white'
        }`}
      >
        <div
          className={`flex items-start justify-between gap-4 border-b px-4 py-4 md:px-6 md:py-5 ${
            isDarkMode ? 'border-stone-800' : 'border-rose-100'
          }`}
        >
          <div>
            <h3 className={`text-lg font-semibold md:text-xl ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
              Profil Ayarları
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              İsim, giriş bilgileri ve serbest zaman sürelerini güncelleyebilirsin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-2 ${
              isDarkMode ? 'text-stone-400 hover:bg-stone-800' : 'text-stone-400 hover:bg-stone-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-5 overflow-y-auto px-4 py-4 md:max-h-none md:space-y-6 md:px-6 md:py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="İsim">
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClasses(isDarkMode)} />
            </Field>
            <Field label="E-posta">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isAnonymous}
                className={`${inputClasses(isDarkMode)} ${isAnonymous ? 'cursor-not-allowed opacity-60' : ''}`}
              />
            </Field>
          </div>

          <Field label="Yeni Şifre">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isAnonymous ? 'Misafir modda şifre değiştirilemez' : 'Boş bırakırsan değişmez'}
              disabled={isAnonymous}
              className={`${inputClasses(isDarkMode)} ${isAnonymous ? 'cursor-not-allowed opacity-60' : ''}`}
            />
          </Field>

          {isAnonymous && (
            <p className="text-sm leading-6 text-amber-500">
              Misafir modunda e-posta ve şifre değiştirilemez. Önce üst banttaki “Üye ol” bağlantısını kullan.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <PeriodCard title="Hafta İçi" state={weekdayPeriods} setState={setWeekdayPeriods} isDarkMode={isDarkMode} />
            <PeriodCard title="Hafta Sonu" state={weekendPeriods} setState={setWeekendPeriods} isDarkMode={isDarkMode} />
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between md:pt-5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1.1rem] border border-rose-200 px-4 py-3 font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 md:w-auto md:rounded-[1.25rem]"
            >
              <AlertTriangle size={16} />
              {deleting ? 'Siliniyor...' : 'Hesabımı Sil'}
            </button>

            <div className="grid grid-cols-2 gap-3 md:flex">
              <button
                type="button"
                onClick={onClose}
                className={`rounded-[1.1rem] px-4 py-3 font-semibold md:rounded-[1.25rem] ${
                  isDarkMode ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'
                }`}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || deleting}
                className="rounded-[1.1rem] bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60 md:rounded-[1.25rem]"
              >
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PeriodCard({ title, state, setState, isDarkMode }) {
  return (
    <div
      className={`rounded-[1.35rem] border p-4 md:rounded-[1.5rem] ${
        isDarkMode ? 'border-stone-700 bg-stone-800/60' : 'border-rose-100 bg-rose-50/50'
      }`}
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-rose-500">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sabah">
          <input
            type="number"
            value={state.morning}
            onChange={(event) => setState({ ...state, morning: parseInt(event.target.value, 10) || 0 })}
            className={inputClasses(isDarkMode)}
          />
        </Field>
        <Field label="Akşam">
          <input
            type="number"
            value={state.evening}
            onChange={(event) => setState({ ...state, evening: parseInt(event.target.value, 10) || 0 })}
            className={inputClasses(isDarkMode)}
          />
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-stone-500">{label}</label>
      {children}
    </div>
  )
}

function inputClasses(isDarkMode) {
  return `w-full rounded-2xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-rose-500/20 ${
    isDarkMode ? 'border-stone-700 bg-stone-800 text-white' : 'border-stone-200 bg-white text-stone-800'
  }`
}
