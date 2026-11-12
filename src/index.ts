// The New Relic agent must load before anything it instruments, and only when
// a licence key is configured (without one it just logs errors).
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (process.env.NEW_RELIC_LICENSE_KEY) require('newrelic');

import { start } from './server';

void start();
