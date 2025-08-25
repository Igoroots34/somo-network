import random
from typing import List
from ..models import CardComp, CardKind

class DeckManager:
    """Gerencia a criação, embaralhamento e distribuição de cartas"""
    
    @staticmethod
    def create_deck() -> List[CardComp]:
        """
        Cria um baralho completo seguindo as especificações do jogo:
        - 60 cartas numéricas: 6 cópias de cada 0-9
        - 6 Reverse
        - 6 x2 (Multiplica por 2)
        - 7 +2 (Soma +2)
        - 7 =0 (Zera)
        - 4 Joker (Coringa)
        """
        deck = []
        
        # 60 cartas numéricas: 6 cópias de cada 0-9
        for value in range(10):  # 0 a 9
            for _ in range(6):  # 6 cópias de cada
                deck.append(CardComp(
                    kind=CardKind.NUMBER,
                    value=value
                ))
        
        # 6 Reverse
        for _ in range(6):
            deck.append(CardComp(kind=CardKind.REVERSE))
        
        # 6 x2 (Multiplica por 2)
        for _ in range(6):
            deck.append(CardComp(kind=CardKind.TIMES2))
        
        # 7 +2 (Soma +2)
        for _ in range(7):
            deck.append(CardComp(kind=CardKind.PLUS2))
        
        # 7 =0 (Zera)
        for _ in range(7):
            deck.append(CardComp(kind=CardKind.RESET0))
        
        # 4 Joker (Coringa)
        for _ in range(4):
            deck.append(CardComp(kind=CardKind.JOKER))
        
        return deck
    
    @staticmethod
    def shuffle_deck(deck: List[CardComp]) -> List[CardComp]:
        """Embaralha o baralho"""
        shuffled = deck.copy()
        random.shuffle(shuffled)
        return shuffled
    
    @staticmethod
    def draw_cards(deck: List[CardComp], count: int) -> tuple[List[CardComp], List[CardComp]]:
        """
        Retira cartas do topo do baralho
        
        Args:
            deck: Baralho atual
            count: Número de cartas para retirar
            
        Returns:
            Tupla com (cartas_retiradas, baralho_restante)
        """
        if count > len(deck):
            # Se não há cartas suficientes, retorna todas as disponíveis
            return deck.copy(), []
        
        drawn_cards = deck[:count]
        remaining_deck = deck[count:]
        
        return drawn_cards, remaining_deck
    
    @staticmethod
    def get_deck_stats(deck: List[CardComp]) -> dict:
        """
        Retorna estatísticas do baralho para debug/validação
        
        Returns:
            Dicionário com contagem de cada tipo de carta
        """
        stats = {
            "total": len(deck),
            "numbers": {},
            "specials": {}
        }
        
        for card in deck:
            if card.kind == CardKind.NUMBER:
                value = card.value
                if value not in stats["numbers"]:
                    stats["numbers"][value] = 0
                stats["numbers"][value] += 1
            else:
                kind_name = card.kind.value
                if kind_name not in stats["specials"]:
                    stats["specials"][kind_name] = 0
                stats["specials"][kind_name] += 1
        
        return stats
    
    @staticmethod
    def validate_deck(deck: List[CardComp]) -> bool:
        """
        Valida se o baralho tem a composição correta
        
        Returns:
            True se o baralho está correto, False caso contrário
        """
        stats = DeckManager.get_deck_stats(deck)
        
        # Verifica total de cartas (90 cartas no total)
        if stats["total"] != 90:
            return False
        
        # Verifica cartas numéricas (6 de cada 0-9 = 60 cartas)
        for value in range(10):
            if stats["numbers"].get(value, 0) != 6:
                return False
        
        # Verifica cartas especiais
        expected_specials = {
            "reverse": 6,
            "times2": 6,
            "plus2": 7,
            "reset0": 7,
            "joker": 4
        }
        
        for special_type, expected_count in expected_specials.items():
            if stats["specials"].get(special_type, 0) != expected_count:
                return False
        
        return True
    
    @staticmethod
    def create_and_shuffle_deck() -> List[CardComp]:
        """
        Método de conveniência que cria e embaralha um baralho completo
        
        Returns:
            Baralho completo embaralhado
        """
        deck = DeckManager.create_deck()
        return DeckManager.shuffle_deck(deck)
    
    @staticmethod
    def reshuffle_with_discard(deck: List[CardComp], discard_pile: List[CardComp], keep_top: bool = True) -> List[CardComp]:
        """
        Reembaralha o baralho com as cartas do descarte
        
        Args:
            deck: Baralho atual (pode estar vazio)
            discard_pile: Pilha de descarte
            keep_top: Se True, mantém a carta do topo do descarte fora do reembaralhamento
            
        Returns:
            Novo baralho embaralhado
        """
        cards_to_shuffle = deck.copy()
        
        if keep_top and discard_pile:
            # Adiciona todas as cartas do descarte exceto a do topo
            cards_to_shuffle.extend(discard_pile[:-1])
        else:
            # Adiciona todas as cartas do descarte
            cards_to_shuffle.extend(discard_pile)
        
        return DeckManager.shuffle_deck(cards_to_shuffle)

