export default function Header() {
  return (
    <header className="flex items-center justify-between gap-4 h-[72px] px-8 bg-white border-b border-border">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md bg-bg rounded-xl px-4 py-2.5 border border-border">
        <i className="fas fa-search text-secondary-text text-sm" />
        <input
          type="text"
          placeholder="Search courses, lessons..."
          className="bg-transparent border-none outline-none text-sm text-primary-text w-full placeholder:text-secondary-text/60"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-secondary-text hover:text-primary-text transition-colors relative">
          <i className="fas fa-bell text-lg" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
        </button>
        <button className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-secondary-text hover:text-primary-text transition-colors">
          <i className="fas fa-gear text-lg" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime to-green-400 flex items-center justify-center text-navy font-bold text-sm">
          JD
        </div>
        <button className="bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all duration-200 flex items-center gap-2">
          <i className="fas fa-plus" />
          Add New Course
        </button>
      </div>
    </header>
  )
}
