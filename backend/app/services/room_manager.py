import asyncio
import time
import uuid
import random
import string
from typing import Dict, Optional
from ..models import RoomState, PlayerState

# =========================
# Configurações de limpeza
# =========================
INACTIVITY_SECONDS = 30 * 60       # 30 min
CLEANUP_INTERVAL_SECONDS = 5 * 60  # 5 min
ROOM_ID_LEN = 6
ROOM_ID_ATTEMPTS = 8               # tentativas antes do fallback UUID
MIN_PLAYERS = 2
MAX_PLAYERS = 8


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, RoomState] = {}
        self.player_to_room: Dict[str, str] = {}   # player_id -> room_id
        self.room_last_activity: Dict[str, float] = {}
        self.cleanup_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    # -------------------------
    # Ciclo de limpeza automática
    # -------------------------
    def start_cleanup_task(self):
        """Inicia a tarefa de limpeza automática de salas inativas."""
        if self.cleanup_task is None:
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def shutdown(self):
        """Cancela a task de limpeza com segurança (use no desligamento do app)."""
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
            finally:
                self.cleanup_task = None

    async def _cleanup_loop(self):
        """Loop que remove salas inativas regularmente."""
        try:
            while True:
                await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
                await self._cleanup_inactive_rooms()
        except asyncio.CancelledError:
            # Finalização limpa
            return

    async def _cleanup_inactive_rooms(self):
        """Remove salas que estão inativas há mais de INACTIVITY_SECONDS."""
        now = time.monotonic()
        async with self._lock:
            inactive_rooms = [
                rid for rid, last in list(self.room_last_activity.items())
                if now - last > INACTIVITY_SECONDS
            ]
        for room_id in inactive_rooms:
            await self.remove_room(room_id)

    # -------------------------
    # Utilidades
    # -------------------------
    def generate_room_id(self) -> str:
        """Gera um ID único de ROOM_ID_LEN caracteres para a sala."""
        for _ in range(ROOM_ID_ATTEMPTS):
            rid = ''.join(random.choices(string.ascii_uppercase + string.digits, k=ROOM_ID_LEN))
            if rid not in self.rooms:
                return rid
        # Fallback (quase impossível de colidir)
        return uuid.uuid4().hex[:ROOM_ID_LEN].upper()

    def update_activity(self, room_id: str):
        """Atualiza o timestamp de atividade da sala."""
        if room_id in self.rooms:
            self.room_last_activity[room_id] = time.monotonic()

    # -------------------------
    # Ações de sala
    # -------------------------
    def create_room(
        self,
        host_nickname: str,
        max_players: int = 8,
        host_player_id: Optional[str] = None
    ) -> RoomState:
        """Cria uma nova sala e registra o host."""
        if not (MIN_PLAYERS <= max_players <= MAX_PLAYERS):
            raise ValueError(f"max_players deve estar entre {MIN_PLAYERS} e {MAX_PLAYERS}.")

        room_id = self.generate_room_id()
        host_id = host_player_id if host_player_id else str(uuid.uuid4())

        host_player = PlayerState(
            id=host_id,
            nickname=host_nickname,
            tokens=3,
            hand=[],
            is_bot=False
        )

        room = RoomState(
            id=room_id,
            players=[host_player],
            max_players=max_players,
            host_id=host_id
        )

        async def _register():
            async with self._lock:
                self.rooms[room_id] = room
                self.player_to_room[host_id] = room_id
                self.room_last_activity[room_id] = time.monotonic()

        # Executa a parte protegida por lock no event loop ativo
        try:
            loop = asyncio.get_running_loop()
            fut = asyncio.run_coroutine_threadsafe(_register(), loop)
            fut.result()
        except RuntimeError:
            # Se não houver loop rodando (raro em FastAPI/uvicorn), cria um temporário
            asyncio.run(_register())

        return room

    def join_room(
        self,
        room_id: str,
        nickname: str,
        player_id: Optional[str] = None
    ) -> Optional[PlayerState]:
        """Adiciona um jogador a uma sala existente. Aceita player_id para reconexão."""
        if room_id not in self.rooms:
            return None

        room = self.rooms[room_id]

        # Verifica se a sala está cheia
        if len(room.players) >= room.max_players:
            return None

        # Verifica se o jogo já começou (usa getattr para compatibilidade)
        if getattr(room, "game_started", False):
            return None

        # Verifica se o nickname já existe na sala
        if any(p.nickname == nickname for p in room.players):
            return None

        # Reuso de player_id (reconexão) ou novo id
        player_id = player_id or str(uuid.uuid4())

        # Se o player já está mapeado em outra sala, rejeita (ou poderia migrar)
        mapped_room = self.player_to_room.get(player_id)
        if mapped_room and mapped_room != room_id:
            return None

        player = PlayerState(
            id=player_id,
            nickname=nickname,
            tokens=3,
            hand=[],
            is_bot=False
        )

        async def _register_join():
            async with self._lock:
                room.players.append(player)
                self.player_to_room[player_id] = room_id
                self.room_last_activity[room_id] = time.monotonic()

        try:
            loop = asyncio.get_running_loop()
            fut = asyncio.run_coroutine_threadsafe(_register_join(), loop)
            fut.result()
        except RuntimeError:
            asyncio.run(_register_join())

        return player

    def get_room(self, room_id: str) -> Optional[RoomState]:
        """Retorna uma sala pelo ID."""
        return self.rooms.get(room_id)

    def get_player_room(self, player_id: str) -> Optional[RoomState]:
        """Retorna a sala onde o jogador está."""
        rid = self.player_to_room.get(player_id)
        if rid:
            return self.rooms.get(rid)
        return None

    def remove_player(self, player_id: str) -> Optional[RoomState]:
        """Remove um jogador de sua sala."""
        room_id = self.player_to_room.get(player_id)
        if not room_id or room_id not in self.rooms:
            return None

        room = self.rooms[room_id]

        # Remove o jogador da sala
        room.players = [p for p in room.players if p.id != player_id]
        if player_id in self.player_to_room:
            del self.player_to_room[player_id]

        # Se a sala ficou vazia, remove ela
        if not room.players:
            if room_id in self.rooms:
                del self.rooms[room_id]
            if room_id in self.room_last_activity:
                del self.room_last_activity[room_id]
            return None

        # Se o host saiu, transfere para outro jogador
        if room.host_id == player_id:
            room.host_id = room.players[0].id

        self.room_last_activity[room_id] = time.monotonic()
        return room

    async def remove_room(self, room_id: str):
        """Remove uma sala completamente."""
        if room_id not in self.rooms:
            return

        room = self.rooms[room_id]

        # Remove todos os jogadores do mapeamento
        for player in list(room.players):
            if player.id in self.player_to_room:
                del self.player_to_room[player.id]

        # Remove a sala
        del self.rooms[room_id]
        if room_id in self.room_last_activity:
            del self.room_last_activity[room_id]

    def get_all_rooms(self) -> Dict[str, RoomState]:
        """Retorna todas as salas (para debug/admin)."""
        return dict(self.rooms)


# Instância global do gerenciador de salas
room_manager = RoomManager()
