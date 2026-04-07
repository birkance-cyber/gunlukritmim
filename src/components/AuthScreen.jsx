import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Sun,
  User,
  UserPlus,
  Zap,
} from 'lucide-react'

export function AuthScreen({
  isDarkMode,
  setIsDarkMode,
  onLogin,
  onSignup,
  onGuest,
  onForgotPassword,
  onResetPassword,
  guestEnabled,
  initialMode = 'login',
  variant = 'gateway',
  onCancel,
}) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMode(initialMode)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
  }, [initialMode, variant])

  const isUpgrade = variant === 'upgrade'
  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    resetMessages()
    setLoading(true)

    try {
      if (isForgot) {
        await onForgotPassword(email)
        setSuccess('Şifre sıfırlama bağlantısı e-posta adresine gönderildi.')
      } else if (isReset) {
        if (password.length < 6) {
          throw new Error('Yeni şifren en az 6 karakter olmalı.')
        }
        if (password !== confirmPassword) {
          throw new Error('Yeni şifre ile tekrar alanı aynı olmalı.')
        }
        await onResetPassword(password)
        setSuccess('Şifren güncellendi. Şimdi yeni şifrenle giriş yapabilirsin.')
      } else if (mode === 'login') {
        await onLogin({ email, password })
      } else {
        await onSignup({ name, email, password })
      }
    } catch (err) {
      setError(err.message || 'İşlem sırasında bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    resetMessages()
    setLoading(true)
    try {
      await onGuest()
    } catch (err) {
      setError(err.message || 'Misafir girişi şu an yapılamıyor.')
    } finally {
      setLoading(false)
    }
  }

  const getHeading = () => {
    if (isUpgrade) return 'Üyeliğini Tamamla'
    if (isReset) return 'Yeni Şifre Belirle'
    if (isForgot) return 'Şifreni Yenile'
    return mode === 'login' ? 'Tekrar Hoş Geldin' : 'Yeni Kayıt'
  }

  const getDescription = () => {
    if (isUpgrade) {
      return 'Misafir olarak başladığın yolculuğu kalıcı hesabınla güvenceye al.'
    }
    if (isReset) {
      return 'Güvenli bir yeni şifre belirle, ardından giriş ekranına döneceksin.'
    }
    if (isForgot) {
      return 'E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.'
    }
    return 'Planına giriş yap, motivasyonunu taze tut ve akışını koru.'
  }

  const submitLabel = isForgot
    ? 'Sıfırlama Maili Gönder'
    : isReset
      ? 'Yeni Şifreyi Kaydet'
      : mode === 'login'
        ? 'Giriş Yap'
        : isUpgrade
          ? 'Üyeliği Tamamla'
          : 'Kayıt Ol'

  return (
    <div
      className={`flex min-h-screen items-center justify-center p-5 sm:p-6 ${
        isDarkMode ? 'bg-[#121212]' : 'bg-[#FDF8F8]'
      }`}
    >
      <div
        className={`w-full max-w-md space-y-7 rounded-[2.5rem] border p-7 shadow-2xl sm:p-10 ${
          isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isDarkMode ? 'bg-stone-800 text-rose-500' : 'bg-rose-50 text-rose-500'
            }`}
          >
            <Zap size={24} />
          </div>
          <div className="flex items-center gap-2">
            {(isUpgrade || isReset) && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className={`rounded-xl p-2 transition ${
                  isDarkMode
                    ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                }`}
                title="Uygulamaya dön"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-xl p-2 text-stone-400 transition hover:text-rose-500"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h2 className={`text-3xl font-light ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
            {getHeading()}
          </h2>
          <p className="text-sm font-light leading-6 text-stone-500">{getDescription()}</p>
        </div>

        {!isUpgrade && !isReset && (
          <div
            className={`grid grid-cols-2 gap-2 rounded-2xl p-1 ${
              isDarkMode ? 'bg-stone-800' : 'bg-stone-100'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login')
                resetMessages()
              }}
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-rose-600 text-white'
                  : isDarkMode
                    ? 'text-stone-300 hover:bg-stone-700'
                    : 'text-stone-600 hover:bg-white'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                resetMessages()
              }}
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                mode === 'signup'
                  ? 'bg-rose-600 text-white'
                  : isDarkMode
                    ? 'text-stone-300 hover:bg-stone-700'
                    : 'text-stone-600 hover:bg-white'
              }`}
            >
              Kayıt Ol
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'signup' || isUpgrade) && (
            <Field icon={<User size={18} className="text-stone-400" />}>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Adın soyadın"
                className={inputClasses(isDarkMode)}
              />
            </Field>
          )}

          {!isReset && (
            <Field icon={isForgot ? <KeyRound size={18} className="text-stone-400" /> : <Mail size={18} className="text-stone-400" />}>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-posta adresin"
                className={inputClasses(isDarkMode)}
              />
            </Field>
          )}

          {!isForgot && (
            <Field icon={<Lock size={18} className="text-stone-400" />}>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isReset ? 'Yeni şifren' : 'Şifren'}
                className={inputClasses(isDarkMode)}
              />
            </Field>
          )}

          {isReset && (
            <Field icon={<Lock size={18} className="text-stone-400" />}>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Yeni şifre tekrar"
                className={inputClasses(isDarkMode)}
              />
            </Field>
          )}

          {error && <p className="text-center text-xs text-rose-500">{error}</p>}
          {success && <p className="text-center text-xs text-emerald-600">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[2rem] bg-rose-600 py-4 font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? 'Yükleniyor...' : submitLabel}
          </button>
        </form>

        {!isUpgrade && !isReset && (
          <div className="space-y-4 border-t border-stone-100 pt-2 dark:border-stone-800">
            {mode === 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot')
                    resetMessages()
                  }}
                  className="text-sm text-stone-400 underline underline-offset-4 hover:text-rose-500"
                >
                  Şifremi unuttum
                </button>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    resetMessages()
                  }}
                  className="text-sm text-stone-400 underline underline-offset-4 hover:text-rose-500"
                >
                  Giriş ekranına dön
                </button>
              </div>
            )}

            {guestEnabled && mode !== 'forgot' && (
              <button
                type="button"
                onClick={handleGuest}
                disabled={loading}
                className={`flex w-full items-center justify-center gap-2 rounded-[2rem] border py-4 font-bold transition ${
                  isDarkMode
                    ? 'border-stone-700 bg-transparent text-stone-300 hover:bg-stone-800'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <UserPlus size={18} /> Kayıt olmadan devam et
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ icon, children }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
        {icon}
      </div>
      {children}
    </div>
  )
}

function inputClasses(isDarkMode) {
  return `w-full rounded-2xl p-4 pl-12 outline-none transition focus:ring-2 focus:ring-rose-500/20 ${
    isDarkMode ? 'bg-stone-800 text-white' : 'bg-stone-50 text-stone-800'
  }`
}
