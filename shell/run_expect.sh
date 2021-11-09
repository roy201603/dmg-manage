#/bin/sh

# VOLUME=`hdiutil attach $1 | grep Volumes | awk '{print $3}'`
# echo $1
echo $1
echo $2
/Users/apple/source/dmg-manage/shell/auto_install.sh $1 $2
# echo $3
# cp -rf $VOLUME/*.app /Applications
# hdiutil detach $VOLUME
