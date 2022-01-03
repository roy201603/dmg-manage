#/bin/sh

 node shell.js\
 -f "/Users/apple/source/dmg-manage/test/assets/12244_password/password.dmg"\
 -c "drop,install,other,other"\
 -d "/Volumes/iDisk/dmg_out/macshi"\
 -cf\
 -pwd "macshi.com"\
 -af "./assets/appendFiles/已损坏修复" "./assets/appendFiles/更多软件下载.webloc"\
 -af "./assets/appendFiles/bbb"\
 -tmp "/Users/apple/Downloads/dmg_tmp_source"\
 -rv\
 -rhs "macshi.com" 

 # "./assets/appendFiles/已损坏修复" "./assets/appendFiles/更多软件下载.webloc"\