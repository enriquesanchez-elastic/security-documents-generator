#!/usr/bin/env node

/**
 * Test Runner for Security Documents Generator
 * 
 * This script provides a comprehensive test suite for the entire codebase,
 * with special focus on mocking AI model calls and external dependencies.
 */

import { startVitest } from 'vitest/node';

const config = {
  // Test configuration
  root: process.cwd(),
  configFile: 'vitest.config.ts',
  
  // Coverage options
  coverage: {
    enabled: process.argv.includes('--coverage'),
    provider: 'v8' as const,
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/',
      'test/',
      'dist/',
      '**/*.d.ts',
      'eslint.config.mjs',
      'vitest.config.ts',
    ],
    thresholds: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },

  // Test patterns
  include: ['test/**/*.test.ts'],
  exclude: ['node_modules/', 'dist/'],

  // Environment
  environment: 'node',
  globals: true,

  // Timeouts
  testTimeout: 30000,
  hookTimeout: 10000,

  // Setup
  setupFiles: ['./test/setup.ts'],

  // Reporter
  reporter: process.argv.includes('--ui') ? 'default' : 'verbose',
};

async function runTests() {
  console.log('🧪 Starting Security Documents Generator Test Suite...\n');
  
  if (process.argv.includes('--help')) {
    console.log(`
📋 Available Test Commands:

  yarn test                    # Run all tests
  yarn test:watch             # Run tests in watch mode  
  yarn test:coverage          # Run tests with coverage report
  yarn test:ui                # Run tests with UI interface

🎯 Test Categories:

  • AI Service Tests          # Mock OpenAI/Claude API calls
  • MCP Server Tests          # Test tool handlers and request processing
  • Attack Simulation Tests   # Test complex attack scenario generation
  • Realistic Engine Tests    # Test log generation and correlation
  • Validation Tests          # Test input sanitization and validation
  • Integration Tests         # Test end-to-end workflows

🛡️  Security Focus:

  All AI model calls are mocked to prevent:
  • Accidental API charges during testing
  • Rate limiting issues
  • External dependency failures
  • Inconsistent test results

📊 Coverage Targets:

  • Branches: 80%
  • Functions: 80% 
  • Lines: 80%
  • Statements: 80%

🏃‍♂️ Run specific test files:

  npx vitest test/utils/ai-service.test.ts
  npx vitest test/mcp-server.test.ts
  npx vitest test/services/
  
`);
    return;
  }

  try {
    const vitest = await startVitest('test', [], config);
    
    if (!vitest) {
      throw new Error('Failed to start Vitest');
    }

    // Handle different modes
    if (process.argv.includes('--watch')) {
      console.log('👀 Running in watch mode... Press Ctrl+C to exit');
      // Watch mode will keep running
    } else {
      // Run once and exit
      await vitest.close();
      console.log('\n✅ Test suite completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Handle CLI arguments
if (process.argv.includes('--coverage')) {
  console.log('📊 Running tests with coverage analysis...');
}

if (process.argv.includes('--ui')) {
  console.log('🎨 Starting Vitest UI interface...');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});