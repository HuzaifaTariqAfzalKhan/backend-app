'use strict';

/**
 * grocery service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::grocery.grocery');
