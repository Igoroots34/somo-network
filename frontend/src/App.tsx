import React, { useEffect } from 'react';
import { useGameStore } from './store/game';
import Lobby from './views/Lobby';
import Room from './views/Room';

// Componente de notificações
const Notifications: React.FC = () => {
  const { notifications, removeNotification } = useGameStore();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 shadow-lg max-w-sm transform transition-all duration-300 ${
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
      <div className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${
        connecting ? 'bg-yellow-500' : 'bg-red-500'
      }`}>
        {connecting ? 'Conectando...' : 'Desconectado'}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { currentView, connect, connected, connecting } = useGameStore();

  useEffect(() => {
    // Conecta automaticamente ao carregar a aplicação
    if (!connected && !connecting) {
      connect().catch(console.error);
    }
  }, [connect, connected, connecting]);

  return (
    <div className="min-h-screen bg-black">
      <ConnectionStatus />
      <Notifications />
      
      <div className="container-full px-4 py-8">
        <header className="text-center flex mb-8">
          <img src="../images/LOGO_SOMO.png" className='max-h-20 mx-auto' alt="Logo" />
        </header>

        <main className="flex-none">
          {currentView === 'lobby' ? <Lobby /> : <Room />}
        </main>
      </div>
    </div>
  );
};

export default App;

