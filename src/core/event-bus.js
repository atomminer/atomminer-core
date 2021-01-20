/**
 * Global Event Bus
 * 
 * @module core/EventBus
 */

const EventEmitter = require('events').EventEmitter;

class EventBus extends EventEmitter {
  constructor(app) {
    super();
    this.app = app;
  }
}

module.exports = EventBus;
