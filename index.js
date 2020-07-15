const arg = require("minimist")(process.argv.slice(2));
const path = require("path");
const fs = require("fs");
const request = require("request");
const net = require("net");
const netClients = [];

let config = arg;
let envFile = path.join(__dirname, arg.e || arg.env || ".env");
let delays = [
	[0 * 1000, 5 * 1000, 5 * 60 * 1000, 0.5 * 1000],
	[5 * 1000, 10 * 1000, 10 * 60 * 1000, 1.5 * 1000],
	[10 * 1000, 20 * 1000, 20 * 60 * 1000, 2.5 * 1000],
	[20 * 1000, 40 * 1000, 40 * 60 * 1000, 5 * 1000],
	[5 * 1000, 15 * 1000, 30 * 60 * 1000, 2 * 1000],
];

try {
	require("dotenv").config({ path: envFile });
} catch {}

try {
	// arg > env > conf
	let conf = require(path.join(__dirname, "config.json"));
	config.WEBSITE =
		arg.w ||
		process.env.CONF_WEBSITE ||
		conf.WEBSITE ||
		"https://github.com/uAliFurkanY/alibot-mc/"; // You probably shouldn't change this.
	config.HOST = arg.h || process.env.CONF_HOST || conf.HOST || "0b0t.org";
	config.USERNAME = arg.u || process.env.CONF_USERNAME || conf.USERNAME;
	config.PASSWORD = arg.p || process.env.CONF_PASSWORD || conf.PASSWORD;
	config.OP = arg.o || process.env.CONF_OP || conf.OP || "AliFurkan";
	config.MODE = arg.m || process.env.CONF_MODE || conf.MODE || "public";
	config.ACTIVE =
		arg.a || process.env.CONF_ACTIVE || conf.ACTIVE || "true";
	config.DELAYS =
		delays[+arg.d || +process.env.CONF_DELAYS || +conf.DELAYS || 4];
	config.LOGLEVEL =
		arg.l || process.env.CONF_LOGLEVEL || conf.LOGLEVEL || 4;
	config.REMOTE =
		arg.remote || process.env.CONF_REMOTE || conf.REMOTE || false;
	config.TCP_PORT =
		+arg.port || +process.env.CONF_TCP_PORT || +conf.TCP_PORT || 26354;
	config.TCP_HOST =
		arg.host ||
		process.env.CONF_TCP_HOST ||
		conf.TCP_HOST ||
		"localhost";
} catch (e) {
	console.log(
		"This error should NEVER happen. If it did, you edited/deleted 'config.json'. If you didn't, create an Issue. If you did, just use setup.js."
	);
	console.log("Also provide this: ");
	console.log(e);
	process.exit(1);
}

const LOG_ERR = config.LOGLEVEL >= 1;
const LOG_STAT = LOG_ERR;
const LOG_INIT = config.LOGLEVEL >= 2;
const LOG_END = config.LOGLEVEL >= 3;
const LOG_KICK = LOG_END;
const LOG_SENT = config.LOGLEVEL >= 4;
const LOG_CMD = LOG_SENT;
const LOG_CHAT = config.LOGLEVEL >= 5;
const LOG_SLEEP = LOG_CHAT;

const isVarSet = () =>
	!!(
		config.HOST &&
		config.USERNAME &&
		config.OP &&
		config.MODE &&
		config.ACTIVE &&
		config.DELAYS
	);
if (!isVarSet()) {
	console.error("No configuration found, starting setup.");
	require("./setup");
	process.exit(0);
}
if (config.ACTIVE === "false") {
	process.exit(0);
}

const mineflayer = require("mineflayer");
const navigatePlugin = require("mineflayer-navigate")(mineflayer);
const tpsPlugin = require("mineflayer-tps")(mineflayer);
const readline = require("readline");
const Vec3 = require("vec3");

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

let op = config.OP.split(",");
console.log("Operators: " + op);

let lastkill = Date.now();
let start = Date.now();
let username;

let toSend = [];
let intervals = [
	setInterval(() => {
		if (toSend.length !== 0 && spawned) {
			bot.chat(toSend[0]);
			log("SENT " + toSend[0], LOG_SENT);
			try {
				netClients.forEach((c) =>
					c.write("SENT " + toSend[0] + "\n")
				);
			} catch {}
			toSend.shift();
		}
	}, config.DELAYS[3]),
];
let intervalNames = ["0: MAIN MESSAGE LOOP"];

let session = false;

let login = {
	host: config.HOST,
	username: config.USERNAME,
	password: config.PASSWORD,
	session: session,
};

let mode = config.MODE;
let spawned = false;

let bot;

function isValidHttpUrl(string) {
	let url;

	try {
		url = new URL(string);
	} catch (_) {
		return false;
	}

	return url.protocol === "http:" || url.protocol === "https:";
}

let logFile = fs.openSync("alibot-" + start + ".log", "w");
function log(message, logToFile, date = Date.now()) {
	let d1 = new Date(date);
	console.log(`<${d1.getHours()}:${d1.getMinutes()}> ` + message);

	if (logToFile) fs.writeSync(logFile, `${date} ` + message + "\n");
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
		result += characters.charAt(
			Math.floor(Math.random() * charactersLength)
		);
	}
	return result;
}

function goToSleep(u) {
	const bed = bot.findBlock({
		matching: (block) => bot.isABed(block),
	});
	if (bed) {
		bot.sleep(bed, (err) => {
			if (err) {
				msg(`I can't sleep: ${err.message}`, u);
			} else {
			}
		});
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
	});
}

function nearestPlayer() {
	let best = null;
	let bestDistance = null;

	for (const entity in Object.values(bot.entities)) {
		if (entity === bot.entity) continue;
		if (entity.type !== "player") continue;

		const dist = bot.entity.position.distanceTo(entity.position);

		if (!best || dist < bestDistance) {
			best = entity;
			bestDistance = dist;
		}
	}

	return best;
}

function init(r) {
	spawned = false;
	log(`INIT ${r}`, LOG_INIT);
	bot = mineflayer.createBot(login);

	toSend = [];

	lastkill = Date.now();
	start = Date.now();

	function main() {
		let fightInt;
		spawned = true;
		username = bot.player.username;
		op.push(username);
		navigatePlugin(bot);
		tpsPlugin(bot);
		log("SPAWNED Username: " + username, LOG_STAT);
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
			log("TPA " + user, LOG_CMD);
			if (op.includes(user) || mode !== "private") {
				send(`/tpy ${user}`);
			} else {
				msg(
					`You are not an operator and the mode is ${mode}.`,
					user
				);
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
			u !== username ? log(`CMD ${u} ${m}`, LOG_CMD) : false;
			let args = m.split(" ");
			args.shift();
			let oldm = m;
			m = m.split(" ")[0];
			handleCommand(m, u, args, oldm);
		});
		bot.on("chat", (u, m, t, rm) => {
			if (LOG_CHAT) log(`CHAT <${u}> ${m}`, true);
		});
	}
	bot.once("spawn", main);
	bot._client.once("session", () => {
		session = bot._client.session;
		login.session = session;
	});
	bot.once("login", () => log("LOGIN", LOG_STAT));
	bot.on("end", () => {
		let tps;
		try {
			tps = bot.getTps();
		} catch {}
		log("END " + (tps !== undefined ? "TPS " + tps : ""), LOG_END);
		setTimeout(() => init("End"), config.DELAYS[1]);
	});
	bot.on("error", (m) => {
		if (m.message.includes("Invalid session.")) {
			session = false;
			init("Reloading Session");
		} else if (m.message.includes("Invalid credentials.")) {
			setTimeout(() => init("Error"), config.DELAYS[2]);
		} else {
			log("ERROR " + m.message, LOG_ERR);
		}
	});
	bot.on("sleep", () => {
		log(`SLEEPING`, LOG_SLEEP);
	});
	bot.on("wake", () => {
		log(`AWAKE`, LOG_SLEEP);
	});
}

function handleCommand(m, u, args, rm = "") {
	switch (m) {
		case "help":
			msg(
				config.WEBSITE ||
					"https://github.com/uAliFurkanY/alibot-mc/",
				u
			);
			break;
		case "kill":
			if (
				op.includes(u) ||
				(Date.now() >= lastkill + 15 * 1000 && mode !== "private")
			) {
				send(`/kill`);
			} else {
				msg(
					`Declining! You're not an operator and the mode is ${mode}.`,
					u
				);
			}
			break;
		case "tphere":
			if (op.includes(u) || mode === "public") {
				args.length === 1
					? send(`/tpa ${args[0]}`)
					: send(`/tpa ${u}`);
			} else {
				msg(
					`Declining! You're not an operator and the mode is ${mode}.`,
					u
				);
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
				msg(
					`My coords are: ${bot.player.entity.position.x} ${bot.player.entity.position.y} ${bot.player.entity.position.z}.`,
					u
				);
			} else {
				msg(`You are not an operator and the mode is ${mode}.`, u);
			}
			break;
		case "discord":
			msg(`https://discord.gg/gr8y8hY`, u);
			break;
		case "ping":
			if (args.length >= 1) {
				bot.players[args[0]]
					? msg(
							`${args[0]}'s ping is ${
								bot.players[args[0]].ping
							}ms.`,
							u
					  )
					: msg(`Player not found.`, u);
			} else {
				msg(`Your ping is ${bot.players[u].ping}ms.`, u);
			}
			break;
		case "tps":
			msg(`The current tick rate is ${bot.getTps()} TPS.`, u);
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
				init("reinit");
			} else {
				msg(`You are not an operator.`, u);
			}
			break;
		case "random":
			if (args.length === 0) {
				msg(`Usage: random [dice|number <min> <max>]`, u);
			} else if (args[0] === "number") {
				if (args.length >= 4) {
					if (
						parseInt(args[1]) !== NaN &&
						parseInt(args[2]) !== NaN
					) {
						let nums = [parseInt(args[1]), parseInt(args[2])];
						if (nums[1] > nums[0]) {
							msg(
								`Your random number is ${
									Math.floor(
										Math.random() *
											(nums[1] - nums[0] + 1)
									) + 1
								}.`,
								u
							);
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
				msg(
					`You rolled ${
						Math.floor(Math.random() * (6 - 1 + 1)) + 1
					}.`,
					u
				);
			}
			break;
		case "sleep":
			op.includes(u) ? goToSleep(u) : false;
			break;
		case "wakeup":
			op.includes(u) ? wakeUp(u) : false;
			break;
		case "parse":
			parse(
				u,
				args,
				false,
				0,
				(args[2] == "true" ? true : false) || false
			);
			break;
		case "spam":
			let delay = parseInt(args[2]) || 0;
			let random = (args[3] == "true" ? true : false) || false;
			let randomLen =
				+parseInt(args[4]) > 0 ? +parseInt(args[4]) || 8 : 8;
			parse(u, args, true, delay, random, randomLen);
			break;
		case "stopLoop":
			if (op.includes(u)) {
				clearInterval(intervals[parseInt(args[0]) || 1]);
				intervalNames[intervals[parseInt(args[0]) || 1]] +=
					" (stopped)";
			} else {
				msg(`You are not an operator.`, u);
			}
			break;
		case "listLoop":
			msg(`Current Intervals: ${intervalNames.join(", ")}`, u);
			break;
		case "goto":
			if (op.includes(u) || mode === "public") {
				let coords = [
					parseInt(args[0]) || 0,
					parseInt(args[1]) || 0,
					parseInt(args[2]) || 0,
				];
				msg(`Going to: ${coords.join(" ")}.`, u);
				try {
					bot.navigate.to(
						new Vec3(coords[0], coords[1], coords[2])
					);
				} catch (e) {
					msg(`An error occured. See: ${e.message}.`, u);
				}
			} else {
				msg(`You are not an operator and the mode is ${mode}.`, u);
			}
			break;
		case "stop":
			if (op.includes(u) || mode === "public") {
				msg(`OK. Stopping...`, u);
				try {
					bot.navigate.stop();
				} catch (e) {
					msg(`An error occured. See: ${e.message}.`, u);
				}
			} else {
				msg(`You are not an operator and the mode is ${mode}.`, u);
			}
			break;
		case "shutdown":
			op.includes(u)
				? process.exit(0)
				: msg(`You are not an operator.`, u);
		case "fight":
			if (op.includes(u)) {
				let player = args[0]
					? bot.players[args[0]]
					: nearestPlayer();
				if (!player) return msg(`Cannot find player.`, u);
				msg(`OK. Fighting ${player.username}.`, u);
				try {
					clearInterval(fightInt);
				} catch {}
				fightInt = setInterval(() => {
					bot.navigate.to(player.position);
					bot.lookAt(player.position.offset(0, 1.6, 0));
					bot.attack(player);
				}, 200);
			} else {
				msg(`You are not an operator.`, u);
			}
			break;
		case "peace":
			if (op.includes(u))
				try {
					clearInterval(fightInt);
				} catch {
					msg(`Already stopped.`, u);
				}
			else msg(`You are not an operator.`, u);
			break;
	}
}

function parse(
	u,
	args,
	loop = false,
	delay = 0,
	random = false,
	randomLen = 8
) {
	if (op.includes(u)) {
		if (args[0] === "web" || args[0] === "file") {
			if (args[1]) {
				if (args[0] === "file") {
					let output = "";
					if (fs.existsSync(args[1])) {
						output =
							loadArray(
								fs
									.readFileSync(args[1])
									.toString()
									.trim()
									.replace(/{{username}}/g, username)
									.replace(
										/{{online}}/g,
										Object.keys(bot.players).length
									)
									.replace(
										/{{ping}}/g,
										bot.players[username].ping
									)
									.replace(/{{tps}}/g, bot.getTps())
									.split("\n"),
								loop,
								delay,
								random,
								randomLen,
								u
							) || "No output.";
					} else if (
						fs.existsSync(path.join(__dirname, args[1]))
					) {
						output =
							loadArray(
								fs
									.readFileSync(
										path.join(__dirname, args[1])
									)
									.toString()
									.split("\n"),
								loop,
								delay,
								random,
								randomLen,
								u
							) || "No output.";
					} else {
						return msg(`Specified file doesn't exist.`, u);
					}
					msg(`Done: ${output}`, u);
					log(output);
				} else if (args[0] === "web") {
					if (isValidHttpUrl(args[1])) {
						request(args[1], (e, r, b) => {
							let output = "";
							if (e) {
								console.log(e);
								output = e.message;
							}
							loadArray(
								b.toString().split("\n"),
								loop,
								delay,
								random,
								u
							);
							msg(`Done: ${output}`, u);
							log(output);
						});
					} else {
						msg(`This isn't a valid HTTP URL.`, u);
					}
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

function loadArray(commands = [], loop, delay, random, randomLen, u) {
	try {
		if (loop) {
			let date = new Date(Date.now());
			let i = 0;
			let interval = setInterval(() => {
				let m = commands[i % commands.length];
				m = m.trim();
				if (random) {
					m += ` (${randStr(randomLen)})`;
				}
				u = u || username;
				if (m.length === 0) {
					log(`${u} empty message`);
					return false;
				}
				log(`CMD ${u} ${m}`, LOG_CMD);
				let args = m.split(" ");
				args.shift();
				let rm = m;
				m = m.split(" ")[0];
				handleCommand(m, u, args, rm);
				i++;
			}, delay);
			intervals.push(interval);
			intervalNames.push(
				`${
					intervals.length - 1
				}: <${date.getHours()}:${date.getMinutes()}> ${u}`
			);
			return intervals.length - 1;
		} else {
			return (
				commands.map((m) => {
					m = m.trim();
					if (random) {
						m += ` (${randStr("8")})`;
					}
					u = u || username;
					if (m.length === 0) {
						log(`${u} empty message`);
						return false;
					}
					log(`CMD ${u} ${m}`, LOG_CMD);
					let args = m.split(" ");
					args.shift();
					let rm = m;
					m = m.split(" ")[0];
					handleCommand(m, u, args, rm);
				}).length + " command(s) ran."
			);
		}
	} catch (e) {
		return e.message;
	}
}

init("First Start");

try {
	rl.on("line", (m) => {
		if (spawned) {
			m = m.trim();
			let u = username;
			if (m.length === 0) {
				return false;
			}
			let args = m.split(" ");
			args.shift();
			let rm = m;
			m = m.split(" ")[0];
			handleCommand(m, u, args, rm);
		}
	});
	if (config.REMOTE == true) {
		const server = net.createServer((c) => {
			netClients.push(c);
			c.on("error", (e) => {});
			c.on("end", () => {});
			c.on("data", (m) => {
				if (spawned) {
					m = m.toString().trim();
					let u = username;
					if (m.length === 0) {
						log(`${u} empty message`);
						return false;
					}
					log(`CMD ${u} ${m}`, LOG_CMD);
					let args = m.split(" ");
					args.shift();
					let rm = m;
					m = m.split(" ")[0];
					handleCommand(m, u, args, rm);
				}
			});
		});
		server.listen(config.TCP_PORT, config.TCP_HOST);
	}
} catch {}
