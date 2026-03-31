import React, { useState, useEffect, useCallback } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNavbar from './components/BottomNavbar';
import InputPage from './pages/InputPage';
import ListPage from './pages/ListPage';
import SettingsPage from './pages/SettingsPage';
import DetailPage from './pages/DetailPage';
import useWords from './hooks/useWords';
import useCategories from './hooks/useCategories';

function App() {
  const [currentTab, setCurrentTab] = useState('input');
  const [viewingWordId, setViewingWordId] = useState(null);

  const { words, ready, addWord, updateWord, deleteWord, getWord, reload } = useWords();
  const { categories, addCategory, updateCategory, deleteCategory, replaceAll: replaceCats } = useCategories();

  // 切換 tab 時推入 history state
  const navigateTo = useCallback((tab, wordId = null) => {
    setCurrentTab(tab);
    setViewingWordId(wordId);
    window.history.pushState({ tab, wordId }, '');
  }, []);

  const handleViewDetail = (id) => {
    navigateTo('detail', id);
  };

  /** 複製筆記用：replaceState 取代 pushState，返回時直接回清單 */
  const handleReplaceDetail = (id) => {
    setCurrentTab('detail');
    setViewingWordId(id);
    window.history.replaceState({ tab: 'detail', wordId: id }, '');
  };

  const handleBackToList = () => {
    window.history.back();
  };

  // 監聽瀏覽器的 popstate（上一頁/下一頁）
  useEffect(() => {
    window.history.replaceState({ tab: 'input', wordId: null }, '');

    const handlePopState = (e) => {
      const state = e.state;
      if (state) {
        setCurrentTab(state.tab);
        setViewingWordId(state.wordId);
      } else {
        setCurrentTab('input');
        setViewingWordId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /** SettingsPage 匯入/同步完成後重新載入資料（不需要 reload 整頁） */
  const handleDataChanged = useCallback(async () => {
    await reload();
  }, [reload]);

  const safeCategories = categories || {};

  // 等待 IndexedDB 載入完成
  if (!ready) {
    return (
      <div className="min-h-dvh bg-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-[#555] text-[14px]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#1a1a1a] text-white pb-16 font-sans">

      <ErrorBoundary>
      <main className="p-4 max-w-[1600px] mx-auto w-full">
        {currentTab === 'input' && (
          <InputPage
            onSave={async (word) => { await addWord(word); navigateTo('list'); }}
            categories={safeCategories}
            addCategory={addCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
          />
        )}

        {currentTab === 'list' && (
          <ListPage
            words={words}
            categories={safeCategories}
            onViewDetail={handleViewDetail}
            onDelete={deleteWord}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage onDataChanged={handleDataChanged} />
        )}

        {currentTab === 'detail' && viewingWordId && (
          <DetailPage
            wordId={viewingWordId}
            getWord={getWord}
            onBack={handleBackToList}
            onUpdate={updateWord}
            onDelete={deleteWord}
            onAdd={addWord}
            onViewDuplicate={handleReplaceDetail}
            categories={safeCategories}
            addCategory={addCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
          />
        )}
      </main>
      </ErrorBoundary>

      <BottomNavbar currentTab={currentTab} setTab={navigateTo} />
    </div>
  );
}

export default App;
