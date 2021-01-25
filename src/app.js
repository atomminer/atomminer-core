const pkg = require('../package.json');
const os = require('os');
const path = require('path');
const cliargs = require('./cli');
const fmt = require('./utils/format');

const Config = require('./core/config');
const Logger = require('./core/log/logger');
const EventBus = require('./core/event-bus');

// Built-in modules
const WorkDecoder = require('./mining/work/decoder');
const PoolManager = require('./mining/pool/manager');

const TestPools = require('./mining/pool/testpools');

// schedulers
const SchedulerPriority = require('./mining/scheduler/priority');

// PM should be re-purposed for loading external plugins only
const PluginManager = require('./core/plugins/manager');

const USB = require('./core/usb/usb');
const AM01Driver = require('./core/usb/driver/am01');

//const LazyMiner = require('./mining/miner/lazy-miner');

const appfoldername = process.env.DATADIR ? process.env.DATADIR : ((process.platform !== "win32") ? '.atomminer' : 'AtomMiner');

// new sw arch (ref: atomminer-core-pool.png, atomminer-core-overview.png, atomminer-core-usb.png)
// startup (ref atomminer-core-startup.xml)
// load config
// init logger
// init GEB
// init essential parts first:
//		work-decoder
//		pool-manager
//		job-scheduler
// 		pool-provider
// 		plugin manager
// start the app
// ??
// init MinerStats
// init HostStats
// init CloudManager
// ---- we're effectively up here ----
// init USB hotplug/device manager
// init TestPools
// init AMPools
// init UserPools
// ---- built-in stuff is loaded ----
// inti and start PM
// load external plugins

var _app = null;

class App {
	constructor() {
		this.ready = false; // init state
		this.geb = null;
		this.config = null;
		this.logger = null;
		this.appfolder = path.join(os.homedir(), appfoldername);
		this.poolProviders = [];
		this.drivers = [];
		this.services = {};

		this.testconsole = true;
	}

	static start() {
		_app = new App();
		// load cfg and save its errors if any.
		_app.config = new Config();
		var configErr = null;
		try {
			_app.config.load(path.join(_app.appfolder, 'atomminer.conf'));
		}
		catch (e) {
			configErr = e;
		}

		// init logger and pass banner + previous errors to it
		_app.logger = new Logger(_app);
		Logger.extend(_app, 'app');

		process.on('uncaughtException', err => {
			_app.fatal(err.message);
			console.error(err);
			process.abort();
		});
		process.on('unhandledRejection', err => {
			_app.fatal(err.message);
			console.error(err);
			process.abort();
		});

		const cpus = os.cpus();
		const banner = `${pkg.name} v${pkg.version}
---
  Running on   : ${os.release()}
  OS           : ${os.type} ${os.arch()}
  node/V8      : ${process.versions['node'] || 'Unknown'} / ${process.versions['v8'] || 'Unknown'}
  Physical RAM : ${fmt.size(process.memoryUsage().heapTotal)}b / ${fmt.size(os.totalmem())}b / ${fmt.size(os.freemem())}b
  CPU          : ${cpus.length}x${(cpus[0].speed/1000).toFixed(2)}GHz ${os.loadavg().map(v => v.toFixed(2)).join('/')}
  App Folder   : ${_app.appfolder}
`;
		console.log(banner);

		if(configErr) _app.logger.error('config', configErr.message);
		else _app.config.lastMessage && _app.logger.info('config', _app.config.lastMessage)

		// this must go
		if(this.testconsole) {
			_app.logger.raw("=========================== Begin Console test output ===========================")
			_app.logger.log('logger', "console.log");
			_app.logger.debug('logger', "console.debug");
			_app.logger.info('logger', "console.info ");
			_app.logger.error('logger', 'console.error');
			_app.logger.warn('logger', 'console.warning');
			_app.logger.fatal('logger', 'console.fatal');
			_app.logger.raw("============================ End Console test output ============================")
		}
		
		// init geb 
		_app.geb = new EventBus(_app);

		// must have modules
		_app.workDecoder = new WorkDecoder(_app.geb, _app.logger);
		_app.poolManager = new PoolManager(_app.geb, _app.logger);
		// todo: we can have multiple schedulers
		_app.defaultScheduler = new SchedulerPriority(_app.geb, _app.logger);
		_app.defaultScheduler.default = true;

		// pool providers
		_app.poolProviders.push(new TestPools(_app.geb, _app.logger));

		_app.drivers.push(new AM01Driver(_app.geb, _app.logger));
		//_app.drivers.push(new AM02Driver(_app.geb, _app.logger));
		_app.usb = new USB(_app.geb, _app.logger);

		// plugins
		_app.pluginManager = new PluginManager(_app);

		_app.ready = true;
		_app.info(`${pkg.name} init done`);
		_app.geb.emit('app_ready', _app);
		
		return _app;
	}

	stop() {
		const tasks = [];
		app.geb.emit('app_stop', app);
		this.info(`Stopping ${pkg.name} ${pkg.version}...`);

		for(var s of Object.values(this.services)) {
			if(typeof s.stop === 'function') tasks.push(s.stop());
		}

		return Promise.all(tasks);
	}
}

const start = async () => {
	return App.start();
}

const stop = async () => {
	_app.info(`Stopping ${pkg.name} ${pkg.version}...`);
	_app.geb.emit('app_stop', _app);
	// should create a minidump?
	setTimeout(() => {
		_app.info(`${pkg.name} ${pkg.version} failed to stop within 1 second. Terminating`);
		process.abort();
    //process.exit(0)
  }, 1000).unref();
}

/** Return app object */
const get = () => {
	return _app;
}

module.exports = {
	start,
	stop,
	get
}