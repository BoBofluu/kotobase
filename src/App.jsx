import React, { useState } from 'react';
import Header from './components/Header';
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

  const { words, addWord, updateWord, deleteWord, getWord } = useWords();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();

  const handleViewDetail = (id) => {
    setViewingWordId(id);
    setCurrentTab('detail');
  };

  const handleBackToList = () => {
    setCurrentTab('list');
    setViewingWordId(null);
  };

  const safeCategories = categories || {};

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white pt-14 pb-16 font-sans">
      <Header />
      
      <main className="p-4 max-w-[1600px] mx-auto w-full">
        {currentTab === 'input' && (
          <InputPage 
            onSave={addWord} 
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
          <SettingsPage />
        )}
        
        {currentTab === 'detail' && viewingWordId && (
          <DetailPage 
            wordId={viewingWordId}
            getWord={getWord}
            onBack={handleBackToList}
            onUpdate={updateWord}
            onDelete={deleteWord}
            onAdd={addWord}
            categories={safeCategories}
            addCategory={addCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
          />
        )}
      </main>

      <BottomNavbar currentTab={currentTab} setTab={setCurrentTab} />
    </div>
  );
}

export default App;
