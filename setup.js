const rl = require("readline-sync");
const fs = require("fs");
let host,
	user,
	pass,
	op,
	mode,
	delays,
	loglevel,
	remote,
	tcp_port,
	tcp_host;
host = rl.question("Enter the server that the bot will run on: ");
user = rl.question("Enter the MC account email/username: ");
pass = rl.question("Enter the MC account password: ", {
	hideEchoBack: true,
});
op = rl.question("Enter the operators of the bot separated by ',': ");
let modes = ["public", "private"];
mode = modes[rl.keyInSelect(modes, "Select the mode: ")] || "public";
let delaysList = [
	"Kick: 0s, End: 5s, Error: 5m, Message: 0.5s",
	"Kick: 5s, End: 10s, Error: 10m, Message: 1.5s",
	"Kick: 10s, End: 20s, Error: 20m, Message: 2.5s",
	"Kick: 20s, End: 40s, Error: 40m, Message: 5s",
	"Kick: 5s, End: 15s, Error: 30m, Message: 2s (Recommended)",
];
delays = rl.keyInSelect(delaysList) || 2;
let logList = [
	"Nothing",
	"Errors / Status",
	"Inits",
	"End / Kick (+TPS)",
	"Sent MSGs / Commands (recommended)",
	"Chat / Sleep / Wakeup",
];
loglevel = rl.keyInSelect(logList) || 4;
remote = rl.keyInYNStrict(
	"Should it have a remote control server (advanced)? "
);
if (remote) {
	tcp_port = +rl.question("Enter the listening port: ");
	tcp_host = rl.question("Enter the listening address: ") || undefined;
}
console.clear();
console.log("Server: " + host);
console.log("User: " + user);
console.log("Password: " + pass.replace(/./g, "*"));
console.log("Operators: " + op);
console.log("Mode: " + mode);
console.log("Delays: " + delaysList[delays]);
console.log("Remote control: " + remote);
if (remote) {
	console.log("Remote control listening port: " + tcp_port);
	console.log("Remote control listening address: " + tcp_host);
}
if (rl.keyInYNStrict("Is this ok? ")) {
	console.clear();
	fs.writeFileSync(
		"config.json",
		JSON.stringify({
			HOST: host,
			USERNAME: user,
			PASSWORD: pass,
			OP: op,
			MODE: mode,
			DELAYS: delays,
			LOGLEVEL: loglevel,
			TCP_PORT: tcp_host,
			TCP_HOST: tcp_host,
		})
	);
	rl.keyInPause("File created. You now can run the program.");
} else {
	rl.keyInPause("OK. Cancelling...");
}
