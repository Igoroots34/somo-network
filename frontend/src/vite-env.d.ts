/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_WS_URL: string;
    readonly VITE_API_URL: string;
    // Adicione outras variáveis de ambiente que você usa com VITE_ aqui
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  