from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .ws import manager
from .services.room_manager import room_manager
import uuid
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pp = FastAPI()

origins = [
    "http://localhost:3000",  # Para desenvolvimento local
    "https://YOUR_VERCEL_FRONTEND_URL", # Substitua pela URL do seu frontend Vercel
    # Adicione outros domínios se necessário
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Eventos executados na inicialização da aplicação"""
    logger.info("Starting SOMO backend server...")
    room_manager.start_cleanup_task()
    logger.info("Room cleanup task started")

@app.on_event("shutdown")
async def shutdown_event():
    """Eventos executados no encerramento da aplicação"""
    logger.info("Shutting down SOMO backend server...")
    if room_manager.cleanup_task:
        room_manager.cleanup_task.cancel()

@app.get("/")
async def root():
    """Endpoint raiz para verificar se a API está funcionando"""
    return {
        "message": "SOMO: Network Blackout API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Endpoint de verificação de saúde da aplicação"""
    return {
        "status": "healthy",
        "rooms_count": len(room_manager.get_all_rooms()),
        "active_connections": len(manager.active_connections)
    }

@app.get("/rooms")
async def list_rooms():
    """Lista todas as salas públicas (para debug/admin)"""
    rooms = room_manager.get_all_rooms()
    public_rooms = []
    
    for room_id, room in rooms.items():
        public_rooms.append({
            "id": room.id,
            "players_count": len(room.players),
            "max_players": room.max_players,
            "game_started": room.game_started,
            "host_nickname": next((p.nickname for p in room.players if p.id == room.host_id), "Unknown")
        })
    
    return {"rooms": public_rooms}

@app.get("/rooms/{room_id}")
async def get_room_info(room_id: str):
    """Obtém informações públicas de uma sala específica"""
    room = room_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {
        "id": room.id,
        "players": [
            {
                "nickname": player.nickname,
                "tokens": player.tokens,
                "is_bot": player.is_bot,
                "is_eliminated": player.is_eliminated
            }
            for player in room.players
        ],
        "max_players": room.max_players,
        "game_started": room.game_started,
        "current_turn_nickname": next(
            (p.nickname for p in room.players if p.id == room.current_turn), 
            None
        ) if room.current_turn else None,
        "accumulated_sum": room.accumulated_sum,
        "round_limit": room.round_limit
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Endpoint WebSocket principal para comunicação em tempo real"""
    player_id = str(uuid.uuid4())
    
    try:
        await manager.connect(websocket, player_id)
        logger.info(f"WebSocket connection established for player {player_id}")
        
        while True:
            try:
                # Recebe mensagem do cliente
                data = await websocket.receive_text()
                logger.debug(f"Received message from {player_id}: {data}")
                
                # Processa a mensagem
                await manager.handle_message(websocket, data)
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for player {player_id}")
                break
            except Exception as e:
                logger.error(f"Error processing message from {player_id}: {e}")
                await websocket.send_text(f'{{"event": "error", "code": "PROCESSING_ERROR", "message": "Error processing message: {str(e)}"}}')
    
    except Exception as e:
        logger.error(f"WebSocket connection error for player {player_id}: {e}")
    
    finally:
        # Limpa a conexão
        manager.disconnect(websocket)
        logger.info(f"Cleaned up connection for player {player_id}")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handler global para exceções não tratadas"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

