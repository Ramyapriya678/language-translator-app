
import React from 'react';
import { TranslationHistoryItem } from '../types';

interface HistoryListProps {
  history: TranslationHistoryItem[];
  onSelect: (item: TranslationHistoryItem) => void;
  onClear: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onClear }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-slate-900 font-semibold mb-1">No history yet</h3>
        <p className="text-slate-500 text-sm">Your recent translations will appear here for easy access.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent History
        </h2>
        <button
          onClick={onClear}
          className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
        >
          Clear All
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="text-left bg-white border border-slate-200 p-5 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                {item.fromLang.code} → {item.toLang.code}
              </span>
              <span className="text-[10px] text-slate-400 ml-auto">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <p className="text-slate-800 font-medium line-clamp-2 mb-1">
              {item.sourceText}
            </p>
            <p className="text-slate-500 text-sm line-clamp-2">
              {item.translatedText}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
