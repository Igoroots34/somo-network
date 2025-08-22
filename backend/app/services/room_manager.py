import asyncio
import time
from typing import Dict, Optional, Set
from ..models import RoomState, PlayerState
import uuid
import random
import string

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, RoomState] = {}
        self.player_to_room: Dict[str, str] = {}  # player_id -> room_id
        self.room_last_activity: Dict[str, float] = {}
        self.cleanup_task: Optional[asyncio.Task] = None
        
    def start_cleanup_task(self):
        """Inicia a tarefa de limpeza automática de salas inativas"""
        if self.cleanup_task is None:
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())
    
    async def _cleanup_loop(self):
        """Loop de limpeza que remove salas inativas a cada 5 minutos"""
        while True:
            await asyncio.sleep(300)  # 5 minutos
            await self._cleanup_inactive_rooms()
    
    async def _cleanup_inactive_rooms(self):
        """Remove salas que estão inativas há mais de 30 minutos"""
        current_time = time.time()
        inactive_rooms = []
        
        for room_id, last_activity in self.room_last_activity.items():
            if current_time - last_activity > 1800:  # 30 minutos
                inactive_rooms.append(room_id)
        
        for room_id in inactive_rooms:
            await self.remove_room(room_id)
    
    def generate_room_id(self) -> str:
        """Gera um ID único de 6 caracteres para a sala"""
        while True:
            room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if room_id not in self.rooms:
                return room_id
    
    def create_room(self, host_nickname: str, max_players: int = 8, host_player_id: Optional[str] = None) -> RoomState:
        """Cria uma nova sala"""
        room_id = self.generate_room_id()
        
        # Usa o host_player_id fornecido ou gera um novo
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
        
        self.rooms[room_id] = room
        self.player_to_room[host_id] = room_id
        self.room_last_activity[room_id] = time.time()
        
        return room

    
    def join_room(self, room_id: str, nickname: str, player_id: Optional[str] = None) -> Optional[PlayerState]:
        """Adiciona um jogador a uma sala existente (com suporte a reconexão pelo player_id)."""
        if room_id not in self.rooms:
            return None

        room = self.rooms[room_id]

        # Sala cheia?
        if len(room.players) >= room.max_players:
            return None

        # Jogo já começou?
        if getattr(room, "game_started", False):
            return None

        # Id do jogador (novo ou vindo do cliente)
        player_id = player_id or str(uuid.uuid4())

        # Se esse player_id já está mapeado em outra sala → rejeita (ou migre se quiser)
        mapped_room = self.player_to_room.get(player_id)
        if mapped_room and mapped_room != room_id:
            return None

        # RECONEXÃO: o player_id já está nesta sala
        if mapped_room == room_id:
            existing = next((p for p in room.players if p.id == player_id), None)
            if existing:
                # Atualiza apelido se quiser permitir mudança
                if nickname and nickname != existing.nickname:
                    existing.nickname = nickname
                self.room_last_activity[room_id] = time.monotonic()
                return existing
            # Mapeado mas não achou na lista (inconsistência rara) → ajusta abaixo

        # Apelido já existe na sala para OUTRO player?
        for p in room.players:
            if p.nickname == nickname and p.id != player_id:
                return None

        # Cria novo jogador
        player = PlayerState(
            id=player_id,
            nickname=nickname,
            tokens=3,
            hand=[],
            is_bot=False,
        )

        room.players.append(player)
        self.player_to_room[player_id] = room_id
        self.room_last_activity[room_id] = time.monotonic()
        return player

    
    def get_room(self, room_id: str) -> Optional[RoomState]:
        """Retorna uma sala pelo ID"""
        return self.rooms.get(room_id)
    
    def get_player_room(self, player_id: str) -> Optional[RoomState]:
        """Retorna a sala onde o jogador está"""
        room_id = self.player_to_room.get(player_id)
        if room_id:
            return self.rooms.get(room_id)
        return None
    
    def remove_player(self, player_id: str) -> Optional[RoomState]:
        """Remove um jogador de sua sala"""
        room_id = self.player_to_room.get(player_id)
        if not room_id or room_id not in self.rooms:
            return None
        
        room = self.rooms[room_id]
        
        # Remove o jogador da sala
        room.players = [p for p in room.players if p.id != player_id]
        del self.player_to_room[player_id]
        
        # Se a sala ficou vazia, remove ela
        if not room.players:
            del self.rooms[room_id]
            if room_id in self.room_last_activity:
                del self.room_last_activity[room_id]
            return None
        
        # Se o host saiu, transfere para outro jogador
        if room.host_id == player_id:
            room.host_id = room.players[0].id
        
        self.room_last_activity[room_id] = time.time()
        return room
    
    async def remove_room(self, room_id: str):
        """Remove uma sala completamente"""
        if room_id not in self.rooms:
            return
        
        room = self.rooms[room_id]
        
        # Remove todos os jogadores do mapeamento
        for player in room.players:
            if player.id in self.player_to_room:
                del self.player_to_room[player.id]
        
        # Remove a sala
        del self.rooms[room_id]
        if room_id in self.room_last_activity:
            del self.room_last_activity[room_id]
    
    def update_activity(self, room_id: str):
        """Atualiza o timestamp de atividade da sala"""
        if room_id in self.rooms:
            self.room_last_activity[room_id] = time.time()
    
    def get_all_rooms(self) -> Dict[str, RoomState]:
        """Retorna todas as salas (para debug/admin)"""
        return self.rooms.copy()

# Instância global do gerenciador de salas
room_manager = RoomManager()

