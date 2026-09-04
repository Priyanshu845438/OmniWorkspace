import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { ExecutionTimeline, TraceStep } from './components/ExecutionTimeline.js';
import { BottomPanel } from './components/BottomPanel.js';
import { CommandPalette } from './components/CommandPalette.js';

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
import { ArchitectureView } from './views/ArchitectureView.js';
import { ModelManagerView } from './views/ModelManagerView.js';
import { SettingsView } from './views/SettingsView.js';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activePerspective, setActivePerspective] = useState<string>('home');
  const [isBottomCollapsed, setIsBottomCollapsed] = useState<boolean>(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);

  // Command Palette & Navigation State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedFileForCode, setSelectedFileForCode] = useState<string | null>(null);

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
  const [activeModelName] = useState<string>('Optimal Auto');

  // Task & Cancellation Tracking
  const currentTaskIdRef = useRef<string | null>(null);
  const currentAbortControllerRef = useRef<AbortController | null>(null);

  // Load system health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthInfo(data))
      .catch(() => {});
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K for Universal Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleOpenFileInCode = (filePath: string) => {
    setSelectedFileForCode(filePath);
    setActivePerspective('code');
  };

  /**
   * Universal Task Orchestrator Dispatcher:
   * Handles natural language instructions typed into either the top command bar or the chat view.
   * Connects to the SSE `/api/orchestrate/stream` endpoint for live streaming tokens & traces.
   */
  const executeOrchestrator = async (prompt: string, manualAgent?: string, activeFilePath?: string) => {
    // Abort any in-flight previous request cleanly before starting a new one
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort();
      currentAbortControllerRef.current = null;
    }

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setIsRightPanelOpen(true);
    setTraces([]);
    setActiveAgent('');

    const assistantMsgId = `ai_${Date.now()}`;
    const assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    currentTaskIdRef.current = taskId;
    const controller = new AbortController();
    currentAbortControllerRef.current = controller;

    try {
      const response = await fetch('/api/orchestrate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, agentType: manualAgent, taskId, activeFilePath }),
        signal: controller.signal,
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

              if (currentEvent === 'init') {
                if (parsed.taskId) currentTaskIdRef.current = parsed.taskId;
              } else if (currentEvent === 'classification') {
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
              } else if (currentEvent === 'cancelled') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content ? `${m.content}\n\n[Task stopped by user]` : 'Task execution stopped by user.' }
                      : m
                  )
                );
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content ? `${m.content}\n\n[Task stopped by user]` : 'Task execution stopped by user.' }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `Task execution encountered an error: ${err.message}` }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      currentAbortControllerRef.current = null;
    }
  };

  const handleCancelExecution = async () => {
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort();
    }
    const taskIdToCancel = currentTaskIdRef.current;
    if (taskIdToCancel) {
      try {
        await fetch('/api/orchestrate/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: taskIdToCancel }),
        });
      } catch {
        // network ignore
      }
    }
    setTraces((prev) => [
      ...prev,
      {
        id: `cancel_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'verification',
        title: 'Execution Terminated by User',
        status: 'failed',
        details: { reason: 'User invoked STOP execution control' },
      },
    ]);
    setIsStreaming(false);
  };

  return (
    <div className="app-container">
      {/* Universal Command Palette Modal (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectPerspective={(p) => setActivePerspective(p)}
        onOpenFile={handleOpenFileInCode}
        onExecuteCommand={async (cmd) => {
          setIsBottomCollapsed(false);
          await fetch('/api/terminal/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd }),
          });
        }}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      {/* Top Header */}
      <Header
        onUniversalSubmit={(p) => {
          setIsRightPanelOpen(true);
          executeOrchestrator(p);
          if (activePerspective === 'home') setActivePerspective('chat');
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        activeModelName={activeModelName}
        activePerspective={activePerspective}
        theme={theme}
        onToggleTheme={toggleTheme}
        isStreaming={isStreaming}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
        healthInfo={healthInfo}
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
                onApplyCode={() => {
                  setActivePerspective('code');
                }}
                onClearChat={() =>
                  setMessages([
                    {
                      id: 'welcome_reset',
                      role: 'assistant',
                      content: 'Conversation thread reset. How can I assist you now?',
                      timestamp: 'Ready',
                    },
                  ])
                }
              />
            )}
            {activePerspective === 'code' && (
              <CodeView
                initialFile={selectedFileForCode || undefined}
                onAskAi={(prompt, filePath) => {
                  setActivePerspective('chat');
                  executeOrchestrator(prompt, 'coding', filePath);
                }}
              />
            )}
            {activePerspective === 'architecture' && (
              <ArchitectureView onOpenFile={handleOpenFileInCode} />
            )}
            {activePerspective === 'research' && (
              <ResearchView
                onAskAi={(prompt) => {
                  setActivePerspective('chat');
                  executeOrchestrator(prompt, 'research');
                }}
              />
            )}
            {activePerspective === 'data' && (
              <DataView
                onAskAi={(prompt) => {
                  setActivePerspective('chat');
                  executeOrchestrator(prompt, 'data');
                }}
              />
            )}
            {activePerspective === 'sql' && (
              <SqlView
                onAskAi={(prompt) => {
                  setActivePerspective('chat');
                  executeOrchestrator(prompt, 'sql');
                }}
              />
            )}
            {activePerspective === 'automation' && (
              <AutomationView
                onAskAi={(prompt) => {
                  setActivePerspective('chat');
                  executeOrchestrator(prompt, 'automation');
                }}
              />
            )}
            {activePerspective === 'media' && (
              <MediaView
                onAskAi={(prompt) => {
                  setActivePerspective('chat');
                  executeOrchestrator(prompt, 'media');
                }}
              />
            )}
            {activePerspective === 'documents' && (
              <DocumentView
                onAskAi={(prompt) => {
                  setActivePerspective('chat');
                  executeOrchestrator(prompt, 'document');
                }}
              />
            )}
            {activePerspective === 'models' && <ModelManagerView />}
            {activePerspective === 'settings' && (
              <SettingsView theme={theme} onToggleTheme={toggleTheme} />
            )}
          </div>
        </main>

        {/* Right AI Execution Timeline (Collapsible, Space Optimized) */}
        {isRightPanelOpen && (
          <ExecutionTimeline
            traces={traces}
            activeAgent={activeAgent}
            activeModelName={activeModelName}
            isStreaming={isStreaming}
            onCancel={handleCancelExecution}
            onClose={() => setIsRightPanelOpen(false)}
          />
        )}
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
