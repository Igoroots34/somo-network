// src/components/LobbyCard.tsx
import { useState, FormEvent } from "react";
import logo from "@/assets/LOGO_SOMO.png"; // ajuste o caminho do seu logo

type Props = {
  onCreateRoom?: (args: { nickname: string; maxPlayers: number }) => void;
  onJoinRoom?: (args: { nickname: string; roomCode: string }) => void;
};

const MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

export default function LobbyCard({ onCreateRoom, onJoinRoom }: Props) {
  const [tab, setTab] = useState<"create" | "join">("create");

  // criar sala
  const [nickname, setNickname] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);

  // entrar na sala
  const [joinNick, setJoinNick] = useState("");
  const [roomCode, setRoomCode] = useState("");

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    onCreateRoom?.({ nickname: nickname.trim(), maxPlayers });
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!joinNick.trim() || !roomCode.trim()) return;
    onJoinRoom?.({ nickname: joinNick.trim(), roomCode: roomCode.trim().toUpperCase() });
  }

  return (
    <div className="min-h-screen w-full bg-black text-white grid place-items-center p-4">
      <div className="w-full max-w-6xl rounded-2xl border border-white/10 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* LEFT: form */}
          <div className="p-8 md:p-12">
            {/* logo */}
            <div className="flex justify-center md:justify-start">
              <img
                src={logo}
                alt="SOMO"
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* tabs */}
            <div className="mt-8 flex gap-6 text-sm font-bold tracking-wide">
              <button
                onClick={() => setTab("create")}
                className={`uppercase transition-colors ${
                  tab === "create"
                    ? "text-yellow-400"
                    : "text-white/60 hover:text-yellow-300"
                }`}
              >
                Criar Sala
              </button>
              <button
                onClick={() => setTab("join")}
                className={`uppercase transition-colors ${
                  tab === "join"
                    ? "text-yellow-400"
                    : "text-white/60 hover:text-yellow-300"
                }`}
              >
                Entrar na Sala
              </button>
            </div>

            {/* content */}
            {tab === "create" ? (
              <form onSubmit={handleCreate} className="mt-8 space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/70 mb-2">
                    Seu Nickname
                  </label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Digite seu Nickname"
                    className="w-full rounded-md bg-neutral-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/70 mb-2">
                    Máximo de Jogadores
                  </label>
                  <div className="relative">
                    <select
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full appearance-none rounded-md bg-neutral-900 border border-white/10 px-4 py-3 pr-10 text-sm outline-none focus:border-yellow-400"
                    >
                      {MAX_PLAYERS_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n} Jogadores
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                      ▾
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!nickname.trim()}
                  className="w-full rounded-md bg-yellow-400 text-black font-bold tracking-wide py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 transition"
                >
                  Iniciar Jogo
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="mt-8 space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/70 mb-2">
                    Seu Nickname
                  </label>
                  <input
                    value={joinNick}
                    onChange={(e) => setJoinNick(e.target.value)}
                    placeholder="Digite seu Nickname"
                    className="w-full rounded-md bg-neutral-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/70 mb-2">
                    Código da Sala
                  </label>
                  <input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Ex.: JHVVE8"
                    className="w-full rounded-md bg-neutral-900 border border-white/10 px-4 py-3 text-sm tracking-widest uppercase outline-none focus:border-yellow-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!joinNick.trim() || !roomCode.trim()}
                  className="w-full rounded-md bg-yellow-400 text-black font-bold tracking-wide py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 transition"
                >
                  Entrar
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: yellow panel */}
          <div className="bg-yellow-400/95 rounded-b-2xl md:rounded-b-none md:rounded-r-2xl border-t md:border-t-0 md:border-l border-black/20 min-h-[360px]" />
        </div>
      </div>
    </div>
  );
}
