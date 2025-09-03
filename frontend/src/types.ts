// Tipos de cartas
export type CardKind = 'number' | 'joker' | 'plus2' | 'times2' | 'reset0' | 'reverse';

export interface CardComp {
  id: string;
  kind: CardKind;
  value?: number;
}

// Efeito pendente
export interface PendingEffect {
  multiplier?: number;
  add?: number;
  source_player_id: string;
}

// Estado do jogador
export interface PlayerState {
  id: string;
  nickname: string;
  tokens: number;
  hand_count: number;
  is_bot: boolean;
  is_eliminated: boolean;
}

// Estado da sala
export interface RoomState {
  id: string;
  players: PlayerState[];
  max_players: number;
  host_id?: string;
  game_started: boolean;
  current_turn?: string;
  direction: boolean;
  accumulated_sum: number;
  round_limit: number;
  pending_effect?: PendingEffect;
  deck_count: number;
  discard_top?: CardComp;
  turn_order: string[];
}

// Ações do cliente para o servidor
export interface CreateRoomAction {
  action: 'create_room';
  nickname: string;
  max_players?: number;
}

export interface JoinRoomAction {
  action: 'join_room';
  room_id: string;
  nickname: string;
}

export interface StartGameAction {
  action: 'start_game';
  room_id: string;
}

export interface PlayCardAction {
  action: 'play_card';
  room_id: string;
  card_id: string;
  as_value?: number;
}

export interface PlaySpecialAction {
  action: 'play_special';
  room_id: string;
  card_id: string;
  type: 'plus2' | 'times2' | 'reset0' | 'reverse';
}

export interface PassTurnAction {
  action: 'pass_turn';
  room_id: string;
}

export interface ChatAction {
  action: 'chat';
  room_id: string;
  message: string;
}

export interface AddBotAction {
  action: 'add_bot';
  room_id: string;
  difficulty?: 'LOW' | 'MID' | 'HIGH';
}

export type ClientAction = 
  | CreateRoomAction 
  | JoinRoomAction 
  | StartGameAction 
  | PlayCardAction 
  | PlaySpecialAction 
  | PassTurnAction 
  | ChatAction 
  | AddBotAction;

// Eventos do servidor para o cliente
export interface RoomStateEvent {
  event: 'room_state';
  room: RoomState;
  self_hand?: CardComp[];
  self_id: string;
}

export interface RoundStartedEvent {
  event: 'round_started';
  limit: number;
}

export interface CardPlayedEvent {
  event: 'card_played';
  player_id: string;
  card: CardComp;
  sum: number;
}

export interface EffectSetEvent {
  event: 'effect_set';
  type: 'plus2' | 'times2';
  source_player_id: string;
}

export interface SumResetEvent {
  event: 'sum_reset';
  by_player_id: string;
}

export interface DirectionChangedEvent {
  event: 'direction_changed';
  clockwise: boolean;
}

export interface PenaltyEvent {
  event: 'penalty';
  player_id: string;
  tokens_left: number;
}

export interface DrawCardsEvent {
  event: 'draw_cards';
  players: Array<{ id: string; amount: number }>;
}

export interface RoundResetEvent {
  event: 'round_reset';
  reason: 'penalty' | 'exact_hit';
}

export interface TurnChangedEvent {
  event: 'turn_changed';
  player_id: string;
}

export interface GameOverEvent {
  event: 'game_over';
  winner_id: string;
}

export interface ErrorEvent {
  event: 'error';
  code: string;
  message: string;
}

export interface ChatEvent {
  event: 'chat';
  player_id: string;
  nickname: string;
  message: string;
}

export type ServerEvent = 
  | RoomStateEvent 
  | RoundStartedEvent 
  | CardPlayedEvent 
  | EffectSetEvent 
  | SumResetEvent 
  | DirectionChangedEvent 
  | PenaltyEvent 
  | DrawCardsEvent 
  | RoundResetEvent 
  | TurnChangedEvent 
  | GameOverEvent 
  | ErrorEvent 
  | ChatEvent;

// Estado do jogo no cliente
export interface GameState {
  // Conexão
  connected: boolean;
  connecting: boolean;
  
  // Sala atual
  room?: RoomState;
  selfHand: CardComp[];
  
  // UI
  currentView: 'lobby' | 'room';
  showChat: boolean;
  
  // Mensagens
  chatMessages: ChatMessage[];
  notifications: Notification[];
  
  // Formulários
  nickname: string;
  roomId: string;

  selfId: string;

  playedCards: CardComp[];
}

export interface ChatMessage {
  id: string;
  player_id: string;
  nickname: string;
  message: string;
  timestamp: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  duration?: number;
}

