import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Square, RotateCcw, Loader2 } from 'lucide-react';

function AudioPlayer({ status, onPlay, onPause, onResume, onRestart, onStop, label }) {
  const { t } = useTranslation();
  const btnBase = "flex items-center gap-1.5 px-3 py-1 rounded-xl text-[13px] font-bold transition-all active:scale-[0.95] focus:outline-none";
  const btnMain = `${btnBase} bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/30 hover:bg-[#818cf8] hover:text-white`;
  const btnSub = `${btnBase} bg-[#2c2c2c] text-[#b3b3b3] border border-[#3f3f3f] hover:bg-[#3f3f3f]`;
  const btnStop = `${btnBase} bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20 hover:bg-[#ff6b6b] hover:text-white`;

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <button disabled className={`${btnMain} opacity-60 cursor-wait`}>
          <Loader2 size={12} className="animate-spin" />
          <span>{t('btn_tts_loading')}</span>
        </button>
      </div>
    );
  }

  if (status === 'playing') {
    return (
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
    );
  }

  if (status === 'paused') {
    return (
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
    );
  }

  return (
    <button onClick={onPlay} className={btnMain}>
      <Play size={12} fill="currentColor" />
      <span>{label}</span>
    </button>
  );
}

export default AudioPlayer;
