# luv3rie.github.io

Blog Jekyll tự viết, không dùng theme ngoài. GitHub Pages tự build, không cần cài gì trên máy.

## Đưa lên repo

1. Sao lưu repo cũ (tạo branch `old-theme` là đủ).
2. Xoá các file theme cũ (`_layouts`, `_includes`, `_sass`, `assets/css`, `Gemfile`, dòng `theme:`/`remote_theme:` trong `_config.yml`...). **Giữ lại** thư mục `_posts` và ảnh trong bài.
3. Copy toàn bộ thư mục này vào repo, ghi đè khi được hỏi.
4. Repo Settings > Pages > Source: **Deploy from a branch**, chọn `main` / root.
5. Push. Khoảng 1 phút sau site cập nhật.

URL bài viết giữ dạng cũ `/posts/htb-xxx`, nên link đã chia sẻ trước đây vẫn chạy (file phải tên dạng `YYYY-MM-DD-htb-xxx.md`).

## Sửa trang giới thiệu

| Muốn sửa | File |
|---|---|
| Tên, dòng mô tả, link GitHub/HTB/LinkedIn/email, CV, dòng "đang tìm thực tập" | `_config.yml`, mục `author` |
| Bảng chứng chỉ (`whoami /groups`) | `_data/credentials.yml` |
| Đoạn "Về tôi", "Tôi làm được gì" | `index.md` (viết Markdown bình thường) |

Ô nào để `""` thì không hiện. Muốn có nút tải CV: bỏ file PDF vào `assets/`, rồi điền `cv: "/assets/cv.pdf"`.

## Viết một write-up mới

Tạo file `_posts/2025-11-20-htb-tenbox.md`:

```yaml
---
title: TenBox
difficulty: Medium          # Easy / Medium / Hard / Insane
os: Windows
summary: Một câu tóm tắt cả đường đi, hiện ở đầu bài và khi chia sẻ link.
tags: [Kerberoasting, ADCS, ESC1]
attack_path:                # node đầu tiên là chỗ bạn bắt đầu, node cuối là đích
  - node: svc_sql
    type: user              # user / group / computer / domain / ca / template / gpo / ou
    edge: Kerberoasting     # cách đi từ node này sang node kế tiếp
  - node: IT Admins
    type: group
    edge: Enroll trên template lỗi
  - node: CorpWeb
    type: template
    edge: ESC1
  - node: CORP.LOCAL
    type: domain            # node cuối không cần edge
---

## Recon
...
```

Mọi trường đều không bắt buộc trừ `title`. Bài cũ chưa có `attack_path` vẫn hiện bình thường, chỉ không có sơ đồ.

### Trong nội dung bài

- Code: dùng ```` ```bash ````, ```` ```powershell ````, ```` ```python ````, ```` ```text ```` (cho output). Mỗi khối tự có nhãn ngôn ngữ và nút **Chép**.
- Cứ dán **toàn bộ** output, không cần `<SNIP>`. Khối nào dài hơn 30 dòng sẽ tự thu gọn còn 20 dòng, có nút "Hiện thêm N dòng" ở dưới. Nút Chép vẫn chép đủ. Bấm Ctrl+F thì mọi khối tự mở ra để tìm chữ bên trong được.
  Muốn một khối luôn hiện đầy đủ thì thêm `{: .no-fold}` ở dòng ngay dưới dấu ```` ``` ```` đóng.
- Ô ghi chú:

  ```html
  <div class="note" markdown="1">
  **Vì sao?** Giải thích ở đây, vẫn viết Markdown được.
  </div>
  ```

  Đổi `note` thành `warn` để có viền đỏ (cho cảnh báo, rabbit hole).
- Ảnh: để trong `assets/img/tenbox/`, chèn bằng `![mô tả](/assets/img/tenbox/bloodhound.png)`.
- Bài có từ 3 tiêu đề `##` trở lên sẽ tự có mục lục bên phải trên màn hình rộng.

`_drafts/htb-support.md` là bài mẫu, không được đăng. Xem để biết cách viết, xong có thể xoá.

## Xem thử trên máy (không bắt buộc)

Cần Ruby: `gem install jekyll -v 3.10.0 jekyll-feed kramdown-parser-gfm webrick`, rồi `jekyll serve --drafts` và mở http://localhost:4000.
