---
layout: post
title: "Trinh Sát Bên Ngoài"
categories: [Recon]
---

Tìm kiếm thông tin trôi nổi bên ngoài để không bỏ sót một miếng vàng nào. Mục tiêu của giai đoạn này là thu thập càng nhiều dữ liệu về con người và hạ tầng càng tốt mà không cần chạm trực tiếp vào hệ thống của mục tiêu. **OSINT!**

### **1. Thu thập email, thông tin nhân viên**

Đây là nguồn tài nguyên cực quý để chuẩn bị cho bước tấn công rải mật khẩu sau này.

* **theHarvester**: Thu thập email, tên nhân viên, subdomains từ các nguồn công khai

```bash
theHarvester -d <tên_miền> -l 500 -b google,linkedin,bing
```

* **LinkedIn và các trang mxh khác**: Lùng sục, điều tra thói quen nhân viên cũng như cấu trúc username (ví dụ nguyen.van.a hay a.van.nguyen).
* **Google Dorks**: Tìm thông tin qua search engine

```bash
site:linkedin.com/in "tên_công_ty"
```

### **2. Săn tìm metadata, tài liệu lộ lọt**

Các file PDF, DOCX, XLSX của công ty thường chứa dấu vết của hệ thống nội bộ.

* **FOCA**, **metagoofil**: Trích xuất metadata, nhằm tìm phiên bản phần mềm, tên máy chủ nội bộ hoặc thậm chí là username của người tạo file

```bash
metagoofil -d <tên_miền> -t pdf -l 100 -n 25 -o pdfs -f pdf.html
```

* **Google Dorks**: Tìm file nhạy cảm

```bash
site:tên_miền "password" | "secret" | "config"
```

### **3. Khám phá hạ tầng**

* **crt.sh**: Truy vấn Certificate Transparency logs để tìm các miền phụ ẩn.
* **Google Dorks**: Tìm kiếm các trang quản trị bị lộ

```bash
site:<trang_web_công_ty> intitle:login
```
```bash
site:<trang_web_công_ty> filetype:php | filetype:asp
```
