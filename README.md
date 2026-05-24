# BusinessAnalyst
La Bàn BA là nền tảng đa vai trò hỗ trợ Business Analyst phân tích nghiệp vụ, khai thác thông tin, quản lý yêu cầu, truy vết, kiểm soát thay đổi và bàn giao gói phân tích. Hệ thống có dashboard riêng cho BA và các actor hỗ trợ như Stakeholder, tích hợp định hướng AI Copilot và BA Academy.

## Cau truc hien tai

```text
assets/
  css/              # Giao dien, theme, dashboard, actor pages
  js/
    core/           # Logic trang dang nhap/dieu huong actor
    dashboard/      # Hieu ung galaxy dashboard
    use-cases/      # Script rieng cho tung UC cua BA
pages/
  actors/           # Trang chu rieng cua tung actor
  ba-use-cases/     # Giao dien tung use case cua Business Analyst
docs/               # Tai lieu kien truc va huong phat trien
```

## Ghi chu ve co so du lieu

Ban hien tai la prototype giao dien web, chua ket noi CSDL that. Cac thao tac demo trong UC dang dung `localStorage`. Ban production nen tach thanh web app, mobile app, backend API va PostgreSQL. Xem chi tiet tai `docs/architecture.md`.
