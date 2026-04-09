import { useState, useEffect, useRef, useMemo } from 'react'
import type { User } from 'firebase/auth'
import { useAuth } from '../hooks/useAuth'
import { subscribePots, subscribeAccounts, subscribeTransactions, updateAccountWithHistory, updatePot } from '../lib/db'
import { computeCommitted } from '../lib/allocation'
import type { Pot, Account, EffectiveAccount, Transaction } from '../types'
import PotsTab from '../components/PotsTab'
import AccountsTab from '../components/AccountsTab'
import HistoryTab from '../components/HistoryTab'
import OverviewTab from '../components/OverviewTab'
import CompletedTab from '../components/CompletedTab'

const TABS = ['Overview', 'Pots', 'Completed', 'Accounts', 'History'] as const
type Tab = typeof TABS[number]

export default function Dashboard({ user }: { user: User }) {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [pots, setPots] = useState<Pot[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
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

  const effectiveAccounts = useMemo((): EffectiveAccount[] => {
    const committed = computeCommitted(pots.filter(p => p.status !== 'fulfilled'), transactions)
    return accounts.map(acc => ({
      ...acc,
      rawBalance: acc.balance,
      balance: Math.max(0, acc.balance - (committed[acc.id] || 0)),
    }))
  }, [accounts, pots, transactions])

  const completedPots = useMemo(() => pots.filter(p => p.saved >= p.target), [pots])

  let latestPots = pots
  let latestTxns = transactions
  function maybeAutoTab(newPots: Pot[] | null, newTxns: Transaction[] | null) {
    if (newPots) latestPots = newPots
    if (newTxns) latestTxns = newTxns
    if (!potsReady.current || !txnReady.current || autoTabDone.current) return
    autoTabDone.current = true
    const activePotIds = new Set(latestPots.filter(p => p.saved > 0).map(p => p.id))
    const hasOverviewData = latestTxns.some(txn => activePotIds.has(txn.potId))
    if (!hasOverviewData) setActiveTab('Pots')
  }

  async function handleFulfill(pot: Pot, contributions: Record<string, number>) {
    const writes: Promise<unknown>[] = []
    for (const [accId, amount] of Object.entries(contributions)) {
      const acc = accounts.find(a => a.id === accId)
      if (!acc || amount <= 0) continue
      const newBalance = acc.balance - amount
      writes.push(updateAccountWithHistory(user.uid, accId, { balance: newBalance }, {
        type: 'goal_fulfilled',
        delta: -amount,
        newBalance,
        note: pot.name,
      }))
    }
    writes.push(updatePot(user.uid, pot.id, { status: 'fulfilled' }))
    await Promise.all(writes)
  }

  const completedCount = completedPots.length

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
              {t === 'Completed' && completedCount > 0 && (
                <span className="tab-badge">{completedCount}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'Pots' && (
          <PotsTab uid={user.uid} pots={pots} accounts={effectiveAccounts} />
        )}
        {activeTab === 'Completed' && (
          <CompletedTab
            uid={user.uid}
            pots={completedPots}
            accounts={accounts}
            transactions={transactions}
            onFulfill={handleFulfill}
          />
        )}
        {activeTab === 'Accounts' && (
          <AccountsTab uid={user.uid} accounts={effectiveAccounts} pots={pots} transactions={transactions} />
        )}
        {activeTab === 'Overview' && (
          <OverviewTab pots={pots} accounts={accounts} transactions={transactions} />
        )}
        {activeTab === 'History' && (
          <HistoryTab transactions={transactions} />
        )}
      </main>
    </div>
  )
}
