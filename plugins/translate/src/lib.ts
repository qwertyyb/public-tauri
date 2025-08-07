import { Module } from 'module'

const require = Module.createRequire(import.meta.url)

const addon = require('../build/Release/addon.node')

export default addon