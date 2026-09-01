'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

/**
 * 防呆機制（guard）：
 * 所有「寫入」動作都必須先經用戶明確確認，才一次性提交到後端。
 * 頁面先把變更暫存在 React 本地狀態（輸入框），
 * 用戶按「提交」時彈出本確認對話框，列出將寫入的內容摘要，
 * 用戶按「確認提交」後才執行單一次 api 呼叫。
 */

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<{ confirm: ConfirmFn }>({
  confirm: async () => false,
});

export function useConfirm() {
  return useContext(ConfirmCtx);
}

/** 建立確認對話框內的「欄位：值」摘要清單（空值自動略過）。 */
export function kv(rows: Array<[string, ReactNode]>, emptyText = '（留空）'): ReactNode {
  const filled = rows.filter(([, v]) => v !== '' && v !== undefined && v !== null);
  if (filled.length === 0) return <span className="k">{emptyText}</span>;
  return (
    <ul>
      {filled.map(([k, v], i) => (
        <li key={i}>
          <span className="k">{k}：</span>
          {v}
        </li>
      ))}
    </ul>
  );
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    return new Promise<boolean>((resolve) => {
      setOpts(o);
      setResolver(() => resolve);
    });
  }, []);

  const close = useCallback(
    (val: boolean) => {
      setOpts(null);
      setResolver(null);
      resolver?.(val);
    },
    [resolver],
  );

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={opts.title}
          onClick={() => close(false)}
        >
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-head">
              <span className="confirm-icon" aria-hidden>
                {opts.danger ? '⚠️' : '✅'}
              </span>
              <h3>{opts.title}</h3>
            </div>
            {opts.message && <div className="confirm-body">{opts.message}</div>}
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              請再次確認。按「{opts.confirmLabel || '確認提交'}」才會真正寫入後端（只提交一次）。
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => close(false)}
              >
                {opts.cancelLabel || '取消'}
              </button>
              <button
                type="button"
                className={`btn ${opts.danger ? 'btn-danger' : 'primary'}`}
                onClick={() => close(true)}
              >
                {opts.confirmLabel || '確認提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
