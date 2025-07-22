import React, { useState, useEffect } from 'react';
import { Settings, Copy, Check, AlertCircle, Wand2 } from 'lucide-react';

interface AppSettings {
  claudeApiKey: string;
  openaiApiKey: string;
  selectedModel: 'claude' | 'openai';
  customPrompt: string;
  selectedStyle: string;
}

type StylePreset = 'professional' | 'friendly' | 'concise' | 'detailed' | 'update';

const JiraCommentRewriter: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [claudeApiKey, setClaudeApiKey] = useState<string>('');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'claude' | 'openai'>('claude');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>('professional');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('jiraRewriterSettings');
    if (savedSettings) {
      const settings: AppSettings = JSON.parse(savedSettings);
      setClaudeApiKey(settings.claudeApiKey || '');
      setOpenaiApiKey(settings.openaiApiKey || '');
      setSelectedModel(settings.selectedModel || 'claude');
      setCustomPrompt(settings.customPrompt || '');
      setSelectedStyle(settings.selectedStyle as StylePreset || 'professional');
    }
  }, []);

  // Save settings to localStorage automatically
  useEffect(() => {
    const settings: AppSettings = {
      claudeApiKey,
      openaiApiKey,
      selectedModel,
      customPrompt,
      selectedStyle
    };
    localStorage.setItem('jiraRewriterSettings', JSON.stringify(settings));
  }, [claudeApiKey, openaiApiKey, selectedModel, customPrompt, selectedStyle]);

  const stylePresets: Record<StylePreset, string> = {
    professional: "Rewrite this text in a professional, clear, and concise manner suitable for business communication in Jira. Use appropriate formatting.",
    friendly: "Rewrite this text in a friendly but professional tone, making it approachable while maintaining clarity for team collaboration.",
    concise: "Rewrite this text to be as concise as possible while retaining all important information. Focus on brevity and clarity.",
    detailed: "Rewrite this text with more detail and context, making it comprehensive and thorough for technical documentation.",
    update: "Rewrite this as a clear project update, organizing information logically with status, progress, and next steps."
  };

  const getPrompt = (): string => {
    const basePrompt = customPrompt || stylePresets[selectedStyle];
    return `${basePrompt}

Important formatting requirements for Jira COMMENTS (not wiki):
- Use *bold* for emphasis (surround with asterisks)
- Use _italic_ for secondary emphasis (surround with underscores)
- Use \`code\` for inline code or technical terms (surround with backticks)
- Use * for bullet points (asterisk followed by space)
- Use # for headings (hash followed by space)
- Use \`\`\` for code blocks (triple backticks on separate lines)
- Do NOT use {code}, {quote}, {noformat}, h1., h2., h3. - these don't work in Jira comments
- Keep sentences clear and scannable
- Use proper line breaks for readability

Text to rewrite: "${inputText}"`;
  };

  const callClaudeAPI = async (): Promise<string> => {
    // Use CORS proxy for GitHub Pages deployment
    const corsProxy = "https://api.allorigins.win/raw?url=";
    const apiUrl = "https://api.anthropic.com/v1/messages";
    
    const response = await fetch(corsProxy + encodeURIComponent(apiUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: getPrompt()
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  };

  const callOpenAIAPI = async (): Promise<string> => {
    // Use CORS proxy for GitHub Pages deployment
    const corsProxy = "https://api.allorigins.win/raw?url=";
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    
    const response = await fetch(corsProxy + encodeURIComponent(apiUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: getPrompt()
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const handleRewrite = async (): Promise<void> => {
    if (!inputText.trim()) {
      setError('Please enter some text to rewrite');
      return;
    }

    const apiKey = selectedModel === 'claude' ? claudeApiKey : openaiApiKey;
    if (!apiKey) {
      setError(`Please enter your ${selectedModel === 'claude' ? 'Claude' : 'OpenAI'} API key in settings`);
      return;
    }

    setIsLoading(true);
    setError('');
    setOutputText('');

    try {
      let result: string;
      if (selectedModel === 'claude') {
        result = await callClaudeAPI();
      } else {
        result = await callOpenAIAPI();
      }
      setOutputText(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Jira Comment Rewriter</h1>
        <p className="text-gray-600">Transform your text into professional, well-formatted Jira comments using AI</p>
      </div>

      {/* Settings Panel */}
      <div className="mb-6">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>

        {showSettings && (
          <div className="mt-4 p-6 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* API Keys */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Claude API Key
                </label>
                <input
                  type="password"
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as 'claude' | 'openai')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="claude">Claude 3.5 Sonnet</option>
                  <option value="openai">GPT-4</option>
                </select>
              </div>

              {/* Style Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Writing Style
                </label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value as StylePreset)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                  <option value="update">Project Update</option>
                </select>
                
                {/* Show current prompt preview */}
                <div className="mt-2 p-3 bg-gray-100 rounded-md">
                  <p className="text-xs font-medium text-gray-600 mb-1">Current Prompt:</p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {customPrompt || stylePresets[selectedStyle]}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Prompt (optional - overrides style preset)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter your custom rewriting instructions..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {customPrompt && (
                <p className="mt-1 text-xs text-blue-600">
                  ✓ Using custom prompt (style preset ignored)
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span>💾 Settings auto-save as you type</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Original Text
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your text here to rewrite for Jira..."
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          
          <button
            onClick={handleRewrite}
            disabled={isLoading || !inputText.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Rewriting...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Rewrite for Jira
              </>
            )}
          </button>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Jira-Optimized Output
            </label>
            {outputText && (
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          
          <div className="relative">
            <textarea
              value={outputText}
              readOnly
              placeholder="Rewritten text will appear here..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 resize-none"
            />
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Jira Formatting Guide */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Jira Comment Formatting Quick Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><code>*bold*</code> → <strong>bold</strong></div>
          <div><code>_italic_</code> → <em>italic</em></div>
          <div><code>`code`</code> → <code>code</code></div>
          <div><code># Heading</code> → Large heading</div>
          <div><code>* bullet</code> → • bullet</div>
          <div><code>```code block```</code> → Code block</div>
        </div>
        <div className="mt-2 text-xs text-blue-700">
          <strong>Note:</strong> This uses Jira comment formatting (not wiki markup). Syntax like {"{code}"}, h1., h2. won't work in comments.
        </div>
      </div>
    </div>
  );
};

export default JiraCommentRewriter;
