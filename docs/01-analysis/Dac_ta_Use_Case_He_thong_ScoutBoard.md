# ĐẶC TẢ USE CASE HỆ THỐNG SCOUTBOARD

> Tài liệu được xây dựng theo sơ đồ Use Case hệ thống ScoutBoard và format đặc tả do người dùng cung cấp.

## Quy ước và phạm vi

- `GUEST` có thể tìm kiếm, xem chi tiết và so sánh cầu thủ mà không cần đăng nhập.
- `USER` kế thừa các chức năng công khai của `GUEST`, đồng thời có thể quản lý shortlist và đội hình mơ ước.
- `ADMIN` đăng nhập vào khu vực quản trị để quản lý người dùng, đồng bộ dữ liệu và xem audit log.
- `External Football API` là tác nhân hệ thống bên ngoài cung cấp dữ liệu bóng đá.
- Nhãn **“Thêm cầu thủ khỏi shortlist”** trên sơ đồ được chuẩn hóa thành **“Thêm cầu thủ vào shortlist”** để đúng ngữ nghĩa nghiệp vụ.

**Tổng số Use Case được đặc tả: 21.**

---

## 1. Tìm kiếm cầu thủ

| Tên use case | Tìm kiếm cầu thủ |
| :---- | :---- |
| **Tóm tắt** | UC cho phép GUEST và USER tìm kiếm cầu thủ theo tên và các tiêu chí như độ tuổi, quốc tịch, vị trí thi đấu, chân thuận, đội bóng, giải đấu, mùa giải và chỉ số thống kê. |
| **Tác nhân** | GUEST, USER |
| **Sự kiện kích hoạt** | Người dùng truy cập trang **“Tìm kiếm cầu thủ”** hoặc nhập điều kiện tìm kiếm trên trang chủ. |
| **Use case liên quan** | Xem chi tiết và thống kê cầu thủ, So sánh cầu thủ, Thêm cầu thủ vào shortlist, Thêm cầu thủ vào đội hình / dự bị |
| **Dòng sự kiện chính** | 1\. Hệ thống hiển thị giao diện tìm kiếm cầu thủ gồm ô nhập tên, bộ lọc, sắp xếp và phân trang.<br>2\. Người dùng nhập từ khóa hoặc lựa chọn các tiêu chí tìm kiếm.<br>3\. Người dùng nhấn nút “Tìm kiếm” hoặc áp dụng bộ lọc.<br>4\. Hệ thống kiểm tra tính hợp lệ của các điều kiện tìm kiếm.<br>5\. Hệ thống truy vấn dữ liệu cầu thủ và thống kê đã được đồng bộ trong CSDL.<br>6\. Hệ thống sắp xếp và phân trang kết quả theo yêu cầu.<br>7\. Hệ thống hiển thị danh sách cầu thủ phù hợp kèm thông tin tóm tắt.<br>8\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A4.1** – Điều kiện lọc không hợp lệ, ví dụ tuổi tối thiểu lớn hơn tuổi tối đa hoặc số phút thi đấu nhỏ hơn 0. Hệ thống hiển thị lỗi và yêu cầu người dùng điều chỉnh bộ lọc. Quay lại bước 2.<br>**A5.1** – Không tìm thấy cầu thủ phù hợp. Hệ thống hiển thị thông báo “Không tìm thấy cầu thủ phù hợp” và cho phép xóa bớt bộ lọc.<br>**A5.2** – Không thể truy vấn dữ liệu. Hệ thống hiển thị thông báo lỗi và yêu cầu thử lại sau. |
| **Điều kiện tiên quyết** | Hệ thống đã có dữ liệu cầu thủ được đồng bộ từ external football API. Người dùng không bắt buộc phải đăng nhập. |
| **Hậu điều kiện** | Danh sách cầu thủ phù hợp với điều kiện tìm kiếm được hiển thị; dữ liệu hệ thống không bị thay đổi. |

---

## 2. Xem chi tiết và thống kê cầu thủ

| Tên use case | Xem chi tiết và thống kê cầu thủ |
| :---- | :---- |
| **Tóm tắt** | UC cho phép GUEST và USER xem hồ sơ, đội bóng hiện tại, vị trí thi đấu, thống kê theo mùa và các chỉ số chuẩn hóa trên 90 phút của một cầu thủ. |
| **Tác nhân** | GUEST, USER |
| **Sự kiện kích hoạt** | Người dùng chọn một cầu thủ trong kết quả tìm kiếm, danh sách so sánh, shortlist hoặc đội hình. |
| **Use case liên quan** | Tìm kiếm cầu thủ, So sánh cầu thủ, Thêm cầu thủ vào shortlist, Thêm cầu thủ vào đội hình / dự bị |
| **Dòng sự kiện chính** | 1\. Người dùng chọn xem chi tiết một cầu thủ.<br>2\. Hệ thống nhận mã định danh của cầu thủ.<br>3\. Hệ thống truy vấn thông tin cá nhân, vị trí, đội bóng, giải đấu và mùa giải của cầu thủ.<br>4\. Hệ thống truy vấn thống kê thi đấu theo mùa.<br>5\. Hệ thống tính hoặc lấy các chỉ số trên 90 phút từ dữ liệu thống kê.<br>6\. Hệ thống hiển thị hồ sơ cầu thủ, bảng thống kê, biểu đồ và thời điểm dữ liệu được cập nhật gần nhất.<br>7\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A3.1** – Cầu thủ không tồn tại hoặc đã bị ẩn. Hệ thống hiển thị thông báo “Không tìm thấy cầu thủ” và cung cấp nút quay lại danh sách.<br>**A4.1** – Cầu thủ chưa có thống kê ở mùa được chọn. Hệ thống vẫn hiển thị thông tin cơ bản và thông báo “Chưa có dữ liệu thống kê”.<br>**A3.2** – Có lỗi khi tải dữ liệu. Hệ thống hiển thị thông báo lỗi và cho phép tải lại. |
| **Điều kiện tiên quyết** | Cầu thủ đã tồn tại trong CSDL của ScoutBoard. |
| **Hậu điều kiện** | Thông tin chi tiết và thống kê của cầu thủ được hiển thị; dữ liệu hệ thống không bị thay đổi. |

---

## 3. So sánh cầu thủ

| Tên use case | So sánh cầu thủ |
| :---- | :---- |
| **Tóm tắt** | UC cho phép GUEST và USER so sánh từ hai đến ba cầu thủ theo cùng mùa giải bằng bảng số liệu và biểu đồ. |
| **Tác nhân** | GUEST, USER |
| **Sự kiện kích hoạt** | Người dùng chọn chức năng **“So sánh”** và thêm các cầu thủ cần so sánh. |
| **Use case liên quan** | Tìm kiếm cầu thủ, Xem chi tiết và thống kê cầu thủ |
| **Dòng sự kiện chính** | 1\. Hệ thống hiển thị giao diện so sánh cầu thủ.<br>2\. Người dùng chọn từ hai đến ba cầu thủ.<br>3\. Người dùng chọn mùa giải và bộ chỉ số cần so sánh.<br>4\. Người dùng nhấn nút “So sánh”.<br>5\. Hệ thống kiểm tra số lượng cầu thủ, mùa giải và các chỉ số đã chọn.<br>6\. Hệ thống truy vấn thống kê của từng cầu thủ.<br>7\. Hệ thống chuẩn hóa các chỉ số cần thiết theo 90 phút.<br>8\. Hệ thống hiển thị bảng so sánh, biểu đồ và các chênh lệch nổi bật.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A5.1** – Người dùng chọn ít hơn hai hoặc nhiều hơn ba cầu thủ. Hệ thống hiển thị yêu cầu chọn từ hai đến ba cầu thủ.<br>**A5.2** – Các cầu thủ không có dữ liệu trong cùng mùa giải. Hệ thống yêu cầu chọn lại mùa hoặc cầu thủ.<br>**A6.1** – Một cầu thủ thiếu một số chỉ số. Hệ thống hiển thị “Chưa có dữ liệu” tại chỉ số tương ứng và tiếp tục hiển thị các chỉ số còn lại.<br>**A6.2** – Không tải được dữ liệu so sánh. Hệ thống hiển thị thông báo lỗi và cho phép thử lại. |
| **Điều kiện tiên quyết** | Có ít nhất hai cầu thủ trong CSDL và các cầu thủ có dữ liệu thống kê để so sánh. |
| **Hậu điều kiện** | Kết quả so sánh được hiển thị; dữ liệu cầu thủ không bị thay đổi. |

---

## 4. Đăng ký

| Tên use case | Đăng ký |
| :---- | :---- |
| **Tóm tắt** | UC cho phép GUEST tạo tài khoản USER mới để sử dụng shortlist cá nhân và chức năng tạo đội hình mơ ước. |
| **Tác nhân** | GUEST |
| **Sự kiện kích hoạt** | Người dùng chọn chức năng **“Đăng ký”** trên giao diện hệ thống. |
| **Use case liên quan** | Đăng nhập |
| **Dòng sự kiện chính** | 1\. Hệ thống hiển thị biểu mẫu đăng ký.<br>2\. Người dùng nhập họ tên, email, mật khẩu và xác nhận mật khẩu.<br>3\. Người dùng nhấn nút “Đăng ký”.<br>4\. Hệ thống kiểm tra tính đầy đủ và hợp lệ của thông tin.<br>5\. Hệ thống kiểm tra email đã tồn tại trong CSDL hay chưa.<br>6\. Hệ thống mã hóa mật khẩu.<br>7\. Hệ thống tạo tài khoản mới với vai trò USER và trạng thái hoạt động.<br>8\. Hệ thống hiển thị thông báo đăng ký thành công và điều hướng đến trang đăng nhập.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A4.1** – Thiếu trường bắt buộc hoặc email không đúng định dạng. Hệ thống hiển thị lỗi tại trường tương ứng. Quay lại bước 2.<br>**A4.2** – Mật khẩu không đáp ứng yêu cầu bảo mật hoặc không trùng với mật khẩu xác nhận. Hệ thống yêu cầu nhập lại.<br>**A5.1** – Email đã được sử dụng. Hệ thống thông báo tài khoản đã tồn tại và yêu cầu sử dụng email khác.<br>**A7.1** – Không thể lưu tài khoản. Hệ thống thông báo đăng ký thất bại và không tạo dữ liệu. |
| **Điều kiện tiên quyết** | Người dùng chưa đăng nhập và chưa có tài khoản với email đã nhập. |
| **Hậu điều kiện** | Tài khoản USER mới được tạo và lưu trong CSDL. |

---

## 5. Đăng nhập

| Tên use case | Đăng nhập |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER và ADMIN xác thực tài khoản để sử dụng các chức năng phù hợp với vai trò của mình. |
| **Tác nhân** | USER, ADMIN |
| **Sự kiện kích hoạt** | Người dùng truy cập trang đăng nhập hoặc chọn chức năng **“Đăng nhập”**. |
| **Use case liên quan** | Đăng ký, Đăng xuất |
| **Dòng sự kiện chính** | 1\. Hệ thống hiển thị biểu mẫu đăng nhập gồm email và mật khẩu.<br>2\. Người dùng nhập thông tin đăng nhập.<br>3\. Người dùng nhấn nút “Đăng nhập”.<br>4\. Hệ thống kiểm tra tính đầy đủ và định dạng dữ liệu.<br>5\. Hệ thống tìm tài khoản theo email và kiểm tra mật khẩu.<br>6\. Hệ thống kiểm tra trạng thái hoạt động của tài khoản.<br>7\. Hệ thống tạo access token và refresh token; refresh token được lưu dưới dạng an toàn trong CSDL.<br>8\. Hệ thống điều hướng người dùng đến giao diện phù hợp với vai trò.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A4.1** – Người dùng chưa nhập đầy đủ thông tin. Hệ thống yêu cầu bổ sung và quay lại bước 2.<br>**A5.1** – Email hoặc mật khẩu không chính xác. Hệ thống hiển thị thông báo đăng nhập thất bại và quay lại bước 2.<br>**A6.1** – Tài khoản đã bị vô hiệu hóa. Hệ thống từ chối đăng nhập và hiển thị thông báo liên hệ quản trị viên.<br>**A7.1** – Không thể tạo phiên đăng nhập. Hệ thống hiển thị thông báo lỗi và yêu cầu thử lại. |
| **Điều kiện tiên quyết** | Người dùng đã có tài khoản trong hệ thống. |
| **Hậu điều kiện** | Người dùng được xác thực, nhận phiên đăng nhập hợp lệ và được cấp quyền theo vai trò. |

---

## 6. Đăng xuất

| Tên use case | Đăng xuất |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER và ADMIN kết thúc phiên đăng nhập hiện tại một cách an toàn. |
| **Tác nhân** | USER, ADMIN |
| **Sự kiện kích hoạt** | Người dùng chọn chức năng **“Đăng xuất”**. |
| **Use case liên quan** | Đăng nhập |
| **Dòng sự kiện chính** | 1\. Hệ thống hiển thị hộp thoại xác nhận đăng xuất.<br>2\. Người dùng xác nhận đăng xuất.<br>3\. Hệ thống thu hồi hoặc xóa refresh token của phiên hiện tại.<br>4\. Hệ thống xóa access token và dữ liệu phiên ở phía giao diện.<br>5\. Hệ thống điều hướng người dùng về trang chủ công khai hoặc trang đăng nhập.<br>6\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A2.1** – Người dùng hủy thao tác. Hệ thống đóng hộp thoại và giữ nguyên phiên đăng nhập.<br>**A3.1** – Việc thu hồi token trên máy chủ gặp lỗi. Hệ thống vẫn xóa phiên phía giao diện và ghi nhận lỗi để xử lý. |
| **Điều kiện tiên quyết** | Người dùng đang đăng nhập. |
| **Hậu điều kiện** | Phiên đăng nhập hiện tại bị kết thúc; refresh token của phiên không còn được sử dụng để cấp access token mới. |

---

## 7. Quản lý shortlist cá nhân

| Tên use case | Quản lý shortlist cá nhân |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER xem, tạo, đổi tên và xóa các shortlist dùng để lưu những cầu thủ đang quan tâm. |
| **Tác nhân** | USER |
| **Sự kiện kích hoạt** | Người dùng chọn mục **“Shortlist của tôi”** trên thanh điều hướng. |
| **Use case liên quan** | Thêm cầu thủ vào shortlist, Xóa cầu thủ khỏi shortlist |
| **Dòng sự kiện chính** | 1\. Hệ thống xác định USER đang đăng nhập.<br>2\. Hệ thống truy vấn và hiển thị danh sách các shortlist thuộc USER.<br>3\. Người dùng có thể chọn tạo shortlist mới, mở một shortlist, đổi tên hoặc xóa shortlist.<br>4\. Đối với thao tác tạo, người dùng nhập tên và mô tả ngắn rồi xác nhận.<br>5\. Đối với thao tác đổi tên, hệ thống hiển thị dữ liệu hiện tại để người dùng chỉnh sửa.<br>6\. Đối với thao tác xóa, hệ thống yêu cầu người dùng xác nhận.<br>7\. Hệ thống kiểm tra quyền sở hữu và tính hợp lệ của dữ liệu.<br>8\. Hệ thống lưu thay đổi và cập nhật lại danh sách shortlist.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A2.1** – USER chưa có shortlist. Hệ thống hiển thị trạng thái rỗng và nút “Tạo shortlist”.<br>**A7.1** – Tên shortlist bị bỏ trống. Hệ thống yêu cầu nhập tên.<br>**A7.2** – Shortlist không thuộc USER hiện tại. Hệ thống từ chối thao tác.<br>**A6.1** – Người dùng hủy xác nhận xóa. Hệ thống giữ nguyên shortlist.<br>**A8.1** – Không thể lưu thay đổi. Hệ thống hiển thị thông báo lỗi và giữ dữ liệu cũ. |
| **Điều kiện tiên quyết** | USER đã đăng nhập. |
| **Hậu điều kiện** | Danh sách shortlist của USER được hiển thị hoặc được cập nhật theo thao tác đã thực hiện. |

---

## 8. Thêm cầu thủ vào shortlist

| Tên use case | Thêm cầu thủ vào shortlist |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER lưu một cầu thủ vào shortlist cá nhân để theo dõi, so sánh hoặc sử dụng khi tạo đội hình. |
| **Tác nhân** | USER |
| **Sự kiện kích hoạt** | USER chọn nút **“Thêm vào shortlist”** tại trang tìm kiếm, trang chi tiết hoặc trang so sánh. |
| **Use case liên quan** | Quản lý shortlist cá nhân |
| **Dòng sự kiện chính** | 1\. USER chọn một cầu thủ cần lưu.<br>2\. Hệ thống hiển thị danh sách shortlist thuộc USER.<br>3\. USER chọn shortlist đích hoặc tạo shortlist mới.<br>4\. USER nhập ghi chú ngắn nếu cần.<br>5\. USER xác nhận thêm cầu thủ.<br>6\. Hệ thống kiểm tra cầu thủ, quyền sở hữu shortlist và bản ghi trùng.<br>7\. Hệ thống tạo liên kết giữa shortlist và cầu thủ.<br>8\. Hệ thống hiển thị thông báo thêm thành công.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A2.1** – USER chưa có shortlist. Hệ thống cho phép tạo shortlist mới trước khi tiếp tục.<br>**A6.1** – Cầu thủ đã có trong shortlist được chọn. Hệ thống thông báo không thể thêm trùng và không tạo bản ghi mới.<br>**A6.2** – Shortlist không thuộc USER hiện tại. Hệ thống từ chối thao tác.<br>**A6.3** – Cầu thủ không tồn tại. Hệ thống hiển thị thông báo và kết thúc Use Case.<br>**A7.1** – Không thể lưu dữ liệu. Hệ thống thông báo thêm cầu thủ thất bại. |
| **Điều kiện tiên quyết** | USER đã đăng nhập; cầu thủ tồn tại trong hệ thống. |
| **Hậu điều kiện** | Cầu thủ được lưu duy nhất một lần trong shortlist đã chọn. |

---

## 9. Xóa cầu thủ khỏi shortlist

| Tên use case | Xóa cầu thủ khỏi shortlist |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER loại bỏ một cầu thủ không còn quan tâm khỏi shortlist cá nhân. |
| **Tác nhân** | USER |
| **Sự kiện kích hoạt** | USER chọn chức năng **“Xóa khỏi shortlist”** tại một cầu thủ trong shortlist. |
| **Use case liên quan** | Quản lý shortlist cá nhân |
| **Dòng sự kiện chính** | 1\. USER chọn cầu thủ cần xóa khỏi shortlist.<br>2\. Hệ thống hiển thị hộp thoại xác nhận.<br>3\. USER xác nhận xóa.<br>4\. Hệ thống kiểm tra shortlist thuộc USER hiện tại.<br>5\. Hệ thống xóa liên kết giữa shortlist và cầu thủ.<br>6\. Hệ thống cập nhật danh sách cầu thủ trên giao diện.<br>7\. Hệ thống hiển thị thông báo xóa thành công.<br>8\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A3.1** – USER hủy thao tác. Hệ thống đóng hộp thoại và giữ nguyên dữ liệu.<br>**A4.1** – Shortlist không thuộc USER hiện tại. Hệ thống từ chối thao tác.<br>**A5.1** – Cầu thủ không còn tồn tại trong shortlist. Hệ thống tải lại danh sách hiện tại.<br>**A5.2** – Không thể xóa dữ liệu. Hệ thống hiển thị thông báo lỗi. |
| **Điều kiện tiên quyết** | USER đã đăng nhập; cầu thủ đang tồn tại trong shortlist thuộc USER. |
| **Hậu điều kiện** | Cầu thủ không còn nằm trong shortlist đã chọn; dữ liệu gốc của cầu thủ không bị xóa. |

---

## 10. Quản lý đội hình mơ ước

| Tên use case | Quản lý đội hình mơ ước |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER tạo, xem, chỉnh sửa và xóa các đội hình bóng đá mơ ước từ dữ liệu cầu thủ có sẵn. |
| **Tác nhân** | USER |
| **Sự kiện kích hoạt** | USER chọn mục **“Đội hình của tôi”** hoặc **“Squad Builder”**. |
| **Use case liên quan** | Chọn sơ đồ chiến thuật, Thêm cầu thủ vào đội hình / dự bị, Kéo thả và sắp xếp vị trí cầu thủ, Chọn đội trưởng và quản lý cầu thủ dự bị |
| **Dòng sự kiện chính** | 1\. Hệ thống xác định USER đang đăng nhập.<br>2\. Hệ thống truy vấn và hiển thị danh sách đội hình thuộc USER.<br>3\. USER chọn tạo đội hình mới hoặc mở một đội hình đã có.<br>4\. Nếu tạo mới, USER nhập tên đội hình và chọn sơ đồ chiến thuật ban đầu.<br>5\. Hệ thống hiển thị sân bóng, các slot vị trí và khu vực cầu thủ dự bị.<br>6\. USER thêm, xóa hoặc sắp xếp cầu thủ; chọn đội trưởng nếu cần.<br>7\. USER nhấn nút “Lưu đội hình”.<br>8\. Hệ thống kiểm tra quyền sở hữu, sơ đồ, slot, cầu thủ trùng, số lượng cầu thủ và đội trưởng.<br>9\. Hệ thống lưu đội hình và hiển thị thông báo thành công.<br>10\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A2.1** – USER chưa có đội hình. Hệ thống hiển thị trạng thái rỗng và nút “Tạo đội hình”.<br>**A8.1** – Có cầu thủ xuất hiện hai lần hoặc hai cầu thủ nằm cùng một slot. Hệ thống hiển thị lỗi và không lưu.<br>**A8.2** – Sơ đồ hoặc slot không được hỗ trợ. Hệ thống yêu cầu người dùng chọn lại.<br>**A8.3** – Đội hình có nhiều hơn một đội trưởng. Hệ thống yêu cầu chỉ giữ một đội trưởng.<br>**A8.4** – USER cố sửa hoặc xóa đội hình của người khác. Hệ thống từ chối thao tác.<br>**A9.1** – Không thể lưu đội hình. Hệ thống hiển thị lỗi và giữ dữ liệu đang chỉnh sửa. |
| **Điều kiện tiên quyết** | USER đã đăng nhập. |
| **Hậu điều kiện** | Đội hình của USER được tạo, cập nhật hoặc xóa theo thao tác; các quy tắc đội hình được bảo đảm. |

---

## 11. Chọn sơ đồ chiến thuật

| Tên use case | Chọn sơ đồ chiến thuật |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER chọn một sơ đồ chiến thuật được hỗ trợ để hệ thống tạo các slot vị trí tương ứng trên sân. |
| **Tác nhân** | USER |
| **Sự kiện kích hoạt** | USER tạo đội hình mới hoặc thay đổi trường **“Sơ đồ chiến thuật”** trong Squad Builder. |
| **Use case liên quan** | Quản lý đội hình mơ ước |
| **Dòng sự kiện chính** | 1\. Hệ thống hiển thị danh sách sơ đồ được hỗ trợ như 4-3-3, 4-2-3-1, 4-4-2, 3-5-2 và 3-4-3.<br>2\. USER chọn một sơ đồ.<br>3\. Hệ thống kiểm tra mã sơ đồ.<br>4\. Hệ thống tạo hoặc cập nhật danh sách slot tương ứng.<br>5\. Hệ thống hiển thị sơ đồ mới trên sân bóng.<br>6\. Nếu đội hình đã có cầu thủ, hệ thống kiểm tra các slot cũ còn tồn tại trong sơ đồ mới.<br>7\. USER xác nhận áp dụng sơ đồ.<br>8\. Hệ thống lưu sơ đồ đã chọn.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A3.1** – Sơ đồ không được hỗ trợ. Hệ thống từ chối áp dụng và giữ sơ đồ hiện tại.<br>**A6.1** – Một số cầu thủ đang ở slot không tồn tại trong sơ đồ mới. Hệ thống cảnh báo và chuyển các cầu thủ đó sang khu vực chưa xếp hoặc dự bị sau khi USER xác nhận.<br>**A7.1** – USER hủy thay đổi. Hệ thống giữ nguyên sơ đồ và vị trí hiện tại. |
| **Điều kiện tiên quyết** | USER đã đăng nhập và đang tạo hoặc chỉnh sửa một đội hình thuộc quyền sở hữu của mình. |
| **Hậu điều kiện** | Đội hình sử dụng sơ đồ được hỗ trợ và có danh sách slot phù hợp. |

---

## 12. Thêm cầu thủ vào đội hình / dự bị

| Tên use case | Thêm cầu thủ vào đội hình / dự bị |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER thêm cầu thủ từ kết quả tìm kiếm, trang chi tiết, trang so sánh hoặc shortlist vào đội hình chính hay danh sách dự bị. |
| **Tác nhân** | USER |
| **Sự kiện kích hoạt** | USER chọn nút **“Thêm vào đội hình”** tại một cầu thủ hoặc tìm cầu thủ trực tiếp trong Squad Builder. |
| **Use case liên quan** | Quản lý đội hình mơ ước, Kéo thả và sắp xếp vị trí cầu thủ |
| **Dòng sự kiện chính** | 1\. USER chọn cầu thủ cần thêm.<br>2\. Hệ thống hiển thị các đội hình thuộc USER hoặc sử dụng đội hình đang mở.<br>3\. USER chọn vai trò “Đội hình chính” hoặc “Dự bị”.<br>4\. Nếu chọn đội hình chính, USER chọn một slot còn trống.<br>5\. USER xác nhận thêm cầu thủ.<br>6\. Hệ thống kiểm tra quyền sở hữu đội hình, cầu thủ trùng, slot trùng và giới hạn số cầu thủ.<br>7\. Hệ thống kiểm tra vị trí của cầu thủ so với slot.<br>8\. Hệ thống thêm cầu thủ và cập nhật giao diện đội hình.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A6.1** – Cầu thủ đã tồn tại trong đội hình. Hệ thống thông báo không thể thêm trùng.<br>**A6.2** – Slot đã có cầu thủ. Hệ thống yêu cầu chọn slot khác.<br>**A6.3** – Đội hình chính đã đủ 11 cầu thủ. Hệ thống chỉ cho phép thêm vào danh sách dự bị hoặc thay thế cầu thủ.<br>**A7.1** – Cầu thủ được xếp trái vị trí sở trường. Hệ thống hiển thị cảnh báo nhưng vẫn cho phép lưu, trừ trường hợp vị trí bị cấm.<br>**A7.2** – Thủ môn được xếp vào vị trí không hợp lệ hoặc cầu thủ không phải thủ môn được xếp vào GK theo quy tắc cứng. Hệ thống từ chối thao tác.<br>**A8.1** – Không thể lưu dữ liệu. Hệ thống hiển thị thông báo thêm cầu thủ thất bại. |
| **Điều kiện tiên quyết** | USER đã đăng nhập; đội hình và cầu thủ tồn tại; đội hình thuộc USER. |
| **Hậu điều kiện** | Cầu thủ được thêm duy nhất một lần vào đội hình chính hoặc danh sách dự bị. |

---

## 13. Kéo thả và sắp xếp vị trí cầu thủ

| Tên use case | Kéo thả và sắp xếp vị trí cầu thủ |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER kéo thả cầu thủ giữa các slot trên sân hoặc giữa đội hình chính và khu vực dự bị. |
| **Tác nhân** | USER |
| **Sự kiện kích hoạt** | USER kéo một thẻ cầu thủ và thả vào slot hoặc khu vực dự bị trong Squad Builder. |
| **Use case liên quan** | Quản lý đội hình mơ ước, Thêm cầu thủ vào đội hình / dự bị |
| **Dòng sự kiện chính** | 1\. USER bắt đầu kéo một cầu thủ đang có trong đội hình.<br>2\. Hệ thống đánh dấu các vị trí có thể thả.<br>3\. USER thả cầu thủ vào slot hoặc khu vực dự bị mong muốn.<br>4\. Hệ thống kiểm tra slot tồn tại trong sơ đồ và chưa bị chiếm.<br>5\. Hệ thống kiểm tra quy tắc về vị trí, cầu thủ trùng và vai trò chính/dự bị.<br>6\. Hệ thống cập nhật vị trí tạm thời và hiển thị cảnh báo trái vị trí nếu có.<br>7\. USER nhấn nút “Lưu đội hình”.<br>8\. Hệ thống lưu vị trí mới của cầu thủ.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A4.1** – Slot không tồn tại hoặc đã có cầu thủ. Hệ thống đưa cầu thủ về vị trí cũ và hiển thị cảnh báo.<br>**A5.1** – Thao tác làm cầu thủ xuất hiện đồng thời ở đội hình chính và dự bị. Hệ thống từ chối cập nhật.<br>**A5.2** – Vị trí bị cấm theo quy tắc nghiệp vụ. Hệ thống đưa cầu thủ về vị trí cũ.<br>**A7.1** – USER rời trang khi chưa lưu. Hệ thống cảnh báo có thay đổi chưa được lưu.<br>**A8.1** – Không thể cập nhật dữ liệu. Hệ thống phục hồi vị trí trước đó và hiển thị lỗi. |
| **Điều kiện tiên quyết** | USER đã đăng nhập và đang chỉnh sửa đội hình thuộc quyền sở hữu của mình; đội hình đã có ít nhất một cầu thủ. |
| **Hậu điều kiện** | Vị trí hoặc vai trò chính/dự bị của cầu thủ được cập nhật hợp lệ. |

---

## 14. Chọn đội trưởng và quản lý cầu thủ dự bị

| Tên use case | Chọn đội trưởng và quản lý cầu thủ dự bị |
| :---- | :---- |
| **Tóm tắt** | UC cho phép USER chọn đúng một đội trưởng và quản lý danh sách cầu thủ dự bị của đội hình. |
| **Tác nhân** | USER |
| **Sự kiện kích hoạt** | USER chọn biểu tượng đội trưởng hoặc thao tác thêm, chuyển, xóa cầu thủ tại khu vực dự bị. |
| **Use case liên quan** | Quản lý đội hình mơ ước |
| **Dòng sự kiện chính** | 1\. Hệ thống hiển thị đội hình chính và danh sách cầu thủ dự bị.<br>2\. USER chọn một cầu thủ trong đội hình chính làm đội trưởng.<br>3\. Hệ thống kiểm tra cầu thủ được chọn đang thuộc đội hình chính.<br>4\. Hệ thống bỏ trạng thái đội trưởng của cầu thủ cũ nếu có và gán cho cầu thủ mới.<br>5\. USER thêm, chuyển vị trí hoặc xóa cầu thủ trong khu vực dự bị nếu cần.<br>6\. Hệ thống kiểm tra cầu thủ dự bị không đồng thời xuất hiện trong đội hình chính.<br>7\. USER lưu đội hình.<br>8\. Hệ thống lưu đội trưởng và danh sách dự bị.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A3.1** – USER chọn một cầu thủ dự bị làm đội trưởng. Hệ thống từ chối và yêu cầu chọn cầu thủ trong đội hình chính.<br>**A4.1** – Đội hình đã có đội trưởng. Hệ thống yêu cầu xác nhận thay đổi đội trưởng trước khi cập nhật.<br>**A6.1** – Cầu thủ dự bị đã tồn tại trong đội hình chính hoặc danh sách dự bị. Hệ thống không cho thêm trùng.<br>**A8.1** – Không thể lưu thay đổi. Hệ thống hiển thị lỗi và giữ trạng thái cũ. |
| **Điều kiện tiên quyết** | USER đã đăng nhập; đội hình thuộc USER và đã có cầu thủ. |
| **Hậu điều kiện** | Đội hình có tối đa một đội trưởng; danh sách dự bị được lưu mà không trùng với đội hình chính. |

---

## 15. Quản lý người dùng

| Tên use case | Quản lý người dùng |
| :---- | :---- |
| **Tóm tắt** | UC cho phép ADMIN tra cứu và quản lý tài khoản USER, bao gồm xem thông tin, thay đổi trạng thái hoạt động và phân quyền hợp lệ. |
| **Tác nhân** | ADMIN |
| **Sự kiện kích hoạt** | ADMIN chọn mục **“Quản lý người dùng”** trên trang quản trị. |
| **Use case liên quan** | Xem audit log |
| **Dòng sự kiện chính** | 1\. Hệ thống kiểm tra quyền ADMIN.<br>2\. Hệ thống hiển thị danh sách người dùng kèm email, vai trò, trạng thái và thời gian tạo.<br>3\. ADMIN tìm kiếm hoặc lọc danh sách người dùng.<br>4\. ADMIN chọn một tài khoản để xem chi tiết.<br>5\. ADMIN chọn thao tác cập nhật vai trò hoặc kích hoạt/vô hiệu hóa tài khoản.<br>6\. Hệ thống hiển thị hộp thoại xác nhận.<br>7\. ADMIN xác nhận thao tác.<br>8\. Hệ thống kiểm tra tính hợp lệ và cập nhật tài khoản.<br>9\. Hệ thống ghi audit log và cập nhật giao diện.<br>10\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A1.1** – Người dùng không có quyền ADMIN. Hệ thống trả về lỗi không có quyền truy cập.<br>**A4.1** – Tài khoản không tồn tại. Hệ thống thông báo và tải lại danh sách.<br>**A5.1** – ADMIN cố vô hiệu hóa chính tài khoản đang sử dụng nếu hệ thống không cho phép. Hệ thống từ chối thao tác.<br>**A7.1** – ADMIN hủy xác nhận. Hệ thống không thay đổi dữ liệu.<br>**A8.1** – Vai trò hoặc trạng thái không hợp lệ. Hệ thống hiển thị lỗi.<br>**A8.2** – Không thể cập nhật tài khoản. Hệ thống giữ nguyên dữ liệu cũ. |
| **Điều kiện tiên quyết** | ADMIN đã đăng nhập và có quyền quản lý người dùng. |
| **Hậu điều kiện** | Thông tin hoặc trạng thái tài khoản được cập nhật hợp lệ; thao tác được ghi vào audit log. |

---

## 16. Quản lý đồng bộ dữ liệu

| Tên use case | Quản lý đồng bộ dữ liệu |
| :---- | :---- |
| **Tóm tắt** | UC cho phép ADMIN cấu hình, kích hoạt và theo dõi quá trình đồng bộ dữ liệu bóng đá từ external football API. |
| **Tác nhân** | ADMIN |
| **Sự kiện kích hoạt** | ADMIN chọn mục **“Quản lý đồng bộ dữ liệu”** trên trang quản trị. |
| **Use case liên quan** | Chọn giải đấu và mùa giải đồng bộ, Chạy job đồng bộ, Theo dõi trạng thái và lỗi đồng bộ, Đồng bộ dữ liệu bóng đá |
| **Dòng sự kiện chính** | 1\. Hệ thống kiểm tra quyền ADMIN.<br>2\. Hệ thống hiển thị trang quản lý đồng bộ gồm cấu hình hiện tại, danh sách job và trạng thái gần nhất.<br>3\. ADMIN chọn giải đấu và mùa giải cần đồng bộ.<br>4\. ADMIN lưu cấu hình đồng bộ.<br>5\. ADMIN chọn chạy job đồng bộ.<br>6\. Hệ thống tạo job và hiển thị trạng thái xử lý.<br>7\. ADMIN theo dõi số lượng bản ghi đã xử lý, trạng thái và lỗi nếu có.<br>8\. Hệ thống cập nhật lịch sử job và cho phép xem chi tiết.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A1.1** – Người dùng không có quyền ADMIN. Hệ thống từ chối truy cập.<br>**A3.1** – Chưa có giải đấu hoặc mùa giải khả dụng. Hệ thống hiển thị thông báo cấu hình nguồn dữ liệu.<br>**A5.1** – Cấu hình chưa hợp lệ. Hệ thống không tạo job và yêu cầu hoàn tất cấu hình.<br>**A5.2** – Đã có job trùng phạm vi đang chạy. Hệ thống cảnh báo và không tạo thêm job trùng.<br>**A7.1** – Job thất bại. Hệ thống ghi lỗi, đánh dấu FAILED và cho phép ADMIN xem chi tiết hoặc chạy lại. |
| **Điều kiện tiên quyết** | ADMIN đã đăng nhập; external API và thông tin xác thực đã được cấu hình. |
| **Hậu điều kiện** | Cấu hình đồng bộ được lưu và/hoặc job đồng bộ được tạo; trạng thái và lịch sử được ghi nhận. |

---

## 17. Chọn giải đấu và mùa giải đồng bộ

| Tên use case | Chọn giải đấu và mùa giải đồng bộ |
| :---- | :---- |
| **Tóm tắt** | UC cho phép ADMIN xác định phạm vi dữ liệu cần lấy từ external football API bằng cách chọn giải đấu và mùa giải. |
| **Tác nhân** | ADMIN |
| **Sự kiện kích hoạt** | ADMIN mở phần cấu hình trong trang **“Quản lý đồng bộ dữ liệu”**. |
| **Use case liên quan** | Quản lý đồng bộ dữ liệu, Chạy job đồng bộ |
| **Dòng sự kiện chính** | 1\. Hệ thống hiển thị danh sách nhà cung cấp, giải đấu và mùa giải khả dụng.<br>2\. ADMIN chọn nhà cung cấp dữ liệu nếu hệ thống hỗ trợ nhiều nguồn.<br>3\. ADMIN chọn một giải đấu.<br>4\. Hệ thống tải danh sách mùa giải tương ứng.<br>5\. ADMIN chọn mùa giải cần đồng bộ.<br>6\. ADMIN xác nhận lưu cấu hình.<br>7\. Hệ thống kiểm tra mã giải đấu, mùa giải và khả năng truy cập nguồn dữ liệu.<br>8\. Hệ thống lưu cấu hình đồng bộ.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A1.1** – Không tải được danh sách giải đấu hoặc mùa giải. Hệ thống hiển thị lỗi kết nối nguồn dữ liệu.<br>**A5.1** – ADMIN chưa chọn đủ giải đấu và mùa giải. Hệ thống yêu cầu bổ sung.<br>**A7.1** – Giải đấu hoặc mùa giải không còn được nhà cung cấp hỗ trợ. Hệ thống từ chối lưu.<br>**A8.1** – Không thể lưu cấu hình. Hệ thống giữ cấu hình trước đó. |
| **Điều kiện tiên quyết** | ADMIN đã đăng nhập; external API đã được cấu hình. |
| **Hậu điều kiện** | Phạm vi giải đấu và mùa giải đồng bộ được lưu để sử dụng khi tạo job. |

---

## 18. Chạy job đồng bộ

| Tên use case | Chạy job đồng bộ |
| :---- | :---- |
| **Tóm tắt** | UC cho phép ADMIN tạo và kích hoạt một job đồng bộ theo phạm vi giải đấu và mùa giải đã chọn. |
| **Tác nhân** | ADMIN |
| **Sự kiện kích hoạt** | ADMIN nhấn nút **“Chạy đồng bộ”** tại trang quản lý đồng bộ dữ liệu. |
| **Use case liên quan** | Quản lý đồng bộ dữ liệu, Chọn giải đấu và mùa giải đồng bộ, Đồng bộ dữ liệu bóng đá |
| **Dòng sự kiện chính** | 1\. ADMIN chọn cấu hình giải đấu và mùa giải cần chạy.<br>2\. ADMIN nhấn nút “Chạy đồng bộ”.<br>3\. Hệ thống kiểm tra cấu hình, quyền ADMIN và trạng thái các job hiện tại.<br>4\. Hệ thống tạo một data synchronization job với trạng thái PENDING.<br>5\. Hệ thống chuyển job sang RUNNING và kích hoạt UC Đồng bộ dữ liệu bóng đá.<br>6\. Hệ thống trả về mã job và hiển thị trạng thái trên giao diện.<br>7\. Hệ thống cập nhật tiến độ trong quá trình xử lý.<br>8\. Khi hoàn tất, hệ thống cập nhật job thành SUCCESS hoặc FAILED.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A3.1** – Cấu hình thiếu hoặc không hợp lệ. Hệ thống không tạo job và yêu cầu chọn lại phạm vi.<br>**A3.2** – Đã có job cùng phạm vi đang chạy. Hệ thống thông báo và không tạo job trùng.<br>**A4.1** – Không thể tạo job trong CSDL. Hệ thống thông báo chạy đồng bộ thất bại.<br>**A5.1** – Không thể khởi chạy tiến trình nền. Hệ thống cập nhật job thành FAILED và ghi lỗi.<br>**A8.1** – Job xử lý một phần dữ liệu rồi thất bại. Hệ thống lưu số lượng đã xử lý và chi tiết lỗi để ADMIN theo dõi. |
| **Điều kiện tiên quyết** | ADMIN đã đăng nhập; đã chọn giải đấu và mùa giải hợp lệ; external API có thể được truy cập. |
| **Hậu điều kiện** | Một job đồng bộ được ghi nhận với trạng thái cuối cùng hoặc trạng thái đang chạy; lịch sử job được lưu. |

---

## 19. Đồng bộ dữ liệu bóng đá

| Tên use case | Đồng bộ dữ liệu bóng đá |
| :---- | :---- |
| **Tóm tắt** | UC cho phép hệ thống lấy dữ liệu đội bóng, cầu thủ, giải đấu, mùa giải và thống kê từ external football API, chuẩn hóa rồi upsert vào PostgreSQL. |
| **Tác nhân** | External Football API; ADMIN là tác nhân khởi tạo gián tiếp thông qua job đồng bộ |
| **Sự kiện kích hoạt** | Một data synchronization job chuyển sang trạng thái RUNNING. |
| **Use case liên quan** | Chạy job đồng bộ, Theo dõi trạng thái và lỗi đồng bộ |
| **Dòng sự kiện chính** | 1\. Hệ thống đọc cấu hình nhà cung cấp, giải đấu và mùa giải từ job.<br>2\. Hệ thống gửi yêu cầu đến external football API.<br>3\. External Football API trả về dữ liệu đội bóng, cầu thủ, giải đấu, mùa giải và thống kê.<br>4\. Hệ thống kiểm tra cấu trúc, tính hợp lệ và định danh external ID của dữ liệu.<br>5\. Hệ thống chuẩn hóa dữ liệu về mô hình của ScoutBoard.<br>6\. Hệ thống upsert đội bóng, cầu thủ, giải đấu, mùa giải và thống kê theo external provider và external ID.<br>7\. Hệ thống cập nhật số bản ghi đã tạo, cập nhật, bỏ qua hoặc lỗi.<br>8\. Hệ thống ghi data sync log.<br>9\. Hệ thống cập nhật job thành SUCCESS.<br>10\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A2.1** – External API trả về lỗi tạm thời hoặc quá giới hạn rate limit. Hệ thống chờ theo backoff và retry trong số lần cho phép.<br>**A2.2** – External API không khả dụng sau số lần retry. Hệ thống ghi lỗi và cập nhật job thành FAILED.<br>**A4.1** – Một bản ghi thiếu dữ liệu không bắt buộc. Hệ thống lưu các trường còn thiếu dưới dạng NULL và tiếp tục xử lý.<br>**A4.2** – Một bản ghi không có external ID hoặc vi phạm dữ liệu bắt buộc. Hệ thống bỏ qua bản ghi, ghi lỗi chi tiết và tiếp tục với bản ghi khác.<br>**A6.1** – Có lỗi CSDL trong transaction. Hệ thống rollback phạm vi dữ liệu bị lỗi, ghi log và cập nhật job phù hợp.<br>**A9.1** – Job chỉ thành công một phần theo chính sách hệ thống. Hệ thống lưu thống kê lỗi và đánh dấu trạng thái phù hợp để ADMIN kiểm tra. |
| **Điều kiện tiên quyết** | Job đồng bộ hợp lệ đang chạy; API key và cấu hình nguồn dữ liệu tồn tại. |
| **Hậu điều kiện** | Dữ liệu bóng đá trong CSDL được tạo mới hoặc cập nhật mà không tạo bản ghi trùng; job và log đồng bộ được cập nhật. |

---

## 20. Theo dõi trạng thái và lỗi đồng bộ

| Tên use case | Theo dõi trạng thái và lỗi đồng bộ |
| :---- | :---- |
| **Tóm tắt** | UC cho phép ADMIN xem tiến độ, trạng thái, số lượng bản ghi xử lý và lỗi của các data synchronization job. |
| **Tác nhân** | ADMIN |
| **Sự kiện kích hoạt** | ADMIN mở danh sách job hoặc chọn một job trong trang quản lý đồng bộ. |
| **Use case liên quan** | Quản lý đồng bộ dữ liệu, Chạy job đồng bộ, Đồng bộ dữ liệu bóng đá |
| **Dòng sự kiện chính** | 1\. Hệ thống kiểm tra quyền ADMIN.<br>2\. Hệ thống truy vấn danh sách job đồng bộ.<br>3\. Hệ thống hiển thị mã job, phạm vi dữ liệu, thời gian bắt đầu, thời gian kết thúc, trạng thái và tiến độ.<br>4\. ADMIN tìm kiếm hoặc lọc job theo trạng thái, giải đấu, mùa giải hoặc thời gian.<br>5\. ADMIN chọn một job để xem chi tiết.<br>6\. Hệ thống hiển thị số bản ghi đã tạo, cập nhật, bỏ qua, thất bại và các log liên quan.<br>7\. Nếu job thất bại, hệ thống hiển thị thông báo lỗi và bước xử lý bị lỗi.<br>8\. ADMIN có thể quay lại danh sách hoặc chọn chạy lại job theo quyền được cấp.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A2.1** – Chưa có job đồng bộ. Hệ thống hiển thị trạng thái rỗng.<br>**A2.2** – Không tải được danh sách job. Hệ thống hiển thị lỗi và cho phép thử lại.<br>**A5.1** – Job không tồn tại. Hệ thống thông báo và quay lại danh sách.<br>**A6.1** – Log chi tiết đã bị thiếu hoặc không truy xuất được. Hệ thống vẫn hiển thị thông tin tổng quan của job. |
| **Điều kiện tiên quyết** | ADMIN đã đăng nhập. |
| **Hậu điều kiện** | Thông tin trạng thái và lỗi đồng bộ được hiển thị; dữ liệu không bị thay đổi nếu ADMIN không chọn chạy lại. |

---

## 21. Xem audit log

| Tên use case | Xem audit log |
| :---- | :---- |
| **Tóm tắt** | UC cho phép ADMIN tra cứu lịch sử các hành động quan trọng được thực hiện trong hệ thống. |
| **Tác nhân** | ADMIN |
| **Sự kiện kích hoạt** | ADMIN chọn mục **“Audit log”** trên trang quản trị. |
| **Use case liên quan** | Quản lý người dùng, Quản lý đồng bộ dữ liệu |
| **Dòng sự kiện chính** | 1\. Hệ thống kiểm tra quyền ADMIN.<br>2\. Hệ thống hiển thị giao diện audit log và các bộ lọc.<br>3\. ADMIN chọn khoảng thời gian, tác nhân, loại hành động, tài nguyên hoặc trạng thái.<br>4\. Hệ thống kiểm tra điều kiện lọc.<br>5\. Hệ thống truy vấn các audit log phù hợp.<br>6\. Hệ thống hiển thị danh sách log gồm thời gian, người thực hiện, hành động, tài nguyên, kết quả và correlation ID nếu có.<br>7\. ADMIN chọn một log để xem chi tiết dữ liệu trước và sau hoặc thông tin lỗi được phép hiển thị.<br>8\. Hệ thống hiển thị chi tiết log ở chế độ chỉ đọc.<br>9\. Kết thúc Use Case. |
| **Dòng sự kiện phụ** | **A4.1** – Khoảng thời gian hoặc điều kiện lọc không hợp lệ. Hệ thống yêu cầu ADMIN điều chỉnh.<br>**A5.1** – Không có log phù hợp. Hệ thống hiển thị thông báo “Không tìm thấy audit log”.<br>**A5.2** – Không thể truy vấn audit log. Hệ thống hiển thị thông báo lỗi và cho phép thử lại.<br>**A7.1** – Một số dữ liệu nhạy cảm đã được che hoặc không được lưu. Hệ thống chỉ hiển thị phần thông tin được phép. |
| **Điều kiện tiên quyết** | ADMIN đã đăng nhập và có quyền xem audit log. |
| **Hậu điều kiện** | Danh sách hoặc chi tiết audit log được hiển thị ở chế độ chỉ đọc. |

---
