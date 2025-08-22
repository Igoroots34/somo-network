import { ServerEvent, ClientAction } from '../types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, (event: ServerEvent) => void> = new Map();
  private connectionHandlers: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
  } = {};

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectionHandlers.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: ServerEvent = JSON.parse(event.data);
            console.log('Received:', data);
            
            // Chama handler específico do evento
            const handler = this.eventHandlers.get(data.event);
            if (handler) {
              handler(data);
            }
            
            // Chama handler genérico
            const genericHandler = this.eventHandlers.get('*');
            if (genericHandler) {
              genericHandler(data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.connectionHandlers.onDisconnect?.();
          
          // Reconecta automaticamente se não foi fechamento intencional
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connectionHandlers.onError?.(error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  send(action: ClientAction) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(action);
      console.log('Sending:', action);
      this.ws.send(message);
    } else {
      console.warn('WebSocket not connected, cannot send:', action);
    }
  }

  on(event: string, handler: (event: ServerEvent) => void) {
    this.eventHandlers.set(event, handler);
  }

  off(event: string) {
    this.eventHandlers.delete(event);
  }

  onConnect(handler: () => void) {
    this.connectionHandlers.onConnect = handler;
  }

  onDisconnect(handler: () => void) {
    this.connectionHandlers.onDisconnect = handler;
  }

  onError(handler: (error: Event) => void) {
    this.connectionHandlers.onError = handler;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

// Instância singleton do cliente WebSocket
const WS_URL = (process.env.WS_URL as string) || 'ws://localhost:8000/ws';
export const wsClient = new WebSocketClient(WS_URL);

// Funções de conveniência para ações comuns
export const gameActions = {
  createRoom: (nickname: string, maxPlayers: number = 8) => {
    wsClient.send({
      action: 'create_room',
      nickname,
      max_players: maxPlayers
    });
  },

  joinRoom: (roomId: string, nickname: string) => {
    wsClient.send({
      action: 'join_room',
      room_id: roomId,
      nickname
    });
  },

  startGame: (roomId: string) => {
    wsClient.send({
      action: 'start_game',
      room_id: roomId
    });
  },

  playCard: (roomId: string, cardId: string, asValue?: number) => {
    wsClient.send({
      action: 'play_card',
      room_id: roomId,
      card_id: cardId,
      as_value: asValue
    });
  },

  playSpecial: (roomId: string, cardId: string, type: 'plus2' | 'times2' | 'reset0' | 'reverse') => {
    wsClient.send({
      action: 'play_special',
      room_id: roomId,
      card_id: cardId,
      type
    });
  },

  passTurn: (roomId: string) => {
    wsClient.send({
      action: 'pass_turn',
      room_id: roomId
    });
  },

  sendChat: (roomId: string, message: string) => {
    wsClient.send({
      action: 'chat',
      room_id: roomId,
      message
    });
  },

  addBot: (roomId: string, difficulty: 'easy' | 'medium' | 'hard' = 'easy') => {
    wsClient.send({
      action: 'add_bot',
      room_id: roomId,
      difficulty
    });
  }
};

