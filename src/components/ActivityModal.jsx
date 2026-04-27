import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { addDays, formatDate, getDayName, isWeekend } from '../lib/utils'

const typeContent = {
  routine: {
    title: 'Rutin',
    description:
      'Gündelik işlerini ekle. Her iş 10 hafta süreyle seçtiğin günlere eklenir. Süre sonunda tekrar eklemek için sorulur.',
  },
  challenge: {
    title: 'Challenge',
    description:
      'İstediğin sürede challenge başlat, tamamlama durumunu kontrol et. Sonunda sana büyük bir kutlama yapacağız! :)',
  },
  habit: {
    title: 'Alışkanlık',
    description:
      'Edinmek istediğin alışkanlığı 21 gün boyunca takvimine ekleyeceğim. Sonunda rutin olmasına sen karar ver!',
  },
}

const dayOptions = [
  { id: 1, label: 'Pt' },
  { id: 2, label: 'Sa' },
  { id: 3, label: 'Ça' },
  { id: 4, label: 'Pe' },
  { id: 5, label: 'Cu' },
  { id: 6, label: 'Ct' },
  { id: 0, label: 'Pz' },
]

export function ActivityModal({ onClose, onAdd, isDarkMode, profile, activities }) {
  const [type, setType] = useState('routine')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(15)
  const [period, setPeriod] = useState('evening')
  const [selectedDays, setSelectedDays] = useState([])
  const [weeks, setWeeks] = useState(4)
  const [startDate, setStartDate] = useState(formatDate(new Date()))
  const [error, setError] = useState('')
  const inputBg = isDarkMode ? 'bg-[#262626]' : 'bg-stone-50'
  const currentInfo = typeContent[type]

  const toggleDay = (dayId) => {
    setSelectedDays((current) =>
      current.includes(dayId) ? current.filter((item) => item !== dayId) : [...current, dayId],
    )
  }

  const usagePreview = useMemo(() => {
    const normalizedStart = formatDate(type === 'routine' ? new Date() : startDate)

    const datesToInspect =
      type === 'habit'
        ? Array.from({ length: 21 }, (_, index) => formatDate(addDays(normalizedStart, index)))
        : collectMatchingDates(normalizedStart, selectedDays, type === 'routine' ? 10 : weeks)

    if (datesToInspect.length === 0) {
      const fallbackCapacity = profile?.weekdayPeriods?.[period] || 0
      return { capacity: fallbackCapacity, existingLoad: 0, selectedDate: null, selectedDayName: null }
    }

    const ranked = datesToInspect.map((dateKey) => {
      const capacity = isWeekend(dateKey) ? profile?.weekendPeriods?.[period] || 0 : profile?.weekdayPeriods?.[period] || 0

      const existingLoad = activities.reduce((total, item) => {
        if (item.period !== period) return total
        if (dateKey < item.start_date || dateKey > item.end_date) return total
        if (item.type === 'habit') return total + (Number(item.duration) || 0)

        const dateDay = new Date(`${dateKey}T12:00:00`).getDay()
        return (item.selected_days || []).includes(dateDay) ? total + (Number(item.duration) || 0) : total
      }, 0)

      return {
        dateKey,
        capacity,
        existingLoad,
        selectedDayName: getDayName(new Date(`${dateKey}T12:00:00`)),
      }
    })

    ranked.sort((left, right) => {
      const leftRatio = left.capacity > 0 ? left.existingLoad / left.capacity : left.existingLoad
      const rightRatio = right.capacity > 0 ? right.existingLoad / right.capacity : right.existingLoad
      if (rightRatio !== leftRatio) return rightRatio - leftRatio
      if (right.existingLoad !== left.existingLoad) return right.existingLoad - left.existingLoad
      return left.dateKey.localeCompare(right.dateKey)
    })

    return ranked[0]
  }, [activities, period, profile, selectedDays, startDate, type, weeks])

  const currentMinutes = usagePreview.existingLoad
  const plannedMinutes = Number(duration) || 0
  const totalCapacity = usagePreview.capacity
  const totalWithPlanned = currentMinutes + plannedMinutes
  const currentWidth = totalCapacity > 0 ? Math.min(100, (currentMinutes / totalCapacity) * 100) : 0
  const plannedWidth =
    totalCapacity > 0 ? Math.min(100, (Math.min(totalCapacity, totalWithPlanned) / totalCapacity) * 100) : 0
  const isWithinCapacity = totalCapacity === 0 ? plannedMinutes === 0 : totalWithPlanned <= totalCapacity

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-900/60 p-0 backdrop-blur-md md:items-center md:p-4">
      <div
        className={`w-full max-w-xl overflow-hidden rounded-t-[2rem] border shadow-2xl md:rounded-[2.5rem] ${
          isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-transparent bg-white'
        }`}
      >
        <div
          className={`flex items-start justify-between gap-4 border-b px-4 py-4 md:p-8 ${
            isDarkMode ? 'border-stone-800 bg-stone-900' : 'border-rose-50 bg-rose-50/20'
          }`}
        >
          <div>
            <h3 className={`text-xl font-light md:text-2xl ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
              Aktivite <span className="font-medium text-rose-500">Ekle</span>
            </h3>
            <p className="text-sm font-light leading-6 text-stone-500">Planlı bir yaşam, özgür bir zihindir.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-2 ${isDarkMode ? 'text-stone-500 hover:bg-stone-800' : 'text-stone-300 hover:bg-white'}`}
          >
            <X />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-5 overflow-y-auto px-4 py-4 md:max-h-[75vh] md:space-y-8 md:p-8">
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {['routine', 'challenge', 'habit'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={`rounded-[1rem] border py-3 text-[11px] font-bold transition md:rounded-2xl md:text-xs ${
                  type === item
                    ? item === 'routine'
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : item === 'challenge'
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-stone-900 bg-stone-900 text-white'
                    : isDarkMode
                      ? 'border-stone-700 bg-stone-800 text-stone-400'
                      : 'border-transparent bg-stone-50 text-stone-500'
                }`}
              >
                {item === 'routine' ? 'RUTİN' : item === 'challenge' ? 'CHALLENGE' : 'ALIŞKANLIK'}
              </button>
            ))}
          </div>

          <div className={`rounded-[1.25rem] border p-4 md:rounded-2xl ${isDarkMode ? 'border-stone-700 bg-stone-800/60' : 'border-rose-100 bg-rose-50/60'}`}>
            <p className="text-sm font-semibold text-rose-500">{currentInfo.title}</p>
            <p className={`mt-1 text-sm leading-6 ${isDarkMode ? 'text-stone-300' : 'text-stone-600'}`}>
              {currentInfo.description}
            </p>
          </div>

          <div className="space-y-5 md:space-y-6">
            <Field label="Aktivite Adı">
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Örn: 30 Dakika Yürüyüş"
                className={`w-full rounded-2xl p-4 md:p-5 outline-none ${inputBg} ${isDarkMode ? 'text-white' : 'text-stone-800'}`}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <Field label="Süre (Dakika)">
                <input
                  type="number"
                  value={duration}
                  onChange={(event) => setDuration(parseInt(event.target.value, 10) || 0)}
                  className={`w-full rounded-2xl p-4 md:p-5 ${inputBg} ${isDarkMode ? 'text-white' : 'text-stone-800'}`}
                />
              </Field>
              <Field label="Günün Hangi Bölümü?">
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className={`w-full rounded-2xl p-4 md:p-5 ${inputBg} ${isDarkMode ? 'text-white' : 'text-stone-800'}`}
                >
                  <option value="morning">Sabah Aktivite Dönemi</option>
                  <option value="evening">Akşam Aktivite Dönemi</option>
                </select>
              </Field>
            </div>

            <div className={`rounded-[1.25rem] border p-4 text-sm md:rounded-2xl ${isDarkMode ? 'border-stone-700 bg-stone-800/60 text-stone-300' : 'border-stone-100 bg-stone-50/70 text-stone-600'}`}>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-3">
                <div>
                  <p>
                    En dolu gün:{' '}
                    <span className="font-semibold text-rose-500">{usagePreview.selectedDayName || 'Henüz seçilmedi'}</span>
                    {usagePreview.selectedDate ? ` (${usagePreview.selectedDate})` : ''}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">Mevcut yük solda, eklemek istediğin süre yeşil katman olarak gösterilir.</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-rose-500">{totalCapacity} dk</span>
              </div>

              <div className={`mt-4 h-3 w-full overflow-hidden rounded-full ${isDarkMode ? 'bg-stone-900' : 'bg-white'}`}>
                <div className="relative h-full w-full">
                  <div className={`absolute inset-y-0 left-0 rounded-full ${isDarkMode ? 'bg-rose-900/80' : 'bg-rose-200'}`} style={{ width: `${currentWidth}%` }} />
                  <div className={`absolute inset-y-0 left-0 rounded-full ${isWithinCapacity ? 'bg-emerald-500/85' : 'bg-amber-500/85'}`} style={{ width: `${plannedWidth}%` }} />
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
                <div className="text-sm">
                  <span className="font-semibold">{currentMinutes} dk</span>
                  <span className="text-stone-400"> mevcut</span>
                  <span className="text-stone-400"> + </span>
                  <span className={`font-semibold ${isWithinCapacity ? 'text-emerald-500' : 'text-amber-500'}`}>{plannedMinutes} dk</span>
                  <span className="text-stone-400"> yeni</span>
                </div>
                <div className={`text-xs font-semibold ${isWithinCapacity ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {isWithinCapacity ? `${totalWithPlanned} dk uygun` : `${totalWithPlanned} dk taşma`}
                </div>
              </div>
            </div>

            {type !== 'habit' && (
              <Field label="Uygulanacak Günler">
                <div className="grid grid-cols-4 gap-2 md:flex md:gap-2">
                  {dayOptions.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`rounded-xl border py-3 text-[10px] font-bold md:flex-1 ${
                        selectedDays.includes(day.id)
                          ? isDarkMode
                            ? 'border-stone-200 bg-stone-200 text-stone-900'
                            : 'border-stone-900 bg-stone-900 text-white'
                          : isDarkMode
                            ? 'border-stone-700 bg-stone-800 text-stone-400'
                            : 'border-stone-100 bg-white text-stone-500'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {type === 'challenge' && (
              <Field label="Challenge Süresi (Hafta)">
                <input
                  type="number"
                  value={weeks}
                  onChange={(event) => setWeeks(parseInt(event.target.value, 10) || 1)}
                  className={`w-full rounded-2xl p-4 md:p-5 ${inputBg} ${isDarkMode ? 'text-white' : 'text-stone-800'}`}
                />
              </Field>
            )}

            {type === 'habit' && (
              <Field label="Başlangıç Tarihi">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className={`w-full rounded-2xl p-4 md:p-5 ${inputBg} ${isDarkMode ? 'text-white' : 'text-stone-800'}`}
                />
              </Field>
            )}
          </div>

          {error && <p className="text-center text-sm text-rose-500">{error}</p>}
          <button
            type="button"
            onClick={async () => {
              setError('')
              try {
                await onAdd({ type, title, duration, period, selectedDays, weeks, startDate })
              } catch (err) {
                setError(err.message || 'Aktivite kaydı sırasında bir hata oluştu.')
              }
            }}
          disabled={!title || !selectedDate}
            className="w-full rounded-[1.4rem] bg-rose-600 py-4 font-bold text-white disabled:opacity-50 md:rounded-[2rem] md:py-5"
          >
            Sisteme Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

function collectMatchingDates(startDate, dayIndexes, weekCount) {
  const matches = []
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  for (let offset = 0; offset < weekCount * 7; offset += 1) {
    const candidate = addDays(start, offset)
    if (dayIndexes.includes(candidate.getDay())) matches.push(formatDate(candidate))
  }

  return matches
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-stone-500">
        {label}
      </label>
      {children}
    </div>
  )
}
