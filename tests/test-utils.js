/**
 * Test Utilities for SSOT-3005 Backend Testing
 * Provides a simple, zero-dependency test framework optimized for Claude AI usage
 */

class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            failures: []
        };
        this.startTime = null;
    }

    /**
     * Add a test case
     * @param {string} name - Test name
     * @param {Function} testFn - Test function (async supported)
     */
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    /**
     * Run all tests in the suite
     */
    async run() {
        console.log(`🧪 ${this.suiteName}`);
        console.log('═'.repeat(this.suiteName.length + 3));
        console.log();

        this.startTime = Date.now();

        for (const test of this.tests) {
            await this.runSingleTest(test);
        }

        this.printSummary();
        return this.results.failed === 0;
    }

    /**
     * Run a single test
     */
    async runSingleTest(test) {
        const testStartTime = Date.now();
        
        try {
            await test.testFn();
            const duration = Date.now() - testStartTime;
            console.log(`├── ✅ ${test.name} (${duration}ms)`);
            this.results.passed++;
        } catch (error) {
            const duration = Date.now() - testStartTime;
            console.log(`├── ❌ ${test.name} (${duration}ms)`);
            console.log(`│   └── Error: ${error.message}`);
            if (error.stack && process.env.DEBUG_TESTS) {
                console.log(`│       Stack: ${error.stack.split('\n')[1]?.trim()}`);
            }
            this.results.failed++;
            this.results.failures.push({
                test: test.name,
                error: error.message,
                stack: error.stack
            });
        }
        
        this.results.total++;
    }

    /**
     * Print test summary
     */
    printSummary() {
        const totalTime = Date.now() - this.startTime;
        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        
        console.log();
        console.log(`📊 Results: ${this.results.passed}/${this.results.total} passed (${passRate}%)`);
        
        if (this.results.failed > 0) {
            console.log(`💥 ${this.results.failed} failure(s)`);
        }
        
        console.log(`⏱️  Total time: ${totalTime}ms`);
        console.log();
    }
}

/**
 * Assertion utilities
 */
class Assert {
    static isTrue(condition, message = 'Expected true') {
        if (!condition) {
            throw new Error(message);
        }
    }

    static isFalse(condition, message = 'Expected false') {
        if (condition) {
            throw new Error(message);
        }
    }

    static equals(actual, expected, message = `Expected ${expected}, got ${actual}`) {
        if (actual !== expected) {
            throw new Error(message);
        }
    }

    static notEquals(actual, unexpected, message = `Expected not ${unexpected}, got ${actual}`) {
        if (actual === unexpected) {
            throw new Error(message);
        }
    }

    static exists(value, message = 'Expected value to exist') {
        if (value === null || value === undefined) {
            throw new Error(message);
        }
    }

    static notExists(value, message = 'Expected value to not exist') {
        if (value !== null && value !== undefined) {
            throw new Error(message);
        }
    }

    static isType(value, type, message = `Expected type ${type}, got ${typeof value}`) {
        if (typeof value !== type) {
            throw new Error(message);
        }
    }

    static isArray(value, message = 'Expected value to be an array') {
        if (!Array.isArray(value)) {
            throw new Error(message);
        }
    }

    static hasProperty(obj, prop, message = `Expected object to have property ${prop}`) {
        if (!obj || !obj.hasOwnProperty(prop)) {
            throw new Error(message);
        }
    }

    static arrayLength(arr, length, message = `Expected array length ${length}, got ${arr?.length}`) {
        if (!Array.isArray(arr) || arr.length !== length) {
            throw new Error(message);
        }
    }

    static async throws(asyncFn, message = 'Expected function to throw') {
        try {
            await asyncFn();
            throw new Error(message);
        } catch (error) {
            // Expected behavior
        }
    }

    static async notThrows(asyncFn, message = 'Expected function not to throw') {
        try {
            await asyncFn();
        } catch (error) {
            throw new Error(`${message}: ${error.message}`);
        }
    }
}

/**
 * Test data utilities
 */
class TestData {
    static randomString(length = 8) {
        return Math.random().toString(36).substring(2, 2 + length);
    }

    static randomEmail() {
        return `test${this.randomString(5)}@example.com`;
    }

    static randomInt(min = 0, max = 100) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static mockEntity(type = 'TestEntity', overrides = {}) {
        return {
            entityType: type,
            nome: this.randomString(),
            email: this.randomEmail(),
            created: new Date().toISOString(),
            ...overrides
        };
    }
}

/**
 * Database cleanup utilities
 */
class TestCleanup {
    static testEntities = new Set();
    static testRelations = new Set();

    static trackEntity(entityId) {
        this.testEntities.add(entityId);
    }

    static trackRelation(relationId) {
        this.testRelations.add(relationId);
    }

    static async cleanup(dao) {
        // Clean up test entities
        for (const entityId of this.testEntities) {
            try {
                await dao.deleteEntity(entityId);
            } catch (error) {
                // Ignore cleanup errors
            }
        }

        // Clean up test relations
        for (const relationId of this.testRelations) {
            try {
                await dao.deleteRelation(relationId);
            } catch (error) {
                // Ignore cleanup errors
            }
        }

        this.testEntities.clear();
        this.testRelations.clear();
    }
}

module.exports = {
    TestRunner,
    Assert,
    TestData,
    TestCleanup
};