# Lista de Tarefas - SOMO: Network Blackout

## Fase 1: Configurar a estrutura do projeto e o ambiente de desenvolvimento

- [x] Criar a estrutura de pastas do monorepo (`somo/`, `backend/`, `frontend/`).
- [x] Criar os subdiretórios do backend (`app/`, `engine/`, `services/`, `tests/`).
- [x] Criar os subdiretórios do frontend (`src/`, `api/`, `store/`, `views/`, `components/`).
- [x] Criar os arquivos vazios do projeto.

## Fase 2: Implementar o backend (FastAPI, WebSockets e modelos Pydantic)

- [x] Definir os modelos Pydantic em `models.py`.
- [x] Implementar os endpoints REST e a configuração do WebSocket em `main.py`.
- [x] Implementar os handlers de WebSocket em `ws.py`.
- [x] Implementar o gerenciamento de salas em `room_manager.py`.

## Fase 3: Desenvolver a lógica do jogo (engine) e os testes unitários

- [x] Implementar a criação e gerenciamento do baralho em `deck.py`.
- [x] Implementar a gestão de estado do jogo em `state.py`.
- [x] Implementar as regras do jogo em `rules.py`.
- [x] Implementar a lógica do bot em `bots.py`.
- [x] Escrever os testes unitários em `test_engine.py`.

## Fase 4: Implementar o frontend (React, Zustand e comunicação WebSocket)

- [x] Configurar o cliente WebSocket em `api/ws.ts`.
- [x] Gerenciar o estado do cliente com Zustand em `store/game.ts`.
- [x] Criar a tela de Lobby em `views/Lobby.tsx`.
- [x] Criar a tela da Sala de Jogo em `views/Room.tsx`.
- [x] Desenvolver os componentes da interface (`Hand.tsx`, `Table.tsx`, `Players.tsx`, `RoundBanner.tsx`).
- [x] Definir os tipos TypeScript em `types.ts`.

## Fase 5: Testar a aplicação full-stack localmente

- [x] Executar o backend e o frontend.
- [x] Testar o fluxo completo do jogo com múltiplos clientes.
- [x] Verificar a sincronização de estado e a correta aplicação das regras.

## Fase 6: Gerar o arquivo README.md com instruções de execução

- [x] Escrever o `README.md` com as instruções detalhadas para rodar o projeto localmente.
- [x] Entregar o projeto finalizado ao usuário.


