const todos = [
  {
    title: 'Create a digital logo for a brand business',
    desc: 'Design a modern logo that reflects the brand identity and values of the company.',
    progress: 'In Progress',
    avatars: ['JD', 'AK', 'MR'],
    btn: 'Open Assignment',
  },
  {
    title: 'Design a packaging concept for a new product',
    desc: 'Develop a creative packaging design that stands out on shelves and appeals to the target audience.',
    progress: 'Design Phase',
    avatars: ['PL', 'SN'],
    btn: 'Start Design',
  },
]

export default function ToDoSection() {
  return (
    <section>
      <h2 className="text-lg font-bold text-primary-text mb-4">To Do List</h2>
      <div className="grid grid-cols-2 gap-5">
        {todos.map((todo, i) => (
          <div key={i} className="bg-navy rounded-[20px] p-6 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-lime">
                  {todo.progress}
                </span>
              </div>
              <h3 className="text-[17px] font-bold leading-snug mb-2">{todo.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-5">{todo.desc}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center -space-x-2">
                {todo.avatars.map((a, j) => (
                  <div key={j} className="w-8 h-8 rounded-full bg-lime text-navy text-[11px] font-bold flex items-center justify-center border-2 border-navy">
                    {a}
                  </div>
                ))}
              </div>
              <button className="bg-lime text-navy text-sm font-bold px-5 py-2.5 rounded-xl hover:brightness-105 transition-all duration-200">
                {todo.btn}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
