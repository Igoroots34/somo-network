import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from .models import *
from .services.room_manager import room_manager
from .engine.rules import GameEngine
from .engine.bots import BotManager
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # player_id -> websocket
        self.player_connections: Dict[WebSocket, str] = {}  # websocket -> player_id
        self.game_engine = GameEngine()
        self.bot_manager = BotManager()
    
    async def connect(self, websocket: WebSocket, player_id: str):
        """Conecta um jogador"""
        await websocket.accept()
        self.active_connections[player_id] = websocket
        self.player_connections[websocket] = player_id
        logger.info(f"Player {player_id} connected")
    
    def disconnect(self, websocket: WebSocket):
        """Desconecta um jogador"""
        if websocket in self.player_connections:
            player_id = self.player_connections[websocket]
            del self.active_connections[player_id]
            del self.player_connections[websocket]
            
            # Remove o jogador da sala
            room = room_manager.remove_player(player_id)
            if room:
                asyncio.create_task(self.broadcast_room_state(room.id))
            
            logger.info(f"Player {player_id} disconnected")
    
    async def send_personal_message(self, player_id: str, message: dict):
        """Envia mensagem para um jogador específico"""
        if player_id in self.active_connections:
            try:
                await self.active_connections[player_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {player_id}: {e}")
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_player: Optional[str] = None):
        """Envia mensagem para todos os jogadores de uma sala"""
        room = room_manager.get_room(room_id)
        if not room:
            return
        
        for player in room.players:
            if exclude_player and player.id == exclude_player:
                continue
            await self.send_personal_message(player.id, message)
    
    async def broadcast_room_state(self, room_id: str):
        """Envia o estado da sala para todos os jogadores"""
        room = room_manager.get_room(room_id)
        if not room:
            return
        
        for player in room.players:
            # Cria uma versão pública da sala (sem revelar mãos dos outros)
            public_room = self._create_public_room_state(room)
            
            public_event = RoomStateEvent(room=public_room, self_hand=player.hand if not player.is_bot else None)
            await self.send_personal_message(player.id, public_event.model_dump())
            
    
    def _create_public_room_state(self, room: RoomState ) -> PublicRoomState:
        """Cria uma versão pública da sala sem revelar informações privadas"""
        public_players = []
        for player in room.players:
            public_player = PublicPlayerState(
                id=player.id,
                nickname=player.nickname,
                tokens=player.tokens,
                hand_count=len(player.hand),
                is_bot=player.is_bot,
                is_eliminated=player.is_eliminated
            )
            public_players.append(public_player)
        
        return PublicRoomState(
            id=room.id,
            players=public_players,
            max_players=room.max_players,
            host_id=room.host_id,
            game_started=room.game_started,
            current_turn=room.current_turn,
            direction=room.direction,
            accumulated_sum=room.accumulated_sum,
            round_limit=room.round_limit,
            pending_effect=room.pending_effect,
            deck_count=len(room.deck),
            discard_top=room.discard_pile[-1] if room.discard_pile else None,
            turn_order=room.turn_order
        )
    
    async def handle_message(self, websocket: WebSocket, message: str):
        """Processa mensagens recebidas dos clientes"""
        try:
            data = json.loads(message)
            action = data.get("action")
            
            if websocket not in self.player_connections:
                await websocket.send_text(json.dumps({
                    "event": "error",
                    "code": "NOT_CONNECTED",
                    "message": "Player not connected"
                }))
                return
            
            player_id = self.player_connections[websocket]
            
            if action == "create_room":
                await self._handle_create_room(player_id, data)
            elif action == "join_room":
                await self._handle_join_room(player_id, data)
            elif action == "start_game":
                await self._handle_start_game(player_id, data)
            elif action == "play_card":
                await self._handle_play_card(player_id, data)
            elif action == "play_special":
                await self._handle_play_special(player_id, data)
            elif action == "pass_turn":
                await self._handle_pass_turn(player_id, data)
            elif action == "chat":
                await self._handle_chat(player_id, data)
            elif action == "add_bot":
                await self._handle_add_bot(player_id, data)
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "UNKNOWN_ACTION",
                    "message": f"Unknown action: {action}"
                })
        
        except json.JSONDecodeError:
            await websocket.send_text(json.dumps({
                "event": "error",
                "code": "INVALID_JSON",
                "message": "Invalid JSON format"
            }))
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await websocket.send_text(json.dumps({
                "event": "error",
                "code": "INTERNAL_ERROR",
                "message": "Internal server error"
            }))
    
    async def _handle_create_room(self, player_id: str, data: dict):
        """Cria uma nova sala"""
        try:
            action = CreateRoomAction(**data)
            # O room_manager.create_room já deve lidar com a criação do host_id e player_id
            # e associá-los corretamente. Não precisamos reatribuir aqui.
            room = room_manager.create_room(action.nickname, action.max_players, player_id) # Passa o player_id do WebSocket
            
            await self.broadcast_room_state(room.id)
            
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "CREATE_ROOM_ERROR",
                "message": str(e)
            })

    
    async def _handle_join_room(self, player_id: str, data: dict):
        """Entra em uma sala existente"""
        try:
            action = JoinRoomAction(**data)
            player = room_manager.join_room(action.room_id, action.nickname)
            
            if not player:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "JOIN_ROOM_ERROR",
                    "message": "Could not join room"
                })
                return
            
            # Atualiza o player_id
            player.id = player_id
            room_manager.player_to_room[player_id] = action.room_id
            
            await self.broadcast_room_state(action.room_id)
            
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "JOIN_ROOM_ERROR",
                "message": str(e)
            })
    
    async def _handle_start_game(self, player_id: str, data: dict):
        """Inicia o jogo"""
        try:
            action = StartGameAction(**data)
            room = room_manager.get_room(action.room_id)
            
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found"
                })
                return
            
            if room.host_id != player_id:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "NOT_HOST",
                    "message": "Only host can start the game"
                })
                return
            
            if len(room.players) < 2:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "NOT_ENOUGH_PLAYERS",
                    "message": "Need at least 2 players to start"
                })
                return
            
            # Inicia o jogo
            self.game_engine.start_game(room)
            await self.broadcast_room_state(room.id)
            
            # Envia evento de início de rodada
            await self.broadcast_to_room(room.id, {
                "event": "round_started",
                "limit": room.round_limit
            })
            
            # Envia evento de mudança de turno
            await self.broadcast_to_room(room.id, {
                "event": "turn_changed",
                "player_id": room.current_turn
            })
            
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "START_GAME_ERROR",
                "message": str(e)
            })
    
    async def _handle_play_card(self, player_id: str, data: dict):
        """Joga uma carta"""
        try:
            action = PlayCardAction(**data)
            room = room_manager.get_room(action.room_id)
            
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found"
                })
                return
            
            result = self.game_engine.play_card(room, player_id, action.card_id, action.as_value)
            
            if result["success"]:
                await self._handle_game_events(room, result["events"])
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "INVALID_PLAY",
                    "message": result["error"]
                })
            
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "PLAY_CARD_ERROR",
                "message": str(e)
            })
    
    async def _handle_play_special(self, player_id: str, data: dict):
        """Joga uma carta especial"""
        try:
            action = PlaySpecialAction(**data)
            room = room_manager.get_room(action.room_id)
            
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found"
                })
                return
            
            result = self.game_engine.play_special(room, player_id, action.card_id, action.type)
            
            if result["success"]:
                await self._handle_game_events(room, result["events"])
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "INVALID_PLAY",
                    "message": result["error"]
                })
            
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "PLAY_SPECIAL_ERROR",
                "message": str(e)
            })
    
    async def _handle_pass_turn(self, player_id: str, data: dict):
        """Passa o turno (força punição)"""
        try:
            action = PassTurnAction(**data)
            room = room_manager.get_room(action.room_id)
            
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found"
                })
                return
            
            result = self.game_engine.force_penalty(room, player_id)
            
            if result["success"]:
                await self._handle_game_events(room, result["events"])
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "PASS_TURN_ERROR",
                    "message": result["error"]
                })
            
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "PASS_TURN_ERROR",
                "message": str(e)
            })
    
    async def _handle_chat(self, player_id: str, data: dict):
        """Envia mensagem de chat"""
        try:
            action = ChatAction(**data)
            room = room_manager.get_room(action.room_id)
            
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found"
                })
                return
            
            player = next((p for p in room.players if p.id == player_id), None)
            if not player:
                return
            
            await self.broadcast_to_room(room.id, {
                "event": "chat",
                "player_id": player_id,
                "nickname": player.nickname,
                "message": action.message
            })
            
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "CHAT_ERROR",
                "message": str(e)
            })
    
    async def _handle_add_bot(self, player_id: str, data: dict):
        """Adiciona um bot à sala"""
        try:
            action = AddBotAction(**data)
            room = room_manager.get_room(action.room_id)
            
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found"
                })
                return
            
            if room.host_id != player_id:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "NOT_HOST",
                    "message": "Only host can add bots"
                })
                return
            
            bot = self.bot_manager.add_bot_to_room(room, action.difficulty)
            if bot:
                await self.broadcast_room_state(room.id)
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ADD_BOT_ERROR",
                    "message": "Could not add bot"
                })
            
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "ADD_BOT_ERROR",
                "message": str(e)
            })
    
    async def _handle_game_events(self, room: RoomState , events: list):
        """Processa eventos do jogo e os envia para os clientes"""
        for event in events:
            await self.broadcast_to_room(room.id, event)
        
        # Sempre envia o estado atualizado da sala
        await self.broadcast_room_state(room.id)
        
        # Processa turnos de bots
        if room.current_turn and room.game_started:
            current_player = next((p for p in room.players if p.id == room.current_turn), None)
            if current_player and current_player.is_bot:
                await self._process_bot_turn(room, current_player)
    
    async def _process_bot_turn(self, room: RoomState , bot_player: PlayerState):
        """Processa o turno de um bot"""
        await asyncio.sleep(1)  # Pequeno delay para simular "pensamento"
        
        action = self.bot_manager.get_bot_action(room, bot_player)
        if action:
            if action["type"] == "play_card":
                result = self.game_engine.play_card(
                    room, bot_player.id, action["card_id"], action.get("as_value")
                )
            elif action["type"] == "play_special":
                result = self.game_engine.play_special(
                    room, bot_player.id, action["card_id"], action["special_type"]
                )
            elif action["type"] == "pass_turn":
                result = self.game_engine.force_penalty(room, bot_player.id)
            
            if result["success"]:
                await self._handle_game_events(room, result["events"])

# Instância global do gerenciador de conexões
manager = ConnectionManager()

