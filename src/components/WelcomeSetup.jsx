import { useMemo, useState } from 'react'
import { Zap } from 'lucide-react'

export function WelcomeSetup({ user, onComplete, isDarkMode }) {
  const suggestedName = useMemo(() => {
    const rawName =
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.display_name ||
      ''

    const trimmed = rawName.trim()
    if (!trimmed) return 'Gezgin'
    return trimmed
  }, [user])

  const startsWithKnownName = Boolean(
    !user?.is_anonymous &&
      user &&
      (user?.user_metadata?.name || user?.user_metadata?.full_name || user?.user_metadata?.display_name),
  )

  const [name, setName] = useState(suggestedName)
  const [step, setStep] = useState(startsWithKnownName ? 2 : 1)
  const [weekdayPeriods, setWeekdayPeriods] = useState({ morning: 120, evening: 180 })
  const [weekendPeriods, setWeekendPeriods] = useState({ morning: 180, evening: 240 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleComplete = async () => {
    setError('')
    setLoading(true)
    try {
      await onComplete({ name, weekdayPeriods, weekendPeriods })
    } catch (err) {
      setError(err.message || 'Kurulum kaydedilirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`flex min-h-screen items-center justify-center p-5 sm:p-6 ${
        isDarkMode ? 'bg-[#121212]' : 'bg-[#FDF8F8]'
      }`}
    >
      <div
        className={`w-full max-w-md space-y-8 rounded-[2.5rem] border p-7 shadow-2xl sm:p-10 ${
          isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'
        }`}
      >
        {step === 1 ? (
          <>
            <div className="space-y-3 text-center">
              <div
                className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl ${
                  isDarkMode ? 'bg-stone-800 text-rose-500' : 'bg-rose-50 text-rose-500'
                }`}
              >
                <Zap size={36} />
              </div>
              <h2 className={`text-3xl font-light ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                Önce seni <span className="font-medium text-rose-500">tanıyalım</span>
              </h2>
              <p className="text-sm font-light leading-6 text-stone-500">
                Planını sana göre şekillendirebilmek için ismini yazman yeterli.
              </p>
            </div>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Adın ne?"
              className={`w-full rounded-2xl p-5 text-center text-lg outline-none ${
                isDarkMode ? 'bg-stone-800 text-white' : 'bg-stone-50 text-stone-800'
              }`}
            />
            <button
              type="button"
              onClick={() => name.trim() && setStep(2)}
              disabled={!name.trim()}
              className="w-full rounded-[2rem] bg-rose-600 py-5 font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              Devam Et
            </button>
          </>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <h2 className={`text-2xl font-light ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                Serbest <span className="font-medium text-rose-500">zamanını ayarla</span>
              </h2>
              <p className="text-xs uppercase tracking-widest text-stone-500">
                Hafta içi ve hafta sonu için sabah ve akşam serbest zamanını dakika bazında gir
              </p>
            </div>

            <PeriodSetup
              title="Hafta İçi"
              state={weekdayPeriods}
              setState={setWeekdayPeriods}
              isDarkMode={isDarkMode}
            />
            <PeriodSetup
              title="Hafta Sonu"
              state={weekendPeriods}
              setState={setWeekendPeriods}
              isDarkMode={isDarkMode}
            />

            {error && <p className="text-center text-sm text-rose-500">{error}</p>}
            <button
              type="button"
              onClick={handleComplete}
              disabled={loading}
              className="w-full rounded-[2rem] bg-rose-600 py-5 font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Kurulumu Tamamla'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function PeriodSetup({ title, state, setState, isDarkMode }) {
  return (
    <div
      className={`space-y-4 rounded-3xl border p-6 ${
        isDarkMode ? 'border-stone-700 bg-stone-800/50' : 'border-rose-50 bg-rose-50/30'
      }`}
    >
      <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Sabah Serbest Zamanı"
          value={state.morning}
          onChange={(value) => setState({ ...state, morning: value })}
          isDarkMode={isDarkMode}
        />
        <Field
          label="Akşam Serbest Zamanı"
          value={state.evening}
          onChange={(value) => setState({ ...state, evening: value })}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  )
}

function Field({ label, value, onChange, isDarkMode }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-stone-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(parseInt(event.target.value, 10) || 0)}
        className={`mt-2 w-full rounded-xl border p-3 text-sm font-medium ${
          isDarkMode
            ? 'border-stone-700 bg-stone-800 text-white'
            : 'border-rose-50 bg-white text-stone-800'
        }`}
      />
    </div>
  )
}
