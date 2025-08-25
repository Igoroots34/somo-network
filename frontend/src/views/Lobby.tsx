import React, { useState } from 'react';
import { useGameStore } from '../store/game';
import { CheckCircle, AlertTriangle, ArrowRight, CircleDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label';
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
  <div className="  p-6 ">
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
    <div className="flex justify-between items-center w-full h-full">
      <div className="flex-none text-xs min-w-lg p-4 backdrop-blur-md shadow-2xl">
        {/* Tabs */}
        <div className="flex space-x-2 justify-center">
          <Button variant="link" 
          onClick={() => setActiveTab('create')}
          className={`w-1/2 py-4 px-6 text-center text-[#FFD700] rounded-lg font-medium ${
            activeTab === 'join'
              ? 'text-white/50'
              : 'underline underline-offset-8'
            }`}
          >
            Criar Sala</Button>
            
          <Button variant="link"
            onClick={() => setActiveTab('join')}
            className={`w-1/2 py-4 px-6 text-center text-[#FFD700] rounded-lg font-medium ${
              activeTab === 'join'
                ? 'underline underline-offset-8'
                : 'text-white/50'
            }`}
          >
            Entrar na Sala
          </Button>
        </div>

        <div className="p-6">
          {/* Campo de nickname (comum para ambas as abas) */}
          <div className="mb-6">
            <Label htmlFor="nickname" className="block text-sm font-medium mb-2">
              Seu Nickname
            </Label>
            <Input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Digite seu nickname"
              className="w-full px-4 py-2 font-medium"
              maxLength={20}
              required
            />
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <Label htmlFor="maxPlayers" className="block text-sm font-medium mb-2">
                  Máximo de Jogadores
                </Label>
                <Select
                  value={maxPlayers?.toString()}
                  onValueChange={(value) => setMaxPlayers(Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Máximo de Jogadores" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Máximo</SelectLabel>
                      <SelectItem value="2">2 Jogadores</SelectItem>
                      <SelectItem value="3">3 Jogadores</SelectItem>
                      <SelectItem value="4">4 Jogadores</SelectItem>
                      <SelectItem value="5">5 Jogadores</SelectItem>
                      <SelectItem value="6">6 Jogadores</SelectItem>
                      <SelectItem value="7">7 Jogadores</SelectItem>
                      <SelectItem value="8">8 Jogadores</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

              </div>

              <Button
                type="submit"
                disabled={!connected || !nickname.trim()}
                className="w-full text-lg rounded-lg my-4 py-6 px-6 bg-[#FFD700] text-black font-bold hover:bg-[#FFD700]/80"
              >
                {connected ? 'Criar Sala' : 'Conectando...'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <Label htmlFor="roomId" className="block text-sm font-medium mb-2">
                  Código da Sala
                </Label>
                <Input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC123"
                  className="w-full px-4 py-3 uppercase"
                  maxLength={10}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={!connected || !nickname.trim() || !roomId.trim()}
                className="w-full text-lg rounded-lg my-4 py-6 px-6 bg-[#FFD700] text-black font-bold hover:bg-[#FFD700]/80"
              >
                {connected ? 'Entrar na Sala' : 'Conectando...'}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Instruções do jogo */}
      <div className='h-full me-32 w-1/3'>
          <img src="../images/Banner.jpg" style={{width: "fit-content"}} alt="" />
      </div>
      
    </div>
  );
};

export default Lobby;

