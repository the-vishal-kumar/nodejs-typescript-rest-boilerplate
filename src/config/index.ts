import mongoConfig from './mongo-config';
import { AppConfig, loadConfig } from './env';

let cached: AppConfig | undefined;

/** Validated configuration, loaded from process.env on first use. */
const getConfig = (): AppConfig => {
  if (!cached) cached = loadConfig();
  return cached;
};

export { mongoConfig, getConfig, loadConfig, AppConfig };
