import pytest
import sys
import os

# Adiciona o diretório pai ao path para importar os módulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.models import RoomState, PlayerState, CardComp, CardKind, PendingEffect
from app.engine.deck import DeckManager
from app.engine.state import GameStateManager
from app.engine.rules import GameEngine
from app.engine.bots import BotManager

class TestDeckManager:
    """Testes para o gerenciador de baralho"""
    
    def test_create_deck(self):
        """Testa a criação do baralho com as quantidades corretas"""
        deck = DeckManager.create_deck()
        
        # Verifica total de cartas (90)
        assert len(deck) == 90
        
        # Verifica se o baralho é válido
        assert DeckManager.validate_deck(deck)
        
        # Verifica estatísticas
        stats = DeckManager.get_deck_stats(deck)
        
        # 60 cartas numéricas (6 de cada 0-9)
        assert sum(stats["numbers"].values()) == 60
        for value in range(10):
            assert stats["numbers"][value] == 6
        
        # Cartas especiais
        assert stats["specials"]["reverse"] == 6
        assert stats["specials"]["times2"] == 6
        assert stats["specials"]["plus2"] == 7
        assert stats["specials"]["reset0"] == 7
        assert stats["specials"]["joker"] == 4
    
    def test_shuffle_deck(self):
        """Testa o embaralhamento do baralho"""
        deck1 = DeckManager.create_deck()
        deck2 = DeckManager.shuffle_deck(deck1)
        
        # Mesmo número de cartas
        assert len(deck1) == len(deck2)
        
        # Cartas diferentes (muito provável com 90 cartas)
        # Verifica se pelo menos algumas posições mudaram
        different_positions = sum(1 for i in range(len(deck1)) if deck1[i].id != deck2[i].id)
        assert different_positions > 10  # Pelo menos 10 posições diferentes
    
    def test_draw_cards(self):
        """Testa a retirada de cartas do baralho"""
        deck = DeckManager.create_deck()
        original_size = len(deck)
        
        # Retira 7 cartas
        drawn, remaining = DeckManager.draw_cards(deck, 7)
        
        assert len(drawn) == 7
        assert len(remaining) == original_size - 7
        
        # Testa retirada de mais cartas do que disponível
        drawn_all, remaining_empty = DeckManager.draw_cards(remaining, 100)
        assert len(drawn_all) == len(remaining)
        assert len(remaining_empty) == 0

class TestGameStateManager:
    """Testes para o gerenciador de estado do jogo"""
    
    def create_test_room(self) -> RoomState:
        """Cria uma sala de teste com 3 jogadores"""
        players = [
            PlayerState(id="player1", nickname="Alice", tokens=3),
            PlayerState(id="player2", nickname="Bob", tokens=3),
            PlayerState(id="player3", nickname="Charlie", tokens=3)
        ]
        
        return RoomState(
            id="test_room",
            players=players,
            max_players=8,
            host_id="player1"
        )
    
    def test_initialize_turn_order(self):
        """Testa a inicialização da ordem dos turnos"""
        room = self.create_test_room()
        GameStateManager.initialize_turn_order(room)
        
        # Verifica se todos os jogadores estão na ordem
        assert len(room.turn_order) == 3
        assert set(room.turn_order) == {"player1", "player2", "player3"}
        
        # Verifica se há um jogador atual
        assert room.current_turn in room.turn_order
        
        # Direção inicial é horária
        assert room.direction is True
    
    def test_advance_turn(self):
        """Testa o avanço de turnos"""
        room = self.create_test_room()
        GameStateManager.initialize_turn_order(room)
        
        current_player = room.current_turn
        next_player = GameStateManager.advance_turn(room)
        
        # Verifica se mudou de jogador
        assert next_player != current_player
        assert room.current_turn == next_player
        
        # Verifica se o próximo jogador está na ordem
        assert next_player in room.turn_order
    
    def test_reverse_direction(self):
        """Testa a inversão de direção"""
        room = self.create_test_room()
        GameStateManager.initialize_turn_order(room)
        
        original_direction = room.direction
        GameStateManager.reverse_direction(room)
        
        # Direção deve ter invertido
        assert room.direction != original_direction
    
    def test_reverse_with_pending_effect(self):
        """Testa Reverse com efeito pendente (deve devolver o efeito)"""
        room = self.create_test_room()
        GameStateManager.initialize_turn_order(room)
        
        # Define um efeito pendente
        room.pending_effect = PendingEffect(
            add=2,
            source_player_id="player2"
        )
        
        GameStateManager.reverse_direction(room)
        
        # O jogador atual deve ser quem criou o efeito
        assert room.current_turn == "player2"
    
    def test_apply_penalty(self):
        """Testa a aplicação de punição"""
        room = self.create_test_room()
        player = room.players[0]
        original_tokens = player.tokens
        
        eliminated = GameStateManager.apply_penalty(room, player.id)
        
        # Deve ter perdido 1 token
        assert player.tokens == original_tokens - 1
        assert not eliminated  # Não eliminado ainda
        
        # Testa eliminação
        player.tokens = 1
        eliminated = GameStateManager.apply_penalty(room, player.id)
        
        assert player.tokens == 0
        assert eliminated
        assert player.is_eliminated

class TestGameEngine:
    """Testes para o engine principal do jogo"""
    
    def create_test_room_with_game(self) -> RoomState:
        """Cria uma sala de teste com jogo iniciado"""
        players = [
            PlayerState(id="player1", nickname="Alice", tokens=3),
            PlayerState(id="player2", nickname="Bob", tokens=3)
        ]
        
        room = RoomState(
            id="test_room",
            players=players,
            max_players=8,
            host_id="player1"
        )
        
        engine = GameEngine()
        engine.start_game(room)
        
        return room
    
    def test_start_game(self):
        """Testa o início do jogo"""
        room = self.create_test_room_with_game()
        
        # Verifica se o jogo foi iniciado
        assert room.game_started
        
        # Verifica se o baralho foi criado
        assert len(room.deck) > 0
        
        # Verifica se os jogadores receberam cartas
        for player in room.players:
            assert len(player.hand) == 7
        
        # Verifica se há ordem de turnos
        assert len(room.turn_order) == 2
        assert room.current_turn is not None
        
        # Verifica se a rodada foi iniciada
        assert room.round_limit > 0
        assert room.accumulated_sum == 0
    
    def test_can_play_number(self):
        """Testa a validação de cartas numéricas"""
        engine = GameEngine()
        
        # Pode jogar se não exceder o limite
        assert engine.can_play_number(5, 10, 20)  # 10 + 5 = 15 <= 20
        
        # Não pode jogar se exceder o limite
        assert not engine.can_play_number(15, 10, 20)  # 10 + 15 = 25 > 20
        
        # Pode jogar exatamente no limite
        assert engine.can_play_number(10, 10, 20)  # 10 + 10 = 20 <= 20
    
    def test_apply_pending_effect(self):
        """Testa a aplicação de efeitos pendentes"""
        engine = GameEngine()
        
        # Sem efeito pendente
        assert engine.apply_pending_effect(5, None) == 5
        
        # Efeito +2
        effect_plus2 = PendingEffect(add=2, source_player_id="player1")
        assert engine.apply_pending_effect(5, effect_plus2) == 7
        
        # Efeito x2
        effect_times2 = PendingEffect(multiplier=2, source_player_id="player1")
        assert engine.apply_pending_effect(5, effect_times2) == 10
        
        # Efeito combinado (multiplicador primeiro, depois aditivo)
        effect_combined = PendingEffect(multiplier=2, add=3, source_player_id="player1")
        assert engine.apply_pending_effect(5, effect_combined) == 13  # (5 * 2) + 3
    
    def test_exact_hit(self):
        """Testa o acerto exato (soma = limite)"""
        room = self.create_test_room_with_game()
        engine = GameEngine()
        
        # Configura cenário de acerto exato
        room.accumulated_sum = 15
        room.round_limit = 20
        
        # Adiciona uma carta de valor 5 na mão do jogador atual
        current_player = next(p for p in room.players if p.id == room.current_turn)
        test_card = CardComp(kind=CardKind.NUMBER, value=5)
        current_player.hand.append(test_card)
        
        # Joga a carta
        result = engine.play_card(room, room.current_turn, test_card.id)
        
        # Verifica se foi bem-sucedido
        assert result["success"]
        
        # Verifica eventos gerados
        events = result["events"]
        event_types = [e["event"] for e in events]
        
        assert "card_played" in event_types
        assert "draw_cards" in event_types  # Jogador compra +2
        assert "round_reset" in event_types  # Rodada reinicia
        assert "round_started" in event_types  # Nova rodada
    
    def test_penalty_scenario(self):
        """Testa cenário de punição por impossibilidade"""
        room = self.create_test_room_with_game()
        engine = GameEngine()
        
        current_player_id = room.current_turn
        current_player = next(p for p in room.players if p.id == current_player_id)
        original_tokens = current_player.tokens
        
        # Força punição
        result = engine.force_penalty(room, current_player_id)
        
        # Verifica se foi bem-sucedido
        assert result["success"]
        
        # Verifica se o jogador perdeu token
        assert current_player.tokens == original_tokens - 1
        
        # Verifica eventos
        events = result["events"]
        event_types = [e["event"] for e in events]
        
        assert "penalty" in event_types
        assert "draw_cards" in event_types  # Todos compram +2
        assert "round_reset" in event_types
        assert "round_started" in event_types

class TestBotManager:
    """Testes para o gerenciador de bots"""
    
    def test_add_bot_to_room(self):
        """Testa a adição de bots à sala"""
        players = [PlayerState(id="player1", nickname="Alice", tokens=3)]
        room = RoomState(
            id="test_room",
            players=players,
            max_players=8,
            host_id="player1"
        )
        
        bot_manager = BotManager()
        
        # Adiciona bot fácil
        bot = bot_manager.add_bot_to_room(room, "easy")
        
        assert bot is not None
        assert bot.is_bot
        assert "LOW" in bot.nickname
        assert len(room.players) == 2
        
        # Adiciona bot médio
        bot2 = bot_manager.add_bot_to_room(room, "medium")
        
        assert bot2 is not None
        assert "MID" in bot2.nickname
        assert len(room.players) == 3
    
    def test_bot_cannot_join_full_room(self):
        """Testa que bot não pode entrar em sala cheia"""
        players = [PlayerState(id=f"player{i}", nickname=f"Player{i}", tokens=3) 
                  for i in range(8)]  # Sala cheia
        
        room = RoomState(
            id="test_room",
            players=players,
            max_players=8,
            host_id="player1"
        )
        
        bot_manager = BotManager()
        bot = bot_manager.add_bot_to_room(room, "easy")
        
        # Não deve conseguir adicionar
        assert bot is None
        assert len(room.players) == 8
    
    def test_bot_cannot_join_started_game(self):
        """Testa que bot não pode entrar em jogo já iniciado"""
        players = [PlayerState(id="player1", nickname="Alice", tokens=3)]
        room = RoomState(
            id="test_room",
            players=players,
            max_players=8,
            host_id="player1",
            game_started=True  # Jogo já iniciado
        )
        
        bot_manager = BotManager()
        bot = bot_manager.add_bot_to_room(room, "easy")
        
        # Não deve conseguir adicionar
        assert bot is None
        assert len(room.players) == 1

if __name__ == "__main__":
    # Executa os testes
    pytest.main([__file__, "-v"])

