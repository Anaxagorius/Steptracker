import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/routes', label: 'Routes' },
  { to: '/activity-log', label: 'Activity Log' },
  { to: '/profile', label: 'Profile' },
]

export default function NavBar() {
  const { pathname } = useLocation()

  return (
    <nav className="bg-indigo-700 text-white shadow-lg">
      <div className="container mx-auto px-4 max-w-5xl flex items-center gap-6 h-14">
        <span className="font-bold text-xl tracking-tight select-none">🏃 StrideQuest</span>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`text-sm font-medium hover:text-indigo-200 transition-colors ${
              pathname === l.to ? 'underline underline-offset-4 text-white' : 'text-indigo-100'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
