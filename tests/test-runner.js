#!/usr/bin/env node

/**
 * SSOT-3005 Test Runner
 * Main test runner for all backend tests
 * Usage: node tests/test-runner.js [unit|integration|all] [--verbose]
 */

const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
    timeout: 30000, // 30 seconds per test suite
    verbose: process.argv.includes('--verbose') || process.env.DEBUG_TESTS,
    type: process.argv[2] || 'all'
};

// Color codes for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class MainTestRunner {
    constructor() {
        this.results = {
            totalSuites: 0,
            passedSuites: 0,
            failedSuites: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            failures: []
        };
        this.startTime = null;
    }

    async run() {
        this.printHeader();
        this.startTime = Date.now();

        try {
            await this.runTestSuites();
            this.printFinalSummary();
            
            // Exit with appropriate code
            process.exit(this.results.failedSuites > 0 ? 1 : 0);
        } catch (error) {
            console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error.message);
            process.exit(1);
        }
    }

    printHeader() {
        console.log(`${colors.cyan}${colors.bright}🧪 SSOT-3005 Backend Test Suite${colors.reset}`);
        console.log(`${colors.cyan}═══════════════════════════════════${colors.reset}`);
        console.log();
        
        if (TEST_CONFIG.verbose) {
            console.log(`${colors.yellow}Configuration:${colors.reset}`);
            console.log(`  Test type: ${TEST_CONFIG.type}`);
            console.log(`  Timeout: ${TEST_CONFIG.timeout}ms`);
            console.log(`  Verbose: ${TEST_CONFIG.verbose}`);
            console.log();
        }
    }

    async runTestSuites() {
        const testTypes = TEST_CONFIG.type === 'all' 
            ? ['unit', 'integration'] 
            : [TEST_CONFIG.type];

        for (const testType of testTypes) {
            await this.runTestType(testType);
        }
    }

    async runTestType(testType) {
        const testDir = path.join(__dirname, testType);
        
        if (!fs.existsSync(testDir)) {
            console.log(`${colors.yellow}📋 ${this.capitalize(testType)} Tests: Directory not found, skipping${colors.reset}`);
            return;
        }

        const testFiles = fs.readdirSync(testDir)
            .filter(file => file.endsWith('.test.js'))
            .sort();

        if (testFiles.length === 0) {
            console.log(`${colors.yellow}📋 ${this.capitalize(testType)} Tests: No test files found${colors.reset}`);
            return;
        }

        console.log(`${colors.blue}📋 ${this.capitalize(testType)} Tests${colors.reset}`);
        
        for (const testFile of testFiles) {
            await this.runTestFile(testType, testFile);
        }
        
        console.log();
    }

    async runTestFile(testType, testFile) {
        const testPath = path.join(__dirname, testType, testFile);
        const suiteName = testFile.replace('.test.js', '');
        
        try {
            // Timeout wrapper
            const testPromise = this.executeTestFile(testPath);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Test timeout')), TEST_CONFIG.timeout)
            );

            const result = await Promise.race([testPromise, timeoutPromise]);
            
            this.results.totalSuites++;
            if (result.success) {
                this.results.passedSuites++;
                console.log(`├── ${colors.green}✅ ${suiteName}${colors.reset} (${result.stats.total} tests, ${result.duration}ms)`);
            } else {
                this.results.failedSuites++;
                console.log(`├── ${colors.red}❌ ${suiteName}${colors.reset} (${result.stats.failed}/${result.stats.total} failed, ${result.duration}ms)`);
                this.results.failures.push({
                    suite: suiteName,
                    failures: result.failures
                });
            }
            
            this.results.totalTests += result.stats.total;
            this.results.passedTests += result.stats.passed;
            this.results.failedTests += result.stats.failed;
            
        } catch (error) {
            this.results.totalSuites++;
            this.results.failedSuites++;
            console.log(`├── ${colors.red}💥 ${suiteName}${colors.reset} - Suite failed to run: ${error.message}`);
            this.results.failures.push({
                suite: suiteName,
                error: error.message
            });
        }
    }

    async executeTestFile(testPath) {
        const startTime = Date.now();
        
        // Clear require cache to ensure fresh test runs
        delete require.cache[require.resolve(testPath)];
        
        // Import and run the test
        const testModule = require(testPath);
        
        if (typeof testModule.run === 'function') {
            const result = await testModule.run();
            return {
                success: result.success,
                stats: result.stats,
                failures: result.failures || [],
                duration: Date.now() - startTime
            };
        } else {
            throw new Error('Test file must export a run() function');
        }
    }

    printFinalSummary() {
        const totalTime = Date.now() - this.startTime;
        const suitePassRate = this.results.totalSuites > 0 
            ? ((this.results.passedSuites / this.results.totalSuites) * 100).toFixed(1)
            : 0;
        const testPassRate = this.results.totalTests > 0 
            ? ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)
            : 0;

        console.log(`${colors.cyan}📊 Final Results${colors.reset}`);
        console.log(`   Test Suites: ${this.results.passedSuites}/${this.results.totalSuites} passed (${suitePassRate}%)`);
        console.log(`   Individual Tests: ${this.results.passedTests}/${this.results.totalTests} passed (${testPassRate}%)`);
        
        if (this.results.failedSuites > 0) {
            console.log(`${colors.red}   Failures: ${this.results.failedSuites} suite(s), ${this.results.failedTests} test(s)${colors.reset}`);
            
            if (TEST_CONFIG.verbose && this.results.failures.length > 0) {
                console.log();
                console.log(`${colors.red}Failure Details:${colors.reset}`);
                this.results.failures.forEach(failure => {
                    console.log(`  ${colors.red}• ${failure.suite}:${colors.reset}`);
                    if (failure.error) {
                        console.log(`    ${failure.error}`);
                    } else if (failure.failures) {
                        failure.failures.forEach(f => {
                            console.log(`    - ${f.test}: ${f.error}`);
                        });
                    }
                });
            }
        } else {
            console.log(`${colors.green}   All tests passed! 🎉${colors.reset}`);
        }
        
        console.log(`${colors.cyan}⏱️  Total time: ${totalTime}ms${colors.reset}`);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Usage information
function printUsage() {
    console.log('Usage: node tests/test-runner.js [unit|integration|all] [--verbose]');
    console.log('');
    console.log('Options:');
    console.log('  unit         Run only unit tests');
    console.log('  integration  Run only integration tests');
    console.log('  all          Run all tests (default)');
    console.log('  --verbose    Show detailed output and failure details');
    console.log('');
    console.log('Environment variables:');
    console.log('  DEBUG_TESTS=1  Enable verbose output and stack traces');
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printUsage();
        process.exit(0);
    }

    const runner = new MainTestRunner();
    runner.run().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = MainTestRunner;