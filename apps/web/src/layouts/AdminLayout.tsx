import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import {
  Scissors, LayoutDashboard, Calendar, Users,
  Briefcase, TrendingUp, Settings, LogOut, Menu, Bell, UserCheck,
} from 'lucide-react'

const navItems = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard',   end: true },
  { to: '/admin/agenda',   icon: Calendar,        label: 'Agenda'              },
  { to: '/admin/services',      icon: Briefcase,       label: 'Serviços'        },
  { to: '/admin/professionals', icon: UserCheck,        label: 'Profissionais'   },
  { to: '/admin/clients',       icon: Users,           label: 'Clientes'        },
  { to: '/admin/finance',  icon: TrendingUp,      label: 'Financeiro'          },
  { to: '/admin/settings', icon: Settings,        label: 'Configurações'       },
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const { user, barbershop, logout, accessToken } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    function fetchPending() {
      api.get<{ today: { pending: number } }>('/api/dashboard', accessToken ?? undefined)
        .then(data => setPendingCount(data.today.pending))
        .catch(() => {})
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30_000) // atualiza a cada 30s
    return () => clearInterval(interval)
  }, [accessToken])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-60 bg-zinc-900 border-r border-zinc-800
        flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">BarberPro</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Usuário + Logout */}
        <div className="px-3 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user ? getInitials(user.name) : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name ?? '...'}</p>
              <p className="text-xs text-zinc-500 truncate">{barbershop?.name ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-zinc-800 bg-zinc-900 md:bg-transparent">
          <button
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:block" />
          <NavLink to="/admin/agenda" className="relative text-zinc-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-brand-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </NavLink>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
