// import { fileURLToPath } from 'node:url';
// import { pino } from 'pino';

import { isDev } from '.';

// const transport = pino.transport({
//   target: 'pino/file',
//   options: {
//     destination: fileURLToPath(new URL('../../logs/pino.log', import.meta.url))
//   }
// })

// const logger = pino(transport);

const logger = isDev() ? console : console;

export default logger;
export { logger };
