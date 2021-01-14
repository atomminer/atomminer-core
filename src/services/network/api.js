const ipc = require('node-ipc');

module.exports.startServer = async (sid) => {
	ipc.config.id = sid || 'atomminerd';
	ipc.config.silent = true;
	const promise = new Promise((resolve, reject) => {
		ipc.serveNet('0.0.0.0', 3124, () => {
			console.log(ipc.server);
		})
		// ipc.serve(`/tmp/${ipc.config.id}.service`, () => {
		// 	resolve();
		// });
	});
	ipc.server.start();
	return promise;
}