import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, History, Save } from 'lucide-react'
import { formatDate } from '../lib/utils'

const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export function DiaryView({ date, text, onSave, diaries, onSelectDate, isDarkMode }) {
  const [value, setValue] = useState(text)
  const [saving, setSaving] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = new Date(date)
    return new Date(initial.getFullYear(), initial.getMonth(), 1)
  })

  const todayKey = formatDate(new Date())
  const selectedKey = formatDate(date)
  const isToday = selectedKey === todayKey

  useEffect(() => setValue(text), [text, date])

  useEffect(() => {
    const next = new Date(date)
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1))
  }, [date])

  const handleSave = async () => {
    if (!isToday) return
    setSaving(true)
    await onSave(value)
    setTimeout(() => setSaving(false), 700)
  }

  const historyDates = useMemo(
    () => new Set(Object.keys(diaries).map((item) => formatDate(item))),
    [diaries],
  )

  const monthLabel = visibleMonth.toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  })

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const firstWeekday = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []

    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push(null)
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(year, month, day, 12, 0, 0)
      cells.push({
        day,
        key: formatDate(cellDate),
      })
    }

    return cells
  }, [visibleMonth])

  return (
    <div className="grid gap-4 md:grid-cols-4 md:gap-8">
      <div className="space-y-3 md:col-span-1 md:space-y-4">
        <div className="flex items-center gap-2 px-1 font-medium text-rose-500 md:px-2">
          <History size={18} />
          <h3 className="text-xs tracking-[0.18em] md:text-sm md:tracking-widest">Günlük Arşivi</h3>
        </div>

        <div
          className={`rounded-[1.5rem] border p-3 md:rounded-[2rem] md:p-4 ${
            isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                )
              }
              className={`rounded-xl p-2 ${
                isDarkMode ? 'text-stone-400 hover:bg-stone-800' : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold capitalize text-stone-500">{monthLabel}</p>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                )
              }
              className={`rounded-xl p-2 ${
                isDarkMode ? 'text-stone-400 hover:bg-stone-800' : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((label) => (
              <div key={label} className="py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                {label}
              </div>
            ))}

            {calendarDays.map((cell, index) =>
              cell ? (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => historyDates.has(cell.key) && onSelectDate(cell.key)}
                  disabled={!historyDates.has(cell.key)}
                  className={`relative aspect-square rounded-xl text-xs font-semibold transition ${
                    cell.key === selectedKey
                      ? isDarkMode
                        ? 'bg-rose-900/30 text-rose-300'
                        : 'bg-rose-100 text-rose-700'
                      : historyDates.has(cell.key)
                        ? isDarkMode
                          ? 'text-stone-200 hover:bg-stone-800'
                          : 'text-stone-700 hover:bg-stone-100'
                        : isDarkMode
                          ? 'cursor-default text-stone-700'
                          : 'cursor-default text-stone-300'
                  }`}
                >
                  {cell.day}
                  {historyDates.has(cell.key) && (
                    <span
                      className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                        cell.key === selectedKey ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              ) : (
                <div key={`empty-${index}`} className="aspect-square" />
              ),
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 md:col-span-3 md:space-y-6">
        <div className="flex flex-col gap-3 px-1 md:flex-row md:items-start md:justify-between md:px-2">
          <div>
            <h2 className={`text-xl font-light md:text-2xl ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
              Günlük <span className="font-medium text-rose-600">Notlarım</span>
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              {isToday
                ? 'Bugünün izlerini geleceğe bırak. Gün sonunda bu kayıt arşive taşınır ve yarın yeni bir günlük açılır.'
                : 'Arşivlenmiş bir günü görüntülüyorsun. Geçmiş kayıtlar yalnızca okunabilir.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isToday || saving}
            className={`flex w-full items-center justify-center gap-2 rounded-[1.2rem] px-5 py-3 text-sm font-semibold md:w-auto md:rounded-2xl md:px-6 ${
              !isToday
                ? 'bg-stone-300 text-white disabled:cursor-not-allowed'
                : saving
                  ? 'bg-green-600 text-white'
                  : 'bg-rose-600 text-white'
            }`}
          >
            {saving ? <CheckCircle2 size={18} /> : <Save size={18} />}
            {!isToday ? 'Arşiv Kaydı' : saving ? 'Kaydedildi' : 'Notu Kaydet'}
          </button>
        </div>

        <div
          className={`relative min-h-[360px] overflow-hidden rounded-[1.7rem] border p-5 md:min-h-[500px] md:rounded-[2.5rem] md:p-10 ${
            isDarkMode ? 'border-stone-800 bg-[#1A1A1A]' : 'border-rose-50 bg-white'
          }`}
        >
          <div className={`absolute left-0 top-0 h-full w-1.5 md:w-2 ${isDarkMode ? 'bg-rose-900/30' : 'bg-rose-50'}`} />
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={
              isToday
                ? 'Neler yaptın? Neler hissettin? Küçük zaferlerini yaz...'
                : 'Geçmiş günlüğü görüntülüyorsun.'
            }
            readOnly={!isToday}
            className={`min-h-[280px] w-full resize-none bg-transparent text-base leading-8 outline-none md:min-h-[420px] md:text-lg ${
              isDarkMode ? 'text-stone-200' : 'text-stone-700'
            }`}
          />
          <div
            className={`mt-6 flex items-center justify-between border-t pt-6 md:mt-8 md:pt-8 ${
              isDarkMode ? 'border-stone-800 text-stone-500' : 'border-stone-50 text-stone-300'
            }`}
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-rose-400 md:text-xs md:tracking-widest">
              <Calendar size={14} /> {date.toLocaleDateString('tr-TR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
