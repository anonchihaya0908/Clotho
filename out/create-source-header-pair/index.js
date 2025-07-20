"use strict";
//
// CREATE SOURCE HEADER PAIR - MODULE INDEX
// ========================================
//
// This module provides functionality to create matching header/source file
// pairs for C/C++ development. It intelligently detects language context,
// offers appropriate templates, and handles custom file extensions.
//
// ARCHITECTURE:
// - templates.ts: Template rules and file content templates
// - service.ts: Business logic layer (language detection, file operations)
// - ui.ts: User interface layer (dialogs, input validation)
// - coordinator.ts: Main coordinator (orchestrates workflow, registers
// commands)
//
// WORKFLOW:
// Command triggered → Detect target directory → Analyze language context →
// Check for custom rules → Present template choices → Get file name →
// Validate uniqueness → Generate content → Write files → Open in editor
//
// FEATURES:
// - Smart language detection (C vs C++)
// - Multiple template types (class, struct, empty)
// - Custom file extension support
// - Header guard generation
// - Cross-language template options
// - Workspace-aware directory selection
// - Input validation for C/C++ identifiers
//
// INTEGRATION:
// Uses PairingRuleManager for custom extension configurations
// Integrates with VS Code file system and editor APIs
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairCreatorUI = exports.PairCreatorService = exports.PairCoordinator = exports.registerCreateSourceHeaderPairCommand = void 0;
const coordinator_1 = require("./coordinator");
const service_1 = require("./service");
const ui_1 = require("./ui");
// Registers the create source/header pair command with the VS Code extension
// context Uses dependency injection to create properly configured instances
function registerCreateSourceHeaderPairCommand(context) {
    // Create instances with proper dependencies
    const service = new service_1.PairCreatorService();
    const ui = new ui_1.PairCreatorUI(service);
    const coordinator = new coordinator_1.PairCoordinator(service, ui);
    context.subscriptions.push(coordinator);
}
exports.registerCreateSourceHeaderPairCommand = registerCreateSourceHeaderPairCommand;
// Re-export main types and classes for external usage
var coordinator_2 = require("./coordinator");
Object.defineProperty(exports, "PairCoordinator", { enumerable: true, get: function () { return coordinator_2.PairCoordinator; } });
var service_2 = require("./service");
Object.defineProperty(exports, "PairCreatorService", { enumerable: true, get: function () { return service_2.PairCreatorService; } });
var ui_2 = require("./ui");
Object.defineProperty(exports, "PairCreatorUI", { enumerable: true, get: function () { return ui_2.PairCreatorUI; } });
//# sourceMappingURL=index.js.map