/**
 * Core USB subsystem. Handles hotplug usb devices only. The rest must be processed by the miner drivers.
 * 
 * @module core/usb/usb
 */
const usb = require('usb/promise');
const loghelper = require('../log/helper')

class USB {
	constructor(eventBus, logger) {
		if(!eventBus) throw new Error('WorkDecoder requires even bus');
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);

		this.geb.on('app_ready', this.start.bind(this));
		this.geb.on('app_stop', this.stop.bind(this));

		this.geb.emit('usb_ready', this);
		this.info(`USB Subsystem started`);
	}

	/** Start event. App has finished its init cycle. We can start now */
	start() {
		usb.on('attach', this.onAttach.bind(this));
		usb.on('detach', this.onDetach.bind(this));

		const devs = usb.getDeviceList();
		for(var dev of devs) this.geb.emit('usb_attach', dev);
	}

	/** Stop event. App is, most likely, about to exit/terminate */
	stop() {
		usb.removeAllListeners('attach');
		usb.removeAllListeners('detach');
		this.info('Stopped')
	}

	/** USB device arrived */
	onAttach(dev) {
		this.geb.emit('usb_attach', dev);
	}
	/** USB device gone */
	onDetach(dev) {
		this.geb.emit('usb_detach', dev);
	}
}

module.exports = USB;