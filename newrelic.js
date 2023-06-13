'use strict';

const {
  NEW_RELIC_APP_NAME,
  NEW_RELIC_LICENSE_KEY,
  NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED,
  NEW_RELIC_APPLICATION_LOGGING_FORWARDING_MAX_SAMPLES_STORED,
  NEW_RELIC_APPLICATION_LOGGING_LOCAL_DECORATING_ENABLED,
} = process.env;
/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: [NEW_RELIC_APP_NAME],
  /**
   * Your New Relic license key.
   */
  license_key: NEW_RELIC_LICENSE_KEY,
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'info',
  },
  /**
   * When true, all request headers except for those listed in attributes.exclude
   * will be captured for all traces, unless otherwise specified in a destination's
   * attributes include/exclude lists.
   */
  allow_all_headers: true,
  attributes: {
    /**
     * Prefix of attributes to exclude from all destinations. Allows * as wildcard
     * at end.
     *
     * NOTE: If excluding headers, they must be in camelCase form to be filtered.
     *
     * @env NEW_RELIC_ATTRIBUTES_EXCLUDE
     */
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*',
    ],
  },
  application_logging: {
    local_decorating: {
      enabled: NEW_RELIC_APPLICATION_LOGGING_LOCAL_DECORATING_ENABLED
        ? Boolean(NEW_RELIC_APPLICATION_LOGGING_LOCAL_DECORATING_ENABLED)
        : true,
    },
    forwarding: {
      enabled: NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED
        ? Boolean(NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED)
        : true,
      max_samples_stored: NEW_RELIC_APPLICATION_LOGGING_FORWARDING_MAX_SAMPLES_STORED
        ? Number(NEW_RELIC_APPLICATION_LOGGING_FORWARDING_MAX_SAMPLES_STORED)
        : 100000,
    },
  },
};
