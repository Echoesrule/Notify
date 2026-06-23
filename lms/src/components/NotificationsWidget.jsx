const notifications = [
  { icon: 'fa-calendar-check', color: '#D8FF4F', text: 'Upcoming exam in Mathematics', time: '2 hours ago' },
  { icon: 'fa-file-pen', color: '#FF6B6B', text: 'Assignment reminder: UX Research due tomorrow', time: '5 hours ago' },
  { icon: 'fa-book-open', color: '#4ECDC4', text: 'New course material available in Physics', time: '1 day ago' },
  { icon: 'fa-users', color: '#A78BFA', text: 'Group project update: Design phase starting soon', time: '2 days ago' },
]

export default function NotificationsWidget() {
  return (
    <div className="bg-card rounded-[16px] p-5 border border-border/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <h3 className="text-sm font-bold text-primary-text mb-5">Notifications</h3>
      <div className="space-y-4">
        {notifications.map((n, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${n.color}20` }}>
              <i className={`fas ${n.icon} text-sm`} style={{ color: n.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary-text leading-snug">{n.text}</p>
              <span className="text-[11px] text-secondary-text mt-1 block">{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
