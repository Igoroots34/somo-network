import React, { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from './store/game';
import Lobby from './views/Lobby';
import Room from './views/Room';
import FaultyTerminal from './components/ui-bits/fault';


// Componente de notificações
const Notifications: React.FC = () => {
  const { notifications, removeNotification } = useGameStore();

  return (
    <div className="fixed top-4 right-4 z-50 text-[5px] space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 shadow-lg max-w-sm text-[5px] rounded transform transition-all duration-300 ${
            notification.type === 'success' ? 'bg-[#FFD700] text-black' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-black' :
            'bg-transparent text-white'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-lg leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Componente de status de conexão
const ConnectionStatus: React.FC = () => {
  const { connected, connecting } = useGameStore();

  if (connected) return null;

  return (
    <div className="fixed top-4 left-4 z-40">
      <div className={`px-4 py-2 rounded-lg  text-sm font-medium ${
        connecting ? 'bg-[#FFD700] text-black' : 'bg-red-500'
      }`}>
        {connecting ? 'Conectando...' : 'Desconectado'}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { currentView, connect, connected, connecting } = useGameStore();

  // evita chamar connect mais de uma vez mesmo em StrictMode
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (!connected && !connecting) {
      connect().catch(console.error);
    }
  }, []); // <-- sem dependências!

  // evita re-render do fundo a cada clique
  const Background = useMemo(() => (
    <div className="absolute inset-0 -z-10">
      <FaultyTerminal
        scale={3}
        gridMul={[2, 1]}
        digitSize={1.2}
        timeScale={1}
        pause={false}
        scanlineIntensity={1}
        glitchAmount={1}
        flickerAmount={1}
        noiseAmp={1}
        chromaticAberration={0}
        dither={0}
        curvature={0}
        tint="#FFD700"
        mouseReact
        mouseStrength={0.5}
        pageLoadAnimation={false}
        brightness={1}
      />
    </div>
  ), []);

  return (
    <div
      className={
        `relative min-h-screen overflow-hidden
         ${currentView === 'lobby'
           ? 'flex items-center justify-center'
           : 'flex items-start justify-center pt-6'}`
      }
    >
      {Background}

      <div className="relative z-10 w-full max-w-6xl px-4">
        <ConnectionStatus />
        <Notifications />

        <main className={currentView === 'lobby'
          ? 'flex items-center justify-center'
          : 'flex items-start justify-center'}
        >
          {currentView === 'lobby'
            ? <div className="w-full flex items-center justify-center"><Lobby /></div>
            : <div className="w-7xl flex items-start justify-center"><Room /></div>}
        </main>
      </div>
    </div>
  );
};

export default App;

