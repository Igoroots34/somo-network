import React, { useState } from 'react';
import { useGameStore } from '../store/game';
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
import LogoLoop from '@/components/ui-bits/logo-loop';
import { SiReact, SiNextdotjs, SiTypescript, SiTailwindcss } from 'react-icons/si';

const techLogos = [
  { node: <SiReact />, title: "React", href: "https://react.dev" },
  { node: <SiNextdotjs />, title: "Next.js", href: "https://nextjs.org" },
  { node: <SiTypescript />, title: "TypeScript", href: "https://www.typescriptlang.org" },
  { node: <SiTailwindcss />, title: "Tailwind CSS", href: "https://tailwindcss.com" },
];

// Alternative with image sources
const imageLogos = [
  { src: "src/assets/cards/default.png", alt: "Verso da carta" },
];

const imageLogos1 = [
  { src: "src/assets/LOGO_SOMO.png", alt: "Verso da carta" },
];

const imageLogos2 = [
  { src: "src/assets/cards/default.png", alt: "Verso da carta" },
];

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
    <div className="flex border border-gray-600 rounded-lg justify-center items-center">
      <div className="flex-none justify-center">
      <div className="flex flex-row justify-center gap-4 mb-4">
        <img
          className="w-24 h-24 object-contain"
          src="../src/assets/LOGO_SOMO.png"
          alt="Logo SOMO"
        />
        <Label className='text-[#FFD700]'>X</Label>
        <img
          className="w-24 h-24 object-contain"
          src="../src/assets/LOGO_NB.png"
          alt="Logo NB"
        />
      </div>
        {/* Tabs */}
        <div className="flex min-w-125 space-x-2 justify-center">
          <Button variant="link" 
          onClick={() => setActiveTab('create')}
          className={`w-1/2 text-lg text-center text-[#FFD700] font-bold ${
            activeTab === 'join'
              ? 'text-white/50'
              : 'underline underline-offset-8'
            }`}
          >
            Criar Sala</Button>
            
          <Button variant="link"
            onClick={() => setActiveTab('join')}
            className={`w-1/2 text-lg text-center text-[#FFD700] font-bold ${
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
      <div className='flex flex-col rounded-md justify-center py-4 max-h-140 max-w-122 min-h-140 min-w-120 bg-[#FFD700] me-3 my-3'>
      <div className='items-center'>
        <LogoLoop
          logos={imageLogos}
          speed={120}
          direction="left"
          logoHeight={110}
          gap={40}
          pauseOnHover
          scaleOnHover
          fadeOut
          fadeOutColor="#FFD700"
          ariaLabel="Technology partners"
        />
        </div>
        <div className='items-center'>
        <LogoLoop
          logos={imageLogos1}
          speed={120}
          direction="right"
          logoHeight={160}
          gap={40}
          pauseOnHover
          scaleOnHover
          fadeOut
          fadeOutColor="#FFD700"
          ariaLabel="Technology partners"
        />
        </div>
        <div className='items-center'>
        <LogoLoop
        logos={imageLogos2}
        speed={120}
        direction="left"
        logoHeight={110}
        gap={40}
        pauseOnHover
        scaleOnHover
        fadeOut
        fadeOutColor="#FFD700"
        ariaLabel="Technology partners"
      />
        </div>
    </div>
      
    </div>
  );
};

export default Lobby;

