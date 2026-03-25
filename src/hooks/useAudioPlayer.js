import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 音訊播放器 Hook
 * 支援：載入中 → 播放 → 暫停 → 繼續 → 重播
 *
 * 狀態：idle → loading → playing → paused → idle
 */
export function useAudioPlayer() {
  // 'idle' | 'loading' | 'playing' | 'paused'
  const [status, setStatus] = useState('idle');
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  // 清除舊的 audio 和 URL
  const cleanup = useCallback(() => {
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
  }, []);

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

    audio.onplay = () => setStatus('playing');
    audio.onpause = () => {
      if (!audio.ended) setStatus('paused');
    };
    audio.onended = () => setStatus('idle');
    audio.onerror = () => setStatus('idle');

    try {
      await audio.play();
    } catch (error) {
      console.error('Audio play failed:', error);
      setStatus('idle');
    }
  }, [cleanup]);

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
    loadAndPlay,
    pause,
    resume,
    restart,
    stop,
    setLoading,
  };
}
