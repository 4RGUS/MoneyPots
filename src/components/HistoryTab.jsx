import { fmt } from '../lib/allocation'

export default function HistoryTab({ transactions, pots, accounts }) {
  if (transactions.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📋</div>
        <p>No transactions yet. Start adding money to your pots!</p>
      </div>
    )
  }

  return (
    <div className="card">
      {transactions.map(txn => {
        const date = txn.createdAt?.toDate?.()
        const dateStr = date
          ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Just now'

        return (
          <div className="txn-row" key={txn.id}>
            <div>
              <div style={{ fontWeight: 500 }}>{txn.potName}</div>
              <div className="txn-meta">
                {dateStr} &nbsp;·&nbsp;
                {txn.sources?.map(s => `${s.accountName}: ${fmt(s.deduct)}`).join(', ')}
              </div>
            </div>
            <span className="txn-amount">+ {fmt(txn.amount)}</span>
          </div>
        )
      })}
    </div>
  )
}
