# vue-context-storage

Vue 3 reactive state management — sync state with the URL query, localStorage, and sessionStorage through a single type-safe composable.

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

Key features:

- **Automatic URL query sync** — painless type coercion (numbers, booleans, arrays) and nested objects
- **localStorage & sessionStorage** for persistent and session-scoped state — same API as the query handler
- **Context prefixing** to avoid key collisions when the same key is reused across instances
- **Type-safe** with optional Zod schema validation
- **Tree-shakeable** and lightweight

```ts
const filters = reactive({ search: '', page: 1 })

// reactive state ⇄ URL query — kept in sync automatically, both directions
useContextStorage('query', filters) // URL: /products?search=shoes&page=2
useContextStorage('query', filters, { key: 'filters' }) // URL: /products?filters[search]=shoes&filters[page]=2
// zod schema support with type coercion, 'page' will be converted to number
useContextStorage('query', filters, { schema: z.object({ search: z.string(), page: z.number() }) }) // URL: /products?filters[search]=shoes&filters[page]=2
// transform function support with type coercion, 'page' will be converted to number
useContextStorage('query', filters, { transform: (value) => ({ search: value.search, page: Number(value.page) }) }) // URL: /products?filters[search]=shoes&filters[page]=2
// And a lot of other features... (onlyChanges option; createEmptyObject helper for zod schemas; additional default values; passing 'key' via ContextStoragePrefix wrapper)
```

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
- **Multiple independent contexts** (e.g. two data tables on the same page) are supported out of the box through the key pattern, so query parameters never collide.

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
import { ContextStorage } from 'vue-context-storage'
</script>
```

### Option 2: Using Vue Plugin

Register the plugin in your main app file:

```typescript
import { createApp } from 'vue'
import { VueContextStoragePlugin } from 'vue-context-storage'
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
  key: 'filters',
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

**Important: Query handler type coercion.** URL query parameters are always strings. When state is restored from the URL, non-string values lose their original types — `{ page: 1 }` becomes `{ page: "1" }`, booleans become `"true"` / `"false"`, and arrays are restored as plain objects. Always use `schema` or `transform` option when using the query handler with non-string values:

```typescript
// Option 1: Zod schema (recommended)
useContextStorage('query', filters, {
  key: 'filters',
  schema: z.object({
    page: z.coerce.number().default(1),
    search: z.string().default(''),
    status: z.string().default('active'),
  }),
})

// Option 2: Transform function
import { transform } from 'vue-context-storage'

useContextStorage('query', filters, {
  key: 'filters',
  transform: (deserialized, initial) => ({
    page: transform.asNumber(deserialized.page, { fallback: initial.page }),
    search: transform.asString(deserialized.search, { fallback: initial.search }),
    status: transform.asString(deserialized.status, { fallback: initial.status }),
  }),
})
```

Without type coercion, comparisons like `page === 1` will silently fail after URL restore (the actual value will be `"1"`). The library emits a runtime `console.warn` when it detects non-string values registered without `schema` or `transform`.

Options are type-checked per handler — `'query'` accepts query options, `'localStorage'` and `'sessionStorage'` require a `key`, etc.

You can also pass an injection key directly instead of a string:

```typescript
import { contextStorageQueryHandlerInjectKey } from 'vue-context-storage'

useContextStorage(contextStorageQueryHandlerInjectKey, filters, {
  key: 'filters',
})
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
  key: 'filters', // URL will be: ?filters[search]=...&filters[status]=...
})
</script>
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
  key: 'table',
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
- `asObjectArray(value, options)` - Convert indexed object to array of objects (see [Arrays of Objects](#arrays-of-objects))

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
  key: 'filters',
  schema: FiltersSchema,
})
```

**Benefits:**

- Automatic type coercion (strings → numbers, etc.)
- Runtime validation with detailed errors
- Automatic TypeScript type inference
- Less boilerplate code
- Single source of truth for structure and validation

### Arrays of Objects

The query handler supports arrays of objects. They are serialized as indexed query parameters:

```
?items[0][product]=Apple&items[0][quantity]=5&items[1][product]=Banana&items[1][quantity]=10
```

After deserialization, URL parameters produce indexed objects (`{ '0': {...}, '1': {...} }`) rather than arrays. Use `transform.asObjectArray` or the Zod helper `zObjectArray` to convert them back.

**With transform helpers:**

```typescript
import { reactive } from 'vue'
import { useContextStorage, transform } from 'vue-context-storage'

const data = reactive({
  title: '',
  items: [] as { product: string; quantity: number }[],
})

useContextStorage('query', data, {
  transform: (value) => ({
    title: transform.asString(value.title),
    items: transform.asObjectArray(value.items, (entry) => ({
      product: transform.asString(entry.product),
      quantity: transform.asNumber(entry.quantity),
    })),
  }),
})
```

`asObjectArray` also supports a callback shorthand — pass a function as the second argument instead of an options object.

**With Zod schema:**

```typescript
import { z } from 'zod'
import { zObjectArray } from 'vue-context-storage/zod'

const ItemSchema = z.object({
  product: z.string().default(''),
  quantity: z.coerce.number().default(0),
})

const DataSchema = z.object({
  title: z.string().default(''),
  items: zObjectArray(ItemSchema),
})

useContextStorage('query', data, { schema: DataSchema })
```

See [Zod Helpers](#zod-helpers-vue-context-storagezod) for more details.

### Preserve Empty State

Keep empty state in URL to prevent resetting on reload:

```typescript
useContextStorage('query', filters, {
  key: 'filters',
  preserveEmptyState: true,
  // Empty filters will show as: ?filters
  // Without this option, empty filters would clear the URL completely
})
```

### Additional Default Data

When `onlyChanges` is enabled (the default), a key is omitted from the URL if its current value matches the initial snapshot. `additionalDefaultData` lets you specify extra values that should also be treated as defaults and excluded from the URL.

This is useful when the initial reactive data starts with `undefined` (e.g. before an API response), but you also want a specific value (like `1`) to be considered a default:

```typescript
const data = ref({ page: undefined as number | undefined })

useContextStorage('query', data, {
  key: 'filters',
  onlyChanges: true,
  additionalDefaultData: { page: 1 },
})

// page=undefined → not in query (matches initial)
// page=1         → not in query (matches additionalDefaultData)
// page=2         → appears in query as ?filters[page]=2
```

When using Zod schemas, you can also specify `additionalDefaultData` per-field via `.meta()` instead of (or in addition to) the option:

```typescript
const Schema = z.object({
  page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
  search: z.string().default(''),
})

const data = reactive({ page: undefined as number | undefined, search: '' })

useContextStorage('query', data, {
  key: 'filters',
  schema: Schema,
})

// page=1 → not in query (matches default from schema)
// page=2 → appears in query as ?filters[page]=2
// page=3 → not in query (matches additionalDefaultData from schema meta)
```

A field's schema `.default(...)` value is itself treated as a default baseline: a value equal to it is omitted from the URL, exactly like the initial snapshot and `additionalDefaultData`. So both the `.default()` value and any `.meta({ additionalDefaultData })` value are excluded, while every other value appears in the query.

Each source of defaults is an **independent baseline** — the initial snapshot, the option-level `additionalDefaultData`, the schema `.meta({ additionalDefaultData })`, and the schema `.default()`. A value is omitted from the URL if it matches **any** of them, so they never overwrite each other (e.g. a field can have a `.default()` of `1`, a meta value of `5`, and an option value of `3`, and all three are excluded).

Nested objects work the same way. Following the documented best practice of declaring `.default()` at the object level, a value matching the nested default is omitted too:

```typescript
const Schema = z.object({
  filters: z
    .object({
      page: z.coerce.number(),
      sort: z.string(),
    })
    .default({ page: 1, sort: 'asc' }),
})

const data = reactive({
  filters: { page: undefined as number | undefined, sort: undefined as string | undefined },
})

useContextStorage('query', data, { key: 'q', schema: Schema })

// filters = { page: 1, sort: 'asc' }  → not in query (matches the nested default)
// filters = { page: 2, sort: 'asc' }  → ?q[filters][page]=2 (sort matches default, omitted)
// filters = { page: 2, sort: 'desc' } → ?q[filters][page]=2&q[filters][sort]=desc
```

Field-level defaults inside a nested object take priority over the object-level default and fill in any fields the object-level default omits.

### Configure Query Handler

Customize behavior by passing options to the factory:

```vue
<template>
  <!-- Override a single default handler without listing all of them -->
  <ContextStorage :additional-handlers="[createQueryHandler({ mode: 'push' })]">
    <RouterView />
  </ContextStorage>
</template>
```

The `additional-handlers` prop merges with the default handlers, replacing any handler of the same type (matched by injection key). This is the recommended way to customize a single handler.

If you need full control over all handlers, use the `handlers` prop instead:

```typescript
import {
  createQueryHandler,
  createLocalStorageHandler,
  createSessionStorageHandler,
} from 'vue-context-storage'

const customHandlers = [
  createQueryHandler({
    mode: 'push', // 'replace' (default) or 'push' for history
    preserveUnusedKeys: false, // Default is true — set to false for exclusive query ownership
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

### Multiple Registrations Under One Root Key

Use bracket notation in `key` to store multiple data objects under a common root:

```typescript
const filters = reactive({ search: '', status: 'active' })

useContextStorage('sessionStorage', filters, {
  key: 'app-state[filters]', // Storage key: 'app-state[filters]'
})

const pagination = reactive({ page: 1, perPage: 25 })

useContextStorage('sessionStorage', pagination, {
  key: 'app-state[pagination]', // Storage key: 'app-state[pagination]'
})
```

Or use `<ContextStoragePrefix>` for automatic scoping (see [Prefix Scoping](#prefix-scoping-with-contextstorageprefix)).

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
import { useContextStorage } from 'vue-context-storage'

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

Inside `MyTable`, any `useContextStorage('query', data)` call will automatically get `key: 'tables'`. If the composable also specifies its own key, they are combined:

```typescript
// Inside MyTable — effective key becomes 'table[filters]'
useContextStorage('query', filters, { key: 'filters' })
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

## Registering Custom Handlers

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

### Handler Factories

#### `createQueryHandler(options?)`

Creates a query handler factory for URL query synchronization.

**Options:**

- `mode?: 'replace' | 'push'` - Router navigation mode (default: `'replace'`)
- `preserveUnusedKeys?: boolean` - Keep other query params (default: `true`)
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

## Zod Helpers (`vue-context-storage/zod`)

The library provides a separate entry point with Zod-specific helpers. Since `zod` is an optional peer dependency, these helpers are isolated in `vue-context-storage/zod` to avoid importing Zod in the main bundle.

```bash
npm install zod
```

### `zObjectArray(itemSchema)`

Creates a Zod schema for arrays of objects serialized as indexed query parameters. Wraps `z.record()` + `.transform()` to convert indexed objects back to sorted arrays.

```typescript
import { z } from 'zod'
import { zObjectArray } from 'vue-context-storage/zod'

const ItemSchema = z.object({
  product: z.string().default(''),
  quantity: z.coerce.number().default(0),
})

const DataSchema = z.object({
  title: z.string().default(''),
  items: zObjectArray(ItemSchema),
})
```

### Automatic Type Coercion

When a `schema` is provided, the library automatically coerces URL query parameter values to match the expected Zod types before validation. This handles two common URL serialization quirks:

#### Array Coercion

A URL with multiple values (`?ids=1&ids=2`) produces an array `['1', '2']`, but a single value (`?ids=1`) produces just `'1'`. Without correction, `z.string().array()` would reject the single-value case with `"expected array, received string"`.

The library introspects the Zod schema before validation and wraps non-array values into single-element arrays wherever the schema expects `.array()`. This works recursively for nested objects. **No special helpers are needed** — plain `.array()` schemas work out of the box:

```typescript
const Schema = z.object({
  tags: z.string().array().default([]),
  ids: z.coerce.number().array().default([]),
  statuses: z.enum(['active', 'inactive']).array().default([]),
  filters: z
    .object({
      categories: z.string().array().default([]),
    })
    .default({ categories: [] }),
})

// All of these work automatically:
// ?tags=vue          → { tags: ['vue'], ... }
// ?tags=vue&tags=ts  → { tags: ['vue', 'ts'], ... }
// (no tags param)    → { tags: [], ... }
```

#### Boolean Coercion

The query handler serializes booleans as `'1'`/`'0'` strings in URL parameters (e.g. `?active=1`). Standard `z.coerce.boolean()` cannot be used because `Boolean('0')` is `true` in JavaScript. The library automatically converts `'1'` → `true` and `'0'` → `false` when the schema expects a boolean field. **No special helpers are needed** — plain `z.boolean()` works out of the box:

```typescript
const Schema = z.object({
  active: z.boolean().default(false),
  enabled: z.boolean().default(true),
})

// ?active=1  → { active: true, enabled: true }
// ?active=0  → { active: false, enabled: true }
```

### `createSchemaObject(schema, options?)`

Creates a plain object with empty/default values based on a Zod schema. Useful for initializing reactive data from a schema definition.

```typescript
import { z } from 'zod'
import { createSchemaObject } from 'vue-context-storage/zod'

const FiltersSchema = z.object({
  search: z.string().default(''),
  page: z.coerce.number().default(1),
  active: z.boolean().default(false),
  score: z.number().nullable(),
})

const filters = reactive(createSchemaObject(FiltersSchema))
// Result: { search: '', page: 1, active: false, score: null }
```

**Options:**

- `useDefaults` (default: `true`) — When `true`, uses `.default()` values from the schema. When `false`, uses type-based empty values (`''` for strings, `0` for numbers, `false` for booleans, etc.).
- `withSchema` (default: `false`) — When `true`, attaches the schema to the result object via `SCHEMA_SYMBOL` (wrapped with `markRaw`). Nested objects also receive their respective schemas.

```typescript
import { createSchemaObject, SCHEMA_SYMBOL } from 'vue-context-storage/zod'

const data = createSchemaObject(FiltersSchema, { withSchema: true })
data[SCHEMA_SYMBOL] // → FiltersSchema
```

**Type-based defaults** (when `useDefaults: false` or no `.default()` is set):

| Zod type      | Default value                                |
| ------------- | -------------------------------------------- |
| `z.string()`  | `''`                                         |
| `z.number()`  | `0` (respects `.min()` / `.positive()`)      |
| `z.boolean()` | `false`                                      |
| `z.array()`   | `[]`                                         |
| `z.object()`  | Recursively created via `createSchemaObject` |
| `z.date()`    | `null`                                       |
| `.nullable()` | `null`                                       |
| `.optional()` | `undefined`                                  |

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
import { useContextStorage, transform } from 'vue-context-storage'

const pagination = ref({
  page: 1,
  perPage: 25,
  total: 0,
})

useContextStorage('query', pagination, {
  key: 'page',
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
