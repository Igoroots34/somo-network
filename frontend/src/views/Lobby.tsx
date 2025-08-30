import React, { useMemo, useState } from 'react';
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
import LetterGlitch from '@/components/ui-bits/letter-glitch';
import EncryptButton from '@/components/EncryptButton';



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

  const BackgroundGlitch = useMemo(() => (
    <div className='relative border border-neutral-600 rounded-md justify-center h-145 w-125 me-3 my-3'>
      
      <LetterGlitch
      glitchColors={['#FFD700', '#FFF800', '#FF9B00']}
      glitchSpeed={50}
      centerVignette={false}
      outerVignette={true}
      smooth={true}
      />
    </div>
  ), []);

  return (
    <div className="flex border justify-center items-center bg-black border-neutral-600 rounded-lg">
      <div className="flex-none justify-center">
      <div className="flex flex-row justify-center gap-4 mb-4">
        <img
          className="w-24 h-24 object-contain"
          src="../src/assets/LOGO_SOMO.png"
          alt="Logo SOMO"
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

              <button
                disabled={!connected || !nickname.trim()}
                className="w-fit"
              >
                {connected ? <EncryptButton text="INICIAR SALA" autoStart /> : 'Conectando...'}
              </button>
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

              <button
                disabled={!connected || !nickname.trim() || !roomId.trim()}
                className="w-fit"
              >
                {connected ? <EncryptButton text="ENTRAR NA SALA" autoStart /> : 'Conectando...'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Instruções do jogo */}
      <div className='relative '>
      
        {BackgroundGlitch}
      </div>
      
    </div>
  );
};

export default Lobby;

{/* <div className='items-center'>
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
      /> */}