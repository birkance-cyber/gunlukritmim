import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  LogOut,
  Moon,
  Plus,
  Quote,
  RefreshCw,
  Star,
  Sun,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import { AuthScreen } from './components/AuthScreen'
import { WelcomeSetup } from './components/WelcomeSetup'
import { ActivityModal } from './components/ActivityModal'
import { DiaryView } from './components/DiaryView'
import { StatsView } from './components/StatsView'
import { ProfileModal } from './components/ProfileModal'
import { MOTIVATIONAL_QUOTES } from './data/quotes'
import { localUser } from './data/localUser'
import { appNamespace, hasSupabaseConfig, supabase } from './lib/supabase'
import {
  addDays,
  createId,
  formatDate,
  getDayName,
  isWeekend,
  readJson,
  writeJson,
} from './lib/utils'

const localKey = (name) => `${appNamespace}:${name}`

const normalizeProfile = (row) => {
  if (!row) return null
  return {
    name: row.name,
    email: row.email || 'Misafir Kullanıcı',
    isAnonymous: Boolean(row.is_anonymous),
    weekdayPeriods: row.weekday_periods || { morning: 120, evening: 180 },
    weekendPeriods: row.weekend_periods || { morning: 180, evening: 240 },
  }
}

const serializeProfile = (user, data) => ({
  id: user.id,
  name: data.name,
  email: user.email || 'Misafir Kullanıcı',
  is_anonymous: Boolean(user.is_anonymous),
  weekday_periods: data.weekdayPeriods,
  weekend_periods: data.weekendPeriods,
})

const getActivityTarget = (activity) => {
  if (activity.type === 'habit') return 21
  if (activity.type === 'challenge') {
    return (activity.weeks || 0) * ((activity.selected_days || []).length || 0)
  }
  return null
}

const getCurrentChallengeWeek = (activity) => {
  const start = new Date(activity.start_date)
  const now = new Date()
  const diff = Math.max(0, now.getTime() - start.getTime())
  return Math.min(activity.weeks || 1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1)
}

const getMatchingDatesForDays = (startDate, dayIndexes, weekCount) => {
  const matches = []
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  for (let offset = 0; offset < weekCount * 7; offset += 1) {
    const candidate = addDays(start, offset)
    if (dayIndexes.includes(candidate.getDay())) matches.push(formatDate(candidate))
  }

  return matches
}

const getFirstName = (value) => {
  const normalized = (value || '').trim()
  if (!normalized) return 'Gezgin'
  return normalized.split(/\s+/)[0]
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [activities, setActivities] = useState([])
  const [diaries, setDiaries] = useState({})
  const [activeTab, setActiveTab] = useState('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [congratsModal, setCongratsModal] = useState(null)
  const [syncError, setSyncError] = useState('')
  const [showUpgradeAuth, setShowUpgradeAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(readJson(localKey('dark-mode'), false))
  const previousTabRef = useRef('calendar')
  const todayRef = useRef(formatDate(new Date()))

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length))
  }, [])

  useEffect(() => {
    writeJson(localKey('dark-mode'), isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    if (activeTab === 'calendar' && previousTabRef.current !== 'calendar') {
      setCurrentDate(new Date())
    }
    if (activeTab === 'diary' && previousTabRef.current !== 'diary') {
      setCurrentDate(new Date())
    }
    previousTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    const timer = setInterval(() => {
      const liveToday = formatDate(new Date())
      if (liveToday !== todayRef.current) {
        if (activeTab === 'diary' && formatDate(currentDate) === todayRef.current) {
          setCurrentDate(new Date())
        }
        todayRef.current = liveToday
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [activeTab, currentDate])

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setUser(localUser)
      setAuthLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setSyncError(error.message)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset')
      }
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.is_anonymous) setShowUpgradeAuth(false)
  }, [user])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    const search = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const type = hashParams.get('type') || search.get('type')
    if (type === 'recovery') {
      setAuthMode('reset')
      setUser(null)
      setProfile(null)
      setActivities([])
      setDiaries({})
      setShowUpgradeAuth(false)
    }
  }, [])

  const loadUserData = async (activeUser) => {
    if (!activeUser) return
    setSyncError('')
    setProfileLoading(true)

    if (!hasSupabaseConfig) {
      setProfile(readJson(localKey('profile'), null))
      setActivities(readJson(localKey('activities'), []))
      setDiaries(readJson(localKey('diaries'), {}))
      setProfileLoading(false)
      return
    }

    const [profileResult, activitiesResult, diariesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', activeUser.id).maybeSingle(),
      supabase
        .from('activities')
        .select('*')
        .eq('user_id', activeUser.id)
        .order('created_at', { ascending: false }),
      supabase.from('diaries').select('*').eq('user_id', activeUser.id),
    ])

    if (profileResult.error || activitiesResult.error || diariesResult.error) {
      setSyncError(
        profileResult.error?.message ||
          activitiesResult.error?.message ||
          diariesResult.error?.message ||
          'Supabase senkronizasyon hatası.',
      )
      setProfileLoading(false)
      return
    }

    const diaryMap = {}
    for (const item of diariesResult.data || []) {
      diaryMap[item.entry_date] = item.text
    }

    setProfile(normalizeProfile(profileResult.data))
    setActivities(activitiesResult.data || [])
    setDiaries(diaryMap)
    setProfileLoading(false)
  }

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setActivities([])
      setDiaries({})
      setProfileLoading(false)
      return
    }
    loadUserData(user)
  }, [user])

  const handleLogin = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setAuthMode('login')
  }

  const handleSignup = async ({ name, email, password }) => {
    if (showUpgradeAuth && user?.is_anonymous) {
      const { error } = await supabase.auth.updateUser({
        email,
        password,
        data: { name },
      })
      if (error) throw error

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: profile?.name || name,
          email,
          is_anonymous: false,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      setProfile((current) =>
        current ? { ...current, email, isAnonymous: false, name: current.name || name } : current,
      )
      setShowUpgradeAuth(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    setAuthMode('login')
  }

  const handleForgotPassword = async (email) => {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }

  const handleResetPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }

    await supabase.auth.signOut()
    setAuthMode('login')
  }

  const handleGuest = async () => {
    if (!hasSupabaseConfig) {
      setUser(localUser)
      return
    }

    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
  }

  const handleSignOut = async () => {
    if (!hasSupabaseConfig) {
      localStorage.removeItem(localKey('profile'))
      localStorage.removeItem(localKey('activities'))
      localStorage.removeItem(localKey('diaries'))
      setProfile(null)
      setActivities([])
      setDiaries({})
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) setSyncError(error.message)
  }

  const saveProfile = async (data) => {
    if (!user) return

    const nextProfile = {
      name: data.name,
      email: user.email || 'Misafir Kullanıcı',
      isAnonymous: Boolean(user.is_anonymous),
      weekdayPeriods: data.weekdayPeriods,
      weekendPeriods: data.weekendPeriods,
    }

    if (!hasSupabaseConfig) {
      writeJson(localKey('profile'), nextProfile)
      setProfile(nextProfile)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(serializeProfile(user, data), { onConflict: 'id' })

    if (error) {
      setSyncError(error.message)
      throw new Error(
        `Supabase profil kaydı başarısız: ${error.message}. Muhtemelen tablolar henüz oluşturulmadı.`,
      )
    }

    setProfile(nextProfile)
  }

  const updateProfileSettings = async (data) => {
    if (!user) return

    const nextEmail = data.email?.trim() || user.email || 'Misafir Kullanıcı'
    const nextProfile = {
      name: data.name.trim() || profile?.name || 'Gezgin',
      email: nextEmail,
      isAnonymous: Boolean(user.is_anonymous),
      weekdayPeriods: data.weekdayPeriods,
      weekendPeriods: data.weekendPeriods,
    }

    if (!hasSupabaseConfig) {
      writeJson(localKey('profile'), nextProfile)
      setProfile(nextProfile)
      return
    }

    const authPayload = {
      data: { ...(user.user_metadata || {}), name: nextProfile.name },
    }

    if (!user.is_anonymous && nextEmail && nextEmail !== user.email) {
      authPayload.email = nextEmail
    }
    if (!user.is_anonymous && data.password) {
      authPayload.password = data.password
    }

    const shouldUpdateAuth =
      Boolean(authPayload.email) || Boolean(authPayload.password) || nextProfile.name !== (profile?.name || '')

    if (shouldUpdateAuth) {
      const { error } = await supabase.auth.updateUser(authPayload)
      if (error) throw error
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          name: nextProfile.name,
          email: nextEmail,
          is_anonymous: Boolean(user.is_anonymous),
          weekday_periods: nextProfile.weekdayPeriods,
          weekend_periods: nextProfile.weekendPeriods,
        },
        { onConflict: 'id' },
      )

    if (profileError) throw profileError

    if (hasSupabaseConfig) {
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) setUser(authData.user)
    }

    setProfile(nextProfile)
  }

  const deleteAccount = async () => {
    if (!user) return

    if (!hasSupabaseConfig) {
      localStorage.removeItem(localKey('profile'))
      localStorage.removeItem(localKey('activities'))
      localStorage.removeItem(localKey('diaries'))
      setProfile(null)
      setActivities([])
      setDiaries({})
      setIsProfileOpen(false)
      return
    }

    const [activitiesResult, diariesResult, profileResult] = await Promise.all([
      supabase.from('activities').delete().eq('user_id', user.id),
      supabase.from('diaries').delete().eq('user_id', user.id),
      supabase.from('profiles').delete().eq('id', user.id),
    ])

    const deleteError =
      activitiesResult.error || diariesResult.error || profileResult.error

    if (deleteError) {
      throw deleteError
    }

    setIsProfileOpen(false)
    await supabase.auth.signOut()
    setSyncError(
      'Uygulama verilerin silindi ve çıkış yapıldı. Giriş hesabının tamamen silinmesi için sunucu tarafı yetkisi gerekir.',
    )
  }

  const addActivity = async (data) => {
    if (!user) return

    const startDate = formatDate(data.type === 'routine' ? new Date() : data.startDate || new Date())
    const endDate =
      data.type === 'routine'
        ? formatDate(addDays(startDate, 70))
        : data.type === 'challenge'
          ? formatDate(addDays(startDate, data.weeks * 7))
          : formatDate(addDays(startDate, 21))

    const candidateDays = data.type === 'habit' ? [0, 1, 2, 3, 4, 5, 6] : data.selectedDays

    const inspectionDates =
      data.type === 'routine'
        ? getMatchingDatesForDays(startDate, candidateDays, 10)
        : data.type === 'challenge'
          ? getMatchingDatesForDays(startDate, candidateDays, data.weeks)
          : getMatchingDatesForDays(startDate, [0, 1, 2, 3, 4, 5, 6], 3)

    for (const inspectedDate of inspectionDates) {
      const poolTarget = isWeekend(inspectedDate)
        ? profile.weekendPeriods[data.period]
        : profile.weekdayPeriods[data.period]

      const currentLoad = activities.reduce((total, item) => {
        if (item.period !== data.period) return total
        if (inspectedDate < item.start_date || inspectedDate > item.end_date) return total
        if (item.type === 'habit') return total + (Number(item.duration) || 0)
        return (item.selected_days || []).includes(new Date(`${inspectedDate}T12:00:00`).getDay())
          ? total + (Number(item.duration) || 0)
          : total
      }, 0)

      if (currentLoad + Number(data.duration) > poolTarget) {
        throw new Error(
          `${inspectedDate} günü için ${
            data.period === 'morning' ? 'sabah' : 'akşam'
          } serbest zamanı dolu. Havuz ${poolTarget} dk, planlanan toplam ${
            currentLoad + Number(data.duration)
          } dk oluyor.`,
        )
      }
    }

    const payload = {
      id: createId(),
      user_id: user.id,
      title: data.title,
      type: data.type,
      duration: Number(data.duration),
      period: data.period,
      selected_days: data.type === 'habit' ? [] : data.selectedDays,
      weeks: data.type === 'challenge' ? Number(data.weeks) : 0,
      start_date: startDate,
      end_date: endDate,
      completions: [],
    }

    if (!hasSupabaseConfig) {
      const next = [payload, ...activities]
      writeJson(localKey('activities'), next)
      setActivities(next)
      setIsAddingActivity(false)
      return
    }

    const { error } = await supabase.from('activities').insert(payload)
    if (error) {
      setSyncError(error.message)
      throw new Error(error.message)
    }

    await loadUserData(user)
    setIsAddingActivity(false)
  }

  const toggleCompletion = async (activityId, dateStr) => {
    const activity = activities.find((item) => item.id === activityId)
    if (!activity) return

    let completions = [...(activity.completions || [])]
    const isAdding = !completions.includes(dateStr)
    completions = isAdding
      ? [...completions, dateStr]
      : completions.filter((item) => item !== dateStr)

    if (!hasSupabaseConfig) {
      const next = activities.map((item) =>
        item.id === activityId ? { ...item, completions } : item,
      )
      writeJson(localKey('activities'), next)
      setActivities(next)
    } else {
      const { error } = await supabase
        .from('activities')
        .update({ completions })
        .eq('id', activityId)
      if (error) {
        setSyncError(error.message)
        return
      }
      await loadUserData(user)
    }

    if (isAdding) {
      const target =
        activity.type === 'habit'
          ? 21
          : activity.type === 'challenge'
            ? activity.weeks * (activity.selected_days?.length || 0)
            : null

      if (target && completions.length === target) {
        setCongratsModal({ title: activity.title, type: activity.type })
      }
    }
  }

  const saveDiary = async (text) => {
    if (!user) return
    const dateStr = formatDate(currentDate)

    if (!hasSupabaseConfig) {
      const next = { ...diaries, [dateStr]: text }
      writeJson(localKey('diaries'), next)
      setDiaries(next)
      return
    }

    const { error } = await supabase.from('diaries').upsert(
      {
        id: `${user.id}-${dateStr}`,
        user_id: user.id,
        entry_date: dateStr,
        text,
      },
      { onConflict: 'id' },
    )

    if (error) {
      setSyncError(error.message)
      return
    }

    setDiaries((current) => ({ ...current, [dateStr]: text }))
  }

  const deleteActivity = async (id) => {
    if (!hasSupabaseConfig) {
      const next = activities.filter((item) => item.id !== id)
      writeJson(localKey('activities'), next)
      setActivities(next)
      return
    }

    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) {
      setSyncError(error.message)
      return
    }
    await loadUserData(user)
  }

  const extendRoutine = async (id) => {
    const activity = activities.find((item) => item.id === id)
    if (!activity) return
    const endDate = formatDate(addDays(activity.end_date, 70))

    if (!hasSupabaseConfig) {
      const next = activities.map((item) =>
        item.id === id ? { ...item, end_date: endDate } : item,
      )
      writeJson(localKey('activities'), next)
      setActivities(next)
      return
    }

    const { error } = await supabase.from('activities').update({ end_date: endDate }).eq('id', id)
    if (error) {
      setSyncError(error.message)
      return
    }
    await loadUserData(user)
  }

  const dailyActivities = useMemo(() => {
    const day = formatDate(currentDate)
    const dayIndex = new Date(currentDate).getDay()

    return activities.filter((activity) => {
      if (day < activity.start_date || day > activity.end_date) return false
      if (activity.type === 'habit') return true
      return (activity.selected_days || []).includes(dayIndex)
    })
  }, [activities, currentDate])

  const expiredRoutines = activities.filter(
    (activity) => activity.type === 'routine' && activity.end_date < formatDate(new Date()),
  )

  const refreshQuote = () => {
    setQuoteIndex((current) => (current + 1) % MOTIVATIONAL_QUOTES.length)
  }

  const weeklySummary = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = addDays(today, -((today.getDay() + 6) % 7))

    return Array.from({ length: 7 }, (_, index) => {
      const dayDate = addDays(weekStart, index)
      const dateKey = formatDate(dayDate)
      const dayIndex = dayDate.getDay()
      const items = activities.filter((activity) => {
        if (dateKey < activity.start_date || dateKey > activity.end_date) return false
        if (activity.type === 'habit') return true
        return (activity.selected_days || []).includes(dayIndex)
      })

      return {
        date: dayDate,
        dateKey,
        items: items.map((activity) => ({
          id: activity.id,
          title: activity.title,
          period: activity.period,
          duration: activity.duration,
          done: (activity.completions || []).includes(dateKey),
        })),
      }
    })
  }, [activities])

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-stone-500">
        Bağlanıyor...
      </div>
    )
  }

  if (authMode === 'reset') {
    return (
      <AuthScreen
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onGuest={handleGuest}
        onForgotPassword={handleForgotPassword}
        onResetPassword={handleResetPassword}
        guestEnabled={false}
        initialMode="reset"
        variant="reset"
        onCancel={() => setAuthMode('login')}
      />
    )
  }

  if (!user && hasSupabaseConfig) {
    return (
      <AuthScreen
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onGuest={handleGuest}
        onForgotPassword={handleForgotPassword}
        onResetPassword={handleResetPassword}
        guestEnabled
        initialMode={authMode}
      />
    )
  }

  if (showUpgradeAuth && user?.is_anonymous) {
    return (
      <AuthScreen
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onGuest={handleGuest}
        onForgotPassword={handleForgotPassword}
        onResetPassword={handleResetPassword}
        guestEnabled={false}
        initialMode="signup"
        variant="upgrade"
        onCancel={() => setShowUpgradeAuth(false)}
      />
    )
  }

  if (!profile) {
    return <WelcomeSetup user={user || localUser} onComplete={saveProfile} isDarkMode={isDarkMode} />
  }

  return (
    <div className={`min-h-screen pb-28 ${isDarkMode ? 'bg-[#121212] text-stone-200' : 'bg-[#FDF8F8] text-stone-700'}`}>
      {user?.is_anonymous && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-bold text-white">
          <AlertCircle size={14} />
          Misafir modundasın. Verilerinin kalıcı olması için üye olman gerekir.
          <button
            type="button"
            onClick={() => setShowUpgradeAuth(true)}
            className="underline underline-offset-4 hover:opacity-90"
          >
            Üye ol
          </button>
        </div>
      )}

      {!hasSupabaseConfig && (
        <div className="bg-sky-600 px-4 py-2 text-center text-xs font-bold text-white">
          Supabase ayarları yok. Uygulama yerel modda çalışıyor.
        </div>
      )}

      {syncError && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-bold text-white">
          <AlertCircle size={14} /> {syncError}
        </div>
      )}

      <header className={`border-b p-3 md:p-4 ${isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-100/50 bg-white'}`}>
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className={`text-xl font-light md:text-2xl ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                Merhaba, <span className="font-medium text-rose-500">{getFirstName(profile.name)}</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.22em] text-rose-400/80 md:text-[11px]">
                Bugün kendin için ne yapacaksın?
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`flex h-8 w-14 items-center rounded-full px-1 ${
                  isDarkMode ? 'bg-rose-500' : 'bg-stone-200'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full bg-white transition-transform ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {isDarkMode ? <Moon size={14} className="text-rose-600" /> : <Sun size={14} className="text-amber-500" />}
                </div>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className={`rounded-full p-2 ${
                  isDarkMode
                    ? 'text-stone-500 hover:bg-stone-800 hover:text-rose-400'
                    : 'text-stone-300 hover:bg-rose-50 hover:text-rose-500'
                }`}
                title="Çıkış yap"
              >
                <LogOut size={20} />
              </button>

              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className={`rounded-full p-2 ${
                  isDarkMode
                    ? 'text-stone-500 hover:bg-stone-800 hover:text-rose-400'
                    : 'text-stone-300 hover:bg-rose-50 hover:text-rose-500'
                }`}
                title="Profil ayarları"
              >
                <UserRound size={20} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 md:flex-row md:items-stretch md:gap-3">
            <div className={`min-w-0 flex-1 rounded-[1.6rem] border p-3 md:p-3.5 ${isDarkMode ? 'border-stone-800 bg-[#222222]' : 'border-rose-100 bg-rose-50/50'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`rounded-xl p-2 ${isDarkMode ? 'bg-[#2A2A2A] text-rose-400' : 'bg-white text-rose-400'}`}>
                  <Quote size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`pr-1 text-xs leading-5 md:text-sm ${isDarkMode ? 'text-stone-300' : 'text-stone-800'}`}>
                    {MOTIVATIONAL_QUOTES[quoteIndex]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshQuote}
                  className={`rounded-xl p-2 ${
                    isDarkMode ? 'text-stone-500 hover:bg-stone-800 hover:text-rose-400' : 'text-stone-400 hover:bg-white hover:text-rose-500'
                  }`}
                  title="Yeni söz getir"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
              <button
                type="button"
                onClick={() => setIsWeeklySummaryOpen(true)}
                className={`inline-flex items-center justify-center gap-2 rounded-[1.35rem] px-4 py-3 font-semibold transition md:min-w-[180px] ${
                  isDarkMode
                    ? 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <CalendarDays size={16} />
                Haftalık Özet
              </button>

              <button
                type="button"
                onClick={() => setIsAddingActivity(true)}
                className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] bg-rose-600 px-4 py-3 font-semibold text-white shadow-lg shadow-rose-900/15 transition hover:bg-rose-700 md:min-w-[200px]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                  <Plus size={16} />
                </span>
                Yeni Aktivite Ekle
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 pb-28 pt-4 sm:px-4 md:p-8">
        {activeTab === 'calendar' && (
          <div className="space-y-8">
            {expiredRoutines.length > 0 && (
              <div className={`flex flex-col items-start justify-between gap-3 rounded-2xl border p-4 md:flex-row md:items-center ${isDarkMode ? 'border-rose-900/20 bg-rose-900/10' : 'border-rose-200 bg-rose-100/30'}`}>
                <div className="flex items-center gap-3">
                  <Zap className="text-rose-400" size={18} />
                  <span className={isDarkMode ? 'text-sm text-rose-200' : 'text-sm text-rose-900'}>
                    Süresi dolan rutinlerini uzatma zamanı.
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {expiredRoutines.map((routine) => (
                    <button
                      key={routine.id}
                      type="button"
                      onClick={() => extendRoutine(routine.id)}
                      className={`rounded-xl border px-4 py-2 text-xs font-semibold ${
                        isDarkMode ? 'border-stone-700 bg-[#2A2A2A] text-rose-400 hover:bg-[#333333]' : 'border-rose-100 bg-white text-rose-600'
                      }`}
                    >
                      {routine.title} +10 Hafta
                    </button>
                  ))}
                </div>
              </div>
            )}

            <CalendarNav currentDate={currentDate} setCurrentDate={setCurrentDate} isDarkMode={isDarkMode} />

            <div className="grid gap-4 md:gap-6 lg:grid-cols-2 lg:gap-8">
              <PeriodBox
                title="Sabah Akışı"
                icon={<Zap size={18} className="text-amber-400" />}
                activities={dailyActivities.filter((item) => item.period === 'morning')}
                target={isWeekend(currentDate) ? profile.weekendPeriods.morning : profile.weekdayPeriods.morning}
                onToggle={(id) => toggleCompletion(id, formatDate(currentDate))}
                dateStr={formatDate(currentDate)}
                onDelete={deleteActivity}
                isDarkMode={isDarkMode}
              />
              <PeriodBox
                title="Akşam Akışı"
                icon={<Heart size={18} className="text-rose-400" />}
                activities={dailyActivities.filter((item) => item.period === 'evening')}
                target={isWeekend(currentDate) ? profile.weekendPeriods.evening : profile.weekdayPeriods.evening}
                onToggle={(id) => toggleCompletion(id, formatDate(currentDate))}
                dateStr={formatDate(currentDate)}
                onDelete={deleteActivity}
                isDarkMode={isDarkMode}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddingActivity(true)}
              className={`flex w-full items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed py-5 font-medium ${
                isDarkMode ? 'border-stone-800 text-stone-500 hover:border-rose-900 hover:bg-[#1A1A1A]' : 'border-rose-200 text-rose-300 hover:border-rose-300 hover:bg-white'
              }`}
            >
              <Plus size={24} /> Yeni Aktivite Ekle
            </button>
          </div>
        )}

        {activeTab === 'stats' && <StatsView activities={activities} isDarkMode={isDarkMode} />}

        {activeTab === 'diary' && (
          <DiaryView
            date={currentDate}
            text={diaries[formatDate(currentDate)] || ''}
            onSave={saveDiary}
            diaries={diaries}
            onSelectDate={(date) => setCurrentDate(new Date(date))}
            isDarkMode={isDarkMode}
          />
        )}
      </main>

      <nav className={`fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-1.25rem)] max-w-md -translate-x-1/2 justify-between rounded-[1.75rem] border px-5 py-3 backdrop-blur-xl md:bottom-8 md:w-auto md:max-w-none md:gap-12 md:rounded-[2.25rem] md:px-8 md:py-4 ${isDarkMode ? 'border-stone-800 bg-[#1A1A1A]/88 text-stone-400' : 'border-rose-100 bg-white/88 text-stone-400'}`}>
        <NavItem active={activeTab === 'calendar'} icon={<CalendarDays size={22} />} label="Akış" onClick={() => setActiveTab('calendar')} isDarkMode={isDarkMode} />
        <NavItem active={activeTab === 'stats'} icon={<BarChart3 size={22} />} label="Gelişim" onClick={() => setActiveTab('stats')} isDarkMode={isDarkMode} />
        <NavItem active={activeTab === 'diary'} icon={<BookOpen size={22} />} label="Günlük" onClick={() => setActiveTab('diary')} isDarkMode={isDarkMode} />
      </nav>

      {isAddingActivity && (
        <ActivityModal
          onClose={() => setIsAddingActivity(false)}
          onAdd={addActivity}
          isDarkMode={isDarkMode}
          profile={profile}
          activities={activities}
        />
      )}
      {isProfileOpen && (
        <ProfileModal
          user={user}
          profile={profile}
          isDarkMode={isDarkMode}
          onClose={() => setIsProfileOpen(false)}
          onSave={updateProfileSettings}
          onDelete={deleteAccount}
        />
      )}
      {isWeeklySummaryOpen && (
        <WeeklySummaryModal
          days={weeklySummary}
          isDarkMode={isDarkMode}
          onClose={() => setIsWeeklySummaryOpen(false)}
        />
      )}
      {congratsModal && <CongratsModal data={congratsModal} onClose={() => setCongratsModal(null)} />}
    </div>
  )
}

function NavItem({ active, icon, label, onClick, isDarkMode }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-rose-500' : 'hover:text-rose-400'}`}>
      <div className={`rounded-xl p-1.5 md:p-1.5 ${active ? (isDarkMode ? 'bg-rose-900/20' : 'bg-rose-50') : (isDarkMode ? 'hover:bg-stone-800' : 'hover:bg-rose-50/50')}`}>
        {icon}
      </div>
      <span className="text-[9px] uppercase tracking-[0.18em] md:text-[10px]">{label}</span>
    </button>
  )
}

function CalendarNav({ currentDate, setCurrentDate, isDarkMode }) {
  const dateInputRef = useRef(null)

  const openDatePicker = () => {
    if (!dateInputRef.current) return
    if (typeof dateInputRef.current.showPicker === 'function') dateInputRef.current.showPicker()
    else dateInputRef.current.click()
  }

  return (
    <div className={`flex items-center justify-between rounded-[1.6rem] border p-2.5 md:rounded-3xl md:p-3 ${isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'}`}>
      <button type="button" onClick={() => setCurrentDate(addDays(currentDate, -1))} className={`rounded-xl p-2.5 md:rounded-2xl md:p-3 ${isDarkMode ? 'text-stone-500 hover:bg-stone-800' : 'text-rose-300 hover:bg-rose-50'}`}>
        <ChevronLeft size={20} />
      </button>
      <div className="text-center">
        <button
          type="button"
          onClick={openDatePicker}
          className={`rounded-xl px-3 py-2 transition md:rounded-2xl md:px-4 ${isDarkMode ? 'hover:bg-stone-800' : 'hover:bg-rose-50'}`}
        >
          <h2 className={`text-base font-medium md:text-lg ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
            {getDayName(currentDate)}
          </h2>
          <p className="text-[11px] text-stone-400 md:text-xs">
            {currentDate.toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={formatDate(currentDate)}
          onChange={(event) => {
            if (event.target.value) setCurrentDate(new Date(`${event.target.value}T12:00:00`))
          }}
          className="pointer-events-none absolute opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <button type="button" onClick={() => setCurrentDate(addDays(currentDate, 1))} className={`rounded-xl p-2.5 md:rounded-2xl md:p-3 ${isDarkMode ? 'text-stone-500 hover:bg-stone-800' : 'text-rose-300 hover:bg-rose-50'}`}>
        <ChevronRight size={20} />
      </button>
    </div>
  )
}

function PeriodBox({ title, icon, activities, target, onToggle, dateStr, onDelete, isDarkMode }) {
  const used = activities.reduce((total, item) => total + (Number(item.duration) || 0), 0)
  const progress = target > 0 ? Math.min(100, (used / target) * 100) : 0

  return (
    <div className={`space-y-5 rounded-[1.75rem] border p-5 md:space-y-6 md:rounded-[2.5rem] md:p-8 ${isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl border p-2 ${isDarkMode ? 'border-stone-700 bg-stone-800' : 'border-rose-100 bg-rose-50/50'}`}>
            {icon}
          </div>
          <h3 className={`text-lg font-medium md:text-xl ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>{title}</h3>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-rose-500">{used} dk</span>
          <p className="text-[10px] uppercase tracking-wider text-stone-400">Hedef: {target} dk</p>
        </div>
      </div>

      <div className={`h-2 w-full overflow-hidden rounded-full ${isDarkMode ? 'bg-stone-800' : 'bg-rose-50/50'}`}>
        <div className="h-full bg-rose-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="py-10 text-center text-sm italic text-stone-500 md:py-12">
            Bu dönem için planlanmış iş yok.
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onToggle={() => onToggle(activity.id)}
              isDone={(activity.completions || []).includes(dateStr)}
              dateStr={dateStr}
              onDelete={() => onDelete(activity.id)}
              isDarkMode={isDarkMode}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ActivityCard({ activity, onToggle, isDone, dateStr, onDelete, isDarkMode }) {
  const completionCount = (activity.completions || []).length
  const target = getActivityTarget(activity)
  const isMissed = !isDone && dateStr < formatDate(new Date())
  const progressLabel =
    activity.type === 'habit'
      ? `${completionCount} / 21`
      : activity.type === 'challenge'
        ? `${completionCount} / ${target}`
        : '10 haftalık döngü'

  const secondaryLabel =
    activity.type === 'challenge'
      ? `${getCurrentChallengeWeek(activity)} / ${activity.weeks} hafta`
      : activity.type === 'habit'
        ? '21 gün üst üste tekrar'
        : 'Haftalık tekrar eden görev'

  return (
    <div className="group relative">
      <div
        onClick={onToggle}
        className={`flex cursor-pointer items-center justify-between rounded-[1.1rem] border-2 p-3.5 md:rounded-2xl md:p-4 ${
          isDone
            ? isDarkMode
              ? 'border-stone-800 bg-stone-900 opacity-40'
              : 'border-stone-100 bg-stone-50 opacity-60'
            : isMissed
              ? isDarkMode
                ? 'border-amber-900/40 bg-amber-950/20 text-amber-100'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            : isDarkMode
              ? 'border-stone-700 bg-stone-800 text-stone-200'
              : 'border-stone-100 bg-white text-stone-800'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 ${isDone ? 'border-rose-500 bg-rose-500 text-white' : isDarkMode ? 'border-stone-600 bg-stone-800' : 'border-stone-200 bg-white'}`}>
            {isDone && <CheckCircle2 size={16} />}
          </div>
          <div>
            <h4 className={`text-sm font-medium ${isDone ? 'line-through text-stone-500' : ''}`}>{activity.title}</h4>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider opacity-60">{activity.duration} dk</span>
              <span className="rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-widest">
                {activity.type === 'habit' ? 'Alışkanlık' : activity.type === 'challenge' ? 'Challenge' : 'Rutin'}
              </span>
              {isMissed && (
                <span className="text-[10px] uppercase tracking-widest text-amber-500">
                  Yapılmadı
                </span>
              )}
              <span className="text-[10px] uppercase tracking-widest text-rose-500">{progressLabel}</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">{secondaryLabel}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
        className={`absolute -right-2 -top-2 rounded-full border p-1.5 opacity-0 transition group-hover:opacity-100 ${
          isDarkMode ? 'border-stone-700 bg-[#2A2A2A] text-stone-500' : 'border-stone-100 bg-white text-stone-300'
        }`}
      >
        <X size={12} />
      </button>
    </div>
  )
}

function CongratsModal({ data, onClose }) {
  const isChallenge = data.type === 'challenge'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/90 p-6 text-center text-white backdrop-blur-xl">
      <div className="w-full max-w-md space-y-6 rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            title="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        {isChallenge ? (
          <div className="overflow-hidden rounded-[2rem] bg-[#8e47ef]">
            <img
              src="/dance.gif"
              alt="Kutlama dansı"
              className="mx-auto aspect-square w-full max-w-[320px] object-cover"
            />
          </div>
        ) : (
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.6)]">
            <Star size={64} className="text-stone-900" />
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-4xl font-black tracking-tighter md:text-5xl">TEBRİKLER!</h2>
          <p className="text-lg italic text-rose-100 md:text-xl">
            {isChallenge
              ? `"${data.title}" challenge'ını tamamladın. Disiplinin sahnede ve bu kutlamayı sonuna kadar hak ettin!`
              : `"${data.title}" hedefini başarıyla tamamladın.`}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-[2rem] bg-white px-8 py-4 font-bold text-rose-900 transition hover:bg-rose-50"
        >
          Harika, devam edelim
        </button>
      </div>
    </div>
  )
}

function WeeklySummaryModal({ days, isDarkMode, onClose }) {
  const todayKey = formatDate(new Date())
  const totalDone = days.reduce(
    (sum, day) => sum + day.items.filter((item) => item.done).length,
    0,
  )
  const totalPlanned = days.reduce((sum, day) => sum + day.items.length, 0)

  return (
    <div className="fixed inset-0 z-[185] flex items-end justify-center bg-stone-950/65 p-0 backdrop-blur-md md:items-center md:p-4">
      <div
        className={`w-full max-w-3xl rounded-t-[2rem] border shadow-2xl md:rounded-[2.2rem] ${
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
              Haftalık Özet
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Bu hafta toplam {totalPlanned} aktivite planlandı, {totalDone} tanesi tamamlandı.
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

        <div className="max-h-[78vh] space-y-3 overflow-y-auto px-4 py-4 md:space-y-4 md:px-6 md:py-6">
          {days.map((day) => (
            <div
              key={day.dateKey}
              className={`rounded-[1.4rem] border p-4 ${
                day.dateKey === todayKey
                  ? isDarkMode
                    ? 'border-rose-900/30 bg-rose-900/10'
                    : 'border-rose-200 bg-rose-50/80'
                  : isDarkMode
                    ? 'border-stone-800 bg-stone-900/40'
                    : 'border-stone-100 bg-stone-50/60'
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                    {getDayName(day.date)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {day.date.toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <p>{day.items.filter((item) => item.done).length} tamamlandı</p>
                  <p>{day.items.length} planlandı</p>
                </div>
              </div>

              {day.items.length === 0 ? (
                <p className="text-sm italic text-stone-500">Bu gün için aktivite planı yok.</p>
              ) : (
                <div className="space-y-2">
                  {day.items.map((item) => (
                    <div
                      key={`${day.dateKey}-${item.id}`}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
                        item.done
                          ? isDarkMode
                            ? 'bg-emerald-950/30 text-emerald-300'
                            : 'bg-emerald-50 text-emerald-700'
                          : isDarkMode
                            ? 'bg-stone-800 text-stone-300'
                            : 'bg-white text-stone-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] opacity-70">
                          {item.period === 'morning' ? 'Sabah' : 'Akşam'} · {item.duration} dk
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold">
                        {item.done ? 'Yapıldı' : day.dateKey < todayKey ? 'Kaçtı' : 'Planlı'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
