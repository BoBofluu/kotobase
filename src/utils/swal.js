import Swal from 'sweetalert2';

/**
 * 全域 Swal 共用工具
 * 統一深色主題 + 常用模式封裝
 */

const DARK = { background: '#1a1a1a', color: '#fff' };

/** Toast 通知（右上角自動消失） */
export const toast = (icon, title, timer = 1500) =>
  Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer, ...DARK });

/** 警告提示（置中彈窗） */
export const alert = (icon, title, text) =>
  Swal.fire({ icon, title, text, ...DARK });

/** 確認刪除對話框（紅色確認按鈕） */
export const confirmDelete = (t, title, text) =>
  Swal.fire({
    title: title || t('msg_delete_confirm'),
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff6b6b',
    cancelButtonColor: '#3f3f3f',
    confirmButtonText: t('btn_delete'),
    cancelButtonText: t('btn_cancel'),
    ...DARK,
  });

/** 選擇模式對話框（合併 / 取代 / 取消） */
export const chooseMode = (t, { title, html, confirmText, denyText }) =>
  Swal.fire({
    title,
    html,
    icon: 'question',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: confirmText || t('btn_import_merge'),
    denyButtonText: denyText || t('btn_sync_replace_local'),
    cancelButtonText: t('btn_cancel'),
    confirmButtonColor: '#818cf8',
    denyButtonColor: '#f59e0b',
    ...DARK,
  });
