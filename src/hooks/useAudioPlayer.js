import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 音訊播放器 Hook
 * 支援：載入中 → 播放 → 暫停 → 繼續 → 重播
 * 附帶播放進度（currentTime / duration）
 *
 * 狀態：idle → loading → playing → paused → idle
 */
export function useAudioPlayer() {
  // 'idle' | 'loading' | 'playing' | 'paused'
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);   // 0~1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const rafRef = useRef(null);

  // 更新進度（用 requestAnimationFrame 避免過度 re-render）
  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
      setProgress(audio.currentTime / audio.duration);
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  }, []);

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // 清除舊的 audio 和 URL
  const cleanup = useCallback(() => {
    stopProgressLoop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [stopProgressLoop]);

  // 頁面離開時清除
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * 載入並播放 base64 音訊
   */
  const loadAndPlay = useCallback(async (base64Audio) => {
    cleanup();

    // base64 轉 Blob
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => {
      setStatus('playing');
      rafRef.current = requestAnimationFrame(updateProgress);
    };
    audio.onpause = () => {
      if (!audio.ended) setStatus('paused');
      stopProgressLoop();
    };
    audio.onended = () => {
      setStatus('idle');
      stopProgressLoop();
      setProgress(0);
      setCurrentTime(0);
    };
    audio.onerror = () => {
      setStatus('idle');
      stopProgressLoop();
    };

    try {
      await audio.play();
    } catch (error) {
      console.error('Audio play failed:', error);
      setStatus('idle');
    }
  }, [cleanup, updateProgress, stopProgressLoop]);

  /**
   * 暫停
   */
  const pause = useCallback(() => {
    if (audioRef.current && status === 'playing') {
      audioRef.current.pause();
    }
  }, [status]);

  /**
   * 繼續播放
   */
  const resume = useCallback(() => {
    if (audioRef.current && status === 'paused') {
      audioRef.current.play();
    }
  }, [status]);

  /**
   * 重頭播放
   */
  const restart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  }, []);

  /**
   * 跳轉到指定進度 (0~1)
   */
  const seek = useCallback((ratio) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = ratio * audioRef.current.duration;
      setProgress(ratio);
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  /**
   * 開始拖曳（靜音 + 暫停進度更新）
   */
  const startDrag = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = true;
    }
    stopProgressLoop();
  }, [stopProgressLoop]);

  /**
   * 拖曳中更新進度（不播放聲音）
   */
  const dragSeek = useCallback((ratio) => {
    const r = Math.max(0, Math.min(1, ratio));
    setProgress(r);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = r * audioRef.current.duration;
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  /**
   * 結束拖曳（解除靜音 + 恢復進度更新）
   */
  const endDrag = useCallback((ratio) => {
    const r = Math.max(0, Math.min(1, ratio));
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = r * audioRef.current.duration;
      audioRef.current.muted = false;
      setProgress(r);
      setCurrentTime(audioRef.current.currentTime);
      // 如果原本在播放中，恢復進度更新迴圈
      if (status === 'playing') {
        rafRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, [status, updateProgress]);

  /**
   * 停止並重置
   */
  const stop = useCallback(() => {
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  /**
   * 設定載入中狀態
   */
  const setLoading = useCallback(() => {
    setStatus('loading');
  }, []);

  return {
    status,
    progress,
    currentTime,
    duration,
    loadAndPlay,
    pause,
    resume,
    restart,
    seek,
    startDrag,
    dragSeek,
    endDrag,
    stop,
    setLoading,
  };
}
