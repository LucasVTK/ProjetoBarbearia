import { Router } from 'express'
import { authRouter }          from './modules/auth/auth.routes'
import { servicesRouter }      from './modules/services/services.routes'
import { schedulesRouter }     from './modules/schedules/schedules.routes'
import { appointmentsRouter }  from './modules/appointments/appointments.routes'
import { professionalsRouter } from './modules/professionals/professionals.routes'
import { clientsRouter }       from './modules/clients/clients.routes'
import { dashboardRouter }     from './modules/dashboard/dashboard.routes'
import { financeRouter }       from './modules/finance/finance.routes'
import { barbershopRouter }    from './modules/barbershop/barbershop.routes'

export const router = Router()

router.get('/', (_req, res) => {
  res.json({ message: 'BarberPro API', version: '1.0.0' })
})

router.use('/auth',          authRouter)
router.use('/services',      servicesRouter)
router.use('/schedules',     schedulesRouter)
router.use('/appointments',  appointmentsRouter)
router.use('/professionals', professionalsRouter)
router.use('/clients',       clientsRouter)
router.use('/dashboard',     dashboardRouter)
router.use('/finance',       financeRouter)
router.use('/barbershop',    barbershopRouter)
