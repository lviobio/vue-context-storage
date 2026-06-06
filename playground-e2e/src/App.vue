<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const routes = [
  { to: '/schema-default', label: 'Schema Default' },
  { to: '/nested-default', label: 'Nested Default' },
  { to: '/query-sync', label: 'Query Sync' },
]
</script>

<template>
  <div class="layout">
    <nav class="nav">
      <span class="nav-title">e2e fixtures</span>
      <div class="nav-links">
        <RouterLink
          v-for="r in routes"
          :key="r.to"
          :to="r.to"
          class="nav-link"
          active-class="nav-link--active"
        >
          {{ r.label }}
        </RouterLink>
      </div>
    </nav>

    <main class="content">
      <ContextStorage>
        <RouterView />
      </ContextStorage>
    </main>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
  background: #f7f7f8;
  color: #1a1a1a;
}

input,
button {
  font-family: inherit;
  font-size: 13px;
}

button {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

button:hover {
  background: #f0f0f0;
}

input {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
}

input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px #6366f120;
}
</style>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.nav {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 20px;
  height: 44px;
  background: #18181b;
  color: #e4e4e7;
  flex-shrink: 0;
}

.nav-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #71717a;
}

.nav-links {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 5px 10px;
  border-radius: 5px;
  color: #a1a1aa;
  text-decoration: none;
  font-size: 13px;
  transition: color 0.15s, background 0.15s;
}

.nav-link:hover {
  color: #e4e4e7;
  background: #27272a;
}

.nav-link--active {
  color: #e4e4e7;
  background: #3f3f46;
}

.content {
  padding: 28px 24px;
  flex: 1;
}
</style>
