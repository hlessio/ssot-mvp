# SSOT-3005 Testing Framework

A comprehensive, zero-dependency testing framework optimized for both human developers and Claude AI usage.

## Quick Start

```bash
# Run unit tests (fast, no database required)
npm test

# Run all tests with detailed output
npm run test:verbose

# Run only integration tests (requires Neo4j)
npm run test:integration
```

## Test Structure

```
/tests/
├── test-runner.js          # Main test runner with colored output
├── test-utils.js           # Testing utilities and framework
├── README.md              # This file
├── /unit/                 # Unit tests (fast, mocked dependencies)
│   ├── schema-manager.test.js
│   ├── entity-engine.test.js
│   ├── relation-engine.test.js
│   └── attribute-space.test.js
├── /integration/          # Integration tests (full system)
│   ├── full-system.test.js
│   └── api-endpoints.test.js
├── /performance/          # Performance and load tests
└── /backend/             # Legacy test files
```

## Available Commands

| Command | Description | Requirements |
|---------|-------------|--------------|
| `npm test` | Run unit tests only | None |
| `npm run test:unit` | Run unit tests only | None |
| `npm run test:integration` | Run integration tests | Neo4j running |
| `npm run test:all` | Run all tests | Neo4j for integration |
| `npm run test:verbose` | Run all tests with details | Neo4j for integration |
| `npm run test:legacy` | Run legacy test files | Neo4j running |

## Test Framework Features

### 🧪 TestRunner
- Zero-dependency test runner
- Clear, structured output
- Automatic timing and statistics
- Colored output for better readability

### 📋 Assert Library
- Comprehensive assertion methods
- Clear error messages
- Support for async testing
- Type checking and property validation

### 🔧 Test Utilities
- Test data generation (`TestData.randomString()`, `TestData.mockEntity()`)
- Automatic cleanup (`TestCleanup.trackEntity()`)
- Mock helpers and setup utilities

### 📊 Output Format
Tests provide structured output perfect for Claude AI analysis:

```
🧪 SSOT-3005 Backend Test Suite
═══════════════════════════════════

📋 Unit Tests
├── ✅ SchemaManager: Schema definition (15ms)
├── ✅ SchemaManager: Schema evolution (23ms)
├── ❌ EntityEngine: Entity creation failed (8ms)
│   └── Error: Validation failed for required attribute 'nome'
├── ✅ RelationEngine: Create relation (18ms)
└── ✅ AttributeSpace: Notifications (12ms)

📋 Integration Tests  
├── ✅ Full system workflow (145ms)
├── ✅ API endpoints (89ms)
└── ✅ Cross-component communication (67ms)

📊 Final Results
   Test Suites: 7/8 passed (87.5%)
   Individual Tests: 24/25 passed (96.0%)
   Failures: 1 suite(s), 1 test(s)
⏱️  Total time: 369ms
```

## Writing Tests

### Basic Test Structure

```javascript
const { TestRunner, Assert, TestData } = require('../test-utils');

async function run() {
    const runner = new TestRunner('My Component Tests');
    
    runner.test('Test description', async () => {
        // Arrange
        const testData = TestData.mockEntity();
        
        // Act
        const result = await myComponent.doSomething(testData);
        
        // Assert
        Assert.exists(result, 'Result should exist');
        Assert.equals(result.status, 'success', 'Should return success');
    });
    
    const success = await runner.run();
    return {
        success,
        stats: runner.results,
        failures: runner.results.failures
    };
}

module.exports = { run };
```

### Available Assertions

```javascript
// Basic assertions
Assert.isTrue(condition, message)
Assert.isFalse(condition, message)
Assert.equals(actual, expected, message)
Assert.notEquals(actual, unexpected, message)

// Existence checks
Assert.exists(value, message)
Assert.notExists(value, message)

// Type checking
Assert.isType(value, 'string', message)
Assert.hasProperty(obj, 'propertyName', message)
Assert.arrayLength(arr, expectedLength, message)

// Async assertions
await Assert.throws(asyncFn, message)
await Assert.notThrows(asyncFn, message)
```

### Test Data Utilities

```javascript
// Generate test data
const randomString = TestData.randomString(10);
const randomEmail = TestData.randomEmail();
const mockEntity = TestData.mockEntity('Contact', { nome: 'Custom Name' });

// Track for cleanup
TestCleanup.trackEntity(entityId);
TestCleanup.trackRelation(relationId);
await TestCleanup.cleanup(dao); // Call in test teardown
```

## Test Types

### Unit Tests
- **Purpose**: Test individual components in isolation
- **Speed**: Fast (< 1 second per test suite)
- **Dependencies**: Mocked, no external services
- **Location**: `tests/unit/`

### Integration Tests
- **Purpose**: Test full system workflows
- **Speed**: Slower (several seconds per test suite)
- **Dependencies**: Real Neo4j database required
- **Location**: `tests/integration/`

### Performance Tests
- **Purpose**: Validate system performance and load handling
- **Speed**: Variable (can be long-running)
- **Dependencies**: Real database, may require test data setup
- **Location**: `tests/performance/`

## Best Practices

1. **Unit Tests First**: Write unit tests for each component
2. **Mock External Dependencies**: Use mocks for databases, APIs, file system
3. **Clear Test Names**: Use descriptive names that explain what is being tested
4. **One Assertion Per Test**: Focus each test on a single behavior
5. **Arrange-Act-Assert**: Structure tests clearly
6. **Clean Up**: Always clean up test data to prevent pollution
7. **Test Edge Cases**: Include tests for error conditions and edge cases

## For Claude AI

This testing framework is specifically designed to be easily used by Claude AI:

1. **Clear Output**: Structured, colored output makes it easy to understand results
2. **Fast Feedback**: Unit tests run quickly for rapid iteration
3. **Isolated Testing**: Each test file can be run independently
4. **Automatic Cleanup**: Test data is automatically cleaned up
5. **Verbose Mode**: `--verbose` flag provides detailed failure information

### Recommended Usage for Claude AI

```bash
# Quick validation after changes
npm test

# Detailed analysis if tests fail
npm run test:verbose

# Full system validation
npm run test:all
```

The output format is optimized for AI parsing, with clear success/failure indicators and structured error reporting.