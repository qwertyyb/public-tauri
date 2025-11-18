import { chdir } from "node:process";
import logger from "./logger";
import { join } from "node:path";

const workingDir = join(import.meta.dirname, '../')

logger.info('workingDir', workingDir)

chdir(workingDir)