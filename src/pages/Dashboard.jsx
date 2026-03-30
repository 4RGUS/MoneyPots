import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { subscribePots, subscribeAccounts, subscribeTransactions } from '../lib/db'
import PotsTab from '../components/PotsTab'
import AccountsTab from '../components/AccountsTab'
import HistoryTab from '../components/HistoryTab'

const TABS = ['Pots', 'Accounts', 'History']

export default function Dashboard({ user }) {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState('Pots')
  const [pots, setPots] = useState([])
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    const unsub1 = subscribePots(user.uid, setPots)
    const unsub2 = subscribeAccounts(user.uid, setAccounts)
    const unsub3 = subscribeTransactions(user.uid, setTransactions)
    return () => { unsub1(); unsub2(); unsub3() }
  }, [user.uid])

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="topbar-brand" href="/">
          🏺 Money Pots
        </a>
        <div className="topbar-user">
          <span style={{ display: 'none' }} className="hide-sm">{user.displayName?.split(' ')[0]}</span>
          {user.photoURL && <img src={user.photoURL} alt="" className="avatar" />}
          <button className="btn btn-sm btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        <div className="tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`tab-btn ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'Pots' && (
          <PotsTab uid={user.uid} pots={pots} accounts={accounts} />
        )}
        {activeTab === 'Accounts' && (
          <AccountsTab uid={user.uid} accounts={accounts} />
        )}
        {activeTab === 'History' && (
          <HistoryTab transactions={transactions} pots={pots} accounts={accounts} />
        )}
      </main>
    </div>
  )
}
