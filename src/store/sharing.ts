import { create } from "zustand"
import type { SharedSession } from "@/lib/shared-sessions"

let _shareCheckComplete = false
export function setShareCheckComplete(value: boolean) {
  _shareCheckComplete = value
}
export function isShareCheckComplete() {
  return _shareCheckComplete
}

interface SharingStore {
  pendingShares: SharedSession[]
  pendingCount: number
  showSharedDialog: boolean
  shareAcceptedAt: number | null
  setPendingShares: (shares: SharedSession[] | ((prev: SharedSession[]) => SharedSession[])) => void
  setPendingCount: (count: number) => void
  setShowSharedDialog: (open: boolean) => void
  markShareAccepted: () => void
  fetchPendingShares: () => Promise<SharedSession[]>
  fetchPendingCount: () => Promise<number>
}

export const useSharingStore = create<SharingStore>((set, get) => ({
  pendingShares: [],
  pendingCount: 0,
  showSharedDialog: false,
  shareAcceptedAt: null,

  setPendingShares: (shares) => {
    const resolved = typeof shares === "function" ? shares(get().pendingShares) : shares
    set({ pendingShares: resolved, pendingCount: resolved.length })
  },

  setPendingCount: (count) => set({ pendingCount: count }),

  setShowSharedDialog: (open) => set({ showSharedDialog: open }),

  markShareAccepted: () => set({ shareAcceptedAt: Date.now() }),

  fetchPendingShares: async () => {
    try {
      const res = await fetch("/api/shares")
      if (!res.ok) return []
      const shares: SharedSession[] = await res.json()
      set({ pendingShares: shares, pendingCount: shares.length })
      return shares
    } catch {
      return []
    }
  },

  fetchPendingCount: async () => {
    try {
      const res = await fetch("/api/shares")
      if (!res.ok) {
        set({ pendingCount: 0 })
        return 0
      }
      const shares: SharedSession[] = await res.json()
      set({ pendingCount: shares.length })
      return shares.length
    } catch {
      set({ pendingCount: 0 })
      return 0
    }
  },
}))
