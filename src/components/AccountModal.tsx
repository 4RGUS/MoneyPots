import { useState } from 'react'
import type { Account, EffectiveAccount, AccountHistoryType } from '../types'

type AccountFormData = Omit<Account, 'id' | 'createdAt'>

interface AccountModalProps {
  title: string
  initial?: Account | EffectiveAccount
  onSave: (data: AccountFormData, historyType: AccountHistoryType, note: string) => Promise<void>
  onClose: () => void
}

export default function AccountModal({ title, initial, onSave, onClose }: AccountModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [bank, setBank] = useState(initial?.bank ?? '')
  const [type, setType] = useState<'salary' | 'savings'>(initial?.type ?? 'savings')
  const [balance, setBalance] = useState<number | ''>(
    // Use rawBalance when editing an EffectiveAccount so the modal shows the real bank balance
    ('rawBalance' in (initial ?? {}) ? (initial as EffectiveAccount).rawBalance : initial?.balance) ?? ''
  )
  const [minBalance, setMinBalance] = useState<number | ''>(initial?.minBalance ?? '')
  const [historyType, setHistoryType] = useState<AccountHistoryType>('correction')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!name.trim() || !bank.trim() || balance === '') return
    setLoading(true)
    await onSave(
      {
        name: name.trim(),
        bank: bank.trim(),
        type,
        balance: parseFloat(String(balance)) || 0,
        minBalance: type === 'savings' ? (parseFloat(String(minBalance)) || 0) : 0,
      },
      initial ? historyType : 'credit',
      note,
    )
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{title}</h2>

        <div className="field">
          <label>Account nickname</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SBI Savings" />
        </div>

        <div className="field">
          <label>Bank name</label>
          <input value={bank} onChange={e => setBank(e.target.value)} placeholder="e.g. State Bank of India" />
        </div>

        <div className="field">
          <label>Account type</label>
          <select value={type} onChange={e => setType(e.target.value as 'salary' | 'savings')}>
            <option value="salary">Salary account (no minimum balance)</option>
            <option value="savings">Savings account (has minimum balance)</option>
          </select>
        </div>

        {type === 'savings' && (
          <div className="field">
            <label>Minimum balance to maintain (₹)</label>
            <input
              type="number"
              value={minBalance}
              onChange={e => setMinBalance(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 5000"
            />
          </div>
        )}

        <div className="field">
          <label>Current balance (₹)</label>
          <input
            type="number"
            value={balance}
            onChange={e => setBalance(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g. 85000"
          />
        </div>

        {initial && (
          <>
            <div className="field">
              <label>Reason for balance change</label>
              <select value={historyType} onChange={e => setHistoryType(e.target.value as AccountHistoryType)}>
                <option value="credit">Salary / Deposit</option>
                <option value="debit">Expense / Withdrawal</option>
                <option value="correction">Sync with bank</option>
              </select>
            </div>
            <div className="field">
              <label>Note (optional)</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. April salary credited"
              />
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-clay" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save account'}
          </button>
        </div>
      </div>
    </div>
  )
}
