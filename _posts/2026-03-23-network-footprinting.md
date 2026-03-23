---
layout: post
title: "Dấu Chân Mạng"
categories: [Recon]
---

Sau khi đã có trong tay những "mảnh ghép" từ Internet, giờ là lúc ta thực sự bước qua cánh cửa để vẽ nên bản đồ bên trong lâu đài. **Internal Recon!**

### **1. Xác định các máy đang hoạt động**

Thay vì dùng **Nmap** quét toàn bộ ngay, **fping** là cách cực kỳ nhanh gọn và không gây ra nhiều tiếng động lớn:

```bash
fping -aqg <dải mạng>
```

### **2. Quét cổng và dịch vụ**

Sau khi có danh sách IP, ta dùng **Nmap** để xác định máy trạm và DC:

```bash
nmap -sC -sV <IP>
```

Một Domain Controller thường mở các cổng đặc trưng như 88 (Kerberos), 389/636 (LDAP/LDAPS).

Lưu ý: Nếu Nmap trả về nhiều máy mở cổng 88, hãy quan sát tên miền của các DC. Nếu tên miền khác nhau, bạn đang đối mặt với một Rừng (Forest) thay vì một miền đơn lẻ.

### **3. Ánh xạ miền và truy vấn DNS**

Việc ánh xạ IP và miền vào file /etc/hosts là bắt buộc. Phải có hostname đi kèm thì các công cụ như **NetExec** mới hoạt động ổn định và chính xác.

Nếu **Nmap** không trả về hostname của máy, hãy dùng **NetExec** để truy vấn nhanh:

```bash
nxc smb <IP>
```

Ánh xạ DC:

```bash
echo "<DC_IP> <tên_miền> <DC_FQDN> <DC_hostname>" | sudo tee -a /etc/hosts
```

Ánh xạ máy trạm tương tự như trên nhưng không cần thêm tên miền.

Thử DNS Zone Transfer, nếu cấu hình sai ta có thể lấy được toàn bộ sơ đồ mạng:

```bash
dig axfr @<IP_DNS_Server> <tên_miền>
```
