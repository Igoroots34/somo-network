import React, { useState } from 'react';
import { useGameStore, useIsMyTurn, useIsHost, useSelfPlayer } from '../store/game';
import { CardComp } from '../types';
import jokerImg from '../assets/cards/joker.png';
import plus2Img from '../assets/cards/plus2.png';
import times2Img from '../assets/cards/times2.png';
import reset0Img from '../assets/cards/reset0.png';
import reverseImg from '../assets/cards/reverse.png';
import defaultImg from '../assets/cards/default.png';
import card0Image from '../assets/cards/0.png';
import card1Image from '../assets/cards/1.png';
import card2Image from '../assets/cards/2.png';
import card3Image from '../assets/cards/3.png';
import card4Image from '../assets/cards/4.png';
import card5Image from '../assets/cards/5.png';
import card6Image from '../assets/cards/6.png';
import card7Image from '../assets/cards/7.png';
import card8Image from '../assets/cards/8.png';
import card9Image from '../assets/cards/9.png';
import { CircleArrowUp, CircleArrowDown, CircleX, RotateCcw, RotateCw, Cpu } from 'lucide-react';
import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card"
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CopyButton } from '@/components/animate-ui/buttons/copy';
import { Star } from '@/components/animate-ui/icons/star';
import { Bot } from '@/components/animate-ui/icons/bot';

const numberImages: Record<number, string> = {
  0: card0Image,
  1: card1Image,
  2: card2Image,
  3: card3Image,
  4: card4Image,
  5: card5Image,
  6: card6Image,
  7: card7Image,
  8: card8Image,
  9: card9Image
  // … continue para todos os números válidos
};

// Componente para renderizar uma carta
function getCardImage(card: CardComp): string {
  switch (card.kind) {
    case 'number':
      return numberImages[card.value ?? 0];
    case 'joker':
      return jokerImg;
    case 'plus2':
      return plus2Img;
    case 'times2':
      return times2Img;
    case 'reset0':
      return reset0Img;
    case 'reverse':
      return reverseImg;
    default:
      return defaultImg;
  }
}

const CardComponent: React.FC<{
  card: CardComp;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
}> = ({ card, onClick, disabled = false, small = false }) => {
  const imgSrc = getCardImage(card);
  const sizeClasses = small ? 'w-8' : 'w-32';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg shadow-lg hover:shadow-xl transition-all ${sizeClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <img
        src={imgSrc}
        alt={`${card.kind} ${card.value ?? ''}`}
        className="w-full h-full object-contain"
      />
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
    <Card
  className={`p-2 ${
    isCurrentTurn ? "border border-[#FFD700]" : "bg-transparent"
  } ${isSelf ? "bg-" : ""}`}
>
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <span
        className={`flex items-center gap-2 text-[12px] font-medium ${
          player.is_eliminated
            ? "text-red-400 line-through"
            : "text-[#FFD700]"
        }`}
      >
        {player.nickname}

        {/* Ícone do Bot */}
        {player.is_bot && (
          <Bot
            className={`w-4 h-4 ${
              isCurrentTurn ? "animate-bounce text-cyan-400" : "text-gray-400"
            }`}
          />
        )}

        {/* Estrela se for o próprio player */}
        {isSelf && (
          <Star
            className={`w-4 h-4 ${
              isCurrentTurn ? "animate-pulse text-yellow-400" : "text-gray-400"
            }`}
          />
        )}
      </span>
    </div>

    <div className="flex items-center space-x-2">
      <span className="text-[14px] font-bold text-white/70">
        <div className='bg-[#FFD700] px-1 rounded-[2px]'>
          <div className='text-black'>
            {player.hand_count}
          </div>
        </div>
      </span>
      <div className="flex space-x-1">
        {Array.from({ length: player.tokens }).map((_, i) => (
          <Cpu key={i} className="w-4 text-green-400" />
        ))}
      </div>
    </div>
  </div>
</Card>

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
  const selfPlayer = useSelfPlayer();

  const [selectedCard, setSelectedCard] = useState<CardComp | null>(null);
  const [jokerValue, setJokerValue] = useState<number>(0);

  if (!room) {
    return (
      <div className="text-center text-white">
        <p>Carregando sala...</p>
      </div>
    );
  }

  const handleCardClick = (card: CardComp) => {
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

  const canPlayCard = (card: CardComp): boolean => {
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

  return (
    <div className="w-7xl space-y-4">
      {/* Header da sala */}
      
      <Card className='p-6'>
        <div className="flex justify-between items-center">
          <img
            className="w-20 h-20 object-contain"
            src="../src/assets/LOGO_SOMO.png"
            alt="Logo SOMO"
          />
          <div className='flex flex-col'>
           <div>
           Sala {room.id}
            <CopyButton variant={'ghost'} content={room.id} size="sm"></CopyButton>
           </div>

            {room.players.length}/{room.max_players} jogadores
          </div>
          <div className='space-x-2'>
          <Button variant="secondary"
            onClick={toggleChat}
            className=""
          >
            Chat {showChat ? <CircleArrowDown size={18} /> : <CircleArrowUp size={18} />}
          </Button>
          <Button variant="destructive"
            onClick={() => setView('lobby')}
            className=""
          >
            Sair <CircleX size={18} />
          </Button>
          </div>
          {isHost && room.players.length < room.max_players && (
            <div className="flex items-center space-x-2 ">
              <Button
                onClick={() => addBot('LOW')}
                className="flex items-center justify-center px-4 py-2 bg-transparent border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black transition-colors"
              >
                LOW <Bot size={18} />
              </Button>
              <Button
                onClick={() => addBot('MID')}
                className=" flex items-center justify-center px-4 py-2 bg-transparent border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors"
              >
                MID <Bot size={18} />
              </Button>
              <Button
                onClick={() => addBot('HIGH')}
                className="flex items-center justify-center px-4 py-2 bg-transparent border border-red-400 text-red-400 hover:bg-red-400 hover:text-black transition-colors"
              >
                HIGH <Bot size={18} />
              </Button>
            </div>
          )}
          {isHost && (
            <Button
              onClick={startGame}
              disabled={room.players.length < 2}
              className="w-12 bg-[#FFD700] hover:bg-[#FFD700]/80"
            >
              Play
            </Button>
          )}
        </div>
      </Card>
      {/* Lista de jogadores */}

      <div className='flex gap-4'>
      <Card className="py-2 w-2/3 ">
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {room.players.map((player) => (
              <PlayerComponent
                key={player.id}
                player={player}
                isCurrentTurn={player.id === room.current_turn}
                isSelf={player.id === selfPlayer?.id}  // compara com selfPlayer
              />
            ))}
          </CardContent>
        </Card>
        <Card className='w-1/3'>

        </Card>
      </div>
      
      <div className=''>
        <Card className="p-6">
          <CardContent className="grid grid-cols-4 md:grid-cols-4 gap-4">
            <Card className=" bg-white/20 rounded-lg p-3">
              <Label className="justify-center text-4xl font-bold">{room.accumulated_sum}</Label>
              <Label className="justify-center text-sm text-white/70">Soma Atual</Label>
            </Card>
            <Card className="bg-white/20 rounded-lg p-3">
              <Label className="justify-center text-4xl font-bold">{room.round_limit}</Label>
              <Label className="justify-center text-sm text-white/70">Limite</Label>
            </Card>
            <Card className="bg-white/20 rounded-lg p-3">
              <Label className="justify-center text-4xl font-bold">{room.deck_count}</Label>
              <Label className="justify-center text-sm text-white/70">Cartas no Baralho</Label>
            </Card>
            <Card className="bg-white/20 rounded-lg p-3 flex justify-center items-center">
              <Label className="flex justify-center items-center gap-2 text-lg">
                {room.direction ? (
                  <>
                    <RotateCw className="w-5 h-5" />
                    Horário
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    Anti-horário
                  </>
                )}
              </Label>
            </Card>

          </CardContent>

          {room.pending_effect && (
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <div className="text-yellow-200 text-sm">
                Efeito pendente: {room.pending_effect.multiplier ? `x${room.pending_effect.multiplier}` : ''}
                {room.pending_effect.add ? `+${room.pending_effect.add}` : ''}
              </div>
            </div>
          )}
        </Card>

        
        
      </div>

      {/* Cartas do jogador */}
      {room.game_started && selfHand.length > 0 && (
        <Card className=" p-6">
          <CardContent className="flex justify-between items-center mb-4">
            <CardTitle className="text-lg font-semibold">Suas Cartas</CardTitle>
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
          </CardContent>

          <CardContent className="grid grid-cols-4 gap-3 justify-center">
            {selfHand.map((card) => (
              <CardComponent
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card)}
                disabled={!canPlayCard(card)}
              />
            ))}
          </CardContent>
        </Card>
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
                  className={`w-12 h-12 rounded-lg font-bold transition-colors ${jokerValue === i
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

