# Tests

Comprehensive test suite for vue-context-storage package.

## Test Structure

### Unit Tests

#### `transform-helpers.test.ts` (54 tests)
Tests for query parameter transform helpers:
- `asNumber()` - number conversion with nullable/missable options
- `asString()` - string conversion with allowed values
- `asBoolean()` - boolean parsing from strings
- `asArray()` - array wrapping and transformation
- `asNumberArray()` - number array conversion

#### `serialization-helpers.test.ts` (32 tests)
Tests for URL query parameter serialization:
- `serializeParams()` - object to query string conversion
- `deserializeParams()` - query string to object conversion
- Nested object handling
- Prefix support
- Roundtrip integrity

#### `zod-integration.test.ts` (22 tests)
Tests for Zod schema validation integration:
- Basic schema validation
- Nested objects with defaults
- Array schemas
- Type coercion (string → number, etc.)
- Validation constraints
- Error handling

#### `collection.test.ts` (24 tests)
Tests for CollectionManager class:
- Initialization and ready state
- Adding/removing items
- Finding items by key
- Setting active item
- Handler lifecycle (setEnabled calls)
- Callbacks on active change
- Complex scenarios with multiple items

### Test Utilities

#### `utils/test-helpers.ts`
Helper functions for testing:
- `createTestRouter()` - Creates mock Vue Router
- `setupRouter()` - Navigates and waits for router ready
- `delay()` - Promise-based delay
- `waitFor()` - Waits for condition to be true
- `createNestedQuery()` - Creates nested query parameters

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/transform-helpers.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Environment

- **Framework**: Vitest
- **Environment**: jsdom
- **TypeScript**: Full type checking enabled
- **Vue**: @vue/test-utils for component testing

## Writing New Tests

When adding new tests:

1. Use descriptive `describe` blocks for organization
2. Use clear test names: "should do X when Y"
3. Follow AAA pattern: Arrange, Act, Assert
4. Add edge cases and error scenarios
5. Use TypeScript for type safety

Example:

```typescript
describe('myFunction', () => {
  describe('basic usage', () => {
    it('should return expected value for valid input', () => {
      const result = myFunction('valid')
      expect(result).toBe('expected')
    })
  })

  describe('edge cases', () => {
    it('should handle null input', () => {
      const result = myFunction(null)
      expect(result).toBe(undefined)
    })
  })
})
```
