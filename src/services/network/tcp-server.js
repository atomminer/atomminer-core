const net = require('net');
const url = require('url');
const EventEmitter = require('events').EventEmitter;

const defaultconfigTCP = {
	hostOrInterface: '0.0.0.0',
	port: 0,
	keepalive: true,
	nodelay: true,
	netstatPeriod: 1000,
};

class TCPServer extends EventEmitter {
	constructor(config) { 
		if(config && typeof config !== 'object') throw new Error('Config object required');
		this._opts = config ? {...defaultconfigTCP, ...config} : defaultconfigTCP;

		super();
		this._socket = null;
		this._running = false;

		// traffic meter
		this.__netstatTimer = null;
		this._totalBytesOut = 0;
		this._totalBytesIn = 0;
		this._bytesOut = 0;
		this._bytesIn = 0;
		this._upspeed = 0;
		this._downspeed = 0;
	}

	/** Server running? */
	get running() { return this._running; }

	/** Current server config object */
	get config() { return this._opts; }

	/** Shows if netstat is enabled and running on this connection */
	get netstat() { return this.opts.netstatPeriod > 0; }
	
	/** Average upload speed in bytes/s */
	get upspeed() {return this._upspeed;}
	
	/** Average download speed in bytes/s */
	get downspeed() {return this._downspeed;}
	
	/** Total bytes sent */
	get totalBytesSent() {return this._totalBytesOut;}
	
	/** Total bytes received */
	get totalBytesReceived() {return this._totalBytesIn;}
	
	/** Bytes sent since connect/reconnect. Resets when connection is closed. */
	get bytesSent() {return this._bytesOut;}
	
	/** bytes received since connect/reconnect. Resets when connection is closed. */
	get bytesReceived() {return this._bytesIn;}

	/** Start TCP server */
	start() {
		try {
			if(this.running) throw new Error('Server is already started')

			this._socket = new net.Server();
			this._socket.setKeepAlive(this.config.keepalive || true);
			this._socket.setNoDelay(this.config.nodelay || true);

			this._socket.listen

		}
		catch(e) {
			throw e;
		}
	}


	/** Stop TCP server. Close all incoming connections and close port */
	stop() {
		if(!this.running) return;
	}

	/**
	 * Connect to the socket and start
	 * @fires connected
	 * @fires status
	 */
	connect() {
		try {
			if(!this.opts.url && !this._reconnectTo) {
				this._lastError = `TCPTransport::connect url is required`;
				throw new Error(this._lastError);
			}

			var constructedUrl = (this.opts.url.indexOf('://') == -1 ? 'tcp://' : '') + this.opts.url;
			if(this._reconnectTo) {
				constructedUrl = this._reconnectTo.url ? this._reconnectTo.url : `tcp://${this._reconnectTo.host}:${this._reconnectTo.port}`;
				// do not save reconnect to the URL. query original source again if disconnected
				// idea for AM pool: add ttl as a 3rd param to client.reconnect method
				this._reconnectTo = null;
			}
			const u = url.parse(constructedUrl);
			var host = u.hostname;
			var port = u.port;
			if(!port && u.protocol === 'http:') port = 80;
			if(!port && u.protocol === 'https:') port = 443;

			if(!port || !host) {
				this._lastError = `TCPTransport::connect invalid URL. host and port are required to connect`;
				throw new Error(this._lastError);
			}

			if(this._socket) this.disconnect();

			if(!this._socket) {
				this._socket = new net.Socket();
				this._socket.setKeepAlive(this.opts.keepalive || true);
				this._socket.setNoDelay(this.opts.nodelay || true)

				this._socket.on('connect', () => { 
					this._connected = true; 
					this.emit('connected');
					this._measuretime = new Date();
					if(this._reconnectTimer) {
						clearTimeout(this._reconnectTimer);
						this._reconnectTimer = null;
					}
					if(this.opts.netstatPeriod) this.__netstatTimer = setInterval(() => { this._measureSpeed(); }, this.opts.netstatPeriod);
					this.onConnect();
				});
				this._socket.on('timeout', () => { this._connected = false; this.onTimeout(); this.emit('disconnected'); });
				this._socket.on('error', this.onError.bind(this));
				this._socket.on('data', this.onData.bind(this));
				
			}

			this._socket.on('end', () => { this._connected = false; this.onEnd(); });
			this._socket.on('close', (hadError) => { 
				this._connected = false; 
				this.emit('disconnected');
				this.onClose(hadError);
				if(this.__netstatTimer) {
					clearInterval(this.__netstatTimer);
					this.__netstatTimer = null;
					this._measureSpeed();
				}
				this._socket.removeAllListeners('end');
				this._socket.removeAllListeners('close');
				this._socket.destroy();
			});

			this._bytesOut = 0;
			this._bytesIn = 0;

			this._beforeConnect && this._beforeConnect(); // hook. can throw exceptions
			this.status = `Connecting to ${host}:${port}`;
			this._socket.connect({port:port, host:host, lookup: this.opts.dnsCache || dns.lookup});
		}
		catch(e) {
			this.lastError = e.message;
		}
	}

	/**
	 * close socket connection and cleanup timers and socket listeners. no automatic reconnect 
	 * is going to happen when disconnected. onClose is not fired. Perfect before destroying the object.
	 * @fires disconnected
	 */
	disconnect() {
		this.debug('disconnect');
		if(!this._socket) return;

		if(this._reconnectTimer) {
			clearTimeout(this._reconnectTimer);
			this._reconnectTimer = null;
		}
		if(this.__netstatTimer) {
			clearInterval(this.__netstatTimer);
			this.__netstatTimer = null;
			this._measureSpeed();
		}

		if(this._socket.destroyed) return;

		this._beforeDisconnect && this._beforeDisconnect();

		this._socket.removeAllListeners('end');
		this._socket.removeAllListeners('close');
		this._socket.destroy();
		this._connected = false;

		this.emit('disconnected');
		this.status = "Disconnected";
	}

	/**
	 * Close connection. onClose will be fired thus child classes can reconnect if the want to
	 * @fires disconnected
	 */
	close() {
		this.debug('disconnect');
		if(!this._socket) return;
		this._beforeDisconnect && this._beforeDisconnect();
		this._socket.destroy();
		this._connected = false;
		// 'disconnected' event will be emitted by onClose listener
	}

	/**
	 * send data to the server
	 *
	 * @param {*} strOrBufferOrObj
	 * @fires error
	 */
	send(strOrBufferOrObj) {
		if(!this.connected) {
			this.emit('error', 'Can not send data to closed connection');
			return;
		}
		const tosend = (typeof strOrBufferOrObj === 'object') ? (JSON.stringify(strOrBufferOrObj) + '\r\n') : strOrBufferOrObj;
		if(this.opts.logdataout) this.log('> ' + tosend.toString().replace(/\r?\n/, ''));
		this._socket.write(tosend);
	}

	/**
	 * Connection estblished callback
	 */
	onConnect() {
		this.debug('onConnect');
	}

	/**
	 * Connection has been closed by remote host callback
	 */
	onEnd() {
		this.debug('onEnd');
	}

	/**
	 * Connection closed callback
	 */
	onClose(hadError) {
		this.debug('onClose');
	}

	/**
	 * Connection or data timeout callback
	 */
	onTimeout() {
		this.lastError = 'TCPTransport::onTimeout';
		this.debug(this._lastError);
		this._socket.destroy();
	}

	/**
	 * Socket error callback
	 * @fires error
	 */
	onError(err) {
		this.lastError = err;
		this.debug(this._lastError);
		this._socket.destroy();
	}

	/**
	 * Data received callback
	 */
	onData(data){
		this.debug('onData');
		const sData = data.toString('utf8');
		if(this.opts.logdatain) this.log('< ' + sData);
	}

	/**
	 * Measure up/down speeds and update stats
	 * @inner
	 */
	_measureSpeed() {
		if(!this._socket) return;
		if(!this._connected) {
			this._upspeed = 0;
			this._downspeed = 0;
		}
		const dt = new Date();
		const dtime = (dt - this._measuretime) / 1000;
		if(dtime < 0.11) return;
		const bup = this._socket.bytesWritten - this._bytesOut;
		const bdown = this._socket.bytesRead - this._bytesIn;

		this._upspeed = ~~((this._upspeed + (bup / dtime)) / 2);
		this._downspeed = ~~((this._downspeed + (bdown / dtime)) / 2);
		if(this._upspeed < 1) this._upspeed = 0;
		if(this._downspeed < 1) this._downspeed = 0;
		this._bytesOut = this._socket.bytesWritten;
		this._bytesIn = this._socket.bytesRead;
		this._totalBytesOut += bup;
		this._totalBytesIn += bdown;
		this._measuretime = dt;

		if(this.opts.lognetstat) {
			const o = {
				upspeed: this._upspeed,
				downspeed: this._downspeed,
				out: this._bytesOut,
				in: this._bytesIn,
			}
			if(this._upspeed || this._downspeed) console.error(o)
		}
	}
}

module.exports = {
	TCPServer,
};