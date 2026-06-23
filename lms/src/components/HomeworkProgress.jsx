const subjects = [
  { name: 'Mathematics', percent: 85, color: '#D8FF4F' },
  { name: 'Physics', percent: 65, color: '#4ECDC4' },
  { name: 'Literature', percent: 45, color: '#A78BFA' },
  { name: 'UX Design', percent: 90, color: '#FF6B6B' },
  { name: 'Marketing Design', percent: 30, color: '#FFD93D' },
]

export default function HomeworkProgress() {
  return (
    <div className="bg-card rounded-[16px] p-5 border border-border/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <h3 className="text-sm font-bold text-primary-text mb-5">Homework Progress</h3>
      <div className="space-y-5">
        {subjects.map((s) => (
          <div key={s.name} className="flex items-center gap-4">
            {/* Circular Progress */}
            <div className="relative w-11 h-11 shrink-0">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#F5F6F8" strokeWidth="3.5" />
                <circle
                  cx="22" cy="22" r="18"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - s.percent / 100)}`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-primary-text">
                {s.percent}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-primary-text truncate">{s.name}</div>
              <div className="text-xs text-secondary-text mt-0.5">{s.percent}% complete</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
