import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { subscribePots, subscribeAccounts, subscribeTransactions } from '../lib/db'
import { computeCommitted } from '../lib/allocation'
import PotsTab from '../components/PotsTab'
import AccountsTab from '../components/AccountsTab'
import HistoryTab from '../components/HistoryTab'
import OverviewTab from '../components/OverviewTab'

const TABS = ['Overview', 'Pots', 'Accounts', 'History']

export default function Dashboard({ user }) {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState('Overview')
  const [pots, setPots] = useState([])
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const potsReady = useRef(false)
  const txnReady = useRef(false)
  const autoTabDone = useRef(false)

  useEffect(() => {
    const unsub1 = subscribePots(user.uid, data => {
      setPots(data)
      potsReady.current = true
      maybeAutoTab(data, null)
    })
    const unsub2 = subscribeAccounts(user.uid, setAccounts)
    const unsub3 = subscribeTransactions(user.uid, data => {
      setTransactions(data)
      txnReady.current = true
      maybeAutoTab(null, data)
    })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [user.uid])

  // Accounts with balance reduced by amounts already committed to active pots.
  // Used for allocation logic (TopUpModal) and "available" display in AccountsTab.
  // Raw `accounts` are never mutated — balances stay as the user entered them.
  const effectiveAccounts = useMemo(() => {
    const committed = computeCommitted(pots, transactions)
    return accounts.map(acc => ({
      ...acc,
      rawBalance: acc.balance,
      balance: Math.max(0, acc.balance - (committed[acc.id] || 0)),
    }))
  }, [accounts, pots, transactions])

  // Captured via closure — only runs once, after both pots and transactions have loaded
  let latestPots = pots
  let latestTxns = transactions
  function maybeAutoTab(newPots, newTxns) {
    if (newPots) latestPots = newPots
    if (newTxns) latestTxns = newTxns
    if (!potsReady.current || !txnReady.current || autoTabDone.current) return
    autoTabDone.current = true
    const activePotIds = new Set(latestPots.filter(p => p.saved > 0).map(p => p.id))
    const hasOverviewData = latestTxns.some(txn => activePotIds.has(txn.potId))
    if (!hasOverviewData) setActiveTab('Pots')
  }

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
          <PotsTab uid={user.uid} pots={pots} accounts={effectiveAccounts} />
        )}
        {activeTab === 'Accounts' && (
          <AccountsTab uid={user.uid} accounts={effectiveAccounts} pots={pots} transactions={transactions} />
        )}
        {activeTab === 'Overview' && (
          <OverviewTab pots={pots} accounts={accounts} transactions={transactions} />
        )}
        {activeTab === 'History' && (
          <HistoryTab transactions={transactions} pots={pots} accounts={accounts} />
        )}
      </main>
    </div>
  )
}
