import type { Timestamp } from 'firebase/firestore'

export interface Pot {
  id: string
  name: string
  target: number
  saved: number
  icon: string
  color: string
  deadline?: string | null
  status?: 'fulfilled'
  createdAt?: Timestamp | null
}

export interface Account {
  id: string
  name: string
  bank: string
  type: 'salary' | 'savings'
  balance: number
  minBalance: number
  createdAt?: Timestamp | null
}

export interface EffectiveAccount extends Account {
  rawBalance: number
}

export interface TransactionSource {
  accountId: string
  accountName: string
  deduct: number
}

export interface Transaction {
  id: string
  potId: string
  potName: string
  amount: number
  sources: TransactionSource[]
  createdAt?: Timestamp | null
}

export interface Alloc {
  account: Account
  deduct: number
}

export type AccountHistoryType = 'credit' | 'debit' | 'correction' | 'goal_fulfilled'

export interface AccountHistoryEntry {
  id: string
  type: AccountHistoryType
  delta: number
  newBalance: number
  note?: string | null
  createdAt?: Timestamp | null
}
