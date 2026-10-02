import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { getGeminiClient } from './geminiClient';

interface LiveClientSession {
  clientWs: WebSocket;
  liveSession?: any;
  voiceName: string;
  isAlive: boolean;
}

export function setupLiveApiWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/api/live-assistant' });

  wss.on('connection', async (clientWs: WebSocket, req) => {
    console.log('[LiveAPI] Client connected to real-time voice bridge');
    const ai = getGeminiClient();

    let selectedVoice = 'Zephyr';
    // Parse query params if voice requested
    try {
      if (req.url) {
        const url = new URL(req.url, 'http://localhost:3000');
        const v = url.searchParams.get('voice');
        if (v && ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(v)) {
          selectedVoice = v;
        }
      }
    } catch (e) {
      // ignore
    }

    if (!ai) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Gemini API is not configured or GEMINI_API_KEY is missing. Real-time live audio requires an active Gemini API key in Settings > Secrets.'
      }));
      return;
    }

    let liveSession: any = null;
    let isConnected = false;

    async function initLiveSession(voiceName: string) {
      try {
        if (liveSession) {
          try {
            await liveSession.close();
          } catch (e) {
            // ignore
          }
        }

        const session = await ai!.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName || 'Zephyr'
                }
              }
            },
            systemInstruction: `You are the Saudi Fleet Command & AI Voice Dispatch Assistant.
You have direct real-time voice conversations with fleet drivers, route dispatchers, maintenance supervisors, and logistics managers.
You assist with:
- Driver check-ins, trip reporting, route guidance, and traffic conditions across Saudi Arabia (Riyadh, Jeddah, Dammam, Mecca, Medina, etc.).
- Saudi transport regulations, Muroor truck ban hours, Najm accident reporting, and vehicle inspection alerts.
- Fuel tracking, expense logging, and maintenance troubleshooting.
Communicate naturally and concisely with spoken cadence. Support Arabic, English, Urdu, and Pashto. Keep verbal responses prompt and helpful.`
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              try {
                // Check for model audio turn
                const parts = message.serverContent?.modelTurn?.parts;
                if (Array.isArray(parts)) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(JSON.stringify({
                        type: 'audio',
                        audio: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000'
                      }));
                    }
                    if (part.text) {
                      clientWs.send(JSON.stringify({
                        type: 'transcript_delta',
                        text: part.text
                      }));
                    }
                  }
                }

                // Check for interruption
                if (message.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({
                    type: 'interrupted',
                    interrupted: true
                  }));
                }

                // Check turn complete
                if (message.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({
                    type: 'turn_complete'
                  }));
                }
              } catch (err) {
                console.error('[LiveAPI] Error forwarding message to client:', err);
              }
            },
            onclose: (event: any) => {
              console.log('[LiveAPI] Gemini Live session closed');
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'session_closed',
                  details: event?.reason || 'Session ended'
                }));
              }
            },
            onerror: (err: any) => {
              console.error('[LiveAPI] Gemini Live error:', err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'error',
                  message: err?.message || 'Live session error'
                }));
              }
            }
          }
        });

        liveSession = session;
        isConnected = true;

        clientWs.send(JSON.stringify({
          type: 'connected',
          model: 'gemini-3.1-flash-live-preview',
          voice: voiceName,
          status: 'ready'
        }));

        console.log(`[LiveAPI] Live session successfully connected with voice: ${voiceName}`);
      } catch (err: any) {
        console.error('[LiveAPI] Failed to initialize Gemini Live session:', err);
        clientWs.send(JSON.stringify({
          type: 'error',
          message: `Failed to initialize Live API session: ${err?.message || 'Check network / API key'}`
        }));
      }
    }

    // Initialize session
    await initLiveSession(selectedVoice);

    clientWs.on('message', async (data: any) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'change_voice' && payload.voice) {
          selectedVoice = payload.voice;
          await initLiveSession(selectedVoice);
          return;
        }

        if (!liveSession || !isConnected) {
          console.warn('[LiveAPI] Cannot send input: live session not ready');
          return;
        }

        // Real-time PCM Audio from client microphone (16kHz PCM little endian)
        if (payload.type === 'audio' && payload.audio) {
          liveSession.sendRealtimeInput({
            audio: {
              data: payload.audio,
              mimeType: payload.mimeType || 'audio/pcm;rate=16000'
            }
          });
        }

        // Real-time Text Prompt
        if (payload.type === 'text' && payload.text) {
          liveSession.sendRealtimeInput({
            text: payload.text
          });
        }

        // Manual Interrupt signal from client
        if (payload.type === 'interrupt') {
          // If client speaks or triggers interrupt
        }
      } catch (err: any) {
        console.error('[LiveAPI] Error processing client message:', err);
      }
    });

    clientWs.on('close', async () => {
      console.log('[LiveAPI] Client disconnected, cleaning up Live session');
      if (liveSession) {
        try {
          await liveSession.close();
        } catch (e) {
          // ignore
        }
      }
    });

    clientWs.on('error', (err) => {
      console.error('[LiveAPI] Client WebSocket error:', err);
    });
  });

  return wss;
}
