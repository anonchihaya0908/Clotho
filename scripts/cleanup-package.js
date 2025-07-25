/**
 * Package.json Cleanup Script
 * 
 * This script removes development/debug commands from package.json
 * to prepare for production release
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Commands to remove (development/debug only)
const commandsToRemove = [
    'clotho.debugClangdDetection',
    'clotho.testDebounce',
    'clotho.testDebounceManual',
    'clotho.testRapidSwitching',
    'clotho.testPlaceholder',
    'clotho.testPlaceholderBasic',
    'clotho.testMainEditorClose',
    'clotho.testPreviewClose',
    'clotho.testDirectPlaceholder',
    'clotho.debugPlaceholder',
    'clotho.debugLayout',
    'clotho.testPlaceholderSwitching'
];

// Remove commands from contributes.commands
if (packageJson.contributes && packageJson.contributes.commands) {
    packageJson.contributes.commands = packageJson.contributes.commands.filter(
        command => !commandsToRemove.includes(command.command)
    );
}

// Remove commands from contributes.menus.commandPalette
if (packageJson.contributes && packageJson.contributes.menus && packageJson.contributes.menus.commandPalette) {
    packageJson.contributes.menus.commandPalette = packageJson.contributes.menus.commandPalette.filter(
        menu => !commandsToRemove.includes(menu.command)
    );
}

// Standardize configuration property names to follow consistent grouping
const configProperties = packageJson.contributes.configuration.properties;

// Rename inconsistent property names
if (configProperties['clotho.switchHeaderSource.searchPaths']) {
    configProperties['clotho.switch.searchPaths'] = configProperties['clotho.switchHeaderSource.searchPaths'];
    delete configProperties['clotho.switchHeaderSource.searchPaths'];
}

// Update the renamed property description for clarity
if (configProperties['clotho.switch.searchPaths']) {
    configProperties['clotho.switch.searchPaths'].description =
        "Additional paths to search for corresponding header/source files";
}

// Remove unnecessary devDependency
if (packageJson.devDependencies && packageJson.devDependencies['@types/pidusage']) {
    delete packageJson.devDependencies['@types/pidusage'];
}

// Write back to package.json with proper formatting
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4), 'utf8');

console.log('✅ Package.json cleanup completed!');
console.log('Changes made:');
console.log(`- Removed ${commandsToRemove.length} development/debug commands`);
console.log('- Standardized configuration property naming');
console.log('- Removed unnecessary @types/pidusage dependency');
console.log('');
console.log('Production-ready commands remaining:');
if (packageJson.contributes && packageJson.contributes.commands) {
    packageJson.contributes.commands.forEach(cmd => {
        console.log(`  - ${cmd.command}: ${cmd.title}`);
    });
}
