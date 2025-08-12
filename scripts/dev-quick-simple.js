const { execSync } = require('child_process');

console.log('🚀 Starting Clotho development environment...');
console.log('');

try {
    console.log('📦 Building extension and webview...');
    execSync('npm run build:fast', { stdio: 'inherit' });
    
    console.log('');
    console.log('✅ Build completed successfully!');
    console.log('🎯 VS Code will now launch with the extension loaded...');
    console.log('');
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

