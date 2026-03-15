import { create } from "zustand";

export interface AgentMessage {
  agent: string;
  content: string;
  done: boolean;
}

export interface DebateHistory {
  id: string;
  topic: string;
  agents_output: string;
  created_at: string;
}

export interface AgentChatHistory {
  id: string;
  agent_id: string;
  title: string;
  messages: string;
  created_at: string;
  updated_at: string;
}

interface DebateState {
  topic: string;
  messages: AgentMessage[];
  isStreaming: boolean;
  activeAgent: string | null;
  history: DebateHistory[];
  selectedDebate: DebateHistory | null;
  agentChatHistory: AgentChatHistory[];

  setTopic: (topic: string) => void;
  addMessage: (msg: AgentMessage) => void;
  updateLastMessage: (agent: string, content: string) => void;
  finishAgent: (agent: string) => void;
  setStreaming: (streaming: boolean) => void;
  setActiveAgent: (agent: string | null) => void;
  reset: () => void;
  setHistory: (history: DebateHistory[]) => void;
  removeFromHistory: (id: string) => void;
  setSelectedDebate: (debate: DebateHistory | null) => void;
  setAgentChatHistory: (h: AgentChatHistory[]) => void;
  removeAgentChat: (id: string) => void;
}

export const useDebateStore = create<DebateState>((set) => ({
  topic: "",
  messages: [],
  isStreaming: false,
  activeAgent: null,
  history: [],
  selectedDebate: null,
  agentChatHistory: [],

  setTopic: (topic) => set({ topic }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateLastMessage: (agent, content) =>
    set((state) => {
      const msgs = [...state.messages];
      const idx = msgs.findLastIndex((m) => m.agent === agent);
      if (idx >= 0) msgs[idx] = { ...msgs[idx], content };
      return { messages: msgs };
    }),

  finishAgent: (agent) =>
    set((state) => {
      const msgs = [...state.messages];
      const idx = msgs.findLastIndex((m) => m.agent === agent);
      if (idx >= 0) msgs[idx] = { ...msgs[idx], done: true };
      return { messages: msgs };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setActiveAgent: (activeAgent) => set({ activeAgent }),
  reset: () => set({ messages: [], isStreaming: false, activeAgent: null, selectedDebate: null }),
  setHistory: (history) => set({ history }),
  removeFromHistory: (id) =>
    set((state) => ({ history: state.history.filter((h) => h.id !== id) })),
  setSelectedDebate: (debate) => set({ selectedDebate: debate }),
  setAgentChatHistory: (agentChatHistory) => set({ agentChatHistory }),
  removeAgentChat: (id) =>
    set((state) => ({ agentChatHistory: state.agentChatHistory.filter((c) => c.id !== id) })),
}));
