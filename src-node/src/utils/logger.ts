import { pino } from 'pino';

const logger = pino();

export default process.env.NODE_ENV === 'development' ? console : logger;
