import React, { useState } from 'react';
import { useGameStore } from '../store/game';
import { CheckCircle, AlertTriangle, ArrowRight, CircleDashed } from 'lucide-react';
// importe os ícones que quiser usar; estes são apenas exemplos

const Lobby: React.FC = () => {
  const { connected, createRoom, joinRoom, nickname, setNickname, roomId, setRoomId } = useGameStore();
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [maxPlayers, setMaxPlayers] = useState(4);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && connected) {
      createRoom(nickname.trim(), maxPlayers);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && roomId.trim() && connected) {
      joinRoom(roomId.trim().toUpperCase(), nickname.trim());
    }
  };

const ComoJogar: React.FC = () => (
  <div className="w-full me-32 md:w-1/3 p-6 rounded-xl">
    <h3 className="text-xl font-bold text-[#FFD700] mb-6">
      Como Jogar
    </h3>

    <ul className="space-y-3 text-sm text-[#FFD700]/80">
      <li className="flex items-start">
        <CheckCircle className="w-4 h-4 flex-shrink-0 text-[#FFD700]" />
        <span className="ml-3">O objetivo é não ser eliminado perdendo todos os tokens.</span>
      </li>
      <li className="flex items-start">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#FFD700]" />
        <span className="ml-3">Cada jogador começa com 3 tokens.</span>
      </li>
      <li className="flex items-start">
        <ArrowRight className="w-4 h-4 flex-shrink-0 text-[#FFD700]" />
        <span className="ml-3">Jogue cartas sem exceder o limite da rodada.</span>
      </li>
      <li className="flex items-start">
        <CircleDashed className="w-4 h-4 flex-shrink-0 text-[#FFD700]" />
        <span className="ml-3">Cartas especiais: <strong>+2</strong>, <strong>x2</strong>, <strong>=0</strong>, <strong>Reverse</strong>.</span>
      </li>
      <li className="flex items-start">
        <CheckCircle className="w-4 h-4 flex-shrink-0 text-[#FFD700]" />
        <span className="ml-3">Acerte o limite exato para comprar +2 cartas.</span>
      </li>
      <li className="flex items-start">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#FFD700]" />
        <span className="ml-3">Exceder o limite = perder 1 token.</span>
      </li>
      <li className="flex items-start">
        <CheckCircle className="w-4 h-4 flex-shrink-0 text-[#FFD700]" />
        <span className="ml-3">Último jogador com tokens vence!</span>
      </li>
    </ul>
  </div>
);

  return (
    <div className="flex justify-between items-start">
      <div className="flex-none text-xs w-1/3 p-4 ms-32 bg-[#FFD700] rounded-lg border-e border-b border-[#FFD700] backdrop-blur-md shadow-2xl">
        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('create')}
            className={`w-1/2 py-4 px-6 text-center rounded-lg font-medium transition ease-in-out hover:-translate-y-1 hover:scale-102 duration-300 ${
              activeTab === 'create'
                ? 'bg-black text-[#FFD700]'
                : 'text-black/30 hover:text-black hover:bg-black/10'
            }`}
          >
            Criar Sala
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`w-1/2 py-4 px-6 text-center rounded-lg font-medium transition ease-in-out hover:-translate-y-1 hover:scale-102 duration-300 ${
              activeTab === 'join'
                ? 'bg-black text-[#FFD700] '
                : 'text-black/30 hover:text-black hover:bg-black/10 '
            }`}
          >
            Entrar na Sala
          </button>
        </div>

        <div className="p-6">
          {/* Campo de nickname (comum para ambas as abas) */}
          <div className="mb-6">
            <label htmlFor="nickname" className="block text-sm font-medium text-black mb-2">
              Seu Nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Digite seu nickname"
              className="w-full rounded-full px-4 py-2 bg-black/40 font-medium text-black placeholder-black/50 focus:outline-none focus:ring-1 focus:ring-black/60 focus:border-transparent"
              maxLength={20}
              required
            />
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label htmlFor="maxPlayers" className="block text-sm font-medium text-black mb-2">
                  Máximo de Jogadores
                </label>
                <select
                  id="maxPlayers"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full rounded-full px-4 py-2 bg-black/40  text-black placeholder-yellow-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value={2} className="text-black ">2 jogadores</option>
                  <option value={3} className="text-black">3 jogadores</option>
                  <option value={4} className="text-black">4 jogadores</option>
                  <option value={5} className="text-black">5 jogadores</option>
                  <option value={6} className="text-black">6 jogadores</option>
                  <option value={7} className="text-black">7 jogadores</option>
                  <option value={8} className="text-black">8 jogadores</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!connected || !nickname.trim()}
                className="w-full text-lg rounded-lg my-4 py-6 px-6 bg-black text-[#FFD700] font-bold hover:from-yellow-900 hover:to-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-900 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {connected ? 'Criar Sala' : 'Conectando...'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-black mb-2">
                  Código da Sala
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC123"
                  className="w-full rounded-lg px-4 py-3 bg-black/70 border border-black/90 text-[#FFD700] placeholder-yellow-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent uppercase"
                  maxLength={10}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!connected || !nickname.trim() || !roomId.trim()}
                className="w-full rounded-lg py-6 px-6 bg-black text-[#FFD700] font-bold hover:from-yellow-900 hover:to-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-900 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {connected ? 'Entrar na Sala' : 'Conectando...'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Instruções do jogo */}
      <ComoJogar/>
    </div>
  );
};

export default Lobby;

