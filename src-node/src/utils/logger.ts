// import { fileURLToPath } from 'node:url';
// import { pino } from 'pino';

// const transport = pino.transport({
//   target: 'pino/file',
//   options: {
//     destination: fileURLToPath(new URL('../../logs/pino.log', import.meta.url))
//   }
// })

// const logger = pino(transport);

const logger = process.env.NODE_ENV === 'development' ? console : console;

export default logger;
export { logger };
