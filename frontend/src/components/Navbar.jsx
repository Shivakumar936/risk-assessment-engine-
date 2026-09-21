import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

export default function Navbar() {
  const navigate         = useNavigate()
  const location         = useLocation()
  const { logout, user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { path: '/',          label: 'Dashboard' },
    { path: '/risks',     label: 'Risks'     },
    { path: '/analytics', label: 'Analytics' },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bg-primary text-white shadow sticky top-0 z-30">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* ── Logo (left) ── */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 shrink-0 min-w-0
                       hover:opacity-80 transition"
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-semibold tracking-wide text-sm
                             sm:text-base lg:text-lg truncate">
              <span className="sm:hidden">RAE</span>
              <span className="hidden sm:inline">Risk Assessment Engine</span>
            </span>
          </button>

          {/* ── Right side: links + user + logout ── */}
          <div className="hidden md:flex items-center gap-1">

            {/* nav links */}
            {links.map(({ path, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium
                            transition
                            ${isActive(path)
                              ? 'bg-white bg-opacity-20 text-white'
                              : 'text-blue-100 hover:bg-white hover:bg-opacity-10'
                                + ' hover:text-white'}`}
              >
                {label}
              </button>
            ))}

            {/* divider */}
            <div className="w-px h-5 bg-blue-400 bg-opacity-40 mx-2" />

            {/* user avatar + name */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full
                                flex items-center justify-center text-xs
                                font-bold shrink-0">
                  {user.username?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden lg:block text-xs leading-tight">
                  <p className="font-medium truncate max-w-[120px]">
                    {user.username}
                  </p>
                  <p className="text-blue-200">{user.role ?? 'VIEWER'}</p>
                </div>
              </div>
            )}

            {/* logout */}
            <button
              onClick={logout}
              className="ml-1 px-3 py-1.5 border border-blue-300 rounded-lg
                         text-xs font-medium hover:bg-white hover:text-primary
                         transition whitespace-nowrap"
            >
              Logout
            </button>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-white
                       hover:bg-opacity-10 transition"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none"
                stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none"
                stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-blue-700
                        bg-primary px-3 sm:px-4 py-2 space-y-1">

          {links.map(({ path, label }) => (
            <button
              key={path}
              onClick={() => { navigate(path); setMenuOpen(false) }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm
                          font-medium transition
                          ${isActive(path)
                            ? 'bg-white bg-opacity-20 text-white'
                            : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}
            >
              {label}
            </button>
          ))}

          {user && (
            <div className="flex items-center gap-3 px-4 py-3
                            border-t border-blue-700 mt-1 pt-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full
                              flex items-center justify-center text-xs
                              font-bold shrink-0">
                {user.username?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="text-xs flex-1 min-w-0">
                <p className="font-medium truncate">{user.username}</p>
                <p className="text-blue-200">{user.role ?? 'VIEWER'}</p>
              </div>
              <button
                onClick={() => { logout(); setMenuOpen(false) }}
                className="px-3 py-1.5 border border-blue-300 rounded-lg
                           text-xs font-medium hover:bg-white hover:text-primary
                           transition whitespace-nowrap shrink-0"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}