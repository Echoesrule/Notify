const stats = [
  { label: 'Courses Enrolled', value: '24', icon: 'fa-book-open', color: '#D8FF4F' },
  { label: 'Assignments Due', value: '8', icon: 'fa-file-pen', color: '#FF6B6B' },
  { label: 'Completed Lessons', value: '142', icon: 'fa-circle-check', color: '#4ECDC4' },
  { label: 'Overall Progress', value: '78%', icon: 'fa-chart-line', color: '#A78BFA' },
]

export default function StatsCards() {
  return (
    <div className="grid grid-cols-4 gap-5">
      {stats.map((s) => (
        <div key={s.label} className="bg-card rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20` }}>
              <i className={`fas ${s.icon} text-base`} style={{ color: s.color }} />
            </div>
          </div>
          <div className="text-[28px] font-bold text-primary-text leading-none mb-1.5">{s.value}</div>
          <div className="text-sm text-secondary-text font-medium">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
