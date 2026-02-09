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
- ✅ **Flexible** - Works with vue-router 4+ or 5+
- ✅ **Transform Helpers** - Built-in utilities for type conversion

## Motivation

In Vue applications, reactive state often needs to live beyond a single component. Filters, pagination, sorting, and user preferences must survive page reloads, be shareable via URL, or persist across sessions. Solving this typically means writing the same boilerplate over and over: manually reading and writing query parameters with vue-router, serializing objects to localStorage, handling type coercion from URL strings, and keeping everything in sync.

`vue-context-storage` eliminates that repetitive work. You declare your reactive state once, point it at a storage target, and the library handles the rest:

- **URL query parameters** stay in sync with your data automatically - users can bookmark or share a page and get the exact same state back.
- **localStorage and sessionStorage** are kept up to date without manual `getItem`/`setItem` calls, including cross-tab synchronization.
- **Type safety** is preserved end-to-end: URL strings are coerced back to numbers, booleans, and arrays via transform helpers or Zod schemas.
- **Multiple independent contexts** (e.g. two data tables on the same page) are supported out of the box through the prefix pattern, so query parameters never collide.

The goal is a single, declarative API - `useContextStorage('query', data, options)` - that replaces scattered watchers, router guards, and storage listeners with one composable call per piece of state.

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

## Unified Composable

`useContextStorage()` provides a single entry point for all handler types:

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorage } from 'vue-context-storage'

const filters = reactive({
  search: '',
  status: 'active',
  page: 1,
})

// Sync with URL query
useContextStorage('query', filters, {
  prefix: 'filters',
})

// Sync with localStorage
useContextStorage('localStorage', filters, {
  key: 'saved-filters',
})

// Sync with sessionStorage
useContextStorage('sessionStorage', filters, {
  key: 'temp-filters',
})
</script>
```

Options are type-checked per handler — `'query'` accepts query options, `'localStorage'` and `'sessionStorage'` require a `key`, etc.

You can also pass an injection key directly instead of a string:

```typescript
import { contextStorageQueryHandlerInjectKey } from 'vue-context-storage'

useContextStorage(contextStorageQueryHandlerInjectKey, filters, {
  prefix: 'filters',
})
```

### Registering Custom Handlers

Register your own handlers at runtime and extend the type map for full type safety:

```typescript
import { defineContextStorageHandler } from 'vue-context-storage'
import { myHandlerInjectionKey } from './my-handler'

// Runtime registration
defineContextStorageHandler('myHandler', myHandlerInjectionKey)

// TypeScript augmentation (e.g. in a .d.ts or at module level)
declare module 'vue-context-storage' {
  interface ContextStorageHandlerMap {
    myHandler: { key: string }
  }
}

// Now fully type-checked
useContextStorage('myHandler', data, { key: 'example' })
```

## Prefix Scoping with `<ContextStoragePrefix>`

The `<ContextStoragePrefix>` component adds a prefix to all `useContextStorage` calls within its subtree. Prefixes stack when nested, and are concatenated with bracket notation.

### Basic Usage

```vue
<template>
  <ContextStoragePrefix name="table">
    <MyTable />
  </ContextStoragePrefix>
</template>
```

Inside `MyTable`, any `useContextStorage('query', data)` call will automatically get `prefix: 'tables'`. If the composable also specifies its own prefix, they are combined:

```typescript
// Inside MyTable — effective prefix becomes 'table[filters]'
useContextStorage('query', filters, { prefix: 'filters' })
// URL: ?table[filters][search]=...
```

### Stacking Prefixes

Nested `<ContextStoragePrefix>` components stack their prefixes:

```vue
<ContextStoragePrefix name="tables">
  <ContextStoragePrefix name="first">
    <!-- All handlers here get prefix 'tables[first]' -->
    <!-- useContextStorage('query', data) → URL: ?tables[first][search]=... -->
    <!-- useContextStorage('localStorage', data, { key: 'state' }) → key: 'state[tables][first]' -->
  </ContextStoragePrefix>
</ContextStoragePrefix>
```

### Per-Handler Prefixes

Pass an object to apply different prefixes per handler type:

```vue
<ContextStoragePrefix :name="{ query: 'url-tables', localStorage: 'ls-data' }">
  <!-- query handler gets prefix 'url-tables' -->
  <!-- localStorage handler gets prefix 'ls-data' -->
  <!-- sessionStorage handler gets no prefix (not specified) -->
</ContextStoragePrefix>
```

### Dynamic Prefix

When the `name` prop changes, all descendant components are re-created and re-registered with the new prefix:

```vue
<ContextStoragePrefix :name="activeTab">
  <TabContent />
</ContextStoragePrefix>
```

## Use Query Handler in Components

Sync reactive state with URL query parameters:

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorage } from 'vue-context-storage'

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
useContextStorage('query', filters, {
  prefix: 'filters', // URL will be: ?filters[search]=...&filters[status]=...
})
</script>
```

Also available as a dedicated composable:

```typescript
import { useContextStorageQueryHandler } from 'vue-context-storage'

useContextStorageQueryHandler(filters, {
  prefix: 'filters',
})
```

## Advanced Usage

### Using Transform Helpers

Convert URL query string values to proper types:

```typescript
import { ref } from 'vue'
import { useContextStorage, transform } from 'vue-context-storage'

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

useContextStorage('query', state, {
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
import { useContextStorage } from 'vue-context-storage'

// Define schema with automatic coercion
const FiltersSchema = z.object({
  search: z.string().default(''),
  page: z.coerce.number().int().positive().default(1),
  status: z.enum(['active', 'inactive']).default('active'),
})

const filters = ref(FiltersSchema.parse({}))

// Use schema for automatic validation
useContextStorage('query', filters, {
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
useContextStorage('query', filters, {
  prefix: 'filters',
  preserveEmptyState: true,
  // Empty filters will show as: ?filters
  // Without this option, empty filters would clear the URL completely
})
```

### Configure Query Handler

Customize behavior by passing options to the factory:

```typescript
import { createQueryHandler, createLocalStorageHandler, createSessionStorageHandler } from 'vue-context-storage'

const customHandlers = [
  createQueryHandler({
    mode: 'push', // 'replace' (default) or 'push' for history
    preserveUnusedKeys: true, // Keep other query params
    preserveEmptyState: false,
  }),
  createLocalStorageHandler(),
  createSessionStorageHandler(),
]

// Pass to ContextStorage or ContextStorageCollection component:
// <ContextStorage :handlers="customHandlers">
```

## Use localStorage Handler in Components

Persist reactive state to `localStorage`. Data is automatically synced across browser tabs.

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorage } from 'vue-context-storage'

const settings = reactive({
  theme: 'light',
  fontSize: 14,
  sidebarOpen: true,
})

// Automatically syncs settings with localStorage under the key "app-settings"
useContextStorage('localStorage', settings, {
  key: 'app-settings',
})
</script>
```

Also available as a dedicated composable:

```typescript
import { useContextStorageLocalStorage } from 'vue-context-storage'

useContextStorageLocalStorage(settings, {
  key: 'app-settings',
})
```

### Configure localStorage Handler

```typescript
import { createLocalStorageHandler } from 'vue-context-storage'

const customLocalStorage = createLocalStorageHandler({
  listenToStorageEvents: true, // Cross-tab sync (default: true)
})
```

## Use sessionStorage Handler in Components

Persist reactive state to `sessionStorage`. Data survives page refreshes but is cleared when the tab is closed.

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorage } from 'vue-context-storage'

const formDraft = reactive({
  email: '',
  message: '',
  step: 1,
})

// Automatically syncs form draft with sessionStorage
useContextStorage('sessionStorage', formDraft, {
  key: 'contact-form-draft',
})
</script>
```

Also available as a dedicated composable:

```typescript
import { useContextStorageSessionStorage } from 'vue-context-storage'

useContextStorageSessionStorage(formDraft, {
  key: 'contact-form-draft',
})
```

### Using Prefix

The prefix is appended to the storage key in bracket notation, so each prefixed registration gets its own storage entry:

```typescript
const filters = reactive({ search: '', status: 'active' })

useContextStorage('sessionStorage', filters, {
  key: 'app-state',
  prefix: 'filters', // Storage key: 'app-state[filters]', value: { search: '', status: 'active' }
})

const pagination = reactive({ page: 1, perPage: 25 })

useContextStorage('sessionStorage', pagination, {
  key: 'app-state',
  prefix: 'pagination', // Storage key: 'app-state[pagination]', value: { page: 1, perPage: 25 }
})
```

### Using Transform with Storage Handlers

Convert stored values to proper types when reading from storage:

```typescript
import { useContextStorage, transform } from 'vue-context-storage'

const settings = reactive({
  theme: 'light',
  fontSize: 14,
})

useContextStorage('localStorage', settings, {
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

useContextStorage('localStorage', settings, {
  key: 'app-settings',
  schema: SettingsSchema,
})
```

### Custom Serialization

Provide custom serializer/deserializer functions:

```typescript
useContextStorage('localStorage', settings, {
  key: 'app-settings',
  serializer: (data) => btoa(JSON.stringify(data)),
  deserializer: (str) => JSON.parse(atob(str)),
})
```

## API Reference

### Composables

#### `useContextStorage(type, data, options)`

Unified composable that delegates to the correct handler based on `type`.

**Parameters:**

- `type: 'query' | 'localStorage' | 'sessionStorage' | InjectionKey` - Handler type or injection key
- `data: MaybeRefOrGetter<T>` - Reactive reference to sync
- `options` - Handler-specific options (type-checked per handler)

**Returns:** `{ data, stop, reset, wasChanged }`

- `data` - The reactive reference passed in
- `stop()` - Unregister and stop syncing (called automatically on unmount)
- `reset()` - Restore data to its initial state
- `wasChanged: ComputedRef<boolean>` - Whether data differs from initial state

**Custom handler registration:**

- `defineContextStorageHandler(name, injectionKey)` - Register a custom handler
- `resolveHandlerInjectionKey(type)` - Look up an injection key by name

#### `useContextStorageQueryHandler<T>(data, options)`

Registers reactive data for URL query synchronization.

**Parameters:**

- `data: MaybeRefOrGetter<T>` - Reactive reference to sync
- `options?: RegisterQueryHandlerOptions<T>`
  - `prefix?: string` - Query parameter prefix
  - `transform?: (deserialized, initial) => T` - Transform function
  - `preserveEmptyState?: boolean` - Keep empty state in URL
  - `mergeOnlyExistingKeysWithoutTransform?: boolean` - Only merge existing keys (default: true)

### Handler Factories

#### `createQueryHandler(options?)`

Creates a query handler factory for URL query synchronization.

**Options:**

- `mode?: 'replace' | 'push'` - Router navigation mode (default: `'replace'`)
- `preserveUnusedKeys?: boolean` - Keep other query params (default: `false`)
- `preserveEmptyState?: boolean` - Preserve empty state in URL (default: `false`)
- `emptyPlaceholder?: string` - Placeholder for empty state (default: `'_'`)
- `onlyChanges?: boolean` - Only write changed values to URL (default: `true`)

#### `createLocalStorageHandler(options?)`

Creates a localStorage handler factory.

**Options:**

- `listenToStorageEvents?: boolean` - Enable cross-tab sync (default: `true`)

#### `createSessionStorageHandler(options?)`

Creates a sessionStorage handler factory.

**Options:**

- `listenToStorageEvents?: boolean` - Listen to storage events (default: `false`)

#### `useContextStorageLocalStorage<T>(data, options)`

Registers reactive data for localStorage synchronization.

**Parameters:**

- `data: MaybeRefOrGetter<T>` - Reactive reference to sync
- `options: RegisterWebStorageHandlerBaseOptions<T>`
  - `key: string` - Storage key (required)
  - `prefix?: string` - Appended to the storage key in bracket notation (e.g. key `'app'` + prefix `'filters'` = storage key `'app[filters]'`)
  - `transform?: (deserialized, initial) => T` - Transform function
  - `schema?: ZodSchema` - Zod schema for validation
  - `serializer?: (data: T) => string` - Custom serializer (default: `JSON.stringify`)
  - `deserializer?: (str: string) => unknown` - Custom deserializer (default: `JSON.parse`)

#### `useContextStorageSessionStorage<T>(data, options)`

Registers reactive data for sessionStorage synchronization. Same options as `useContextStorageLocalStorage`.

### Components

#### `<ContextStoragePrefix>`

Scopes a prefix for all descendant `useContextStorage` calls via provide/inject.

**Props:**

- `name: string | Partial<Record<string, string>>` (required) - Prefix to apply. A string applies to all handlers; an object applies per handler type (e.g. `{ query: 'q', localStorage: 'ls' }`)

Nested `<ContextStoragePrefix>` components stack their prefixes using bracket notation. When `name` changes dynamically, all descendant components are re-created.

### Transform Helpers

All transform helpers support nullable and missable options:

```typescript
transform.asNumber(value, {
  fallback: 0, // Default value
  nullable: false, // Allow null return
  missable: false, // Allow undefined return
})
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import type {
  ContextStorageHandler,
  ContextStorageHandlerFactory,
  QueryValue,
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
  }),
})
```

## Peer Dependencies

- `vue`: ^3.0.0
- `vue-router`: ^4.0.0 || ^5.0.0
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
