# vue-context-storage

Vue 3 context storage system with URL query synchronization support.

A powerful state management solution for Vue 3 applications that provides:
- **Context-based storage** using Vue's provide/inject API
- **Automatic URL query synchronization** for preserving state across page reloads
- **Multiple storage contexts** with activation management
- **Type-safe** TypeScript support
- **Tree-shakeable** and lightweight

## Installation

```bash
npm install vue-context-storage
```

## Features

- ✅ **Vue 3 Composition API** - Built with modern Vue patterns
- ✅ **URL Query Sync** - Automatically sync state with URL parameters
- ✅ **Multiple Contexts** - Support multiple independent storage contexts
- ✅ **TypeScript** - Full type safety and IntelliSense support
- ✅ **Flexible** - Works with vue-router 4+
- ✅ **Transform Helpers** - Built-in utilities for type conversion

## Basic Usage

### Option 1: Using Vue Plugin (Recommended)

Register the plugin in your main app file:

```typescript
import { createApp } from 'vue'
import { VueContextStoragePlugin } from 'vue-context-storage/plugin'
import App from './App.vue'

const app = createApp(App)

// Register components globally
app.use(VueContextStoragePlugin)

app.mount('#app')
```

Then use components without importing:

```vue
<template>
  <ContextStorage>
    <router-view />
  </ContextStorage>
</template>
```

### Option 2: Manual Component Import

Import components individually when needed:

```vue
<template>
  <ContextStorage>
    <router-view />
  </ContextStorage>
</template>

<script setup lang="ts">
import { ContextStorage } from 'vue-context-storage/components'
</script>
```

## Use Query Handler in Components

Sync reactive state with URL query parameters:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useContextStorageQueryHandler } from 'vue-context-storage'

interface Filters {
  search: string
  status: string
  page: number
}

const filters = reactive<Filters>({
  search: '',
  status: 'active',
  page: 1,
})

// Automatically syncs filters with URL query
useContextStorageQueryHandler(filters, {
  prefix: 'filters', // URL will be: ?filters[search]=...&filters[status]=...
})
</script>
```

## Advanced Usage

### Using Transform Helpers

Convert URL query string values to proper types:

```typescript
import { ref } from 'vue'
import { useContextStorageQueryHandler, asNumber, asString } from 'vue-context-storage'

interface TableState {
  page: number
  search: string
  perPage: number
}

const state = ref<TableState>({
  page: 1,
  search: '',
  perPage: 25,
})

useContextStorageQueryHandler(state, {
  prefix: 'table',
  transform: (deserialized, initial) => ({
    page: asNumber(deserialized.page, { fallback: 1 }),
    search: asString(deserialized.search, { fallback: '' }),
    perPage: asNumber(deserialized.perPage, { fallback: 25 }),
  }),
})
```

### Available Transform Helpers

- `asNumber(value, options)` - Convert to number
- `asString(value, options)` - Convert to string
- `asBoolean(value, options)` - Convert to boolean
- `asArray(value, options)` - Convert to array
- `asNumberArray(value, options)` - Convert to number array

### Using Zod Schemas

Alternatively, you can use [Zod](https://zod.dev/) schemas for automatic validation and type inference:

```typescript
import { z } from 'zod'
import { useContextStorageQueryHandler } from 'vue-context-storage'

// Define schema with automatic coercion
const FiltersSchema = z.object({
  search: z.string().default(''),
  page: z.coerce.number().int().positive().default(1),
  status: z.enum(['active', 'inactive']).default('active'),
})

const filters = ref(FiltersSchema.parse({}))

// Use schema for automatic validation
useContextStorageQueryHandler(filters, {
  prefix: 'filters',
  schema: FiltersSchema,
})
```

**Benefits:**
- Automatic type coercion (strings → numbers, etc.)
- Runtime validation with detailed errors
- Automatic TypeScript type inference
- Less boilerplate code
- Single source of truth for structure and validation

### Preserve Empty State

Keep empty state in URL to prevent resetting on reload:

```typescript
useContextStorageQueryHandler(filters, {
  prefix: 'filters',
  preserveEmptyState: true,
  // Empty filters will show as: ?filters
  // Without this option, empty filters would clear the URL completely
})
```

### Configure Query Handler

Customize global behavior:

```typescript
import { ContextStorageQueryHandler } from 'vue-context-storage'

ContextStorageQueryHandler.configure({
  mode: 'push', // 'replace' (default) or 'push' for history
  preserveUnusedKeys: true, // Keep other query params
  preserveEmptyState: false,
})
```

## API Reference

### Composables

#### `useContextStorageQueryHandler<T>(data, options)`

Registers reactive data for URL query synchronization.

**Parameters:**
- `data: MaybeRefOrGetter<T>` - Reactive reference to sync
- `options?: RegisterQueryHandlerOptions<T>`
  - `prefix?: string` - Query parameter prefix
  - `transform?: (deserialized, initial) => T` - Transform function
  - `preserveEmptyState?: boolean` - Keep empty state in URL
  - `mergeOnlyExistingKeysWithoutTransform?: boolean` - Only merge existing keys (default: true)

### Classes

#### `ContextStorageQueryHandler`

Main handler for URL query synchronization.

**Static Methods:**
- `configure(options): ContextStorageHandlerConstructor` - Configure global options
- `getInitialStateResolver(): () => LocationQuery` - Get initial state resolver

**Methods:**
- `register<T>(data, options): () => void` - Register data for sync
- `setEnabled(state, initial): void` - Enable/disable handler
- `setInitialState(state): void` - Set initial state

### Transform Helpers

All transform helpers support nullable and missable options:

```typescript
asNumber(value, {
  fallback: 0,      // Default value
  nullable: false,  // Allow null return
  missable: false,   // Allow undefined return
})
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import type {
  ContextStorageHandler,
  ContextStorageHandlerConstructor,
  IContextStorageQueryHandler,
  QueryValue,
  SerializeOptions,
} from 'vue-context-storage'
```

When using Zod schemas, TypeScript will automatically infer types:

```typescript
const FiltersSchema = z.object({
  search: z.string().default(''),
  page: z.coerce.number().default(1),
})

type Filters = z.infer<typeof FiltersSchema>
// Result: { search: string; page: number }
```

## Examples

### Pagination with URL Sync

```typescript
import { ref } from 'vue'
import { useContextStorageQueryHandler, asNumber } from 'vue-context-storage'

const pagination = ref({
  page: 1,
  perPage: 25,
  total: 0,
})

useContextStorageQueryHandler(pagination, {
  prefix: 'page',
  transform: (data, initial) => ({
    page: asNumber(data.page, { fallback: 1 }),
    perPage: asNumber(data.perPage, { fallback: 25 }),
    total: initial.total, // Don't sync total from URL
  })
})
```

## Peer Dependencies

- `vue`: ^3.5.0
- `vue-router`: ^4.0.0
- `zod`: ^4.0.0 (optional - only if using schema validation)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
