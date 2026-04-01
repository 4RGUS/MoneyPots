import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Pot, Account, Transaction } from '../types'

type Unsubscribe = () => void

// ── Pots ──────────────────────────────────────────────────────────────────────

export function subscribePots(uid: string, cb: (pots: Pot[]) => void): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'pots'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pot)))
  )
}

export function addPot(uid: string, data: Omit<Pot, 'id' | 'saved' | 'createdAt'>) {
  return addDoc(collection(db, 'users', uid, 'pots'), {
    ...data,
    saved: 0,
    createdAt: serverTimestamp(),
  })
}

export function updatePot(uid: string, potId: string, data: Partial<Pot>) {
  return updateDoc(doc(db, 'users', uid, 'pots', potId), data)
}

export function deletePot(uid: string, potId: string) {
  return deleteDoc(doc(db, 'users', uid, 'pots', potId))
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export function subscribeAccounts(uid: string, cb: (accounts: Account[]) => void): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'accounts'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)))
  )
}

export function addAccount(uid: string, data: Omit<Account, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'users', uid, 'accounts'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export function updateAccount(uid: string, accId: string, data: Partial<Account>) {
  return updateDoc(doc(db, 'users', uid, 'accounts', accId), data)
}

export function deleteAccount(uid: string, accId: string) {
  return deleteDoc(doc(db, 'users', uid, 'accounts', accId))
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function addTransaction(uid: string, data: Omit<Transaction, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'users', uid, 'transactions'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export function subscribeTransactions(uid: string, cb: (transactions: Transaction[]) => void): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))
  )
}
