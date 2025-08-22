import random
from typing import List, Dict, Any, Optional
from ..models import RoomState, PlayerState, Card, CardKind, PendingEffect
from .state import GameStateManager
from .deck import DeckManager

class GameEngine:
    """Engine principal que implementa as regras do jogo SOMO"""
    
    def start_game(self, room: RoomState):
        """
        Inicia o jogo na sala
        - Cria e embaralha o baralho
        - Distribui 7 cartas para cada jogador
        - Define ordem dos turnos
        - Inicia primeira rodada
        """
        # Cria e embaralha o baralho
        room.deck = DeckManager.create_and_shuffle_deck()
        room.discard_pile = []
        
        # Distribui 7 cartas para cada jogador
        room.deck = GameStateManager.distribute_cards_to_all(room, room.deck, 7)
        
        # Inicializa ordem dos turnos
        GameStateManager.initialize_turn_order(room)
        
        # Marca o jogo como iniciado
        room.game_started = True
        
        # Inicia a primeira rodada
        GameStateManager.reset_round(room)
    
    def can_play_number(self, value: int, current_sum: int, limit: int, pending_effect: Optional[PendingEffect] = None) -> bool:
        """
        Verifica se uma carta numérica pode ser jogada
        
        Args:
            value: Valor da carta numérica
            current_sum: Soma atual acumulada
            limit: Limite da rodada atual
            pending_effect: Efeito pendente (não se aplica à validação do jogador atual)
            
        Returns:
            True se a carta pode ser jogada, False caso contrário
        """
        # O efeito pendente nunca se aplica no turno atual, só no próximo número
        # Então para validação, usamos apenas o valor da carta sem efeitos
        return current_sum + value <= limit
    
    def apply_pending_effect(self, value: int, pending_effect: Optional[PendingEffect]) -> int:
        """
        Aplica efeito pendente ao valor de uma carta numérica
        
        Args:
            value: Valor original da carta
            pending_effect: Efeito pendente a ser aplicado
            
        Returns:
            Valor modificado após aplicar o efeito
        """
        if not pending_effect:
            return value
        
        modified_value = value
        
        # Aplica multiplicador primeiro, depois aditivo
        if pending_effect.multiplier:
            modified_value *= pending_effect.multiplier
        
        if pending_effect.add:
            modified_value += pending_effect.add
        
        return modified_value
    
    def play_card(self, room: RoomState, player_id: str, card_id: str, as_value: Optional[int] = None) -> Dict[str, Any]:
        """
        Joga uma carta numérica ou joker
        
        Args:
            room: Estado da sala
            player_id: ID do jogador
            card_id: ID da carta
            as_value: Valor escolhido para joker (0-9)
            
        Returns:
            Dicionário com resultado da ação
        """
        # Validações básicas
        if not room.game_started:
            return {"success": False, "error": "Game not started"}
        
        if room.current_turn != player_id:
            return {"success": False, "error": "Not your turn"}
        
        player = GameStateManager.get_player_by_id(room, player_id)
        if not player:
            return {"success": False, "error": "Player not found"}
        
        card = GameStateManager.find_card_in_hand(player, card_id)
        if not card:
            return {"success": False, "error": "Card not in hand"}
        
        # Verifica se é carta numérica ou joker
        if card.kind not in [CardKind.NUMBER, CardKind.JOKER]:
            return {"success": False, "error": "Use play_special for special cards"}
        
        # Para joker, valida o valor escolhido
        if card.kind == CardKind.JOKER:
            if as_value is None or as_value < 0 or as_value > 9:
                return {"success": False, "error": "Joker requires as_value between 0-9"}
            card_value = as_value
        else:
            card_value = card.value
        
        # Verifica se pode jogar a carta (sem efeito pendente na validação)
        if not self.can_play_number(card_value, room.accumulated_sum, room.round_limit):
            return {"success": False, "error": "Card would exceed limit"}
        
        # Remove a carta da mão
        GameStateManager.remove_card_from_hand(player, card_id)
        
        # Aplica efeito pendente se houver (só para o cálculo final)
        final_value = self.apply_pending_effect(card_value, room.pending_effect)
        
        # Atualiza a soma
        room.accumulated_sum += card_value  # Soma sempre usa o valor base da carta
        
        # Adiciona à pilha de descarte
        played_card = card.model_copy()
        if card.kind == CardKind.JOKER:
            played_card.value = as_value
        room.discard_pile.append(played_card)
        
        events = []
        
        # Evento de carta jogada
        events.append({
            "event": "card_played",
            "player_id": player_id,
            "card": played_card.model_dump(),
            "sum": room.accumulated_sum
        })
        
        # Remove efeito pendente após aplicação
        if room.pending_effect:
            room.pending_effect = None
        
        # Verifica acerto exato
        if room.accumulated_sum == room.round_limit:
            # Jogador compra +2 cartas
            room.deck = GameStateManager.distribute_cards_to_player(room, room.deck, player_id, 2)
            
            events.append({
                "event": "draw_cards",
                "players": [{"id": player_id, "amount": 2}]
            })
            
            # Reinicia rodada
            GameStateManager.reset_round(room)
            events.append({
                "event": "round_reset",
                "reason": "exact_hit"
            })
            events.append({
                "event": "round_started",
                "limit": room.round_limit
            })
        
        # Verifica estouro (não deveria acontecer com validação correta)
        elif room.accumulated_sum > room.round_limit:
            # Aplica punição
            eliminated = GameStateManager.apply_penalty(room, player_id)
            
            events.append({
                "event": "penalty",
                "player_id": player_id,
                "tokens_left": player.tokens
            })
            
            # Todos compram 2 cartas
            draw_events = []
            for p in GameStateManager.get_active_players(room):
                room.deck = GameStateManager.distribute_cards_to_player(room, room.deck, p.id, 2)
                draw_events.append({"id": p.id, "amount": 2})
            
            if draw_events:
                events.append({
                    "event": "draw_cards",
                    "players": draw_events
                })
            
            # Reinicia rodada
            GameStateManager.reset_round(room)
            events.append({
                "event": "round_reset",
                "reason": "penalty"
            })
            events.append({
                "event": "round_started",
                "limit": room.round_limit
            })
            
            # Verifica se jogador foi eliminado
            if eliminated:
                winner = GameStateManager.check_game_over(room)
                if winner:
                    events.append({
                        "event": "game_over",
                        "winner_id": winner
                    })
                    return {"success": True, "events": events}
        
        # Avança turno se não houve reset de rodada
        if not any(e.get("event") == "round_reset" for e in events):
            next_player = GameStateManager.advance_turn(room)
            if next_player:
                events.append({
                    "event": "turn_changed",
                    "player_id": next_player
                })
        
        return {"success": True, "events": events}
    
    def play_special(self, room: RoomState, player_id: str, card_id: str, special_type: str) -> Dict[str, Any]:
        """
        Joga uma carta especial
        
        Args:
            room: Estado da sala
            player_id: ID do jogador
            card_id: ID da carta
            special_type: Tipo da carta especial
            
        Returns:
            Dicionário com resultado da ação
        """
        # Validações básicas
        if not room.game_started:
            return {"success": False, "error": "Game not started"}
        
        if room.current_turn != player_id:
            return {"success": False, "error": "Not your turn"}
        
        player = GameStateManager.get_player_by_id(room, player_id)
        if not player:
            return {"success": False, "error": "Player not found"}
        
        card = GameStateManager.find_card_in_hand(player, card_id)
        if not card:
            return {"success": False, "error": "Card not in hand"}
        
        # Verifica se a carta corresponde ao tipo especial
        expected_kind = {
            "plus2": CardKind.PLUS2,
            "times2": CardKind.TIMES2,
            "reset0": CardKind.RESET0,
            "reverse": CardKind.REVERSE
        }.get(special_type)
        
        if card.kind != expected_kind:
            return {"success": False, "error": f"Card is not {special_type}"}
        
        # Remove a carta da mão
        GameStateManager.remove_card_from_hand(player, card_id)
        
        # Adiciona à pilha de descarte
        room.discard_pile.append(card)
        
        events = []
        
        # Aplica efeito da carta especial
        if special_type == "reset0":
            # =0: zera S imediatamente
            room.accumulated_sum = 0
            events.append({
                "event": "sum_reset",
                "by_player_id": player_id
            })
        
        elif special_type == "plus2":
            # +2: define efeito pendente
            room.pending_effect = PendingEffect(
                add=2,
                source_player_id=player_id
            )
            events.append({
                "event": "effect_set",
                "type": "plus2",
                "source_player_id": player_id
            })
        
        elif special_type == "times2":
            # x2: define efeito pendente
            room.pending_effect = PendingEffect(
                multiplier=2,
                source_player_id=player_id
            )
            events.append({
                "event": "effect_set",
                "type": "times2",
                "source_player_id": player_id
            })
        
        elif special_type == "reverse":
            # Reverse: inverte direção e pode devolver efeito pendente
            GameStateManager.reverse_direction(room)
            events.append({
                "event": "direction_changed",
                "clockwise": room.direction
            })
        
        # Avança turno
        next_player = GameStateManager.advance_turn(room)
        if next_player:
            events.append({
                "event": "turn_changed",
                "player_id": next_player
            })
        
        return {"success": True, "events": events}
    
    def force_penalty(self, room: RoomState, player_id: str) -> Dict[str, Any]:
        """
        Força punição por impossibilidade de jogar
        
        Args:
            room: Estado da sala
            player_id: ID do jogador
            
        Returns:
            Dicionário com resultado da ação
        """
        # Validações básicas
        if not room.game_started:
            return {"success": False, "error": "Game not started"}
        
        if room.current_turn != player_id:
            return {"success": False, "error": "Not your turn"}
        
        player = GameStateManager.get_player_by_id(room, player_id)
        if not player:
            return {"success": False, "error": "Player not found"}
        
        events = []
        
        # Aplica punição
        eliminated = GameStateManager.apply_penalty(room, player_id)
        
        events.append({
            "event": "penalty",
            "player_id": player_id,
            "tokens_left": player.tokens
        })
        
        # Todos compram 2 cartas
        draw_events = []
        for p in GameStateManager.get_active_players(room):
            room.deck = GameStateManager.distribute_cards_to_player(room, room.deck, p.id, 2)
            draw_events.append({"id": p.id, "amount": 2})
        
        if draw_events:
            events.append({
                "event": "draw_cards",
                "players": draw_events
            })
        
        # Reinicia rodada
        GameStateManager.reset_round(room)
        events.append({
            "event": "round_reset",
            "reason": "penalty"
        })
        events.append({
            "event": "round_started",
            "limit": room.round_limit
        })
        
        # Verifica se jogador foi eliminado
        if eliminated:
            winner = GameStateManager.check_game_over(room)
            if winner:
                events.append({
                    "event": "game_over",
                    "winner_id": winner
                })
                return {"success": True, "events": events}
        
        return {"success": True, "events": events}
    
    def get_valid_plays(self, room: RoomState, player_id: str) -> List[Dict[str, Any]]:
        """
        Retorna lista de jogadas válidas para um jogador
        
        Returns:
            Lista de dicionários descrevendo jogadas válidas
        """
        player = GameStateManager.get_player_by_id(room, player_id)
        if not player or room.current_turn != player_id:
            return []
        
        valid_plays = []
        
        for card in player.hand:
            if card.kind == CardKind.NUMBER:
                if self.can_play_number(card.value, room.accumulated_sum, room.round_limit):
                    valid_plays.append({
                        "type": "play_card",
                        "card_id": card.id,
                        "card_kind": card.kind.value,
                        "card_value": card.value
                    })
            
            elif card.kind == CardKind.JOKER:
                # Joker pode ser jogado com qualquer valor que seja válido
                for value in range(10):
                    if self.can_play_number(value, room.accumulated_sum, room.round_limit):
                        valid_plays.append({
                            "type": "play_card",
                            "card_id": card.id,
                            "card_kind": card.kind.value,
                            "as_value": value
                        })
                        break  # Só precisa de uma opção válida para joker
            
            else:
                # Cartas especiais sempre podem ser jogadas
                special_type = {
                    CardKind.PLUS2: "plus2",
                    CardKind.TIMES2: "times2",
                    CardKind.RESET0: "reset0",
                    CardKind.REVERSE: "reverse"
                }.get(card.kind)
                
                if special_type:
                    valid_plays.append({
                        "type": "play_special",
                        "card_id": card.id,
                        "card_kind": card.kind.value,
                        "special_type": special_type
                    })
        
        # Se não há jogadas válidas, pode passar o turno (força punição)
        if not valid_plays:
            valid_plays.append({
                "type": "pass_turn"
            })
        
        return valid_plays

