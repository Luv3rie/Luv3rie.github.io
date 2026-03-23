---
layout: post
title: "Không Có Tài Khoản Miền"
categories: [Recon]
---

Khi chưa có một tấm thẻ định danh nào trong tay, ta vẫn có thể lợi dụng những sơ hở trong các giao thức mặc định của Windows để ép hệ thống nhả ra Hash mật khẩu hoặc thông tin người dùng.

### **1. Null Session & Guest Access**

Đây là kịch bản "mơ ước" nhưng ngày càng hiếm trên các hệ thống Windows Server hiện đại. Tuy nhiên, ở các máy chủ App cũ hoặc cấu hình ẩu, bạn vẫn có thể lẻn vào mà không cần mật khẩu.

* **Bản chất:** Lợi dụng việc cho phép kết nối ẩn danh để liệt kê tài nguyên.
* **Thực tế:** Độ tin cậy thấp trên Server 2016+, nhưng vẫn đáng để thử vì nếu thành công, bạn sẽ có toàn bộ danh sách User và Password Policy.

Liệt kê Share và Password Policy bằng **NetExec**:

```bash
nxc smb <IP> -u '' -p '' --shares --passpol
nxc smb <IP> -u guest -p '' --shares
```

Brute-force RID để vét sạch danh sách người dùng:

```bash
nxc smb <IP> -u '' -p '' --rid-brute
```

### **2. Liệt kê người dùng với Kerbrute**

Nếu SMB bị chặn, Kerberos chính là "cửa ngõ" tiếp theo. Kerbrute là công cụ "quốc dân" nhờ tốc độ kinh hoàng vì nó sử dụng UDP thay vì TCP.

```bash
kerbrute userenum -d <tên_miền> --dc <DC_IP> <danh_sách>
```

Hãy dùng cách danh sách người dùng phổ biến (như jsmith.txt của https://github.com/insidetrust/statistically-likely-usernames).

### **3. AS-REP Roasting**

Lỗi này xảy ra khi tài khoản bị tích chọn "Do not require Kerberos preauthentication". Ta có thể xin vé TGT cho User đó mà không cần biết mật khẩu.

* **Thực tế**: Cực kỳ phổ biến trong các bài Lab, nhưng ngoài đời là hàng hiếm.
* **OpSec**: Rất an toàn, gần như không để lại dấu vết vì đây là một truy vấn Kerberos hợp lệ.

Chiến thuật của tôi:
- Dùng **Kerbrute** để quét nhanh người dùng có lỗi AS-REP (tốc độ cao nhất).
- Sau khi tìm được con mồi, dùng **Impacket-GetNPUsers** để lấy Hash vì định dạng của nó thân thiện với **Hashcat** và **John the Ripper**.

```bash
GetNPUsers.py <tên_miền>/ -usersfile <danh_sách_người_dùng_có_lỗi> -format hashcat -outputfile asreproast.txt -dc-ip <DC_IP>
```

### **4. Tấn cônng rải mật khẩu**

Sau khi đã có danh sách người dùng hợp lệ, thay vì thử hàng trăm mật khẩu cho một người (dễ bị khóa tài khoản), ta sẽ thử một mật khẩu duy nhất cho tất cả người dùng.
Hãy thử mật khẩu sao cho hợp với chính sách mật khẩu nhất. Và hãy nhìn vào dòng Account Lockout Threshold. Nếu nó là 5, bạn chỉ được phép thử tối đa 4 mật khẩu rồi phải dừng lại chờ hết thời gian reset.
Thử các mật khẩu quốc dân theo mùa hoặc tên công ty, ví dụ: Thang03@2026, Password123!, Welcome@123...
Nếu bạn không kiểm tra chính sách mật khẩu trước, bạn có thể làm khóa một hoặc khóa sạch tài khoản của cả công ty. Khi đó, không chỉ SOC mà cả phòng IT sẽ đi tìm bạn.

Nếu Kerbrute gặp lỗi hoặc bị chặn, **NetExec** là lựa chọn thay thế mạnh mẽ nhất.

```bash
kerbrute passwordspray -d <tên_miền> --dc <DC_IP> <danh_sách_người_dùng> <mật_khẩu>
```

```bash
nxc smb -u <danh_sách_người_dùng> -p <mật_khẩu>
```

Nếu bạn muốn thử mật khẩu giống tên người dùng

```bash
kerbrute passwordspray -d <tên_miền> --dc <DC_IP> <danh_sách_người_dùng> --user-as-pass
```

```bash
nxc smb -u <danh_sách_người_dùng> -p <danh_sách_người_dùng> --no-bruteforce
```

Với **NetExec**, thêm cờ --continue-on-success giúp tool không dừng lại khi tìm thấy một mật khẩu đúng.

### **5. LLMNR/NBT-NS Poisoning**

Đây là kỹ thuật mà bạn có thể triển khai ở bất cứ giai đoạn nào. Dù bạn chưa có tài khoản hay đã chiếm được một máy trạm, việc nghe ngóng các yêu cầu trong mạng luôn mang lại những món hời bất ngờ.
Khi Windows không tìm thấy máy chủ qua DNS, nó sẽ "hét" lên toàn mạng qua giao thức LLMNR/NetBIOS. Ta sẽ đóng vai kẻ phản hồi giả mạo, lừa nạn nhân gửi Hash mật khẩu (Net-NTLMv2) để xác thực.
Trên máy tấn công ta dùng **Responder**
Trên máy trạm ta dùng **Inveigh** (Bản C# hoặc PS)

* **Thực tế**: Cực kỳ phổ biến. Chỉ cần một nhân viên gõ sai tên ổ đĩa mạng hoặc một script cũ chạy ngầm, Hash sẽ tự bay vào túi bạn.
* **Opsec**: Trung bình. Nó gây nhiễu mạng nhưng nếu không quá lạm dụng, SOC rất khó phân biệt với các lỗi phân giải tên miền thông thường.

```bash
sudo responder -I eth0 -dwv
```

```powershell
.\Inveigh.exe
```

Trong quá trình treo máy nghe lén, đôi khi bạn sẽ nhận được Hash NTLMv1 thay vì NTLMv2. Đây là một lỗ hổng bảo mật nghiêm trọng nhưng vẫn tồn tại ở các hệ thống đời cũ.
NTLMv1 sử dụng thuật toán yếu (DES) để mã hóa. Nếu ta ép Challenge về một giá trị cố định, ta có thể dùng bảng tra cứu sẵn (Rainbow Tables) để tìm ra mật khẩu gốc trong vài giây.
Ta cần cấu hình **Responder** để luôn gửi Challenge là 1122334455667788. Chỉnh sửa file Responder.conf:

```bash
[Responder Core]
; Thiết lập Challenge cố định để crack bằng Rainbow Table
Challenge = 1122334455667788
```

Một chuỗi Hash NTLMv1 thu được từ Responder thường có dạng: User::Hostname:LM-Hash:NT-Hash:Challenge.
Sau khi nhận được Hash, bạn chỉ cần lấy phần NT (thường là đoạn dài nhất trong chuỗi Hash) và ném lên các dịch vụ như ntlmv1.com. Nếu may mắn, bạn sẽ có ngay mật khẩu rõ chỉ sau một cú click chuột.



### **6. IPv6 DNS Takeover**

Nếu **Responder** im hơi lặng tiếng, đã đến lúc dùng tới vũ khí hạng nặng.

Windows mặc định ưu tiên IPv6 hơn IPv4. **mitm6** sẽ giả làm máy chủ DHCPv6 để cấp IP và tự nhận mình là DNS Server cho các máy trong mạng. Khi đó, mọi yêu cầu xác thực của nạn nhân sẽ bị ép đi qua máy của bạn.

* **Thực tế**: Độ tin cậy gần như 100% trong môi trường Windows mặc định.
* **Opsec**: Nguy hiểm. Đòn này cực kỳ ồn ào và có thể gây mất kết nối Internet hoặc làm treo các dịch vụ của nạn nhân. Hãy cân nhắc kỹ trước khi bấm máy.

```bash
sudo mitm6 -d <tên_miền>
```

Khi bạn sử dụng Responder hay mitm6, ngoài việc thu thập Hash để bẻ khóa, chúng ta còn một kỹ thuật cực kỳ bá đạo là SMB Relay.
Tuy nhiên, kỹ thuật này yêu cầu máy mục tiêu phải tắt tính năng SMB Signing (thường là các máy trạm hoặc Server cấu hình ẩu). Tôi sẽ trình bày chi tiết cách mượn xác thực này để chiếm Shell trực tiếp trong các bài viết về Lạm dụng cơ chế xác thực và Cưỡng bức xác thực.
