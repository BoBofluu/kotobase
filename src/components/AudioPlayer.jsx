import React from 'react';
import { Play, Pause, Square, RotateCcw, Loader2 } from 'lucide-react';

/**
 * 音訊播放器按鈕組
 * 狀態流程：idle → loading → playing ⇄ paused → idle
 *
 * @param {string} status - 'idle' | 'loading' | 'playing' | 'paused'
 * @param {function} onPlay - 點擊播放
 * @param {function} onPause - 點擊暫停
 * @param {function} onResume - 點擊繼續
 * @param {function} onRestart - 點擊重頭播放
 * @param {function} onStop - 點擊停止
 * @param {boolean} isHD - 是否為 HD 模式
 * @param {string} label - 按鈕文字
 */
function AudioPlayer({ status, onPlay, onPause, onResume, onRestart, onStop, isHD, label }) {
  const btnBase = "flex items-center gap-1.5 px-3 py-1 rounded-xl text-[13px] font-bold transition-all active:scale-[0.95] focus:outline-none";
  const btnMain = `${btnBase} bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/30 hover:bg-[#818cf8] hover:text-white`;
  const btnSub = `${btnBase} bg-[#2c2c2c] text-[#b3b3b3] border border-[#3f3f3f] hover:bg-[#3f3f3f]`;
  const btnStop = `${btnBase} bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20 hover:bg-[#ff6b6b] hover:text-white`;

  // 載入中
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <button disabled className={`${btnMain} opacity-60 cursor-wait`}>
          <Loader2 size={12} className="animate-spin" />
          <span>載入中...</span>
        </button>
      </div>
    );
  }

  // 播放中
  if (status === 'playing') {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={onPause} className={btnMain}>
          <Pause size={12} fill="currentColor" />
          <span>暫停</span>
        </button>
        <button onClick={onRestart} className={btnSub} title="重頭播放">
          <RotateCcw size={12} />
        </button>
        <button onClick={onStop} className={btnStop} title="停止">
          <Square size={10} fill="currentColor" />
        </button>
      </div>
    );
  }

  // 暫停中
  if (status === 'paused') {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={onResume} className={btnMain}>
          <Play size={12} fill="currentColor" />
          <span>繼續</span>
        </button>
        <button onClick={onRestart} className={btnSub} title="重頭播放">
          <RotateCcw size={12} />
        </button>
        <button onClick={onStop} className={btnStop} title="停止">
          <Square size={10} fill="currentColor" />
        </button>
      </div>
    );
  }

  // idle 狀態
  return (
    <button onClick={onPlay} className={btnMain}>
      <Play size={12} fill="currentColor" />
      <span>{label}{isHD ? ' HD' : ''}</span>
    </button>
  );
}

export default AudioPlayer;
