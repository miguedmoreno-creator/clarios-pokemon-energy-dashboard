import React, { useState, useEffect, useRef } from 'react';
import { PlantCode, plantByCode, ChatMessage } from '../lib/domain';
import { streamChat } from '../lib/api';
import { GbaCard } from './ui/GbaCard';
import { TrainerGuide } from './ui/TrainerGuide';
import { RetroCursor } from './ui/RetroCursor';
import { TRAINER_GUIDES } from '../lib/retroCopy';

interface CopilotoViewProps {
  selectedPlant: PlantCode;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const CopilotoView: React.FC<CopilotoViewProps> = ({
  selectedPlant,
  messages,
  setMessages,
}) => {
  const plant = plantByCode(selectedPlant);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string>('supervisor');
  const chatLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del chat cuando entran nuevos mensajes o tokens
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const executeQuery = async (text: string) => {
    if (!text.trim() || loading) return;

    setInput('');
    setLoading(true);

    const botMessageIndex = messages.length;

    // Insertar placeholder del bot que se llenará con tokens
    setMessages((prev) => [
      ...prev,
      { role: 'bot', content: '', agent: 'supervisor' },
    ]);

    let botMsgContent = '';

    await streamChat(text, selectedPlant, 'session-web-ui', {
      onAgent: (agent) => {
        setActiveAgent(agent);
      },
      onToken: (chunk) => {
        botMsgContent += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          if (copy[botMessageIndex]) {
            copy[botMessageIndex] = { ...copy[botMessageIndex], content: botMsgContent };
          }
          return copy;
        });
      },
      onTool: (_tool) => {
        // Herramienta ejecutada registrada internamente
      },
      onDone: (final) => {
        setMessages((prev) => {
          const copy = [...prev];
          if (copy[botMessageIndex]) {
            copy[botMessageIndex] = {
              ...copy[botMessageIndex],
              content: final.content,
              agent: final.agent,
              tools: final.tools,
              citation: final.citation,
              mode: final.mode,
            };
          }
          return copy;
        });
        setLoading(false);
      },
    });
  };

  // Disparar automáticamente la respuesta si el último mensaje es del usuario sin respuesta del bot
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user' && !loading) {
      executeQuery(lastMsg.content);
    }
  }, [messages.length]);

  const handleSend = (queryText?: string) => {
    const text = queryText || input;
    if (!text.trim() || loading) return;

    // Agregar mensaje de usuario al historial (el useEffect disparará executeQuery)
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
  };

  const suggestions = [
    `¿Cuál es el consumo y SEC acumulado en ${selectedPlant}?`,
    `¿Hay anomalías o resets Modbus detectados en ${selectedPlant}?`,
    `¿Qué oportunidades de ahorro hay según ISO 50001?`,
    `Explica el balance de gas natural y eficiencia térmica en RC`,
  ];

  return (
    <div className="view">
      {/* Guía del Entrenador */}
      <TrainerGuide
        viewId="copiloto"
        text={TRAINER_GUIDES.copiloto}
      />

      <div className="view-head">
        <div>
          <h2>Laboratorio de IA Industrial · {plant.name}</h2>
          <p>Supervisión con Google Gemini y Cero Aritmética: cada cifra proviene de herramientas deterministas auditadas.</p>
        </div>
        <div data-tour="copilot-agents" style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <span className="badge" style={{ '--c': '#a78bfa' } as any}>
            AGENTE ACTIVO: {activeAgent.toUpperCase()}
          </span>
          {messages.length > 1 && (
            <button
              className="btn-gba"
              style={{ fontSize: '0.55rem', padding: '4px 8px', background: '#334155' }}
              onClick={() =>
                setMessages([
                  {
                    role: 'bot',
                    content: `Memoria reiniciada. ¿Qué deseas auditar en ${plant.name}?`,
                    agent: 'supervisor',
                  },
                ])
              }
            >
              Reiniciar Memoria
            </button>
          )}
        </div>
      </div>

      <GbaCard className="chat" data-tour="copilot-chat" style={{ padding: '16px' }}>
        <div className="chat-log" ref={chatLogRef} style={{ maxHeight: '460px', overflowY: 'auto' }}>
          {messages.map((m, idx) => (
            <div key={idx} className={`msg ${m.role}`} style={{ marginBottom: '14px' }}>
              {m.role === 'bot' ? (
                <div className="prof-dialog-box" style={{ display: 'flex', gap: '14px' }}>
                  {/* Marco de Retrato del Profesor de IA estilo GBA */}
                  <div className="prof-portrait-frame">
                    <img
                      src="/src/assets/retro/avatar-prof-ia.png"
                      alt="Profesor IA"
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    <div className="msg-meta" style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ '--c': '#a78bfa', fontSize: '0.55rem' } as any}>
                        🎓 PROFESOR CLARIOS
                      </span>
                      {m.agent && (
                        <span className="badge" style={{ '--c': '#38bdf8', fontSize: '0.55rem' } as any}>
                          🤖 {m.agent}
                        </span>
                      )}
                      {m.tools && m.tools.length > 0 && (
                        <span className="badge" style={{ '--c': '#22d3ee', fontSize: '0.55rem' } as any}>
                          🛠️ {m.tools.join(', ')}
                        </span>
                      )}
                      {m.mode && (
                        <span className="badge" style={{ '--c': m.mode === 'LIVE' ? '#34d399' : '#fbbf24', fontSize: '0.55rem' } as any}>
                          {m.mode}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '20px', lineHeight: 1.4, color: '#f8fafc', whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </div>

                    {m.citation && (
                      <div className="cite" style={{ marginTop: '8px', fontSize: '18px', color: '#67e8f9' }}>
                        {m.citation}
                      </div>
                    )}

                    {/* Cursor parpadeante retro cuando finalizó de escribir el bot */}
                    {!loading && idx === messages.length - 1 && (
                      <div style={{ position: 'absolute', bottom: '-4px', right: '0px' }}>
                        <RetroCursor color="#FF1744" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mensaje del Usuario / Operador */
                <div
                  style={{
                    background: '#064e3b',
                    border: '3px solid #000',
                    boxShadow: 'inset 0 0 0 2px #10b981, 3px 3px 0 #000',
                    padding: '10px 14px',
                    color: '#ecfdf5',
                    fontSize: '20px',
                    marginLeft: 'auto',
                    maxWidth: '85%',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-retro-title)', fontSize: '0.6rem', color: '#34d399', marginBottom: '4px' }}>
                    OPERADOR DE PLANTA:
                  </div>
                  <div>{m.content}</div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="prof-dialog-box" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div className="prof-portrait-frame">
                <img src="/src/assets/retro/avatar-prof-ia.png" alt="Profesor IA" />
              </div>
              <div style={{ fontSize: '19px', color: '#38bdf8' }}>
                <span className="retro-cursor">▼</span> Consultando sensores SCADA y razonando respuesta...
              </div>
            </div>
          )}
        </div>

        {/* Preguntas sugeridas como Objetos Clave de la Mochila */}
        <div style={{ marginTop: '16px', borderTop: '2px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
          <div style={{ fontFamily: 'var(--font-retro-title)', fontSize: '0.6rem', color: '#94a3b8', marginBottom: '8px' }}>
            🎒 OBJETOS CLAVE DE CONSULTA RÁPIDA (MOCHILA):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="key-item-btn"
                onClick={() => handleSend(s)}
                disabled={loading}
              >
                <span>🔹</span>
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar con estilo Retro GBA */}
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ marginTop: '14px', display: 'flex', gap: '8px' }}
        >
          <input
            type="text"
            placeholder={`Escribe una pregunta para el Profesor sobre ${plant.name}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              background: '#070b12',
              border: '3px solid #000',
              boxShadow: 'inset 0 0 0 2px #334155',
              padding: '10px 14px',
              color: '#ffffff',
              fontSize: '20px',
              borderRadius: 0,
            }}
          />
          <button
            type="submit"
            className="btn-gba"
            disabled={loading || !input.trim()}
            style={{ fontSize: '0.68rem', padding: '10px 18px' }}
          >
            Enviar
          </button>
        </form>
      </GbaCard>
    </div>
  );
};
