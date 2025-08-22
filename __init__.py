"""
SOMO: Network Blackout - Game Engine

Este módulo contém toda a lógica do jogo SOMO, incluindo:
- Gerenciamento de baralho (deck.py)
- Estado do jogo e turnos (state.py) 
- Regras e validações (rules.py)
- Inteligência artificial dos bots (bots.py)
"""

from .deck import DeckManager
from .state import GameStateManager
from .rules import GameEngine
from .bots import BotManager, BotStrategy, GreedyBotStrategy, RandomBotStrategy, DefensiveBotStrategy

__all__ = [
    'DeckManager',
    'GameStateManager', 
    'GameEngine',
    'BotManager',
    'BotStrategy',
    'GreedyBotStrategy',
    'RandomBotStrategy',
    'DefensiveBotStrategy'
]

