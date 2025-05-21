const express = require('express');
import type { Application, Request, Response, NextFunction } from 'express';

class Server {
  private app: Application;
  private port: number | string;

  constructor(port = 3000) {
    this.app = express();
    this.port = process.env.PORT || port;

    this.setupMiddleward();
    this.setupRoutes();
  }

  private setupMiddleward() {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const currTime = new Date().toISOString();
      console.log(`[${currTime}] Ping received: ${req.method} ${req.url}`);
      next();
    });
  }

  private setupRoutes() {
    this.app.get('/', (req: Request, res: Response) => {
      res.send('Bot is running!');
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`Server is listening on port ${this.port}`);
    });
  }
}

export default Server;
