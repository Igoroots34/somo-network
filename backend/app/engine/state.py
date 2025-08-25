import random
from typing import List, Optional
from ..models import RoomState, PlayerState, CardComp, PendingEffect

class GameStateManager:
    """Gerencia o estado do jogo, turnos e transições"""
    
    @staticmethod
    def initialize_turn_order(room: RoomState):
        """
        Inicializa a ordem dos turnos aleatoriamente
        Define o primeiro jogador e a direção inicial (horário)
        """
        # Filtra apenas jogadores não eliminados
        active_players = [p for p in room.players if not p.is_eliminated]
        
        if not active_players:
            return
        
        # Embaralha a ordem dos jogadores
        random.shuffle(active_players)
        
        # Define a ordem dos turnos
        room.turn_order = [p.id for p in active_players]
        
        # Define o primeiro jogador
        room.current_turn = room.turn_order[0]
        
        # Direção inicial é sempre horária
        room.direction = True
    
    @staticmethod
    def get_current_player_index(room: RoomState) -> Optional[int]:
        """Retorna o índice do jogador atual na ordem dos turnos"""
        if not room.current_turn or not room.turn_order:
            return None
        
        try:
            return room.turn_order.index(room.current_turn)
        except ValueError:
            return None
    
    @staticmethod
    def get_next_player_id(room: RoomState) -> Optional[str]:
        """
        Retorna o ID do próximo jogador na ordem dos turnos
        Considera a direção atual (horária ou anti-horária)
        """
        current_index = GameStateManager.get_current_player_index(room)
        if current_index is None:
            return None
        
        active_players = [pid for pid in room.turn_order 
                         if not GameStateManager.is_player_eliminated(room, pid)]
        
        if not active_players:
            return None
        
        # Encontra o índice do jogador atual na lista de jogadores ativos
        try:
            current_active_index = active_players.index(room.current_turn)
        except ValueError:
            return None
        
        # Calcula o próximo índice baseado na direção
        if room.direction:  # Horário
            next_index = (current_active_index + 1) % len(active_players)
        else:  # Anti-horário
            next_index = (current_active_index - 1) % len(active_players)
        
        return active_players[next_index]
    
    @staticmethod
    def advance_turn(room: RoomState) -> Optional[str]:
        """
        Avança para o próximo turno
        
        Returns:
            ID do próximo jogador ou None se não há próximo jogador
        """
        next_player_id = GameStateManager.get_next_player_id(room)
        if next_player_id:
            room.current_turn = next_player_id
        return next_player_id
    
    @staticmethod
    def reverse_direction(room: RoomState):
        """
        Inverte a direção do jogo
        
        Regra especial: se havia pendingEffect ativo de uma carta especial jogada 
        no turno anterior, após o Reverse o "próximo" passa a ser quem jogou a 
        especial — logo o efeito reverte para esse jogador
        """
        room.direction = not room.direction
        
        # Se há um efeito pendente, ele deve ser redirecionado para quem o criou
        if room.pending_effect:
            # O próximo jogador agora será quem jogou a carta especial
            room.current_turn = room.pending_effect.source_player_id
    
    @staticmethod
    def is_player_eliminated(room: RoomState, player_id: str) -> bool:
        """Verifica se um jogador foi eliminado"""
        player = next((p for p in room.players if p.id == player_id), None)
        return player is None or player.is_eliminated or player.tokens <= 0
    
    @staticmethod
    def eliminate_player(room: RoomState, player_id: str):
        """
        Elimina um jogador do jogo
        Remove da ordem dos turnos e marca como eliminado
        """
        player = next((p for p in room.players if p.id == player_id), None)
        if player:
            player.is_eliminated = True
            player.tokens = 0
        
        # Remove da ordem dos turnos
        if player_id in room.turn_order:
            room.turn_order.remove(player_id)
        
        # Se era o jogador atual, avança para o próximo
        if room.current_turn == player_id:
            GameStateManager.advance_turn(room)
    
    @staticmethod
    def get_active_players(room: RoomState) -> List[PlayerState]:
        """Retorna lista de jogadores ativos (não eliminados)"""
        return [p for p in room.players if not p.is_eliminated and p.tokens > 0]
    
    @staticmethod
    def check_game_over(room: RoomState) -> Optional[str]:
        """
        Verifica se o jogo acabou
        
        Returns:
            ID do jogador vencedor ou None se o jogo continua
        """
        active_players = GameStateManager.get_active_players(room)
        
        if len(active_players) <= 1:
            return active_players[0].id if active_players else None
        
        return None
    
    @staticmethod
    def reset_round(room: RoomState):
        """
        Reinicia uma rodada
        - Zera accumulated_sum
        - Remove pending_effect
        - Rola novo D20 para round_limit
        """
        room.accumulated_sum = 0
        room.pending_effect = None
        room.round_limit = random.randint(1, 20)  # D20
    
    @staticmethod
    def apply_penalty(room: RoomState, player_id: str) -> bool:
        """
        Aplica punição a um jogador
        - Remove 1 token
        - Verifica se foi eliminado
        
        Returns:
            True se o jogador foi eliminado, False caso contrário
        """
        player = next((p for p in room.players if p.id == player_id), None)
        if not player:
            return False
        
        player.tokens -= 1
        
        if player.tokens <= 0:
            GameStateManager.eliminate_player(room, player_id)
            return True
        
        return False
    
    @staticmethod
    def distribute_cards_to_all(room: RoomState, deck: List[CardComp], cards_per_player: int) -> List[CardComp]:
        """
        Distribui cartas para todos os jogadores ativos
        
        Args:
            room: Estado da sala
            deck: Baralho atual
            cards_per_player: Número de cartas por jogador
            
        Returns:
            Baralho restante após distribuição
        """
        active_players = GameStateManager.get_active_players(room)
        remaining_deck = deck.copy()
        
        for player in active_players:
            cards_to_draw = min(cards_per_player, len(remaining_deck))
            if cards_to_draw > 0:
                drawn_cards = remaining_deck[:cards_to_draw]
                remaining_deck = remaining_deck[cards_to_draw:]
                player.hand.extend(drawn_cards)
        
        return remaining_deck
    
    @staticmethod
    def distribute_cards_to_player(room: RoomState, deck: List[CardComp], player_id: str, card_count: int) -> List[CardComp]:
        """
        Distribui cartas para um jogador específico
        
        Args:
            room: Estado da sala
            deck: Baralho atual
            player_id: ID do jogador
            card_count: Número de cartas
            
        Returns:
            Baralho restante após distribuição
        """
        player = next((p for p in room.players if p.id == player_id), None)
        if not player:
            return deck
        
        cards_to_draw = min(card_count, len(deck))
        if cards_to_draw > 0:
            drawn_cards = deck[:cards_to_draw]
            remaining_deck = deck[cards_to_draw:]
            player.hand.extend(drawn_cards)
            return remaining_deck
        
        return deck
    
    @staticmethod
    def find_card_in_hand(player: PlayerState, card_id: str) -> Optional[CardComp]:
        """Encontra uma carta na mão do jogador pelo ID"""
        return next((card for card in player.hand if card.id == card_id), None)
    
    @staticmethod
    def remove_card_from_hand(player: PlayerState, card_id: str) -> Optional[CardComp]:
        """
        Remove uma carta da mão do jogador
        
        Returns:
            A carta removida ou None se não encontrada
        """
        card = GameStateManager.find_card_in_hand(player, card_id)
        if card:
            player.hand.remove(card)
        return card
    
    @staticmethod
    def get_player_by_id(room: RoomState, player_id: str) -> Optional[PlayerState]:
        """Encontra um jogador pelo ID"""
        return next((p for p in room.players if p.id == player_id), None)

