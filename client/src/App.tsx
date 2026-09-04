import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { ExecutionTimeline, TraceStep } from './components/ExecutionTimeline.js';
import { BottomPanel } from './components/BottomPanel.js';

// Perspective Views
import { HomeView } from './views/HomeView.js';
import { ChatView } from './views/ChatView.js';
import { CodeView } from './views/CodeView.js';
import { ResearchView } from './views/ResearchView.js';
import { DataView } from './views/DataView.js';
import { SqlView } from './views/SqlView.js';
import { AutomationView } from './views/AutomationView.js';
import { MediaView } from './views/MediaView.js';
import { DocumentView } from './views/DocumentView.js';
import { ModelManagerView } from './views/ModelManagerView.js';
import { SettingsView } from './views/SettingsView.js';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activePerspective, setActivePerspective] = useState<string>('home');
  const [isBottomCollapsed, setIsBottomCollapsed] = useState<boolean>(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);

  // Chat & Execution States
  const [messages, setMessages] = useState<any[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome to OmniWorkspace. I am your Universal AI Co-Pilot. I can help you write and debug code, conduct web research, run SQL queries, analyze datasets, execute workflows, and coordinate media models. What would you like to build today?',
      timestamp: 'Ready',
    },
  ]);
  const [traces, setTraces] = useState<TraceStep[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeAgent, setActiveAgent] = useState<string>('Universal Orchestrator');
  const [activeModelName, setActiveModelName] = useState<string>('Optimal Auto');

  // Load system health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthInfo(data))
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  /**
   * Universal Task Orchestrator Dispatcher:
   * Handles natural language instructions typed into either the top command bar or the chat view.
   * Connects to the SSE `/api/orchestrate/stream` endpoint for live streaming tokens & traces.
   */
  const executeOrchestrator = async (prompt: string, manualAgent?: string) => {
    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantMsgId = `ai_${Date.now()}`;
    const assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await fetch('/api/orchestrate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, agentType: manualAgent }),
      });

      if (!response.body) throw new Error('Response body empty');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:') && currentEvent) {
            const dataStr = line.slice(5).trim();
            try {
              const parsed = JSON.parse(dataStr);

              if (currentEvent === 'classification') {
                setActiveAgent(parsed.suggestedAgent.toUpperCase() + ' AGENT');
                // Automatically switch perspective if requested by orchestrator
                if (parsed.primaryCategory && activePerspective === 'home') {
                  setActivePerspective(parsed.primaryCategory);
                }
              } else if (currentEvent === 'trace') {
                setTraces((prev) => {
                  const existingIdx = prev.findIndex((t) => t.id === parsed.id);
                  if (existingIdx >= 0) {
                    const copy = [...prev];
                    copy[existingIdx] = parsed;
                    return copy;
                  }
                  return [...prev, parsed];
                });
              } else if (currentEvent === 'token') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: m.content + parsed.delta } : m
                  )
                );
              } else if (currentEvent === 'done') {
                if (parsed.response) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: parsed.response }
                        : m
                    )
                  );
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `Task execution encountered an error: ${err.message}` }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        onUniversalSubmit={(p) => {
          executeOrchestrator(p);
          if (activePerspective === 'home') setActivePerspective('chat');
        }}
        activeModelName={activeModelName}
        theme={theme}
        onToggleTheme={toggleTheme}
        isStreaming={isStreaming}
      />

      {/* Main Workspace Body */}
      <div className="main-viewport">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activePerspective={activePerspective}
          onSelectPerspective={(id) => setActivePerspective(id)}
        />

        {/* Center Workspace Canvas */}
        <main className="center-workspace">
          <div className="view-content-wrapper">
            {activePerspective === 'home' && (
              <HomeView
                onSelectPerspective={(p) => setActivePerspective(p)}
                onExecutePrompt={(prompt) => {
                  setActivePerspective('chat');
                  executeOrchestrator(prompt);
                }}
                healthInfo={healthInfo}
              />
            )}
            {activePerspective === 'chat' && (
              <ChatView
                messages={messages}
                onSendMessage={(msg) => executeOrchestrator(msg)}
                isStreaming={isStreaming}
                activeModelName={activeModelName}
              />
            )}
            {activePerspective === 'code' && <CodeView />}
            {activePerspective === 'research' && <ResearchView />}
            {activePerspective === 'data' && <DataView />}
            {activePerspective === 'sql' && <SqlView />}
            {activePerspective === 'automation' && <AutomationView />}
            {activePerspective === 'media' && <MediaView />}
            {activePerspective === 'documents' && <DocumentView />}
            {activePerspective === 'models' && <ModelManagerView />}
            {activePerspective === 'settings' && (
              <SettingsView theme={theme} onToggleTheme={toggleTheme} />
            )}
          </div>
        </main>

        {/* Right AI Execution Timeline */}
        <ExecutionTimeline
          traces={traces}
          activeAgent={activeAgent}
          activeModelName={activeModelName}
        />
      </div>

      {/* Bottom Collapsible Panel */}
      <BottomPanel
        isCollapsed={isBottomCollapsed}
        onToggleCollapse={() => setIsBottomCollapsed(!isBottomCollapsed)}
      />
    </div>
  );
};

export default App;
