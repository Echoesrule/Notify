const navTop = [
  { label: 'Home', icon: 'fa-house', active: true },
  { label: 'Dashboard', icon: 'fa-gauge-high', active: false },
  { label: 'Courses', icon: 'fa-book-open', active: false },
  { label: 'Calendar', icon: 'fa-calendar', active: false },
  { label: 'Grades', icon: 'fa-star', active: false },
  { label: 'Reports', icon: 'fa-chart-simple', active: false },
]

const navBottom = [
  { label: 'Messages', icon: 'fa-comment-dots' },
  { label: 'Community', icon: 'fa-users' },
]

const footerLinks = [
  { label: 'Settings', icon: 'fa-gear' },
  { label: 'Help Center', icon: 'fa-circle-question' },
  { label: 'Sign Out', icon: 'fa-arrow-right-from-bracket' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-navy flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-[72px] shrink-0">
        <div className="w-9 h-9 rounded-xl bg-lime flex items-center justify-center">
          <i className="fas fa-graduation-cap text-navy text-sm" />
        </div>
        <span className="text-white text-xl font-bold tracking-tight">Notify</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navTop.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              item.active
                ? 'bg-lime text-navy'
                : 'text-[#8A8A8A] hover:text-white hover:bg-white/5'
            }`}
          >
            <i className={`fas ${item.icon} w-5 text-center text-base`} />
            <span>{item.label}</span>
          </a>
        ))}

        {/* Divider */}
        <div className="border-t border-white/10 my-4" />

        {navBottom.map((item) => (
          <a
            key={item.label}
            href="#"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#8A8A8A] hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <i className={`fas ${item.icon} w-5 text-center text-base`} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-6 space-y-1 border-t border-white/10 pt-4">
        {footerLinks.map((item) => (
          <a
            key={item.label}
            href="#"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#8A8A8A] hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <i className={`fas ${item.icon} w-5 text-center text-base`} />
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </aside>
  )
}
