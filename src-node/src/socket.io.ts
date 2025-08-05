
import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { addSocket, removeSocket } from "./plugin/sockets";
import logger from "./utils/logger";

let io: Server | null = null

export const startSocketIO = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*'
    }
  });

  io.on("connection", (socket) => {
    logger.info('socket connection', socket.handshake.query.name)
    addSocket(socket.handshake.query.name! as string, socket)
    socket.on("disconnect", (reason) => {
      logger.info('socket disconnect', reason)
      removeSocket(socket.handshake.query.name! as string)
    });
  });
}