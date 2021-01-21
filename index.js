const app = require('./src/app');

if (process.platform === "win32") {
	var rl = require("readline").createInterface({
	  input: process.stdin,
	  output: process.stdout
	});
  
	rl.on('SIGINT', function () {
	  process.emit("SIGINT");
	});
}
  
process.on('SIGINT', async () => {
	await app.stop();
	process.exit(0);
});

app.start();