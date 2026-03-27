#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

async function main() {
  const source = fs.readFileSync(path.join(__dirname, 'public', 'observers.js'), 'utf8');

  let pageDef = null;
  const storage = {};
  const obsContent = {
    innerHTML: '',
    querySelectorAll: () => [],
  };
  const obsRegionFilter = {};

  const sandbox = {
    console,
    setInterval,
    clearInterval,
    localStorage: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
    },
    document: {
      getElementById: (id) => {
        if (id === 'obsContent') return obsContent;
        if (id === 'obsRegionFilter') return obsRegionFilter;
        return null;
      },
    },
    RegionFilter: {
      init: () => {},
      onChange: () => null,
      offChange: () => {},
      getSelected: () => null,
    },
    debouncedOnWS: (fn) => fn,
    offWS: () => {},
    api: async () => ({
      observers: [
        { id: 'obs-b', name: 'Beta', iata: 'SFO', last_seen: '2026-03-27T10:00:00.000Z', packet_count: 5, packetsLastHour: 2, first_seen: '2026-03-01T10:00:00.000Z' },
        { id: 'obs-a', name: 'Alpha', iata: 'SJC', last_seen: '2026-03-27T12:00:00.000Z', packet_count: 10, packetsLastHour: 7, first_seen: '2026-02-01T10:00:00.000Z' },
      ],
    }),
    CLIENT_TTL: { observers: 1000 },
    makeColumnsResizable: () => {},
    timeAgo: () => 'just now',
    goto: () => {},
    registerPage: (name, def) => {
      if (name === 'observers') pageDef = def;
    },
  };

  vm.runInNewContext(source, sandbox, { filename: 'public/observers.js' });
  assert(pageDef && typeof pageDef.init === 'function', 'observers page is registered');

  const app = { innerHTML: '', addEventListener: () => {} };
  pageDef.init(app);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert(obsContent.innerHTML.includes('id="obsTable"'), 'observers table renders');
  assert(!obsContent.innerHTML.includes('Error loading observers:'), 'observers page does not render load error');

  console.log('test-observers: all tests passed');
}

main().catch((err) => {
  console.error('test-observers: failed');
  console.error(err);
  process.exit(1);
});
