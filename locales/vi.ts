// Vietnamese translations
export const vi = {
    // Common
    common: {
        loading: 'Đang tải...',
        error: 'Lỗi',
        success: 'Thành công',
        cancel: 'Hủy',
        confirm: 'Xác nhận',
        save: 'Lưu',
        delete: 'Xóa',
        edit: 'Sửa',
        view: 'Xem',
        search: 'Tìm kiếm',
        back: 'Quay lại',
        next: 'Tiếp theo',
        results: 'kết quả',
        male: 'Nam',
        female: 'Nữ',
        other: 'Khác',
        none: 'Không có'
    },

    // Navigation
    nav: {
        dashboard: 'Tổng quan',
        timesheets: 'Bảng chấm công',
        schedule: 'Lịch làm việc',
        reports: 'Báo cáo',
        settings: 'Cài đặt',
        signOut: 'Đăng xuất',
        account: 'Tài khoản',
    },

    // Dashboard
    dashboard: {
        currentTime: 'Thời gian hiện tại',
        location: 'Trụ sở FHB Vietnam',
        checkIn: 'CLOCK IN',
        checkOut: 'CLOCK OUT',
        locating: 'Đang kiểm tra...',
        done: 'HOÀN THÀNH',
        checkedInMessage: 'Chào mừng bạn. Chúc bạn 1 ngày làm việc hiệu quả nhé 👍',
        readyToStart: 'Chào {{name}}, bạn sẵn sàng cho một ngày làm việc đầy năng lượng chưa?',
        completedShift: 'Bạn đã hoàn thành ca làm hôm nay.',
        weeklyProgress: 'Tiến độ tuần',
        recentHistory: 'Lịch sử gần đây',
        attendanceLog: 'Nhật ký Chấm công',
        noRecentActivity: 'Chưa có hoạt động gần đây.',
        onTrack: 'Thời gian bạn đã làm việc trong tuần này:',
        goalAchieved: 'Đã đạt mục tiêu!',
        in: 'VÀO',
        out: 'RA',
        date: 'NGÀY',
        inOut: 'VÀO/RA',
        hours: 'SỐ GIỜ',
        history: 'Lịch sử',
        standardHours: 'Giờ chuẩn',
        overtime: 'Tăng ca',
        lateArrivals: 'Đi trễ',
        lateCount: 'Số lần',
        lateMinutes: 'Số phút',
        weeklyBreakdown: 'Chi tiết theo tuần',
        monthlyBreakdown: 'Chi tiết theo tháng',
        visualizingWeekly: 'Theo dõi hiệu suất làm việc trong tuần',
        visualizingMonthly: 'Biểu đồ hiệu suất làm việc trong tháng [Month]',
        week: 'Tuần',
        month: 'Tháng',
        totalWorkTime: 'Tổng thời gian làm việc',
    },

    // Admin
    admin: {
        adminPanel: 'Bảng quản trị',
        userDashboard: 'Bảng người dùng',
        headerTitle: 'Hệ thống quản trị Chấm Công',
        searchPlaceholder: 'Tìm kiếm nhanh...',
        // Menu Items

        approvals: 'Phê duyệt',
        auditLogs: 'Nhật ký hệ thống',
        settings: 'Cài đặt',

        overview: 'Tổng quan',
        employees: 'Nhân viên',
        attendance: 'Chấm công',
        reports: 'Báo cáo',
        totalEmployees: 'Tổng nhân viên',
        present: 'Có mặt',
        absent: 'Vắng mặt',
        late: 'Đi trễ',
        systemStatus: 'Trạng thái hệ thống',
        liveSyncActive: 'Đồng bộ trực tiếp',
        connecting: 'Đang kết nối...',
        syncOffline: 'Mất kết nối',
        // New Dashboard Keys
        pendingRequests: 'Yêu cầu chờ duyệt',
        actionNeeded: 'Cần xử lý',
        allClear: 'Đã sạch sẽ',
        leave: 'Nghỉ phép',
        changes: 'Thay đổi',
        currentlyIn: 'Đang làm việc',
        live: 'Trực tuyến',
        lateArrivals: 'Đi trễ',
        offAbsent: 'Nghỉ / Vắng',
        today: 'Hôm nay',
        attendanceTrend: 'Xu hướng chấm công',
        visualizingWorkforce: 'Biểu đồ nhân sự hoạt động',
        departmentDistribution: 'Phân bổ phòng ban',
        headcountByDivision: 'Số lượng theo bộ phận',
        activePersonnel: 'Nhân sự hoạt động',
        realTimeStatus: 'Trạng thái thực gian thực',
        export: 'Xuất excel',
        filter: 'Bộ lọc',
        employee: 'Nhân viên',
        department: 'Phòng ban',
        status: 'Trạng thái',
        clockIn: 'Giờ vào',
        dailyTotal: 'Tổng giờ',
        actions: 'Thao tác',
        showingResults: 'Hiển thị {count} kết quả',
        noActiveCheckins: 'Chưa có nhân viên nào châm công hôm nay.',
        clockedIn: 'Đang làm',
        checkedOut: 'Đã về',
        completed: 'Hoàn thành',
        days7: '7 Ngày',
        days30: '30 Ngày',
        realTimeData: 'Dữ liệu thời gian thực ngày',
        reportDashboard: {
            title: 'Quản lý Báo cáo',
            subtitle: 'Phân tích hiệu suất và phê duyệt báo cáo công việc nhân viên.',
            export: 'Xuất báo cáo',
            thisMonth: 'Tháng này',
            lastMonth: 'Tháng trước',
            stats: {
                totalReports: 'Tổng báo cáo',
                completed: 'Hoàn thành',
                onTime: 'Đúng hạn',
                late: 'Gửi muộn',
                monthlyTotal: 'Tổng tháng',
                consistencyLevel: 'Mức độ ổn định',
                reviewNeeded: 'Cần xem xét'
            },
            chart: {
                title: 'Thống kê gửi báo cáo',
                subtitle: 'Xu hướng hoàn thành công việc theo từng ngày'
            },
            searchPlaceholder: 'Tìm kiếm theo tên hoặc nội dung báo cáo...',
            filterType: 'Loại báo cáo',
            filterStatus: 'Trạng thái xử lý',
            types: {
                all: 'Tất cả',
                daily: 'Báo cáo Ngày',
                weekly: 'Báo cáo Tuần',
                monthly: 'Báo cáo Tháng',
                makeup: 'Báo cáo Bù'
            },
            status: {
                all: 'Tất cả báo cáo',
                unread: 'Chưa xem',
                updated: 'Có cập nhật',
                viewed: 'Đã xem ổn định',
                approved: 'Đã phê duyệt',
                changesRequested: 'Cần chỉnh sửa'
            },
            table: {
                user: 'User',
                nameDept: 'Họ tên & Phòng ban',
                dateType: 'Ngày & Loại',
                status: 'Tình trạng',
                submissionTime: 'Giờ nộp',
                actions: 'Thao tác',
                noData: 'Không có báo cáo nào khả dụng',
                system: 'Hệ thống',
                noDept: 'Phòng ban trống',
                onTime: 'Đúng hạn',
                makeup: 'Nộp bù',
                new: 'Mới',
                update: 'Update'
            },
            actions: {
                manage: 'Quản trị báo cáo',
                analyze: 'Phân tích báo cáo',
                viewDetail: 'Xem chi tiết',
                reject: 'Từ chối báo cáo'
            },
            pagination: {
                showing: 'Hiển thị',
                reports: 'báo cáo'
            }
        },
        employeeManagement: {
            title: 'Quản lý Nhân sự',
            subtitle: 'Quản lý và theo dõi nguồn nhân lực của tổ chức.',
            export: 'Xuất danh sách',
            addNew: 'Thêm nhân viên mới',
            searchPlaceholder: 'Tìm theo tên, ID hoặc email',
            filters: {
                department: 'Phòng ban',
                status: 'Trạng thái',
                role: 'Vai trò'
            },
            table: {
                user: 'Nhân viên',
                fullName: 'Họ và tên',
                employeeId: 'Mã NV',
                department: 'Phòng ban',
                status: 'Trạng thái',
                actions: 'Thao tác',
                noData: 'Không tìm thấy nhân viên',
                tryAdjust: 'Thử điều chỉnh tìm kiếm hoặc bộ lọc',
                loading: 'Đang tải dữ liệu...',
                active: 'Hoạt động'
            },
            actions: {
                title: 'Thao tác',
                editProfile: 'Chỉnh sửa hồ sơ',
                manageEmployment: 'Quản lý hợp đồng',
                deactivate: 'Vô hiệu hóa'
            },
            create: {
                title: 'Thêm nhân viên mới',
                desc: 'Tạo tài khoản mới cho nhân viên. Hệ thống sẽ tự động gửi email xác nhận.',
                firstName: 'Tên',
                lastName: 'Họ đệm',
                email: 'Email',
                password: 'Mật khẩu',
                department: 'Phòng ban',
                role: 'Vai trò',
                jobTitle: 'Chức danh',
                selectDept: 'Chọn phòng ban',
                selectRole: 'Chọn vai trò',
                cancel: 'Hủy',
                submit: 'Tạo tài khoản',
                success: 'Đã tạo tài khoản thành công',
                error: 'Có lỗi xảy ra',
                loading: 'Đang xử lý...',
                employeeCode: 'Mã nhân viên',
                contractType: 'Hình thức hợp đồng',
                selectJobTitle: 'Chọn chức vụ',
                selectContractType: 'Chọn hình thức',
                contractTypes: {
                    fullTime: 'Full-time (Toàn thời gian)',
                    partTime: 'Part-time (Bán thời gian)',
                    intern: 'Internship (Thực tập)',
                    probation: 'Probation (Thử việc)',
                    freelance: 'Freelance (Tự do)'
                }
            },

            pagination: {
                showing: 'Hiển thị',
                to: '-',
                of: '/',
                employees: 'nhân viên',
                page: 'Trang'
            }
        },

        detail: {
            breadcrumbAdmin: 'Bảng điều khiển',
            breadcrumbList: 'Danh sách nhân viên',
            editButton: 'Chỉnh sửa hồ sơ',
            exportPDF: 'Xuất PDF',
            statusActive: 'Đang hoạt động',
            statusInactive: 'Ngừng hoạt động',
            tabs: {
                personal: 'Thông tin cá nhân',
                schedule: 'Lịch làm việc',
                attendance: 'Lịch sử chấm công',
                documents: 'Tài liệu'
            },
            sections: {
                contact: 'Chi tiết liên hệ',
                emergency: 'SOS - Liên hệ khẩn cấp',
                stats: 'Thống kê nhanh',
                nextShift: 'Ca làm tiếp theo'
            },
            labels: {
                id: 'Mã NV',
                jobTitle: 'Chức danh',
                department: 'Phòng ban',
                fullName: 'Họ và tên',
                dob: 'Ngày sinh',
                gender: 'Giới tính',
                email: 'Email',
                phone: 'SĐT',
                manager: 'Sếp trực tiếp',
                address: 'Địa chỉ',
                joined: 'Gia nhập'
            },
            skillsTitle: 'Kỹ năng',
            nextShiftContent: {
                remote: 'Từ xa',
                standard: 'Tiêu chuẩn 8 Giờ',
                viewAll: 'Xem lịch biểu đầy đủ',
                tomorrow: 'Ngày mai',
                unscheduled: 'Chưa có lịch',
                noFutureShifts: 'Không có ca làm việc sắp tới'
            },
            schedule: {
                comingSoon: 'Sắp ra mắt',
                title: 'Lịch làm việc hàng tuần',
                desc: 'Tính năng xem lịch trình làm việc sẽ sớm được cập nhật.'
            },
            emergencyLabels: {
                name: 'Tên liên hệ',
                phone: 'SĐT liên hệ',
                relationship: 'Mối quan hệ',
                empty: 'Chưa có thông tin liên hệ khẩn cấp',
                description: 'Thông tin liên hệ trong trường hợp khẩn cấp'
            },
            stats: {
                punctuality: 'Tỷ lệ đúng giờ',
                pto: 'Phép năm còn lại',
                overtime: 'Tăng ca (Tháng)',
                unitDays: 'ngày',
                unitHours: 'giờ'
            },
            attendance: {
                title: 'Lịch sử chấm công: {{month}}',
                monthlyRate: 'Tỷ lệ tháng',
                onTime: 'Đúng giờ',
                late: 'Đi muộn',
                absent: 'Vắng mặt',
                table: {
                    date: 'NGÀY',
                    checkIn: 'GIỜ VÀO',
                    checkOut: 'GIỜ RA',
                    total: 'TỔNG GIỜ',
                    status: 'TRẠNG THÁI'
                }
            },
            messages: {
                notFound: 'Không tìm thấy nhân viên',
                loading: 'Đang tải thông tin nhân viên...',
                noAttendance: 'Không tìm thấy nhật ký chấm công trong giai đoạn này'
            }
        },

        edit: {
            title: 'Chỉnh sửa thông tin',
            subtitle: 'Cập nhật hồ sơ, vai trò và bộ phận cho nhân viên',
            sections: {
                account: 'Thông tin tài khoản',
                internal: 'Thông tin nội bộ',
                personal: 'Thông tin cá nhân & Liên hệ'
            },
            saveButton: 'Lưu thay đổi',
            saving: 'Đang lưu...',
            success: 'Cập nhật thông tin thành công!',
            error: 'Có lỗi xảy ra khi cập nhật',
            notFound: 'Không tìm thấy nhân viên'
        },
        myTeam: {
            title: 'Đội ngũ của tôi',
            subtitle: 'Quản lý trực quan hiệu suất và cấu trúc nhân sự.',
            stats: {
                total: 'TỔNG NHÂN SỰ',
                totalDesc: 'Thành viên trực thuộc',
                present: 'CÓ MẶT',
                presentDesc: 'Check-in hôm nay',
                late: 'ĐI MUỘN',
                lateDesc: 'Cần nhắc nhở',
                absent: 'NGHỈ PHÉP/VẮNG',
                absentDesc: 'Nhân sự vắng mặt'
            },
            tabs: {
                list: 'Danh sách',
                orgChart: 'Sơ đồ tổ chức (Org Chart)'
            },
            table: {
                title: 'Danh sách nhân viên',
                employee: 'Nhân viên',
                position: 'Vị trí',
                department: 'Phòng ban',
                status: 'Trạng thái chấm công',
                checkin: 'Check-in',
                empty: 'Chưa có nhân viên nào trong đội ngũ của bạn',
                directReport: 'Báo cáo trực tiếp'
            },
            orgChart: {
                title: 'Cấu trúc đội nhóm',
                badge: 'Tương tác'
            }
        },
        approvalsPage: {
            title: 'Hoạt động chờ xử lý',
            subtitle: 'Duyệt các yêu cầu từ nhân viên: nghỉ phép, sửa công, cập nhật thông tin...',
            tabs: {
                pending: 'Chờ xử lý',
                history: 'Lịch sử',
                all: 'Tất cả',
                leave_request: 'Nghỉ phép',
                schedule_change: 'Đổi lịch',
                attendance_edit: 'Sửa công',
                profile_update: 'Hồ sơ',
                other: 'Khác'
            },
            empty: {
                title: 'Không có yêu cầu nào',
                pending: 'Hiện tại không có hoạt động nào cần xử lý.',
                history: 'Chưa có lịch sử duyệt đơn.'
            },
            table: {
                employee: 'Nhân viên',
                type: 'Loại yêu cầu',
                time: 'Thời gian gửi',
                content: 'Nội dung',
                status: 'Trạng thái',
                action: 'Hành động'
            },
            status: {
                pending: 'Đang chờ',
                approved: 'Đã duyệt',
                rejected: 'Từ chối',
                review: 'Review'
            },
            actions: {
                detail: 'Chi tiết',
                close: 'Đóng',
                reject: 'Từ chối',
                approve: 'Phê duyệt',
                confirmReject: 'Xác nhận Từ chối',
                confirmApprove: 'Xác nhận duyệt',
                cancel: 'Hủy',
                processing: 'Đang xử lý...'
            },
            dialog: {
                detailTitle: 'Chi tiết yêu cầu',
                rejectTitle: 'Lý do từ chối',
                rejectDesc: 'Yêu cầu này sẽ bị từ chối. Vui lòng nhập lý do để gửi thông báo cho nhân viên.',
                rejectPlaceholder: 'Nhập lý do tại đây...',
                approveTitle: 'Xác nhận duyệt',
                approveDesc: 'Bạn có chắc chắn muốn phê duyệt yêu cầu này của',
                type: 'LOẠI YÊU CẦU',
                time: 'THỜI GIAN GỬI',
                reason: 'LÝ DO / NỘI DUNG',
                leaveDate: 'Ngày nghỉ phép',
                attachment: 'Hình ảnh đính kèm',
                newCheckIn: 'Giờ vào mới',
                newCheckOut: 'Giờ ra mới',
                workDate: 'Ngày làm việc',
                newShift: 'Ca làm việc mới'
            },
            messages: {
                fetchError: 'Không thể tải dữ liệu hoạt động',
                approveSuccess: 'Đã duyệt yêu cầu',
                approveError: 'Lỗi khi duyệt',
                rejectSuccess: 'Đã từ chối yêu cầu',
                rejectError: 'Lỗi khi từ chối',
                error: 'Có lỗi xảy ra',
                enterReason: 'Vui lòng nhập lý do từ chối',
                date: "Ngày nghỉ"
            }
        },
        attendancePage: {
            title: 'Tổng quan Chấm công',
            subtitle: 'Giám sát thời gian thực cho hôm nay',
            exportReport: 'Xuất Báo cáo',
            manualEntry: 'Nhập thủ công',
            stats: {
                totalEmployees: 'Tổng nhân viên',
                presentToday: 'Có mặt hôm nay',
                lateArrivals: 'Đi trễ',
                onLeave: 'Nghỉ phép',
                thisMonth: 'tháng này',
                rate: 'Tỷ lệ',
                late: 'trễ',
                today: 'Hôm nay'
            },
            filters: {
                searchPlaceholder: 'Tìm nhân viên theo tên, ID hoặc phòng ban...',
                allDepartments: 'Tất cả phòng ban',
                allStatuses: 'Tất cả trạng thái',
                present: 'Có mặt',
                late: 'Đi trễ',
                absent: 'Vắng mặt',
                onLeave: 'Nghỉ phép'
            },
            table: {
                employee: 'Nhân viên',
                id: 'ID',
                department: 'Phòng ban',
                status: 'Trạng thái hôm nay',
                clockIn: 'Giờ vào',
                clockOut: 'Giờ ra',
                totalHours: 'Tổng giờ',
                actions: 'Thao tác',
                noData: 'Không tìm thấy nhân viên phù hợp với bộ lọc.'
            },
            pagination: {
                showing: 'Hiển thị'
            },
            insight: {
                title: 'Thông tin hiện diện hàng ngày',
                description: 'Tỷ lệ chấm công tăng {percent} so với thứ Ba tuần trước. Tỷ lệ đúng giờ cao ở bộ phận Kỹ thuật.'
            }
        }
    },

    // Time
    time: {
        monday: 'T2',
        tuesday: 'T3',
        wednesday: 'T4',
        thursday: 'T5',
        friday: 'T6',
        saturday: 'T7',
        sunday: 'CN',
    },

    // Messages
    messages: {
        checkInSuccess: 'Chấm công vào thành công!',
        checkOutSuccess: 'Clock out thành công, hãy về nhà an toàn bạn nhé. Hẹn gặp lại bạn vào ngày làm việc tiếp theo 🫰',
        alreadyCheckedIn: 'Bạn đã chấm công vào rồi. Vui lòng chấm công ra trước.',
        noActiveCheckIn: 'Không tìm thấy ca làm đang hoạt động. Vui lòng chấm công vào trước.',
        locationError: 'Lỗi vị trí',
        locationDenied: 'Quyền truy cập vị trí bị từ chối. Vui lòng cho phép truy cập vị trí.',
        positionUnavailable: 'Không thể xác định vị trí. Vui lòng bật GPS.',
        locationTimeout: 'Hết thời gian xác định vị trí. Vui lòng thử lại.',
        tooFarFromOffice: 'Bạn đang ở quá xa văn phòng ({distance}m). Khoảng cách tối đa: {max}m.',
        unauthorized: 'Chưa xác thực',
        systemError: 'Lỗi hệ thống: Cập nhật thất bại. Vui lòng liên hệ quản trị viên để kiểm tra Chính sách Cơ sở dữ liệu (RLS).',
    },
    // Timesheets
    timesheets: {
        title: 'Bảng chấm công của tôi',
        subtitle: 'Xem và quản lý nhật ký làm việc của bạn',
        totalHoursWorked: 'Tổng giờ làm việc',
        overtime: 'Tăng ca',
        daysPresent: 'Số ngày có mặt',
        totalWorkdays: 'Tổng ngày làm việc',
        dailyLogs: 'Lịch sử làm việc',
        paidLeaveYear: 'Nghỉ phép (Năm)',
        paidLeaveMonth: 'Nghỉ phép (Tháng)',
        usedLeave: 'Đã nghỉ',
        remainingLeave: 'Còn lại',
        annualLeaveLimit: 'Hạn mức',
        monthlyLeaveLimit: 'Hạn mức',
        clockIn: 'Clock In',
        clockOut: 'Clock Out',
        searchLogs: 'Tìm kiếm nhật ký...',
        filter: 'Lọc',
        last3Days: '3 ngày gần nhất',
        today: 'Hôm nay',
        last7Days: '7 ngày gần nhất',
        last30Days: '30 ngày gần nhất',
        customRange: 'Khoảng thời gian',
        exportRange: 'Xuất theo khoảng chọn',
        exportAll: 'Xuất toàn bộ lịch sử',
        unitHours: 'GIỜ',
        breakDuration: 'Thời gian nghỉ',
        totalHours: 'Tổng giờ',
        approved: 'Đã duyệt',
        pending: 'Đang chờ',
        draft: 'Bản nháp',
        showingEntries: 'Hiển thị {count} mục',
        prev: 'Trước',
        next: 'Sau',
    },
    schedule: {
        title: 'Lịch làm việc',
        subtitle: 'Xem và lên kế hoạch ca làm việc',
        swapShift: 'Đổi ca',
        requestLeave: 'Xin nghỉ phép',
        requestLeaveTitle: 'Đơn xin nghỉ phép', // New
        selectDate: 'Chọn ngày nghỉ', // New
        reason: 'Lý do nghỉ phép', // New
        uploadImage: 'Hình ảnh xác nhận', // New
        submitRequest: 'Gửi đơn', // New
        uploading: 'Đang tải lên...', // New
        shiftDetails: 'Chi tiết ca làm',
        upcoming7Days: '7 ngày tới',
        utilization: 'Hiệu suất tuần này',
        workShift: 'Ca làm việc',
        approvedLeave: 'Nghỉ phép',
        holiday: 'Ngày lễ',
        todaysShift: 'Ca làm hôm nay',
        morningShift: 'Ca sáng',
        afternoonShift: 'Ca chiều',
        fullDay: 'Cả ngày',
        custom: 'Tùy chỉnh',
        pendingCustom: 'Chờ duyệt / Tùy chỉnh', // New
        nightShift: 'Ca đêm',
        offDuty: 'Nghỉ ca',
        inProgress: 'Đang diễn ra',
        active: 'Hoạt động',
        unscheduled: 'Chưa có lịch',
        selected: 'Đã chọn',
        addWorkInfo: 'Thêm thông tin làm việc',
        shiftName: 'Tên ca làm',
        startTime: 'Thời gian bắt đầu',
        endTime: 'Thời gian kết thúc',
        location: 'Địa điểm',
        teamMembers: 'Thành viên nhóm',
        saveInfo: 'Lưu thông tin',
        cancel: 'Thoát',
        total: 'Tổng', // New
        week: 'Tuần', // New
        day: 'Ngày', // New
        month: 'Tháng' // New
    },
    // Settings
    settings: {
        title: 'Cài đặt',
        tabs: {
            general: 'Chung',
            security: 'Bảo mật',
            notifications: 'Thông báo',
            preferences: 'Tùy chọn',
        },
        profile: {
            title: 'Cài đặt Hồ sơ',
            avatarUpdate: 'Cập nhật ảnh đại diện và thông tin cá nhân',
            changePhoto: 'Thay đổi ảnh',
            chooseAvatar: 'Chọn ảnh đại diện',
            chooseAvatarDesc: 'Chọn một trong những ảnh đại diện 3D mặc định của chúng tôi.',
            uploadCustom: 'Tải ảnh tùy chỉnh',
            uploading: 'Đang tải lên...',
            maxSize: 'Tối đa 500KB',
            fullName: 'Họ và tên',
            fullNamePlaceholder: 'Nhập họ và tên của bạn',
            emailAddress: 'Địa chỉ Email',
            department: 'Phòng ban',
            engineering: 'Kỹ thuật & Phát triển',
            userFallback: 'Người dùng',
        },
        security: {
            title: 'Bảo mật',
            newPassword: 'Mật khẩu mới',
            confirmPassword: 'Xác nhận mật khẩu',
            passwordMismatch: 'Mật khẩu xác nhận không khớp',
            updateSuccess: 'Cập nhật bảo mật thành công',
        },
        notifications: {
            title: 'Tùy chọn thông báo',
            pushNotifications: 'Thông báo đẩy',
            checkInReminders: 'Nhắc nhở Chấm công',
            scheduleChanges: 'Thay đổi lịch làm việc',
        },
        preferences: {
            title: 'Cài đặt hiển thị',
            themeTitle: 'Chọn chủ đề',
            themeDesc: 'Chuyển đổi giữa chế độ sáng và tối',
            light: 'Sáng',
            dark: 'Tối',
        },
        actions: {
            discard: 'Hủy thay đổi',
            save: 'Lưu cài đặt',
            saving: 'Đang lưu...',
            saveSuccess: 'Lưu cài đặt thành công',
            saveError: 'Lưu thất bại',
        }
    },

    // Admin Settings
    adminSettings: {
        // Layout & Navigation
        title: 'Cấu hình hệ thống',
        general: 'Cấu hình chung',
        security: 'Bảo mật',
        roles: 'Phân quyền',
        notifications: 'Thông báo',
        featureToggles: 'Tính năng',
        comingSoon: 'Sắp ra mắt',

        // General Settings
        organization: {
            navTitle: 'Tổ chức',
            title: 'Cấu trúc Tổ chức',
            description: 'Quản lý danh mục phòng ban và chức vụ nhân viên.',
            navDescription: 'Danh mục phòng ban & chức vụ',
            syncButton: 'Đồng bộ từ Nhân viên cũ',
            saveButton: 'Lưu thay đổi',
            saving: 'Đang lưu...',
            departments: {
                title: 'Phòng ban',
                description: 'Các bộ phận trong công ty',
                placeholder: 'Nhập tên phòng ban mới...',
                empty: 'Chưa có phòng ban nào.',
                existsRef: 'Phòng ban này đã tồn tại',
            },
            jobTitles: {
                title: 'Chức vụ / Vị trí',
                description: 'Các chức danh công việc',
                placeholder: 'Nhập tên chức vụ mới...',
                empty: 'Chưa có chức vụ nào.',
                existsRef: 'Chức vụ này đã tồn tại',
            },
            syncDialog: {
                title: 'Đồng bộ dữ liệu?',
                description: 'Hệ thống sẽ quét toàn bộ hồ sơ nhân viên hiện tại để tìm các Phòng ban và Chức vụ chưa có trong danh sách và thêm vào đây. Dữ liệu cũ sẽ được giữ nguyên, chỉ thêm mới.',
                cancel: 'Hủy',
                confirm: 'Tiến hành Đồng bộ',
                success: 'Đồng bộ thành công',
                error: 'Đồng bộ thất bại',
            },
            success: 'Đã lưu cấu hình tổ chức thành công',
            error: 'Có lỗi xảy ra khi lưu',
            tips: {
                dept: 'Mẹo: Nhập tên và nhấn Enter để thêm nhanh. Danh sách này sẽ xuất hiện trong gợi ý khi tạo nhân viên.',
                title: 'Các chức vụ này sẽ được gợi ý khi điền thông tin nhân viên.',
            }
        },

        // Layout settings
        settingsLayout: {
            backToDashboard: 'Quay lại Dashboard',
            systemConfig: 'Cấu hình hệ thống',
            manageSystemSettings: 'Quản lý cài đặt toàn hệ thống',
            config: 'Cấu hình',
            collapsed: 'Thu gọn',
            expanded: 'Mở rộng',
            soon: 'Sắp tới'
        },

        generalSettings: {
            title: 'Cấu hình chung',
            description: 'Quản lý thông tin công ty, giờ làm việc và quy định chấm công',
            company: {
                title: 'Thông tin công ty',
                description: 'Cài đặt tên công ty, địa chỉ và thông tin liên hệ',
                name: 'Tên công ty',
                namePlaceholder: 'VD: FHB Vietnam',
                website: 'Website',
                websitePlaceholder: 'https://example.com',
                address: 'Địa chỉ văn phòng',
                addressPlaceholder: '123 Đường ABC, Quận XYZ, TP.HCM',
            },
            workingHours: {
                title: 'Giờ làm việc',
                description: 'Cấu hình thời gian làm việc và nghỉ trưa',
                startTime: 'Giờ bắt đầu',
                endTime: 'Giờ kết thúc',
                lunchStart: 'Nghỉ trưa từ',
                lunchEnd: 'Nghỉ trưa đến',
            },
            officeLocation: {
                title: 'Vị trí văn phòng',
                description: 'Toạ độ GPS và khoảng cách tối đa cho phép chấm công',
                latitude: 'Vĩ độ (Latitude)',
                latitudePlaceholder: 'VD: 10.762622',
                longitude: 'Kinh độ (Longitude)',
                longitudePlaceholder: 'VD: 106.660172',
                maxDistance: 'Khoảng cách tối đa cho phép',
                meters: 'mét',
                distanceNote: 'Nhân viên phải ở trong bán kính này mới được phép chấm công',
            },
            wifiRules: {
                title: 'Wifi & Quy tắc',
                description: 'Cấu hình IP Wifi công ty và quy tắc xác thực chấm công',
                companyWifiIp: 'Địa chỉ IP Wifi công ty',
                ipPlaceholder: 'VD: 14.161.22.181',
                autoDetect: 'Tự điền IP',
                ipNote: 'Nhập các IP cách nhau bởi dấu phẩy. Mặc định là `14.161.22.181`.',
                requireBoth: 'Bắt buộc cả GPS và Wifi',
                requireBothNote: 'Khi bật, nhân viên phải thỏa mãn cả hai điều kiện mới được chấm công',
            },
            offDays: {
                title: 'Ngày nghỉ định kỳ',
                description: 'Chọn các ngày nghỉ cố định trong tuần. Những ngày này sẽ được hiển thị nhạt hơn trên biểu đồ thống kê của nhân viên.',
                monday: 'Thứ 2',
                tuesday: 'Thứ 3',
                wednesday: 'Thứ 4',
                thursday: 'Thứ 5',
                friday: 'Thứ 6',
                saturday: 'Thứ 7',
                sunday: 'Chủ Nhật',
            },
            actions: {
                save: 'Lưu cấu hình',
                saving: 'Đang lưu...',
                saveSuccess: 'Đã lưu cấu hình thành công!',
                saveError: 'Không thể lưu cấu hình. Vui lòng thử lại.',
                loadError: 'Không thể tải cấu hình',
            },
        },

        // Security Settings
        securitySettings: {
            title: 'Bảo mật',
            description: 'Cấu hình xác thực 2 yếu tố, reCAPTCHA và các chính sách bảo mật',
            recaptcha: {
                title: 'Google reCAPTCHA v3 (Invisible)',
                description: 'Tự động tàng hình trên giao diện User. Yêu cầu Key v3.',
                enabled: 'Đang bật',
                disabled: 'Đang tắt',
                toggle: 'Bật reCAPTCHA v3',
                toggleDescription: 'Bảo vệ Login/Register khỏi Bot.',
                siteKey: 'Site Key',
                secretKey: 'Secret Key',
                getKeyLink: 'Lấy key tại Google reCAPTCHA Console',
                testError: 'Lỗi xác thực: {{error}}',
                testErrorNote: 'Lỗi này có thể do bạn đang dùng Ngrok hoặc Domain chưa Whitelist trên Google.',
                retry: 'Thử lại',
                forceSkip: 'Tôi chắc chắn Key đúng, vẫn lưu',
                testSuccess: 'Kết nối Recaptcha thành công!',
                validation: {
                    missingKeys: 'Vui lòng nhập đầy đủ Site Key và Secret Key',
                    initFailed: 'Không thể khởi tạo Google reCAPTCHA. Site Key có thể sai hoặc Domain bị chặn.',
                },
            },
            twoFactor: {
                title: 'Xác thực 2 yếu tố (2FA)',
                toggle: 'Bật xác thực 2 yếu tố',
                toggleDescription: 'Yêu cầu OTP khi đăng nhập Admin.',
            },
            advancedSecurity: {
                title: 'Bảo mật nâng cao',
                accountLockout: 'Khóa tài khoản',
                accountLockoutDescription: 'Tự động khóa sau 5 lần sai.',
            },
            actions: {
                saveChanges: 'Lưu thay đổi',
                testing: 'Đang kiểm tra...',
                loadError: 'Không thể tải cấu hình bảo mật',
                saveSuccess: 'Đã lưu cấu hình bảo mật thành công!',
                saveError: 'Không thể lưu cấu hình. Vui lòng thử lại.',
            },
        },

        // Role Management
        roleSettings: {
            title: 'Quản lý Phân quyền',
            description: 'Cấu hình chi tiết quyền truy cập cho từng nhóm người dùng.',
            roles: 'Vai trò hệ thống',
            selectRole: 'Chọn vai trò',
            searchRoles: 'Tìm kiếm vai trò...',
            permissions: 'quyền',
            fullAccess: 'FULL ACCESS',
            systemRole: 'Hệ thống',
            defaultRole: 'Mặc định',
            adminNote: 'Admin có toàn quyền (Không thể chỉnh sửa)',
            adminTitle: 'Administrator Access',
            adminDescription: 'Vai trò Admin có toàn quyền truy cập hệ thống mặc định. Bạn không cần (và không thể) cấu hình quyền hạn cho vai trò này.',
            selectRolePlaceholder: 'Chọn một vai trò để xem chi tiết',
            createRole: {
                button: 'Mới',
                title: 'Tạo vai trò mới',
                modalDescription: 'Định nghĩa tên và mã định danh cho nhóm quyền mới.',
                displayName: 'Tên hiển thị',
                displayNamePlaceholder: 'Ví dụ: Senior Manager',
                roleId: 'Mã định danh (ID)',
                roleIdPlaceholder: 'senior_manager',
                roleIdNote: 'Dùng để định danh trong hệ thống (không dấu, không khoảng trắng).',
                descriptionLabel: 'Mô tả',
                descriptionPlaceholder: 'Mô tả trách nhiệm của vai trò này...',
                noDescription: 'Không có mô tả',
                required: '*',
                cancel: 'Hủy',
                create: 'Tạo vai trò',
                creating: 'Đang tạo...',
                success: 'Tạo vai trò thành công',
                error: 'Vui lòng điền đầy đủ tên và mã',
            },
            deleteRole: {
                confirm: 'Bạn có chắc chắn muốn xóa vai trò này? Hành động này không thể hoàn tác.',
                success: 'Đã xóa vai trò',
            },
            actions: {
                save: 'Lưu thay đổi',
                saving: 'Đang lưu...',
                saveSuccess: 'Đã cập nhật quyền hạn',
                loadError: 'Không truy cập được dữ liệu phân quyền',
                permissionDenied: 'Bạn không có quyền truy cập trang này.',
            },
            // Permission translation mapping
            permissionLabels: {
                'dashboard.view': 'Truy cập Dashboard',
                'users.view': 'Xem danh sách nhân viên (Cơ bản)',
                'users.view_details': 'Xem chi tiết hồ sơ',
                'users.view_salary': '⚠ Xem lương & Hợp đồng',
                'users.create': 'Tạo nhân viên mới',
                'users.edit': 'Sửa thông tin nhân viên',
                'users.delete': 'Xóa/Khóa nhân viên',
                'attendance.view': 'Xem dữ liệu chấm công',
                'attendance.edit': '⚠ Sửa dữ liệu chấm công',
                'attendance.export': 'Xuất báo cáo chấm công',
                'leaves.view': 'Xem lịch nghỉ phép',
                'leaves.create_for_others': 'Tạo đơn nghỉ hộ',
                'approvals.view': 'Xem danh sách yêu cầu cần duyệt',
                'approvals.approve': 'Duyệt/Từ chối yêu cầu',
                'reports.view': 'Xem báo cáo thống kê',
                'reports.export': 'Xuất báo cáo tổng hợp',
                'settings.view': 'Xem cấu hình hệ thống',
                'settings.manage': 'Chỉnh sửa cấu hình',
                'roles.view': 'Xem danh sách vai trò',
                'roles.manage': '⚠ Quản lý phân quyền',
            },
            roleLabels: {
                'admin': 'Quản trị viên',
                'manager': 'Trưởng nhóm',
                'hr': 'Nhân sự',
                'accountant': 'Kế toán',
                'member': 'Nhân viên',
            },
            roleDescriptions: {
                'admin': 'Có toàn quyền truy cập và quản lý hệ thống',
                'manager': 'Quản lý nhóm và phê duyệt các yêu cầu nhân sự',
                'hr': 'Quản lý hồ sơ nhân viên và các thủ tục nhân sự',
                'accountant': 'Chỉ được xem và xuất báo cáo chấm công',
                'member': 'Chỉ sử dụng ứng dụng phía người dùng, không truy cập được Admin',
            },
            categories: {
                'System': 'Hệ thống',
                'User Management': 'Quản lý nhân sự',
                'Attendance': 'Chấm công',
                'Leave Management': 'Quản lý nghỉ phép',
                'Approvals': 'Phê duyệt',
                'Reports': 'Báo cáo',
            }
        },

        // Integrations
        integrations: {
            title: 'Tích hợp WordPress',
            description: 'Kết nối với WordPress để upload file lên Media Library',
            status: {
                connected: '✅ Đã kết nối',
                failed: '❌ Kết nối thất bại',
                pending: '⏳ Chưa kiểm tra',
                lastTested: 'Kiểm tra lần cuối:',
            },
            form: {
                siteUrl: 'Địa chỉ WordPress Site',
                siteUrlPlaceholder: 'https://yoursite.com',
                siteUrlNote: 'Đường dẫn chính xác đến website (không có dấu / ở cuối)',
                username: 'Tên đăng nhập',
                usernamePlaceholder: 'admin',
                appPassword: 'Mật khẩu ứng dụng',
                appPasswordPlaceholder: 'xxxx xxxx xxxx xxxx xxxx xxxx',
                appPasswordNote: 'Tạo Application Password tại trang:',
                wpProfile: 'Hồ sơ WordPress',
                required: '*',
            },
            actions: {
                test: 'Kiểm tra kết nối',
                testing: 'Đang kiểm tra...',
                save: 'Lưu cấu hình',
                saving: 'Đang lưu...',
                delete: 'Xóa cấu hình',
                testSuccess: '✅ Kết nối thành công! User: {{name}}',
                testError: '❌ Kết nối thất bại: {{error}}',
                saveSuccess: 'Lưu cấu hình thành công!',
                saveError: 'Lưu cấu hình thất bại',
                deleteConfirm: '⚠️ Bạn có chắc muốn xóa cấu hình WordPress?\\n\\nSau khi xóa, tính năng upload file sẽ không hoạt động.',
                deleteSuccess: 'Đã xóa cấu hình WordPress',
                deleteError: 'Xóa cấu hình thất bại',
                loadError: 'Không thể tải cấu hình',
                validation: {
                    allFieldsRequired: 'Vui lòng điền đầy đủ thông tin',
                    reenterPassword: 'Vui lòng nhập lại Application Password',
                    reenterPasswordTest: 'Vui lòng nhập lại Application Password để test',
                    testError: 'Không thể kiểm tra kết nối',
                },
            },
            security: {
                title: '⚠️ Lưu ý bảo mật:',
                note1: 'Application Password được lưu trong database (nên mã hóa trong production)',
                note2: 'Chỉ Admin mới có quyền cấu hình',
                note3: 'Không chia sẻ Application Password với người khác',
            },
            help: {
                title: '📚 Hướng dẫn tạo Application Password',
                step1: 'Đăng nhập vào WordPress Admin',
                step2: 'Vào Users → Profile',
                step3: 'Cuộn xuống phần Application Passwords',
                step4: 'Nhập tên (ví dụ: "Cham Cong App") và click Add New Application Password',
                step5: 'Copy password được tạo ra và paste vào form trên',
            },
        },

        // Coming Soon Pages
        notificationsComingSoon: {
            title: 'Cấu hình Thông báo',
            description: 'Quản lý cấu hình Email, Push Notifications và SMTP sẽ có trong phiên bản tiếp theo.',
            badge: 'Coming in v2.0',
        },
        notificationDashboard: {
            title: 'Push Notification Dashboard',
            subtitle: 'Kiểm tra trạng thái, chẩn đoán và gửi thông báo test',
            tabs: {
                diagnostics: 'Chẩn đoán',
                testPush: 'Gửi Test',
                logs: 'Lịch sử gửi',
            },
            diagnostics: {
                title: 'Kiểm tra sức khỏe hệ thống',
                runCheck: 'Chạy kiểm tra',
                running: 'Đang kiểm tra...',
                envVars: 'Biến môi trường',
                fcmTokens: 'FCM Tokens',
                totalTokens: 'Tổng tokens',
                uniqueUsers: 'User có token',
                byDevice: 'Theo thiết bị',
                userCoverage: 'Phạm vi người dùng',
                totalUsers: 'Tổng nhân viên',
                withTokens: 'Có token',
                withoutTokens: 'Chưa có token',
                todayShifts: 'Ca làm hôm nay',
                recentLogs: 'Log gần đây',
                noData: 'Chưa có dữ liệu. Bấm "Chạy kiểm tra" để bắt đầu.',
                healthy: 'Tốt',
                warning: 'Cảnh báo',
                error: 'Lỗi',
            },
            testPush: {
                title: 'Gửi thông báo Test',
                selectUser: 'Chọn nhân viên',
                selectUserPlaceholder: 'Chọn nhân viên để gửi test...',
                notifTitle: 'Tiêu đề',
                notifTitlePlaceholder: '🔔 Test Notification',
                notifMessage: 'Nội dung',
                notifMessagePlaceholder: 'Đây là thông báo test từ Admin',
                sendTest: 'Gửi thông báo Test',
                sending: 'Đang gửi...',
                success: 'Gửi thành công!',
                failed: 'Gửi thất bại',
                result: 'Kết quả',
                successCount: 'Thành công',
                failCount: 'Thất bại',
                staleRemoved: 'Token hết hạn đã xóa',
            },
            logs: {
                title: 'Lịch sử gửi thông báo',
                empty: 'Chưa có log nào',
                userId: 'User ID',
                shiftId: 'Ca làm',
                type: 'Loại',
                status: 'Trạng thái',
                sentAt: 'Thời gian gửi',
                clickedAt: 'Đã nhấn lúc',
            },
        },
        featureTogglesComingSoon: {
            title: 'Bật/Tắt Tính năng',
            description: 'Quản lý các module như GPS, OT, Leave Request... sẽ có trong phiên bản tiếp theo.',
            badge: 'Coming in v2.0',
        },
    },
}

export type Translations = typeof vi
