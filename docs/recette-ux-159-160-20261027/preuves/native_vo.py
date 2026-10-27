import sys, subprocess, json, datetime, time
from pathlib import Path
commands={"previous_button":'tell commander to perform command "find previous button"',"sync":'tell commander to perform command "move voiceover cursor to keyboard focus"',"next_button":'tell commander to perform command "find next button"',"right":'tell vo cursor to move right',"left":'tell vo cursor to move left',"into":'tell vo cursor to move into item',"out":'tell vo cursor to move out of item',"activate":'tell vo cursor to perform action'}
def api(command):
 p=subprocess.run(["osascript","-e","with timeout of 2 seconds","-e",'tell application id "com.apple.VoiceOver"',"-e",command,"-e","end tell","-e","end timeout"],text=True,capture_output=True,timeout=4)
 if p.returncode:raise RuntimeError(p.stderr.strip())
 return p.stdout.strip()
action=sys.argv[1]
expected=sys.argv[2] if len(sys.argv)>2 else None
before=api('get text under cursor of vo cursor')
target = api('get text under cursor of keyboard cursor') if action == 'sync' else before
if "\n" in target or len(target)>800 or any(word in target for word in ['Ghostty','macbook-pro:','WindowSharingSessionButton','Ask Codex']):
 r={"time":datetime.datetime.now(datetime.timezone.utc).isoformat(),"action":action,"result":"OUTSIDE_TARGET_NO_ACTION","cursor_redacted":True}
 with Path(__file__).with_name("native-actions.jsonl").open("a") as f:f.write(json.dumps(r)+"\n")
 print(json.dumps(r));sys.exit(2)
if action=="activate" and (not expected or expected not in before):raise RuntimeError("Cursor mismatch; no activation: "+before)
if action!="read":api(commands[action]);time.sleep(.7)
after=api('get text under cursor of vo cursor')
r={"time":datetime.datetime.now(datetime.timezone.utc).isoformat(),"action":action,"expected":expected,"cursor_before":("REDACTED_OUTSIDE_TARGET" if "\n" in before or len(before)>800 else before),"cursor_after":after,"last_phrase":api('get content of last phrase')}
with Path(__file__).with_name("native-actions.jsonl").open("a") as f:f.write(json.dumps(r,ensure_ascii=False)+"\n")
print(json.dumps(r,ensure_ascii=False))
