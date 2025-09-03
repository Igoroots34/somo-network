import React, { useEffect, useState } from 'react';
import { useGameStore, useIsMyTurn, useIsHost, useSelfPlayer } from '../store/game';
import { CardComp } from '../types';
import jokerImg from '@/assets/cards/joker.png';
import plus2Img from '@/assets/cards/plus2.png';
import times2Img from '@/assets/cards/times2.png';
import reset0Img from '@/assets/cards/reset0.png';
import reverseImg from '@/assets/cards/reverse.png';
import defaultImg from '@/assets/cards/default.png';
import card0Image from '@/assets/cards/0.png';
import card1Image from '@/assets/cards/1.png';
import card2Image from '@/assets/cards/2.png';
import card3Image from '@/assets/cards/3.png';
import card4Image from '@/assets/cards/4.png';
import card5Image from '@/assets/cards/5.png';
import card6Image from '@/assets/cards/6.png';
import card7Image from '@/assets/cards/7.png';
import card8Image from '@/assets/cards/8.png';
import card9Image from '@/assets/cards/9.png';
import { RotateCcw, RotateCw, Cpu, MessageCircle, MessageCircleOff, X, Dice5 } from 'lucide-react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CopyButton } from '@/components/animate-ui/buttons/copy';
import { Star } from '@/components/animate-ui/icons/star';
import { Bot } from '@/components/animate-ui/icons/bot';
import { motion } from "framer-motion";

// ✅ use só UMA versão do dado
import D20BounceCard from '@/components/dice-roll-20'; // ajuste o path se salvou com outro nome

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
  9: card9Image,
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
  const sizeClasses = small ? 'w-16' : 'w-40';

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
      className={`p-2 ${isCurrentTurn ? "border border-[#FFD700]" : "bg-transparent"} ${isSelf ? "bg-" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span
            className={`flex items-center gap-2 truncate text-[12px] font-medium ${player.is_eliminated ? "text-red-400 line-through" : "text-[#FFD700]"
              }`}
          >
            {player.nickname}

            {player.is_bot && (
              <Bot className={`w-4 h-4 ${isCurrentTurn ? "animate-bounce text-cyan-400" : "text-gray-400"}`} />
            )}

            {isSelf && (
              <Star className={`w-4 h-4 ${isCurrentTurn ? "animate-pulse text-yellow-400" : "text-gray-400"}`} />
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

  const room = useGameStore(s => s.room);
  const playedCards = useGameStore(s => s.playedCards);

  const isMyTurn = useIsMyTurn();
  const isHost = useIsHost();
  const selfPlayer = useSelfPlayer();

  const [selectedCard, setSelectedCard] = useState<CardComp | null>(null);
  const [jokerValue, setJokerValue] = useState<number>(0);

  // ====== Dado (overlay) ======
  const [showDice, setShowDice] = useState(false);
  const [rollTrigger, setRollTrigger] = useState(0);

  const [showNumber, setShowNumber] = useState(false);

  useEffect(() => {
    setShowNumber(false);
  }, [rollTrigger]);

  // Abre/rola automaticamente quando o backend atualiza o round_limit
  useEffect(() => {
    if (room?.game_started && typeof room?.round_limit === 'number') {
      setShowDice(true);
      setRollTrigger((t) => t + 1); // dispara rolagem automática
    }
  }, [room?.round_limit, room?.game_started]);

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
    } else if (card.kind === 'number') {
      playCard(card.id);
    } else {
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
      for (let i = 0; i <= 9; i++) {
        if (room.accumulated_sum + i <= room.round_limit) return true;
      }
      return false;
    } else {
      return true;
    }
  };

  return (
    <div className="w-7xl space-y-4">
      {/* Header da sala */}
      <Card className='p-2'>
        <div className="flex justify-between items-center">
          <div className='flex gap-4'>
            <img
              className="w-20 object-contain"
              src="../src/assets/LOGO_SOMO.png"
              alt="Logo SOMO"
            />
            <div className='flex flex-col'>
              <div>
                Sala {room.id}
                <CopyButton variant={'ghost'} content={room.id} size="sm" />
              </div>
              <div className='text-xs'>
                {room.players.length}/{room.max_players} jogadores
              </div>
            </div>
          </div>

          <div className='flex gap-6'>
            {isHost && room.players.length < room.max_players && (
              <div className="flex items-center space-x-2 ">
                <Button
                  onClick={() => addBot('LOW')}
                  className="flex items-center justify-center px-4 py-2 bg-transparent border border-[#32CD32] text-[#32CD32] hover:bg-[#32CD32] hover:text-black transition-colors"
                >
                  LOW <Bot size={18} />
                </Button>
                <Button
                  onClick={() => addBot('MID')}
                  className=" flex items-center justify-center px-4 py-2 bg-transparent border border-[#FFA500] text-[#FFA500] hover:bg-[#FFA500] hover:text-black transition-colors"
                >
                  MID <Bot size={18} />
                </Button>
                <Button
                  onClick={() => addBot('HIGH')}
                  className="flex items-center justify-center px-4 py-2 bg-transparent border border-[#FF4500] text-[#FF4500] hover:bg-[#FF4500] hover:text-black transition-colors"
                >
                  HIGH <Bot size={18} />
                </Button>
              </div>
            )}

            {isHost && (
              <Button
                onClick={() => {
                  startGame(); // backend reseta rodada e define round_limit
                  // overlay abrirá sozinho quando round_limit mudar (useEffect)
                }}
                disabled={room.players.length < 2}
                className="w-32 bg-[#FFD700] hover:bg-[#FFD700]/80"
              >
                INICIAR <Dice5 size={18} />
              </Button>
            )}

            <div className='space-x-2'>
              <Button variant="secondary" onClick={toggleChat}>
                {showChat ? <MessageCircleOff size={18} /> : <MessageCircle size={18} />}
              </Button>
              <Button variant="destructive" onClick={() => setView('lobby')}>
                <X size={18} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de jogadores */}
      <div className='flex gap-4'>

        <div className='w-3/4 space-y-4'>
          <Card className="py-2 flex justify-center h-30">
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {room.players.map((player) => (
                <PlayerComponent
                  key={player.id}
                  player={player}
                  isCurrentTurn={player.id === room.current_turn}
                  isSelf={player.id === selfPlayer?.id}
                />
              ))}
            </CardContent>
          </Card>
          <Card className="p-2 flex justify-center h-30 w-full">
            <CardContent className="flex h-fit gap-2">
              <Card className="flex flex-row-reverse justify-between p-3 bg-[#FFD700] h-24 w-1/4">
                <Label className="justify-center text-4xl text-black font-bold">{room.accumulated_sum}</Label>
                <Label className="justify-center text-sm text-black/70">Soma Atual</Label>
              </Card>
              <Card className="flex flex-row-reverse justify-between p-3 bg-black h-24 w-1/4">
                <Label className="justify-center text-4xl font-bold">{room.deck_count}</Label>
                <Label className="justify-center text-sm text-withe/70">Cartas no Baralho</Label>
              </Card>
              <Card className="bg-black h-24 flex flex-row-reverse p-3 justify-center items-center w-1/4">
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
              <Card className='flex flex-row-reverse justify-center p-3 bg-black border border-[#FFD700] h-24 w-1/4'>
                {room.pending_effect && (
                  <div className="flex justify-between text-sm text-withe/70">
                    <div className="flex justify-center text-4xl font-bold items-center text-[#FFD700]">
                      {room.pending_effect.multiplier ? `x${room.pending_effect.multiplier}` : ''}
                      {room.pending_effect.add ? `+${room.pending_effect.add}` : ''}
                    </div>
                  </div>
                )}
                <Label className="justify-center text-sm text-white/70">Efeito</Label>
              </Card>
            </CardContent>


          </Card>
        </div>

        {/* Painel lateral com o limite da rodada (sem renderizar o dado aqui) */}
        <Card className='relative w-1/4 p-3 flex flex-col gap-2'>
          <div className="relative z-auto inset-0 z-[60] flex items-center h-[100%] justify-center backdrop-blur-sm">
            <D20BounceCard
              targetValue={room.round_limit}
              externalTrigger={rollTrigger}
              interactive={false}
              onRevealed={() => {
                setShowNumber(true);
                setTimeout(() => setShowDice(false), 1200);
              }}
            />

            {showNumber && (
              <div
                className="stack absolute font-bold flex w-full text-[#FFD700]"
                style={{ "--stacks": 3 } as React.CSSProperties}
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} style={{ "--index": i } as React.CSSProperties}>
                    {room.round_limit}
                  </span>

                ))}
              </div>
            )}
          </div>

        </Card>
      </div >

      {/* Painel de status */}


      {/* Cartas do jogador */}
      {
        room.game_started && selfHand.length > 0 && (
          <Card className="flex flex-row p-2 h-130">
            <div className="flex flex-col items-start w-1/2">
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

              <Card className="grid grid-cols-4 md:grid-cols-7 p-3 mt-4 w-fit h-fit items-start">
                {selfHand.map((card) => (
                  <CardComponent
                    key={card.id}
                    card={card} small
                    onClick={() => handleCardClick(card)}
                    disabled={!canPlayCard(card)}
                    
                  />
                ))}
              </Card>
            </div>
            <Card className='h-full w-1/2 p-3'>
      <CardTitle className="text-lg font-semibold ">Mesa</CardTitle>

      <div className="relative w-full h-full flex items-center justify-center">
        {playedCards.length === 0 ? (
          <div className="text-gray-400 text-sm">
            Nenhuma carta jogada ainda...
          </div>
        ) : (
          playedCards.map((card, index) => (
            <div
              key={card.id}
              className="absolute"
              style={{
                transform: `translate(${index * 3}px, ${index * 3}px) rotate(${(index % 5) - 2}deg)`,
                zIndex: index,
              }}
            >
              <CardComponent card={card} />
            </div>
          ))
        )}
      </div>
    </Card>

          </Card>
        )
      }

      {/* Modal para joker */}
      {
        selectedCard && selectedCard.kind === 'joker' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Escolha o valor do Joker</h3>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setJokerValue(i)}
                    className={`w-12 h-12 rounded-lg font-bold transition-colors ${jokerValue === i ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
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
        )
      }

      {/* 🎲 Overlay do D20 (automático) */}

    </div >
  );
};

export default Room;
