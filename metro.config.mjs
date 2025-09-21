import { getDefaultConfig } from '@expo/metro-config';

const config = getDefaultConfig(__dirname);

// Add support for .pdf and .cjs files
config.resolver.assetExts.push('pdf');
config.resolver.sourceExts.push('cjs');

export default config;
