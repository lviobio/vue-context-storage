# vue-context-storage

Vue 3 context storage system with URL query, localStorage, and sessionStorage synchronization support.

[![npm downloads](https://img.shields.io/npm/dm/vue-context-storage.svg)](https://www.npmjs.com/package/vue-context-storage)
[![TypeScript](https://badgen.net/badge/icon/TypeScript?icon=typescript&label)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/vue-context-storage)](https://bundlephobia.com/package/vue-context-storage)
[![GitHub issues](https://img.shields.io/github/issues/lviobio/vue-context-storage)](https://github.com/lviobio/vue-context-storage/issues)
[![GitHub License](https://img.shields.io/github/license/lviobio/vue-context-storage)](https://github.com/lviobio/vue-context-storage)
![CI](https://github.com/lviobio/vue-context-storage/actions/workflows/ci.yml/badge.svg)
![Coverage](https://github.com/lviobio/vue-context-storage/actions/workflows/coverage.yml/badge.svg)
[![codecov](https://codecov.io/gh/lviobio/vue-context-storage/branch/main/graph/badge.svg)](https://codecov.io/gh/lviobio/vue-context-storage)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://lviobio.github.io/vue-context-storage/)

A powerful state management solution for Vue 3 applications that provides:
- **Context-based storage** using Vue's provide/inject API
- **Automatic URL query synchronization** for preserving state across page reloads
- **localStorage & sessionStorage handlers** for persistent and session-scoped state
- **Multiple storage contexts** with activation management
- **Type-safe** TypeScript support
- **Tree-shakeable** and lightweight

## Live Demo

🚀 **[Try the interactive playground](https://lviobio.github.io/vue-context-storage)**

## Installation

```bash
npm install vue-context-storage
```

## Features

- ✅ **Vue 3 Composition API** - Built with modern Vue patterns
- ✅ **URL Query Sync** - Automatically sync state with URL parameters
- ✅ **localStorage Handler** - Persist state to localStorage with cross-tab sync
- ✅ **sessionStorage Handler** - Session-scoped state that survives page refreshes
- ✅ **Multiple Contexts** - Support multiple independent storage contexts
- ✅ **TypeScript** - Full type safety and IntelliSense support
- ✅ **Flexible** - Works with vue-router 4+
- ✅ **Transform Helpers** - Built-in utilities for type conversion

## Basic Usage

### Option 1: Manual Component Import (Recommended)

Import ContextStorage component in your `App.vue`:

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

### Option 2: Using Vue Plugin

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

Then use components without importing in your `App.vue`:

```vue
<template>
  <ContextStorage>
    <router-view />
  </ContextStorage>
</template>
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
import { useContextStorageQueryHandler, transform } from 'vue-context-storage'

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
    page: transform.asNumber(deserialized.page, { fallback: 1 }),
    search: transform.asString(deserialized.search, { fallback: '' }),
    perPage: transform.asNumber(deserialized.perPage, { fallback: 25 }),
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

## Use localStorage Handler in Components

Persist reactive state to `localStorage`. Data is automatically synced across browser tabs.

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorageLocalStorage } from 'vue-context-storage'

const settings = reactive({
  theme: 'light',
  fontSize: 14,
  sidebarOpen: true,
})

// Automatically syncs settings with localStorage under the key "app-settings"
useContextStorageLocalStorage(settings, {
  key: 'app-settings',
})
</script>
```

### Multiple Storage Keys

Each call creates an independent storage entry:

```typescript
const userPrefs = reactive({
  language: 'en',
  notifications: true,
})

useContextStorageLocalStorage(userPrefs, {
  key: 'user-preferences',
})
```

### Configure localStorage Handler

```typescript
import { ContextStorageLocalStorageHandler } from 'vue-context-storage'

ContextStorageLocalStorageHandler.configure({
  listenToStorageEvents: true, // Cross-tab sync (default: true)
})
```

## Use sessionStorage Handler in Components

Persist reactive state to `sessionStorage`. Data survives page refreshes but is cleared when the tab is closed.

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorageSessionStorage } from 'vue-context-storage'

const formDraft = reactive({
  email: '',
  message: '',
  step: 1,
})

// Automatically syncs form draft with sessionStorage
useContextStorageSessionStorage(formDraft, {
  key: 'contact-form-draft',
})
</script>
```

### Using Prefix

Store multiple data objects under a single storage key using prefixes:

```typescript
const filters = reactive({ search: '', status: 'active' })

useContextStorageSessionStorage(filters, {
  key: 'app-state',
  prefix: 'filters', // Stored as { filters: { search: '', status: 'active' } }
})

const pagination = reactive({ page: 1, perPage: 25 })

useContextStorageSessionStorage(pagination, {
  key: 'app-state',
  prefix: 'pagination', // Stored as { filters: {...}, pagination: { page: 1, perPage: 25 } }
})
```

### Using Transform with Storage Handlers

Convert stored values to proper types when reading from storage:

```typescript
import { useContextStorageLocalStorage, transform } from 'vue-context-storage'

const settings = reactive({
  theme: 'light',
  fontSize: 14,
})

useContextStorageLocalStorage(settings, {
  key: 'app-settings',
  transform: (deserialized, initial) => ({
    theme: transform.asString(deserialized.theme, { fallback: 'light' }),
    fontSize: transform.asNumber(deserialized.fontSize, { fallback: 14 }),
  }),
})
```

### Using Zod Schemas with Storage Handlers

```typescript
import { z } from 'zod'
import { useContextStorageLocalStorage } from 'vue-context-storage'

const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  fontSize: z.number().int().positive().default(14),
  sidebarOpen: z.boolean().default(true),
})

const settings = reactive(SettingsSchema.parse({}))

useContextStorageLocalStorage(settings, {
  key: 'app-settings',
  schema: SettingsSchema,
})
```

### Custom Serialization

Provide custom serializer/deserializer functions:

```typescript
useContextStorageLocalStorage(settings, {
  key: 'app-settings',
  serializer: (data) => btoa(JSON.stringify(data)),
  deserializer: (str) => JSON.parse(atob(str)),
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

#### `useContextStorageLocalStorage<T>(data, options)`

Registers reactive data for localStorage synchronization.

**Parameters:**
- `data: MaybeRefOrGetter<T>` - Reactive reference to sync
- `options: RegisterWebStorageHandlerBaseOptions<T>`
  - `key: string` - Storage key (required)
  - `prefix?: string` - Namespace within the storage key
  - `transform?: (deserialized, initial) => T` - Transform function
  - `schema?: ZodSchema` - Zod schema for validation
  - `serializer?: (data: T) => string` - Custom serializer (default: `JSON.stringify`)
  - `deserializer?: (str: string) => unknown` - Custom deserializer (default: `JSON.parse`)

#### `useContextStorageSessionStorage<T>(data, options)`

Registers reactive data for sessionStorage synchronization. Same options as `useContextStorageLocalStorage`.

### Classes

#### `ContextStorageLocalStorageHandler`

Handler for localStorage synchronization. Supports cross-tab sync via `storage` events.

**Static Methods:**
- `configure(options): ContextStorageHandlerConstructor` - Configure global options
  - `listenToStorageEvents?: boolean` - Enable cross-tab sync (default: `true`)

#### `ContextStorageSessionStorageHandler`

Handler for sessionStorage synchronization. Data is scoped to the current tab.

**Static Methods:**
- `configure(options): ContextStorageHandlerConstructor` - Configure global options
  - `listenToStorageEvents?: boolean` - Listen to storage events (default: `false`)

### Transform Helpers

All transform helpers support nullable and missable options:

```typescript
transform.asNumber(value, {
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
import { useContextStorageQueryHandler, transform } from 'vue-context-storage'

const pagination = ref({
  page: 1,
  perPage: 25,
  total: 0,
})

useContextStorageQueryHandler(pagination, {
  prefix: 'page',
  transform: (data, initial) => ({
    page: transform.asNumber(data.page, { fallback: 1 }),
    perPage: transform.asNumber(data.perPage, { fallback: 25 }),
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

## Development

### Running Playground Locally

```bash
# Development mode (hot reload)
npm run play

# Production preview
npm run build:playground
npm run preview:playground
```

### Building

```bash
# Build library
npm run build

# Build playground for deployment
npm run build:playground
```

### Testing & Quality

```bash
# Run all checks
npm run check

# Type checking
npm run ts:check

# Linting
npm run lint

# Formatting
npm run format
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
