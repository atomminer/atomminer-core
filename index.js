//require('./src/utils/console');
const app = require('./src/app');

// var appHeartBeat = setInterval(function() {
// }, 500);

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
	console.log('SIGINT received')
	//if(appHeartBeat) clearInterval(appHeartBeat);
	await app.stop();
	process.exit(0);
});

app.start();