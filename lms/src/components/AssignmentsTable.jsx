const assignments = [
  { name: 'Brand Identity Design', course: 'Graphic Design', progress: 85, due: 'Jun 28, 2026', status: 'Completed' },
  { name: 'UX Research Report', course: 'UX Design', progress: 60, due: 'Jul 5, 2026', status: 'In Progress' },
  { name: 'React Component Library', course: 'Web Dev', progress: 35, due: 'Jul 12, 2026', status: 'In Progress' },
  { name: 'Data Analysis Project', course: 'Data Science', progress: 90, due: 'Jun 25, 2026', status: 'Review' },
  { name: 'Mobile App Wireframes', course: 'UI Design', progress: 10, due: 'Aug 1, 2026', status: 'Pending' },
]

export default function AssignmentsTable() {
  return (
    <section>
      <h2 className="text-lg font-bold text-primary-text mb-4">My Assignments</h2>
      <div className="bg-card rounded-[16px] overflow-hidden border border-border/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Assignment', 'Course', 'Progress', 'Due Date', 'Status'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-secondary-text uppercase tracking-wider px-5 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                <td className="px-5 py-4 text-sm font-semibold text-primary-text">{a.name}</td>
                <td className="px-5 py-4 text-sm text-secondary-text">{a.course}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-bg overflow-hidden max-w-[120px]">
                      <div className="h-full rounded-full bg-lime" style={{ width: `${a.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-secondary-text">{a.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-secondary-text">{a.due}</td>
                <td className="px-5 py-4">
                  <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${
                    a.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    a.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    a.status === 'Review' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
