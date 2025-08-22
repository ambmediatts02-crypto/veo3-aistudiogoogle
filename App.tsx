import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Project, AspectRatio, GenerationStatus, BaseImage, VideoOptions, GenerationMode, GeneratedPrompts, StoryboardImage, ObjectRole, DirectorStyle, Scene, ChatMessage, ChatSession, VideoModel } from './types';
import { LOADING_MESSAGES } from './constants';
import { generateVideo, pollVideoStatus, fetchVideoBlob, generatePromptFromStoryboard, getCreativeSpark, regenerateScene, translateText, startChat, summarizeChatIntoBrief, generateChatTitle, generateAudioNarration } from './services/geminiService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { SingleScene } from './components/SingleScene';
import { StoryboardEditor } from './components/StoryboardEditor';
import { Loader } from './components/Loader';
import { VideoResult } from './components/VideoResult';
import { PromptResult } from './components/PromptResult';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { MenuIcon, FolderIcon } from './components/icons';
import { ProjectManagerModal } from './components/ProjectManagerModal';

const createNewProject = (name: string): Project => ({
  id: crypto.randomUUID(),
  name: name,
  createdAt: Date.now(),
  mode: GenerationMode.STORYBOARD,
  singlePrompt: '',
  singleReferenceImage: null,
  generatedVideoUrl: null,
  videoModel: VideoModel.VEO_2, // <-- FIX: Added default video model
  mainBrief: '',
  backgroundImage: null,
  objectImages: [],
  directorStyle: DirectorStyle.NONE,
  generatedPrompts: null,
});


const App: React.FC = () => {
  // --- Persisted State ---
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('active-project-id', null);
  const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>('chat-sessions', []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>('active-chat-id', null);

  // --- UI State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // --- Common State ---
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  
  // --- Local UI State ---
  const [isSparking, setIsSparking] = useState<boolean>(false);
  const [dialogueMode, setDialogueMode] = useState<boolean>(false);
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [isFinalizingScript, setIsFinalizingScript] = useState<boolean>(false);
  const chatInstance = React.useRef<any | null>(null);

  // --- Derived State for Active Project ---
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  const updateActiveProject = useCallback((data: Partial<Project>) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p =>
      p.id === activeProjectId ? { ...p, ...data } : p
    ));
  }, [activeProjectId, setProjects]);


  // --- Derived State for Active Chat ---
  const activeChatSession = useMemo(() => {
    return chatSessions.find(s => s.id === activeChatId) || null;
  }, [chatSessions, activeChatId]);

  const setChatHistory = (updater: React.SetStateAction<ChatMessage[]>) => {
    if (!activeChatId) return;
    setChatSessions(prevSessions =>
      prevSessions.map(session => {
        if (session.id === activeChatId) {
          const newHistory = typeof updater === 'function' ? updater(session.history) : updater;
          return { ...session, history: newHistory };
        }
        return session;
      })
    );
  };

  // --- Effects ---
  useEffect(() => {
    // This effect handles initialization and recovery for projects.
    if (projects.length === 0) {
      const firstProject = createNewProject('My First Project');
      setProjects([firstProject]);
      setActiveProjectId(firstProject.id);
    } else {
      const activeProjectExists = projects.some(p => p.id === activeProjectId);
      if (!activeProjectExists) {
        setActiveProjectId(projects[0].id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);
  
  useEffect(() => {
    // This effect handles initialization and recovery for chat sessions.
    if (chatSessions.length === 0) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        history: [],
        isPinned: false,
        createdAt: Date.now(),
      };
      setChatSessions([newSession]);
      setActiveChatId(newSession.id);
    } else {
      const activeChatExists = chatSessions.some(s => s.id === activeChatId);
      if (!activeChatExists) {
        setActiveChatId(chatSessions[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSessions]);

  useEffect(() => {
    // Reset Gemini chat instance when active chat changes
    chatInstance.current = null;
  }, [activeChatId]);

  // Contextual Sidebar Effect
  useEffect(() => {
    if (activeProject?.mode === GenerationMode.STORYBOARD) {
        setIsSidebarOpen(dialogueMode);
    } else {
        setIsSidebarOpen(false);
    }
  }, [dialogueMode, activeProject?.mode]);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (generationStatus === GenerationStatus.GENERATING) {
      const messages = LOADING_MESSAGES;
      let messageIndex = 0;
      setLoadingMessage(messages[0]);
      interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        setLoadingMessage(messages[messageIndex]);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [generationStatus]);


  // --- Project Management Handlers ---
  const handleCreateProject = () => {
    const newProject = createNewProject(`Project ${projects.length + 1}`);
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setIsProjectModalOpen(false);
  };

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => {
      const remainingProjects = prev.filter(p => p.id !== id);
      if (activeProjectId === id) {
        setActiveProjectId(remainingProjects[0]?.id || null);
      }
      return remainingProjects;
    });
  };

  const handleRenameProject = (id: string, newName: string) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, name: newName.trim() } : p)));
  };


  // --- Chat Session Management ---
  const handleNewChat = (switchToDialogue = true) => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      history: [],
      isPinned: false,
      createdAt: Date.now(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    if (switchToDialogue) {
        setDialogueMode(true);
    }
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setDialogueMode(true);
  };

  const handleDeleteChat = (id: string) => {
    setChatSessions(prev => {
      const remainingSessions = prev.filter(s => s.id !== id);
      if (activeChatId === id) {
        setActiveChatId(remainingSessions[0]?.id || null);
      }
      return remainingSessions;
    });
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setChatSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
  };

  const handlePinChat = (id: string, isPinned: boolean) => {
    setChatSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned } : s));
  };


  // --- Core Functionality Handlers ---
  const resetStateForMode = (newMode: GenerationMode) => {
    setError(null);
    setGenerationStatus(GenerationStatus.IDLE);
    setDialogueMode(false);
    updateActiveProject({ 
        mode: newMode,
        generatedVideoUrl: null,
        generatedPrompts: null,
        directorStyle: DirectorStyle.NONE
    });
    if (newMode === GenerationMode.SINGLE) {
        setIsSidebarOpen(false);
    }
  }

  const updateObjectImageRole = (id: string, role: ObjectRole) => {
    const newObjectImages = activeProject?.objectImages.map(img => img.id === id ? { ...img, role } : img) ?? [];
    updateActiveProject({ objectImages: newObjectImages });
  };
  
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !activeChatSession || !activeProject) return;
    
    const isFirstMessage = activeChatSession.history.length === 0 && activeChatSession.title === 'New Chat';
    const currentHistory = activeChatSession.history;
    const userMessage: ChatMessage = { role: 'user', text: message };

    setChatHistory(prev => [...prev, userMessage]);
    setIsChatting(true);
    setError(null);

    if (isFirstMessage) {
      generateChatTitle(message).then(newTitle => {
        if (newTitle) handleRenameChat(activeChatSession.id, newTitle);
      }).catch(console.error);
    }

    try {
        if (!chatInstance.current) {
            chatInstance.current = startChat();
        }
        const responseText = await chatInstance.current.sendMessage(
            activeProject.backgroundImage, 
            activeProject.objectImages, 
            [...currentHistory, userMessage]
        );
        const modelMessage: ChatMessage = { role: 'model', text: responseText };
        setChatHistory(prev => [...prev, modelMessage]);
    } catch (err: any) {
        setError(err.message || "An error occurred in the chat.");
        setChatHistory(prev => prev.slice(0, -1));
    } finally {
        setIsChatting(false);
    }
  };
  
  const handleFinalizeScript = async () => {
    if (!activeChatSession || activeChatSession.history.length === 0) return;
    setIsFinalizingScript(true);
    setError(null);
    try {
      const summarizedBrief = await summarizeChatIntoBrief(activeChatSession.history);
      updateActiveProject({ mainBrief: summarizedBrief });
      setDialogueMode(false);
    } catch (err: any) {
      setError(err.message || "Could not finalize the script.");
    } finally {
      setIsFinalizingScript(false);
    }
  };

  const handleCreativeSpark = async () => {
    if (!activeProject?.mainBrief.trim()) {
      setError("Write a brief first to get a Creative Spark.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setIsSparking(true);
    setError(null);
    try {
        const spark = await getCreativeSpark(activeProject.mainBrief);
        updateActiveProject({ mainBrief: `${activeProject.mainBrief}\n\n${spark}` });
    } catch (err: any) {
        setError(err.message || "Could not get a Creative Spark.");
    } finally {
        setIsSparking(false);
    }
  };

  const handleGeneration = useCallback(async () => {
    if (!activeProject) return;
    setError(null);
    setGenerationStatus(GenerationStatus.GENERATING);
    updateActiveProject({ generatedVideoUrl: null, generatedPrompts: null });

    try {
        if (activeProject.mode === GenerationMode.SINGLE) {
            const operation = await generateVideo(
                activeProject.singlePrompt,
                { aspectRatio: AspectRatio.SIXTEEN_NINE }, // Example, could be made dynamic
                activeProject.singleReferenceImage,
                activeProject.videoModel
            );
            const finalOperation = await pollVideoStatus(operation, () => {});
            const downloadLink = finalOperation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("Video generation succeeded but no download link was found.");
            
            const videoUrl = await fetchVideoBlob(downloadLink);
            updateActiveProject({ generatedVideoUrl: videoUrl });
        } else {
            const prompts = await generatePromptFromStoryboard(
                activeProject.mainBrief, 
                activeProject.backgroundImage, 
                activeProject.objectImages, 
                activeProject.directorStyle
            );
            updateActiveProject({ generatedPrompts: prompts });
        }
        setGenerationStatus(GenerationStatus.SUCCESS);
    } catch(err: any) {
        setError(err.message || "An unexpected error occurred during generation.");
        setGenerationStatus(GenerationStatus.ERROR);
    }
  }, [activeProject, updateActiveProject]);

  // --- Render Logic ---
  const isGenerating = generationStatus === GenerationStatus.GENERATING;
  const isButtonDisabled = isGenerating || 
    (activeProject?.mode === GenerationMode.SINGLE && !activeProject?.singlePrompt.trim()) ||
    (activeProject?.mode === GenerationMode.STORYBOARD && !activeProject?.mainBrief.trim() && !dialogueMode);
    
  const getButtonText = () => {
    if (isGenerating) return "Generating...";
    if (activeProject?.mode === GenerationMode.SINGLE) return "Generate Video";
    return "Generate Prompt";
  }

  const hasOutput = isGenerating || error || (generationStatus === GenerationStatus.SUCCESS && (activeProject?.generatedVideoUrl || activeProject?.generatedPrompts));

  if (!activeProject) {
    return (
        <div className="h-screen bg-brand-bg-dark flex items-center justify-center">
            <Loader message="Loading projects..." />
        </div>
    );
  }

  return (
    <div className="h-screen bg-brand-bg-dark font-sans flex text-brand-text">
        {activeProject.mode === GenerationMode.STORYBOARD && (
             <ChatHistorySidebar 
                isOpen={isSidebarOpen}
                sessions={chatSessions}
                activeSessionId={activeChatId}
                onSelectSession={handleSelectChat}
                onNewChat={() => handleNewChat(true)}
                onRenameSession={handleRenameChat}
                onPinSession={handlePinChat}
                onDeleteSession={handleDeleteChat}
                onClose={() => setIsSidebarOpen(false)}
            />
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
             <header className="flex-shrink-0 border-b border-brand-border p-4 flex justify-center items-center relative">
                 {activeProject.mode === GenerationMode.STORYBOARD && (
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="absolute top-1/2 -translate-y-1/2 left-4 p-2 rounded-md hover:bg-brand-bg-light transition-colors z-20"
                        title={isSidebarOpen ? "Close Menu" : "Open Menu"}
                    >
                        <MenuIcon className="w-6 h-6 text-brand-text-secondary"/>
                    </button>
                )}
                <Header />
                 <button 
                    onClick={() => setIsProjectModalOpen(true)}
                    className="absolute top-1/2 -translate-y-1/2 right-4 p-2 rounded-md hover:bg-brand-bg-light transition-colors z-20"
                    title="Manage Projects"
                 >
                    <FolderIcon className="w-6 h-6 text-brand-text-secondary"/>
                 </button>
             </header>

            <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                <div className="max-w-6xl mx-auto flex flex-col gap-8">
                    {/* Controls Section */}
                    <div className="bg-brand-bg-light p-6 rounded-lg border border-brand-border shadow-lg">
                        <ModeSelector mode={activeProject.mode} setMode={resetStateForMode} disabled={isGenerating} />
                        {activeProject.mode === GenerationMode.SINGLE ? (
                            <SingleScene
                                prompt={activeProject.singlePrompt}
                                setPrompt={(p) => updateActiveProject({ singlePrompt: p })}
                                referenceImage={activeProject.singleReferenceImage}
                                setReferenceImage={(img) => updateActiveProject({ singleReferenceImage: img })}
                                disabled={isGenerating}
                                videoModel={activeProject.videoModel}
                                setVideoModel={(m) => updateActiveProject({ videoModel: m })}
                            />
                        ) : (
                            <StoryboardEditor 
                                mainBrief={activeProject.mainBrief}
                                setMainBrief={(updater) => {
                                    if (!activeProject) return;
                                    const newValue = typeof updater === 'function' ? updater(activeProject.mainBrief) : updater;
                                    updateActiveProject({ mainBrief: newValue });
                                }}
                                backgroundImage={activeProject.backgroundImage}
                                setBackgroundImage={(img) => updateActiveProject({ backgroundImage: img })}
                                objectImages={activeProject.objectImages}
                                setObjectImages={(updater) => {
                                    if (!activeProject) return;
                                    const newValue = typeof updater === 'function' ? updater(activeProject.objectImages) : updater;
                                    updateActiveProject({ objectImages: newValue });
                                }}
                                updateObjectImageRole={updateObjectImageRole}
                                directorStyle={activeProject.directorStyle}
                                setDirectorStyle={(style) => updateActiveProject({ directorStyle: style })}
                                onCreativeSpark={handleCreativeSpark}
                                isSparking={isSparking}
                                disabled={isGenerating}
                                dialogueMode={dialogueMode}
                                setDialogueMode={setDialogueMode}
                                chatHistory={activeChatSession?.history || []}
                                onSendMessage={handleSendMessage}
                                isChatting={isChatting}
                                onFinalizeScript={handleFinalizeScript}
                                isFinalizingScript={isFinalizingScript}
                            />
                        )}
                        <div className="mt-8">
                            <button
                                onClick={handleGeneration}
                                disabled={isButtonDisabled}
                                className="w-full py-3 px-6 bg-brand-purple text-white font-bold rounded-lg hover:bg-brand-purple-light transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                            >
                                {getButtonText()}
                            </button>
                        </div>
                    </div>

                    {/* Output Section */}
                    {isGenerating && <Loader message={loadingMessage} />}
                    {error && <ErrorDisplay message={error} />}
                    {generationStatus === GenerationStatus.SUCCESS && activeProject.generatedVideoUrl && activeProject.mode === GenerationMode.SINGLE && (
                        <VideoResult videoUrl={activeProject.generatedVideoUrl} prompt={activeProject.singlePrompt} />
                    )}
                    {generationStatus === GenerationStatus.SUCCESS && activeProject.generatedPrompts && activeProject.mode === GenerationMode.STORYBOARD && (
                        <PromptResult 
                            prompts={activeProject.generatedPrompts}
                        />
                    )}
                    
                    {!hasOutput && (
                        <div className="text-center p-8">
                            <h2 className="text-xl font-semibold text-brand-text">Awaiting Your Vision</h2>
                            <p className="mt-2 text-sm text-brand-text-secondary">Configure your scene above and click 'Generate' to bring it to life.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
        <ProjectManagerModal 
            isOpen={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
        />
    </div>
  );
};

export default App;
