import random
from typing import List, Dict, Any, Optional
from ..models import RoomState, PlayerState, CardComp, CardKind
from .state import GameStateManager
from .rules import GameEngine
import uuid

class BotStrategy:
    """Classe base para estratégias de bot"""
    
    def choose_action(self, room: RoomState, bot_player: PlayerState, game_engine: GameEngine) -> Optional[Dict[str, Any]]:
        """
        Escolhe uma ação para o bot
        
        Args:
            room: Estado da sala
            bot_player: Estado do bot
            game_engine: Engine do jogo para validações
            
        Returns:
            Dicionário com a ação escolhida ou None se não há ação válida
        """
        raise NotImplementedError

class GreedyBotStrategy(BotStrategy):
    """
    Bot Greedy: estratégia simples e agressiva
    - Tenta =0 se a soma estiver alta
    - Caso contrário, joga o menor número viável
    - Usa Reverse para devolver efeito pendente perigoso
    - Se não puder jogar, passa o turno
    """
    
    def choose_action(self, room: RoomState, bot_player: PlayerState, game_engine: GameEngine) -> Optional[Dict[str, Any]]:
        valid_plays = game_engine.get_valid_plays(room, bot_player.id)
        
        if not valid_plays:
            return None
        
        # Se só pode passar o turno, passa
        if len(valid_plays) == 1 and valid_plays[0]["type"] == "pass_turn":
            return {"type": "pass_turn"}
        
        # Filtra jogadas por tipo
        number_plays = [p for p in valid_plays if p["type"] == "play_card" and p.get("card_kind") in ["number", "joker"]]
        special_plays = [p for p in valid_plays if p["type"] == "play_special"]
        
        # Estratégia: se a soma está alta (> 70% do limite), tenta usar =0
        high_threshold = room.round_limit * 0.7
        if room.accumulated_sum > high_threshold:
            reset_plays = [p for p in special_plays if p.get("special_type") == "reset0"]
            if reset_plays:
                return self._convert_to_action(reset_plays[0])
        
        # Se há efeito pendente perigoso, tenta usar Reverse para devolver
        if room.pending_effect and room.pending_effect.source_player_id != bot_player.id:
            reverse_plays = [p for p in special_plays if p.get("special_type") == "reverse"]
            if reverse_plays:
                # Só usa Reverse se o efeito é realmente perigoso
                if self._is_effect_dangerous(room.pending_effect, room):
                    return self._convert_to_action(reverse_plays[0])
        
        # Tenta jogar cartas numéricas (menor valor primeiro)
        if number_plays:
            # Ordena por valor (menor primeiro)
            number_plays.sort(key=lambda p: p.get("card_value", p.get("as_value", 10)))
            return self._convert_to_action(number_plays[0])
        
        # Se não pode jogar números, usa cartas especiais
        if special_plays:
            # Prioridade: +2 > x2 > Reverse > =0
            priority_order = ["plus2", "times2", "reverse", "reset0"]
            for special_type in priority_order:
                matching_plays = [p for p in special_plays if p.get("special_type") == special_type]
                if matching_plays:
                    return self._convert_to_action(matching_plays[0])
        
        # Se chegou aqui, passa o turno
        return {"type": "pass_turn"}
    
    def _is_effect_dangerous(self, pending_effect, room: RoomState) -> bool:
        """Verifica se um efeito pendente é perigoso para o bot"""
        if not pending_effect:
            return False
        
        # Considera perigoso se pode causar estouro fácil
        if pending_effect.multiplier and pending_effect.multiplier > 1:
            return True
        
        if pending_effect.add and pending_effect.add > 0:
            # Perigoso se a soma + efeito pode estourar facilmente
            danger_threshold = room.round_limit * 0.8
            return room.accumulated_sum + pending_effect.add > danger_threshold
        
        return False
    
    def _convert_to_action(self, play: Dict[str, Any]) -> Dict[str, Any]:
        """Converte uma jogada válida em ação do bot"""
        if play["type"] == "play_card":
            action = {
                "type": "play_card",
                "card_id": play["card_id"]
            }
            if "as_value" in play:
                action["as_value"] = play["as_value"]
            return action
        
        elif play["type"] == "play_special":
            return {
                "type": "play_special",
                "card_id": play["card_id"],
                "special_type": play["special_type"]
            }
        
        return {"type": "pass_turn"}

class RandomBotStrategy(BotStrategy):
    """Bot que joga aleatoriamente entre as jogadas válidas"""
    
    def choose_action(self, room: RoomState, bot_player: PlayerState, game_engine: GameEngine) -> Optional[Dict[str, Any]]:
        valid_plays = game_engine.get_valid_plays(room, bot_player.id)
        
        if not valid_plays:
            return None
        
        # Escolhe uma jogada aleatória
        chosen_play = random.choice(valid_plays)
        
        if chosen_play["type"] == "play_card":
            action = {
                "type": "play_card",
                "card_id": chosen_play["card_id"]
            }
            if "as_value" in chosen_play:
                action["as_value"] = chosen_play["as_value"]
            return action
        
        elif chosen_play["type"] == "play_special":
            return {
                "type": "play_special",
                "card_id": chosen_play["card_id"],
                "special_type": chosen_play["special_type"]
            }
        
        return {"type": "pass_turn"}

class DefensiveBotStrategy(BotStrategy):
    """
    Bot defensivo: evita riscos e tenta manter tokens
    - Prefere cartas especiais para controlar o jogo
    - Joga números altos quando seguro
    - Usa =0 frequentemente para resetar
    """
    
    def choose_action(self, room: RoomState, bot_player: PlayerState, game_engine: GameEngine) -> Optional[Dict[str, Any]]:
        valid_plays = game_engine.get_valid_plays(room, bot_player.id)
        
        if not valid_plays:
            return None
        
        # Se só pode passar o turno, passa
        if len(valid_plays) == 1 and valid_plays[0]["type"] == "pass_turn":
            return {"type": "pass_turn"}
        
        # Filtra jogadas por tipo
        number_plays = [p for p in valid_plays if p["type"] == "play_card" and p.get("card_kind") in ["number", "joker"]]
        special_plays = [p for p in valid_plays if p["type"] == "play_special"]
        
        # Se a soma está moderadamente alta (> 50% do limite), usa =0
        moderate_threshold = room.round_limit * 0.5
        if room.accumulated_sum > moderate_threshold:
            reset_plays = [p for p in special_plays if p.get("special_type") == "reset0"]
            if reset_plays:
                return self._convert_to_action(reset_plays[0])
        
        # Prefere cartas especiais para controlar o jogo
        if special_plays:
            # Prioridade defensiva: =0 > Reverse > +2 > x2
            priority_order = ["reset0", "reverse", "plus2", "times2"]
            for special_type in priority_order:
                matching_plays = [p for p in special_plays if p.get("special_type") == special_type]
                if matching_plays:
                    return self._convert_to_action(matching_plays[0])
        
        # Se deve jogar números, prefere valores altos (mais seguros)
        if number_plays:
            # Ordena por valor (maior primeiro)
            number_plays.sort(key=lambda p: p.get("card_value", p.get("as_value", 0)), reverse=True)
            return self._convert_to_action(number_plays[0])
        
        # Se chegou aqui, passa o turno
        return {"type": "pass_turn"}
    
    def _convert_to_action(self, play: Dict[str, Any]) -> Dict[str, Any]:
        """Converte uma jogada válida em ação do bot"""
        if play["type"] == "play_card":
            action = {
                "type": "play_card",
                "card_id": play["card_id"]
            }
            if "as_value" in play:
                action["as_value"] = play["as_value"]
            return action
        
        elif play["type"] == "play_special":
            return {
                "type": "play_special",
                "card_id": play["card_id"],
                "special_type": play["special_type"]
            }
        
        return {"type": "pass_turn"}

class BotManager:
    """Gerencia os bots no jogo"""
    
    def __init__(self):
        self.strategies = {
            "LOW": RandomBotStrategy(),
            "MID": GreedyBotStrategy(),
            "HIGH": DefensiveBotStrategy()
        }
        self.game_engine = GameEngine()
    
    def add_bot_to_room(self, room: RoomState, difficulty: str = "LOW") -> Optional[PlayerState]:
        """
        Adiciona um bot à sala
        
        Args:
            room: Estado da sala
            difficulty: Dificuldade do bot ("LOW", "MID", "HIGH")
            
        Returns:
            PlayerState do bot criado ou None se não foi possível adicionar
        """
        if len(room.players) >= room.max_players:
            return None
        
        if room.game_started:
            return None
        
        # Gera nickname único para o bot
        bot_number = len([p for p in room.players if p.is_bot]) + 1
        difficulty_name = difficulty
        bot_nickname = f"Bot {difficulty_name} {bot_number}"
        
        # Verifica se o nickname já existe
        while any(p.nickname == bot_nickname for p in room.players):
            bot_number += 1
            bot_nickname = f"Bot {difficulty_name} {bot_number}"
        
        # Cria o bot
        bot_player = PlayerState(
            id=str(uuid.uuid4()),
            nickname=bot_nickname,
            tokens=3,
            hand=[],
            is_bot=True
        )
        
        room.players.append(bot_player)
        return bot_player
    
    def get_bot_action(self, room: RoomState, bot_player: PlayerState) -> Optional[Dict[str, Any]]:
        """
        Obtém a próxima ação de um bot
        
        Args:
            room: Estado da sala
            bot_player: Estado do bot
            
        Returns:
            Dicionário com a ação escolhida ou None
        """
        if not bot_player.is_bot:
            return None
        
        # Determina a dificuldade baseada no nickname
        difficulty = "LOW"  # padrão
        if "MID" in bot_player.nickname:
            difficulty = "MID"
        elif "HIGH" in bot_player.nickname:
            difficulty = "HIGH"
        
        strategy = self.strategies.get(difficulty, self.strategies["LOW"])
        return strategy.choose_action(room, bot_player, self.game_engine)
    
    def get_bot_count_by_difficulty(self, room: RoomState) -> Dict[str, int]:
        """Retorna contagem de bots por dificuldade na sala"""
        counts = {"LOW": 0, "MID": 0, "HIGH": 0}
        
        for player in room.players:
            if player.is_bot:
                if "LOW" in player.nickname:
                    counts["LOW"] += 1
                elif "MID" in player.nickname:
                    counts["MID"] += 1
                elif "HIGH" in player.nickname:
                    counts["HIGH"] += 1
        
        return counts

