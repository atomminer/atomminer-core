
const loghelper = require('../../log/helper')
const AM01Device = require('../device/am01');

class AM01Driver {
	constructor(eventBus, logger) {
		if(!eventBus) throw new Error('AM01Driver requires even bus');
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);

		this._devices = {};

		this.geb.on('app_ready', this.start.bind(this));
		this.geb.on('app_stop', this.stop.bind(this));
		this.geb.on('usb_attach', this.attach.bind(this));
		this.geb.on('usb_detach', this.detach.bind(this));

		this.geb.emit('am01driver_ready', this);
	}

	/** Stop event. App is, most likely, about to exit/terminate */
	start() {
		this.updateTimer = setInterval(() => {
			this.geb.emit('device_am01_update');
		}, 100);
	}

	/** Stop event. App is, most likely, about to exit/terminate */
	stop() {
		if(this.updateTimer) clearInterval(this.updateTimer);
		for(var dev of Object.values(this._devices)) dev.close();
	}

	/** New usb device arrived event */
	attach(dev) {
		if(!dev) return;
		if(dev.__am_claimed) return;
		if(!(dev.deviceDescriptor.idVendor == 0x16d0 && dev.deviceDescriptor.idProduct == 0x0e1e)) return;
		const miner = new AM01Device(dev, this.geb, this.logger);
		miner.init().then(() => {
			this._devices[miner.id] = miner;
		}).catch(e => {
			this.error(`Device init error: ${e.message}`);
		})
	}

	/** Usb device disconnected event */
	detach(dev) {
		if(dev.id) {
			this._devices[dev.id].close();
			delete this._devices[dev.id];
		}
	}
}

module.exports = AM01Driver;