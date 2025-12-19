
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Language, 
  TranslationHistoryItem, 
} from './types';
import { 
  SUPPORTED_LANGUAGES, 
  STORAGE_KEY, 
  APP_NAME 
} from './constants';
import { 
  translateText, 
  generateSpeech, 
  translateAudio 
} from './services/geminiService';
import LanguageSelector from './components/LanguageSelector';
import VoiceRecorder from './components/VoiceRecorder';
import HistoryList from './components/HistoryList';

const App: React.FC = () => {
  // --- State ---
  const [fromLang, setFromLang] = useState<Language>(SUPPORTED_LANGUAGES[0]); // English
  const [toLang, setToLang] = useState<Language>(SUPPORTED_LANGUAGES[1]);   // Spanish
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  
  // Audio playback refs
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // --- Handlers ---
  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim() || isTranslating) return;

    setIsTranslating(true);
    try {
      const result = await translateText(sourceText, fromLang, toLang);
      setTranslatedText(result);
      
      // Add to history
      const newItem: TranslationHistoryItem = {
        id: crypto.randomUUID(),
        sourceText,
        translatedText: result,
        fromLang,
        toLang,
        timestamp: Date.now(),
      };
      setHistory(prev => [newItem, ...prev.slice(0, 49)]); // Keep last 50
    } catch (error) {
      console.error("Translation error:", error);
      alert("Failed to translate. Please check your connection and try again.");
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, fromLang, toLang, isTranslating]);

  const handleVoiceInput = async (base64Audio: string) => {
    setIsTranslating(true);
    setSourceText("Listening...");
    setTranslatedText("");
    
    try {
      const { originalText, translatedText: result } = await translateAudio(base64Audio, fromLang, toLang);
      
      setSourceText(originalText);
      setTranslatedText(result);

      if (originalText && result) {
        const newItem: TranslationHistoryItem = {
          id: crypto.randomUUID(),
          sourceText: originalText,
          translatedText: result,
          fromLang,
          toLang,
          timestamp: Date.now(),
        };
        setHistory(prev => [newItem, ...prev.slice(0, 49)]);
      }
    } catch (error) {
      console.error("Voice translation error:", error);
      setSourceText("");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwap = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleSpeak = async (text: string, lang: Language) => {
    if (!text || isPlaying) return;

    setIsPlaying(true);
    try {
      const base64 = await generateSpeech(text, lang.code);
      if (!base64) throw new Error("No audio data received");

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Raw PCM 16bit Little Endian decoding for Gemini TTS
      const dataInt16 = new Int16Array(bytes.buffer);
      const frameCount = dataInt16.length;
      const buffer = ctx.createBuffer(1, frameCount, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlaying(false);
    }
  };

  const selectHistoryItem = (item: TranslationHistoryItem) => {
    setFromLang(item.fromLang);
    setToLang(item.toLang);
    setSourceText(item.sourceText);
    setTranslatedText(item.translatedText);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your translation history?")) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 0h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              {APP_NAME}
            </h1>
          </div>
          
          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-500 uppercase tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse"></span>
            Gemini Flash 3.0 Pro
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
        
        {/* Interaction Card */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden mb-12">
          
          {/* Top Bar: Language Selectors */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4 p-8 border-b border-slate-100 bg-slate-50/50">
            <LanguageSelector 
              label="Translate from" 
              selected={fromLang} 
              onSelect={setFromLang} 
            />
            
            <button 
              onClick={handleSwap}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:shadow-lg transition-all active:scale-95 mb-0"
              title="Swap Languages"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            <LanguageSelector 
              label="Translate to" 
              selected={toLang} 
              onSelect={setToLang} 
            />
          </div>

          {/* Text Areas */}
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            
            {/* Input Side */}
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Input</span>
                <button 
                  onClick={() => setSourceText('')}
                  className="text-slate-300 hover:text-slate-600 transition-colors"
                  title="Clear"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={`Type something in ${fromLang.name}...`}
                className="w-full h-48 md:h-64 resize-none text-xl md:text-2xl font-medium text-slate-800 focus:outline-none placeholder:text-slate-300 placeholder:font-normal leading-relaxed"
              />
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSpeak(sourceText, fromLang)}
                    disabled={!sourceText || isPlaying}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all disabled:opacity-30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <VoiceRecorder 
                    onRecordingComplete={handleVoiceInput} 
                    isProcessing={isTranslating} 
                  />
                  <button
                    onClick={handleTranslate}
                    disabled={!sourceText || isTranslating}
                    className="px-6 h-14 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {isTranslating ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      "Translate"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Output Side */}
            <div className="p-8 space-y-4 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-500 uppercase tracking-widest">Translation</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(translatedText);
                    // Add a tiny toast or UI feedback if desired
                  }}
                  className="text-slate-300 hover:text-slate-600 transition-colors"
                  title="Copy to clipboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
              <div className={`w-full h-48 md:h-64 text-xl md:text-2xl font-bold leading-relaxed overflow-y-auto ${!translatedText ? 'text-slate-200' : 'text-slate-900'}`}>
                {translatedText || "Translation will appear here..."}
              </div>
              <div className="flex items-center justify-end pt-4 h-14">
                {translatedText && (
                  <button
                    onClick={() => handleSpeak(translatedText, toLang)}
                    disabled={isPlaying}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold
                      ${isPlaying 
                        ? 'bg-indigo-50 text-indigo-600' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}
                    `}
                  >
                    <svg className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    {isPlaying ? "Speaking..." : "Listen"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <HistoryList 
          history={history} 
          onSelect={selectHistoryItem} 
          onClear={clearHistory} 
        />
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-sm font-medium">
          <p>© {new Date().getFullYear()} {APP_NAME} powered by Google Gemini AI.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-indigo-600 cursor-help transition-colors">Privacy</span>
            <span className="hover:text-indigo-600 cursor-help transition-colors">Terms</span>
            <span className="hover:text-indigo-600 cursor-help transition-colors">Feedback</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
