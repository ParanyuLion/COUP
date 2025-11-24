const GameState = require('../game/GameState');

const rooms = new Map(); // roomId -> GameState

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomId, playerName }) => {
      let room = rooms.get(roomId);
      if (!room) {
        room = new GameState(roomId);
        rooms.set(roomId, room);
      }

      if (room.addPlayer(socket.id, playerName)) {
        socket.join(roomId);
        io.to(roomId).emit('room_update', {
          players: Array.from(room.players.values()).map(p => ({
              id: p.id,
              name: p.name,
              isAlive: p.isAlive
          })),
          status: room.status
        });
      } else {
        socket.emit('error', 'Could not join room');
      }
    });

    socket.on('start_game', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && room.startGame()) {
        broadcastGameState(io, room);
      }
    });

    socket.on('game_action', ({ roomId, action }) => {
        const room = rooms.get(roomId);
        if (room && room.handleAction({ ...action, source: socket.id })) {
            broadcastGameState(io, room);
        }
    });

    socket.on('resolve_coup', ({ roomId, cardIndex }) => {
        const room = rooms.get(roomId);
        if (room && room.resolveCoup(socket.id, cardIndex)) {
            broadcastGameState(io, room);
        }
    });

    socket.on('challenge', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.handleChallenge(socket.id)) {
            broadcastGameState(io, room);
        }
    });

    socket.on('block', ({ roomId, blockCard }) => {
        const room = rooms.get(roomId);
        if (room && room.handleBlock(socket.id, blockCard)) {
            broadcastGameState(io, room);
        }
    });

    socket.on('pass_action', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.passAction()) {
            broadcastGameState(io, room);
        }
    });

    socket.on('exchange_cards', ({ roomId, cardsToKeep }) => {
        const room = rooms.get(roomId);
        if (room && room.handleExchange(socket.id, cardsToKeep)) {
            broadcastGameState(io, room);
        }
    });

    socket.on('disconnect', () => {
        for (const [roomId, room] of rooms) {
            if (room.players.has(socket.id)) {
                room.removePlayer(socket.id);
                io.to(roomId).emit('room_update', {
                    players: Array.from(room.players.values()).map(p => ({
                        id: p.id,
                        name: p.name,
                        isAlive: p.isAlive
                    })),
                    status: room.status
                });
                if (room.players.size === 0) {
                    rooms.delete(roomId);
                }
                break;
            }
        }
    });
  });
};

function broadcastGameState(io, room) {
    for (const [pid, player] of room.players) {
        io.to(pid).emit('game_state_update', {
            hand: player.hand,
            coins: player.coins,
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                coins: p.coins,
                cardCount: p.hand.length,
                isAlive: p.isAlive
            })),
            turnIndex: room.turnIndex,
            currentPlayer: room.getCurrentPlayer()?.id,
            status: room.status,
            currentAction: room.currentAction,
            winner: room.winner
        });
    }
}
