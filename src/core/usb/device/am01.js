
const loghelper = require('../../log/helper')
const uuid = require('../../../utils/uuid');
const hex = require('../../../utils/hex');
const diff = require('../../../utils/diff');
const swap = require('../../../utils/swap');
const chalk = require('chalk');

const keccak = require('../../../mining/crypto/keccak');

// ref: https://vovkos.github.io/doxyrest/samples/libusb/enum_libusb_error.html
// enum libusb_error {
// 	LIBUSB_SUCCESS             = 0,
// 	LIBUSB_ERROR_IO            = -1,
// 	LIBUSB_ERROR_INVALID_PARAM = -2,
// 	LIBUSB_ERROR_ACCESS        = -3,
// 	LIBUSB_ERROR_NO_DEVICE     = -4,
// 	LIBUSB_ERROR_NOT_FOUND     = -5,
// 	LIBUSB_ERROR_BUSY          = -6,
// 	LIBUSB_ERROR_TIMEOUT       = -7,
// 	LIBUSB_ERROR_OVERFLOW      = -8,
// 	LIBUSB_ERROR_PIPE          = -9,
// 	LIBUSB_ERROR_INTERRUPTED   = -10,
// 	LIBUSB_ERROR_NO_MEM        = -11,
// 	LIBUSB_ERROR_NOT_SUPPORTED = -12,
// 	LIBUSB_ERROR_OTHER         = -99,
// };

class AM01 {
	constructor(dev, eventBus, logger) {
		if(!eventBus) throw new Error('AM01Device requires even bus');
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);

		this.geb.on('device_am01_update', this.update.bind(this));

		this.dev = dev;
		this.oldnonce = [];
		this.accepted = 0;
		this.rejected = 0;
		this.hw = 0; // todo
	}

	name = chalk.whiteBright('AM01');

	/** Init device */
	async init() {
		try {
			this.dev.open(); // LIBUSB_ERROR_ACCESS
			this.dev.interface(0).claim(); // LIBUSB_ERROR_BUSY
			this.serial = await this.dev.getStringDescriptor(this.dev.deviceDescriptor.iSerialNumber);
			this.dev.serial = this.serial; // just in case
			const buff = await this.dev.controlTransfer(0xb2, 0x01, 0, 0, 64);
			this.meta0 = buff.readUInt32LE(0);
			this.meta1 = buff.readUInt32LE(4);
			this.meta = this.meta0 ^ this.meta1;
			const idx = buff.indexOf(0, 8);
			this.bios = buff.slice(8, idx - 9).toString('utf8');
		}
		catch(e) {
			if(e.errno == -1) return; // could happen if device disconnects during the transfer
			else if(e.errno == -3) return; // todo: notify user that access is denied
			else if(e.errno == -4) return; // LIBUSB_ERROR_NO_DEVICE. pretty normal here if device disconnected
			else if(e.errno == -6) return; // device is already claimed. todo: notify user that device is in use
			else { // actual errors
				this.error(`${e.errno ? ('ERRNO: ' + e.errno + '; ') : ''}${e.message}`);
				this.dev.__am_claimed = false;
				this.inError = false;
				this.initError = e;
				return;
			}
		}

		this.dev.__am_claimed = true;
		if(!this.dev.id) this.dev.id = uuid();

		this.info(`New Device: ${this.serial} with ID ${this.id}`);
		this.debug(`   BIOS: ${this.bios}`);
		this.geb.emit('miner_connected', this);

		// read what it is up to right now
		setImmediate(() => {
			this.update();
		})
	}

	/** Close device */
	close() {
		if(this.dev && this.dev.id && this.dev.__am_claimed) {
			this.debug(`Closing device ${this.serial || ''} with ID: ${this.id}`);
			this.dev.interface(0).release().catch(e => {
				// LIBUSB_ERROR_NO_DEVICE is expected here
				if(e.errno != -4) this.warn(`Close device error: ${e.message}`);
			}).finally(() => {
				this.info(`Device disconnected: ${this.serial}`);
				delete this.dev.__am_claimed;
				this.geb.emit('miner_disconnected', this);
			})
		}
	}

	/** Get internal device ID */
	get id() { return this.dev.id; }

	/** Update device registers and/or status */
	update() {
		this.dev.controlTransfer(0xb2, 0x06, 0, 0, 128).then((status) => {
			if(status.length != 128) {
				return this.error(`Status size error. Received: ${status.length}`);
			}
			this.parseStatus(status);
		});
	}

	/**
	 * Parse device status and fill in this status field accordingly
	 * @inner
	 */
	parseStatus(buff) {
		if(!buff) return;
		if(!this.algo) {
			this.algo = (buff.readUInt32LE(12) >> 24) & 0xff;
			const fwid = buff.readUInt32LE(16);
			this.fwversion = `${(fwid >> 24) & 0xff}.${(fwid >> 26) & 0xff}`;
			this.did = hex.hex64(buff.readBigUInt64BE(24));
		}
		
		const temp = (((0xffff & (buff.readUInt32LE(0xa << 2) >> 4)) * 503.975 / 4096) - 273.15);
		this.temperature = temp <= 37 ? temp : (17.5 + temp / 2);
		this.vcc = 4.57763671875e-05 * (0xffff & (buff.readUInt32LE(0xb << 2)));
		this.vccio = 4.57763671875e-05 * (0xffff & (buff.readUInt32LE(0xc << 2)));
		const d = buff.readUInt32LE(0xd << 2);
		const sfound = (d >> 12) & 0xffff;
		
		const nonce = buff.readUInt32LE(0xe << 2);
		if(!this.oldnonce.length) this.oldnonce = [0];
		if(nonce && this._currentWork && this.oldnonce.indexOf(nonce) == -1) {
			this.oldnonce.push(nonce);
			// 4 is the hw limitation with AM01 BIOS 0.0.4.12
			if(this.oldnonce.length > 4) this.oldnonce = this.oldnonce.slice(1);
			// const buff = Buffer.alloc(4);
			// buff.writeUInt32LE(nonce, 0);
			//console.log(hex.hex32(nonce));
			//console.log(buff.toString('hex'));
			//this._currentWork.solution = hex.hex32(nonce);
			const h = keccak(this._currentWork.header + hex.hex32(nonce));
			//console.log(h);
			//this._currentWork.solutionDiff = (this._currentWork.multiplier || 1) * diff.hashToDiff(h);
			this._currentWork.solutionDiff = diff.hashToDiff(h);
			this._currentWork.solution = hex.hex32(swap.swap32(nonce));//buff.toString('hex');
			this._currentWork.minerid = this.id;
			if(sfound == 0x2121) this.geb.emit('miner_solution', this._currentWork);
		}

		const currentIdle = ((d >> 28) & 0xff) == 0;
		if(currentIdle !== this.idle) {
			this.idle = currentIdle;
			if(this.idle) this.geb.emit('miner_idle', this);
		}		
	}

	/** Send work to device */
	sendwork(work) {
		if(!work) {
			this.idle = true;
			this._currentWork = null;
			// todo: emit idle here?
			return;
		}
		this.idle = false;
		this._currentWork = work;

		// deviceData calculation has to be moved to the firmware
		var deviceData = hex.hex32(this.meta);
		// AM01 is expecting keccak blocks in LE
		deviceData += Buffer.from(work.header, 'hex').swap32().toString('hex');
		deviceData += '00000000'; // <-- nonce
		// and target reversed
		deviceData += Buffer.from(work.target, 'hex').swap32().reverse().toString('hex');
		work.__am01_workdata = deviceData;
		
		this.dev.controlTransfer(0x77, 0xf2, 0, 0, Buffer.from(work.__am01_workdata, 'hex')).then(() => {
			this.debug(`> ${work.__am01_workdata}`);
			this.oldnonce = [0];
		}).catch(e => {
			this.warn(`Send data error: ${e.message}`);
		});
	}
}

module.exports = AM01;