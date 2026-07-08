import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import { ThemeToggle } from '../components/ThemeToggle'
import {
  Scissors, LayoutDashboard, Calendar, Users,
  Briefcase, TrendingUp, Settings, LogOut, Menu, Bell, BellOff, Shield,
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  message: string
  readAt: string | null
  createdAt: string
  appointmentId: string
  appointment: { date: string }
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

// Toque curto de sino via Web Audio — sem depender de arquivo de áudio
function playBellSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.65)
  } catch {
    // navegador bloqueou áudio antes da primeira interação — sem som
  }
}

function timeAgo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

const navItems = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard',   end: true },
  { to: '/admin/agenda',   icon: Calendar,        label: 'Agenda'              },
  { to: '/admin/services', icon: Briefcase,       label: 'Serviços'            },
  { to: '/admin/clients',  icon: Users,           label: 'Clientes'            },
  { to: '/admin/finance',  icon: TrendingUp,      label: 'Financeiro'          },
  { to: '/admin/settings', icon: Settings,        label: 'Configurações'       },
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const prevUnread = useRef<number | null>(null)
  const { user, barbershop, logout, accessToken } = useAuthStore()
  const navigate = useNavigate()

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<NotificationsResponse>('/api/notifications', accessToken ?? undefined)
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)

      // Apita só quando CHEGA notificação nova (não no primeiro carregamento)
      if (prevUnread.current !== null && data.unreadCount > prevUnread.current) {
        playBellSound()
      }
      prevUnread.current = data.unreadCount
    } catch {
      // silencioso — tenta de novo no próximo ciclo
    }
  }, [accessToken])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000) // atualiza a cada 30s
    return () => clearInterval(interval)
  }, [fetchNotifications])

  async function toggleBell() {
    const opening = !bellOpen
    setBellOpen(opening)
    if (opening && unreadCount > 0) {
      // Abriu o painel → marca tudo como lido
      try {
        await api.patch('/api/notifications/read', {}, accessToken ?? undefined)
        setUnreadCount(0)
        prevUnread.current = 0
      } catch { /* mantém o contador se falhar */ }
    }
  }

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
          <span className="text-base font-bold text-zinc-100">BarberPro</span>
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
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* Só o dono da plataforma vê — e o backend valida de verdade */}
          {user?.platformAdmin && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Dono da plataforma
              </p>
              <NavLink
                to="/admin/plataforma"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`
                }
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                Plataforma
              </NavLink>
            </>
          )}
        </nav>

        {/* Usuário + Logout */}
        <div className="px-3 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user ? getInitials(user.name) : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">{user?.name ?? '...'}</p>
              <p className="text-xs text-zinc-500 truncate">{barbershop?.name ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
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
            className="md:hidden text-zinc-400 hover:text-zinc-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:block" />

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* Sino de notificações */}
            <div className="relative">
              <button onClick={toggleBell} className="relative text-zinc-400 hover:text-zinc-100 transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-brand-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <>
                  {/* clique fora fecha */}
                  <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />

                  <div className="absolute right-0 top-8 z-40 w-80 max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-sm font-semibold text-zinc-100">Notificações</p>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10 text-zinc-600">
                        <BellOff className="w-5 h-5" />
                        <p className="text-xs">Nenhuma notificação ainda</p>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800/60">
                        {notifications.map(n => (
                          <button
                            key={n.id}
                            onClick={() => {
                              setBellOpen(false)
                              // Vai direto para o dia do corte e destaca o agendamento
                              const d = new Date(n.appointment.date)
                              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                              navigate(`/admin/agenda?date=${dateStr}&highlight=${n.appointmentId}`)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-zinc-800/50 transition-colors flex gap-2.5"
                          >
                            {!n.readAt && (
                              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 flex-shrink-0" />
                            )}
                            <div className={`min-w-0 ${n.readAt ? 'pl-4' : ''}`}>
                              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed line-clamp-3">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(n.createdAt)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
