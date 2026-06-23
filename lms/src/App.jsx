import Sidebar from './components/Sidebar'
import Header from './components/Header'
import StatsCards from './components/StatsCards'
import ToDoSection from './components/ToDoSection'
import AssignmentsTable from './components/AssignmentsTable'
import HomeworkProgress from './components/HomeworkProgress'
import NotificationsWidget from './components/NotificationsWidget'

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />

      {/* Main area: pushes right by sidebar width */}
      <div className="ml-[260px] min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 flex gap-6 p-8">
          {/* Center column */}
          <div className="flex-1 space-y-7 min-w-0">
            {/* Welcome */}
            <div>
              <h1 className="text-[26px] font-bold text-primary-text">Dashboard</h1>
              <p className="text-sm text-secondary-text mt-1">Welcome back, here's your academic overview.</p>
            </div>

            <StatsCards />
            <ToDoSection />
            <AssignmentsTable />
          </div>

          {/* Right panel */}
          <aside className="w-[320px] shrink-0 space-y-5">
            <HomeworkProgress />
            <NotificationsWidget />
          </aside>
        </main>
      </div>
    </div>
  )
}
