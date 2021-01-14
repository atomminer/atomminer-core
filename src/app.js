const pkg = require('../package.json');
const os = require('os');
const path = require('path');
const cliargs = require('./cli');
const fmt = require('./utils/format');

const Config = require('./core/config');
const PM = require('./core/plugins/manager');
const MiningManager = require('./mining/manager');

const appfoldername = (process.platform !== "win32") ? '.atomminer' : 'AtomMiner';
const appfolder = path.join(os.homedir(), appfoldername);

 /** [MM] singleton */
var _mm = null;

const start = async () => {
	const argv = cliargs();
	if(argv.testconsole) {
		console.testConsole();
		return process.emit('SIGINT');
	}

	console.raw(`${pkg.name} ${pkg.version}`);
	const cpus = os.cpus();
	console.raw(`  Running on   : ${os.release()} 
  OS           : ${os.type} ${os.arch()}
  Physical RAM : ${fmt.size(process.memoryUsage().heapTotal)}b / ${fmt.size(os.totalmem())}b / ${fmt.size(os.freemem())}b
  CPU          : ${cpus.length}x${(cpus[0].speed/1000).toFixed(2)}GHz ${os.loadavg().map(v => v.toFixed(2)).join('/')}
	`);

	// load full config
	Config.load(path.join(appfolder, 'atomminer.conf'));

	// register internal plugins
	if(!PM.register(require('./mining/pool/testpools'))) console.warn('Failed to register TestPools plugin');

	// todo: load/check plugins

	if(!_mm) {
		console.info(`Starting MiningManager [MM]`);
		_mm = new MiningManager();
	}

	// todo: start IPC server
	// todo: start API server

	// todo: start udp-discovery server as a cluster master

}

const stop = async () => {
	const tasks = [];
	console.info(`Stopping ${pkg.name} ${pkg.version}...`);
	// todo: stop discovery
	// todo: stop IPC
	// todo: stop API
	// stop [MM]
	if(!_mm) tasks.push(_mm.stop());
	return Promise.all(tasks);
}

module.exports = {
	start,
	stop
}