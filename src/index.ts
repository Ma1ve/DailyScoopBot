import dotenv from 'dotenv';
import Server from './server/Server';
import { startNewsCron } from './cron/newsCron';

dotenv.config();

const server = new Server();

startNewsCron();

server.start();
