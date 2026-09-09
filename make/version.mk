VERSION := $(shell node -e "\
  const d=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Shanghai'}));\
  const y=String(d.getFullYear()).slice(-2);\
  const m=d.getMonth()+1;\
  const day=d.getDate();\
  const h=String(d.getHours()).padStart(2,'0');\
  const mn=String(d.getMinutes()).padStart(2,'0');\
  process.stdout.write(y+'.'+m+day+'.'+h+mn);\
")

.PHONY: update-version
update-version:
	@node -e "const fs=require('node:fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='$(VERSION)';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');console.log('version: '+p.version);"
