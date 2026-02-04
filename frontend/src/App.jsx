import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import { callOpenRouter } from './services/api'
import { availablePrompts } from './data/prompts'
import { Play, RotateCcw, Save, Trash2, Clock, AlignLeft, Info, CheckCircle2, ChevronDown, ChevronRight, Sun, Moon, Loader2 } from 'lucide-react'

// Simple helper to count words properly for Hindi/English mixed text
const countWords = (str) => {
  return str.trim().split(/\s+/).filter(w => w.length > 0).length;
};

// Markdown Output Component (Simple)
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownOutput = ({ content }) => {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
};


function App() {
  const [session, setSession] = useState({ user: { id: 'local-user' } }); // DUMMY SESSION
  const [activePromptId, setActivePromptId] = useState(Object.keys(availablePrompts)[0]);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openRouterKey') || '');

  // 1. UPDATE DEFAULT STATE: Removed legacy model explicitly
  const [selectedModels, setSelectedModels] = useState(['google/gemini-2.5-flash-lite', 'meta-llama/llama-3.1-70b-instruct']);

  const [inputs, setInputs] = useState({});
  const [outputs, setOutputs] = useState({});
  const [loading, setLoading] = useState({});
  const [metrics, setMetrics] = useState({});
  const [availableModels, setAvailableModels] = useState([]);
  const [saveStatus, setSaveStatus] = useState({}); // Track save status per card
  const [expandedCards, setExpandedCards] = useState({}); // { [modelId]: boolean }
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark'); // Default to dark

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleCard = (modelId) => {
    setExpandedCards(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
  };

  // Load available models (Curated list)
  useEffect(() => {
    if (apiKey) localStorage.setItem('openRouterKey', apiKey);

    const curatedModels = [
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Meta: Llama 3.1 70B' },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen: Qwen 2.5 72B' },
      { id: 'qwen/qwen3-32b', name: 'Qwen: Qwen 3 32B (New)' },
      { id: 'openai/gpt-oss-120b', name: 'OpenAI: GPT-OSS 120B' },
      { id: 'google/gemini-2.5-flash-lite', name: 'Google: Gemini 2.5 Flash Lite' }
    ];

    setAvailableModels(curatedModels);

    // 2. FORCE CLEANUP: validate selected models against available list
    setSelectedModels(prev => prev.filter(id => curatedModels.find(m => m.id === id) || id === 'qwen/qwen3-32b'));
  }, [apiKey]);

  // Initialize expanded state when models are selected
  useEffect(() => {
    setExpandedCards(prev => {
      const newState = { ...prev };
      selectedModels.forEach(id => {
        if (newState[id] === undefined) newState[id] = true; // Default to open
      });
      return newState;
    });
  }, [selectedModels]);

  // Expand/Collapse All Logic
  const toggleAllCards = () => {
    const allExpanded = selectedModels.every(id => expandedCards[id]);
    const newState = {};
    selectedModels.forEach(id => {
      newState[id] = !allExpanded;
    });
    setExpandedCards(prev => ({ ...prev, ...newState }));
  };


  // Initialize default inputs when prompt changes
  useEffect(() => {
    const currentPrompt = availablePrompts[activePromptId];
    if (currentPrompt && currentPrompt.inputs) {
      const defaultValues = {};
      currentPrompt.inputs.forEach(field => {
        if (field.defaultValue) {
          defaultValues[field.name] = field.defaultValue;
        }
        // Special handling for current_date
        if (field.name === 'current_date') {
          defaultValues[field.name] = new Date().toISOString().split('T')[0];
        }
      });
      setInputs(prev => ({ ...prev, ...defaultValues }));
    }
  }, [activePromptId]);


  const currentPrompt = availablePrompts[activePromptId];
  const inputFields = currentPrompt.inputs;


  const handleInputChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  /* BUG FIX: Clear outputs/metrics when toggling models to prevent stale data */
  const toggleModel = (modelId) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(prev => prev.filter(m => m !== modelId));
      // Clear output/metrics for this model
      setOutputs(prev => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });
      setMetrics(prev => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });
    } else {
      setSelectedModels(prev => [...prev, modelId]);
    }
  };


  const runRequest = async (modelId) => {
    console.log(`[App] runRequest started for model: ${modelId}`);
    try {
      if (!session) {
        console.warn('[App] No session, aborting runRequest');
        return;
      }

      setLoading(prev => ({ ...prev, [modelId]: true }));
      const startTime = performance.now();

      setExpandedCards(prev => ({ ...prev, [modelId]: true })); // Auto-expand card

      // Check prompt
      if (!currentPrompt) throw new Error("Invalid prompt selected");

      // Validate inputs
      const visibleInputs = currentPrompt.inputs || [];
      const missingInputs = visibleInputs.filter(f => {
        return !inputs[f.name] && inputs[f.name] !== 0;
      });

      if (missingInputs.length > 0) {
        const missingNames = missingInputs.map(f => f.label).join(', ');
        throw new Error(`Missing inputs: ${missingNames}`);
      }

      // Prepare messages
      let messages = [
        { role: "system", content: currentPrompt.system || "You are a helpful AI assistant." }
      ];

      // OPTIMIZATION: Inject strict constraints upfront for small word counts to avoid retries
      const optimizationTarget = parseInt(inputs['word_count']);
      if (!isNaN(optimizationTarget) && optimizationTarget < 250) {
        messages.push({
          role: "system",
          content: `STRICT LENGTH CONSTRAINT: The user requires a very short summary (approx ${optimizationTarget} words). \n1. Keep it extremely concise. \n2. Go straight to the point without introductory fluff.\n3. Absolute maximum length: ${optimizationTarget + 20} words.`
        });
      }

      // Helper to replace placeholders
      const replacePlaceholders = (template, values) => {
        return template.replace(/{+(.*?)}+/g, (match, key) => values[key.trim()] || match);
      };

      // Add user messages from template
      if (currentPrompt.template) {
        messages.push({
          role: "user",
          content: replacePlaceholders(currentPrompt.template, inputs)
        });
      } else if (currentPrompt.messages) {
        currentPrompt.messages.forEach(msg => {
          messages.push({
            role: msg.role,
            content: replacePlaceholders(msg.content, inputs)
          });
        });
      } else {
        throw new Error("Prompt configuration invalid: missing template or messages");
      }

      console.log(`[App] Sending request to ${modelId} with payload:`, JSON.stringify(messages, null, 2));
      console.log('[App] Messages prepared, calling API...');
      const targetWordCount = inputs['word_count'];

      const { content: resultText, attempts } = await callOpenRouter(modelId, messages, apiKey, targetWordCount);
      console.log('[App] API returned successfully');

      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      const wordCount = countWords(resultText);

      setOutputs(prev => ({ ...prev, [modelId]: resultText }));
      setMetrics(prev => ({
        ...prev,
        [modelId]: { time: duration, words: wordCount, attempts: attempts }
      }));
      setSaveStatus(prev => ({ ...prev, [modelId]: null }));

      // SUPABASE LOGGING
      try {
        const { error } = await supabase.from('evaluation_logs').insert({
          user_id: session.user.id !== 'local-user' ? session.user.id : null,
          query: inputs['text_input'] || JSON.stringify(inputs),
          model: modelId,
          time_taken: duration,
          iterations: attempts,
          target_words: inputs['word_count'] ? parseInt(inputs['word_count']) : null,
          output_words: wordCount,
          output_text: resultText
        });
        if (error) console.error('[App] Supabase log error:', error);
      } catch (logErr) {
        console.error('[App] Logging failed:', logErr);
      }

    } catch (err) {
      console.error('[App] runRequest caught error:', err);
      setOutputs(prev => ({ ...prev, [modelId]: `DEBUG ERROR: ${err.message}\n\nSTACK:\n${err.stack}` }));
    } finally {
      setLoading(prev => ({ ...prev, [modelId]: false }));
    }
  };

  /* Save Best Output to Supabase */
  const saveOutput = async (modelId) => {
    const textToSave = outputs[modelId];
    if (!textToSave || textToSave.startsWith('Error:')) return;

    try {
      if (saveStatus[modelId] === 'saved') return; // Already saved

      setSaveStatus(prev => ({ ...prev, [modelId]: 'saving' }));

      const { error } = await supabase.from('saved_outputs').insert({
        user_id: session.user.id !== 'local-user' ? session.user.id : null,
        prompt_id: activePromptId,
        model: modelId,
        input_data: inputs,
        output_text: textToSave
      });

      if (error) throw error;

      console.log('[App] Saved successfully to Supabase');
      setSaveStatus(prev => ({ ...prev, [modelId]: 'saved' }));

      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [modelId]: null }));
      }, 3000);

    } catch (err) {
      console.error('[App] Failed to save:', err);
      setSaveStatus(prev => ({ ...prev, [modelId]: 'error' }));
    }
  };

  const handleRunAll = () => {
    if (!apiKey) {
      alert("Please enter your OpenRouter API Key first.");
      return;
    }

    setOutputs({});
    setMetrics({});
    setSaveStatus({});

    selectedModels.forEach((modelId) => {
      runRequest(modelId);
    });
  };



  // if (!session) {
  //   return <Login />
  // }

  return (
    <div className="relative min-h-screen bg-primary text-text-primary font-sans transition-colors duration-300 selection:bg-accent/30 overflow-hidden">
      {/* Dynamic Aurora Background */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-xl border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
              <Play className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="text-lg font-bold tracking-tight text-text-primary">
              Tejas Prompt Evaluator
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-secondary border border-border text-text-secondary hover:text-accent transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative group">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="OpenRouter API Key"
                className="bg-input border border-border rounded-full px-4 py-1.5 text-sm w-48 focus:w-64 transition-all outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <button
              onClick={() => {
                const confirmReset = window.confirm('Reset current session data?');
                if (confirmReset) {
                  setInputs({});
                  setOutputs({});
                  setMetrics({});
                  // setSession(null); // DO NOT NULLIFY SESSION
                }
              }}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Reset App
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12 grid grid-cols-12 gap-8">
        {/* LEFT SIDEBAR - CONTROLS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* TABBED PROMPT SELECTOR - FIXED WIDTH */}
          <div className="max-w-full w-full">
            <div className="bg-card backdrop-blur-xl border border-border p-1.5 rounded-2xl shadow-xl flex gap-1 overflow-x-auto custom-scrollbar transition-colors duration-300">
              {Object.entries(availablePrompts).map(([id, prompt]) => (
                <button
                  key={id}
                  onClick={() => setActivePromptId(id)}
                  className={`flex-1 min-w-fit px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activePromptId === id
                    ? 'bg-violet-600 text-white border border-violet-600 shadow-md shadow-violet-500/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-secondary'
                    }`}
                >
                  {prompt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Input Fields */}
          <div className="bg-card backdrop-blur-xl border border-border p-5 rounded-2xl shadow-xl space-y-4 hover:shadow-2xl transition-all duration-300">
            <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Inputs</h2>
            {inputFields.map(field => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary ml-1">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[150px] resize-y transition-all"
                    placeholder={field.placeholder}
                    value={inputs[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                ) : field.name === 'current_date' ? (
                  // NATIVE DATE PICKER
                  <input
                    type="date"
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all [color-scheme:dark] data-[theme=light]:[color-scheme:light]"
                    value={inputs[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                    value={inputs[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  >
                    <option value="" disabled>Select {field.label}</option>
                    {field.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                    placeholder={field.placeholder}
                    value={inputs[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Model Selector - IMPROVED VISIBILITY + Global Expand/Collapse */}
          <div className="bg-card backdrop-blur-xl border border-border p-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider">Models</h2>
                <span className="text-xs text-text-secondary bg-secondary px-2 py-0.5 rounded-full">{selectedModels.length} selected</span>
              </div>

              {/* GLOBAL EXPAND/COLLAPSE BUTTON */}
              <button
                onClick={toggleAllCards}
                className="text-xs font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                title="Toggle all results"
              >
                {selectedModels.every(id => expandedCards[id]) ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  title={selectedModels.includes(model.id) ? "Click to Deselect" : "Click to Select"}
                  className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all transform duration-200 ${selectedModels.includes(model.id)
                    ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/30 scale-105' // Active: Explicit high contrast colors
                    : 'bg-input text-text-secondary border-border hover:border-accent hover:text-accent hover:scale-105' // Inactive: Hover effect
                    }`}
                >
                  <span className="flex items-center gap-2">
                    {selectedModels.includes(model.id) && <CheckCircle2 className="w-3 h-3" />}
                    {model.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunAll}
            disabled={Object.values(loading).some(Boolean) || !apiKey}
            // FIXED: Use standard Violet-600 color to guarantee visibility in light mode
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
            <span className="tracking-wide">RUN EVALUATION</span>
          </button>

        </div>

        {/* RIGHT MAIN Content - RESULTS */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {selectedModels.map((modelId) => (
            <div key={modelId} className="bg-card backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
              {/* Card Header (Click to Toggle) */}
              <div
                className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors group"
                onClick={() => toggleCard(modelId)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-all ${expandedCards[modelId] ? 'bg-accent/10 ring-1 ring-accent/50' : 'bg-input ring-1 ring-border'}`}>
                    {expandedCards[modelId] ? (
                      <ChevronDown className="w-4 h-4 text-accent" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary group-hover:text-accent transition-colors">
                      {availableModels.find(m => m.id === modelId)?.name || modelId}
                    </h3>
                    <p className="text-xs text-text-tertiary">{modelId.split('/')[0]}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* METRICS */}
                  {metrics[modelId] && (
                    <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border">
                        <Clock className="w-3 h-3" />
                        {metrics[modelId].time}s
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-secondary border border-border">
                        {metrics[modelId].words} words
                      </div>
                      <div className={`px-3 py-1.5 rounded-full border ${metrics[modelId].attempts > 1 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-secondary border-border'}`}>
                        {metrics[modelId].attempts} iter
                      </div>
                    </div>
                  )}

                  {/* SAVE BUTTON */}
                  {outputs[modelId] && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveOutput(modelId);
                      }}
                      className={`p-2 rounded-lg transition-colors ${saveStatus[modelId] === 'saved'
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'bg-secondary text-text-tertiary hover:bg-accent/10 hover:text-accent'
                        }`}
                      title="Save as Best Output"
                    >
                      {saveStatus[modelId] === 'saved' ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className={`transition-all duration-300 ease-in-out border-t border-border bg-card/50 ${expandedCards[modelId] ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="relative h-[400px]">
                  {loading[modelId] ? (
                    <div className="absolute inset-0 flex items-center justify-center space-y-4 flex-col">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <p className="text-sm font-medium text-text-secondary animate-pulse">Generating...</p>
                    </div>
                  ) : outputs[modelId] ? (
                    <div className="h-full overflow-y-auto p-6 scroll-smooth">
                      <MarkdownOutput content={outputs[modelId] || ''} />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-text-tertiary text-sm italic">
                      Ready to run
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
