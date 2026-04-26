export const SCRIPT_TEMPLATES = [
  'Node.JS',
  'Shell',
  'Python',
  'AppleScript',
  'Ruby',
  'Swift',
] as const

export type ScriptTemplate = typeof SCRIPT_TEMPLATES[number]
export type LegacyScriptTemplate = ScriptTemplate | 'Bash'

export interface ScriptCommandOptions {
  template: LegacyScriptTemplate
  title: string
  description?: string
  icon?: string
  path: string
}

const suffixMap: Record<ScriptTemplate, string> = {
  'Node.JS': 'js',
  Shell: 'sh',
  Python: 'py',
  AppleScript: 'applescript',
  Ruby: 'rb',
  Swift: 'swift',
}

const executorMap: Record<ScriptTemplate, { command: string; args: (path: string) => string[] }> = {
  'Node.JS': { command: 'node', args: path => [path] },
  Shell: { command: 'bash', args: path => [path] },
  Python: { command: 'python3', args: path => [path] },
  AppleScript: { command: 'osascript', args: path => [path] },
  Ruby: { command: 'ruby', args: path => [path] },
  Swift: { command: 'swift', args: path => [path] },
}

export const normalizeTemplate = (template: LegacyScriptTemplate): ScriptTemplate => {
  if (template === 'Bash') return 'Shell'
  return template
}

export const getScriptSuffix = (template: LegacyScriptTemplate): string => {
  return suffixMap[normalizeTemplate(template)]
}

export const getScriptExecutor = (template: LegacyScriptTemplate) => {
  return executorMap[normalizeTemplate(template)]
}

const header = (title: string, description?: string) => {
  return `${title}${description ? `\nDescription: ${description}` : ''}`
}

export const generateScript = (options: ScriptCommandOptions): string => {
  const template = normalizeTemplate(options.template)
  const description = options.description || ''

  if (template === 'Node.JS') {
    return `#!/usr/bin/env node
// ${header(options.title, description).replaceAll('\n', '\n// ')}

const args = process.argv.slice(2)
console.log('arguments:', args)
`
  }

  if (template === 'Shell') {
    return `#!/usr/bin/env bash
# ${header(options.title, description).replaceAll('\n', '\n# ')}

set -euo pipefail
echo "arguments: $*"
`
  }

  if (template === 'Python') {
    return `#!/usr/bin/env python3
# ${header(options.title, description).replaceAll('\n', '\n# ')}

import sys

print("arguments:", sys.argv[1:])
`
  }

  if (template === 'AppleScript') {
    return `#!/usr/bin/env osascript
-- ${header(options.title, description).replaceAll('\n', '\n-- ')}

on run argv
  return "arguments: " & (argv as text)
end run
`
  }

  if (template === 'Ruby') {
    return `#!/usr/bin/env ruby
# ${header(options.title, description).replaceAll('\n', '\n# ')}

puts "arguments: #{ARGV.inspect}"
`
  }

  return `#!/usr/bin/env swift
// ${header(options.title, description).replaceAll('\n', '\n// ')}

import Foundation

print("arguments:", Array(CommandLine.arguments.dropFirst()))
`
}
