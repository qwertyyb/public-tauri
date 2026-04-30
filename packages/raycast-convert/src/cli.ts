#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { convertRaycastPlugin } from './index';
import type { ConvertMode } from './types';

const usage = () => {
  console.error('Usage: raycast-convert <raycast-plugin-dir> --out <public-plugin-dir> [--build] [--mode development|production]');
};

const parseCliArgs = () => parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    out: {
      type: 'string',
    },
    build: {
      type: 'boolean',
      default: false,
    },
    mode: {
      type: 'string',
      default: 'development',
    },
  },
});

const getConvertMode = (value: string): ConvertMode => {
  if (value !== 'development' && value !== 'production') {
    throw new Error(`Unsupported --mode "${value}". Expected "development" or "production".`);
  }
  return value;
};

export const runCli = async () => {
  const { values, positionals } = parseCliArgs();
  const inputArg = positionals[0];
  if (!inputArg) {
    usage();
    process.exit(1);
  }

  const report = await convertRaycastPlugin({
    inputDir: path.resolve(inputArg),
    outputDir: values.out,
    build: values.build,
    mode: getConvertMode(values.mode),
    invocationDir: process.cwd(),
  });

  console.log(`Converted ${report.convertedCommands.length} command(s) to ${report.output}`);
  if (report.skippedCommands.length) {
    console.log(`Skipped ${report.skippedCommands.length} command(s). See raycast-conversion-report.json`);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
