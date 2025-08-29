import { create } from 'zustand';
import { GameState, ServerEvent, ChatMessage, Notification } from '../types';
import { wsClient, gameActions } from '../api/ws';

interface GameStore extends GameState {
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Room actions
  createRoom: (nickname: string, maxPlayers?: number) => void;
  joinRoom: (roomId: string, nickname: string) => void;
  startGame: () => void;
  
  // Game actions
  playCard: (cardId: string, asValue?: number) => void;
  playSpecial: (cardId: string, type: 'plus2' | 'times2' | 'reset0' | 'reverse') => void;
  passTurn: () => void;
  
  // Bot actions
  addBot: (difficulty?: 'LOW' | 'MID' | 'HIGH') => void;
  
  // Chat actions
  sendChat: (message: string) => void;
  toggleChat: () => void;
  
  // UI actions
  setView: (view: 'lobby' | 'room') => void;
  setNickname: (nickname: string) => void;
  setRoomId: (roomId: string) => void;
  
  // Notification actions
  addNotification: (type: Notification['type'], message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  
  // Internal actions
  handleServerEvent: (event: ServerEvent) => void;
  reset: () => void;
}

const initialState: GameState = {
  connected: false,
  connecting: false,
  room: undefined,
  selfHand: [],
  currentView: 'lobby',
  showChat: false,
  chatMessages: [],
  notifications: [],
  nickname: '',
  roomId: '',
  selfId: ''
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  // Connection
  connect: async () => {
    set({ connecting: true });
    
    try {
      // Setup event handlers
      wsClient.onConnect(() => {
        set({ connected: true, connecting: false });
        get().addNotification('success', 'Conectado ao servidor!');
      });

      wsClient.onDisconnect(() => {
        set({ connected: false, connecting: false });
        get().addNotification('error', 'Desconectado do servidor');
      });

      wsClient.onError(() => {
        set({ connected: false, connecting: false });
        get().addNotification('error', 'Erro de conexão');
      });

      // Setup message handler
      wsClient.on('*', get().handleServerEvent);

      // Connect
      await wsClient.connect();
    } catch (error) {
      set({ connecting: false });
      get().addNotification('error', 'Falha ao conectar');
      throw error;
    }
  },

  disconnect: () => {
    wsClient.disconnect();
    set({ connected: false, connecting: false });
  },

  // Room actions
  createRoom: (nickname: string, maxPlayers = 8) => {
    gameActions.createRoom(nickname, maxPlayers);
    set({ nickname });
  },

  joinRoom: (roomId: string, nickname: string) => {
    gameActions.joinRoom(roomId, nickname);
    set({ nickname, roomId });
  },

  startGame: () => {
    const { room } = get();
    if (room) {
      gameActions.startGame(room.id);
    }
  },

  // Game actions
  playCard: (cardId: string, asValue?: number) => {
    const { room } = get();
    if (room) {
      gameActions.playCard(room.id, cardId, asValue);
    }
  },

  playSpecial: (cardId: string, type: 'plus2' | 'times2' | 'reset0' | 'reverse') => {
    const { room } = get();
    if (room) {
      gameActions.playSpecial(room.id, cardId, type);
    }
  },

  passTurn: () => {
    const { room } = get();
    if (room) {
      gameActions.passTurn(room.id);
    }
  },

  // Bot actions
  addBot: (difficulty = 'LOW') => {
    const { room } = get();
    if (room) {
      gameActions.addBot(room.id, difficulty);
    }
  },

  // Chat actions
  sendChat: (message: string) => {
    const { room } = get();
    if (room && message.trim()) {
      gameActions.sendChat(room.id, message.trim());
    }
  },

  toggleChat: () => {
    set(state => ({ showChat: !state.showChat }));
  },

  // UI actions
  setView: (view: 'lobby' | 'room') => {
    set({ currentView: view });
  },

  setNickname: (nickname: string) => {
    set({ nickname });
  },

  setRoomId: (roomId: string) => {
    set({ roomId });
  },

  // Notification actions
  addNotification: (type: Notification['type'], message: string, duration = 5000) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now(),
      duration
    };

    set(state => ({
      notifications: [...state.notifications, notification]
    }));

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(notification.id);
      }, duration);
    }
  },

  removeNotification: (id: string) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  // Event handlers
  handleServerEvent: (event: ServerEvent) => {
    const state = get();

    switch (event.event) {
      case 'room_state':
        set({
          room: event.room,
          selfHand: event.self_hand || [],
          currentView: 'room',
          selfId: event.self_id
        });
        break;

      case 'round_started':
        state.addNotification('info', `Nova rodada! Limite: ${event.limit}`);
        break;

      case 'card_played':
        const player = state.room?.players.find(p => p.id === event.player_id);
        if (player) {
          state.addNotification('info', `${player.nickname} jogou uma carta`);
        }
        break;

      case 'effect_set':
        const effectPlayer = state.room?.players.find(p => p.id === event.source_player_id);
        if (effectPlayer) {
          const effectName = event.type === 'plus2' ? '+2' : 'x2';
          state.addNotification('warning', `${effectPlayer.nickname} ativou ${effectName}`);
        }
        break;

      case 'sum_reset':
        const resetPlayer = state.room?.players.find(p => p.id === event.by_player_id);
        if (resetPlayer) {
          state.addNotification('info', `${resetPlayer.nickname} zerou a soma`);
        }
        break;

      case 'direction_changed':
        const direction = event.clockwise ? 'horário' : 'anti-horário';
        state.addNotification('info', `Direção mudou para ${direction}`);
        break;

      case 'penalty':
        const penaltyPlayer = state.room?.players.find(p => p.id === event.player_id);
        if (penaltyPlayer) {
          state.addNotification('error', `${penaltyPlayer.nickname} perdeu 1 token (${event.tokens_left} restantes)`);
        }
        break;

      case 'draw_cards':
        event.players.forEach(({ id, amount }) => {
          const player = state.room?.players.find(p => p.id === id);
          if (player) {
            state.addNotification('info', `${player.nickname} comprou ${amount} cartas`);
          }
        });
        break;

      case 'round_reset':
        const reason = event.reason === 'exact_hit' ? 'acerto exato' : 'punição';
        state.addNotification('info', `Rodada reiniciada (${reason})`);
        break;

      case 'turn_changed':
        // Atualizado automaticamente pelo room_state
        break;

      case 'game_over':
        const winner = state.room?.players.find(p => p.id === event.winner_id);
        if (winner) {
          state.addNotification('success', `🎉 ${winner.nickname} venceu o jogo!`, 10000);
        }
        break;

      case 'chat':
        const chatMessage: ChatMessage = {
          id: Date.now().toString(),
          player_id: event.player_id,
          nickname: event.nickname,
          message: event.message,
          timestamp: Date.now()
        };
        
        set(state => ({
          chatMessages: [...state.chatMessages, chatMessage]
        }));
        break;

      case 'error':
        state.addNotification('error', `Erro: ${event.message}`);
        break;

      default:
        console.log('Unhandled event:', event);
    }
  },

  // Reset state
  reset: () => {
    set(initialState);
  }
}));

// Helper functions (use os IDs reais em vez de comparar tamanhos de mão)
export const useIsMyTurn = () => {
  const { room, selfId } = useGameStore();
  return !!room && room.game_started && room.current_turn === selfId;
};

export const useIsHost = () => {
  const { room, selfId } = useGameStore();
  return !!room && room.host_id === selfId;
};

/** Caso queira obter o próprio objeto Player */
export const useSelfPlayer = () => {
  const { room, selfId } = useGameStore();
  return room?.players.find(p => p.id === selfId) ?? null;
};
