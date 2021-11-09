#!/usr/bin/expect
# 获取第1个参数
set path [lindex $argv 0]
# 获取第2个参数
set password [lindex $argv 1]   
 
# 向远程服务器请求打开一个telnet会话，并等待服务器询问用户名
# echo $path
# echo $password
spawn hdiutil attach -nobrowse -noverify -noautoopen $path
# 返回信息匹配 
expect {      
     # 出现密码提示,发送密码                 
    "*password:*" { send "$password\r"; exp_continue }
    "*请输入密码以访问*" { send "$password\r"; exp_continue }   
    "*mac*" { send ":wq\r"; exp_continue }   
     # 第一次ssh连接会提示yes/no,继续  
    "*Agree Y/N?" { send "yes\r"; exp_continue}
    # "%" {set results $expect_out(buffer)}
} 

# interact        # 交互模式,用户会停留在远程服务器上面

# 输入密码，并等待键入需要运行的命令
# expect "passphrase:"
# send "$password\r"
# expect "%"
# 输入预先定好的密码，等待运行结果
# send "$mycommand\r"
# expect "%"
# 将运行结果存入到变量中，显示出来或者写到磁盘中
# set results $expect_out(buffer)
# 退出telnet会话，等待服务器的退出提示EOF
# send "exit\r"
# expect eof
exit

# cp -rf $VOLUME/*.app /Applications
# hdiutil detach $VOLUME
