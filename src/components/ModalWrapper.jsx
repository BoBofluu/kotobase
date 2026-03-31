import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useEscClose from '../hooks/useEscClose';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

/**
 * 共用 Modal 外殼
 * - Portal 渲染到 document.body（不受父層 CSS 影響）
 * - ESC 關閉 + 點擊遮罩關閉 + 鎖定背景滾動
 *
 * @param {string}   title    - 標題文字
 * @param {function} onClose  - 關閉回呼
 * @param {number}   zIndex   - z-index（預設 200）
 * @param {React.ReactNode} children - 主要內容
 * @param {React.ReactNode} footer   - 底部按鈕區（可選）
 */
function ModalWrapper({ title, onClose, zIndex = 200, children, footer }) {
  useEscClose(onClose);
  useBodyScrollLock();

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md max-h-[85dvh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#333] rounded-lg transition-colors text-[#888]">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-8 custom-scrollbar">
          {children}
        </div>

        {/* Footer（可選） */}
        {footer && (
          <div className="p-4 bg-[#252525] border-t border-[#333]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ModalWrapper;
