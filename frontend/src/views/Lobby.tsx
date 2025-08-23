import React, { useState } from 'react';
import { useGameStore } from '../store/game';

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

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[#FFD700] border border-2 border-[#292929] backdrop-blur-md shadow-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-black text-[#FFD700]'
                : 'text-black/30 hover:text-black hover:bg-black/10'
            }`}
          >
            Criar Sala
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'join'
                ? 'bg-black text-[#FFD700]'
                : 'text-black/30 hover:text-black hover:bg-black/10'
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
              className="w-full px-4 py-3 bg-black/70 border border-black/90 text-[#FFD700] placeholder-yellow-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
                  className="w-full px-4 py-3 bg-black/70 border border-black/90 text-[#FFD700] placeholder-yellow-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
                className="w-full my-4 py-6 px-6 bg-black text-[#FFD700] font-bold hover:from-yellow-900 hover:to-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-900 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                  className="w-full px-4 py-3 bg-black/70 border border-black/90 text-[#FFD700] placeholder-yellow-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent uppercase"
                  maxLength={10}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!connected || !nickname.trim() || !roomId.trim()}
                className="w-full py-6 px-6 bg-black text-[#FFD700] font-bold hover:from-yellow-900 hover:to-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-900 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {connected ? 'Entrar na Sala' : 'Conectando...'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Instruções do jogo */}
      <div className="mt-8 bg-transparent border border-1 border-[#FFD700] p-6">
        <h3 className="text-lg font-semibold text-[#FFD700] mb-4">Como Jogar</h3>
        <div className="space-y-2 text-sm text-[#FFD700]/60">
          <p>• O objetivo é não ser eliminado perdendo todos os tokens</p>
          <p>• Cada jogador começa com 3 tokens</p>
          <p>• Jogue cartas sem exceder o limite da rodada</p>
          <p>• Cartas especiais: +2, x2, =0, Reverse</p>
          <p>• Acerte o limite exato para comprar +2 cartas</p>
          <p>• Exceder o limite = perder 1 token</p>
          <p>• Último jogador com tokens vence!</p>
        </div>
      </div>
    </div>
  );
};

export default Lobby;

