from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from enum import Enum
import uuid

class CardKind(str, Enum):
    NUMBER = "number"
    JOKER = "joker"
    PLUS2 = "plus2"
    TIMES2 = "times2"
    RESET0 = "reset0"
    REVERSE = "reverse"

class Card(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: CardKind
    value: Optional[int] = None  # Para cartas numéricas e joker quando jogado

class PendingEffect(BaseModel):
    multiplier: Optional[int] = None  # 2 para x2
    add: Optional[int] = None  # 2 para +2
    source_player_id: str

class PlayerState(BaseModel):
    id: str
    nickname: str
    tokens: int = 3
    hand: List[Card] = Field(default_factory=list)
    is_bot: bool = False
    is_eliminated: bool = False

class RoomState(BaseModel):
    id: str
    players: List[PlayerState] = Field(default_factory=list)
    max_players: int = 8
    host_id: Optional[str] = None
    game_started: bool = False
    current_turn: Optional[str] = None  # player_id
    direction: bool = True  # True = clockwise, False = counterclockwise
    accumulated_sum: int = 0
    round_limit: int = 0
    pending_effect: Optional[PendingEffect] = None
    deck: List[Card] = Field(default_factory=list)
    discard_pile: List[Card] = Field(default_factory=list)
    turn_order: List[str] = Field(default_factory=list)

# Ações do cliente para o servidor
class CreateRoomAction(BaseModel):
    action: Literal["create_room"] = "create_room"
    nickname: str
    max_players: int = 8

class JoinRoomAction(BaseModel):
    action: Literal["join_room"] = "join_room"
    room_id: str
    nickname: str

class StartGameAction(BaseModel):
    action: Literal["start_game"] = "start_game"
    room_id: str

class PlayCardAction(BaseModel):
    action: Literal["play_card"] = "play_card"
    room_id: str
    card_id: str
    as_value: Optional[int] = None  # Para Joker (0-9)

class PlaySpecialAction(BaseModel):
    action: Literal["play_special"] = "play_special"
    room_id: str
    card_id: str
    type: Literal["plus2", "times2", "reset0", "reverse"]

class PassTurnAction(BaseModel):
    action: Literal["pass_turn"] = "pass_turn"
    room_id: str

class ChatAction(BaseModel):
    action: Literal["chat"] = "chat"
    room_id: str
    message: str

class AddBotAction(BaseModel):
    action: Literal["add_bot"] = "add_bot"
    room_id: str
    difficulty: Literal["easy", "medium", "hard"] = "easy"

# Eventos do servidor para o cliente
class RoomStateEvent(BaseModel):
    event: Literal["room_state"] = "room_state"
    room: RoomState
    self_hand: Optional[List[Card]] = None  # Apenas a mão do próprio jogador

class RoundStartedEvent(BaseModel):
    event: Literal["round_started"] = "round_started"
    limit: int

class CardPlayedEvent(BaseModel):
    event: Literal["card_played"] = "card_played"
    player_id: str
    card: Card
    sum: int

class EffectSetEvent(BaseModel):
    event: Literal["effect_set"] = "effect_set"
    type: Literal["plus2", "times2"]
    source_player_id: str

class SumResetEvent(BaseModel):
    event: Literal["sum_reset"] = "sum_reset"
    by_player_id: str

class DirectionChangedEvent(BaseModel):
    event: Literal["direction_changed"] = "direction_changed"
    clockwise: bool

class PenaltyEvent(BaseModel):
    event: Literal["penalty"] = "penalty"
    player_id: str
    tokens_left: int

class DrawCardsEvent(BaseModel):
    event: Literal["draw_cards"] = "draw_cards"
    players: List[Dict[str, Any]]  # [{"id": str, "amount": int}]

class RoundResetEvent(BaseModel):
    event: Literal["round_reset"] = "round_reset"
    reason: Literal["penalty", "exact_hit"]

class TurnChangedEvent(BaseModel):
    event: Literal["turn_changed"] = "turn_changed"
    player_id: str

class GameOverEvent(BaseModel):
    event: Literal["game_over"] = "game_over"
    winner_id: str

class ErrorEvent(BaseModel):
    event: Literal["error"] = "error"
    code: str
    message: str

class ChatEvent(BaseModel):
    event: Literal["chat"] = "chat"
    player_id: str
    nickname: str
    message: str

# Para serialização de mãos dos jogadores (sem revelar cartas dos outros)
class PublicPlayerState(BaseModel):
    id: str
    nickname: str
    tokens: int
    hand_count: int
    is_bot: bool
    is_eliminated: bool

class PublicRoomState(BaseModel):
    id: str
    players: List[PublicPlayerState]
    max_players: int
    host_id: Optional[str] = None
    game_started: bool
    current_turn: Optional[str] = None
    direction: bool = True
    accumulated_sum: int = 0
    round_limit: int = 0
    pending_effect: Optional[PendingEffect] = None
    deck_count: int = 0
    discard_top: Optional[Card] = None
    turn_order: List[str] = Field(default_factory=list)

