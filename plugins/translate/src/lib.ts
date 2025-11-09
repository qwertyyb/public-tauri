import { Module } from 'module';

console.log('import.meta.url', import.meta.url);
const require = Module.createRequire(import.meta.url);

const addon = require('../build/Release/addon.node');

export default addon;
