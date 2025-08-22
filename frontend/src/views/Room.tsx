import React, { useState } from 'react';
import { useGameStore, useIsMyTurn, useIsHost } from '../store/game';
import { Card } from '../types';

// Componente para renderizar uma carta
const CardComponent: React.FC<{
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
}> = ({ card, onClick, disabled = false, small = false }) => {
  const getCardColor = () => {
    switch (card.kind) {
      case 'number':
        return 'bg-blue-500';
      case 'joker':
        return 'bg-purple-500';
      case 'plus2':
        return 'bg-green-500';
      case 'times2':
        return 'bg-orange-500';
      case 'reset0':
        return 'bg-red-500';
      case 'reverse':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCardText = () => {
    switch (card.kind) {
      case 'number':
        return card.value?.toString() || '?';
      case 'joker':
        return card.value !== undefined ? card.value.toString() : 'J';
      case 'plus2':
        return '+2';
      case 'times2':
        return 'x2';
      case 'reset0':
        return '=0';
      case 'reverse':
        return '⟲';
      default:
        return '?';
    }
  };

  const sizeClasses = small
    ? 'w-8 h-12 text-xs'
    : 'w-16 h-24 text-lg';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${getCardColor()} ${sizeClasses} rounded-lg text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center`}
    >
      {getCardText()}
    </button>
  );
};

// Componente para mostrar um jogador
const PlayerComponent: React.FC<{
  player: any;
  isCurrentTurn: boolean;
  isSelf: boolean;
}> = ({ player, isCurrentTurn, isSelf }) => {
  return (
    <div className={`p-4 rounded-lg ${
      isCurrentTurn ? 'bg-yellow-400/20 border-2 border-yellow-400' : 'bg-white/10'
    } ${isSelf ? 'border-2 border-purple-400' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${
            player.is_eliminated ? 'text-red-400 line-through' : 'text-white'
          }`}>
            {player.nickname}
            {player.is_bot && ' 🤖'}
            {isSelf && ' (Você)'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-white/70">
            {player.hand_count} cartas
          </span>
          <div className="flex space-x-1">
            {Array.from({ length: player.tokens }).map((_, i) => (
              <div key={i} className="w-2 h-2 bg-green-400 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Room: React.FC = () => {
  const {
    room,
    selfHand,
    startGame,
    playCard,
    playSpecial,
    passTurn,
    addBot,
    setView,
    toggleChat,
    showChat
  } = useGameStore();

  const isMyTurn = useIsMyTurn();
  const isHost = useIsHost();

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [jokerValue, setJokerValue] = useState<number>(0);

  if (!room) {
    return (
      <div className="text-center text-white">
        <p>Carregando sala...</p>
      </div>
    );
  }

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) return;

    if (card.kind === 'joker') {
      setSelectedCard(card);
      // Mostra modal para escolher valor
    } else if (card.kind === 'number') {
      playCard(card.id);
    } else {
      // Carta especial
      const specialType = card.kind as 'plus2' | 'times2' | 'reset0' | 'reverse';
      playSpecial(card.id, specialType);
    }
  };

  const handleJokerPlay = () => {
    if (selectedCard && selectedCard.kind === 'joker') {
      playCard(selectedCard.id, jokerValue);
      setSelectedCard(null);
      setJokerValue(0);
    }
  };

  const canPlayCard = (card: Card): boolean => {
    if (!isMyTurn) return false;
    
    if (card.kind === 'number') {
      return room.accumulated_sum + (card.value || 0) <= room.round_limit;
    } else if (card.kind === 'joker') {
      // Joker pode ser jogado se algum valor 0-9 for válido
      for (let i = 0; i <= 9; i++) {
        if (room.accumulated_sum + i <= room.round_limit) {
          return true;
        }
      }
      return false;
    } else {
      // Cartas especiais sempre podem ser jogadas
      return true;
    }
  };

  const getSelfPlayer = () => {
    return room.players.find(p => !p.is_bot && p.hand_count === selfHand.length);
  };

  return (
    <div className="space-y-6">
      {/* Header da sala */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Sala {room.id}</h2>
            <p className="text-white/70">
              {room.players.length}/{room.max_players} jogadores
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={toggleChat}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Chat {showChat ? '🔽' : '🔼'}
            </button>
            <button
              onClick={() => setView('lobby')}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {!room.game_started ? (
          <div className="space-y-4">
            <div className="flex space-x-2">
              {isHost && (
                <button
                  onClick={startGame}
                  disabled={room.players.length < 2}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Iniciar Jogo
                </button>
              )}
              {isHost && room.players.length < room.max_players && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => addBot('easy')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    + Bot Fácil
                  </button>
                  <button
                    onClick={() => addBot('medium')}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    + Bot Médio
                  </button>
                  <button
                    onClick={() => addBot('hard')}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    + Bot Difícil
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{room.accumulated_sum}</div>
              <div className="text-sm text-white/70">Soma Atual</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{room.round_limit}</div>
              <div className="text-sm text-white/70">Limite</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{room.deck_count}</div>
              <div className="text-sm text-white/70">Cartas no Baralho</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-sm text-white">
                {room.direction ? '🔄 Horário' : '🔄 Anti-horário'}
              </div>
              <div className="text-sm text-white/70">Direção</div>
            </div>
          </div>
        )}

        {room.pending_effect && (
          <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <div className="text-yellow-200 text-sm">
              Efeito pendente: {room.pending_effect.multiplier ? `x${room.pending_effect.multiplier}` : ''}
              {room.pending_effect.add ? `+${room.pending_effect.add}` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Lista de jogadores */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Jogadores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {room.players.map((player) => (
            <PlayerComponent
              key={player.id}
              player={player}
              isCurrentTurn={player.id === room.current_turn}
              isSelf={player.id === getSelfPlayer()?.id}
            />
          ))}
        </div>
      </div>

      {/* Cartas do jogador */}
      {room.game_started && selfHand.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Suas Cartas</h3>
            {isMyTurn && (
              <div className="flex space-x-2">
                <span className="text-green-400 font-medium">Sua vez!</span>
                <button
                  onClick={passTurn}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  Passar Turno
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            {selfHand.map((card) => (
              <CardComponent
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card)}
                disabled={!canPlayCard(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal para joker */}
      {selectedCard && selectedCard.kind === 'joker' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Escolha o valor do Joker</h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {Array.from({ length: 10 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setJokerValue(i)}
                  className={`w-12 h-12 rounded-lg font-bold transition-colors ${
                    jokerValue === i
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleJokerPlay}
                disabled={room.accumulated_sum + jokerValue > room.round_limit}
                className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Jogar como {jokerValue}
              </button>
              <button
                onClick={() => setSelectedCard(null)}
                className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;

