这里我们要做的事情就是分别对githubn和gitlab生成对应的密钥（默认情况下本地生成的秘钥位于/Users/用户名/.ssh/），并且配置git访问不同host时访问不同的密钥，流程如下：
1、 在gitbash中使用ssh-keygen -t rsa -C "公司邮箱地址"生成对应的gitlab密钥：id_rsa和id_rsa.pub
2、 将gitlab公钥即id_rsa.pub中的内容配置到公司的gitlab上
3、 在gitbash中使用ssh-keygen -t rsa -C "github地址" -f ~/.ssh/github_rsa生成对应的github密钥：github_rsa和github_rsa.pub
4、 将github公钥即github_rsa.pub中的内容配置到自己的github上
5、 进入密钥生成的位置，创建一个config文件，添加配置：


```ssh
# gitlab
Host gitlab
    HostName git.xxx.com #这里填你的gitlab的Host 这里不要填ip
    User git
    IdentityFile ~/.ssh/id_rsa
# githab
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_rsa
```


二、测试连接
在密钥的生成位置/Users/用户名/.ssh/下使用gitbash运行 ssh -T git@hostName命令测试sshkey对gitlab与github的连接：
```ssh
catalinaLi@catalinaLi MINGW64 ~/.ssh
$ ssh -T git@gitlab
Welcome to GitLab, catalinaLi!

catalinaLi@catalinaLi MINGW64 ~/.ssh
$ ssh -T git@github.com
Hi catalinaLi! You've successfully authenticated, but GitHub does not provide shell access.
```