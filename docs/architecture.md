# Kien Truc Nen Tang La Ban BA

## Trang thai hien tai

Du an hien tai la prototype giao dien tinh cho web. Mot so use case dang luu du lieu bang `localStorage` de minh hoa thao tac tren trinh duyet. Day chua phai co so du lieu that, chua co backend API va chua co xac thuc nguoi dung that.

## Huong production can co

Nen tang chinh thuc can tach thanh cac lop ro rang:

- Web app: giao dien Business Analyst, Stakeholder va cac actor lien quan.
- Mobile app: ung dung di dong cho stakeholder/BA theo doi, phan hoi, xac nhan nhanh.
- API backend: xu ly nghiep vu, phan quyen, workflow, audit log va tich hop AI.
- Database: luu user, actor, workspace, stakeholder, cau hoi, cau tra loi, requirement, traceability, change request va tai lieu.
- AI service: goi y cau hoi, tom tat elicitation, phat hien mo ho, de xuat acceptance criteria, truy van tri thuc theo ngu canh.

## Stack de xuat

- Web: React hoac Next.js voi TypeScript.
- Mobile: React Native/Expo de tai su dung TypeScript va domain model voi web.
- Backend: NestJS voi TypeScript.
- Database chinh: PostgreSQL.
- ORM: Prisma.
- Cache/job queue: Redis.
- File/document storage: S3-compatible storage.
- Tim kiem ngu nghia/AI memory: PostgreSQL `pgvector` hoac vector database rieng khi du lieu lon.

## Cau truc monorepo de xuat

```text
apps/
  web/
  mobile/
  api/
packages/
  ui/
  domain/
  db/
  ai/
  config/
docs/
```

## Bang du lieu chinh nen co

- `users`: tai khoan nguoi dung.
- `roles`: vai tro nhu Business Analyst, Stakeholder, Product Owner, SME, Admin.
- `workspaces`: khong gian phan tich theo du an/san pham.
- `stakeholders`: nguoi lien quan, quyen quyet dinh, muc anh huong, nguon tri thuc.
- `elicitation_sessions`: workshop, interview, doc review.
- `questions`: bo cau hoi khai thac, co the duoc AI goi y.
- `answers`: cau tra loi cua stakeholder.
- `requirements`: BR, FR, NFR, rule, user story.
- `requirement_versions`: lich su thay doi yeu cau.
- `acceptance_criteria`: tieu chi chap nhan.
- `trace_links`: lien ket goal, need, requirement, story, test, change.
- `change_requests`: yeu cau thay doi va phan tich tac dong.
- `approvals`: review, sign-off, baseline.
- `documents`: BRD, SRS, decision log, UAT scope, handoff package.
- `audit_logs`: dau vet thao tac quan trong.

## Nguyen tac da nen tang

Dung chung domain model, validation schema va API contract giua web va mobile. Web phu hop cho BA lam viec sau, phan tich, truy vet va quan ly yeu cau. Mobile phu hop cho stakeholder tra loi cau hoi, xac nhan thong tin, review nhanh va nhan thong bao.
