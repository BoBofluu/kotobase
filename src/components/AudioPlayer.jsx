import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Square, RotateCcw, Loader2 } from 'lucide-react';

/** 格式化秒數為 m:ss */
const fmt = (s) => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

function AudioPlayer({ status, onPlay, onPause, onResume, onRestart, onStop, onSeek, label, progress = 0, currentTime = 0, duration = 0, disabled = false }) {
  const { t } = useTranslation();
  const barRef = useRef(null);
  const btnBase = "flex items-center gap-1.5 px-3 py-1 rounded-xl text-[13px] font-bold transition-all active:scale-[0.95] focus:outline-none";
  const btnMain = `${btnBase} bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/30 hover:bg-[#818cf8] hover:text-white`;
  const btnSub = `${btnBase} bg-[#2c2c2c] text-[#b3b3b3] border border-[#3f3f3f] hover:bg-[#3f3f3f]`;
  const btnStop = `${btnBase} bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20 hover:bg-[#ff6b6b] hover:text-white`;
  const btnDisabled = `${btnBase} bg-[#2c2c2c] text-[#444] border border-[#333] cursor-not-allowed`;

  const handleBarClick = (e) => {
    if (!barRef.current || !onSeek) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio);
  };

  // 進度條（播放/暫停時顯示）
  const progressBar = (status === 'playing' || status === 'paused') && duration > 0 && (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="text-[11px] text-[#888] tabular-nums w-8 text-right">{fmt(currentTime)}</span>
      <div
        ref={barRef}
        onClick={handleBarClick}
        className="flex-1 h-1.5 bg-[#333] rounded-full cursor-pointer relative overflow-hidden group"
      >
        <div
          className="absolute inset-y-0 left-0 bg-[#818cf8] rounded-full transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress * 100}% - 6px)` }}
        />
      </div>
      <span className="text-[11px] text-[#888] tabular-nums w-8">{fmt(duration)}</span>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <button disabled className={`${btnMain} opacity-60 cursor-wait`}>
            <Loader2 size={12} className="animate-spin" />
            <span>{t('btn_tts_loading')}</span>
          </button>
        </div>
      </div>
    );
  }

  if (status === 'playing') {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <button onClick={onPause} className={btnMain}>
            <Pause size={12} fill="currentColor" />
            <span>{t('btn_pause')}</span>
          </button>
          <button onClick={onRestart} className={btnSub} title={t('btn_restart')}>
            <RotateCcw size={12} />
          </button>
          <button onClick={onStop} className={btnStop} title={t('btn_stop')}>
            <Square size={10} fill="currentColor" />
          </button>
        </div>
        {progressBar}
      </div>
    );
  }

  if (status === 'paused') {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <button onClick={onResume} className={btnMain}>
            <Play size={12} fill="currentColor" />
            <span>{t('btn_resume')}</span>
          </button>
          <button onClick={onRestart} className={btnSub} title={t('btn_restart')}>
            <RotateCcw size={12} />
          </button>
          <button onClick={onStop} className={btnStop} title={t('btn_stop')}>
            <Square size={10} fill="currentColor" />
          </button>
        </div>
        {progressBar}
      </div>
    );
  }

  // idle 狀態
  return (
    <button onClick={disabled ? undefined : onPlay} className={disabled ? btnDisabled : btnMain}>
      <Play size={12} fill="currentColor" />
      <span>{label}</span>
    </button>
  );
}

export default AudioPlayer;
