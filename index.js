const arg = require("minimist");
const path = require("path");
const fs = require("fs");
const os = require("os");

let config = arg;
let envFile = path.join(__dirname, arg.e || arg.env || ".env");

try { require("dotenv").config({ path: envFile }); } catch { }

try {
	let conf = require(require("path").join(__dirname, "config.json"));
	config.WEBSITE = arg.w || process.env.CONF_WEBSITE || conf.WEBSITE || "http://alibot.ml"; // You probably shouldn't change this.
	config.HOST = arg.h || process.env.CONF_HOST || conf.HOST || "0b0t.org";
	config.USERNAME = arg.u || process.env.CONF_USERNAME || conf.USERNAME || "alibot";
	config.PASSWORD = arg.p || process.env.CONF_PASSWORD || conf.PASSWORD || false;
	config.OP = arg.o || process.env.CONF_OP || conf.OP || "AliFurkan";
	config.MODE = arg.m || process.env.CONF_MODE || conf.MODE || "public";
	config.ACTIVE = arg.a || process.env.CONF_ACTIVE || conf.active || "true";
} catch {
	log("This error should NEVER happen. If it did, you edited/deleted 'config.json'. If you didn't, create an Issue. If you did, just use setup.js.");
	process.exit(1);
}


const isVarSet = () => !!(config.HOST && config.USERNAME && config.PASSWORD && config.OP && config.MODE && config.ACTIVE);
if (!isVarSet()) {
	log("Run setup.js and try again.");
	process.exit(0);
}
if (config.ACTIVE === "false") {
	process.exit(0);
}

const mineflayer = require("mineflayer");
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});


let op = config.OP.split(",");
log("Operators: " + op);

let lastkill = Date.now();
let start = Date.now();
let username;

let toSend = [];
setInterval(() => {
	if (toSend.length !== 0 && Date.now() >= start + 15 * 1000) {
		bot.chat(toSend[0]);
		log(toSend[0], true);
		toSend.shift();
	}
}, 1500);

let session = false;

let login = {
	host: config.HOST,
	username: config.USERNAME,
	password: config.PASSWORD,
	session: session,
};

let version = "0.0.1";
let mode = config.MODE;
let firstchat = true;
let spawned = false;

let bot;

function log(message, sent = false, date = new Date(Date.now())) {
	console.log(`<${date.getHours()}:${date.getMinutes()}> ${sent ? "[SENT] " : " "} ${message}`);
}

function send(msg = "/help") {
	toSend.push(msg);
}

function msg(msg, u) {
	send(`/msg ${u} ${msg}`);
}

function randStr(length) {
	let result = "";
	let characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let charactersLength = characters.length;
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

function goToSleep(u) {
	const bed = bot.findBlock({
		matching: block => bot.isABed(block)
	})
	if (bed) {
		bot.sleep(bed, (err) => {
			if (err) {
				msg(`I can't sleep: ${err.message}`, u);
			} else {

			}
		})
	} else {
		msg(`No nearby bed`, u);
	}
}

function wakeUp(u) {
	bot.wake((err) => {
		if (err) {
			msg(`I can't wake up: ${err.message}`, u);
		} else {

		}
	})
}

function init(r) {
	spawned = false;
	log(`[${Date.now()}] Init ${r}`);
	bot = mineflayer.createBot(login);

	toSend = [];

	lastkill = Date.now();
	start = Date.now();

	function main() {
		spawned = true;
		username = bot.player.username;
		op.push(username);
		log("Spawned. Username: " + username);
		// send(`/msg " + op[0] + " Logged in.");
		// bot.on("", (u, m, t, rm) => {});
		bot.chatAddPattern(
			/^[a-zA-Z0-9_]{3,16} wants to teleport to you\.$/,
			"tpa",
			"received tpa"
		);
		bot.chatAddPattern(
			/^[a-zA-Z0-9_]{3,16} whispers: /,
			"msg",
			"received msg"
		);
		bot.on("tpa", (u, m, t, rm) => {
			let user = m.extra[0].text;
			log(user + " tpa");
			if (op.includes(user) || mode !== "private") {
				send(`/tpy ${user}`);
			} else {
				msg(`Declining! You are not in the operators list and the mode is ${mode}.`, u);
				send(`/tpn ${user}`);
			}
		});
		bot.on("msg", (u, m, t, rm) => {
			m = m.extra[0].text.trim();
			u = m.split(" ")[0];
			if (m.split(": ")[1] === undefined) {
				log(`${u} empty message`);
				return false;
			}
			m = m.split(": ");
			m.shift();
			m = m.join(": ");
			log(`${u} -> ${m}`);
			let args = m.split(" ");
			args.shift();
			let oldm = m;
			m = m.split(" ")[0];
			handleCommand(m, u, args, oldm);
		});

	}
	bot.once("spawn", main);
	bot._client.once("session", () => {
		session = bot._client.session;
		login.session = session;
	});
	bot.once("login", () => log("Logged in."));
	bot.once("kick", () => init("Kick"));
	bot.once("end", () => setTimeout(() => init("End"), 10 * 1000));
	bot.once("error", (m) => {
		if (m.message === "Invalid session.") {
			session = false;
			init("Error " + m);
		} else if (
			m.message === "Invalid credentials. Invalid username or password."
		) {
			setTimeout(() => init("Error"), 10 * 60 * 1000);
		}
	});
	bot.on('sleep', () => {
		log(`SLEEPING`);
	})
	bot.on('wake', () => {
		log(`WOKE UP`);
	})
}

function handleCommand(m, u, args, rm = "") {
	switch (m) {
		case "help":
			msg(config.WEBSITE || "https://github.com/uAliFurkanY/alibot-mc/", u);
			break;
		case "kill":
			if (op.includes(u) ||
				(Date.now() >= lastkill + 15 * 1000 && mode !== "private")) {
				send(`/kill`);
			} else {
				msg(`Declining! You're not an operator and the mode is ${mode}.`, u);
			}
			break;
		case "tphere":
			if (op.includes(u) || mode === "public") {
				args.length === 1 ? send(`/tpa ${args[0]}`) : send(`/tpa ${u}`);
			} else {
				msg(`Declining! You're not an operator and the mode is ${mode}.`, u);
			}
			break;
		case "say":
			if (op.includes(u)) {
				send(rm.substr(4));
			} else {
				msg(`You are not an operator.`, u);
			}
			break;
		case "op":
			if (op.includes(u) && args.length >= 1) {
				op.push(args[0]);
				msg(`Opped ${args[0]}`, u);
			} else {
				msg(op.join(", "), u);
			}
			break;
		case "coords":
			if (op.includes(u) || mode !== "private") {
				msg(`My coords are: ${bot.player.entity.position.x} ${bot.player.entity.position.y} ${bot.player.entity.position.z}.`, u);
			} else {
				msg(`You are not an operator and the mode is ${mode}.`, u);
			}
			break;
		case "discord":
			msg(`Under construction.`, u);
			break;
		case "ping":
			if (args.length >= 1) {
				msg(`${args[0]}'s ping is ${bot.players[args[0]].ping}ms.`, u);
			} else {
				msg(`Your ping is ${bot.players[u].ping}ms.`, u);
			}
			break;
		case "mode":
			if (op.includes(u) && args.length >= 1) {
				msg(`Changing the mode to ${args[0]}.`, u);
				mode = args[0];
			} else {
				msg(`The mode is ${mode}`, u);
			}
			break;
		case "reinit":
			if (op.includes(u)) {
				init("reinit")
			} else {
				msg(`You are not an operator.`, u);
			}
			break;
		case "random":
			if (args.length === 0) {
				msg(`Usage: random [dice|number <min> <max>]`, u);
			} else if (args[0] === "number") {
				if (args.length >= 4) {
					if (parseInt(args[1]) !== NaN && parseInt(args[2]) !== NaN) {
						let nums = [parseInt(args[1]), parseInt(args[2])];
						if (nums[1] > nums[0]) {
							msg(`Your random number is ${Math.floor(Math.random() * (nums[1] - nums[0] + 1)) + 1}.`, u);
						} else {
							msg(`Minimum is larger than maximum.`, u);
						}
					} else {
						msg(`You did not provide a number.`, u);
					}
				} else {
					msg(`Usage: random [dice|number <min> <max>]`, u);
				}
			} else if (args[0] === "dice") {
				msg(`You rolled ${Math.floor(Math.random() * (6 - 1 + 1)) + 1}.`, u);
			}
			break;
		case "sleep":
			op.includes(u) ? goToSleep(u) : false;
			break;
		case "wakeup":
			op.includes(u) ? wakeUp(u) : false;
			break;
		case "parse":
			parse(u, args);
		case "loopParse":
			msg(setInterval(() => parse(u, args, true), parseInt(args[0]) || 0), u);
		case "endLoop":
			if (op.includes(u)) {
				if (parseInt(args[0]) || false) {
					clearInterval(parseInt(args[0]));
				} else {
					msg(`"${args[0] || ""}" is not a number.`);
				}
			} else {
				msg(`You are not an operator.`, u);
			}
	}

}

function parse(u, args, loop = false) {
	if (op.includes(u)) {
		if (args[0] === "web" || args[0] === "file") {
			if (args[1]) {
				if (args[0] === "file") {
					let output;
					if (fs.existsSync(args[1])) {
						loadFile(args[1]) || "No output."
						!loop ? msg(`Done: ${output}`, u) : false;
					} else if (fs.existsSync(path.join(__dirname, args[1]))) {
						output = loadFile(path.join(__dirname, args[1])) || "No output.";
						!loop ? msg(`Done: ${output}`, u) : false;
					} else {
						return msg(`Specified file doesn't exist.`, u);
					}
					log(output);
				}
				else if (args[0] === "web") {
					msg(`Web mode not yet implemented, please submit a PR if you have, as this will take long and I don't wanna start it.`, u);
				}
			} else {
				msg(`No file/url specified.`);
			}
		} else {
			msg(`Mode should be either 'web' or 'file'.`, u);
		}
	} else {
		msg(`You are not an operator.`, u);
	}
}

function loadFile(name = "") {
	try {
		name = name.trim();
		let commands = [];
		if (fs.existsSync(name)) {
			commands = fs.readFileSync(name).toString().split(os.EOL);
		} else if (fs.existsSync(path.join(__dirname, name))) {
			commands = fs.readFileSync(path.join(__dirname, name)).toString().split(os.EOL);
		} else {
			return `Specified file doesn't exist. (BUG)`;
		}
		return commands.map(m => {
			m = m.trim();
			let u = username;
			if (m.length === 0) {
				log(`${u} empty message`);
				return false;
			}
			log(`${u} -> ${m}`);
			let args = m.split(" ");
			args.shift();
			let rm = m;
			m = m.split(" ")[0];
			return handleCommand(m, u, args, rm);
		}).length + " command(s) ran.";
	} catch (e) {
		return e.message;
	}
}



init("First Start");

try {
	rl.on("line", (m) => {
		if (spawned) {
			m = m.trim();
			u = username;
			if (m.length === 0) {
				log(`${u} empty message`);
				return false;
			}
			log(`${u} -> ${m}`);
			let args = m.split(" ");
			args.shift();
			let rm = m;
			m = m.split(" ")[0];
			handleCommand(m, u, args, rm);
		}
	});
} catch { }