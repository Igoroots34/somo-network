import json
import asyncio
import logging
from typing import Dict, Optional, List, Any

from fastapi import WebSocket, WebSocketDisconnect

# Mantive o wildcard porque não tenho visibilidade de todos os modelos disponíveis no seu projeto
from .models import *  # noqa: F401,F403
from .services.room_manager import room_manager
from .engine.rules import GameEngine
from .engine.bots import BotManager

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gerencia conexões WebSocket por player_id e orquestra mensagens/estado de sala.
    - Evita duplicar conexão do mesmo player (reconexão substitui a antiga).
    - Usa room_manager para CRUD de salas/jogadores.
    - Envia apenas estado público da sala para cada jogador.
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # player_id -> websocket
        self.player_connections: Dict[WebSocket, str] = {}  # websocket -> player_id
        self.game_engine = GameEngine()
        self.bot_manager = BotManager()

    # --------------- util ---------------

    async def _safe_send_text(self, ws: WebSocket, payload: dict) -> bool:
        """
        Envia JSON com proteção. Retorna True se enviado; False se conexão caiu.
        """
        try:
            await ws.send_text(json.dumps(payload, ensure_ascii=False))
            return True
        except WebSocketDisconnect:
            # O cliente desconectou; limpa os mapas
            logger.info("WebSocketDisconnect ao enviar; limpando conexão.")
            self.disconnect(ws)
            return False
        except Exception:
            logger.exception("Erro ao enviar mensagem para o WebSocket.")
            try:
                await ws.close()
            except Exception:
                pass
            self.disconnect(ws)
            return False

    async def send_personal_message(self, player_id: str, message: dict):
        """Envia mensagem para um jogador específico (se conectado)."""
        ws = self.active_connections.get(player_id)
        if ws is None:
            return
        await self._safe_send_text(ws, message)

    async def _broadcast_many(self, player_ids: List[str], message: dict, exclude_player: Optional[str] = None):
        """Envia mensagem para vários jogadores (em paralelo)."""
        tasks = []
        for pid in player_ids:
            if exclude_player and pid == exclude_player:
                continue
            ws = self.active_connections.get(pid)
            if ws:
                tasks.append(self._safe_send_text(ws, message))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    # --------------- conexão ---------------

    async def connect(self, websocket: WebSocket, player_id: str):
        """Conecta um jogador (substitui conexão anterior se reconectar)."""
        await websocket.accept()

        # Se já existe uma conexão para esse player, fecha a antiga
        old_ws = self.active_connections.get(player_id)
        if old_ws and old_ws is not websocket:
            try:
                await old_ws.close(code=4000)
            except Exception:
                pass
            # remove mapeamento antigo
            if old_ws in self.player_connections:
                del self.player_connections[old_ws]

        self.active_connections[player_id] = websocket
        self.player_connections[websocket] = player_id
        logger.info(f"Player {player_id} connected")

    def disconnect(self, websocket: WebSocket):
        """Desconecta um jogador e atualiza a sala."""
        player_id = self.player_connections.pop(websocket, None)
        if not player_id:
            return

        self.active_connections.pop(player_id, None)

        # Remove o jogador da sala (se estiver em alguma)
        room = room_manager.remove_player(player_id)
        if room:
            # not await porque disconnect pode ser chamado fora do loop
            asyncio.create_task(self.broadcast_room_state(room.id))

        logger.info(f"Player {player_id} disconnected")

    # --------------- broadcasts ---------------

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_player: Optional[str] = None):
        """Envia mensagem para todos os jogadores de uma sala."""
        room = room_manager.get_room(room_id)
        if not room:
            return
        await self._broadcast_many([p.id for p in room.players], message, exclude_player)

    def _create_public_room_state(self, room: RoomState) -> PublicRoomState:
        """Cria uma versão pública da sala sem revelar informações privadas."""
        public_players = []
        for player in room.players:
            public_players.append(
                PublicPlayerState(
                    id=player.id,
                    nickname=player.nickname,
                    tokens=player.tokens,
                    hand_count=len(player.hand),
                    is_bot=player.is_bot,
                    is_eliminated=getattr(player, "is_eliminated", False),
                )
            )

        return PublicRoomState(
            id=room.id,
            players=public_players,
            max_players=room.max_players,
            host_id=room.host_id,
            game_started=getattr(room, "game_started", False),
            current_turn=getattr(room, "current_turn", None),
            direction=getattr(room, "direction", 1),
            accumulated_sum=getattr(room, "accumulated_sum", 0),
            round_limit=getattr(room, "round_limit", None),
            pending_effect=getattr(room, "pending_effect", None),
            deck_count=len(getattr(room, "deck", [])),
            discard_top=(room.discard_pile[-1] if getattr(room, "discard_pile", []) else None),
            turn_order=getattr(room, "turn_order", []),
        )

    async def broadcast_room_state(self, room_id: str):
        """Envia o estado da sala (público) para cada jogador, incluindo sua própria mão."""
        room = room_manager.get_room(room_id)
        if not room:
            return

        public_room = self._create_public_room_state(room)
        tasks = []

        for player in room.players:
            # monta Event personalizado por player (inclui self_hand só para o dono)
            event = Event(
                room=room,
                self_hand=(player.hand if not player.is_bot else None),
            )
            payload = event.model_dump()
            payload["room"] = public_room.model_dump()

            ws = self.active_connections.get(player.id)
            if ws:
                tasks.append(self._safe_send_text(ws, payload))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    # --------------- roteamento de mensagens ---------------

    async def handle_message(self, websocket: WebSocket, message: str):
        """Processa mensagens recebidas dos clientes."""
        try:
            data = json.loads(message)
            action = data.get("action")

            if websocket not in self.player_connections:
                await self._safe_send_text(websocket, {
                    "event": "error",
                    "code": "NOT_CONNECTED",
                    "message": "Player not connected",
                })
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
                    "message": f"Unknown action: {action}",
                })

        except json.JSONDecodeError:
            await self._safe_send_text(websocket, {
                "event": "error",
                "code": "INVALID_JSON",
                "message": "Invalid JSON format",
            })
        except Exception:
            logger.exception("Erro ao processar mensagem de WS.")
            await self._safe_send_text(websocket, {
                "event": "error",
                "code": "INTERNAL_ERROR",
                "message": "Internal server error",
            })

    # --------------- handlers ---------------

    async def _handle_create_room(self, player_id: str, data: dict):
        """Cria uma nova sala; o player atual vira host."""
        try:
            action = CreateRoomAction(**data)
            room = room_manager.create_room(action.nickname, action.max_players, player_id)
            room_manager.update_activity(room.id)
            await self.broadcast_room_state(room.id)
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "CREATE_ROOM_ERROR",
                "message": str(e),
            })

    async def _handle_join_room(self, player_id: str, data: dict):
        """Entra em uma sala existente (usando o player_id real da conexão)."""
        try:
            action = JoinRoomAction(**data)

            # Usa a versão com player_id para não criar um UUID que depois você teria que sobrescrever
            player = room_manager.join_room(action.room_id, action.nickname, player_id=player_id)
            if not player:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "JOIN_ROOM_ERROR",
                    "message": "Could not join room",
                })
                return

            room_manager.update_activity(action.room_id)
            await self.broadcast_room_state(action.room_id)
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "JOIN_ROOM_ERROR",
                "message": str(e),
            })

    async def _handle_start_game(self, player_id: str, data: dict):
        """Inicia o jogo (apenas host)."""
        try:
            action = StartGameAction(**data)
            room = room_manager.get_room(action.room_id)

            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found",
                })
                return

            if room.host_id != player_id:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "NOT_HOST",
                    "message": "Only host can start the game",
                })
                return

            if len(room.players) < 2:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "NOT_ENOUGH_PLAYERS",
                    "message": "Need at least 2 players to start",
                })
                return

            self.game_engine.start_game(room)
            room_manager.update_activity(room.id)
            await self.broadcast_room_state(room.id)

            # Eventos úteis de feedback
            await self.broadcast_to_room(room.id, {
                "event": "round_started",
                "limit": getattr(room, "round_limit", None),
            })
            await self.broadcast_to_room(room.id, {
                "event": "turn_changed",
                "player_id": getattr(room, "current_turn", None),
            })

        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "START_GAME_ERROR",
                "message": str(e),
            })

    async def _handle_play_card(self, player_id: str, data: dict):
        """Joga uma carta numérica."""
        try:
            action = PlayCardAction(**data)
            room = room_manager.get_room(action.room_id)
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found",
                })
                return

            result = self.game_engine.play_card(room, player_id, action.card_id, action.as_value)
            if result.get("success"):
                room_manager.update_activity(room.id)
                await self._handle_game_events(room, result.get("events", []))
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "INVALID_PLAY",
                    "message": result.get("error", "Invalid play"),
                })
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "PLAY_CARD_ERROR",
                "message": str(e),
            })

    async def _handle_play_special(self, player_id: str, data: dict):
        """Joga uma carta especial."""
        try:
            action = PlaySpecialAction(**data)
            room = room_manager.get_room(action.room_id)
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found",
                })
                return

            result = self.game_engine.play_special(room, player_id, action.card_id, action.type)
            if result.get("success"):
                room_manager.update_activity(room.id)
                await self._handle_game_events(room, result.get("events", []))
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "INVALID_PLAY",
                    "message": result.get("error", "Invalid play"),
                })
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "PLAY_SPECIAL_ERROR",
                "message": str(e),
            })

    async def _handle_pass_turn(self, player_id: str, data: dict):
        """Passa o turno (força punição)."""
        try:
            action = PassTurnAction(**data)
            room = room_manager.get_room(action.room_id)
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found",
                })
                return

            result = self.game_engine.force_penalty(room, player_id)
            if result.get("success"):
                room_manager.update_activity(room.id)
                await self._handle_game_events(room, result.get("events", []))
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "PASS_TURN_ERROR",
                    "message": result.get("error", "Could not pass turn"),
                })
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "PASS_TURN_ERROR",
                "message": str(e),
            })

    async def _handle_chat(self, player_id: str, data: dict):
        """Envia mensagem de chat para a sala."""
        try:
            action = ChatAction(**data)
            room = room_manager.get_room(action.room_id)
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found",
                })
                return

            player = next((p for p in room.players if p.id == player_id), None)
            if not player:
                return

            await self.broadcast_to_room(room.id, {
                "event": "chat",
                "player_id": player_id,
                "nickname": player.nickname,
                "message": action.message,
            })
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "CHAT_ERROR",
                "message": str(e),
            })

    async def _handle_add_bot(self, player_id: str, data: dict):
        """Adiciona um bot à sala (apenas host)."""
        try:
            action = AddBotAction(**data)
            room = room_manager.get_room(action.room_id)
            if not room:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ROOM_NOT_FOUND",
                    "message": "Room not found",
                })
                return

            if room.host_id != player_id:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "NOT_HOST",
                    "message": "Only host can add bots",
                })
                return

            bot = self.bot_manager.add_bot_to_room(room, action.difficulty)
            if bot:
                room_manager.update_activity(room.id)
                await self.broadcast_room_state(room.id)
            else:
                await self.send_personal_message(player_id, {
                    "event": "error",
                    "code": "ADD_BOT_ERROR",
                    "message": "Could not add bot",
                })
        except Exception as e:
            await self.send_personal_message(player_id, {
                "event": "error",
                "code": "ADD_BOT_ERROR",
                "message": str(e),
            })

    # --------------- game flow helpers ---------------

    async def _handle_game_events(self, room: RoomState, events: list):
        """Processa eventos do jogo e os envia para os clientes."""
        if events:
            await self.broadcast_to_room(room.id, {"event": "batch", "items": events})
        await self.broadcast_room_state(room.id)

        # Se for vez de bot, dispara a jogada dele
        if getattr(room, "current_turn", None) and getattr(room, "game_started", False):
            current_player = next((p for p in room.players if p.id == room.current_turn), None)
            if current_player and current_player.is_bot:
                await self._process_bot_turn(room, current_player)

    async def _process_bot_turn(self, room: RoomState, bot_player: PlayerState):
        """Processa o turno de um bot com pequeno delay."""
        await asyncio.sleep(1.0)

        action = self.bot_manager.get_bot_action(room, bot_player)
        if not action:
            return

        result = None
        try:
            if action["type"] == "play_card":
                result = self.game_engine.play_card(
                    room, bot_player.id, action["card_id"], action.get("as_value"),
                )
            elif action["type"] == "play_special":
                result = self.game_engine.play_special(
                    room, bot_player.id, action["card_id"], action["special_type"],
                )
            elif action["type"] == "pass_turn":
                result = self.game_engine.force_penalty(room, bot_player.id)

            if result and result.get("success"):
                room_manager.update_activity(room.id)
                await self._handle_game_events(room, result.get("events", []))
        except Exception:
            logger.exception("Erro ao processar turno do bot.")


# Instância global do gerenciador de conexões
manager = ConnectionManager()
