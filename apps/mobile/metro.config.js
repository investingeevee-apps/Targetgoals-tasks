// Metro config for an npm-workspaces monorepo.
// Lets Metro find @targetgoals/shared and the hoisted node_modules at the root.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch the whole monorepo so changes to packages/* are picked up.
config.watchFolders = [workspaceRoot]

// 2. Resolve modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

module.exports = config
