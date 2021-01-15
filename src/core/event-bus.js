/**
 * Global Event Bus
 * 
 * @module core/EventBus
 */

const EventEmitter = require('events').EventEmitter;

class EventBus extends EventEmitter {
  constructor() {
    super();
  }
}

/** Event Bus Singleton */
const bus = new EventBus();

module.exports = bus;
