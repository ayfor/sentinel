import { create } from 'zustand';

/**
 * Client-local UI state, deliberately separate from the world store: nothing
 * here crosses the wire or syncs between tabs (S4#d4 privacy rationale;
 * selection joins this store in S7).
 */
interface UiState {
  notice: string | null;
  showNotice: (text: string) => void;
  clearNotice: () => void;
  /** Per-client selection (FR-5 ruling): never crosses the wire. */
  selectedAssetId: string | null;
  selectAsset: (id: string | null) => void;
}

const NOTICE_MS = 5000;

let noticeTimer: number | undefined;

export const useUiStore = create<UiState>((set) => ({
  notice: null,
  showNotice: (text) => {
    window.clearTimeout(noticeTimer);
    set({ notice: text });
    noticeTimer = window.setTimeout(() => set({ notice: null }), NOTICE_MS);
  },
  clearNotice: () => {
    window.clearTimeout(noticeTimer);
    set({ notice: null });
  },
  selectedAssetId: null,
  selectAsset: (id) => set({ selectedAssetId: id }),
}));
