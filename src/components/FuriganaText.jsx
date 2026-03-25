import React, { useState, useEffect } from 'react';
import { fetchFurigana } from '../services/ttsApi';

function FuriganaText({ text, className }) {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!text) { setTokens([]); return; }
      setIsLoading(true);

      try {
        const parsed = await fetchFurigana(text);
        if (isMounted) setTokens(parsed);
      } catch (error) {
        console.error("Furigana parse error:", error);
        // API 失敗時顯示純文字（無假名）
        if (isMounted) setTokens([{ surface: text, reading: null }]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [text]);

  if (isLoading) return <div className="text-[#555] animate-pulse">...</div>;

  return (
    <div className={`whitespace-pre-wrap break-all leading-[2.5] ${className || ''}`} style={{ cursor: 'default' }}>
      {tokens.map((token, index) => {
        if (token.surface === '\n') return <br key={index} />;
        return (
          <React.Fragment key={index}>
            {token.reading ? (
              <ruby style={{ rubyAlign: 'center', rubyPosition: 'over', margin: '0 1px' }}>
                {token.surface}
                <rt style={{ fontSize: '0.55em', color: '#818cf8', fontWeight: 'normal', paddingBottom: '0.2em', userSelect: 'none' }}>{token.reading}</rt>
              </ruby>
            ) : (<span>{token.surface}</span>)}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default FuriganaText;
