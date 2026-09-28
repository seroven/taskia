import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppearanceTools } from '../components/AppearanceTools'
import { SessionActions } from '../components/SessionActions'
import { AdminAccountsPage } from './admin/AdminAccountsPage'
import { AdminDashboard } from './admin/AdminDashboard'
import { AdminStudentPage } from './admin/AdminStudentPage'

type AdminView = 'dashboard' | 'accounts'

export function AdminPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [view, setView] = useState<AdminView>('dashboard')
  const [returnView, setReturnView] = useState<AdminView>('dashboard')

  function openExplorer(id: number, from: AdminView) {
    setReturnView(from)
    setSelectedId(id)
  }

  return (
    <div className="worlds-shell admin-shell">
      <header className="topbar">
        <div>
          <p className="brand">Taskia</p>
          <p className="welcome">Panel de administrador</p>
        </div>
        <div className="topbar-actions">
          <AppearanceTools />
          <SessionActions />
        </div>
      </header>

      <div className="admin-body">
        <AnimatePresence mode="wait">
          {selectedId != null ? (
            <motion.div
              key={selectedId}
              className="admin-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <AdminStudentPage
                studentId={selectedId}
                backLabel={
                  returnView === 'accounts'
                    ? 'Guardianes y Exploradores'
                    : 'Panel'
                }
                onBack={() => {
                  setSelectedId(null)
                  setView(returnView)
                }}
              />
            </motion.div>
          ) : view === 'accounts' ? (
            <motion.div
              key="accounts"
              className="admin-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <AdminAccountsPage
                onBack={() => setView('dashboard')}
                onOpenExplorer={(id) => openExplorer(id, 'accounts')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              className="admin-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <AdminDashboard
                onOpenStudent={(id) => openExplorer(id, 'dashboard')}
                onOpenAccounts={() => setView('accounts')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
