// Ships the game page (assets/game/game.html) as a bundled asset
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.resolver.assetExts.push('html')

module.exports = config
