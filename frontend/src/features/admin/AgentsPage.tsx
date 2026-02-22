// ============================================
// AI Agents Management Page
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
    Bot,
    MessageSquare,
    Cpu,
    Users,
    Play,
    Pause,
    Trash2,
    Plus,
    RefreshCw,
    Send,
    AlertTriangle,
    Clock,
    Terminal,
    BrainCircuit,
    Calendar,
    Zap
} from 'lucide-react';
import { Button, Badge } from '../../components/common';
import websocketService from '../../services/websocket';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';

// Types
interface Agent {
    id: number;
    name: string;
    type: string;
    status: 'active' | 'inactive' | 'trading' | 'in_meeting';
    last_activity: string;
}

interface AgentLog {
    timestamp: string;
    agent_name: string;
    action: string;
    details: string;
}

interface OllamaModel {
    name: string;
    size: string;
    parameter_size: string;
    family: string;
    recommended: boolean;
}

interface ChatMessage {
    id: number;
    agent_id: number;
    agent_name: string;
    message: string;
    response?: string;
    timestamp: Date;
}

// Mock data for initial development
const MOCK_AGENTS: Agent[] = [
    { id: 1001, name: 'Kwame Asante', type: 'Value Investor', status: 'active', last_activity: '2026-02-21T14:30:00Z' },
    { id: 1002, name: 'Amina Diallo', type: 'Day Trader', status: 'trading', last_activity: '2026-02-21T14:32:00Z' },
    { id: 1003, name: 'Olu Johnson', type: 'News Trader', status: 'active', last_activity: '2026-02-21T14:28:00Z' },
];

const MOCK_LOGS: AgentLog[] = [
    { timestamp: '14:32:15', agent_name: 'Kwame Asante', action: 'BUY', details: 'Bought 500 TECH @ 3200' },
    { timestamp: '14:31:42', agent_name: 'Amina Diallo', action: 'ANALYZE', details: 'Analyzing AGR volatility' },
    { timestamp: '14:30:08', agent_name: 'System', action: 'TICK', details: 'Simulation tick #1248 completed' },
];

// Component: Status Card
const StatusCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string }> = ({ 
    label, value, icon, color = 'primary' 
}) => (
    <div className="stat-card" style={{ minWidth: '140px' }}>
        <div className={`stat-icon bg-${color}`}>{icon}</div>
        <div className="stat-content">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
        </div>
    </div>
);

// Component: Model Selector
const ModelSelector: React.FC<{ currentModel: string; onSwitch: (model: string) => void }> = ({ 
    currentModel, onSwitch 
}) => {
    const [models, setModels] = useState<OllamaModel[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch available models on mount
    useEffect(() => {
        // Mock for now - would fetch from backend
        setModels([
            { name: 'llama3.1:8b', size: '4.7GB', parameter_size: '8B', family: 'llama', recommended: true },
            { name: 'llama3.2:3b', size: '2.0GB', parameter_size: '3B', family: 'llama', recommended: false },
        ]);

        // Request actual models from backend
        websocketService.send({
            type: 'AgentAction',
            payload: { action: 'get_ollama_models', payload: {} }
        });
    }, []);

    const handleSwitch = async (modelName: string) => {
        if (modelName === currentModel) return;
        setLoading(true);
        
        websocketService.send({
            type: 'AgentAction',
            payload: { action: 'switch_model', payload: { model: modelName } }
        });

        setTimeout(() => setLoading(false), 1000);
        onSwitch(modelName);
    };

    return (
        <div className="model-selector">
            <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                <Cpu size={16} style={{ marginRight: '8px' }} />
                Ollama Models
            </h4>
            {models.map(model => (
                <div 
                    key={model.name}
                    className={`model-option ${currentModel === model.name ? 'active' : ''}`}
                    onClick={() => handleSwitch(model.name)}
                    style={{
                        padding: '12px',
                        marginBottom: '8px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${currentModel === model.name ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: currentModel === model.name ? 'var(--color-primary-10)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <div style={{ fontWeight: 600 }}>
                            {model.name}
                            {model.recommended && (
                                <span style={{ marginLeft: '8px' }}>
                                    <Badge variant="success">Recommended</Badge>
                                </span>
                            )}
                            {currentModel === model.name && (
                                <span style={{ marginLeft: '8px' }}>
                                    <Badge variant="primary">Active</Badge>
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {model.parameter_size} • {model.size}
                        </div>
                    </div>
                    {loading && currentModel !== model.name && <RefreshCw size={16} className="spin" />}
                </div>
            ))}
        </div>
    );
};

// Component: Agent List
const AgentList: React.FC<{ 
    agents: Agent[]; 
    selectedAgent: number | null; 
    onSelect: (id: number) => void 
}> = ({ agents, selectedAgent, onSelect }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'trading': return 'primary';
            case 'in_meeting': return 'warning';
            default: return 'primary';
        }
    };

    return (
        <div className="agent-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ color: 'var(--text-secondary)' }}>
                    <Users size={16} style={{ marginRight: '8px' }} />
                    Active Agents ({agents.length})
                </h4>
                <Button 
                    size="sm" 
                    variant="primary"
                    onClick={() => websocketService.send({
                        type: 'AgentAction',
                        payload: { action: 'spawn_traders', payload: { count: 5 } }
                    })}
                >
                    <Plus size={14} /> Spawn
                </Button>
            </div>
            
            {agents.map(agent => (
                <div
                    key={agent.id}
                    className={`agent-card ${selectedAgent === agent.id ? 'selected' : ''}`}
                    onClick={() => onSelect(agent.id)}
                    style={{
                        padding: '12px',
                        marginBottom: '8px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${selectedAgent === agent.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: selectedAgent === agent.id ? 'var(--color-primary-10)' : 'var(--bg-tertiary)',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Bot size={20} />
                            <div>
                                <div style={{ fontWeight: 600 }}>{agent.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{agent.type}</div>
                            </div>
                        </div>
                        <Badge variant={getStatusColor(agent.status)}>{agent.status}</Badge>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Component: Chat Interface
const ChatInterface: React.FC<{ agentId: number | null; agentName: string }> = ({ agentId, agentName }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = () => {
        if (!input.trim() || !agentId) return;

        const newMessage: ChatMessage = {
            id: Date.now(),
            agent_id: agentId,
            agent_name: agentName,
            message: input,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, newMessage]);

        // Send to backend
        websocketService.send({
            type: 'AgentAction',
            payload: { 
                action: 'chat_with_agent', 
                payload: { agent_id: agentId, message: input } 
            }
        });

        setInput('');

        // Mock response for now
        setTimeout(() => {
            setMessages(prev => prev.map(m => 
                m.id === newMessage.id 
                    ? { ...m, response: `This is a placeholder response from ${agentName}. Full implementation coming soon!` }
                    : m
            ));
        }, 1000);
    };

    return (
        <div className="chat-interface" style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
        }}>
            <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
            }}>
                <h4 style={{ margin: 0 }}>
                    <MessageSquare size={16} style={{ marginRight: '8px' }} />
                    Chat with {agentName || 'Select an Agent'}
                </h4>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                        <Bot size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>Select an agent and start chatting!</p>
                        <p style={{ fontSize: '12px' }}>Ask about their strategy, portfolio, or market opinions.</p>
                    </div>
                )}
                
                {messages.map(msg => (
                    <div key={msg.id} style={{ marginBottom: '16px' }}>
                        <div style={{ 
                            background: 'var(--color-primary)', 
                            color: 'white',
                            padding: '10px 14px',
                            borderRadius: '12px 12px 0 12px',
                            marginLeft: '20%',
                            marginBottom: '4px',
                        }}>
                            {msg.message}
                        </div>
                        {msg.response && (
                            <div style={{ 
                                background: 'var(--bg-tertiary)', 
                                padding: '10px 14px',
                                borderRadius: '12px 12px 12px 0',
                                marginRight: '20%',
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    {msg.agent_name}
                                </div>
                                {msg.response}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ 
                padding: '12px', 
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '8px',
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={agentId ? "Type your message..." : "Select an agent to chat"}
                    disabled={!agentId}
                    style={{ flex: 1 }}
                    className="input"
                />
                <Button 
                    variant="primary" 
                    onClick={handleSend}
                    disabled={!input.trim() || !agentId}
                >
                    <Send size={16} />
                </Button>
            </div>
        </div>
    );
};

// Component: Activity Log
const ActivityLog: React.FC<{ logs: AgentLog[] }> = ({ logs }) => (
    <div className="activity-log" style={{ 
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
    }}>
        <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
        }}>
            <h4 style={{ margin: 0 }}>
                <Terminal size={16} style={{ marginRight: '8px' }} />
                Activity Log
            </h4>
        </div>
        
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {logs.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No activity yet
                </div>
            ) : (
                <table className="table" style={{ fontSize: '13px' }}>
                    <tbody>
                        {logs.map((log, idx) => (
                            <tr key={idx}>
                                <td style={{ width: '70px', color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                                <td style={{ width: '120px' }}>{log.agent_name}</td>
                                <td><Badge variant="primary">{log.action}</Badge></td>
                                <td>{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
);

// Main Page Component
export const AgentsPage: React.FC = () => {
    const { isConnected } = useGameStore();
    const { isAuthenticated, isReconnecting } = useAuthStore();
    const [agents, _setAgents] = useState<Agent[]>(MOCK_AGENTS);
    const [logs, _setLogs] = useState<AgentLog[]>(MOCK_LOGS);
    const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
    const [currentModel, setCurrentModel] = useState('llama3.1:8b');
    const [systemStatus, setSystemStatus] = useState<'running' | 'paused' | 'stopped'>('running');

    // Fetch initial data - wait for connection, auth, AND reconnection complete
    useEffect(() => {
        // Must be connected, authenticated, AND not reconnecting before sending admin-only messages
        // isReconnecting is true when restoring session on page refresh - we must wait for AuthSuccess
        if (!isConnected || !isAuthenticated || isReconnecting) return;

        // Request agent status
        websocketService.send({
            type: 'AgentAction',
            payload: { action: 'get_agent_status', payload: {} }
        });

        // Request agent list
        websocketService.send({
            type: 'AgentAction',
            payload: { action: 'list_agents', payload: {} }
        });

        // Request current model
        websocketService.send({
            type: 'AgentAction',
            payload: { action: 'get_current_model', payload: {} }
        });
    }, [isConnected, isAuthenticated, isReconnecting]);

    const selectedAgentName = agents.find(a => a.id === selectedAgent)?.name || 'Agent';

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">
                    <BrainCircuit size={28} style={{ marginRight: '12px' }} />
                    AI Agent Management
                </h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button 
                        variant={systemStatus === 'running' ? 'warning' : 'success'}
                        onClick={() => setSystemStatus(systemStatus === 'running' ? 'paused' : 'running')}
                    >
                        {systemStatus === 'running' ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Resume</>}
                    </Button>
                    <Button variant="danger" onClick={() => {
                        websocketService.send({
                            type: 'AgentAction',
                            payload: { action: 'clear_agents', payload: {} }
                        });
                    }}>
                        <Trash2 size={16} /> Clear All
                    </Button>
                </div>
            </div>

            {/* Status Cards */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <StatusCard 
                    label="System Status" 
                    value={systemStatus === 'running' ? 'Running' : 'Paused'}
                    icon={systemStatus === 'running' ? <Play size={20} /> : <Pause size={20} />}
                    color={systemStatus === 'running' ? 'success' : 'warning'}
                />
                <StatusCard 
                    label="Active Agents" 
                    value={agents.length}
                    icon={<Bot size={20} />}
                    color="primary"
                />
                <StatusCard 
                    label="Current Model" 
                    value={currentModel.split(':')[0]}
                    icon={<Cpu size={20} />}
                    color="secondary"
                />
                <StatusCard 
                    label="Last Tick" 
                    value="#1,248"
                    icon={<Clock size={20} />}
                    color="info"
                />
            </div>

            {/* Main Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '280px 1fr 320px',
                gap: '20px',
                height: 'calc(100vh - 300px)',
            }}>
                {/* Left Sidebar: Model & Agent List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card" style={{ padding: '16px' }}>
                        <ModelSelector 
                            currentModel={currentModel} 
                            onSwitch={setCurrentModel}
                        />
                    </div>
                    <div className="card" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                        <AgentList 
                            agents={agents}
                            selectedAgent={selectedAgent}
                            onSelect={setSelectedAgent}
                        />
                    </div>
                </div>

                {/* Center: Chat Interface */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <ChatInterface 
                        agentId={selectedAgent}
                        agentName={selectedAgentName}
                    />
                </div>

                {/* Right: Activity Log & Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card" style={{ padding: '16px' }}>
                        <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                            <Zap size={16} style={{ marginRight: '8px' }} />
                            Quick Actions
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Button 
                                size="sm" 
                                variant="primary"
                                onClick={() => websocketService.send({
                                    type: 'AgentAction',
                                    payload: { action: 'spawn_traders', payload: { count: 5 } }
                                })}
                            >
                                <Plus size={14} /> Spawn 5 Traders
                            </Button>
                            <Button 
                                size="sm" 
                                variant="primary"
                                onClick={() => websocketService.send({
                                    type: 'AgentAction',
                                    payload: { action: 'get_active_meetings', payload: {} }
                                })}
                            >
                                <Calendar size={14} /> View Meetings
                            </Button>
                            <Button 
                                size="sm" 
                                variant="primary"
                                onClick={() => websocketService.send({
                                    type: 'AgentAction',
                                    payload: { 
                                        action: 'deploy_scenario', 
                                        payload: { type: 'flash_crash', severity: 0.7 } 
                                    }
                                })}
                            >
                                <AlertTriangle size={14} /> Deploy Scenario
                            </Button>
                        </div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                        <ActivityLog logs={logs} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentsPage;
