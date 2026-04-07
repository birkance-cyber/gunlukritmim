import { useMemo, useState } from 'react'
import { Heart, Search, Trophy, Zap } from 'lucide-react'
import { addDays, formatDate } from '../lib/utils'

const typeOptions = [
  { value: 'all', label: 'Tümü' },
  { value: 'routine', label: 'Rutin' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'habit', label: 'Alışkanlık' },
]

const sortOptions = [
  { value: 'recent-entry', label: 'Sisteme giriş tarihi' },
  { value: 'recent-update', label: 'Değişiklik tarihi' },
]

const formatShortDate = (value) => {
  if (!value) return 'Bilinmiyor'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getLatestUpdate = (activity) => {
  const completions = activity.completions || []
  const latestCompletion = completions.length
    ? completions.slice().sort((a, b) => new Date(b) - new Date(a))[0]
    : null

  return latestCompletion || activity.updated_at || activity.created_at || activity.start_date
}

const getBadge = (activity) => {
  if (activity.type === 'habit') return 'Faydalı Alışkanlık'
  if (activity.type === 'challenge') return `Challenge · ${activity.weeks} hafta`
  return 'Rutin'
}

const getTarget = (activity) => {
  if (activity.type === 'habit') return 21
  if (activity.type === 'challenge') {
    return (activity.weeks || 0) * ((activity.selected_days || []).length || 0)
  }
  return null
}

const enumeratePlannedDates = (activity, rangeStart, rangeEnd) => {
  const start = new Date(activity.start_date)
  const end = new Date(activity.end_date)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const effectiveStart = new Date(Math.max(start.getTime(), rangeStart.getTime()))
  const effectiveEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()))
  if (effectiveStart > effectiveEnd) return []

  const dates = []
  for (
    let cursor = new Date(effectiveStart);
    cursor <= effectiveEnd;
    cursor = addDays(cursor, 1)
  ) {
    const dateKey = formatDate(cursor)
    if (activity.type === 'habit') {
      dates.push(dateKey)
    } else if ((activity.selected_days || []).includes(cursor.getDay())) {
      dates.push(dateKey)
    }
  }

  return dates
}

export function StatsView({ activities, isDarkMode }) {
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [sortBy, setSortBy] = useState('recent-entry')

  const yearlyStats = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const plannedSet = new Set()
    const completedSet = new Set()

    activities.forEach((activity) => {
      const plannedDates = enumeratePlannedDates(activity, yearStart, now)
      plannedDates.forEach((dateKey) => plannedSet.add(`${activity.id}-${dateKey}`))

      ;(activity.completions || []).forEach((dateKey) => {
        if (dateKey >= formatDate(yearStart) && dateKey <= formatDate(now)) {
          completedSet.add(`${activity.id}-${dateKey}`)
        }
      })
    })

    const plannedCount = plannedSet.size
    const completedCount = completedSet.size
    const missedCount = Math.max(0, plannedCount - completedCount)
    const completionRate = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0

    return { plannedCount, completedCount, missedCount, completionRate, year: now.getFullYear() }
  }, [activities])

  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR')

    const next = activities.filter((activity) => {
      const matchesType = selectedType === 'all' ? true : activity.type === selectedType
      const matchesQuery = normalizedQuery
        ? activity.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery)
        : true
      return matchesType && matchesQuery
    })

    next.sort((left, right) => {
      const leftDate =
        sortBy === 'recent-update'
          ? new Date(getLatestUpdate(left))
          : new Date(left.created_at || left.start_date)
      const rightDate =
        sortBy === 'recent-update'
          ? new Date(getLatestUpdate(right))
          : new Date(right.created_at || right.start_date)

      return rightDate - leftDate
    })

    return next
  }, [activities, query, selectedType, sortBy])

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="px-1 md:px-2">
        <h2 className={`text-xl font-light md:text-2xl ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
          Gelişim <span className="font-medium text-rose-600">Yolculuğun</span>
        </h2>
        <p className="mt-1 text-sm leading-6 text-stone-500">
          {yearlyStats.year} yılında bugüne kadar planlanan aktivitelerin gerçekleşme oranı burada sıfırdan takip edilir.
        </p>
      </div>

      <div className={`max-w-md rounded-[1.4rem] border p-4 md:rounded-[1.7rem] ${
        isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'
      }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">Plana Uyum</p>
              <p className={`mt-2 text-3xl font-semibold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                %{yearlyStats.completionRate}
              </p>
            </div>
            <div className="text-right text-xs text-stone-500">
              <p>{yearlyStats.completedCount} yapıldı</p>
              <p>{yearlyStats.plannedCount} planlandı</p>
            </div>
          </div>
          <div className={`mt-4 h-3 w-full overflow-hidden rounded-full ${isDarkMode ? 'bg-stone-800' : 'bg-stone-100'}`}>
            <div className="h-full bg-rose-500" style={{ width: `${yearlyStats.completionRate}%` }} />
          </div>
          <p className="mt-3 text-sm text-stone-500">
            Yapılmadı sayılan plan: {yearlyStats.missedCount}
          </p>
      </div>

      <div
        className={`grid gap-3 rounded-[1.5rem] border p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:rounded-[2rem] md:p-4 ${
          isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'
        }`}
      >
        <label className="relative block">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Aktivite ara"
            className={`w-full rounded-2xl py-3 pl-11 pr-4 outline-none ${
              isDarkMode ? 'bg-stone-800 text-white' : 'bg-stone-50 text-stone-800'
            }`}
          />
        </label>

        <select
          value={selectedType}
          onChange={(event) => setSelectedType(event.target.value)}
          className={`rounded-2xl px-4 py-3 outline-none ${
            isDarkMode ? 'bg-stone-800 text-white' : 'bg-stone-50 text-stone-800'
          }`}
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className={`rounded-2xl px-4 py-3 outline-none ${
            isDarkMode ? 'bg-stone-800 text-white' : 'bg-stone-50 text-stone-800'
          }`}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={`overflow-hidden rounded-[1.5rem] border md:rounded-[2rem] ${
        isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'
      }`}>
        {filteredActivities.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm italic text-stone-500 md:py-16">
            Eşleşen aktivite bulunamadı.
          </div>
        ) : (
          filteredActivities.map((activity, index) => {
            const count = activity.completions?.length || 0
            const target = getTarget(activity)
            const totalMinutes = count * (activity.duration || 0)
            const progress = target ? Math.min(100, (count / target) * 100) : 100
            const latestUpdate = getLatestUpdate(activity)

            return (
              <div
                key={activity.id}
                className={`grid gap-3 px-4 py-4 md:grid-cols-[auto_1.4fr_0.8fr_0.8fr] md:items-center md:gap-4 md:px-5 ${
                  index !== filteredActivities.length - 1
                    ? isDarkMode
                      ? 'border-b border-stone-800'
                      : 'border-b border-rose-50'
                    : ''
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl md:h-11 md:w-11 ${
                    activity.type === 'habit'
                      ? isDarkMode
                        ? 'bg-stone-800 text-stone-300'
                        : 'bg-stone-50 text-stone-500'
                      : activity.type === 'challenge'
                        ? isDarkMode
                          ? 'bg-amber-900/20 text-amber-400'
                          : 'bg-amber-50 text-amber-500'
                        : isDarkMode
                          ? 'bg-rose-900/20 text-rose-400'
                          : 'bg-rose-50 text-rose-500'
                  }`}
                >
                  {activity.type === 'habit' ? <Heart size={18} /> : activity.type === 'challenge' ? <Trophy size={18} /> : <Zap size={18} />}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`truncate font-semibold ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`}>
                      {activity.title}
                    </h4>
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">
                      {getBadge(activity)}
                    </span>
                  </div>
                  {target ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-stone-500">
                        <span>{count} / {target}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className={`h-2 w-full overflow-hidden rounded-full ${isDarkMode ? 'bg-stone-800' : 'bg-stone-100'}`}>
                        <div
                          className={`h-full ${
                            activity.type === 'habit'
                              ? 'bg-stone-500'
                              : activity.type === 'challenge'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-stone-500">10 haftalık rutin döngüsü</p>
                  )}
                </div>

                <div className="flex items-baseline justify-between gap-3 md:block">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Toplam Süre</p>
                  <p className={`text-base font-semibold md:mt-1 md:text-lg ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                    {totalMinutes} dk
                  </p>
                </div>

                <div className="space-y-1 text-xs md:text-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Tarihler</p>
                  <p className={isDarkMode ? 'text-stone-300' : 'text-stone-700'}>
                    Giriş: {formatShortDate(activity.created_at || activity.start_date)}
                  </p>
                  <p className="text-stone-500">Güncelleme: {formatShortDate(latestUpdate)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
